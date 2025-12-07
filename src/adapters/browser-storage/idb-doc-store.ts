/**
 * IndexedDB DocStore Adapter
 *
 * Browser-based implementation using IndexedDB for client-side storage.
 * Provides persistent document storage without filesystem access.
 *
 * Features:
 * - IndexedDB-backed persistent storage
 * - Project-based document filtering
 * - Automatic backup management
 * - Date serialization/deserialization
 * - Transaction-based consistency
 *
 * Key Adaptations for Browser:
 * - `directory` parameter maps to project_id filtering
 * - `path` parameter represents doc_id (not filesystem path)
 * - Documents stored as JSON with ISO date strings
 * - No actual filesystem operations
 *
 * @example
 * ```typescript
 * import { createBrowserDocStore } from '@adapters/browser-storage/idb-doc-store';
 *
 * const store = createBrowserDocStore();
 * // Use project_id as "directory" parameter
 * const docs = await store.list('capture-app');
 * // Use doc_id as "path" parameter
 * const doc = await store.read('REQ-20251207-capture-app');
 * ```
 */

import type { DocStore, DocMeta, Clock } from '@core/ports';
import type { RequestLogDoc, ItemDraft, RequestLogItem } from '@core/models';
import { serialize, parse, aggregateTags, updateItemsIndex } from '@core/serializer';
import { generateItemId, getNextItemNumber } from '@core/validation';
import { logger } from '@core/logging';

/**
 * Database configuration constants
 */
const DB_NAME = 'meatycapture';
const DB_VERSION = 1;

/**
 * Object store names
 */
const STORE_DOCUMENTS = 'documents';
const STORE_BACKUPS = 'backups';

/**
 * Stored document format with serialized dates
 * IndexedDB doesn't preserve Date objects, so we store ISO strings
 */
interface StoredDocument {
  doc_id: string;
  project_id: string;
  title: string;
  items_index: Array<{ id: string; type: string; title: string }>;
  tags: string[];
  item_count: number;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
  /** Serialized markdown content (includes items) */
  content: string;
}

/**
 * Backup entry format
 */
interface BackupEntry {
  id?: number; // Auto-increment
  doc_id: string;
  backup_timestamp: string; // ISO 8601 string
  content: string;
}

/**
 * IndexedDB implementation of DocStore.
 *
 * Uses IndexedDB for persistent browser storage with project-based filtering.
 * All operations are transaction-based for consistency.
 *
 * Design notes:
 * - Lazy database initialization on first operation
 * - Path parameters represent doc_id (not filesystem paths)
 * - Directory parameters represent project_id for filtering
 * - Dates stored as ISO strings and deserialized on read
 * - Backups stored in separate object store with auto-increment IDs
 */
