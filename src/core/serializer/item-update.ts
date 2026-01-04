/**
 * Item-Level Update Operations
 *
 * Provides targeted update utilities for modifying specific item properties
 * without full document rewrites. Designed for efficient viewer operations
 * where only notes or other item fields need updating.
 *
 * Key Features:
 * - Atomic item-level updates with backup support
 * - Automatic timestamp and index synchronization
 * - Document-level tag aggregation after changes
 *
 * @example
 * ```typescript
 * import { updateItemNotes } from '@core/serializer/item-update';
 *
 * // Update notes for a specific item
 * const updatedDoc = await updateItemNotes(
 *   '/path/to/doc.md',
 *   'REQ-20260101-project-01',
 *   [newNote],
 *   { createBackup: true }
 * );
 * ```
 */

import { readFile, writeFile, copyFile } from 'fs/promises';
import { parse, serialize, aggregateTags, updateItemsIndex } from './index';
import type { RequestLogDoc, Note } from '@core/models';

/**
 * Options for item update operations.
 */
export interface UpdateItemNotesOptions {
  /**
   * Whether to create a backup file before writing.
   * Backup is saved as `${docPath}.bak`.
   * @default true
   */
  createBackup?: boolean;
}

/**
 * Error thrown when a document file is not found.
 */
export class DocumentNotFoundError extends Error {
  readonly code = 'DOCUMENT_NOT_FOUND';

  constructor(
    readonly docPath: string,
    cause?: Error
  ) {
    super(`Document not found: ${docPath}`);
    this.name = 'DocumentNotFoundError';
    this.cause = cause;
  }
}

/**
 * Error thrown when an item is not found within a document.
 */
export class ItemNotFoundError extends Error {
  readonly code = 'ITEM_NOT_FOUND';

  constructor(
    readonly docPath: string,
    readonly itemId: string
  ) {
    super(`Item not found: ${itemId} in document ${docPath}`);
    this.name = 'ItemNotFoundError';
  }
}

/**
 * Error thrown when document parsing fails.
 */
export class DocumentParseError extends Error {
  readonly code = 'DOCUMENT_PARSE_ERROR';

  constructor(
    readonly docPath: string,
    cause?: Error
  ) {
    super(`Failed to parse document: ${docPath}. ${cause?.message ?? ''}`);
    this.name = 'DocumentParseError';
    this.cause = cause;
  }
}

/**
 * Error thrown when file write operations fail.
 */
export class FileWriteError extends Error {
  readonly code = 'FILE_WRITE_ERROR';

  constructor(
    readonly docPath: string,
    cause?: Error
  ) {
    super(`Failed to write document: ${docPath}. ${cause?.message ?? ''}`);
    this.name = 'FileWriteError';
    this.cause = cause;
  }
}

/**
 * Updates the notes array for a specific item within a document.
 *
 * This function provides targeted note updates without requiring manual
 * document manipulation. It handles:
 * - Reading and parsing the existing document
 * - Locating the target item by ID
 * - Replacing the item's notes array
 * - Updating modified_at timestamp on the item
 * - Regenerating document-level aggregates (tags, items_index, item_count)
 * - Creating a backup before writing (configurable)
 * - Serializing and writing the updated document
 *
 * @param docPath - Absolute path to the request-log markdown file
 * @param itemId - The ID of the item to update (e.g., 'REQ-20260101-project-01')
 * @param notes - The new notes array to set on the item (replaces existing notes)
 * @param options - Configuration options for the update operation
 * @returns The updated RequestLogDoc after successful write
 *
 * @throws {DocumentNotFoundError} When the document file doesn't exist
 * @throws {ItemNotFoundError} When the specified item ID isn't found in the document
 * @throws {DocumentParseError} When the document content is malformed
 * @throws {FileWriteError} When backup creation or file write fails
 *
 * @example
 * ```typescript
 * // Add notes to an item with no existing notes
 * const newNote: Note = {
 *   id: 'NOTE-20260104-project-01-01',
 *   type: 'General',
 *   content: 'Investigation findings...',
 *   created_at: new Date(),
 *   updated_at: new Date(),
 * };
 *
 * const doc = await updateItemNotes(
 *   '/docs/REQ-20260104-project.md',
 *   'REQ-20260104-project-01',
 *   [newNote]
 * );
 *
 * // Remove all notes from an item
 * const doc = await updateItemNotes(
 *   '/docs/REQ-20260104-project.md',
 *   'REQ-20260104-project-01',
 *   []
 * );
 * ```
 */
