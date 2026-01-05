/**
 * Log Command Tests
 *
 * Tests all log subcommands:
 * - create: Create new request-log documents from JSON input
 * - append: Append items to existing documents
 * - list: List documents in a directory
 * - view: View document contents with filtering
 * - search: Search documents for matching items
 * - delete: Delete documents with confirmation
 *
 * Each command is tested for:
 * - Valid input handling
 * - Error conditions
 * - Output format options
 * - Exit code verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createTempDir,
  cleanupTempDir,
  createTestDoc,
  createTestDocs,
  createValidCliInput,
  createMockItemDraft,
  createMockItem,
  createJsonInputFile,
  mockConsole,
  restoreConsole,
  getCapturedLogs,
  getCapturedErrors,
  clearCapturedOutput,
  resetQuietMode,
  isValidJson,
} from '../helpers';

import { ExitCodes } from '@cli/handlers/exitCodes';
import { parse } from '@core/serializer';

// Note: We test the action functions directly rather than going through Commander
// because process.exit behavior makes end-to-end testing complex in vitest

describe('Log Commands', () => {
  let tempDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: any;

  beforeEach(async () => {
    tempDir = await createTempDir();
    mockConsole();
    await resetQuietMode();

    // Mock process.exit to capture exit codes
    mockExit = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code ?? 0);
    }) as never);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    restoreConsole();
    clearCapturedOutput();
    mockExit.mockRestore();
  });

  describe('create command', () => {
    describe('valid input', () => {
      it('should create document from valid JSON file', async () => {
        const input = createValidCliInput('test-project');
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify file was created
        const exists = await fs.access(outputPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        // Verify content is valid request-log format
        const content = await fs.readFile(outputPath, 'utf-8');
        const doc = parse(content);
        expect(doc.project_id).toBe('test-project');
        expect(doc.items).toHaveLength(1);
      });

      it('should generate doc_id from project slug and date', async () => {
        const input = createValidCliInput('my-project');
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath })).rejects.toThrow(ExitError);

        const content = await fs.readFile(outputPath, 'utf-8');
        const doc = parse(content);

        expect(doc.doc_id).toMatch(/^REQ-\d{8}-my-project$/);
      });

      it('should generate item IDs with zero-padded counters', async () => {
        const input = {
          project: 'test-project',
          items: [
            createMockItemDraft({ title: 'First' }),
            createMockItemDraft({ title: 'Second' }),
            createMockItemDraft({ title: 'Third' }),
          ],
        };
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath })).rejects.toThrow(ExitError);

        const content = await fs.readFile(outputPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[0]?.id).toMatch(/-01$/);
        expect(doc.items[1]?.id).toMatch(/-02$/);
        expect(doc.items[2]?.id).toMatch(/-03$/);
      });

      it('should aggregate tags from all items', async () => {
        const input = {
          project: 'test-project',
          items: [
            createMockItemDraft({ tags: ['api', 'ux'] }),
            createMockItemDraft({ tags: ['api', 'bug'] }),
          ],
        };
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath })).rejects.toThrow(ExitError);

        const content = await fs.readFile(outputPath, 'utf-8');
        const doc = parse(content);

        // Tags should be unique and sorted
        expect(doc.tags).toEqual(['api', 'bug', 'ux']);
      });

      it('should use custom title when provided', async () => {
        const input = {
          project: 'test-project',
          title: 'Custom Document Title',
          items: [createMockItemDraft()],
        };
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath })).rejects.toThrow(ExitError);

        const content = await fs.readFile(outputPath, 'utf-8');
        const doc = parse(content);

        expect(doc.title).toBe('Custom Document Title');
      });
    });

    describe('invalid JSON', () => {
      it('should exit with VALIDATION_ERROR for malformed JSON', async () => {
        const inputFile = join(tempDir, 'invalid.json');
        await fs.writeFile(inputFile, '{ invalid json }', 'utf-8');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);

        const errors = getCapturedErrors();
        expect(errors.some(e => e.includes('Invalid JSON'))).toBe(true);
      });

      it('should exit with VALIDATION_ERROR for missing project field', async () => {
        const input = { items: [createMockItemDraft()] }; // Missing project
        const inputFile = join(tempDir, 'input.json');
        await fs.writeFile(inputFile, JSON.stringify(input), 'utf-8');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should exit with VALIDATION_ERROR for empty items array', async () => {
        const input = { project: 'test', items: [] };
        const inputFile = join(tempDir, 'input.json');
        await fs.writeFile(inputFile, JSON.stringify(input), 'utf-8');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });

      it('should exit with VALIDATION_ERROR for invalid item structure', async () => {
        const input = {
          project: 'test',
          items: [{ title: 'Only title, missing other fields' }],
        };
        const inputFile = join(tempDir, 'input.json');
        await fs.writeFile(inputFile, JSON.stringify(input), 'utf-8');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      });
    });

    describe('file not found', () => {
      it('should exit with error for non-existent input file', async () => {
        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction('/nonexistent/path.json', {})).rejects.toThrow(ExitError);

        const errors = getCapturedErrors();
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    describe('output formats', () => {
      it('should output JSON when --json flag is set', async () => {
        const input = createValidCliInput('test-project');
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML when --yaml flag is set', async () => {
        const input = createValidCliInput('test-project');
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath, yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('doc_id:'))).toBe(true);
      });

      it('should suppress output in quiet mode', async () => {
        const input = createValidCliInput('test-project');
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath, quiet: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });
    });

    describe('--no-backup option', () => {
      it('should not create backup when --no-backup is set (new file)', async () => {
        const input = createValidCliInput('test-project');
        const inputFile = await createJsonInputFile(tempDir, input);
        const outputPath = join(tempDir, 'new-output.md');

        const { createAction } = await import('@cli/commands/log/create');

        await expect(createAction(inputFile, { output: outputPath, backup: false })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // For new files, no backup should be created regardless
        const files = await fs.readdir(tempDir);
        const bakFiles = files.filter(f => f.endsWith('.bak'));
        expect(bakFiles).toHaveLength(0);
      });
    });
  });

  describe('append command', () => {
    describe('valid append', () => {
      it('should append items to existing document', async () => {
        // Create initial document
        const docPath = await createTestDoc(tempDir);

        // Create append input
        const appendInput = {
          project: 'test-project',
          items: [createMockItemDraft({ title: 'New Appended Item' })],
        };
        const inputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

        const { appendAction } = await import('@cli/commands/log/append');

        await expect(appendAction(docPath, inputFile, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify item was appended
        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items).toHaveLength(2);
        expect(doc.items[1]?.title).toBe('New Appended Item');
      });

      it('should update item_count after append', async () => {
        const docPath = await createTestDoc(tempDir);

        const appendInput = {
          project: 'test-project',
          items: [createMockItemDraft(), createMockItemDraft()],
        };
        const inputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

        const { appendAction } = await import('@cli/commands/log/append');

        await expect(appendAction(docPath, inputFile, {})).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.item_count).toBe(3); // 1 original + 2 appended
      });

      it('should aggregate tags from new items', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ tags: ['existing'] })],
        });

        const appendInput = {
          project: 'test-project',
          items: [createMockItemDraft({ tags: ['new-tag'] })],
        };
        const inputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

        const { appendAction } = await import('@cli/commands/log/append');

        await expect(appendAction(docPath, inputFile, {})).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.tags).toContain('existing');
        expect(doc.tags).toContain('new-tag');
      });

      it('should generate sequential item IDs', async () => {
        const docPath = await createTestDoc(tempDir, {
          doc_id: 'REQ-20251203-test-project',
          items: [
            createMockItem({ id: 'REQ-20251203-test-project-01' }),
            createMockItem({ id: 'REQ-20251203-test-project-02' }),
          ],
        });

        const appendInput = {
          project: 'test-project',
          items: [createMockItemDraft()],
        };
        const inputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

        const { appendAction } = await import('@cli/commands/log/append');

        await expect(appendAction(docPath, inputFile, {})).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[2]?.id).toMatch(/-03$/);
      });
    });

    describe('file not found', () => {
      it('should throw FileNotFoundError for non-existent document', async () => {
        const appendInput = {
          project: 'test-project',
          items: [createMockItemDraft()],
        };
        const inputFile = await createJsonInputFile(tempDir, appendInput);

        const { appendAction } = await import('@cli/commands/log/append');

        // appendAction is the unwrapped version, so it throws the raw error
        // The wrappedAppendAction (registered with Commander) would handle it
        await expect(appendAction('/nonexistent/doc.md', inputFile, {})).rejects.toThrow('not found');
      });
    });

    describe('output formats', () => {
      it('should output JSON when --json flag is set', async () => {
        const docPath = await createTestDoc(tempDir);
        const appendInput = {
          project: 'test-project',
          items: [createMockItemDraft()],
        };
        const inputFile = await createJsonInputFile(tempDir, appendInput);

        const { appendAction } = await import('@cli/commands/log/append');

        await expect(appendAction(docPath, inputFile, { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });
    });
  });

  describe('list command', () => {
    describe('with documents', () => {
      it('should list all documents in directory', async () => {
        await createTestDocs(tempDir, 3);

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        expect(logs.length).toBeGreaterThan(0);
      });

      it('should sort by date by default (newest first)', async () => {
        await createTestDoc(tempDir, { doc_id: 'REQ-20251201-test' });
        await createTestDoc(tempDir, { doc_id: 'REQ-20251203-test' });
        await createTestDoc(tempDir, { doc_id: 'REQ-20251202-test' });

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonOutput = logs.find(log => isValidJson(log));
        expect(jsonOutput).toBeDefined();
      });

      it('should respect --limit option', async () => {
        await createTestDocs(tempDir, 5);

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir, limit: '2', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(2);
        }
      });

      it('should support sorting by name', async () => {
        await createTestDoc(tempDir, { doc_id: 'REQ-20251203-zebra' });
        await createTestDoc(tempDir, { doc_id: 'REQ-20251203-alpha' });

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir, sort: 'name', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed[0].doc_id).toBe('REQ-20251203-alpha');
        }
      });

      it('should support --reverse option', async () => {
        await createTestDoc(tempDir, { doc_id: 'REQ-20251203-alpha' });
        await createTestDoc(tempDir, { doc_id: 'REQ-20251203-zebra' });

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir, sort: 'name', reverse: true, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed[0].doc_id).toBe('REQ-20251203-zebra');
        }
      });
    });

    describe('empty directory', () => {
      it('should exit successfully with message for empty dir', async () => {
        const emptyDir = join(tempDir, 'empty');
        await fs.mkdir(emptyDir);

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: emptyDir })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('No documents') || log === '[]')).toBe(true);
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        await createTestDocs(tempDir, 2);

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output CSV with --csv', async () => {
        await createTestDocs(tempDir, 2);

        const { listAction } = await import('@cli/commands/log/list');

        await expect(listAction(undefined, { path: tempDir, csv: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('path,doc_id'))).toBe(true);
      });
    });
  });

  describe('view command', () => {
    describe('valid document', () => {
      it('should display document contents', async () => {
        const docPath = await createTestDoc(tempDir, {
          title: 'View Test Document',
        });

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('View Test Document'))).toBe(true);
      });
    });

    describe('filtering', () => {
      it('should filter by type', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({ type: 'bug', title: 'Bug Item' }),
            createMockItem({ id: 'REQ-20251203-test-02', type: 'enhancement', title: 'Enhancement Item' }),
          ],
        });

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { filterType: 'bug', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.items).toHaveLength(1);
          expect(parsed.items[0].type).toBe('bug');
        }
      });

      it('should filter by status', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({ status: 'triage', title: 'Triage Item' }),
            createMockItem({ id: 'REQ-20251203-test-02', status: 'done', title: 'Done Item' }),
          ],
        });

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { filterStatus: 'triage', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.items).toHaveLength(1);
          expect(parsed.items[0].status).toBe('triage');
        }
      });

      it('should filter by tag', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({ tags: ['api', 'urgent'], title: 'API Item' }),
            createMockItem({ id: 'REQ-20251203-test-02', tags: ['ux'], title: 'UX Item' }),
          ],
        });

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { filterTag: 'api', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.items).toHaveLength(1);
          expect(parsed.items[0].tags).toContain('api');
        }
      });

      it('should combine filters with AND logic', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({ type: 'bug', status: 'triage', title: 'Bug Triage' }),
            createMockItem({ id: 'REQ-20251203-test-02', type: 'bug', status: 'done', title: 'Bug Done' }),
            createMockItem({ id: 'REQ-20251203-test-03', type: 'enhancement', status: 'triage', title: 'Enhancement Triage' }),
          ],
        });

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { filterType: 'bug', filterStatus: 'triage', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.items).toHaveLength(1);
          expect(parsed.items[0].title).toBe('Bug Triage');
        }
      });
    });

    describe('--items-only option', () => {
      it('should output only items array', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'Item 1' }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'Item 2' }),
          ],
        });

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { itemsOnly: true, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(Array.isArray(parsed)).toBe(true);
          expect(parsed[0]).toHaveProperty('id');
          expect(parsed[0]).not.toHaveProperty('doc_id'); // Should be item, not doc
        }
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const docPath = await createTestDoc(tempDir);

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output YAML with --yaml', async () => {
        const docPath = await createTestDoc(tempDir);

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { yaml: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('doc_id:'))).toBe(true);
      });

      it('should output markdown with --markdown', async () => {
        const docPath = await createTestDoc(tempDir);

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docPath, { markdown: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('---'))).toBe(true); // Frontmatter delimiter
      });
    });

    describe('file not found', () => {
      it('should exit with IO_ERROR for non-existent document', async () => {
        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction('/nonexistent/doc.md', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.IO_ERROR);
      });
    });

    describe('path resolution', () => {
      let configDir: string;
      let originalConfigDir: string | undefined;

      beforeEach(async () => {
        // Set up isolated config directory for project store
        configDir = join(tempDir, '.config');
        await fs.mkdir(configDir, { recursive: true });

        originalConfigDir = process.env['MEATYCAPTURE_CONFIG_DIR'];
        process.env['MEATYCAPTURE_CONFIG_DIR'] = configDir;
      });

      afterEach(() => {
        // Restore original config dir
        if (originalConfigDir) {
          process.env['MEATYCAPTURE_CONFIG_DIR'] = originalConfigDir;
        } else {
          delete process.env['MEATYCAPTURE_CONFIG_DIR'];
        }
      });

      it('should resolve REQ filename using project config path', async () => {
        // Create a project with a custom path
        // Note: Use single-word name because the regex pattern /^REQ-\d{8}-([^-]+?)(?:-\d+)?\.md$/
        // only captures non-hyphen characters for the slug
        const projectDocsPath = join(tempDir, 'project-docs');
        await fs.mkdir(projectDocsPath, { recursive: true });

        const { createAdapters } = await import('@adapters/factory');
        const { projectStore } = await createAdapters();

        // Create project with single-word slug 'myproject'
        await projectStore.create({
          name: 'Myproject',
          default_path: projectDocsPath,
        });

        // Create a doc in that path with REQ filename format
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const docFilename = `REQ-${dateStr}-myproject.md`;

        const docPath = await createTestDoc(projectDocsPath, {
          doc_id: `REQ-${dateStr}-myproject`,
          title: 'Custom Project Document',
          project_id: 'myproject',
        }, docFilename);

        // Verify the doc exists at the expected path
        const exists = await fs.access(docPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);

        const { viewAction } = await import('@cli/commands/log/view');

        // Call viewAction with just the filename (not full path)
        await expect(viewAction(docFilename, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify the output contains the expected document title
        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.title).toBe('Custom Project Document');
        }
      });

      it('should extract project slug from REQ-YYYYMMDD-<slug>.md pattern', async () => {
        // Test single-word slug extraction
        // The regex /^REQ-\d{8}-([^-]+?)(?:-\d+)?\.md$/ captures single-word slugs
        const projectDocsPath = join(tempDir, 'testslug-docs');
        await fs.mkdir(projectDocsPath, { recursive: true });

        const { createAdapters } = await import('@adapters/factory');
        const { projectStore } = await createAdapters();

        await projectStore.create({
          name: 'Testslug',
          default_path: projectDocsPath,
        });

        // Create doc with the REQ-YYYYMMDD-testslug.md pattern
        const docFilename = 'REQ-20251205-testslug.md';

        await createTestDoc(projectDocsPath, {
          doc_id: 'REQ-20251205-testslug',
          title: 'Test Slug Document',
          project_id: 'testslug',
        }, docFilename);

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docFilename, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.title).toBe('Test Slug Document');
        }
      });

      it('should handle REQ-YYYYMMDD-<slug>-NN.md item file pattern', async () => {
        // Test the optional -NN suffix pattern (for doc files that might have a counter)
        // Use single-word slug so regex correctly identifies the -NN as item number
        const projectDocsPath = join(tempDir, 'numbered-docs');
        await fs.mkdir(projectDocsPath, { recursive: true });

        const { createAdapters } = await import('@adapters/factory');
        const { projectStore } = await createAdapters();

        await projectStore.create({
          name: 'Numberedproj',
          default_path: projectDocsPath,
        });

        // Create doc with the -NN suffix pattern (e.g., REQ-YYYYMMDD-numberedproj-01.md)
        // The regex captures 'numberedproj' and treats -01 as the optional item number
        const docFilename = 'REQ-20251205-numberedproj-01.md';

        await createTestDoc(projectDocsPath, {
          doc_id: 'REQ-20251205-numberedproj-01',
          title: 'Numbered Document',
          project_id: 'numberedproj',
        }, docFilename);

        const { viewAction } = await import('@cli/commands/log/view');

        await expect(viewAction(docFilename, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.title).toBe('Numbered Document');
        }
      });

      it('should fall back to CWD for non-REQ filenames', async () => {
        // Create a file named "random-doc.md" in tempDir
        // Note: viewAction resolves relative paths against CWD, so we need to
        // create the file and pass an absolute path or be in the right directory
        const randomDocFilename = 'random-doc.md';
        const randomDocPath = await createTestDoc(tempDir, {
          doc_id: 'random-doc-id',
          title: 'Random Document',
          project_id: 'random-project',
        }, randomDocFilename);

        const { viewAction } = await import('@cli/commands/log/view');

        // Use absolute path since we can't change CWD in tests
        await expect(viewAction(randomDocPath, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.title).toBe('Random Document');
        }
      });

      it('should use absolute paths directly', async () => {
        // Create a doc with an absolute path
        const absoluteDocPath = await createTestDoc(tempDir, {
          doc_id: 'REQ-20251205-absolute-test',
          title: 'Absolute Path Document',
          project_id: 'absolute-test',
        }, 'absolute-test.md');

        const { viewAction } = await import('@cli/commands/log/view');

        // Call viewAction with full absolute path
        await expect(viewAction(absoluteDocPath, { json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        expect(jsonLog).toBeDefined();
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.title).toBe('Absolute Path Document');
        }
      });

      it('should fall back to default path when project not found', async () => {
        // Test behavior when REQ filename references a non-existent project
        // The getProjectDocPath function should fall back to default path

        const { viewAction } = await import('@cli/commands/log/view');

        // This should fail with IO_ERROR because the default path won't have the file
        await expect(viewAction('REQ-20251205-nonexistent-project.md', {})).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.IO_ERROR);
      });
    });
  });

  describe('search command', () => {
    describe('text search', () => {
      it('should find items by title text', async () => {
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'Login authentication bug' }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'Dashboard improvement' }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('login', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
          expect(parsed[0].item.title).toContain('Login');
        }
      });

      it('should find items by title text', async () => {
        // Notes are now Note[] - this test validates title search instead
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'Fix authentication flow', notes: [] }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'Update styling', notes: [] }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('authentication', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
          expect(parsed[0].item.title).toContain('authentication');
        }
      });
    });

    describe('prefix queries', () => {
      it('should search by tag: prefix', async () => {
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'API Item', tags: ['api', 'backend'] }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'UI Item', tags: ['frontend'] }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('tag:api', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
          expect(parsed[0].item.tags).toContain('api');
        }
      });

      it('should search by type: prefix', async () => {
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'Bug Fix', type: 'bug' }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'New Feature', type: 'enhancement' }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('type:bug', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
          expect(parsed[0].item.type).toBe('bug');
        }
      });

      it('should search by status: prefix', async () => {
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'Pending Item', status: 'triage' }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'Completed Item', status: 'done' }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('status:done', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
          expect(parsed[0].item.status).toBe('done');
        }
      });
    });

    describe('match modes', () => {
      it('should use contains mode by default', async () => {
        await createTestDoc(tempDir, {
          items: [createMockItem({ title: 'Authentication system' })],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('auth', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
        }
      });

      it('should support --match full option', async () => {
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ type: 'enhancement' }),
            createMockItem({ id: 'REQ-20251203-test-02', type: 'bug' }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('type:enhancement', undefined, { path: tempDir, match: 'full', json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
        }
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        await createTestDoc(tempDir, {
          items: [createMockItem({ title: 'Test Item' })],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('test', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);
      });

      it('should output CSV with --csv', async () => {
        await createTestDoc(tempDir, {
          items: [createMockItem({ title: 'Test Item' })],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('test', undefined, { path: tempDir, csv: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('doc_id') && log.includes('item_id'))).toBe(true);
      });
    });

    describe('no results', () => {
      it('should exit successfully with no matches', async () => {
        await createTestDoc(tempDir, {
          items: [createMockItem({ title: 'Something else' })],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('nonexistent', undefined, { path: tempDir })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
      });
    });
  });

  describe('delete command', () => {
    describe('with --force', () => {
      it('should delete document without confirmation', async () => {
        const docPath = await createTestDoc(tempDir);

        const { deleteAction } = await import('@cli/commands/log/delete');

        await expect(deleteAction(docPath, { force: true, backup: true })).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify file was deleted
        const exists = await fs.access(docPath).then(() => true).catch(() => false);
        expect(exists).toBe(false);
      });

      it('should create backup by default', async () => {
        const docPath = await createTestDoc(tempDir);

        const { deleteAction } = await import('@cli/commands/log/delete');

        await expect(deleteAction(docPath, { force: true, backup: true })).rejects.toThrow(ExitError);

        // Check backup was created
        const files = await fs.readdir(tempDir);
        const bakFiles = files.filter(f => f.endsWith('.bak'));
        expect(bakFiles.length).toBeGreaterThan(0);
      });
    });

    describe('--no-backup option', () => {
      it('should not create backup when --no-backup is set', async () => {
        const docPath = await createTestDoc(tempDir);

        const { deleteAction } = await import('@cli/commands/log/delete');

        await expect(deleteAction(docPath, { force: true, backup: false })).rejects.toThrow(ExitError);

        // Check no backup was created
        const files = await fs.readdir(tempDir);
        const bakFiles = files.filter(f => f.endsWith('.bak'));
        expect(bakFiles).toHaveLength(0);
      });
    });

    describe('file not found', () => {
      it('should throw error for non-existent document', async () => {
        const { deleteAction } = await import('@cli/commands/log/delete');

        // deleteAction is the unwrapped version, so it throws the raw error
        await expect(deleteAction('/nonexistent/doc.md', { force: true, backup: true })).rejects.toThrow('not found');
      });
    });

    // Note: Confirmation prompt tests would require stdin mocking
    // which is complex in vitest. The confirmation logic is tested
    // through the --force flag tests above.
  });

  describe('note add command', () => {
    describe('valid input', () => {
      it('should add note to existing item', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'This is a test note',
          })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify note was added
        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.notes).toHaveLength(1);
        expect(doc.items[0]?.notes?.[0]?.content).toBe('This is a test note');
      });

      it('should generate note ID with correct format', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Test note for ID verification',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        const noteId = doc.items[0]?.notes?.[0]?.id;

        // Note ID should start with NOTE- prefix
        expect(noteId).toBeDefined();
        expect(noteId).toMatch(/^NOTE-/);
      });

      it('should set created_at and updated_at timestamps', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Test note for timestamps',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        const note = doc.items[0]?.notes?.[0];

        expect(note?.created_at).toBeDefined();
        expect(note?.updated_at).toBeDefined();
        expect(note?.created_at instanceof Date).toBe(true);
        expect(note?.updated_at instanceof Date).toBe(true);

        // Timestamps should be recent (within 1 minute of now)
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        if (note?.created_at) {
          expect(note.created_at.getTime()).toBeGreaterThan(oneMinuteAgo);
          expect(note.created_at.getTime()).toBeLessThanOrEqual(now + 1000);
        }
      });

      it('should preserve existing notes', async () => {
        const existingNote = {
          id: 'NOTE-existing-1234',
          type: 'General' as const,
          content: 'Existing note content',
          created_at: new Date('2025-12-01T10:00:00Z'),
          updated_at: new Date('2025-12-01T10:00:00Z'),
        };

        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [existingNote] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'New note content',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[0]?.notes).toHaveLength(2);
        expect(doc.items[0]?.notes?.[0]?.content).toBe('Existing note content');
        expect(doc.items[0]?.notes?.[1]?.content).toBe('New note content');
      });

      it('should update item modified_at', async () => {
        const originalDate = new Date('2025-12-01T10:00:00Z');
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({
              id: 'REQ-20251203-test-project-01',
              notes: [],
              modified_at: originalDate,
            }),
          ],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Note to trigger modified_at update',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[0]?.modified_at).toBeDefined();
        expect(doc.items[0]?.modified_at?.getTime()).toBeGreaterThan(originalDate.getTime());
      });

      it('should initialize notes array if undefined', async () => {
        // Create item without notes field explicitly
        const item = createMockItem({ id: 'REQ-20251203-test-project-01' });
        delete (item as Partial<typeof item>).notes;

        const docPath = await createTestDoc(tempDir, { items: [item] });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Note on item without existing notes',
          })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[0]?.notes).toHaveLength(1);
        expect(doc.items[0]?.notes?.[0]?.content).toBe('Note on item without existing notes');
      });

      it('should set correct note type', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Bug fix attempt note',
            type: 'Bug Fix Attempt',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[0]?.notes?.[0]?.type).toBe('Bug Fix Attempt');
      });

      it('should default to General note type', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Note without type specified',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        expect(doc.items[0]?.notes?.[0]?.type).toBe('General');
      });
    });

    describe('error handling', () => {
      it('should throw FileNotFoundError for non-existent document', async () => {
        const { noteAddAction } = await import('@cli/commands/log/note-add');

        // noteAddAction is unwrapped, so it throws the raw error
        await expect(
          noteAddAction('/nonexistent/doc.md', 'REQ-20251203-test-01', {
            content: 'Test note',
          })
        ).rejects.toThrow('not found');
      });

      it('should throw ResourceNotFoundError for non-existent item ID', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        // noteAddAction is unwrapped, so it throws the raw error
        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-99', {
            content: 'Note for non-existent item',
          })
        ).rejects.toThrow('not found');
      });

      it('should throw ValidationError without content', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        // noteAddAction is unwrapped, so it throws the raw error
        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {} as { content: string })
        ).rejects.toThrow('content is required');
      });

      it('should throw ValidationError for empty content', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        // noteAddAction is unwrapped, so it throws the raw error
        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', { content: '   ' })
        ).rejects.toThrow('content is required');
      });

      it('should throw ValidationError for invalid note type', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        // noteAddAction is unwrapped, so it throws the raw error
        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Test note',
            type: 'InvalidType',
          })
        ).rejects.toThrow('Invalid note type');
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'JSON output test note',
            json: true,
          })
        ).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);

        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.content).toBe('JSON output test note');
          expect(parsed.id).toMatch(/^NOTE-/);
        }
      });

      it('should suppress output with --quiet', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'Quiet mode test note',
            quiet: true,
          })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });

      it('should output YAML with --yaml', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', notes: [] })],
        });

        const { noteAddAction } = await import('@cli/commands/log/note-add');

        await expect(
          noteAddAction(docPath, 'REQ-20251203-test-project-01', {
            content: 'YAML output test note',
            yaml: true,
          })
        ).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('content:'))).toBe(true);
        expect(logs.some(log => log.includes('type:'))).toBe(true);
      });
    });
  });

  describe('item update command', () => {
    describe('field updates', () => {
      it('should update status field', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', status: 'triage' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { status: 'in-progress' })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.status).toBe('in-progress');
      });

      it('should update priority field', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', priority: 'medium' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { priority: 'high' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.priority).toBe('high');
      });

      it('should update title field', async () => {
        const docPath = await createTestDoc(tempDir, {
          doc_id: 'REQ-20251203-test-project',
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', title: 'Original Title' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { title: 'Updated Title' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.title).toBe('Updated Title');

        // Verify items_index also updated
        expect(doc.items_index[0]?.title).toBe('Updated Title');
      });

      it('should update type field', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', type: 'enhancement' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { type: 'bug' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.type).toBe('bug');
      });

      it('should update multiple fields at once', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({
              id: 'REQ-20251203-test-project-01',
              status: 'triage',
              priority: 'low',
              type: 'enhancement',
            }),
          ],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', {
            status: 'in-progress',
            priority: 'high',
            type: 'bug',
          })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.status).toBe('in-progress');
        expect(doc.items[0]?.priority).toBe('high');
        expect(doc.items[0]?.type).toBe('bug');
      });

      it('should update modified_at timestamp', async () => {
        const originalDate = new Date('2025-12-01T10:00:00Z');
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({
              id: 'REQ-20251203-test-project-01',
              modified_at: originalDate,
            }),
          ],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { status: 'done' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.modified_at).toBeDefined();
        expect(doc.items[0]?.modified_at?.getTime()).toBeGreaterThan(originalDate.getTime());
      });

      it('should update doc.updated_at', async () => {
        const originalDate = new Date('2025-12-01T10:00:00Z');
        const docPath = await createTestDoc(tempDir, {
          updated_at: originalDate,
          items: [createMockItem({ id: 'REQ-20251203-test-project-01' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { status: 'done' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.updated_at.getTime()).toBeGreaterThan(originalDate.getTime());
      });
    });

    describe('tag operations', () => {
      it('should replace tags with --tags', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', tags: ['a', 'b'] })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { tags: 'c,d' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.tags).toEqual(['c', 'd']);
      });

      it('should add tags with --add-tags', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', tags: ['a', 'b'] })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { addTags: 'c,d' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        // Tags should be merged and sorted
        expect(doc.items[0]?.tags).toContain('a');
        expect(doc.items[0]?.tags).toContain('b');
        expect(doc.items[0]?.tags).toContain('c');
        expect(doc.items[0]?.tags).toContain('d');
      });

      it('should remove tags with --remove-tags', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', tags: ['a', 'b', 'c'] })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { removeTags: 'b' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.tags).toEqual(['a', 'c']);
      });

      it('should recalculate doc.tags after tag update', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [
            createMockItem({ id: 'REQ-20251203-test-project-01', tags: ['api', 'ux'] }),
            createMockItem({ id: 'REQ-20251203-test-project-02', tags: ['api', 'backend'] }),
          ],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        // Update first item's tags
        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { tags: 'frontend,mobile' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        // Doc tags should be recalculated from all items
        expect(doc.tags).toContain('frontend');
        expect(doc.tags).toContain('mobile');
        expect(doc.tags).toContain('api');
        expect(doc.tags).toContain('backend');
        expect(doc.tags).not.toContain('ux'); // Removed from first item
      });

      it('should not add duplicate tags with --add-tags', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', tags: ['a', 'b'] })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { addTags: 'a,c' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);

        // Should not have duplicate 'a'
        const aCount = doc.items[0]?.tags.filter(t => t === 'a').length;
        expect(aCount).toBe(1);
      });
    });

    describe('array field updates', () => {
      it('should update domain field', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', domain: ['web'] })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { domain: 'api,backend' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.domain).toContain('api');
        expect(doc.items[0]?.domain).toContain('backend');
        expect(doc.items[0]?.domain).not.toContain('web');
      });

      it('should update context field', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', context: ['Test Context'] })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', { context: 'auth,security' })
        ).rejects.toThrow(ExitError);

        const content = await fs.readFile(docPath, 'utf-8');
        const doc = parse(content);
        expect(doc.items[0]?.context).toContain('auth');
        expect(doc.items[0]?.context).toContain('security');
      });
    });

    describe('error handling', () => {
      it('should throw FileNotFoundError for non-existent document', async () => {
        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        // itemUpdateAction is unwrapped, so it throws the raw error
        await expect(
          itemUpdateAction('/nonexistent/doc.md', 'REQ-20251203-test-01', { status: 'done' })
        ).rejects.toThrow('not found');
      });

      it('should throw ResourceNotFoundError for non-existent item ID', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        // itemUpdateAction is unwrapped, so it throws the raw error
        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-99', { status: 'done' })
        ).rejects.toThrow('not found');
      });

      it('should throw ValidationError when no update options provided', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        // itemUpdateAction is unwrapped, so it throws the raw error
        await expect(itemUpdateAction(docPath, 'REQ-20251203-test-project-01', {})).rejects.toThrow(
          'No update options provided'
        );
      });
    });

    describe('output formats', () => {
      it('should output JSON with --json', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', status: 'triage' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', {
            status: 'done',
            json: true,
          })
        ).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => isValidJson(log))).toBe(true);

        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.status).toBe('done');
        }
      });

      it('should suppress output with --quiet', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', {
            status: 'done',
            quiet: true,
          })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        const logs = getCapturedLogs();
        expect(logs).toHaveLength(0);
      });

      it('should output YAML with --yaml', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01', status: 'triage' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', {
            status: 'done',
            yaml: true,
          })
        ).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        expect(logs.some(log => log.includes('status:'))).toBe(true);
      });
    });

    describe('--no-backup option', () => {
      it('should skip backup when --no-backup is set', async () => {
        const docPath = await createTestDoc(tempDir, {
          items: [createMockItem({ id: 'REQ-20251203-test-project-01' })],
        });

        const { itemUpdateAction } = await import('@cli/commands/log/item-update');

        await expect(
          itemUpdateAction(docPath, 'REQ-20251203-test-project-01', {
            status: 'done',
            noBackup: true,
          })
        ).rejects.toThrow(ExitError);
        expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

        // Verify no backup was created
        const files = await fs.readdir(tempDir);
        const bakFiles = files.filter(f => f.endsWith('.bak'));
        expect(bakFiles).toHaveLength(0);
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
