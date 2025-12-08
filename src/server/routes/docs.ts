/**
 * DocStore REST API Routes
 *
 * HTTP endpoints for request-log document operations.
 * Wraps the FsDocStore adapter with HTTP layer and validation.
 *
 * Endpoints:
 * - GET    /api/docs?directory={path}              - List documents in directory
 * - GET    /api/docs/:doc_id?path={path}           - Read document
 * - POST   /api/docs/:doc_id?path={path}           - Write document
 * - PATCH  /api/docs/:doc_id/items?path={path}     - Append item to document
 * - POST   /api/docs/:doc_id/backup?path={path}    - Create backup
 * - HEAD   /api/docs/:doc_id?path={path}           - Check writability
 *
 * All endpoints:
 * - Use validation middleware for request parameters
 * - Serialize Date objects to ISO strings in responses
 * - Return appropriate HTTP status codes (200, 400, 404, 500)
 * - Include error handling via withErrorHandling wrapper
 * - Log operations for debugging and monitoring
 */

import type { DocStore, Clock, DocMeta } from '@core/ports';
import type { RequestLogDoc } from '@core/models';
import { withErrorHandling, NotFoundError } from '../middleware/error-handler.js';
import { parseJsonBody, extractQueryParam, extractPathParam } from '../middleware/validation.js';
import {
  validateDocWriteBody,
  validateItemDraftBody,
  validateDirectoryParam,
  validatePathParam,
} from '../schemas/docs.js';
import { logger } from '@core/logging';

/**
 * Serializes a RequestLogDoc for JSON response.
 *
 * Converts Date objects to ISO 8601 strings for JSON compatibility.
 * This ensures dates are properly transmitted over HTTP and can be
 * parsed by clients across different platforms.
 *
 * @param doc - Document to serialize
 * @returns Serialized document with ISO date strings
 */
function serializeDoc(doc: RequestLogDoc): object {
  return {
    ...doc,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
    items: doc.items.map((item) => ({
      ...item,
      created_at: item.created_at.toISOString(),
    })),
  };
}

/**
 * Serializes DocMeta array for JSON response.
 *
 * Converts Date objects to ISO 8601 strings in metadata.
 *
 * @param docs - Array of document metadata to serialize
 * @returns Serialized metadata array with ISO date strings
 */
function serializeDocMetas(docs: DocMeta[]): object[] {
  return docs.map((meta) => ({
    ...meta,
    updated_at: meta.updated_at.toISOString(),
  }));
}

/**
 * Creates a router object with all DocStore route handlers.
 *
 * Each handler is a self-contained async function that:
 * 1. Parses and validates the request
 * 2. Calls the appropriate DocStore method
 * 3. Serializes the response (if needed)
 * 4. Returns a Response object
 *
 * All handlers use withErrorHandling for consistent error responses.
 *
 * @param docStore - DocStore implementation (typically FsDocStore)
 * @param clock - Clock for timestamp generation
 * @returns Object containing all route handler functions
 *
 * @example
 * ```typescript
 * const docStore = createFsDocStore();
 * const clock = realClock;
 * const router = createDocsRouter(docStore, clock);
 *
 * // In server fetch handler
 * if (path === '/api/docs' && method === 'GET') {
 *   return router.list(req);
 * }
 * ```
 */
