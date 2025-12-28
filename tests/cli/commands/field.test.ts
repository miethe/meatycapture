/**
 * Field Command Tests
 *
 * Tests all field subcommands:
 * - list: List field options with filtering, sorting, and output formats
 * - add: Create new field options (global and project-scoped)
 * - remove: Delete field options with safety confirmation
 * - import: Batch import field options from JSON/YAML files
 *
 * Each command is tested for:
 * - Valid input handling
 * - Error conditions and validation
 * - Output format options (JSON, YAML, CSV, table, human)
 * - Exit code verification
 * - Edge cases and CRUD workflows
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
import type { FieldOption } from '@core/models';

// Note: We test the action functions directly rather than going through Commander
// because process.exit behavior makes end-to-end testing complex in vitest

describe('Field Commands', () => {
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
    describe('empty field catalog', () => {
      it('should show default field options on first access', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();

        if (jsonLog) {
          const grouped = JSON.parse(jsonLog);
          // Should have default options for type, priority, status
          expect(grouped).toHaveProperty('type');
          expect(grouped).toHaveProperty('priority');
          expect(grouped).toHaveProperty('status');
        }
      });

      it('should output CSV header with default options', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ csv: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('field,value,scope'))).toBe(true);
        expect(logs.some(log => log.includes('enhancement'))).toBe(true);
      });
    });

    describe('with custom field options', () => {
      beforeEach(async () => {
        // Create test projects
        const { createProjectStore } = await import('@adapters/config-local');
        const projectStore = createProjectStore();

        await projectStore.create({
          name: 'Test Project',
          default_path: tempDir,
          enabled: true,
        });

        // Add custom field options
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();

        await fieldStore.addOption({
          field: 'type',
          value: 'spike',
          scope: 'global',
        });

        await fieldStore.addOption({
          field: 'priority',
          value: 'urgent',
          scope: 'project',
          project_id: 'test-project',
        });
      });

      it('should list all global options', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const grouped = JSON.parse(jsonLog);
          const typeOptions = grouped.type as FieldOption[];
          expect(typeOptions.some((opt: FieldOption) => opt.value === 'spike')).toBe(true);
          // Project-scoped option should not appear in global list
          const priorityOptions = grouped.priority as FieldOption[];
          expect(priorityOptions.every((opt: FieldOption) => opt.value !== 'urgent')).toBe(true);
        }
      });

      it('should list effective options for project', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ project: 'test-project', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const grouped = JSON.parse(jsonLog);
          const priorityOptions = grouped.priority as FieldOption[];
          expect(priorityOptions.some((opt: FieldOption) => opt.value === 'urgent')).toBe(true);
        }
      });

      it('should filter by field name', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ field: 'type', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const grouped = JSON.parse(jsonLog);
          expect(grouped).toHaveProperty('type');
          expect(grouped).not.toHaveProperty('priority');
          expect(grouped).not.toHaveProperty('status');
        }
      });

      it('should return error for invalid field name', async () => {
        const { listAction } = await import('@cli/commands/field/list');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(listAction);
        await expect(wrapped({ field: 'invalid' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should return error for non-existent project', async () => {
        const { listAction } = await import('@cli/commands/field/list');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(listAction);
        await expect(wrapped({ project: 'nonexistent' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
      });
    });

    describe('output formats', () => {
      it('should output human-readable format by default', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({})).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('type:'))).toBe(true);
        expect(logs.some(log => log.includes('[global]'))).toBe(true);
      });

      it('should output JSON with --json', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('type:') && log.includes('  -'))).toBe(true);
      });

      it('should output CSV with --csv', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ csv: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('field,value,scope'))).toBe(true);
      });

      it('should output table with --table', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ table: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('FIELD'))).toBe(true);
        expect(logs.some(log => log.includes('|'))).toBe(true);
      });

      it('should suppress output in quiet mode', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ quiet: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });
    });

    describe('sorting', () => {
      beforeEach(async () => {
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();

        // Add options in non-alphabetical order
        await fieldStore.addOption({ field: 'type', value: 'zebra', scope: 'global' });
        await fieldStore.addOption({ field: 'type', value: 'apple', scope: 'global' });
        await fieldStore.addOption({ field: 'domain', value: 'web', scope: 'global' });
        await fieldStore.addOption({ field: 'domain', value: 'api', scope: 'global' });
      });

      it('should sort fields alphabetically in human format', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({})).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        // Find field names in output (lines ending with colon)
        const fieldLines = logs.filter(log => /^[a-z]+:$/.test(log));
        const fields = fieldLines.map(line => line.replace(':', ''));

        // Verify alphabetical ordering
        for (let i = 1; i < fields.length; i++) {
          const prev = fields[i - 1];
          const curr = fields[i];
          if (prev && curr) {
            expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
          }
        }
      });

      it('should sort values within each field alphabetically', async () => {
        const { listAction } = await import('@cli/commands/field/list');

        await expect(listAction({ field: 'type', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const grouped = JSON.parse(jsonLog);
          const typeOptions = grouped.type as FieldOption[];
          const values = typeOptions.map((opt: FieldOption) => opt.value);

          // Check alphabetical order
          for (let i = 1; i < values.length; i++) {
            const prev = values[i - 1];
            const curr = values[i];
            if (prev && curr) {
              expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
            }
          }
        }
      });
    });
  });

  describe('add command', () => {
    describe('valid field option creation', () => {
      it('should add global field option', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', 'spike', { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify option was created
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const globalOptions = await fieldStore.getGlobal();

        expect(globalOptions.some(opt => opt.field === 'type' && opt.value === 'spike')).toBe(true);
      });

      it('should add project-specific field option', async () => {
        // Create test project first
        const { createProjectStore } = await import('@adapters/config-local');
        const projectStore = createProjectStore();
        await projectStore.create({
          name: 'Test Project',
          default_path: tempDir,
          enabled: true,
        });

        const { addAction } = await import('@cli/commands/field/add');

        await expect(
          addAction('priority', 'urgent', { project: 'test-project', json: true })
        ).rejects.toThrow(ExitError);

        // Verify option was created
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const projectOptions = await fieldStore.getForProject('test-project');

        expect(
          projectOptions.some(
            opt =>
              opt.field === 'priority' &&
              opt.value === 'urgent' &&
              opt.scope === 'project' &&
              opt.project_id === 'test-project'
          )
        ).toBe(true);
      });

      it('should auto-generate unique ID for option', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', 'spike', { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const option = JSON.parse(jsonLog) as FieldOption;
          expect(option.id).toBeDefined();
          expect(option.id).toMatch(/^type-spike-\d+$/);
        }
      });

      it('should set created_at timestamp', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        const before = new Date();
        await expect(addAction('type', 'spike', { json: true })).rejects.toThrow(ExitError);
        const after = new Date();

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const option = JSON.parse(jsonLog);
          const createdAt = new Date(option.created_at);
          expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        }
      });

      it('should trim whitespace from value', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', '  spike  ', { json: true })).rejects.toThrow(ExitError);

        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const globalOptions = await fieldStore.getGlobal();

        const option = globalOptions.find(opt => opt.field === 'type' && opt.value === 'spike');
        expect(option).toBeDefined();
        expect(option?.value).toBe('spike');
      });
    });

    describe('validation errors', () => {
      it('should throw ValidationError for invalid field name', async () => {
        const { addAction } = await import('@cli/commands/field/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('invalid', 'value', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for empty value', async () => {
        const { addAction } = await import('@cli/commands/field/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('type', '', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for whitespace-only value', async () => {
        const { addAction } = await import('@cli/commands/field/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('type', '   ', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ResourceNotFoundError for non-existent project', async () => {
        const { addAction } = await import('@cli/commands/field/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('type', 'spike', { project: 'nonexistent' })).rejects.toThrow(
          ExitError
        );
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
      });
    });

    describe('duplicate handling', () => {
      beforeEach(async () => {
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();

        // Add existing option
        await fieldStore.addOption({
          field: 'type',
          value: 'spike',
          scope: 'global',
        });
      });

      it('should throw ResourceConflictError for duplicate global option', async () => {
        const { addAction } = await import('@cli/commands/field/add');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(addAction);
        await expect(wrapped('type', 'spike', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_CONFLICT);
      });

      it('should allow same value in different scopes', async () => {
        // Create test project
        const { createProjectStore } = await import('@adapters/config-local');
        const projectStore = createProjectStore();
        await projectStore.create({
          name: 'Test Project',
          default_path: tempDir,
          enabled: true,
        });

        const { addAction } = await import('@cli/commands/field/add');

        // Should succeed: same value but different scope
        await expect(
          addAction('type', 'spike', { project: 'test-project', json: true })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', 'spike', { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);

        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const option = JSON.parse(jsonLog);
          expect(option.field).toBe('type');
          expect(option.value).toBe('spike');
          expect(option.scope).toBe('global');
        }
      });

      it('should output YAML with --yaml', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', 'spike', { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('field:'))).toBe(true);
        expect(logs.some(log => log.includes('value:'))).toBe(true);
      });

      it('should output human format by default', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', 'spike', {})).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('Added option'))).toBe(true);
        expect(logs.some(log => log.includes('spike'))).toBe(true);
      });

      it('should suppress output in quiet mode', async () => {
        const { addAction } = await import('@cli/commands/field/add');

        await expect(addAction('type', 'spike', { quiet: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });
    });
  });

  describe('remove command', () => {
    let optionId: string;

    beforeEach(async () => {
      // Add option to remove in tests
      const { createFieldCatalogStore } = await import('@adapters/config-local');
      const fieldStore = createFieldCatalogStore();

      const option = await fieldStore.addOption({
        field: 'type',
        value: 'spike',
        scope: 'global',
      });
      optionId = option.id;
    });

    describe('successful removal', () => {
      it('should remove option with --force', async () => {
        const { removeAction } = await import('@cli/commands/field/remove');

        await expect(removeAction(optionId, { force: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify option was removed
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const globalOptions = await fieldStore.getGlobal();

        expect(globalOptions.some(opt => opt.id === optionId)).toBe(false);
      });

      it('should output success message', async () => {
        const { removeAction } = await import('@cli/commands/field/remove');

        await expect(removeAction(optionId, { force: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('Removed'))).toBe(true);
        expect(logs.some(log => log.includes('spike'))).toBe(true);
      });

      it('should suppress output in quiet mode', async () => {
        const { removeAction } = await import('@cli/commands/field/remove');

        await expect(removeAction(optionId, { force: true, quiet: true })).rejects.toThrow(
          ExitError
        );

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });
    });

    describe('validation errors', () => {
      it('should throw ResourceNotFoundError for non-existent option', async () => {
        const { removeAction } = await import('@cli/commands/field/remove');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(removeAction);
        await expect(wrapped('nonexistent-id', { force: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
      });
    });

    // Note: Confirmation prompt tests would require mocking readline.question
    // which is complex to test reliably. We're testing the force flag path instead.
  });

  describe('import command', () => {
    let jsonFilePath: string;
    let yamlFilePath: string;

    beforeEach(async () => {
      // Create test import files
      const importData = {
        type: ['feature-request', 'chore'],
        priority: ['p0', 'p1', 'p2'],
        domain: ['frontend', 'backend'],
      };

      jsonFilePath = join(tempDir, 'import.json');
      await fs.writeFile(jsonFilePath, JSON.stringify(importData, null, 2), 'utf-8');

      yamlFilePath = join(tempDir, 'import.yaml');
      const yamlContent = `type:
  - feature-request
  - chore
priority:
  - p0
  - p1
  - p2
domain:
  - frontend
  - backend
`;
      await fs.writeFile(yamlFilePath, yamlContent, 'utf-8');
    });

    describe('successful import', () => {
      it('should import from JSON file', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(jsonFilePath, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify options were created
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const globalOptions = await fieldStore.getGlobal();

        expect(
          globalOptions.some(opt => opt.field === 'type' && opt.value === 'feature-request')
        ).toBe(true);
        expect(globalOptions.some(opt => opt.field === 'priority' && opt.value === 'p0')).toBe(
          true
        );
        expect(globalOptions.some(opt => opt.field === 'domain' && opt.value === 'frontend')).toBe(
          true
        );
      });

      it('should import from YAML file', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(yamlFilePath, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify options were created
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const globalOptions = await fieldStore.getGlobal();

        expect(
          globalOptions.some(opt => opt.field === 'type' && opt.value === 'feature-request')
        ).toBe(true);
      });

      it('should import as project-specific options with --project', async () => {
        // Create test project
        const { createProjectStore } = await import('@adapters/config-local');
        const projectStore = createProjectStore();
        await projectStore.create({
          name: 'Test Project',
          default_path: tempDir,
          enabled: true,
        });

        const { importAction } = await import('@cli/commands/field/import');

        await expect(
          importAction(jsonFilePath, { project: 'test-project', json: true })
        ).rejects.toThrow(ExitError);

        // Verify options were created with project scope
        const { createFieldCatalogStore } = await import('@adapters/config-local');
        const fieldStore = createFieldCatalogStore();
        const projectOptions = await fieldStore.getForProject('test-project');

        expect(
          projectOptions.some(
            opt =>
              opt.field === 'type' &&
              opt.value === 'feature-request' &&
              opt.scope === 'project' &&
              opt.project_id === 'test-project'
          )
        ).toBe(true);
      });

      it('should report import summary', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(jsonFilePath, { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const summary = JSON.parse(jsonLog);
          expect(summary.total_fields).toBe(3);
          expect(summary.total_values).toBe(7);
          expect(summary.added).toBeGreaterThan(0);
          expect(summary.fields).toHaveProperty('type');
          expect(summary.fields).toHaveProperty('priority');
          expect(summary.fields).toHaveProperty('domain');
        }
      });

      it('should output human-readable summary by default', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(jsonFilePath, {})).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('Import complete'))).toBe(true);
        expect(logs.some(log => log.includes('added'))).toBe(true);
      });
    });

    describe('merge mode', () => {
      it('should fail on duplicates without --merge', async () => {
        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        // First import
        await expect(importAction(jsonFilePath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Reset mock
        mockExit.mockClear();

        // Second import without --merge should fail
        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(jsonFilePath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_CONFLICT);
      });

      it('should skip duplicates with --merge', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        // First import
        await expect(importAction(jsonFilePath, { json: true })).rejects.toThrow(ExitError);
        mockExit.mockClear();
        clearCapturedOutput();

        // Second import with --merge should succeed
        await expect(importAction(jsonFilePath, { merge: true, json: true })).rejects.toThrow(
          ExitError
        );
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));

        if (jsonLog) {
          const summary = JSON.parse(jsonLog);
          expect(summary.skipped).toBe(7); // All values already exist
          expect(summary.added).toBe(0);
        }
      });
    });

    describe('validation errors', () => {
      it('should throw FileNotFoundError for non-existent file', async () => {
        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped('/nonexistent/file.json', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.IO_ERROR);
      });

      it('should throw ValidationError for malformed JSON', async () => {
        const malformedPath = join(tempDir, 'malformed.json');
        await fs.writeFile(malformedPath, '{ invalid json }', 'utf-8');

        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(malformedPath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for malformed YAML', async () => {
        const malformedPath = join(tempDir, 'malformed.yaml');
        await fs.writeFile(malformedPath, 'invalid:\n  - yaml\n  invalid', 'utf-8');

        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(malformedPath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for invalid field name', async () => {
        const invalidPath = join(tempDir, 'invalid-field.json');
        await fs.writeFile(
          invalidPath,
          JSON.stringify({
            invalidField: ['value1', 'value2'],
          }),
          'utf-8'
        );

        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(invalidPath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for non-array values', async () => {
        const invalidPath = join(tempDir, 'invalid-values.json');
        await fs.writeFile(
          invalidPath,
          JSON.stringify({
            type: 'not-an-array',
          }),
          'utf-8'
        );

        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(invalidPath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ValidationError for empty string values', async () => {
        const invalidPath = join(tempDir, 'empty-values.json');
        await fs.writeFile(
          invalidPath,
          JSON.stringify({
            type: ['valid', '', 'also-valid'],
          }),
          'utf-8'
        );

        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(invalidPath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should throw ResourceNotFoundError for non-existent project', async () => {
        const { importAction } = await import('@cli/commands/field/import');
        const { withErrorHandling } = await import('@cli/handlers/errors');

        const wrapped = withErrorHandling(importAction);
        await expect(wrapped(jsonFilePath, { project: 'nonexistent' })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.RESOURCE_NOT_FOUND);
      });
    });

    describe('output formats', () => {
      it('should output summary as JSON with --json', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(jsonFilePath, { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output summary as YAML with --yaml', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(jsonFilePath, { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('total_fields:'))).toBe(true);
      });

      it('should suppress output in quiet mode', async () => {
        const { importAction } = await import('@cli/commands/field/import');

        await expect(importAction(jsonFilePath, { quiet: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });
    });
  });

  describe('CRUD workflow integration', () => {
    it('should complete add → list → remove workflow', async () => {
      const { addAction } = await import('@cli/commands/field/add');
      const { listAction } = await import('@cli/commands/field/list');
      const { removeAction } = await import('@cli/commands/field/remove');

      // Add option
      await expect(addAction('type', 'spike', { json: true })).rejects.toThrow(ExitError);
      let logs = getCapturedLogs();
      let jsonLog = logs.find(log => isValidJson(log));
      expect(jsonLog).toBeDefined();

      let option: FieldOption | undefined;
      if (jsonLog) {
        option = JSON.parse(jsonLog) as FieldOption;
      }

      clearCapturedOutput();
      mockExit.mockClear();

      // List options and verify it exists
      await expect(listAction({ field: 'type', json: true })).rejects.toThrow(ExitError);
      logs = getCapturedLogs();
      jsonLog = logs.find(log => isValidJson(log));

      if (jsonLog) {
        const grouped = JSON.parse(jsonLog);
        const typeOptions = grouped.type as FieldOption[];
        expect(typeOptions.some((opt: FieldOption) => opt.value === 'spike')).toBe(true);
      }

      clearCapturedOutput();
      mockExit.mockClear();

      // Remove option
      if (option) {
        await expect(removeAction(option.id, { force: true })).rejects.toThrow(ExitError);
      }

      clearCapturedOutput();
      mockExit.mockClear();

      // Verify it's gone
      await expect(listAction({ field: 'type', json: true })).rejects.toThrow(ExitError);
      logs = getCapturedLogs();
      jsonLog = logs.find(log => isValidJson(log));

      if (jsonLog) {
        const grouped = JSON.parse(jsonLog);
        const typeOptions = grouped.type as FieldOption[];
        expect(typeOptions.every((opt: FieldOption) => opt.value !== 'spike')).toBe(true);
      }
    });

    it('should complete import → list → batch remove workflow', async () => {
      // Create import file
      const importData = {
        type: ['spike', 'chore'],
        priority: ['urgent'],
      };

      const importPath = join(tempDir, 'batch.json');
      await fs.writeFile(importPath, JSON.stringify(importData, null, 2), 'utf-8');

      const { importAction } = await import('@cli/commands/field/import');
      const { listAction } = await import('@cli/commands/field/list');
      const { removeAction } = await import('@cli/commands/field/remove');

      // Import
      await expect(importAction(importPath, { json: true })).rejects.toThrow(ExitError);

      clearCapturedOutput();
      mockExit.mockClear();

      // List and collect IDs
      await expect(listAction({ json: true })).rejects.toThrow(ExitError);
      const logs = getCapturedLogs();
      const jsonLog = logs.find(log => isValidJson(log));

      const optionIds: string[] = [];
      if (jsonLog) {
        const grouped = JSON.parse(jsonLog);
        const typeOptions = (grouped.type as FieldOption[]) || [];
        const priorityOptions = (grouped.priority as FieldOption[]) || [];

        for (const opt of [...typeOptions, ...priorityOptions]) {
          if (opt.value === 'spike' || opt.value === 'chore' || opt.value === 'urgent') {
            optionIds.push(opt.id);
          }
        }
      }

      // Remove all imported options
      for (const id of optionIds) {
        clearCapturedOutput();
        mockExit.mockClear();
        await expect(removeAction(id, { force: true })).rejects.toThrow(ExitError);
      }
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