export class BrowserDocStore implements DocStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Lazily initializes and returns the IndexedDB database.
   *
   * Creates object stores on first initialization:
   * - documents: Primary key = doc_id, index on project_id
   * - backups: Auto-increment primary key, index on doc_id
   *
   * @returns Promise resolving to IDBDatabase instance
   */
  private getDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      logger.debug('Opening IndexedDB database', { name: DB_NAME, version: DB_VERSION });

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        const error = request.error?.message || 'Unknown error';
        logger.error('Failed to open IndexedDB database', { error });
        reject(new Error(`Failed to open database: ${error}`));
      };

      request.onsuccess = () => {
        logger.info('IndexedDB database opened successfully', { name: DB_NAME });
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        logger.info('Upgrading IndexedDB schema', {
          oldVersion: event.oldVersion,
          newVersion: event.newVersion,
        });

        const db = request.result;

        // Create documents object store
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          const documentStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'doc_id' });
          documentStore.createIndex('project_id', 'project_id', { unique: false });

          logger.debug('Created documents object store', { store: STORE_DOCUMENTS });
        }

        // Create backups object store
        if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
          const backupStore = db.createObjectStore(STORE_BACKUPS, {
            keyPath: 'id',
            autoIncrement: true,
          });
          backupStore.createIndex('doc_id', 'doc_id', { unique: false });

          logger.debug('Created backups object store', { store: STORE_BACKUPS });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Lists all request-log documents for a specific project.
   *
   * In browser context, the `directory` parameter is treated as a project_id
   * for filtering documents. Returns metadata sorted by most recently updated.
   *
   * @param directory - Project ID to filter by (treated as project_id, not filesystem path)
   * @returns Array of document metadata, sorted by updated_at desc
   */
  async list(directory: string): Promise<DocMeta[]> {
    logger.debug('Listing documents in browser storage', { project_id: directory });

    try {
      const db = await this.getDatabase();
      const transaction = db.transaction([STORE_DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const index = store.index('project_id');

      // Query by project_id index
      const request = index.getAll(directory);

      return new Promise<DocMeta[]>((resolve, reject) => {
        request.onsuccess = () => {
          const storedDocs = request.result as StoredDocument[];

          logger.debug('Found documents in browser storage', {
            project_id: directory,
            count: storedDocs.length,
          });

          // Convert stored documents to DocMeta
          const docMetas: DocMeta[] = storedDocs.map((stored) => ({
            path: stored.doc_id, // In browser, path = doc_id
            doc_id: stored.doc_id,
            title: stored.title,
            item_count: stored.item_count,
            updated_at: new Date(stored.updated_at),
          }));

          // Sort by updated_at descending (most recent first)
          const sorted = docMetas.sort(
            (a, b) => b.updated_at.getTime() - a.updated_at.getTime()
          );

          logger.info('Listed documents successfully (browser)', {
            project_id: directory,
            count: sorted.length,
          });

          resolve(sorted);
        };

        request.onerror = () => {
          const error = request.error?.message || 'Unknown error';
          logger.error('Failed to list documents (browser)', {
            project_id: directory,
            error,
          });
          reject(new Error(`Failed to list documents: ${error}`));
        };
      });
    } catch (error) {
      logger.error('Failed to list documents (browser)', {
        project_id: directory,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to list documents for project ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Reads and parses a request-log document from IndexedDB.
   *
   * In browser context, the `path` parameter is the doc_id (not filesystem path).
   * Deserializes dates from ISO strings and parses markdown content.
   *
   * @param path - Document ID (treated as doc_id, not filesystem path)
   * @returns Parsed RequestLogDoc
   * @throws Error if document not found or parsing fails
   */
  async read(path: string): Promise<RequestLogDoc> {
    logger.debug('Reading document (browser)', { doc_id: path });

    try {
      const db = await this.getDatabase();
      const transaction = db.transaction([STORE_DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.get(path);

      return new Promise<RequestLogDoc>((resolve, reject) => {
        request.onsuccess = () => {
          const stored = request.result as StoredDocument | undefined;

          if (!stored) {
            logger.warn('Document not found (browser)', { doc_id: path });
            reject(new Error(`Document not found: ${path}`));
            return;
          }

          // Parse markdown content to get full document with items
          const doc = parse(stored.content);

          logger.info('Document read successfully (browser)', {
            doc_id: doc.doc_id,
            item_count: doc.item_count,
          });

          resolve(doc);
        };

        request.onerror = () => {
          const error = request.error?.message || 'Unknown error';
          logger.error('Failed to read document (browser)', { doc_id: path, error });
          reject(new Error(`Failed to read document ${path}: ${error}`));
        };
      });
    } catch (error) {
      logger.error('Failed to read document (browser)', {
        doc_id: path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to read document ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Writes a complete request-log document to IndexedDB.
   *
   * Creates a backup before writing if the document already exists.
   * Serializes the document to markdown and stores with metadata.
   *
   * @param path - Document ID (treated as doc_id, not filesystem path)
   * @param doc - Complete document to write
   * @throws Error if write fails
   */
  async write(path: string, doc: RequestLogDoc): Promise<void> {
    logger.debug('Writing document (browser)', {
      doc_id: doc.doc_id,
      item_count: doc.item_count,
    });

    try {
      const db = await this.getDatabase();

      // Check if document exists for backup
      let backupCreated = false;
      try {
        const existingDoc = await this.read(path);
        if (existingDoc) {
          await this.backup(path);
          backupCreated = true;
          logger.debug('Backup created before write (browser)', { doc_id: path });
        }
      } catch {
        // Document doesn't exist, no backup needed
        logger.debug('No existing document, skipping backup (browser)', { doc_id: path });
      }

      // Serialize document to markdown
      const content = serialize(doc);

      // Create stored document with metadata
      const stored: StoredDocument = {
        doc_id: doc.doc_id,
        project_id: doc.project_id,
        title: doc.title,
        items_index: doc.items_index,
        tags: doc.tags,
        item_count: doc.item_count,
        created_at: doc.created_at.toISOString(),
        updated_at: doc.updated_at.toISOString(),
        content,
      };

      // Write to IndexedDB
      const transaction = db.transaction([STORE_DOCUMENTS], 'readwrite');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.put(stored);

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          logger.info('Document written successfully (browser)', {
            doc_id: doc.doc_id,
            item_count: doc.item_count,
            backup_created: backupCreated,
          });
          resolve();
        };

        request.onerror = () => {
          const error = request.error?.message || 'Unknown error';
          logger.error('Failed to write document (browser)', {
            doc_id: doc.doc_id,
            error,
          });
          reject(new Error(`Failed to write document ${path}: ${error}`));
        };
      });
    } catch (error) {
      logger.error('Failed to write document (browser)', {
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
   * @param path - Document ID (treated as doc_id, not filesystem path)
   * @param item - Item draft to append
   * @param clock - Clock for timestamp generation
   * @returns Updated document after append
   * @throws Error if document not found or append fails
   */
  async append(path: string, item: ItemDraft, clock: Clock): Promise<RequestLogDoc> {
    logger.debug('Appending item to document (browser)', {
      doc_id: path,
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
      const newItem: RequestLogItem = {
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

      logger.info('Item appended successfully (browser)', {
        doc_id: path,
        item_id: itemId,
        new_item_count: updatedDoc.item_count,
      });

      return updatedDoc;
    } catch (error) {
      logger.error('Failed to append item (browser)', {
        doc_id: path,
        item_type: item.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to append item to ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Creates a backup copy of a document in the backups object store.
   *
   * Backup is stored with timestamp and can be used for recovery.
   * Multiple backups per document are preserved.
   *
   * @param path - Document ID to backup (treated as doc_id, not filesystem path)
   * @returns Path/ID reference to the backup (doc_id for browser context)
   * @throws Error if backup creation fails
   */
  async backup(path: string): Promise<string> {
    logger.debug('Creating backup (browser)', { doc_id: path });

    try {
      const db = await this.getDatabase();

      // Read existing document
      const transaction = db.transaction([STORE_DOCUMENTS], 'readonly');
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.get(path);

      return new Promise<string>((resolve, reject) => {
        request.onsuccess = () => {
          const stored = request.result as StoredDocument | undefined;

          if (!stored) {
            logger.warn('Document not found for backup (browser)', { doc_id: path });
            reject(new Error(`Source document does not exist: ${path}`));
            return;
          }

          // Create backup entry
          const backup: BackupEntry = {
            doc_id: stored.doc_id,
            backup_timestamp: new Date().toISOString(),
            content: stored.content,
          };

          // Write to backups store
          const backupTransaction = db.transaction([STORE_BACKUPS], 'readwrite');
          const backupStore = backupTransaction.objectStore(STORE_BACKUPS);
          const backupRequest = backupStore.add(backup);

          backupRequest.onsuccess = () => {
            logger.info('Backup created successfully (browser)', {
              doc_id: path,
              backup_id: backupRequest.result,
            });
            resolve(path); // Return doc_id as backup reference
          };

          backupRequest.onerror = () => {
            const error = backupRequest.error?.message || 'Unknown error';
            logger.error('Failed to create backup (browser)', { doc_id: path, error });
            reject(new Error(`Failed to create backup of ${path}: ${error}`));
          };
        };

        request.onerror = () => {
          const error = request.error?.message || 'Unknown error';
          logger.error('Failed to read document for backup (browser)', {
            doc_id: path,
            error,
          });
          reject(new Error(`Failed to read document for backup: ${error}`));
        };
      });
    } catch (error) {
      logger.error('Failed to create backup (browser)', {
        doc_id: path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error(
        `Failed to create backup of ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if a document can be written.
   *
   * In browser context, IndexedDB is always writable (no permission issues).
   * This method always returns true but validates the doc_id format.
   *
   * @param path - Document ID to check (treated as doc_id, not filesystem path)
   * @returns Always true (browser storage is always writable)
   */
  async isWritable(path: string): Promise<boolean> {
    logger.debug('Checking path writability (browser)', { doc_id: path });

    try {
      // Validate that we can access the database
      await this.getDatabase();

      logger.debug('Path is writable (browser)', { doc_id: path });
      return true;
    } catch (error) {
      logger.error('Error checking writability (browser)', {
        doc_id: path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

/**
 * Factory function to create a new BrowserDocStore instance.
 *
 * @returns A new BrowserDocStore instance
 *
 * @example
 * ```typescript
 * const store = createBrowserDocStore();
 *
 * // List documents for a project (use project_id as "directory")
 * const docs = await store.list('capture-app');
 *
 * // Read a document (use doc_id as "path")
 * const doc = await store.read('REQ-20251207-capture-app');
 *
 * // Write a document
 * await store.write('REQ-20251207-capture-app', myDoc);
 *
 * // Append an item
 * const clock = { now: () => new Date() };
 * await store.append('REQ-20251207-capture-app', myItem, clock);
 * ```
 */
export function createBrowserDocStore(): DocStore {
  return new BrowserDocStore();
}
