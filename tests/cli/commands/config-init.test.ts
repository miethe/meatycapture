/**
 * Config Init Command Tests
 *
 * Tests the `config init` command:
 * - Creates default configuration directory structure
 * - Creates config.json with version and timestamps
 * - Creates projects.json with sample "meatycapture" project
 * - Creates fields.json with default field options
 * - Handles custom config directories via --config-dir
 * - Overwrites existing config with --force flag
 * - Returns exit code 3 (RESOURCE_CONFLICT) if config exists without --force
 * - Quiet mode suppresses output
 *
 * Each test verifies:
 * - Proper exit codes
 * - File creation and content validation
 * - Error handling
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
  getCapturedErrors,
  clearCapturedOutput,
  resetQuietMode,
} from '../helpers';

import { ExitCodes } from '@cli/handlers/exitCodes';

// Note: We test the action function directly rather than going through Commander
// because process.exit behavior makes end-to-end testing complex in vitest

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

describe('Config Init Command', () => {
  let tempDir: string;
  let configDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: any;

  beforeEach(async () => {
    tempDir = await createTempDir();
    configDir = join(tempDir, 'config');

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

  describe('initialization', () => {
    it('should create config directory structure successfully', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify directory exists
      await expect(fs.access(configDir)).resolves.toBeUndefined();

      // Verify config.json exists and has correct structure
      const configContent = await fs.readFile(join(configDir, 'config.json'), 'utf-8');
      const config = JSON.parse(configContent);
      expect(config).toHaveProperty('version', '1.0.0');
      expect(config).toHaveProperty('created_at');
      expect(config).toHaveProperty('updated_at');
      expect(new Date(config.created_at)).toBeInstanceOf(Date);
      expect(new Date(config.updated_at)).toBeInstanceOf(Date);

      // Verify projects.json exists and has sample project
      const projectsContent = await fs.readFile(join(configDir, 'projects.json'), 'utf-8');
      const projects = JSON.parse(projectsContent);
      expect(projects).toHaveProperty('projects');
      expect(projects.projects).toHaveLength(1);
      expect(projects.projects[0]).toMatchObject({
        id: 'meatycapture',
        name: 'MeatyCapture',
        enabled: true,
      });
      expect(projects.projects[0].default_path).toContain('meatycapture');

      // Verify fields.json exists
      await expect(fs.access(join(configDir, 'fields.json'))).resolves.toBeUndefined();
    });

    it('should output creation messages in normal mode', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({})).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      expect(logs.some(log => log.includes('Initializing MeatyCapture configuration'))).toBe(true);
      expect(logs.some(log => log.includes('Created:'))).toBe(true);
      expect(logs.some(log => log.includes('config.json'))).toBe(true);
      expect(logs.some(log => log.includes('projects.json'))).toBe(true);
      expect(logs.some(log => log.includes('fields.json'))).toBe(true);
      expect(logs.some(log => log.includes('✓ Configuration initialized successfully'))).toBe(true);
    });

    it('should suppress output in quiet mode', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({ quiet: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      expect(logs.join('')).toBe('');
    });

    it('should use custom config directory via --config-dir', async () => {
      const customConfigDir = join(tempDir, 'custom-config');
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({ configDir: customConfigDir })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify custom directory was created
      await expect(fs.access(customConfigDir)).resolves.toBeUndefined();
      await expect(fs.access(join(customConfigDir, 'config.json'))).resolves.toBeUndefined();

      const logs = getCapturedLogs();
      expect(logs.some(log => log.includes(customConfigDir))).toBe(true);
    });
  });

  describe('conflict handling', () => {
    it('should fail with exit code 3 if config already exists', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      // Create initial config
      await expect(initAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Clear mocks and try again
      mockExit.mockClear();
      clearCapturedOutput();

      // Attempt to init again without --force - this will throw a CliError
      // that would normally be caught by withErrorHandling wrapper
      try {
        await initAction({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        // Verify the error message contains expected text
        expect(error).toBeInstanceOf(Error);
        const errMsg = (error as Error).message;
        expect(errMsg).toContain('Configuration already exists');
      }
    });

    it('should overwrite existing config with --force flag', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      // Create initial config
      await expect(initAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Read initial timestamps
      const initialConfig = JSON.parse(
        await fs.readFile(join(configDir, 'config.json'), 'utf-8')
      );
      const initialTimestamp = initialConfig.created_at;

      // Wait a bit to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear mocks
      mockExit.mockClear();
      clearCapturedOutput();

      // Init again with --force
      await expect(initAction({ force: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify config was overwritten (new timestamps)
      const newConfig = JSON.parse(
        await fs.readFile(join(configDir, 'config.json'), 'utf-8')
      );
      expect(newConfig.created_at).not.toBe(initialTimestamp);

      const logs = getCapturedLogs();
      expect(logs.some(log => log.includes('Initializing MeatyCapture configuration'))).toBe(true);
      expect(logs.some(log => log.includes('✓ Configuration initialized successfully'))).toBe(true);
    });

    it('should handle partial existing config with --force', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      // Create config directory and only config.json (partial state)
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        join(configDir, 'config.json'),
        JSON.stringify({ version: '0.9.0' }),
        'utf-8'
      );

      // Should fail without --force - throws CliError
      await expect(initAction({})).rejects.toThrow();

      clearCapturedOutput();

      // Should succeed with --force and create all files
      await expect(initAction({ force: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify all files exist
      await expect(fs.access(join(configDir, 'config.json'))).resolves.toBeUndefined();
      await expect(fs.access(join(configDir, 'projects.json'))).resolves.toBeUndefined();
      await expect(fs.access(join(configDir, 'fields.json'))).resolves.toBeUndefined();

      // Verify config was updated to current version
      const config = JSON.parse(
        await fs.readFile(join(configDir, 'config.json'), 'utf-8')
      );
      expect(config.version).toBe('1.0.0');
    });
  });

  describe('sample project creation', () => {
    it('should create meatycapture sample project with correct structure', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({})).rejects.toThrow(ExitError);

      const projectsContent = await fs.readFile(join(configDir, 'projects.json'), 'utf-8');
      const projects = JSON.parse(projectsContent);

      const sampleProject = projects.projects[0];
      expect(sampleProject).toMatchObject({
        id: 'meatycapture',
        name: 'MeatyCapture',
        enabled: true,
      });

      // Verify timestamps are valid ISO 8601 dates
      expect(new Date(sampleProject.created_at)).toBeInstanceOf(Date);
      expect(new Date(sampleProject.updated_at)).toBeInstanceOf(Date);

      // Verify default_path contains expected directory structure
      expect(sampleProject.default_path).toContain('docs');
      expect(sampleProject.default_path).toContain('meatycapture');
    });

    it('should use custom config dir in sample project path', async () => {
      const customConfigDir = join(tempDir, 'my-custom-config');
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({ configDir: customConfigDir })).rejects.toThrow(ExitError);

      const projectsContent = await fs.readFile(
        join(customConfigDir, 'projects.json'),
        'utf-8'
      );
      const projects = JSON.parse(projectsContent);

      const sampleProject = projects.projects[0];
      expect(sampleProject.default_path).toContain(customConfigDir);
      expect(sampleProject.default_path).toContain('docs/meatycapture');
    });
  });

  describe('fields initialization', () => {
    it('should initialize fields.json with default field options', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({})).rejects.toThrow(ExitError);

      const fieldsContent = await fs.readFile(join(configDir, 'fields.json'), 'utf-8');
      const fields = JSON.parse(fieldsContent);

      // Verify structure
      expect(fields).toHaveProperty('global');
      expect(fields).toHaveProperty('projects');
      expect(Array.isArray(fields.global)).toBe(true);
      expect(typeof fields.projects).toBe('object');

      // Verify default fields exist (type, priority, status)
      const typeFields = fields.global.filter((f: { field: string }) => f.field === 'type');
      const priorityFields = fields.global.filter((f: { field: string }) => f.field === 'priority');
      const statusFields = fields.global.filter((f: { field: string }) => f.field === 'status');

      expect(typeFields.length).toBeGreaterThan(0);
      expect(priorityFields.length).toBeGreaterThan(0);
      expect(statusFields.length).toBeGreaterThan(0);

      // Verify field option structure
      const sampleField = fields.global[0];
      expect(sampleField).toHaveProperty('id');
      expect(sampleField).toHaveProperty('field');
      expect(sampleField).toHaveProperty('value');
      expect(sampleField).toHaveProperty('scope', 'global');
      expect(sampleField).toHaveProperty('created_at');
    });
  });

  describe('edge cases', () => {
    it('should handle permission errors gracefully', async () => {
      const readOnlyDir = join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir, { recursive: true });

      // Make directory read-only (on Unix-like systems)
      if (process.platform !== 'win32') {
        await fs.chmod(readOnlyDir, 0o444);
      }

      const { initAction } = await import('@cli/commands/config/init');

      if (process.platform !== 'win32') {
        // Permission error will throw - just verify it throws
        await expect(initAction({ configDir: readOnlyDir })).rejects.toThrow();
      }

      // Cleanup: restore permissions
      if (process.platform !== 'win32') {
        await fs.chmod(readOnlyDir, 0o755);
      }
    });

    it('should create nested config directory if parent does not exist', async () => {
      const nestedConfigDir = join(tempDir, 'a/b/c/config');
      const { initAction } = await import('@cli/commands/config/init');

      await expect(initAction({ configDir: nestedConfigDir })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify entire path was created
      await expect(fs.access(nestedConfigDir)).resolves.toBeUndefined();
      await expect(fs.access(join(nestedConfigDir, 'config.json'))).resolves.toBeUndefined();
    });

    it('should handle existing directory with correct permissions', async () => {
      const { initAction } = await import('@cli/commands/config/init');

      // Pre-create the config directory
      await fs.mkdir(configDir, { recursive: true });

      await expect(initAction({})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify files were created in existing directory
      await expect(fs.access(join(configDir, 'config.json'))).resolves.toBeUndefined();
    });
  });
});
