/**
 * DocStore Endpoint Schema Validators
 *
 * Request validation schemas for request-log document operations.
 * Validates request bodies for document write and item append operations.
 *
 * Endpoints covered:
 * - POST /api/docs (write complete document)
 * - POST /api/docs/:doc_id/items (append item to document)
 * - GET /api/docs (list documents - query param validation)
 * - GET /api/docs/:doc_id (read document - path param validation)
 *
 * All validators throw ValidationError with field-level details on failure.
 */

import type { RequestLogDoc, ItemDraft, RequestLogItem, ItemIndexEntry } from '@core/models';
import {
  validateString,
  validateStringArray,
  validateNumber,
  validateObject,
} from '../middleware/validation.js';
import { ValidationError } from '../middleware/error-handler.js';

/**
 * Validates a RequestLogItem object from request body.
 *
 * Ensures all required fields are present and valid:
 * - id: non-empty string
 * - title: non-empty string
 * - type, priority, status: non-empty strings
 * - domain, context: string (may be empty)
 * - tags: array of strings
 * - notes: string (may be empty)
 * - created_at: valid Date or ISO string
 *
 * @param obj - Raw object to validate
 * @returns Validated RequestLogItem with Date object
 * @throws ValidationError if validation fails
 */
function validateRequestLogItem(obj: unknown): RequestLogItem {
  const item = validateObject(obj, 'item');

  return {
    id: validateString(item.id, 'id'),
    title: validateString(item.title, 'title'),
    type: validateString(item.type, 'type'),
    domain: typeof item.domain === 'string' ? item.domain : '',
    context: typeof item.context === 'string' ? item.context : '',
    priority: validateString(item.priority, 'priority'),
    status: validateString(item.status, 'status'),
    tags: validateStringArray(item.tags, 'tags'),
    notes: typeof item.notes === 'string' ? item.notes : '',
    created_at: validateDate(item.created_at, 'created_at'),
  };
}

/**
 * Validates an ItemIndexEntry object from request body.
 *
 * Ensures required fields for item index:
 * - id: non-empty string
 * - type: non-empty string
 * - title: non-empty string
 *
 * @param obj - Raw object to validate
 * @returns Validated ItemIndexEntry
 * @throws ValidationError if validation fails
 */
function validateItemIndexEntry(obj: unknown): ItemIndexEntry {
  const entry = validateObject(obj, 'index_entry');

  return {
    id: validateString(entry.id, 'id'),
    type: validateString(entry.type, 'type'),
    title: validateString(entry.title, 'title'),
  };
}

/**
 * Validates a Date field from request body.
 *
 * Accepts:
 * - Date objects
 * - ISO 8601 date strings
 * - Unix timestamps (milliseconds)
 *
 * @param value - Value to validate as date
 * @param name - Field name for error messages
 * @returns Validated Date object
 * @throws ValidationError if not a valid date
 */
function validateDate(value: unknown, name: string): Date {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new ValidationError('Validation failed', {
        fields: {
          [name]: 'Invalid date value',
        },
      });
    }
    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Validation failed', {
        fields: {
          [name]: 'Invalid date string',
        },
      });
    }
    return date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Validation failed', {
        fields: {
          [name]: 'Invalid timestamp',
        },
      });
    }
    return date;
  }

  throw new ValidationError('Validation failed', {
    fields: {
      [name]: 'Must be a Date, ISO string, or timestamp',
    },
  });
}

/**
 * Validates a complete RequestLogDoc object for document write operations.
 *
 * Used for POST /api/docs endpoint when creating or overwriting a document.
 * Validates all document fields including nested items and index entries.
 *
 * Required fields:
 * - doc_id: Document identifier (e.g., 'REQ-20251208-myproject')
 * - title: Document title
 * - project_id: Associated project ID
 * - items: Array of RequestLogItem objects
 * - items_index: Array of ItemIndexEntry objects
 * - tags: Array of unique tags (aggregated from items)
 * - item_count: Total item count
 * - created_at, updated_at: Timestamps
 *
 * @param body - Raw request body
 * @returns Validated RequestLogDoc with proper types
 * @throws ValidationError if validation fails on any field
 *
 * @example
 * ```typescript
 * const doc = await parseJsonBody(req, validateDocWriteBody);
 * // doc is fully validated RequestLogDoc
 * ```
 */
