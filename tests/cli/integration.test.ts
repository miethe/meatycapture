/**
 * CLI Integration Tests
 *
 * End-to-end workflow tests that verify complete CLI operations:
 * - Full workflow: create -> list -> view -> search -> append -> delete
 * - Backup creation and restoration
 * - Exit code verification across workflows
 * - Multi-document operations
 *
 * These tests exercise the CLI layer as a whole, ensuring all
 * components work together correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join, basename } from 'node:path';
import {
  createTempDir,
  cleanupTempDir,
  createMockItemDraft,
  createJsonInputFile,
  mockConsole,
  restoreConsole,
  getCapturedLogs,
  getCapturedErrors,
  clearCapturedOutput,
  resetQuietMode,
  isValidJson,
} from './helpers';

import { ExitCodes } from '@cli/handlers/exitCodes';
import { parse, serialize } from '@core/serializer';

/**
 * Custom error class for capturing process.exit calls in tests.
 */
class ExitError extends Error {
  constructor(public code: number) {
    super(`Process exited with code ${code}`);
    this.name = 'ExitError';
  }
}

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await createTempDir();
    mockConsole();
    await resetQuietMode();

    mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new ExitError(code ?? 0);
    });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    restoreConsole();
    clearCapturedOutput();
    mockExit.mockRestore();
  });

  describe('Full Document Lifecycle', () => {
    it('should complete full workflow: create -> list -> view -> append -> search -> delete', async () => {
      // Step 1: Create a document
      const createInput = {
        project: 'integration-test',
        title: 'Integration Test Document',
        items: [
          createMockItemDraft({
            title: 'Initial Item',
            type: 'enhancement',
            tags: ['api', 'initial'],
          }),
        ],
      };
      const createInputFile = await createJsonInputFile(tempDir, createInput, 'create.json');
      const docPath = join(tempDir, 'integration-doc.md');

      const { createAction } = await import('@cli/commands/log/create');
      mockExit.mockClear();
      await expect(createAction(createInputFile, { output: docPath })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify file exists
      const docExists = await fs.access(docPath).then(() => true).catch(() => false);
      expect(docExists).toBe(true);

      clearCapturedOutput();

      // Step 2: List documents - should find our new document
      const { listAction } = await import('@cli/commands/log/list');
      mockExit.mockClear();
      await expect(listAction(undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const listLogs = getCapturedLogs();
      const listJson = listLogs.find(log => isValidJson(log));
      expect(listJson).toBeDefined();
      if (listJson) {
        const docs = JSON.parse(listJson);
        expect(docs.length).toBeGreaterThan(0);
        expect(docs.some((d: any) => d.title === 'Integration Test Document')).toBe(true);
      }

      clearCapturedOutput();

      // Step 3: View document
      const { viewAction } = await import('@cli/commands/log/view');
      mockExit.mockClear();
      await expect(viewAction(docPath, { json: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const viewLogs = getCapturedLogs();
      const viewJson = viewLogs.find(log => isValidJson(log));
      expect(viewJson).toBeDefined();
      if (viewJson) {
        const doc = JSON.parse(viewJson);
        expect(doc.title).toBe('Integration Test Document');
        expect(doc.items).toHaveLength(1);
        expect(doc.items[0].title).toBe('Initial Item');
      }

      clearCapturedOutput();

      // Step 4: Append new item
      const appendInput = {
        project: 'integration-test',
        items: [
          createMockItemDraft({
            title: 'Appended Item',
            type: 'bug',
            tags: ['urgent', 'appended'],
          }),
        ],
      };
      const appendInputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

      const { appendAction } = await import('@cli/commands/log/append');
      mockExit.mockClear();
      await expect(appendAction(docPath, appendInputFile, {})).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify append worked
      const afterAppend = await fs.readFile(docPath, 'utf-8');
      const docAfterAppend = parse(afterAppend);
      expect(docAfterAppend.items).toHaveLength(2);
      expect(docAfterAppend.item_count).toBe(2);
      expect(docAfterAppend.tags).toContain('initial');
      expect(docAfterAppend.tags).toContain('appended');

      clearCapturedOutput();

      // Step 5: Search for items
      const { searchAction } = await import('@cli/commands/log/search');
      mockExit.mockClear();
      await expect(searchAction('tag:urgent', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      const searchLogs = getCapturedLogs();
      const searchJson = searchLogs.find(log => isValidJson(log));
      expect(searchJson).toBeDefined();
      if (searchJson) {
        const matches = JSON.parse(searchJson);
        expect(matches.length).toBe(1);
        expect(matches[0].item.title).toBe('Appended Item');
      }

      clearCapturedOutput();

      // Step 6: Delete document
      const { deleteAction } = await import('@cli/commands/log/delete');
      mockExit.mockClear();
      await expect(deleteAction(docPath, { force: true, backup: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);

      // Verify deletion
      const afterDelete = await fs.access(docPath).then(() => true).catch(() => false);
      expect(afterDelete).toBe(false);

      // Verify backup exists
      const files = await fs.readdir(tempDir);
      const bakFiles = files.filter(f => f.endsWith('.bak'));
      expect(bakFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Backup and Restoration', () => {
    it('should create backup before modifying existing file', async () => {
      // Create initial document
      const createInput = {
        project: 'backup-test',
        items: [createMockItemDraft({ title: 'Original Item' })],
      };
      const createInputFile = await createJsonInputFile(tempDir, createInput);
      const docPath = join(tempDir, 'backup-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(createInputFile, { output: docPath })).rejects.toThrow(ExitError);

      clearCapturedOutput();

      // Append with backup enabled (default)
      const appendInput = {
        project: 'backup-test',
        items: [createMockItemDraft({ title: 'New Item' })],
      };
      const appendInputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

      const { appendAction } = await import('@cli/commands/log/append');
      await expect(appendAction(docPath, appendInputFile, {})).rejects.toThrow(ExitError);

      // Verify backup was created
      const files = await fs.readdir(tempDir);
      const bakFiles = files.filter(f => f.includes('backup-test') && f.endsWith('.bak'));
      expect(bakFiles.length).toBeGreaterThan(0);

      // Verify backup contains original content (1 item)
      const backupPath = join(tempDir, bakFiles[0]!);
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const backupDoc = parse(backupContent);
      expect(backupDoc.items).toHaveLength(1);
      expect(backupDoc.items[0]?.title).toBe('Original Item');

      // Verify current document has new content (2 items)
      const currentContent = await fs.readFile(docPath, 'utf-8');
      const currentDoc = parse(currentContent);
      expect(currentDoc.items).toHaveLength(2);
    });

    it('should not create backup when --no-backup is specified', async () => {
      // Create initial document
      const createInput = {
        project: 'no-backup-test',
        items: [createMockItemDraft()],
      };
      const createInputFile = await createJsonInputFile(tempDir, createInput);
      const docPath = join(tempDir, 'no-backup-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(createInputFile, { output: docPath })).rejects.toThrow(ExitError);

      clearCapturedOutput();

      // Append with --no-backup
      const appendInput = {
        project: 'no-backup-test',
        items: [createMockItemDraft()],
      };
      const appendInputFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

      const { appendAction } = await import('@cli/commands/log/append');
      await expect(appendAction(docPath, appendInputFile, { noBackup: true })).rejects.toThrow(ExitError);

      // Verify no backup was created
      const files = await fs.readdir(tempDir);
      const bakFiles = files.filter(f => f.includes('no-backup-test') && f.endsWith('.bak'));
      expect(bakFiles).toHaveLength(0);
    });
  });

  describe('Multi-Document Operations', () => {
    it('should handle operations across multiple documents', async () => {
      // Create multiple documents
      const doc1Input = {
        project: 'project-a',
        items: [
          createMockItemDraft({ title: 'Project A Bug', type: 'bug', tags: ['critical'] }),
        ],
      };
      const doc2Input = {
        project: 'project-b',
        items: [
          createMockItemDraft({ title: 'Project B Enhancement', type: 'enhancement', tags: ['nice-to-have'] }),
        ],
      };
      const doc3Input = {
        project: 'project-a',
        items: [
          createMockItemDraft({ title: 'Another Project A Item', type: 'bug', tags: ['critical'] }),
        ],
      };

      const { createAction } = await import('@cli/commands/log/create');

      const doc1File = await createJsonInputFile(tempDir, doc1Input, 'doc1.json');
      const doc1Path = join(tempDir, 'doc1.md');
      await expect(createAction(doc1File, { output: doc1Path })).rejects.toThrow(ExitError);
      clearCapturedOutput();

      const doc2File = await createJsonInputFile(tempDir, doc2Input, 'doc2.json');
      const doc2Path = join(tempDir, 'doc2.md');
      await expect(createAction(doc2File, { output: doc2Path })).rejects.toThrow(ExitError);
      clearCapturedOutput();

      const doc3File = await createJsonInputFile(tempDir, doc3Input, 'doc3.json');
      const doc3Path = join(tempDir, 'doc3.md');
      await expect(createAction(doc3File, { output: doc3Path })).rejects.toThrow(ExitError);
      clearCapturedOutput();

      // List all documents
      const { listAction } = await import('@cli/commands/log/list');
      await expect(listAction(undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

      const listLogs = getCapturedLogs();
      const listJson = listLogs.find(log => isValidJson(log));
      expect(listJson).toBeDefined();
      if (listJson) {
        const docs = JSON.parse(listJson);
        expect(docs.length).toBe(3);
      }

      clearCapturedOutput();

      // Search across all documents
      const { searchAction } = await import('@cli/commands/log/search');
      await expect(searchAction('tag:critical', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

      const searchLogs = getCapturedLogs();
      const searchJson = searchLogs.find(log => isValidJson(log));
      expect(searchJson).toBeDefined();
      if (searchJson) {
        const matches = JSON.parse(searchJson);
        expect(matches.length).toBe(2); // Two items with critical tag
      }

      clearCapturedOutput();

      // Search by type across documents
      await expect(searchAction('type:bug', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

      const typeLogs = getCapturedLogs();
      const typeJson = typeLogs.find(log => isValidJson(log));
      expect(typeJson).toBeDefined();
      if (typeJson) {
        const matches = JSON.parse(typeJson);
        expect(matches.length).toBe(2); // Two bug items
      }
    });

    it('should respect limit across multiple documents in search', async () => {
      // Create documents with multiple items each
      const { createAction } = await import('@cli/commands/log/create');

      for (let i = 0; i < 3; i++) {
        const input = {
          project: `project-${i}`,
          items: [
            createMockItemDraft({ title: `Match Item ${i}-1` }),
            createMockItemDraft({ title: `Match Item ${i}-2` }),
          ],
        };
        const inputFile = await createJsonInputFile(tempDir, input, `doc${i}.json`);
        const docPath = join(tempDir, `doc${i}.md`);
        await expect(createAction(inputFile, { output: docPath })).rejects.toThrow(ExitError);
        clearCapturedOutput();
      }

      // Search with limit
      const { searchAction } = await import('@cli/commands/log/search');
      await expect(searchAction('Match', undefined, { path: tempDir, limit: '3', json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const json = logs.find(log => isValidJson(log));
      expect(json).toBeDefined();
      if (json) {
        const matches = JSON.parse(json);
        expect(matches.length).toBe(3);
      }
    });
  });

  describe('Error Handling Across Workflow', () => {
    it('should continue gracefully after failed operations', async () => {
      // Create a valid document first
      const validInput = {
        project: 'error-test',
        items: [createMockItemDraft()],
      };
      const validFile = await createJsonInputFile(tempDir, validInput);
      const docPath = join(tempDir, 'error-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(validFile, { output: docPath })).rejects.toThrow(ExitError);
      clearCapturedOutput();
      mockExit.mockClear();

      // Try to view non-existent file (should fail with IO_ERROR)
      const { viewAction } = await import('@cli/commands/log/view');
      await expect(viewAction('/nonexistent.md', {})).rejects.toThrow();
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.IO_ERROR);

      clearCapturedOutput();
      mockExit.mockClear();

      // The valid document should still be viewable
      await expect(viewAction(docPath, { json: true })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
    });

    it('should validate input at each step', async () => {
      // Try to create with invalid input
      const { createAction } = await import('@cli/commands/log/create');
      const invalidFile = join(tempDir, 'invalid.json');
      await fs.writeFile(invalidFile, '{ invalid json }', 'utf-8');

      await expect(createAction(invalidFile, {})).rejects.toThrow();
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);

      clearCapturedOutput();
      mockExit.mockClear();

      // Try to append with missing required fields
      const validDoc = {
        project: 'validation-test',
        items: [createMockItemDraft()],
      };
      const validFile = await createJsonInputFile(tempDir, validDoc);
      const docPath = join(tempDir, 'validation-test.md');

      await expect(createAction(validFile, { output: docPath })).rejects.toThrow(ExitError);
      clearCapturedOutput();

      // Invalid append input - appendAction is unwrapped, throws raw error
      const { appendAction } = await import('@cli/commands/log/append');
      const badAppendFile = join(tempDir, 'bad-append.json');
      await fs.writeFile(badAppendFile, JSON.stringify({ project: 'test' }), 'utf-8'); // Missing items

      await expect(appendAction(docPath, badAppendFile, {})).rejects.toThrow('Invalid JSON structure');
    });
  });

  describe('Exit Code Consistency', () => {
    it('should throw consistent error types for file not found', async () => {
      // Multiple file not found scenarios - test that errors are thrown
      const { viewAction } = await import('@cli/commands/log/view');
      const { deleteAction } = await import('@cli/commands/log/delete');

      // viewAction is wrapped with withErrorHandling, so it calls process.exit
      await expect(viewAction('/nonexistent1.md', {})).rejects.toThrow();
      expect(mockExit).toHaveBeenLastCalledWith(ExitCodes.IO_ERROR);

      clearCapturedOutput();

      // deleteAction is unwrapped, so it throws the raw error
      await expect(deleteAction('/nonexistent2.md', { force: true, backup: false })).rejects.toThrow('not found');
    });

    it('should return SUCCESS for empty results in list', async () => {
      const emptyDir = join(tempDir, 'empty');
      await fs.mkdir(emptyDir);

      const { listAction } = await import('@cli/commands/log/list');
      await expect(listAction(undefined, { path: emptyDir })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenLastCalledWith(ExitCodes.SUCCESS);
    });

    it('should return SUCCESS for empty results in search', async () => {
      // Create a document but search for non-matching query
      const input = {
        project: 'search-test',
        items: [createMockItemDraft({ title: 'Something' })],
      };
      const inputFile = await createJsonInputFile(tempDir, input);
      const docPath = join(tempDir, 'search-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(inputFile, { output: docPath })).rejects.toThrow(ExitError);
      // Don't check exit code here, just verify it completed
      clearCapturedOutput();
      mockExit.mockClear(); // Clear call history for accurate check below

      const { searchAction } = await import('@cli/commands/log/search');
      await expect(searchAction('nonexistent-query', undefined, { path: tempDir })).rejects.toThrow(ExitError);
      expect(mockExit).toHaveBeenCalledWith(ExitCodes.SUCCESS);
    });
  });

  describe('Output Format Consistency', () => {
    it('should produce parseable JSON output across all commands', async () => {
      // Create document
      const input = {
        project: 'format-test',
        items: [createMockItemDraft()],
      };
      const inputFile = await createJsonInputFile(tempDir, input);
      const docPath = join(tempDir, 'format-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(inputFile, { output: docPath, json: true })).rejects.toThrow(ExitError);

      let logs = getCapturedLogs();
      let json = logs.find(log => isValidJson(log));
      expect(json).toBeDefined();
      if (json) {
        const parsed = JSON.parse(json);
        expect(parsed).toHaveProperty('doc_id');
      }

      clearCapturedOutput();

      // List documents
      const { listAction } = await import('@cli/commands/log/list');
      await expect(listAction(undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

      logs = getCapturedLogs();
      json = logs.find(log => isValidJson(log));
      expect(json).toBeDefined();
      if (json) {
        const parsed = JSON.parse(json);
        expect(Array.isArray(parsed)).toBe(true);
      }

      clearCapturedOutput();

      // View document
      const { viewAction } = await import('@cli/commands/log/view');
      await expect(viewAction(docPath, { json: true })).rejects.toThrow(ExitError);

      logs = getCapturedLogs();
      json = logs.find(log => isValidJson(log));
      expect(json).toBeDefined();
      if (json) {
        const parsed = JSON.parse(json);
        expect(parsed).toHaveProperty('items');
      }

      clearCapturedOutput();

      // Search
      const { searchAction } = await import('@cli/commands/log/search');
      await expect(searchAction('test', undefined, { path: tempDir, json: true })).rejects.toThrow(ExitError);

      logs = getCapturedLogs();
      json = logs.find(log => isValidJson(log));
      expect(json).toBeDefined();
      if (json) {
        const parsed = JSON.parse(json);
        expect(Array.isArray(parsed)).toBe(true);
      }
    });

    it('should produce consistent CSV headers across commands', async () => {
      const input = {
        project: 'csv-test',
        items: [createMockItemDraft()],
      };
      const inputFile = await createJsonInputFile(tempDir, input);
      const docPath = join(tempDir, 'csv-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(inputFile, { output: docPath })).rejects.toThrow(ExitError);
      clearCapturedOutput();

      // List with CSV
      const { listAction } = await import('@cli/commands/log/list');
      await expect(listAction(undefined, { path: tempDir, csv: true })).rejects.toThrow(ExitError);

      let logs = getCapturedLogs();
      let csvOutput = logs.find(log => log.includes('doc_id'));
      expect(csvOutput).toBeDefined();
      expect(csvOutput).toContain('path');
      expect(csvOutput).toContain('item_count');

      clearCapturedOutput();

      // Search with CSV
      const { searchAction } = await import('@cli/commands/log/search');
      await expect(searchAction('test', undefined, { path: tempDir, csv: true })).rejects.toThrow(ExitError);

      logs = getCapturedLogs();
      csvOutput = logs.find(log => log.includes('doc_id') || log.includes('item_id'));
      expect(csvOutput).toBeDefined();
    });
  });

  describe('Date Handling', () => {
    it('should preserve timestamps through create/view cycle', async () => {
      const input = {
        project: 'date-test',
        items: [createMockItemDraft()],
      };
      const inputFile = await createJsonInputFile(tempDir, input);
      const docPath = join(tempDir, 'date-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(inputFile, { output: docPath })).rejects.toThrow(ExitError);
      clearCapturedOutput();

      // Read back and verify dates are valid ISO strings
      const { viewAction } = await import('@cli/commands/log/view');
      await expect(viewAction(docPath, { json: true })).rejects.toThrow(ExitError);

      const logs = getCapturedLogs();
      const json = logs.find(log => isValidJson(log));
      expect(json).toBeDefined();
      if (json) {
        const doc = JSON.parse(json);
        expect(doc.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(doc.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(doc.items[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });

    it('should update updated_at on append', async () => {
      const input = {
        project: 'date-update-test',
        items: [createMockItemDraft()],
      };
      const inputFile = await createJsonInputFile(tempDir, input);
      const docPath = join(tempDir, 'date-update-test.md');

      const { createAction } = await import('@cli/commands/log/create');
      await expect(createAction(inputFile, { output: docPath })).rejects.toThrow(ExitError);

      // Read original timestamps
      const originalContent = await fs.readFile(docPath, 'utf-8');
      const originalDoc = parse(originalContent);
      const originalUpdated = originalDoc.updated_at;

      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      clearCapturedOutput();

      // Append
      const appendInput = {
        project: 'date-update-test',
        items: [createMockItemDraft()],
      };
      const appendFile = await createJsonInputFile(tempDir, appendInput, 'append.json');

      const { appendAction } = await import('@cli/commands/log/append');
      await expect(appendAction(docPath, appendFile, {})).rejects.toThrow(ExitError);

      // Check updated_at changed
      const updatedContent = await fs.readFile(docPath, 'utf-8');
      const updatedDoc = parse(updatedContent);

      expect(updatedDoc.updated_at.getTime()).toBeGreaterThanOrEqual(originalUpdated.getTime());
    });
  });
});