export function createDocsRouter(docStore: DocStore, clock: Clock) {
  return {
    /**
     * GET /api/docs?directory={path}
     *
     * Lists all request-log documents in a directory.
     *
     * Query Parameters:
     * - directory: Absolute path to directory to scan (required)
     *
     * Response:
     * - 200: Array of DocMeta objects (path, doc_id, title, item_count, updated_at)
     * - 400: Missing or invalid directory parameter
     * - 500: Directory read error
     *
     * @param req - HTTP request
     * @returns Response with document metadata array
     */
    list: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const url = new URL(req.url);
          const directory = extractQueryParam(url, 'directory', true);
          const validatedDirectory = validateDirectoryParam(directory);

          logger.debug('DocStore route: list', { directory: validatedDirectory });

          const docs = await docStore.list(validatedDirectory);
          const serialized = serializeDocMetas(docs);

          return Response.json(serialized);
        },
        { method: 'GET', path: '/api/docs' }
      );
    },

    /**
     * GET /api/docs/:doc_id?path={filepath}
     *
     * Reads and returns a complete request-log document.
     *
     * Path Parameters:
     * - doc_id: Document identifier (e.g., 'REQ-20251208-myproject')
     *
     * Query Parameters:
     * - path: Absolute file path to the document (required)
     *
     * Response:
     * - 200: Complete RequestLogDoc with all items
     * - 400: Missing or invalid path parameter
     * - 404: Document not found at path
     * - 500: File read or parse error
     *
     * @param req - HTTP request
     * @returns Response with serialized document
     */
    read: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const url = new URL(req.url);

          // Extract doc_id from path (for logging/validation)
          const docId = extractPathParam(url.pathname, /^\/api\/docs\/([^/?]+)$/, 1);

          // Extract file path from query parameter
          const filePath = extractQueryParam(url, 'path', true);
          const validatedPath = validatePathParam(filePath);

          logger.debug('DocStore route: read', {
            doc_id: docId,
            path: validatedPath,
          });

          // Attempt to read document
          try {
            const doc = await docStore.read(validatedPath);
            const serialized = serializeDoc(doc);

            return Response.json(serialized);
          } catch (error) {
            // Convert read errors to NotFoundError for 404 response
            if (error instanceof Error && error.message.includes('not found')) {
              throw new NotFoundError(`Document not found: ${validatedPath}`);
            }
            throw error;
          }
        },
        { method: 'GET', path: req.url }
      );
    },

    /**
     * POST /api/docs/:doc_id?path={filepath}
     *
     * Writes a complete request-log document to the filesystem.
     * Creates backup if file already exists.
     *
     * Path Parameters:
     * - doc_id: Document identifier (must match body.doc_id)
     *
     * Query Parameters:
     * - path: Absolute file path to write (required)
     *
     * Request Body:
     * - Complete RequestLogDoc object (validated via validateDocWriteBody)
     *
     * Response:
     * - 200: {success: true, doc_id: string, path: string}
     * - 400: Invalid request body or path
     * - 403: Path not writable (permission denied)
     * - 500: Write error
     *
     * @param req - HTTP request with JSON body
     * @returns Response with success indicator
     */
    write: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const url = new URL(req.url);

          // Extract doc_id from path
          const docIdFromPath = extractPathParam(url.pathname, /^\/api\/docs\/([^/?]+)$/, 1);

          // Extract file path from query parameter
          const filePath = extractQueryParam(url, 'path', true);
          const validatedPath = validatePathParam(filePath);

          // Parse and validate request body
          const doc = await parseJsonBody(req, validateDocWriteBody);

          // Ensure doc_id in URL matches doc_id in body
          if (docIdFromPath && doc.doc_id !== docIdFromPath) {
            throw new Error(
              `doc_id mismatch: URL has '${docIdFromPath}' but body has '${doc.doc_id}'`
            );
          }

          logger.debug('DocStore route: write', {
            doc_id: doc.doc_id,
            path: validatedPath,
            item_count: doc.item_count,
          });

          // Write document (includes automatic backup)
          await docStore.write(validatedPath, doc);

          return Response.json({
            success: true,
            doc_id: doc.doc_id,
            path: validatedPath,
          });
        },
        { method: 'POST', path: req.url }
      );
    },

    /**
     * PATCH /api/docs/:doc_id/items?path={filepath}
     *
     * Appends a new item to an existing document.
     * Automatically generates item ID, updates metadata, and creates backup.
     *
     * Path Parameters:
     * - doc_id: Document identifier (for validation)
     *
     * Query Parameters:
     * - path: Absolute file path to the document (required)
     *
     * Request Body:
     * - ItemDraft object (validated via validateItemDraftBody)
     *
     * Response:
     * - 200: Updated RequestLogDoc with new item included
     * - 400: Invalid request body or path
     * - 404: Document not found at path
     * - 500: Append or write error
     *
     * @param req - HTTP request with JSON body
     * @returns Response with updated document
     */
    appendItem: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const url = new URL(req.url);

          // Extract doc_id from path
          const docId = extractPathParam(url.pathname, /^\/api\/docs\/([^/?]+)\/items$/, 1);

          // Extract file path from query parameter
          const filePath = extractQueryParam(url, 'path', true);
          const validatedPath = validatePathParam(filePath);

          // Parse and validate request body
          const item = await parseJsonBody(req, validateItemDraftBody);

          logger.debug('DocStore route: appendItem', {
            doc_id: docId,
            path: validatedPath,
            item_type: item.type,
            item_title: item.title,
          });

          // Append item to document
          try {
            const updatedDoc = await docStore.append(validatedPath, item, clock);
            const serialized = serializeDoc(updatedDoc);

            return Response.json(serialized);
          } catch (error) {
            // Convert append errors to NotFoundError for 404 response
            if (error instanceof Error && error.message.includes('not found')) {
              throw new NotFoundError(`Document not found: ${validatedPath}`);
            }
            throw error;
          }
        },
        { method: 'PATCH', path: req.url }
      );
    },

    /**
     * POST /api/docs/:doc_id/backup?path={filepath}
     *
     * Creates a backup copy of a document file.
     * Backup is created as {filepath}.bak (overwrites existing backup).
     *
     * Path Parameters:
     * - doc_id: Document identifier (for logging)
     *
     * Query Parameters:
     * - path: Absolute file path to backup (required)
     *
     * Response:
     * - 200: {success: true, backup_path: string}
     * - 400: Missing or invalid path parameter
     * - 404: Document not found at path
     * - 500: Backup creation error
     *
     * @param req - HTTP request
     * @returns Response with backup path
     */
    backup: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const url = new URL(req.url);

          // Extract doc_id from path
          const docId = extractPathParam(url.pathname, /^\/api\/docs\/([^/?]+)\/backup$/, 1);

          // Extract file path from query parameter
          const filePath = extractQueryParam(url, 'path', true);
          const validatedPath = validatePathParam(filePath);

          logger.debug('DocStore route: backup', {
            doc_id: docId,
            path: validatedPath,
          });

          // Create backup
          try {
            const backupPath = await docStore.backup(validatedPath);

            return Response.json({
              success: true,
              backup_path: backupPath,
            });
          } catch (error) {
            // Convert backup errors to appropriate HTTP errors
            if (error instanceof Error && error.message.includes('not found')) {
              throw new NotFoundError(`Document not found: ${validatedPath}`);
            }
            throw error;
          }
        },
        { method: 'POST', path: req.url }
      );
    },

    /**
     * HEAD /api/docs/:doc_id?path={filepath}
     *
     * Checks if a document path is writable.
     * Useful for pre-flight checks before write operations.
     *
     * Path Parameters:
     * - doc_id: Document identifier (for logging)
     *
     * Query Parameters:
     * - path: Absolute file path to check (required)
     *
     * Response:
     * - 200: Path is writable
     * - 400: Missing or invalid path parameter
     * - 403: Path is not writable (permission denied)
     *
     * @param req - HTTP request
     * @returns Response with no body (HEAD request)
     */
    checkWritable: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const url = new URL(req.url);

          // Extract doc_id from path
          const docId = extractPathParam(url.pathname, /^\/api\/docs\/([^/?]+)$/, 1);

          // Extract file path from query parameter
          const filePath = extractQueryParam(url, 'path', true);
          const validatedPath = validatePathParam(filePath);

          logger.debug('DocStore route: checkWritable', {
            doc_id: docId,
            path: validatedPath,
          });

          // Check writability
          const isWritable = await docStore.isWritable(validatedPath);

          if (!isWritable) {
            return new Response(null, {
              status: 403,
              statusText: 'Forbidden - Path not writable',
            });
          }

          return new Response(null, {
            status: 200,
            statusText: 'OK - Path is writable',
          });
        },
        { method: 'HEAD', path: req.url }
      );
    },
  };
}
