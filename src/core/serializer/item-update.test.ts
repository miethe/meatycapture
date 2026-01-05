/**
 * Item Update Operations Tests
 *
 * Tests for pure item transformation functions:
 * - applyNoteUpdate: Replace notes on a specific item
 * - findItem: Locate item by ID
 * - getItemNotes: Retrieve notes with empty array fallback
 *
 * These are pure functions that transform documents in memory.
 * File I/O is handled separately by DocStore adapters.
 */

import { describe, it, expect } from 'vitest';
import { applyNoteUpdate, findItem, getItemNotes, ItemNotFoundError } from './item-update';
import { createTestDoc, createTestItem, createTestNote } from '../test-helpers';
import type { Note } from '../models';
import { NOTE_TYPES } from '../models';

// =============================================================================
// applyNoteUpdate
// =============================================================================

describe('applyNoteUpdate', () => {
  // ===========================================================================
  // Adding notes to item with no existing notes
  // ===========================================================================

  describe('adding notes to item with no existing notes', () => {
    it('should add a single note to an item without notes', () => {
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
      });
      // Remove notes property to simulate legacy item
      delete (item as unknown as Record<string, unknown>).notes;

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const note = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'Test note content',
      });

      const { updatedDoc, changed } = applyNoteUpdate(doc, item.id, [note]);

      expect(changed).toBe(true);
      const updatedItem = findItem(updatedDoc, item.id);
      expect(updatedItem?.notes).toHaveLength(1);
      expect(updatedItem?.notes?.[0]).toEqual(note);
    });

    it('should add multiple notes to an item', () => {
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

      const notes: Note[] = [
        createTestNote({
          id: 'NOTE-20260104-project-01-01',
          type: NOTE_TYPES.General,
          content: 'First note',
        }),
        createTestNote({
          id: 'NOTE-20260104-project-01-02',
          type: NOTE_TYPES.BugFixAttempt,
          content: 'Second note with bug fix attempt',
        }),
      ];

      const { updatedDoc, changed } = applyNoteUpdate(doc, item.id, notes);

      expect(changed).toBe(true);
      expect(updatedDoc.items[0]?.notes).toHaveLength(2);
      expect(updatedDoc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
      expect(updatedDoc.items[0]?.notes?.[1]?.type).toBe(NOTE_TYPES.BugFixAttempt);
    });

    it('should update modified_at timestamp when adding notes', () => {
      const originalModifiedAt = new Date('2026-01-01T00:00:00Z');
      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        modified_at: originalModifiedAt,
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const beforeUpdate = new Date();
      const newNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
      });

      const { updatedDoc } = applyNoteUpdate(doc, item.id, [newNote]);

      expect(updatedDoc.items[0]?.modified_at?.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
      expect(updatedDoc.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  // ===========================================================================
  // Updating notes on item with existing notes
  // ===========================================================================

  describe('updating notes on item with existing notes', () => {
    it('should replace existing notes with new notes', () => {
      const existingNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'Original note content',
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

      const updatedNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.Validation,
        content: 'Updated validation note',
      });

      const { updatedDoc, changed } = applyNoteUpdate(doc, item.id, [updatedNote]);

      expect(changed).toBe(true);
      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('Updated validation note');
      expect(updatedDoc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.Validation);
    });

    it('should add additional notes to existing notes', () => {
      const existingNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        type: NOTE_TYPES.General,
        content: 'First note',
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

      const newNote = createTestNote({
        id: 'NOTE-20260104-project-01-02',
        type: NOTE_TYPES.BugFixAttempt,
        content: 'Second note',
      });

      const { updatedDoc, changed } = applyNoteUpdate(doc, item.id, [existingNote, newNote]);

      expect(changed).toBe(true);
      expect(updatedDoc.items[0]?.notes).toHaveLength(2);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('First note');
      expect(updatedDoc.items[0]?.notes?.[1]?.content).toBe('Second note');
    });

    it('should handle note content with markdown formatting', () => {
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

      const markdownNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        content: `## Investigation Results

- Found **bug** in authentication
- \`checkAuth()\` returns undefined

\`\`\`typescript
if (!auth) {
  throw new Error('Unauthorized');
}
\`\`\``,
      });

      const { updatedDoc } = applyNoteUpdate(doc, item.id, [markdownNote]);

      expect(updatedDoc.items[0]?.notes?.[0]?.content).toContain('**bug**');
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toContain('```typescript');
    });
  });

  // ===========================================================================
  // Removing all notes from item
  // ===========================================================================

  describe('removing all notes from item', () => {
    it('should remove notes when passing empty array', () => {
      const existingNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        content: 'Note to be removed',
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

      const { updatedDoc, changed } = applyNoteUpdate(doc, item.id, []);

      expect(changed).toBe(true);
      // Notes should be undefined when empty array is passed
      expect(updatedDoc.items[0]?.notes).toBeUndefined();
    });

    it('should preserve document-level data after note removal', () => {
      const existingNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
      });

      const item = createTestItem({
        id: 'REQ-20260104-project-01',
        notes: [existingNote],
        tags: ['api', 'backend'],
      });

      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        title: 'Test Document Title',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        tags: ['api', 'backend'],
        item_count: 1,
      });

      const { updatedDoc } = applyNoteUpdate(doc, item.id, []);

      expect(updatedDoc.doc_id).toBe('REQ-20260104-project');
      expect(updatedDoc.title).toBe('Test Document Title');
      expect(updatedDoc.project_id).toBe('project');
      expect(updatedDoc.items[0]?.notes).toBeUndefined();
    });
  });

  // ===========================================================================
  // Changed flag behavior
  // ===========================================================================

  describe('changed flag', () => {
    it('returns changed=false when notes are identical', () => {
      const note = createTestNote({
        id: 'NOTE-1',
        type: NOTE_TYPES.General,
        content: 'Same content',
      });

      const item = createTestItem({
        id: 'REQ-1',
        notes: [note],
      });

      const doc = createTestDoc({
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const { changed } = applyNoteUpdate(doc, item.id, [note]);
      expect(changed).toBe(false);
    });

    it('returns changed=true when note content differs', () => {
      const note = createTestNote({
        id: 'NOTE-1',
        content: 'Old content',
      });

      const item = createTestItem({
        id: 'REQ-1',
        notes: [note],
      });

      const doc = createTestDoc({
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const updatedNote = { ...note, content: 'New content' };
      const { changed } = applyNoteUpdate(doc, item.id, [updatedNote]);
      expect(changed).toBe(true);
    });

    it('returns changed=true when note type differs', () => {
      const note = createTestNote({
        id: 'NOTE-1',
        type: NOTE_TYPES.General,
      });

      const item = createTestItem({
        id: 'REQ-1',
        notes: [note],
      });

      const doc = createTestDoc({
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const updatedNote = { ...note, type: NOTE_TYPES.Validation };
      const { changed } = applyNoteUpdate(doc, item.id, [updatedNote]);
      expect(changed).toBe(true);
    });

    it('returns changed=true when note count differs', () => {
      const note = createTestNote({ id: 'NOTE-1' });

      const item = createTestItem({
        id: 'REQ-1',
        notes: [note],
      });

      const doc = createTestDoc({
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const secondNote = createTestNote({ id: 'NOTE-2' });
      const { changed } = applyNoteUpdate(doc, item.id, [note, secondNote]);
      expect(changed).toBe(true);
    });

    it('returns the original doc reference when unchanged', () => {
      const note = createTestNote({ id: 'NOTE-1' });

      const item = createTestItem({
        id: 'REQ-1',
        notes: [note],
      });

      const doc = createTestDoc({
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const { updatedDoc, changed } = applyNoteUpdate(doc, item.id, [note]);
      expect(changed).toBe(false);
      expect(updatedDoc).toBe(doc); // Same reference when unchanged
    });
  });

  // ===========================================================================
  // Error handling
  // ===========================================================================

  describe('error handling', () => {
    describe('item not found', () => {
      it('should throw ItemNotFoundError for missing item', () => {
        const item = createTestItem({ id: 'REQ-20260104-project-01' });
        const doc = createTestDoc({
          doc_id: 'REQ-20260104-project',
          project_id: 'project',
          items: [item],
          items_index: [{ id: item.id, type: item.type, title: item.title }],
          item_count: 1,
        });

        expect(() => applyNoteUpdate(doc, 'REQ-20260104-project-99', [])).toThrow(ItemNotFoundError);
      });

      it('should include item ID and doc ID in ItemNotFoundError', () => {
        const item = createTestItem({ id: 'REQ-20260104-project-01' });
        const doc = createTestDoc({
          doc_id: 'REQ-20260104-project',
          project_id: 'project',
          items: [item],
          items_index: [{ id: item.id, type: item.type, title: item.title }],
          item_count: 1,
        });

        const missingItemId = 'REQ-20260104-project-42';

        try {
          applyNoteUpdate(doc, missingItemId, []);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ItemNotFoundError);
          expect((error as ItemNotFoundError).itemId).toBe(missingItemId);
          expect((error as ItemNotFoundError).docId).toBe('REQ-20260104-project');
          expect((error as ItemNotFoundError).code).toBe('ITEM_NOT_FOUND');
        }
      });

      it('should throw for empty items array', () => {
        const doc = createTestDoc({
          doc_id: 'REQ-20260104-project',
          items: [],
          items_index: [],
          item_count: 0,
        });

        expect(() => applyNoteUpdate(doc, 'REQ-20260104-project-01', [])).toThrow(ItemNotFoundError);
      });
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle document with single item', () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });
      const { updatedDoc } = applyNoteUpdate(doc, item.id, [newNote]);

      expect(updatedDoc.items).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
    });

    it('should handle document with many items', () => {
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

      const newNote = createTestNote({ id: 'NOTE-20260104-project-05-01' });

      // Update the 5th item
      const { updatedDoc } = applyNoteUpdate(doc, 'REQ-20260104-project-05', [newNote]);

      expect(updatedDoc.items).toHaveLength(10);
      expect(updatedDoc.items[4]?.notes).toHaveLength(1);
      // Other items should not have notes affected
      expect(updatedDoc.items[0]?.notes ?? []).toEqual([]);
      expect(updatedDoc.items[9]?.notes ?? []).toEqual([]);
    });

    it('should handle note with empty content', () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const emptyNote = createTestNote({
        id: 'NOTE-20260104-project-01-01',
        content: '',
      });

      const { updatedDoc } = applyNoteUpdate(doc, item.id, [emptyNote]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      expect(updatedDoc.items[0]?.notes?.[0]?.content).toBe('');
    });

    it('should handle all note types', () => {
      const item = createTestItem({ id: 'REQ-20260104-project-01' });
      const doc = createTestDoc({
        doc_id: 'REQ-20260104-project',
        project_id: 'project',
        items: [item],
        items_index: [{ id: item.id, type: item.type, title: item.title }],
        item_count: 1,
      });

      const notes: Note[] = [
        createTestNote({
          id: 'NOTE-20260104-project-01-01',
          type: NOTE_TYPES.General,
          content: 'General note',
        }),
        createTestNote({
          id: 'NOTE-20260104-project-01-02',
          type: NOTE_TYPES.BugFixAttempt,
          content: 'Bug fix note',
        }),
        createTestNote({
          id: 'NOTE-20260104-project-01-03',
          type: NOTE_TYPES.Validation,
          content: 'Validation note',
        }),
        createTestNote({
          id: 'NOTE-20260104-project-01-04',
          type: NOTE_TYPES.Other,
          content: 'Other note',
        }),
      ];

      const { updatedDoc } = applyNoteUpdate(doc, item.id, notes);

      expect(updatedDoc.items[0]?.notes).toHaveLength(4);
      expect(updatedDoc.items[0]?.notes?.map((n) => n.type)).toEqual([
        NOTE_TYPES.General,
        NOTE_TYPES.BugFixAttempt,
        NOTE_TYPES.Validation,
        NOTE_TYPES.Other,
      ]);
    });

    it('should update correct item when multiple items have similar IDs', () => {
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

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      // Update only item-01, not item-010
      const { updatedDoc } = applyNoteUpdate(doc, 'REQ-20260104-project-01', [newNote]);

      expect(updatedDoc.items[0]?.notes).toHaveLength(1);
      // item[1] should remain unchanged
      expect(updatedDoc.items[1]?.notes?.length ?? 0).toBe(0);
    });

    it('should preserve other document data after update', () => {
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

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const { updatedDoc } = applyNoteUpdate(doc, 'REQ-20260104-project-01', [newNote]);

      // Verify document-level data is preserved
      expect(updatedDoc.doc_id).toBe('REQ-20260104-project');
      expect(updatedDoc.title).toBe('Test Document Title');
      expect(updatedDoc.project_id).toBe('project');
      expect(updatedDoc.items).toHaveLength(2);

      // Verify other item is unchanged
      expect(updatedDoc.items[1]?.id).toBe('REQ-20260104-project-02');
      expect(updatedDoc.items[1]?.title).toBe('Second Item');
    });

    it('should correctly update items_index after note update', () => {
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

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const { updatedDoc } = applyNoteUpdate(doc, item.id, [newNote]);

      expect(updatedDoc.items_index).toHaveLength(1);
      expect(updatedDoc.items_index[0]).toEqual({
        id: 'REQ-20260104-project-01',
        type: 'enhancement',
        title: 'Test Item',
      });
    });

    it('should regenerate tags from all items', () => {
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

      const newNote = createTestNote({ id: 'NOTE-20260104-project-01-01' });

      const { updatedDoc } = applyNoteUpdate(doc, 'REQ-20260104-project-01', [newNote]);

      // Tags should be aggregated from items (sorted alphabetically)
      expect(updatedDoc.tags).toEqual(['api', 'backend', 'frontend']);
    });
  });
});

// =============================================================================
// findItem
// =============================================================================

describe('findItem', () => {
  it('finds item by ID', () => {
    const item = createTestItem({ id: 'REQ-1' });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    expect(findItem(doc, 'REQ-1')).toEqual(item);
  });

  it('returns undefined for non-existent item', () => {
    const doc = createTestDoc({ items: [], items_index: [], item_count: 0 });
    expect(findItem(doc, 'REQ-999')).toBeUndefined();
  });

  it('finds correct item among multiple items', () => {
    const item1 = createTestItem({ id: 'REQ-1', title: 'First' });
    const item2 = createTestItem({ id: 'REQ-2', title: 'Second' });
    const item3 = createTestItem({ id: 'REQ-3', title: 'Third' });

    const doc = createTestDoc({
      items: [item1, item2, item3],
      items_index: [
        { id: item1.id, type: item1.type, title: item1.title },
        { id: item2.id, type: item2.type, title: item2.title },
        { id: item3.id, type: item3.type, title: item3.title },
      ],
      item_count: 3,
    });

    const found = findItem(doc, 'REQ-2');
    expect(found?.title).toBe('Second');
  });

  it('distinguishes between similar IDs', () => {
    const item1 = createTestItem({ id: 'REQ-01', title: 'Item 01' });
    const item2 = createTestItem({ id: 'REQ-010', title: 'Item 010' });

    const doc = createTestDoc({
      items: [item1, item2],
      items_index: [
        { id: item1.id, type: item1.type, title: item1.title },
        { id: item2.id, type: item2.type, title: item2.title },
      ],
      item_count: 2,
    });

    expect(findItem(doc, 'REQ-01')?.title).toBe('Item 01');
    expect(findItem(doc, 'REQ-010')?.title).toBe('Item 010');
  });
});

// =============================================================================
// getItemNotes
// =============================================================================

describe('getItemNotes', () => {
  it('returns notes from item', () => {
    const note = createTestNote({ id: 'NOTE-1' });
    const item = createTestItem({ id: 'REQ-1', notes: [note] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    expect(getItemNotes(doc, 'REQ-1')).toEqual([note]);
  });

  it('returns empty array for item without notes property', () => {
    const item = createTestItem({ id: 'REQ-1' });
    delete (item as unknown as Record<string, unknown>).notes;

    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    expect(getItemNotes(doc, 'REQ-1')).toEqual([]);
  });

  it('returns empty array for item with empty notes array', () => {
    const item = createTestItem({ id: 'REQ-1', notes: [] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    expect(getItemNotes(doc, 'REQ-1')).toEqual([]);
  });

  it('returns empty array for non-existent item', () => {
    const doc = createTestDoc({ items: [], items_index: [], item_count: 0 });
    expect(getItemNotes(doc, 'REQ-999')).toEqual([]);
  });

  it('returns multiple notes in order', () => {
    const note1 = createTestNote({ id: 'NOTE-1', content: 'First' });
    const note2 = createTestNote({ id: 'NOTE-2', content: 'Second' });
    const note3 = createTestNote({ id: 'NOTE-3', content: 'Third' });

    const item = createTestItem({ id: 'REQ-1', notes: [note1, note2, note3] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    const notes = getItemNotes(doc, 'REQ-1');
    expect(notes).toHaveLength(3);
    expect(notes[0]?.content).toBe('First');
    expect(notes[1]?.content).toBe('Second');
    expect(notes[2]?.content).toBe('Third');
  });
});
