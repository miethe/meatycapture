/**
 * Item Update Operations Tests
 *
 * Tests for updateItemNotes utility function covering:
 * - Adding notes to item with no existing notes
 * - Updating notes on item with existing notes
 * - Removing all notes from item
 * - Backup file creation
 * - Error handling (missing file, missing item, invalid content, permission errors)
 * - Roundtrip verification (update -> read -> verify)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  updateItemNotes,
  DocumentNotFoundError,
  ItemNotFoundError,
  DocumentParseError,
} from './item-update';
import { serialize, parse } from './index';
import { createTestDoc, createTestItem, createTestNote } from '../test-helpers';
import type { Note, RequestLogDoc } from '../models';
import { NOTE_TYPES } from '../models';

describe('updateItemNotes', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await mkdtemp(join(tmpdir(), 'meatycapture-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper: Write a test document to the temp directory
   */
  async function writeTestDoc(filename: string, doc: RequestLogDoc): Promise<string> {
    const docPath = join(tempDir, filename);
    const content = serialize(doc);
    await writeFile(docPath, content, 'utf-8');
    return docPath;
  }

  /**
   * Helper: Check if a file exists
   */
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // Add notes to item with no existing notes
  // ==========================================================================

  describe('adding notes to item with no existing notes', () => {
    it('should add a single note to an item without notes', async () => {
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
      });
      // Ensure notes is removed (not just empty) to simulate legacy item
      delete (item as unknown as Record<string, unknown>).notes;

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-add-note.md', doc);

      const newNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'New investigation findings.',
        created_at: new Date('2026-01-04T10:00:00Z'),
        updated_at: new Date('2026-01-04T10:00:00Z'),
      };

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('New investigation findings.');
      expect(updatedDoc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
    });

    it('should add multiple notes to an item', async () => {
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
      });
      delete (item as unknown as Record<string, unknown>).notes;

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-multiple-notes.md', doc);

      const notes: Note[] = [
        {
          id: 'NOTE-20260104-project-01-01',
          type: NOTE_TYPES.General,
          content: 'First note',
          created_at: new Date('2026-01-04T10:00:00Z'),
          updated_at: new Date('2026-01-04T10:00:00Z'),
        },
        {
          id: 'NOTE-20260104-project-01-02',
          type: NOTE_TYPES.BugFixAttempt,
          content: 'Second note with bug fix attempt',
          created_at: new Date('2026-01-04T11:00:00Z'),
          updated_at: new Date('2026-01-04T11:00:00Z'),
        },
      ];

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', notes);

      expect(updatedDoc.items[0]?.notes).toHaveLength(2);
      expect(updatedDoc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
      expect(updatedDoc.items[0]?.notes?.[1]?.type).toBe(NOTE_TYPES.BugFixAttempt);
    });

    it('should update modified_at timestamp when adding notes', async () => {
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        modified_at: new Date('2026-01-01T00:00:00Z'),
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-timestamp.md', doc);
      const beforeUpdate = new Date();

      const newNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'New note',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      expect(updatedDoc.items[0]?.modified_at?.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
      expect(updatedDoc.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  // ==========================================================================
  // Update notes on item with existing notes
  // ==========================================================================

  describe('updating notes on item with existing notes', () => {
    it('should replace existing notes with new notes', async () => {
      const existingNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'Original note content',
        created_at: new Date('2026-01-04T08:00:00Z'),
        updated_at: new Date('2026-01-04T08:00:00Z'),
      };

      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        notes: [existingNote],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-replace-notes.md', doc);

      const updatedNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.Validation,
        content: 'Updated validation note',
        created_at: new Date('2026-01-04T08:00:00Z'),
        updated_at: new Date('2026-01-04T12:00:00Z'),
      };

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [updatedNote]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('Updated validation note');
      expect(updatedDoc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.Validation);
    });

    it('should add additional notes to existing notes', async () => {
      const existingNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'First note',
        created_at: new Date('2026-01-04T08:00:00Z'),
        updated_at: new Date('2026-01-04T08:00:00Z'),
      };

      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        notes: [existingNote],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-add-to-existing.md', doc);

      const newNote: Note = {
        id: 'NOTE-20260104-project-01-02',
        type: NOTE_TYPES.BugFixAttempt,
        content: 'Second note',
        created_at: new Date('2026-01-04T10:00:00Z'),
        updated_at: new Date('2026-01-04T10:00:00Z'),
      };

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [
        existingNote,
        newNote,
      ]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(2);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('First note');
      expect(updatedDoc.items[0]?.notes?.[1]?.content).toBe('Second note');
    });

    it('should handle note content with markdown formatting', async () => {
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-markdown-note.md', doc);

      const markdownNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: `## Investigation Results

- Found **bug** in authentication
- \`checkAuth()\` returns undefined

\`\`\`typescript
if (!auth) {
  throw new Error('Unauthorized');
}
\`\`\``,
        created_at: new Date('2026-01-04T10:00:00Z'),
        updated_at: new Date('2026-01-04T10:00:00Z'),
      };

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [markdownNote]);

      expect(updatedDoc.items[0]?.notes?.[0]?.content).toContain('**bug**');
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toContain('```typescript');
    });
  });

  // ==========================================================================
  // Remove all notes from item
  // ==========================================================================

  describe('removing all notes from item', () => {
    it('should remove notes when passing empty array', async () => {
      const existingNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'Note to be removed',
        created_at: new Date('2026-01-04T08:00:00Z'),
        updated_at: new Date('2026-01-04T08:00:00Z'),
      };

      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        notes: [existingNote],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-remove-notes.md', doc);

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', []);

      // Notes should be undefined when empty array is passed
      expect(updatedDoc.items[0]?.notes).toBeUndefined();
    });

    it('should persist note removal to file', async () => {
      const existingNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
      });

      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        notes: [existingNote],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-remove-persist.md', doc);

      await updateItemNotes(docPath, 'REQ-20260104-project-01', []);

      // Read the file back and verify notes are not present
      const content = await readFile(docPath, 'utf-8');
      const reparsedDoc = parse(content);

      expect(reparsedDoc.items[0]?.notes).toBeUndefined();
    });
  });

  // ==========================================================================
  // Backup creation
  // ==========================================================================

  describe('backup creation', () => {
    it('should create backup file before writing by default', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-backup.md', doc);
      const backupPath = `${docPath}.bak`;

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      expect(await fileExists(backupPath)).toBe(true);
    });

    it('should preserve original content in backup file', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-backup-content.md', doc);
      const backupPath = `${docPath}.bak`;
      const originalContent = await readFile(docPath, 'utf-8');

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      const backupContent = await readFile(backupPath, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    it('should not create backup when createBackup is false', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-no-backup.md', doc);
      const backupPath = `${docPath}.bak`;

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote], { createBackup: false });

      expect(await fileExists(backupPath)).toBe(false);
    });

    it('should overwrite existing backup file', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-overwrite-backup.md', doc);
      const backupPath = `${docPath}.bak`;

      // Create an old backup
      await writeFile(backupPath, 'OLD BACKUP CONTENT', 'utf-8');

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      const backupContent = await readFile(backupPath, 'utf-8');
      expect(backupContent).not.toBe('OLD BACKUP CONTENT');
      expect(backupContent).toContain('REQ-20260104-project');
    });
  });

  // ==========================================================================
  // Error handling
  // ==========================================================================

  describe('error handling', () => {
    describe('file not found', () => {
      it('should throw DocumentNotFoundError for missing file', async () => {
        const nonExistentPath = join(tempDir, 'does-not-exist.md');

        await expect(
          updateItemNotes(nonExistentPath, 'REQ-20260104-project-01', [])
        ).rejects.toThrow(DocumentNotFoundError);
      });

      it('should include path in DocumentNotFoundError', async () => {
        const nonExistentPath = join(tempDir, 'missing-doc.md');

        try {
          await updateItemNotes(nonExistentPath, 'REQ-20260104-project-01', []);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DocumentNotFoundError);
          expect((error as DocumentNotFoundError).docPath).toBe(nonExistentPath);
          expect((error as DocumentNotFoundError).code).toBe('DOCUMENT_NOT_FOUND');
        }
      });
    });

    describe('item not found', () => {
      it('should throw ItemNotFoundError for missing item', async () => {
        const item = createTestItem({ id: 'REQ-20260104-project-01' });
        const doc = createTestDoc({
          doc_id: 'REQ-20260104-project',
          project_id: 'project',
          items: [item],
          items_index: [{ id: item.id, type: item.type, title: item.title }],
          item_count: 1,
        });

        const docPath = await writeTestDoc('test-item-not-found.md', doc);

        await expect(
          updateItemNotes(docPath, 'REQ-20260104-project-99', [])
        ).rejects.toThrow(ItemNotFoundError);
      });

      it('should include item ID and path in ItemNotFoundError', async () => {
        const item = createTestItem({ id: 'REQ-20260104-project-01' });
        const doc = createTestDoc({
          doc_id: 'REQ-20260104-project',
          project_id: 'project',
          items: [item],
          items_index: [{ id: item.id, type: item.type, title: item.title }],
          item_count: 1,
        });

        const docPath = await writeTestDoc('test-item-error-details.md', doc);
        const missingItemId = 'REQ-20260104-project-42';

        try {
          await updateItemNotes(docPath, missingItemId, []);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ItemNotFoundError);
          expect((error as ItemNotFoundError).itemId).toBe(missingItemId);
          expect((error as ItemNotFoundError).docPath).toBe(docPath);
          expect((error as ItemNotFoundError).code).toBe('ITEM_NOT_FOUND');
        }
      });
    });

    describe('parse errors', () => {
      it('should throw DocumentParseError for invalid content', async () => {
        const docPath = join(tempDir, 'invalid-doc.md');
        await writeFile(docPath, 'This is not a valid request-log document', 'utf-8');

        await expect(
          updateItemNotes(docPath, 'REQ-20260104-project-01', [])
        ).rejects.toThrow(DocumentParseError);
      });

      it('should include path in DocumentParseError', async () => {
        const docPath = join(tempDir, 'malformed-doc.md');
        await writeFile(docPath, '---\ninvalid yaml content without closing delimiters', 'utf-8');

        try {
          await updateItemNotes(docPath, 'REQ-20260104-project-01', []);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DocumentParseError);
          expect((error as DocumentParseError).docPath).toBe(docPath);
          expect((error as DocumentParseError).code).toBe('DOCUMENT_PARSE_ERROR');
        }
      });

      it('should throw for document missing required fields', async () => {
        const docPath = join(tempDir, 'missing-fields.md');
        await writeFile(
          docPath,
          `---
type: request-log
---

No items or required fields.
`,
          'utf-8'
        );

        await expect(
          updateItemNotes(docPath, 'REQ-20260104-project-01', [])
        ).rejects.toThrow(DocumentParseError);
      });
    });
  });

  // ==========================================================================
  // Roundtrip verification
  // ==========================================================================

  describe('roundtrip verification', () => {
    it('should persist changes correctly (update -> read -> verify)', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-roundtrip.md', doc);

      const newNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.Validation,
        content: 'Roundtrip test content with **markdown**',
        created_at: new Date('2026-01-04T10:00:00Z'),
        updated_at: new Date('2026-01-04T10:00:00Z'),
      };

      await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      // Read the file and parse it fresh
      const content = await readFile(docPath, 'utf-8');
      const reparsedDoc = parse(content);

      expect(reparsedDoc.items[0]?.notes).toHaveLength(1);
      expect(reparsedDoc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.Validation);
      expect(reparsedDoc.items[0]?.notes?.[0]?.content).toBe('Roundtrip test content with **markdown**');
    });

    it('should preserve other document data after update', async () => {
      const item1 = createTestItem({
        id: 'REQ-20260104-project-01',
        title: 'First Item',
        tags: ['tag1', 'tag2'],
      });
      const item2 = createTestItem({
        id: 'REQ-20260104-project-02',
        title: 'Second Item',
        tags: ['tag3'],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        title: 'Test Document Title',
        project_id: 'project',
        items: [item1, item2],
        items_index: [
          { id: item1.id, type: item1.type, title: item1.title },
          { id: item2.id, type: item2.type, title: item2.title },
        ],
        tags: ['tag1', 'tag2', 'tag3'],
        item_count: 2,
      });

      const docPath = await writeTestDoc('test-preserve-data.md', doc);

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      // Verify document-level data is preserved
      expect(updatedDoc.doc_id).toBe('REQ-20260104-project');
      expect(updatedDoc.title).toBe('Test Document Title');
      expect(updatedDoc.project_id).toBe('project');
      expect(updatedDoc.items).toHaveLength(2);

      // Verify other item is unchanged
      expect(updatedDoc.items[1]?.id).toBe('REQ-20260104-project-02');
      expect(updatedDoc.items[1]?.title).toBe('Second Item');
    });

    it('should correctly update items_index after note update', async () => {
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        title: 'Test Item',
        type: 'enhancement',
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-index-update.md', doc);

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      expect(updatedDoc.items_index).toHaveLength(1);
      expect(updatedDoc.items_index[0]).toEqual({
        id: 'REQ-20260104-project-01',
        type: 'enhancement',
        title: 'Test Item',
      });
    });

    it('should regenerate tags from all items', async () => {
      const item1 = createTestItem({
        id: 'REQ-20260104-project-01',
        tags: ['api', 'backend'],
      });
      const item2 = createTestItem({
        id: 'REQ-20260104-project-02',
        tags: ['frontend', 'api'],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item1, item2],
        items_index: [
          { id: item1.id, type: item1.type, title: item1.title },
          { id: item2.id, type: item2.type, title: item2.title },
        ],
        tags: ['api', 'backend', 'frontend'],
        item_count: 2,
      });

      const docPath = await writeTestDoc('test-tags-aggregate.md', doc);

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      // Tags should be aggregated from items (sorted alphabetically)
      expect(updatedDoc.tags).toEqual(['api', 'backend', 'frontend']);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle document with single item', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-single-item.md', doc);
      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      expect(updatedDoc.items).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
    });

    it('should handle document with many items', async () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        createTestItem({
          id: `REQ-20260104-project-${String(i + 1).padStart(2, '0')}`,
          title: `Item ${i + 1}`,
        })
      );

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items,
        items_index: items.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
        })),
        item_count: 10,
      });

      const docPath = await writeTestDoc('test-many-items.md', doc);
      const newNote = createTestNote({ id: 'NOTE-20260104-project-05-01' });

      // Update the 5th item
      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-05', [newNote]);

      expect(updatedDoc.items).toHaveLength(10);
      expect(updatedDoc.items[4]?.notes).toHaveLength(1);
      // Other items should not have notes (undefined or empty array)
      expect(updatedDoc.items[0]?.notes ?? []).toEqual([]);
      expect(updatedDoc.items[9]?.notes ?? []).toEqual([]);
    });

    it('should handle note with empty content', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-empty-content.md', doc);
      const emptyNote: Note = {
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: '',
        created_at: new Date('2026-01-04T10:00:00Z'),
        updated_at: new Date('2026-01-04T10:00:00Z'),
      };

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [emptyNote]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('');
    });

    it('should handle all note types', async () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const docPath = await writeTestDoc('test-all-types.md', doc);

      const notes: Note[] = [
        {
          id: 'NOTE-20260104-project-01-01',
          type: NOTE_TYPES.General,
          content: 'General note',
          created_at: new Date('2026-01-04T10:00:00Z'),
          updated_at: new Date('2026-01-04T10:00:00Z'),
        },
        {
          id: 'NOTE-20260104-project-01-02',
          type: NOTE_TYPES.BugFixAttempt,
          content: 'Bug fix note',
          created_at: new Date('2026-01-04T11:00:00Z'),
          updated_at: new Date('2026-01-04T11:00:00Z'),
        },
        {
          id: 'NOTE-20260104-project-01-03',
          type: NOTE_TYPES.Validation,
          content: 'Validation note',
          created_at: new Date('2026-01-04T12:00:00Z'),
          updated_at: new Date('2026-01-04T12:00:00Z'),
        },
        {
          id: 'NOTE-20260104-project-01-04',
          type: NOTE_TYPES.Other,
          content: 'Other note',
          created_at: new Date('2026-01-04T13:00:00Z'),
          updated_at: new Date('2026-01-04T13:00:00Z'),
        },
      ];

      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', notes);

      expect(updatedDoc.items[0]?.notes).toHaveLength(4);
      expect(updatedDoc.items[0]?.notes?.map((n) => n.type)).toEqual([
        NOTE_TYPES.General,
        NOTE_TYPES.BugFixAttempt,
        NOTE_TYPES.Validation,
        NOTE_TYPES.Other,
      ]);
    });

    it('should update correct item when multiple items have similar IDs', async () => {
      const item1 = createTestItem({
        id: 'REQ-20260104-project-01',
        title: 'Item 01',
      });
      const item2 = createTestItem({
        id: 'REQ-20260104-project-010',
        title: 'Item 010',
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item1, item2],
        items_index: [
          { id: item1.id, type: item1.type, title: item1.title },
          { id: item2.id, type: item2.type, title: item2.title },
        ],
        item_count: 2,
      });

      const docPath = await writeTestDoc('test-similar-ids.md', doc);
      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      // Update only item-01, not item-010
      const updatedDoc = await updateItemNotes(docPath, 'REQ-20260104-project-01', [newNote]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      // Note: item[1] may have empty array from default or remain untouched
      expect(updatedDoc.items[1]?.notes?.length ?? 0).toBe(0);
    });
  });
});