export function validateDocWriteBody(body: unknown): RequestLogDoc {
  const obj = validateObject(body, 'body');

  // Validate items array
  if (!Array.isArray(obj.items)) {
    throw new ValidationError('Validation failed', {
      fields: {
        items: 'Must be an array',
      },
    });
  }
  const items = obj.items.map((item, idx) => {
    try {
      return validateRequestLogItem(item);
    } catch (error) {
      throw new ValidationError('Validation failed', {
        fields: {
          [`items[${idx}]`]: error instanceof Error ? error.message : 'Invalid item',
        },
      });
    }
  });

  // Validate items_index array
  if (!Array.isArray(obj.items_index)) {
    throw new ValidationError('Validation failed', {
      fields: {
        items_index: 'Must be an array',
      },
    });
  }
  const items_index = obj.items_index.map((entry, idx) => {
    try {
      return validateItemIndexEntry(entry);
    } catch (error) {
      throw new ValidationError('Validation failed', {
        fields: {
          [`items_index[${idx}]`]: error instanceof Error ? error.message : 'Invalid entry',
        },
      });
    }
  });

  return {
    doc_id: validateString(obj.doc_id, 'doc_id'),
    title: validateString(obj.title, 'title'),
    project_id: validateString(obj.project_id, 'project_id'),
    items,
    items_index,
    tags: validateStringArray(obj.tags, 'tags'),
    item_count: validateNumber(obj.item_count, 'item_count'),
    created_at: validateDate(obj.created_at, 'created_at'),
    updated_at: validateDate(obj.updated_at, 'updated_at'),
  };
}

/**
 * Validates an ItemDraft object for item append operations.
 *
 * Used for POST /api/docs/:doc_id/items endpoint when appending a new item.
 * ItemDraft is the form data structure before persistence (no ID or timestamp).
 *
 * Required fields:
 * - title: Item title/summary
 * - type: Item type (enhancement, bug, etc.)
 * - priority: Priority level (low, medium, high, critical)
 * - status: Current status (triage, backlog, etc.)
 * - tags: Array of tag strings
 *
 * Optional fields (may be empty):
 * - domain: Domain/area (web, api, etc.)
 * - context: Additional context
 * - notes: Freeform notes/description
 *
 * @param body - Raw request body
 * @returns Validated ItemDraft
 * @throws ValidationError if validation fails on any field
 *
 * @example
 * ```typescript
 * const item = await parseJsonBody(req, validateItemDraftBody);
 * // item is fully validated ItemDraft ready for append
 * ```
 */
export function validateItemDraftBody(body: unknown): ItemDraft {
  const obj = validateObject(body, 'body');

  return {
    title: validateString(obj.title, 'title'),
    type: validateString(obj.type, 'type'),
    domain: typeof obj.domain === 'string' ? obj.domain : '',
    context: typeof obj.context === 'string' ? obj.context : '',
    priority: validateString(obj.priority, 'priority'),
    status: validateString(obj.status, 'status'),
    tags: validateStringArray(obj.tags, 'tags'),
    notes: typeof obj.notes === 'string' ? obj.notes : '',
  };
}

/**
 * Validates directory path query parameter for document list operations.
 *
 * Used for GET /api/docs?directory=<path> endpoint.
 * Ensures the directory parameter is a valid, non-empty string.
 *
 * @param directory - Directory path from query parameter
 * @returns Validated directory path
 * @throws ValidationError if directory is missing or invalid
 *
 * @example
 * ```typescript
 * const dir = extractQueryParam(url, 'directory', true);
 * const validatedDir = validateDirectoryParam(dir);
 * ```
 */
export function validateDirectoryParam(directory: string | undefined): string {
  if (!directory) {
    throw new ValidationError('Validation failed', {
      fields: {
        directory: 'Required query parameter',
      },
    });
  }
  return validateString(directory, 'directory');
}

/**
 * Validates file path query parameter for document operations.
 *
 * Used for GET /api/docs/:doc_id, POST /api/docs, etc.
 * Ensures the path parameter is a valid, non-empty string.
 *
 * @param path - File path from query parameter
 * @returns Validated file path
 * @throws ValidationError if path is missing or invalid
 *
 * @example
 * ```typescript
 * const filePath = extractQueryParam(url, 'path', true);
 * const validatedPath = validatePathParam(filePath);
 * ```
 */
export function validatePathParam(path: string | undefined): string {
  if (!path) {
    throw new ValidationError('Validation failed', {
      fields: {
        path: 'Required query parameter',
      },
    });
  }
  return validateString(path, 'path');
}
