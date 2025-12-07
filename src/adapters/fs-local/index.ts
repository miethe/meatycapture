/**
 * File System Adapter
 *
 * Local filesystem implementation of DocStore:
 * - Read/write request-log markdown files
 * - Backup creation (.bak files)
 * - Directory listing and metadata
 * - Path validation and error handling
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DocStore, DocMeta, Clock } from '@core/ports';
import type { RequestLogDoc, ItemDraft } from '@core/models';
import { serialize, parse, aggregateTags, updateItemsIndex } from '@core/serializer';
import { generateItemId, getNextItemNumber } from '@core/validation';

/**
 * Local filesystem implementation of DocStore.
 *
 * Provides read/write operations for request-log markdown documents
 * stored on the local filesystem. Handles automatic backups, tag
 * aggregation, and item index management.
 *
 * @example
 * ```typescript
 * import { createFsDocStore } from '@adapters/fs-local';
 *
 * const store = createFsDocStore();
 * const docs = await store.list('/path/to/docs');
 * const doc = await store.read('/path/to/docs/REQ-20251203-app.md');
 * ```
 */
export class FsDocStore implements DocStore {
  /**
   * Lists all request-log documents in a directory.
   *
   * Scans the directory for markdown files and filters those with
   * valid request-log frontmatter. Returns metadata sorted by
   * most recently updated first.
   *
   * @param directory - Absolute path to directory to scan
   * @returns Array of document metadata, sorted by updated_at desc
   * @throws Error if directory cannot be read
   */
  async list(directory: string): Promise<DocMeta[]> {
    try {
      // Read all files in the directory
      const entries = await fs.readdir(directory, { withFileTypes: true });

      // Filter for markdown files
      const mdFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => join(directory, entry.name));

      // Read and parse each file to extract metadata
      const docMetas: DocMeta[] = [];

      for (const filePath of mdFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const doc = parse(content);

          // Only include valid request-log documents
          if (doc.doc_id) {
            docMetas.push({
              path: filePath,
              doc_id: doc.doc_id,
              title: doc.title,
              item_count: doc.item_count,
              updated_at: doc.updated_at,
            });
          }
        } catch (error) {
          // Skip files that fail to parse (not request-log format)
          console.warn(`Skipping file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }

      // Sort by updated_at descending (most recent first)
      return docMetas.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Directory doesn't exist - return empty array
        return [];
      }
      throw new Error(`Failed to list documents in ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reads and parses a request-log document from the filesystem.
   *
   * @param path - Absolute path to the document file
   * @returns Parsed RequestLogDoc
   * @throws Error if file not found or parsing fails
   */
  async read(path: string): Promise<RequestLogDoc> {
    try {
      const content = await fs.readFile(path, 'utf-8');
      return parse(content);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Document not found: ${path}`);
      }
      throw new Error(`Failed to read document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Writes a complete request-log document to the filesystem.
   *
   * Creates a backup before writing if the file already exists.
   * Ensures the parent directory exists before writing.
   *
   * @param path - Absolute path for the document file
   * @param doc - Complete document to write
   * @throws Error if write fails or path not writable
   */
  async write(path: string, doc: RequestLogDoc): Promise<void> {
    try {
      // Ensure parent directory exists
      const dir = dirname(path);
      await fs.mkdir(dir, { recursive: true });

      // Create backup if file exists
      try {
        await fs.access(path);
        await this.backup(path);
      } catch {
        // File doesn't exist yet, no backup needed
      }

      // Serialize and write
      const content = serialize(doc);
      await fs.writeFile(path, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Appends a new item to an existing document.
   *
   * Automatically handles:
   * - Reading the existing document
   * - Generating the next item ID
   * - Adding the item with created_at timestamp
   * - Aggregating tags from all items
   * - Updating items_index
   * - Incrementing item_count
   * - Setting updated_at timestamp
   * - Creating backup before modification
   *
   * @param path - Absolute path to the document file
   * @param item - Item draft to append
   * @param clock - Clock for timestamp generation
   * @returns Updated document after append
   * @throws Error if document not found or append fails
   */
  async append(path: string, item: ItemDraft, clock: Clock): Promise<RequestLogDoc> {
    try {
      // Read existing document
      const doc = await this.read(path);

      // Generate next item ID
      const nextNumber = getNextItemNumber(doc.items);
      const itemId = generateItemId(doc.doc_id, nextNumber);

      // Create the new item
      const newItem = {
        ...item,
        id: itemId,
        created_at: clock.now(),
      };

      // Add item to document
      const updatedItems = [...doc.items, newItem];

      // Update aggregated metadata
      const updatedDoc: RequestLogDoc = {
        ...doc,
        items: updatedItems,
        tags: aggregateTags(updatedItems),
        items_index: updateItemsIndex(updatedItems),
        item_count: updatedItems.length,
        updated_at: clock.now(),
      };

      // Write updated document (includes automatic backup)
      await this.write(path, updatedDoc);

      return updatedDoc;
    } catch (error) {
      throw new Error(`Failed to append item to ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a backup copy of a file.
   *
   * Backup is created as {filename}.bak in the same directory.
   * Overwrites existing backup file if present.
   *
   * @param path - Absolute path to file to backup
   * @returns Path to the backup file
   * @throws Error if backup creation fails
   */
  async backup(path: string): Promise<string> {
    const backupPath = `${path}.bak`;

    try {
      await fs.copyFile(path, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup of ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks if a path exists and is writable.
   *
   * For new files: validates the parent directory exists and is writable.
   * For existing files: validates the file itself is writable.
   *
   * @param path - Absolute path to check
   * @returns True if writable, false otherwise
   */
  async isWritable(path: string): Promise<boolean> {
    try {
      // Check if file exists
      await fs.access(path);

      // File exists - check if writable
      try {
        await fs.access(path, fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    } catch {
      // File doesn't exist - check if parent directory is writable
      const dir = dirname(path);

      try {
        await fs.access(dir, fs.constants.W_OK);
        return true;
      } catch {
        // Parent directory doesn't exist or isn't writable
        // Try to check if we can create the directory
        try {
          const parentDir = dirname(dir);
          await fs.access(parentDir, fs.constants.W_OK);
          return true;
        } catch {
          return false;
        }
      }
    }
  }
}

/**
 * Factory function to create a new FsDocStore instance.
 *
 * @returns A new FsDocStore instance
 *
 * @example
 * ```typescript
 * const store = createFsDocStore();
 * const docs = await store.list('/path/to/docs');
 * ```
 */
export function createFsDocStore(): DocStore {
  return new FsDocStore();
}
