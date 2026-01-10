/**
 * Item-Level Update Operations
 *
 * Provides pure functions for modifying specific item properties within a
 * RequestLogDoc in memory. File I/O should be handled by callers using
 * the DocStore adapter pattern (per MeatyCapture's layered architecture).
 *
 * This module contains:
 * - Pure transformation functions for item updates
 * - Error types for item operations
 * - Utilities for regenerating document-level aggregates
 *
 * @example
 * ```typescript
 * import { applyNoteUpdate } from '@core/serializer/item-update';
 *
 * // Get doc from DocStore
 * const doc = await docStore.read(path);
 *
 * // Apply in-memory transformation
 * const { updatedDoc, changed } = applyNoteUpdate(doc, itemId, newNotes);
 *
 * // Save via DocStore
 * if (changed) {
 *   await docStore.write(path, updatedDoc);
 * }
 * ```
 */

import { aggregateTags, updateItemsIndex } from './index';
import type { RequestLogDoc, RequestLogItem, Note } from '@core/models';

/**
 * Error thrown when an item is not found within a document.
 */
export class ItemNotFoundError extends Error {
  readonly code = 'ITEM_NOT_FOUND';

  constructor(
    readonly docId: string,
    readonly itemId: string
  ) {
    super(`Item not found: ${itemId} in document ${docId}`);
    this.name = 'ItemNotFoundError';
  }
}

/**
 * Result of an item update operation.
 */
export interface ItemUpdateResult {
  /** The updated document with all aggregates recalculated */
  updatedDoc: RequestLogDoc;
  /** Whether any actual changes were made */
  changed: boolean;
}

/**
 * Fields that can be updated on an item via inline editing.
 *
 * Note: `subdomain` is a multi-select array (categorical field).
 * Note: `context` is an optional free-form text string.
 */
export interface ItemFieldUpdates {
  title?: string;
  type?: string;
  domain?: string[];
  subdomain?: string[];
  /** Optional free-form context text */
  context?: string;
  priority?: string;
  status?: string;
  tags?: string[];
}

/**
 * Compare two string arrays for exact equality.
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

/**
 * Applies field updates to a specific item within a document.
 *
 * This is a pure function that updates the item fields, item.modified_at,
 * document.updated_at, and document-level aggregates.
 *
 * @param doc - The RequestLogDoc to update
 * @param itemId - The ID of the item to update
 * @param updates - Partial updates for item fields
 * @returns Object containing the updated document and whether changes were made
 *
 * @throws {ItemNotFoundError} When the specified item ID isn't found in the document
 */
export function applyItemUpdate(
  doc: RequestLogDoc,
  itemId: string,
  updates: ItemFieldUpdates
): ItemUpdateResult {
  const itemIndex = doc.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    throw new ItemNotFoundError(doc.doc_id, itemId);
  }

  const targetItem = doc.items[itemIndex];
  if (!targetItem) {
    throw new ItemNotFoundError(doc.doc_id, itemId);
  }

  let changed = false;
  const updatedItem: RequestLogItem = { ...targetItem };

  if (updates.title !== undefined && updates.title !== targetItem.title) {
    updatedItem.title = updates.title;
    changed = true;
  }

  if (updates.type !== undefined && updates.type !== targetItem.type) {
    updatedItem.type = updates.type;
    changed = true;
  }

  if (updates.domain !== undefined && !arraysEqual(updates.domain, targetItem.domain)) {
    updatedItem.domain = updates.domain;
    changed = true;
  }

  if (updates.subdomain !== undefined && !arraysEqual(updates.subdomain, targetItem.subdomain)) {
    updatedItem.subdomain = updates.subdomain;
    changed = true;
  }

  // context is an optional string - compare with fallback to empty string for undefined
  if (updates.context !== undefined && updates.context !== (targetItem.context ?? '')) {
    // Only set context if non-empty, otherwise remove it
    if (updates.context.trim().length > 0) {
      updatedItem.context = updates.context;
    } else {
      delete updatedItem.context;
    }
    changed = true;
  }

  if (updates.priority !== undefined && updates.priority !== targetItem.priority) {
    updatedItem.priority = updates.priority;
    changed = true;
  }

  if (updates.status !== undefined && updates.status !== targetItem.status) {
    updatedItem.status = updates.status;
    changed = true;
  }

  if (updates.tags !== undefined && !arraysEqual(updates.tags, targetItem.tags)) {
    updatedItem.tags = updates.tags;
    changed = true;
  }

  if (!changed) {
    return { updatedDoc: doc, changed: false };
  }

  const now = new Date();
  updatedItem.modified_at = now;

  const updatedItems = [...doc.items];
  updatedItems[itemIndex] = updatedItem;

  const updatedDoc: RequestLogDoc = {
    ...doc,
    items: updatedItems,
    items_index: updateItemsIndex(updatedItems),
    tags: aggregateTags(updatedItems),
    updated_at: now,
  };

  return { updatedDoc, changed: true };
}

