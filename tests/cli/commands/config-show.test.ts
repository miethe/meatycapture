/**
 * Config Show Command Tests
 *
 * Tests the `config show` command:
 * - Displays configuration in human, JSON, and YAML formats
 * - Shows configuration directory path
 * - Shows default project from environment or registry
 * - Shows environment variable status
 * - Handles --config-dir flag for path-only output
 * - Quiet mode suppresses output
 * - Always exits with code 0 (success)
 *
 * Each test verifies:
 * - Proper exit codes
 * - Output formatting
 * - Environment variable detection
 * - Default project resolution
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
  isValidJson,
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

describe('Config Show Command', () => {
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
    delete process.env['MEATYCAPTURE_DEFAULT_PROJECT'];
    delete process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
    await cleanupTempDir(tempDir);
    restoreConsole();
    clearCapturedOutput();
    mockExit.mockRestore();
  });

  describe('output formats', () => {
    it('should display configuration in human format by default', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      const output = logs.join('\n');

      expect(output).toContain('Configuration:');
      expect(output).toContain('Config Directory:');
      expect(output).toContain('Projects File:');
      expect(output).toContain('Fields File:');
      expect(output).toContain('Default Project:');
      expect(output).toContain('Environment Variables:');
    });

    it('should output JSON when --json flag used', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      const output = logs.join('\n');

      expect(isValidJson(output)).toBe(true);

      const data = JSON.parse(output);
      expect(data).toHaveProperty('config_dir');
      expect(data).toHaveProperty('projects_file');
      expect(data).toHaveProperty('fields_file');
      expect(data).toHaveProperty('default_project');
      expect(data).toHaveProperty('environment');
      expect(data.environment).toHaveProperty('MEATYCAPTURE_CONFIG_DIR');
      expect(data.environment).toHaveProperty('MEATYCAPTURE_DEFAULT_PROJECT');
      expect(data.environment).toHaveProperty('MEATYCAPTURE_DEFAULT_PROJECT_PATH');
    });

    it('should output YAML when --yaml flag used', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ yaml: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      const output = logs.join('\n');

      expect(output).toContain('config_dir:');
      expect(output).toContain('projects_file:');
      expect(output).toContain('fields_file:');
      expect(output).toContain('default_project:');
      expect(output).toContain('environment:');
      expect(output).toContain('MEATYCAPTURE_CONFIG_DIR:');
      expect(output).toContain('MEATYCAPTURE_DEFAULT_PROJECT:');
      expect(output).toContain('MEATYCAPTURE_DEFAULT_PROJECT_PATH:');
    });

    it('should show only config dir with --config-dir flag', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ configDir: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toBe(configDir);
    });

    it('should suppress output in quiet mode', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ quiet: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs.join('')).toBe('');
    });
  });

  describe('environment variable detection', () => {
    it('should detect MEATYCAPTURE_CONFIG_DIR environment variable', async () => {
      process.env['MEATYCAPTURE_CONFIG_DIR'] = '/custom/config/path';
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.environment.MEATYCAPTURE_CONFIG_DIR).toBe('/custom/config/path');
      expect(data.config_dir).toBe('/custom/config/path');
    });

    it('should detect MEATYCAPTURE_DEFAULT_PROJECT environment variable', async () => {
      process.env['MEATYCAPTURE_DEFAULT_PROJECT'] = 'my-project';
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.environment.MEATYCAPTURE_DEFAULT_PROJECT).toBe('my-project');
      expect(data.default_project).toBe('my-project');
    });

    it('should detect MEATYCAPTURE_DEFAULT_PROJECT_PATH environment variable', async () => {
      process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'] = '/custom/project/path';
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.environment.MEATYCAPTURE_DEFAULT_PROJECT_PATH).toBe('/custom/project/path');
    });

    it('should show null for unset environment variables', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      // Config dir is set in beforeEach, so only test the others
      expect(data.environment.MEATYCAPTURE_DEFAULT_PROJECT).toBeNull();
      expect(data.environment.MEATYCAPTURE_DEFAULT_PROJECT_PATH).toBeNull();
    });
  });

  describe('default project resolution', () => {
    it('should show default project from environment variable', async () => {
      process.env['MEATYCAPTURE_DEFAULT_PROJECT'] = 'env-project';
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.default_project).toBe('env-project');
    });

    it('should show default project from registry when env var not set', async () => {
      // Create projects.json with enabled project
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

      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.default_project).toBe('test-project');
    });

    it('should show null when no default project is set', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.default_project).toBeNull();
    });

    it('should prioritize environment variable over registry', async () => {
      process.env['MEATYCAPTURE_DEFAULT_PROJECT'] = 'env-project';

      // Create projects.json with different enabled project
      const projectsData = {
        projects: [
          {
            id: 'registry-project',
            name: 'Registry Project',
            default_path: '/registry/path',
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

      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.default_project).toBe('env-project');
    });

    it('should show null when projects file does not exist', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.default_project).toBeNull();
    });

    it('should show null when no enabled projects exist', async () => {
      // Create projects.json with only disabled projects
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

      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.default_project).toBeNull();
    });
  });

  describe('output paths', () => {
    it('should show correct config directory path', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.config_dir).toBe(configDir);
    });

    it('should show correct projects file path', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.projects_file).toBe(join(configDir, 'projects.json'));
    });

    it('should show correct fields file path', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({ json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const data = JSON.parse(logs.join('\n'));

      expect(data.fields_file).toBe(join(configDir, 'fields.json'));
    });
  });

  describe('exit behavior', () => {
    it('should always exit with code 0 (success)', async () => {
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
    });

    it('should exit with code 0 even when files do not exist', async () => {
      // Don't create any config files
      const { showAction } = await import('@cli/commands/config/show');

      await expect(showAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
    });
  });
});
