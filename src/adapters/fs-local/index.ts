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
import { homedir } from 'node:os';
import type { DocStore, DocMeta, Clock } from '@core/ports';
import type { RequestLogDoc, ItemDraft } from '@core/models';
import { serialize, parse, aggregateTags, updateItemsIndex } from '@core/serializer';
import { generateItemId, getNextItemNumber } from '@core/validation';
import { logger } from '@core/logging';

/**
 * Gets the base directory for tilde expansion.
 *
 * In server/Docker mode (MEATYCAPTURE_DATA_DIR set), uses data directory.
 * In desktop mode, uses user's home directory.
 */
function getBaseDir(): string {
  return process.env.MEATYCAPTURE_DATA_DIR || homedir();
}

/**
 * Expands tilde (~) in paths to the appropriate base directory.
 *
 * In server/Docker mode: ~ expands to MEATYCAPTURE_DATA_DIR (/data)
 * In desktop mode: ~ expands to user's home directory
 *
 * @param path - Path that may contain tilde
 * @returns Path with tilde expanded to absolute directory
 */
function expandPath(path: string): string {
  const baseDir = getBaseDir();
  if (path.startsWith('~/')) {
    return join(baseDir, path.slice(2));
  }
  if (path === '~') {
    return baseDir;
  }
  return path;
}

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
    const expandedDirectory = expandPath(directory);
    logger.debug('Listing documents in directory', { directory: expandedDirectory });

    try {
      // Read all files in the directory
      const entries = await fs.readdir(expandedDirectory, { withFileTypes: true });

      // Filter for markdown files
      const mdFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => join(expandedDirectory, entry.name));

      logger.debug('Found markdown files', { count: mdFiles.length, directory: expandedDirectory });

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
          logger.warn('Skipping file - parse failed', {
            path: filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          continue;
        }
      }

      // Sort by updated_at descending (most recent first)
      const sorted = docMetas.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

      logger.info('Listed documents successfully', {
        directory: expandedDirectory,
        count: sorted.length,
      });

      return sorted;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Directory doesn't exist - return empty array
        logger.debug('Directory does not exist', { directory: expandedDirectory });
        return [];
      }

      logger.error('Failed to list documents', {
        directory: expandedDirectory,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to list documents in ${expandedDirectory}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    const expandedPath = expandPath(path);
    logger.debug('Reading document', { path: expandedPath });

    try {
      const content = await fs.readFile(expandedPath, 'utf-8');
      const doc = parse(content);

      logger.info('Document read successfully', {
        path: expandedPath,
        doc_id: doc.doc_id,
        item_count: doc.item_count,
      });

      return doc;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        logger.error('Document not found', { path: expandedPath });
        throw new Error(`Document not found: ${expandedPath}`);
      }

      logger.error('Failed to read document', {
        path: expandedPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to read document ${expandedPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    const expandedPath = expandPath(path);
    logger.debug('Writing document', {
      path: expandedPath,
      doc_id: doc.doc_id,
      item_count: doc.item_count,
    });

    try {
      // Ensure parent directory exists
      const dir = dirname(expandedPath);
      await fs.mkdir(dir, { recursive: true });

      // Create backup if file exists
      let backupCreated = false;
      try {
        await fs.access(expandedPath);
        await this.backup(expandedPath);
        backupCreated = true;
        logger.debug('Backup created before write', { path: expandedPath, backup: `${expandedPath}.bak` });
      } catch {
        // File doesn't exist yet, no backup needed
        logger.debug('No existing file, skipping backup', { path: expandedPath });
      }

      // Serialize and write
      const content = serialize(doc);
      await fs.writeFile(expandedPath, content, 'utf-8');

      logger.info('Document written successfully', {
        path: expandedPath,
        doc_id: doc.doc_id,
        item_count: doc.item_count,
        backup_created: backupCreated,
      });
    } catch (error) {
      logger.error('Failed to write document', {
        path: expandedPath,
        doc_id: doc.doc_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to write document ${expandedPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    const expandedPath = expandPath(path);
    logger.debug('Appending item to document', {
      path: expandedPath,
      item_type: item.type,
      item_title: item.title,
    });

    try {
      // Read existing document
      const doc = await this.read(expandedPath);

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
      await this.write(expandedPath, updatedDoc);

      logger.info('Item appended successfully', {
        path: expandedPath,
        item_id: itemId,
        doc_id: doc.doc_id,
        new_item_count: updatedDoc.item_count,
      });

      return updatedDoc;
    } catch (error) {
      logger.error('Failed to append item', {
        path: expandedPath,
        item_type: item.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to append item to ${expandedPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    const expandedPath = expandPath(path);
    const backupPath = `${expandedPath}.bak`;

    logger.debug('Creating backup', { path: expandedPath, backup: backupPath });

    try {
      // Check if source file exists
      await fs.access(expandedPath);

      // Copy to backup (overwrites existing .bak)
      await fs.copyFile(expandedPath, backupPath);

      logger.info('Backup created successfully', { path: expandedPath, backup: backupPath });

      return backupPath;
    } catch (error) {
      logger.error('Failed to create backup', {
        path: expandedPath,
        backup: backupPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to create backup of ${expandedPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
    const expandedPath = expandPath(path);
    logger.debug('Checking path writability', { path: expandedPath });

    try {
      // Check if file exists
      await fs.access(expandedPath);

      // File exists - check if writable
      try {
        await fs.access(expandedPath, fs.constants.W_OK);
        logger.debug('Path is writable (existing file)', { path: expandedPath });
        return true;
      } catch {
        logger.debug('Path is not writable (existing file, no write permission)', { path: expandedPath });
        return false;
      }
    } catch {
      // File doesn't exist - check if parent directory is writable
      const dir = dirname(expandedPath);

      try {
        await fs.access(dir, fs.constants.W_OK);
        logger.debug('Path is writable (parent directory exists)', { path: expandedPath, dir });
        return true;
      } catch {
        // Parent directory doesn't exist or isn't writable
        // Try to check if we can create the directory
        try {
          const parentDir = dirname(dir);
          await fs.access(parentDir, fs.constants.W_OK);
          logger.debug('Path is writable (can create parent directory)', { path: expandedPath, parentDir });
          return true;
        } catch {
          logger.debug('Path is not writable (cannot create directory)', { path: expandedPath, dir });
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
