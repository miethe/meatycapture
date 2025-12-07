/**
 * Tauri Filesystem Adapter
 *
 * Desktop-specific implementation using Tauri's filesystem plugin.
 * Provides native file system access with full read/write permissions
 * for markdown files in user-specified directories.
 *
 * Features:
 * - Native file system access (not sandboxed like browser)
 * - Automatic backup creation before writes
 * - Directory creation and validation
 * - Path expansion (~/ becomes user home)
 *
 * @example
 * ```typescript
 * import { createTauriDocStore } from '@adapters/fs-local/tauri-fs-adapter';
 *
 * const store = createTauriDocStore();
 * const docs = await store.list('~/meatycapture/projects/app');
 * ```
 */

import {
  readTextFile,
  writeTextFile,
  readDir,
  exists,
  mkdir,
  copyFile,
} from '@tauri-apps/plugin-fs';
import { join, homeDir } from '@tauri-apps/api/path';
import type { DocStore, DocMeta, Clock } from '@core/ports';
import type { RequestLogDoc, ItemDraft } from '@core/models';
import { serialize, parse, aggregateTags, updateItemsIndex } from '@core/serializer';
import { generateItemId, getNextItemNumber } from '@core/validation';
import { logger } from '@core/logging';

/**
 * Expands path shortcuts like ~/ to absolute paths.
 *
 * @param path - Path potentially containing shortcuts
 * @returns Absolute path
 */
async function expandPath(path: string): Promise<string> {
  if (path.startsWith('~/')) {
    const home = await homeDir();
    return path.replace('~/', home);
  }
  if (path === '~') {
    return await homeDir();
  }
  return path;
}

/**
 * Tauri desktop implementation of DocStore.
 *
 * Uses @tauri-apps/plugin-fs for native filesystem access.
 * All operations are performed with full filesystem permissions
 * as configured in tauri.conf.json.
 */
export class TauriDocStore implements DocStore {
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
    logger.debug('Listing documents in directory (Tauri)', { directory });