export async function updateItemNotes(
  docPath: string,
  itemId: string,
  notes: Note[],
  options: UpdateItemNotesOptions = {}
): Promise<RequestLogDoc> {
  const { createBackup = true } = options;

  // Step 1: Read the existing file
  let content: string;
  try {
    content = await readFile(docPath, 'utf-8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new DocumentNotFoundError(docPath, error);
    }
    // Re-throw permission or other errors with context
    throw new DocumentNotFoundError(
      docPath,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  // Step 2: Parse the document
  let doc: RequestLogDoc;
  try {
    doc = parse(content);
  } catch (error) {
    throw new DocumentParseError(docPath, error instanceof Error ? error : new Error(String(error)));
  }

  // Step 3: Find the target item
  const itemIndex = doc.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    throw new ItemNotFoundError(docPath, itemId);
  }

  // Step 4: Update the item's notes and modified_at timestamp
  const targetItem = doc.items[itemIndex];
  if (!targetItem) {
    // Type guard - shouldn't happen given findIndex check
    throw new ItemNotFoundError(docPath, itemId);
  }

  const now = new Date();

  // Build updated item - only include notes if non-empty (exactOptionalPropertyTypes compliance)
  const updatedItem: typeof targetItem = {
    ...targetItem,
    modified_at: now,
  };

  // Set notes only when non-empty to comply with exactOptionalPropertyTypes
  if (notes.length > 0) {
    updatedItem.notes = notes;
  } else {
    // Remove notes property when empty (delete is safe here)
    delete updatedItem.notes;
  }

  // Create a new items array with the updated item
  const updatedItems = [...doc.items];
  updatedItems[itemIndex] = updatedItem;

  // Step 5: Regenerate document-level aggregates
  // Notes don't contribute to document tags, but we still need to regenerate
  // from item tags in case this is part of a broader operation
  const aggregatedTags = aggregateTags(updatedItems);
  const updatedItemsIndex = updateItemsIndex(updatedItems);

  // Step 6: Build the updated document
  const updatedDoc: RequestLogDoc = {
    ...doc,
    items: updatedItems,
    items_index: updatedItemsIndex,
    tags: aggregatedTags,
    updated_at: now,
  };

  // Step 7: Serialize the document
  const serialized = serialize(updatedDoc);

  // Step 8: Create backup if requested
  if (createBackup) {
    try {
      await copyFile(docPath, `${docPath}.bak`);
    } catch (error) {
      // If the original file doesn't exist (edge case), we can't backup
      if (isNodeError(error) && error.code === 'ENOENT') {
        // Original already doesn't exist, which shouldn't happen at this point
        // since we read it successfully. Skip backup.
      } else {
        throw new FileWriteError(
          docPath,
          error instanceof Error
            ? new Error(`Backup creation failed: ${error.message}`)
            : new Error('Backup creation failed')
        );
      }
    }
  }

  // Step 9: Write the updated document
  try {
    await writeFile(docPath, serialized, 'utf-8');
  } catch (error) {
    throw new FileWriteError(docPath, error instanceof Error ? error : new Error(String(error)));
  }

  return updatedDoc;
}

/**
 * Type guard for Node.js system errors with code property.
 */
function isNodeError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && 'code' in error;
}