/**
 * Applies a notes update to a specific item within a document.
 *
 * This is a pure function that transforms the document in memory without
 * any file I/O. Use with DocStore.read() and DocStore.write() for persistence.
 *
 * The function handles:
 * - Locating the target item by ID
 * - Replacing the item's notes array
 * - Updating modified_at timestamp on the item
 * - Regenerating document-level aggregates (tags, items_index, item_count)
 *
 * @param doc - The RequestLogDoc to update
 * @param itemId - The ID of the item to update (e.g., 'REQ-20260101-project-01')
 * @param notes - The new notes array to set on the item (replaces existing notes)
 * @returns Object containing the updated document and whether changes were made
 *
 * @throws {ItemNotFoundError} When the specified item ID isn't found in the document
 *
 * @example
 * ```typescript
 * // Add notes to an item
 * const newNote: Note = {
 *   id: 'NOTE-20260104-project-01-01',
 *   type: 'General',
 *   content: 'Investigation findings...',
 *   created_at: new Date(),
 *   updated_at: new Date(),
 * };
 *
 * const { updatedDoc, changed } = applyNoteUpdate(doc, 'REQ-20260104-project-01', [newNote]);
 *
 * // Remove all notes from an item
 * const { updatedDoc } = applyNoteUpdate(doc, 'REQ-20260104-project-01', []);
 * ```
 */
export function applyNoteUpdate(
  doc: RequestLogDoc,
  itemId: string,
  notes: Note[]
): ItemUpdateResult {
  // Step 1: Find the target item
  const itemIndex = doc.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    throw new ItemNotFoundError(doc.doc_id, itemId);
  }

  const targetItem = doc.items[itemIndex];
  if (!targetItem) {
    // Type guard - shouldn't happen given findIndex check
    throw new ItemNotFoundError(doc.doc_id, itemId);
  }

  // Step 2: Check if there are actual changes
  const existingNotes = targetItem.notes ?? [];
  const notesAreSame =
    existingNotes.length === notes.length &&
    existingNotes.every(
      (existingNote, i) =>
        notes[i] &&
        existingNote.id === notes[i].id &&
        existingNote.type === notes[i].type &&
        existingNote.content === notes[i].content
    );

  if (notesAreSame) {
    return { updatedDoc: doc, changed: false };
  }

  // Step 3: Update the item's notes and modified_at timestamp
  const now = new Date();

  // Build updated item - only include notes if non-empty (exactOptionalPropertyTypes compliance)
  const updatedItem: RequestLogItem = {
    ...targetItem,
    modified_at: now,
  };

  // Set notes only when non-empty to comply with exactOptionalPropertyTypes
  if (notes.length > 0) {
    updatedItem.notes = notes;
  } else {
    // Remove notes property when empty
    delete updatedItem.notes;
  }

  // Step 4: Create a new items array with the updated item
  const updatedItems = [...doc.items];
  updatedItems[itemIndex] = updatedItem;

  // Step 5: Regenerate document-level aggregates
  const aggregatedTags = aggregateTags(updatedItems);
  const updatedItemsIndex = updateItemsIndex(updatedItems);

  // Step 6: Build and return the updated document
  const updatedDoc: RequestLogDoc = {
    ...doc,
    items: updatedItems,
    items_index: updatedItemsIndex,
    tags: aggregatedTags,
    updated_at: now,
  };

  return { updatedDoc, changed: true };
}

/**
 * Finds an item within a document by ID.
 *
 * @param doc - The document to search
 * @param itemId - The item ID to find
 * @returns The item if found, undefined otherwise
 */
export function findItem(doc: RequestLogDoc, itemId: string): RequestLogItem | undefined {
  return doc.items.find((item) => item.id === itemId);
}

/**
 * Gets the notes array for a specific item, with empty array fallback.
 *
 * @param doc - The document containing the item
 * @param itemId - The item ID
 * @returns The item's notes array, or empty array if item not found
 */
export function getItemNotes(doc: RequestLogDoc, itemId: string): Note[] {
  const item = findItem(doc, itemId);
  return item?.notes ?? [];
}