    try {
      const expandedPath = await expandPath(directory);

      // Check if directory exists
      const dirExists = await exists(expandedPath);
      if (!dirExists) {
        logger.debug('Directory does not exist (Tauri)', { directory: expandedPath });
        return [];
      }

      // Read all entries in the directory
      const entries = await readDir(expandedPath);

      // Filter for markdown files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mdFiles = entries.filter((entry: any) => {
        return entry.isFile && entry.name.endsWith('.md');
      });

      logger.debug('Found markdown files (Tauri)', {
        count: mdFiles.length,
        directory: expandedPath,
      });

      // Read and parse each file to extract metadata
      const docMetas: DocMeta[] = [];

      for (const entry of mdFiles) {
        try {
          const filePath = await join(expandedPath, entry.name);
          const content = await readTextFile(filePath);
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
          logger.warn('Skipping file - parse failed (Tauri)', {
            file: entry.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          continue;
        }
      }

      // Sort by updated_at descending (most recent first)
      const sorted = docMetas.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

      logger.info('Listed documents successfully (Tauri)', {
        directory: expandedPath,
        count: sorted.length,
      });

      return sorted;
    } catch (error) {
      logger.error('Failed to list documents (Tauri)', {
        directory,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to list documents in ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    logger.debug('Reading document (Tauri)', { path });

    try {
      const expandedPath = await expandPath(path);
      const content = await readTextFile(expandedPath);
      const doc = parse(content);

      logger.info('Document read successfully (Tauri)', {
        path: expandedPath,
        doc_id: doc.doc_id,
        item_count: doc.item_count,
      });

      return doc;
    } catch (error) {
      logger.error('Failed to read document (Tauri)', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to read document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    logger.debug('Writing document (Tauri)', {
      path,
      doc_id: doc.doc_id,
      item_count: doc.item_count,
    });

    try {
      const expandedPath = await expandPath(path);

      // Ensure parent directory exists
      // Note: dirname is async in Tauri API
      const dir = expandedPath.substring(0, expandedPath.lastIndexOf('/'));
      const dirExists = await exists(dir);

      if (!dirExists) {
        await mkdir(dir, { recursive: true });
        logger.debug('Created parent directory (Tauri)', { dir });
      }

      // Create backup if file exists
      let backupCreated = false;
      const fileExists = await exists(expandedPath);

      if (fileExists) {
        await this.backup(expandedPath);
        backupCreated = true;
        logger.debug('Backup created before write (Tauri)', {
          path: expandedPath,
          backup: `${expandedPath}.bak`,
        });
      } else {
        logger.debug('No existing file, skipping backup (Tauri)', { path: expandedPath });
      }

      // Serialize and write
      const content = serialize(doc);
      await writeTextFile(expandedPath, content);

      logger.info('Document written successfully (Tauri)', {
        path: expandedPath,
        doc_id: doc.doc_id,
        item_count: doc.item_count,
        backup_created: backupCreated,
      });
    } catch (error) {
      logger.error('Failed to write document (Tauri)', {
        path,
        doc_id: doc.doc_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to write document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    logger.debug('Appending item to document (Tauri)', {
      path,
      item_type: item.type,
      item_title: item.title,
    });

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

      logger.info('Item appended successfully (Tauri)', {
        path,
        item_id: itemId,
        doc_id: doc.doc_id,
        new_item_count: updatedDoc.item_count,
      });

      return updatedDoc;
    } catch (error) {
      logger.error('Failed to append item (Tauri)', {
        path,
        item_type: item.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to append item to ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    const expandedPath = await expandPath(path);
    const backupPath = `${expandedPath}.bak`;

    logger.debug('Creating backup (Tauri)', { path: expandedPath, backup: backupPath });

    try {
      // Check if source file exists
      const fileExists = await exists(expandedPath);
      if (!fileExists) {
        throw new Error('Source file does not exist');
      }

      // Copy to backup (overwrites existing .bak)
      await copyFile(expandedPath, backupPath);

      logger.info('Backup created successfully (Tauri)', {
        path: expandedPath,
        backup: backupPath,
      });

      return backupPath;
    } catch (error) {
      logger.error('Failed to create backup (Tauri)', {
        path: expandedPath,
        backup: backupPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to create backup of ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if a path exists and is writable.
   *
   * For new files: validates the parent directory exists and is writable.
   * For existing files: validates the file itself is writable.
   *
   * Note: Tauri fs plugin doesn't provide granular permission checks.
   * We assume paths are writable if they're within allowed scope.
   *
   * @param path - Absolute path to check
   * @returns True if writable, false otherwise
   */
  async isWritable(path: string): Promise<boolean> {
    logger.debug('Checking path writability (Tauri)', { path });

    try {
      const expandedPath = await expandPath(path);

      // Check if file exists
      const fileExists = await exists(expandedPath);

      if (fileExists) {
        // File exists - assume writable if we can read it
        try {
          await readTextFile(expandedPath);
          logger.debug('Path is writable (existing file) (Tauri)', { path: expandedPath });
          return true;
        } catch {
          logger.debug('Path is not writable (existing file, no read permission) (Tauri)', {
            path: expandedPath,
          });
          return false;
        }
      } else {
        // File doesn't exist - check if parent directory exists
        const dir = expandedPath.substring(0, expandedPath.lastIndexOf('/'));
        const dirExists = await exists(dir);

        if (dirExists) {
          logger.debug('Path is writable (parent directory exists) (Tauri)', {
            path: expandedPath,
            dir,
          });
          return true;
        } else {
          // Try to check if we can create the directory
          // This is optimistic - we assume we can create if parent of parent exists
          const parentDir = dir.substring(0, dir.lastIndexOf('/'));
          const parentExists = await exists(parentDir);

          if (parentExists) {
            logger.debug('Path is writable (can create parent directory) (Tauri)', {
              path: expandedPath,
              parentDir,
            });
            return true;
          } else {
            logger.debug('Path is not writable (cannot create directory) (Tauri)', {
              path: expandedPath,
              dir,
            });
            return false;
          }
        }
      }
    } catch (error) {
      logger.error('Error checking writability (Tauri)', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

/**
 * Factory function to create a new TauriDocStore instance.
 *
 * @returns A new TauriDocStore instance
 *
 * @example
 * ```typescript
 * const store = createTauriDocStore();
 * const docs = await store.list('~/meatycapture');
 * ```
 */
export function createTauriDocStore(): DocStore {
  return new TauriDocStore();
}
