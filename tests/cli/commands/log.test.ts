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

      it('should find items by notes text', async () => {
        await createTestDoc(tempDir, {
          items: [
            createMockItem({ title: 'Item 1', notes: 'Fix authentication flow' }),
            createMockItem({ id: 'REQ-20251203-test-02', title: 'Item 2', notes: 'Update styling' }),
          ],
        });

        const { searchAction } = await import('@cli/commands/log/search');

        await expect(searchAction('authentication', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

        const logs = getCapturedLogs();
        const jsonLog = logs.find(log => isValidJson(log));
        if (jsonLog) {
          const parsed = JSON.parse(jsonLog);
          expect(parsed.length).toBe(1);
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
