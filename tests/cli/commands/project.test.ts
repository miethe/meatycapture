/**
 * Project Command Tests
 *
 * Tests all project subcommands:
 * - list: List all projects with filtering, sorting, and output formats
 * - add: Create new projects with validation
 * - update: Update existing project configuration
 * - enable: Enable projects (idempotent)
 * - disable: Disable projects (idempotent)
 * - set-default: Set default project in CLI config
 *
 * Each command is tested for:
 * - Valid input handling
 * - Error conditions and validation
 * - Output format options (JSON, YAML, CSV, table, human)
 * - Exit code verification
 * - Edge cases and idempotency
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
import type { Project } from '@core/models';

// Note: We test the action functions directly rather than going through Commander
// because process.exit behavior makes end-to-end testing complex in vitest

describe('Project Commands', () => {
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

  describe('list command', () => {
    describe('empty project list', () => {
      it('should exit successfully with message for no projects', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('No projects found'))).toBe(true);
      });

      it('should output empty JSON array with --json', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toContain('[]');
      });

      it('should output CSV header only with --csv', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ csv: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('id,name,default_path'))).toBe(true);
      });
    });

    describe('with projects', () => {
      beforeEach(async () => {
        // Create test projects with delays to ensure different timestamps
        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();

        await store.create({
          name: 'Alpha Project',
          default_path: tempDir,
          enabled: true,
        });

        // Small delay to ensure different created_at
        await new Promise(resolve => setTimeout(resolve, 10));

        await store.create({
          name: 'Beta Project',
          default_path: tempDir,
          enabled: false,
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        await store.create({
          name: 'Gamma Project',
          default_path: tempDir,
          enabled: true,
        });
      });

      it('should list all projects', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();

        if (jsonLog) {
          const projects = JSON.parse(jsonLog) as Project[];
          expect(projects).toHaveLength(3);
        }
      });

      it('should filter enabled projects only', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ enabledOnly: true, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const projects = JSON.parse(jsonLog) as Project[];
          expect(projects).toHaveLength(2);
          expect(projects.every(p => p.enabled)).toBe(true);
        }
      });

      it('should filter disabled projects only', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ disabledOnly: true, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const projects = JSON.parse(jsonLog) as Project[];
          expect(projects).toHaveLength(1);
          expect(projects.every(p => !p.enabled)).toBe(true);
        }
      });

      it('should return empty list when both enabled and disabled flags set', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ enabledOnly: true, disabledOnly: true, json: true }))
          .rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toContain('[]');
      });

      it('should sort by name (default)', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const projects = JSON.parse(jsonLog) as Project[];
          expect(projects[0]?.name).toBe('Alpha Project');
          expect(projects[1]?.name).toBe('Beta Project');
          expect(projects[2]?.name).toBe('Gamma Project');
        }
      });

      it('should sort by id', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ sort: 'id', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const projects = JSON.parse(jsonLog) as Project[];
          const ids = projects.map(p => p.id);
          const sortedIds = [...ids].sort();
          expect(ids).toEqual(sortedIds);
        }
      });

      it('should sort by created date', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ sort: 'created', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const projects = JSON.parse(jsonLog) as Array<Omit<Project, 'created_at' | 'updated_at'> & { created_at: string; updated_at: string }>;
          expect(projects).toHaveLength(3);
          // Verify chronological order (dates are ISO strings in JSON)
          for (let i = 1; i < projects.length; i++) {
            const prev = projects[i - 1];
            const curr = projects[i];
            if (prev && curr) {
              expect(new Date(prev.created_at).getTime()).toBeLessThanOrEqual(new Date(curr.created_at).getTime());
            }
          }
        }
      });
    });

    describe('output formats', () => {
      beforeEach(async () => {
        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        await store.create({
          name: 'Test Project',
          default_path: tempDir,
          enabled: true,
        });
      });

      it('should output JSON with --json', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('name:'))).toBe(true);
      });

      it('should output CSV with --csv', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ csv: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('id,name,default_path'))).toBe(true);
      });

      it('should output table with --table', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ table: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.length).toBeGreaterThan(0);
      });

      it('should suppress output in quiet mode', async () => {
        const { listAction } = await import('@cli/commands/project/list');

        await expect(listAction({ quiet: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });
    });
  });

  describe('add command', () => {
    describe('valid project creation', () => {
      it('should create project with auto-generated ID', async () => {
        const { addAction } = await import('@cli/commands/project/add');

        await expect(addAction('My Project', tempDir, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify project was created
        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('my-project');

        expect(project).toBeDefined();
        expect(project?.name).toBe('My Project');
        expect(project?.id).toBe('my-project');
      });

      it('should validate custom ID format', async () => {
        const { addAction } = await import('@cli/commands/project/add');

        // Custom ID validation happens, but store still generates ID from name
        // This is current implementation behavior - ID is validated but not used
        await expect(addAction('Test', tempDir, { id: 'custom-id', json: true }))
          .rejects.toThrow(ExitError);

        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('test'); // ID generated from name

        expect(project).toBeDefined();
        expect(project?.name).toBe('Test');
      });

      it('should create project with repo URL', async () => {
        const { addAction } = await import('@cli/commands/project/add');

        await expect(
          addAction('Test', tempDir, {
            repoUrl: 'https://github.com/user/repo',
            json: true,
          })
        ).rejects.toThrow(ExitError);

        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('test');

        expect(project?.repo_url).toBe('https://github.com/user/repo');
      });
    });

    describe('validation errors', () => {
      it('should throw ValidationError for empty name', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('', tempDir, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for empty path', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Test', '', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw error for non-existent path', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Test', '/nonexistent/path', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.IO_ERROR);
      });

      it('should throw ValidationError for invalid custom ID format', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Test', tempDir, { id: 'Invalid_ID' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should reject ID with uppercase letters', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Test', tempDir, { id: 'My-Project' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should reject ID starting with hyphen', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Test', tempDir, { id: '-my-project' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should reject ID with consecutive hyphens', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Test', tempDir, { id: 'my--project' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });
    });

    describe('duplicate ID handling', () => {
      beforeEach(async () => {
        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        await store.create({
          name: 'Existing Project',
          default_path: tempDir,
          enabled: true,
        });
      });

      it('should throw ResourceConflictError for duplicate auto-generated ID', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('Existing Project', tempDir, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_CONFLICT);
      });

      it('should throw ResourceConflictError for duplicate custom ID', async () => {
        const { addAction } = await import('@cli/commands/project/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('New Name', tempDir, { id: 'existing-project' }))
          .rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_CONFLICT);
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const { addAction } = await import('@cli/commands/project/add');

        await expect(addAction('Test', tempDir, { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const { addAction } = await import('@cli/commands/project/add');

        await expect(addAction('Test', tempDir, { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('name:'))).toBe(true);
      });

      it('should output human format by default', async () => {
        const { addAction } = await import('@cli/commands/project/add');

        await expect(addAction('Test', tempDir, {})).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('created successfully'))).toBe(true);
      });
    });
  });

  describe('update command', () => {
    beforeEach(async () => {
      const { createProjectStore } = await import('@adapters/config-local');
      const store = createProjectStore();
      await store.create({
        name: 'Original Name',
        default_path: tempDir,
        enabled: true,
        repo_url: 'https://github.com/original/repo',
      });
    });

    describe('valid updates', () => {
      it('should update project name', async () => {
        const { updateAction } = await import('@cli/commands/project/update');

        await expect(updateAction('original-name', { name: 'Updated Name', json: true }))
          .rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('original-name');

        expect(project?.name).toBe('Updated Name');
      });

      it('should update project path', async () => {
        const newPath = join(tempDir, 'new-path');
        await fs.mkdir(newPath, { recursive: true });

        const { updateAction } = await import('@cli/commands/project/update');

        await expect(updateAction('original-name', { path: newPath, json: true }))
          .rejects.toThrow(ExitError);

        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('original-name');

        expect(project?.default_path).toBe(newPath);
      });

      it('should update repo URL', async () => {
        const { updateAction } = await import('@cli/commands/project/update');

        await expect(
          updateAction('original-name', {
            repoUrl: 'https://github.com/updated/repo',
            json: true,
          })
        ).rejects.toThrow(ExitError);

        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('original-name');

        expect(project?.repo_url).toBe('https://github.com/updated/repo');
      });

      it('should update multiple fields simultaneously', async () => {
        const newPath = join(tempDir, 'new-path');
        await fs.mkdir(newPath, { recursive: true });

        const { updateAction } = await import('@cli/commands/project/update');

        await expect(
          updateAction('original-name', {
            name: 'Multi Update',
            path: newPath,
            repoUrl: 'https://github.com/multi/repo',
            json: true,
          })
        ).rejects.toThrow(ExitError);

        const { createProjectStore } = await import('@adapters/config-local');
        const store = createProjectStore();
        const project = await store.get('original-name');

        expect(project?.name).toBe('Multi Update');
        expect(project?.default_path).toBe(newPath);
        expect(project?.repo_url).toBe('https://github.com/multi/repo');
      });
    });

    describe('validation errors', () => {
      it('should throw ValidationError when no fields specified', async () => {
        const { updateAction } = await import('@cli/commands/project/update');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(updateAction);
        await expect(wrapped('original-name', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for invalid path', async () => {
        const { updateAction } = await import('@cli/commands/project/update');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(updateAction);
        await expect(wrapped('original-name', { path: '/nonexistent/path' }))
          .rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ResourceNotFoundError for non-existent project', async () => {
        const { updateAction } = await import('@cli/commands/project/update');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(updateAction);
        await expect(wrapped('nonexistent', { name: 'New Name' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const { updateAction } = await import('@cli/commands/project/update');

        await expect(updateAction('original-name', { name: 'Updated', json: true }))
          .rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const { updateAction } = await import('@cli/commands/project/update');

        await expect(updateAction('original-name', { name: 'Updated', yaml: true }))
          .rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('name:'))).toBe(true);
      });
    });
  });

  describe('enable command', () => {
    beforeEach(async () => {
      const { createProjectStore } = await import('@adapters/config-local');
      const store = createProjectStore();

      // Create enabled and disabled projects
      await store.create({
        name: 'Enabled Project',
        default_path: tempDir,
        enabled: true,
      });

      const disabled = await store.create({
        name: 'Disabled Project',
        default_path: tempDir,
        enabled: true,
      });
      await store.update(disabled.id, { enabled: false });
    });

    it('should enable disabled project', async () => {
      const { enableAction } = await import('@cli/commands/project/enable');

      await expect(enableAction('disabled-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const { createProjectStore } = await import('@adapters/config-local');
      const store = createProjectStore();
      const project = await store.get('disabled-project');

      expect(project?.enabled).toBe(true);
    });

    it('should succeed when enabling already-enabled project (idempotent)', async () => {
      const { enableAction } = await import('@cli/commands/project/enable');

      await expect(enableAction('enabled-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs.some(log => log.includes('is already enabled'))).toBe(true);
    });

    it('should exit with RESOURCE_NOT_FOUND for non-existent project', async () => {
      const { enableAction } = await import('@cli/commands/project/enable');

      await expect(enableAction('nonexistent', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const { enableAction } = await import('@cli/commands/project/enable');

        await expect(enableAction('disabled-project', { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const { enableAction } = await import('@cli/commands/project/enable');

        await expect(enableAction('disabled-project', { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('enabled:'))).toBe(true);
      });
    });
  });

  describe('disable command', () => {
    beforeEach(async () => {
      const { createProjectStore } = await import('@adapters/config-local');
      const store = createProjectStore();

      // Create enabled and disabled projects
      await store.create({
        name: 'Enabled Project',
        default_path: tempDir,
        enabled: true,
      });

      const disabled = await store.create({
        name: 'Disabled Project',
        default_path: tempDir,
        enabled: true,
      });
      await store.update(disabled.id, { enabled: false });
    });

    it('should disable enabled project', async () => {
      const { disableAction } = await import('@cli/commands/project/disable');

      await expect(disableAction('enabled-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const { createProjectStore } = await import('@adapters/config-local');
      const store = createProjectStore();
      const project = await store.get('enabled-project');

      expect(project?.enabled).toBe(false);
    });

    it('should succeed when disabling already-disabled project (idempotent)', async () => {
      const { disableAction } = await import('@cli/commands/project/disable');

      await expect(disableAction('disabled-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const logs = getCapturedLogs();
      expect(logs.some(log => log.includes('is already disabled'))).toBe(true);
    });

    it('should exit with RESOURCE_NOT_FOUND for non-existent project', async () => {
      const { disableAction } = await import('@cli/commands/project/disable');

      await expect(disableAction('nonexistent', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const { disableAction } = await import('@cli/commands/project/disable');

        await expect(disableAction('enabled-project', { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const { disableAction } = await import('@cli/commands/project/disable');

        await expect(disableAction('enabled-project', { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('enabled:'))).toBe(true);
      });
    });
  });

  describe('set-default command', () => {
    beforeEach(async () => {
      const { createProjectStore } = await import('@adapters/config-local');
      const store = createProjectStore();
      await store.create({
        name: 'Test Project',
        default_path: tempDir,
        enabled: true,
      });
    });

    it('should set valid project as default', async () => {
      const { setDefaultAction } = await import('@cli/commands/project/set-default');

      await expect(setDefaultAction('test-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify config file was created/updated
      const configPath = join(configDir, 'config.json');
      const exists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      expect(config.default_project).toBe('test-project');
    });

    it('should throw ResourceNotFoundError for non-existent project', async () => {
      const { setDefaultAction } = await import('@cli/commands/project/set-default');
      const { withErrorHandling } = await import('@cli/handlers/errors');

      const wrapped = withErrorHandling(setDefaultAction);
      await expect(wrapped('nonexistent', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
    });

    it('should create config directory if it does not exist', async () => {
      // Remove config dir but keep projects registry
      const projectsPath = join(configDir, 'projects.json');
      const projectsContent = await fs.readFile(projectsPath, 'utf-8');

      await fs.rm(configDir, { recursive: true, force: true });

      // Recreate config dir and projects file
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(projectsPath, projectsContent, 'utf-8');

      const { setDefaultAction } = await import('@cli/commands/project/set-default');

      await expect(setDefaultAction('test-project', {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify config.json was created
      const configPath = join(configDir, 'config.json');
      const exists = await fs.access(configPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    describe('output formats', () => {
      it('should output config as JSON with --json', async () => {
        const { setDefaultAction } = await import('@cli/commands/project/set-default');

        await expect(setDefaultAction('test-project', { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);

        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const config = JSON.parse(jsonLog);
          expect(config.default_project).toBe('test-project');
        }
      });

      it('should output config as YAML with --yaml', async () => {
        const { setDefaultAction } = await import('@cli/commands/project/set-default');

        await expect(setDefaultAction('test-project', { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('default_project:'))).toBe(true);
      });

      it('should output human-readable message by default', async () => {
        const { setDefaultAction } = await import('@cli/commands/project/set-default');

        await expect(setDefaultAction('test-project', {})).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('Default project set to'))).toBe(true);
      });
    });
  });

  describe('handler utilities', () => {
    describe('validateProjectId', () => {
      it('should accept valid kebab-case IDs', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('my-project')).not.toThrow();
        expect(() => validateProjectId('project-2')).not.toThrow();
        expect(() => validateProjectId('a')).not.toThrow();
        expect(() => validateProjectId('my-long-project-name-123')).not.toThrow();
      });

      it('should reject uppercase letters', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('My-Project')).toThrow();
        expect(() => validateProjectId('PROJECT')).toThrow();
      });

      it('should reject IDs starting with hyphen', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('-my-project')).toThrow();
      });

      it('should reject IDs ending with hyphen', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('my-project-')).toThrow();
      });

      it('should reject consecutive hyphens', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('my--project')).toThrow();
      });

      it('should reject underscores', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('my_project')).toThrow();
      });

      it('should reject special characters', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('my@project')).toThrow();
        expect(() => validateProjectId('my.project')).toThrow();
        expect(() => validateProjectId('my/project')).toThrow();
      });

      it('should reject empty strings', async () => {
        const { validateProjectId } = await import('@cli/handlers/project');

        expect(() => validateProjectId('')).toThrow();
        expect(() => validateProjectId('   ')).toThrow();
      });
    });

    describe('validatePathExists', () => {
      it('should accept existing directory', async () => {
        const { validatePathExists } = await import('@cli/handlers/project');

        await expect(validatePathExists(tempDir)).resolves.not.toThrow();
      });

      it('should reject non-existent path', async () => {
        const { validatePathExists } = await import('@cli/handlers/project');

        await expect(validatePathExists('/nonexistent/path')).rejects.toThrow();
      });

      it('should reject file (not directory)', async () => {
        const filePath = join(tempDir, 'file.txt');
        await fs.writeFile(filePath, 'content', 'utf-8');

        const { validatePathExists } = await import('@cli/handlers/project');

        await expect(validatePathExists(filePath)).rejects.toThrow();
      });
    });

    describe('validatePathWritable', () => {
      it('should accept writable directory', async () => {
        const { validatePathWritable } = await import('@cli/handlers/project');

        await expect(validatePathWritable(tempDir)).resolves.not.toThrow();
      });

      // Note: Testing non-writable directories is OS-dependent and complex
      // Skipping that test case to avoid flakiness
    });

    describe('generateProjectIdFromName', () => {
      it('should generate kebab-case ID from name', async () => {
        const { generateProjectIdFromName } = await import('@cli/handlers/project');

        expect(generateProjectIdFromName('My Project')).toBe('my-project');
        expect(generateProjectIdFromName('Project 2.0')).toBe('project-20');
        expect(generateProjectIdFromName('Special!@# Chars')).toBe('special-chars');
      });

      it('should handle multiple spaces', async () => {
        const { generateProjectIdFromName } = await import('@cli/handlers/project');

        expect(generateProjectIdFromName('My   Project')).toBe('my-project');
      });

      it('should throw for names that generate empty IDs', async () => {
        const { generateProjectIdFromName } = await import('@cli/handlers/project');

        expect(() => generateProjectIdFromName('   ')).toThrow();
        expect(() => generateProjectIdFromName('!@#$%')).toThrow();
      });
    });
  });
});

/**
 * Custom error class for capturing process.exit calls in tests.
 */
class ExitError extends Error {
  constructor(public code: number) {
    super(`Process exited with code ${code}`);
    this.name = 'ExitError';
  }
}
