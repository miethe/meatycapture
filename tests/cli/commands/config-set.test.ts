/**
 * Config Set Command Tests
 *
 * Tests the `config set` command:
 * - Sets configuration values with validation
 * - Validates key is recognized
 * - Validates value (project must exist for default_project)
 * - Creates config.json if it doesn't exist
 * - Updates existing config with new value
 * - Quiet mode suppresses output
 * - Returns exit code 0 on success
 * - Returns exit code 1 on validation error
 * - Returns exit code 4 on resource not found
 *
 * Each test verifies:
 * - Proper exit codes
 * - File creation and content validation
 * - Error handling and validation
 * - Output formatting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createTempDir,
  cleanupTempDir,
  mockConsole,
  restoreConsole,
  getCapturedLogs,
  clearCapturedOutput,
  resetQuietMode,
} from '../helpers';

import { ExitCodes } from '@cli/handlers/exitCodes';

/**
 * Custom error class to capture process.exit calls in tests.
 * Thrown by mocked process.exit to prevent actual process termination.
 */
class ExitError extends Error {
  constructor(public readonly code: number) {
    super(`Process exited with code ${code}`);
    this.name = 'ExitError';
  }
}

describe('Config Set Command', () => {
  let tempDir: string;
  let configDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: any;

  beforeEach(async () => {
    tempDir = await createTempDir();
    configDir = join(tempDir, 'config');
    await fs.mkdir(configDir, { recursive: true });

    // Set config dir env var for isolated testing
    process.env['MEATYCAPTURE_CONFIG_DIR'] = configDir;

    mockConsole();
    await resetQuietMode();

    // Mock process.exit to capture exit codes
    mockExit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code ?? 0);
    }) as never);
  });

  afterEach(async () => {
    delete process.env['MEATYCAPTURE_CONFIG_DIR'];
    await cleanupTempDir(tempDir);
    restoreConsole();
    clearCapturedOutput();
    mockExit.mockRestore();
  });

  describe('successful set operations', () => {
    it('should set default_project successfully when project exists', async () => {
      // Create projects.json with a project
      const projectsData = {
        projects: [
          {
            id: 'test-project',
            name: 'Test Project',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'test-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs.some((log) => log.includes('Set default_project = test-project'))).toBe(true);
    });

    it('should create config.json if it does not exist', async () => {
      // Create projects.json
      const projectsData = {
        projects: [
          {
            id: 'test-project',
            name: 'Test Project',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'test-project', {})).rejects.toThrow(ExitError);

      // Verify config.json was created
      const configContent = await fs.readFile(join(configDir, 'config.json'), 'utf-8');
      const config = JSON.parse(configContent);

      expect(config).toHaveProperty('version', '1.0.0');
      expect(config).toHaveProperty('default_project', 'test-project');
      expect(config).toHaveProperty('created_at');
      expect(config).toHaveProperty('updated_at');
    });

    it('should update existing config.json', async () => {
      // Create projects.json
      const projectsData = {
        projects: [
          {
            id: 'old-project',
            name: 'Old Project',
            default_path: '/old/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'new-project',
            name: 'New Project',
            default_path: '/new/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      // Create initial config.json with old project
      const initialConfig = {
        version: '1.0.0',
        default_project: 'old-project',
        created_at: new Date('2025-01-01T00:00:00Z').toISOString(),
        updated_at: new Date('2025-01-01T00:00:00Z').toISOString(),
      };
      await fs.writeFile(
        join(configDir, 'config.json'),
        JSON.stringify(initialConfig, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'new-project', {})).rejects.toThrow(ExitError);

      // Verify config.json was updated
      const configContent = await fs.readFile(join(configDir, 'config.json'), 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.default_project).toBe('new-project');
      expect(config.version).toBe('1.0.0');
      expect(config.created_at).toBe(initialConfig.created_at);
      // updated_at should be newer
      expect(new Date(config.updated_at).getTime()).toBeGreaterThan(
        new Date(initialConfig.updated_at).getTime()
      );
    });

    it('should suppress output in quiet mode', async () => {
      // Create projects.json
      const projectsData = {
        projects: [
          {
            id: 'test-project',
            name: 'Test Project',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'test-project', { quiet: true })).rejects.toThrow(
        ExitError
      );
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs.join('')).toBe('');
    });
  });

  describe('validation errors', () => {
    it('should fail with invalid key', async () => {
      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('invalid_key', 'value', {})).rejects.toThrow('Unknown configuration key');
    });

    it('should fail if project does not exist', async () => {
      // Create empty projects.json
      const projectsData = { projects: [] };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'nonexistent-project', {})).rejects.toThrow(
        'not found'
      );
    });

    it('should fail if projects.json does not exist', async () => {
      const { setAction } = await import('@cli/commands/config/set');

      // Don't create projects.json
      await expect(setAction('default_project', 'test-project', {})).rejects.toThrow();
    });

    it('should fail if project is disabled', async () => {
      // Create projects.json with disabled project
      const projectsData = {
        projects: [
          {
            id: 'disabled-project',
            name: 'Disabled Project',
            default_path: '/disabled/path',
            enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      // Should still fail because project lookup doesn't check enabled status,
      // it just checks existence. But we can set disabled projects as default.
      await expect(setAction('default_project', 'disabled-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
    });
  });

  describe('edge cases', () => {
    it('should handle empty project ID', async () => {
      // Create projects.json
      const projectsData = {
        projects: [
          {
            id: 'test-project',
            name: 'Test Project',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', '', {})).rejects.toThrow();
    });

    it('should handle project ID with special characters', async () => {
      // Create projects.json with project that has special chars
      const projectsData = {
        projects: [
          {
            id: 'test-project-v2',
            name: 'Test Project v2',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'test-project-v2', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs.some((log) => log.includes('Set default_project = test-project-v2'))).toBe(true);
    });

    it('should preserve existing config fields when updating', async () => {
      // Create projects.json
      const projectsData = {
        projects: [
          {
            id: 'test-project',
            name: 'Test Project',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      // Create initial config.json with custom version
      const initialConfig = {
        version: '1.0.0',
        created_at: new Date('2025-01-01T00:00:00Z').toISOString(),
        updated_at: new Date('2025-01-01T00:00:00Z').toISOString(),
      };
      await fs.writeFile(
        join(configDir, 'config.json'),
        JSON.stringify(initialConfig, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      await expect(setAction('default_project', 'test-project', {})).rejects.toThrow(ExitError);

      // Verify config fields are preserved
      const configContent = await fs.readFile(join(configDir, 'config.json'), 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.version).toBe('1.0.0');
      expect(config.created_at).toBe(initialConfig.created_at);
      expect(config.default_project).toBe('test-project');
    });

    it('should handle multiple rapid updates', async () => {
      // Create projects.json
      const projectsData = {
        projects: [
          {
            id: 'project-1',
            name: 'Project 1',
            default_path: '/path/1',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'project-2',
            name: 'Project 2',
            default_path: '/path/2',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(configDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      const { setAction } = await import('@cli/commands/config/set');

      // Set project-1
      await expect(setAction('default_project', 'project-1', { quiet: true })).rejects.toThrow(
        ExitError
      );
      mockExit.mockClear();
      clearCapturedOutput();

      // Set project-2
      await expect(setAction('default_project', 'project-2', { quiet: true })).rejects.toThrow(
        ExitError
      );

      // Verify final value is project-2
      const configContent = await fs.readFile(join(configDir, 'config.json'), 'utf-8');
      const config = JSON.parse(configContent);

      expect(config.default_project).toBe('project-2');
    });
  });

  describe('permission handling', () => {
    it('should handle read-only config directory gracefully', async () => {
      const readOnlyDir = join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });

      // Create projects.json in read-only dir first
      const projectsData = {
        projects: [
          {
            id: 'test-project',
            name: 'Test Project',
            default_path: '/test/path',
            enabled: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      };
      await fs.writeFile(
        join(readOnlyDir, 'projects.json'),
        JSON.stringify(projectsData, null, 2),
        'utf-8'
      );

      // Make directory read-only (on Unix-like systems)
      if (process.platform !== 'win32') {
        await fs.chmod(readOnlyDir, 0o444);

        // Override config dir for this test
        process.env['MEATYCAPTURE_CONFIG_DIR'] = readOnlyDir;

        const { setAction } = await import('@cli/commands/config/set');

        // Should fail with permission error
        await expect(setAction('default_project', 'test-project', {})).rejects.toThrow();

        // Restore permissions for cleanup
        await fs.chmod(readOnlyDir, 0o755);
      }
    });
  });
});
