/**
 * API-based DocStore Implementation
 *
 * HTTP client adapter that implements the DocStore port interface.
 * Communicates with the MeatyCapture API server for document operations.
 *
 * Architecture:
 * - Implements DocStore port interface from @core/ports
 * - Uses HttpClient for type-safe HTTP communication
 * - Maps file paths to REST API endpoints
 * - Handles date deserialization (via HttpClient)
 * - Maps HTTP errors to domain errors (via HttpClient)
 *
 * Server Endpoints:
 * - GET    /api/docs?directory={path}              → list()
 * - GET    /api/docs/:doc_id?path={path}           → read()
 * - POST   /api/docs/:doc_id?path={path}           → write()
 * - PATCH  /api/docs/:doc_id/items?path={path}     → append()
 * - POST   /api/docs/:doc_id/backup?path={path}    → backup()
 * - HEAD   /api/docs/:doc_id?path={path}           → isWritable()
 *
 * Note: Clock parameter in append() is NOT sent to server.
 * Server uses its own clock for timestamp consistency.
 */

import { HttpClient } from './http-client.js';
import type { DocStore, DocMeta, Clock } from '@core/ports';
import type { RequestLogDoc, ItemDraft } from '@core/models';

/**
 * Extracts doc_id from a file path
 *
 * The server expects doc_id as a path parameter, but DocStore interface
 * uses file paths. This helper extracts a reasonable doc_id from the path.
 *
 * Strategy:
 * - Extract filename from path
 * - Remove .md extension
 * - If empty or invalid, use placeholder 'doc'
 *
 * @param path - File path (e.g., '/path/to/REQ-20251208-project.md')
 * @returns doc_id (e.g., 'REQ-20251208-project') or placeholder 'doc'
 *
 * @example
 * ```typescript
 * extractDocId('/path/to/REQ-20251208-project.md') // 'REQ-20251208-project'
 * extractDocId('/path/to/file.md')                  // 'file'
 * extractDocId('/path/to/')                         // 'doc'
 * ```
 */
function extractDocId(path: string): string {
  // Extract filename from path
  const filename = path.split('/').pop() || '';

  // Remove .md extension
  const docId = filename.replace(/\.md$/, '');

  // Return doc_id or placeholder
  return docId || 'doc';
}

/**
 * API-based DocStore implementation
 *
 * Implements the DocStore port interface using HTTP requests to the
 * MeatyCapture API server. All operations are asynchronous and may throw
 * typed errors (ValidationError, NotFoundError, etc.) from HttpClient.
 *
 * Usage:
 * ```typescript
 * const client = new HttpClient({ baseUrl: 'http://localhost:3737' });
 * const docStore = new ApiDocStore(client);
 *
 * const docs = await docStore.list('/path/to/docs');
 * const doc = await docStore.read('/path/to/docs/REQ-20251208-project.md');
 * ```
 */
export class ApiDocStore implements DocStore {
  private readonly client: HttpClient;

  /**
   * Creates a new API-based DocStore
   *
   * @param client - Configured HttpClient instance
   */
  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * List all request-log documents in a directory
   *
   * Calls: GET /api/docs?directory={path}
   *
   * @param directory - Directory path to scan
   * @returns Array of document metadata (sorted by updated_at desc)
   * @throws ValidationError if directory parameter is invalid
   * @throws StorageError if server fails to read directory
   */
  async list(directory: string): Promise<DocMeta[]> {
    // GET /api/docs?directory={path}
    const docs = await this.client.get<DocMeta[]>('/api/docs', {
      directory,
    });

    return docs;
  }

  /**
   * Read and parse a request-log document
   *
   * Calls: GET /api/docs/:doc_id?path={path}
   *
   * @param path - File path to the document
   * @returns Parsed document with all items
   * @throws NotFoundError if document not found at path
   * @throws ValidationError if path parameter is invalid
   * @throws StorageError if server fails to read or parse document
   */
  async read(path: string): Promise<RequestLogDoc> {
    const docId = extractDocId(path);

    // GET /api/docs/:doc_id?path={path}
    const doc = await this.client.get<RequestLogDoc>(`/api/docs/${docId}`, {
      path,
    });

    return doc;
  }

  /**
   * Write/overwrite a complete request-log document
   *
   * Calls: POST /api/docs/:doc_id?path={path}
   * Server automatically creates backup before write.
   *
   * @param path - File path for the document
   * @param doc - Complete document to write
   * @throws ValidationError if path or doc is invalid
   * @throws PermissionDeniedError if path not writable
   * @throws StorageError if server fails to write document
   */
  async write(path: string, doc: RequestLogDoc): Promise<void> {
    const docId = doc.doc_id;

    // POST /api/docs/:doc_id?path={path}
    // Body: complete document
    await this.client.post<{ success: boolean; doc_id: string; path: string }>(
      `/api/docs/${docId}`,
      { path },
      doc
    );

    // Server returns {success: true, doc_id, path}
    // We ignore response for void return type
  }

  /**
   * Append a new item to an existing document
   *
   * Calls: PATCH /api/docs/:doc_id/items?path={path}
   * Server automatically:
   * - Generates item ID with incremented counter
   * - Updates item_count and items_index
   * - Aggregates tags (unique sorted merge)
   * - Sets updated_at timestamp
   * - Creates backup before modification
   *
   * Note: Clock parameter is NOT sent to server.
   * Server uses its own clock for timestamp consistency.
   *
   * @param path - File path to the document
   * @param item - Item draft to append
   * @param clock - Clock for timestamp generation (NOT used by HTTP adapter)
   * @returns Updated document after append
   * @throws NotFoundError if document not found at path
   * @throws ValidationError if path or item is invalid
   * @throws StorageError if server fails to append or write
   */
  async append(path: string, item: ItemDraft, _clock: Clock): Promise<RequestLogDoc> {
    const docId = extractDocId(path);

    // Note: We intentionally ignore the clock parameter.
    // The server maintains its own clock for timestamp consistency.
    // This prevents clock skew issues between client and server.

    // PATCH /api/docs/:doc_id/items?path={path}
    // Body: item draft
    const updatedDoc = await this.client.patch<RequestLogDoc>(
      `/api/docs/${docId}/items`,
      { path },
      item
    );

    return updatedDoc;
  }

  /**
   * Create a backup copy of a file
   *
   * Calls: POST /api/docs/:doc_id/backup?path={path}
   * Backup filename: {original}.bak (overwrites existing .bak)
   *
   * @param path - File path to backup
   * @returns Path to the backup file
   * @throws NotFoundError if document not found at path
   * @throws ValidationError if path parameter is invalid
   * @throws StorageError if server fails to create backup
   */
  async backup(path: string): Promise<string> {
    const docId = extractDocId(path);

    // POST /api/docs/:doc_id/backup?path={path}
    const response = await this.client.post<{ success: boolean; backup_path: string }>(
      `/api/docs/${docId}/backup`,
      { path }
    );

    return response.backup_path;
  }

  /**
   * Check if a path exists and is writable
   *
   * Calls: HEAD /api/docs/:doc_id?path={path}
   * Returns 200 if writable, 403 if not writable
   *
   * @param path - File path to check
   * @returns true if path is writable, false otherwise
   * @throws ValidationError if path parameter is invalid
   */
  async isWritable(path: string): Promise<boolean> {
    const docId = extractDocId(path);

    // HEAD /api/docs/:doc_id?path={path}
    // HttpClient.head() returns true for 200, false for 403
    const isWritable = await this.client.head(`/api/docs/${docId}`, {
      path,
    });

    return isWritable;
  }
}
