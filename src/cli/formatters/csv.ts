/**
 * CSV Output Formatter
 *
 * Produces RFC 4180 compliant CSV output for spreadsheet compatibility.
 * Handles all domain types with consistent field ordering and escaping.
 *
 * RFC 4180 Compliance:
 * - Fields containing commas, quotes, or newlines are enclosed in double quotes
 * - Double quotes within fields are escaped by doubling them
 * - Each record is terminated with CRLF (though we use LF for simplicity)
 * - First row is the header row
 *
 * Design decisions:
 * - Arrays (like tags) are serialized as semicolon-separated values
 * - Nested objects (like items) are flattened or serialized as JSON
 * - Date fields use ISO 8601 format
 */

import type { RequestLogDoc, RequestLogItem } from '@core/models';
import type { DocMeta } from '@core/ports';
import type {
  SearchMatch,
  FormattableData,
} from './types.js';
import {
  serializeDate,
  isRequestLogDoc,
  isRequestLogDocArray,
  isDocMeta,
  isDocMetaArray,
  isRequestLogItem,
  isRequestLogItemArray,
  isSearchMatch,
  isSearchMatchArray,
  isEmptyArray,
} from './types.js';

/**
 * RFC 4180 CSV field escaping.
 * Encloses field in double quotes if it contains special characters.
 * Escapes internal double quotes by doubling them.
 */
function escapeField(value: string): string {
  // Check if field needs quoting
  const needsQuoting = /[,"\r\n]/.test(value);

  if (!needsQuoting) {
    return value;
  }

  // Escape double quotes by doubling them
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts a value to CSV-safe string.
 */
function toFieldValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return serializeDate(value);
  }

  if (Array.isArray(value)) {
    // Serialize arrays as semicolon-separated values
    return value.map(String).join(';');
  }

  if (typeof value === 'object') {
    // Serialize objects as JSON (rare case, for nested data)
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Creates a CSV row from an array of values.
 */
function createRow(values: unknown[]): string {
  return values.map((v) => escapeField(toFieldValue(v))).join(',');
}

// ============================================================================
// RequestLogItem CSV
// ============================================================================

const ITEM_HEADERS = [
  'id',
  'title',
  'type',
  'domain',
  'context',
  'priority',
  'status',
  'tags',
  'notes',
  'created_at',
] as const;

/**
 * Formats a RequestLogItem as a CSV row (without header).
 */
function itemToRow(item: RequestLogItem): string {
  return createRow([
    item.id,
    item.title,
    item.type,
    item.domain,
    item.context,
    item.priority,
    item.status,
    item.tags,
    item.notes,
    item.created_at,
  ]);
}

/**
 * Formats a single RequestLogItem as CSV with header.
 */
export function formatItemAsCsv(item: RequestLogItem): string {
  return [createRow([...ITEM_HEADERS]), itemToRow(item)].join('\n');
}

/**
 * Formats an array of RequestLogItems as CSV.
 */
export function formatItemsAsCsv(items: RequestLogItem[]): string {
  if (items.length === 0) {
    return createRow([...ITEM_HEADERS]);
  }
  const rows = items.map(itemToRow);
  return [createRow([...ITEM_HEADERS]), ...rows].join('\n');
}

// ============================================================================
// DocMeta CSV
// ============================================================================

const DOC_META_HEADERS = ['path', 'doc_id', 'title', 'item_count', 'updated_at'] as const;

/**
 * Formats a DocMeta as a CSV row (without header).
 */
function docMetaToRow(meta: DocMeta): string {
  return createRow([
    meta.path,
    meta.doc_id,
    meta.title,
    meta.item_count,
    meta.updated_at,
  ]);
}

/**
 * Formats a single DocMeta as CSV with header.
 */
export function formatDocMetaAsCsv(meta: DocMeta): string {
  return [createRow([...DOC_META_HEADERS]), docMetaToRow(meta)].join('\n');
}

/**
 * Formats an array of DocMetas as CSV.
 */
export function formatDocMetasAsCsv(metas: DocMeta[]): string {
  if (metas.length === 0) {
    return createRow([...DOC_META_HEADERS]);
  }
  const rows = metas.map(docMetaToRow);
  return [createRow([...DOC_META_HEADERS]), ...rows].join('\n');
}

// ============================================================================
// RequestLogDoc CSV
// ============================================================================

const DOC_HEADERS = [
  'doc_id',
  'title',
  'project_id',
  'item_count',
  'tags',
  'created_at',
  'updated_at',
] as const;

/**
 * Formats a RequestLogDoc as a CSV row (without header).
 * Note: Does not include items; use formatItemsAsCsv for item data.
 */
function docToRow(doc: RequestLogDoc): string {
  return createRow([
    doc.doc_id,
    doc.title,
    doc.project_id,
    doc.item_count,
    doc.tags,
    doc.created_at,
    doc.updated_at,
  ]);
}

/**
 * Formats a single RequestLogDoc as CSV with header.
 * Includes document metadata only; items are not included.
 * For a document with items, format items separately.
 */
export function formatDocAsCsv(doc: RequestLogDoc): string {
  return [createRow([...DOC_HEADERS]), docToRow(doc)].join('\n');
}

/**
 * Formats an array of RequestLogDocs as CSV.
 */
export function formatDocsAsCsv(docs: RequestLogDoc[]): string {
  if (docs.length === 0) {
    return createRow([...DOC_HEADERS]);
  }
  const rows = docs.map(docToRow);
  return [createRow([...DOC_HEADERS]), ...rows].join('\n');
}

// ============================================================================
// SearchMatch CSV
// ============================================================================

const SEARCH_MATCH_HEADERS = [
  'doc_id',
  'doc_path',
  'item_id',
  'item_title',
  'item_type',
  'matched_fields',
  'match_text',
] as const;

/**
 * Formats a SearchMatch as a CSV row (without header).
 */
function searchMatchToRow(match: SearchMatch): string {
  const matchedFieldNames = match.matched_fields.map((f) => f.field).join(';');
  const matchTexts = match.matched_fields.map((f) => f.match_text).join(';');

  return createRow([
    match.doc_id,
    match.doc_path,
    match.item.id,
    match.item.title,
    match.item.type,
    matchedFieldNames,
    matchTexts,
  ]);
}

/**
 * Formats a single SearchMatch as CSV with header.
 */
export function formatSearchMatchAsCsv(match: SearchMatch): string {
  return [createRow([...SEARCH_MATCH_HEADERS]), searchMatchToRow(match)].join('\n');
}

/**
 * Formats an array of SearchMatches as CSV.
 */
export function formatSearchMatchesAsCsv(matches: SearchMatch[]): string {
  if (matches.length === 0) {
    return createRow([...SEARCH_MATCH_HEADERS]);
  }
  const rows = matches.map(searchMatchToRow);
  return [createRow([...SEARCH_MATCH_HEADERS]), ...rows].join('\n');
}

// ============================================================================
// Generic Formatter
// ============================================================================

/**
 * Generic CSV formatter that handles all formattable data types.
 * Detects the data type and delegates to the appropriate formatter.
 *
 * @param data - Any formattable data type
 * @returns RFC 4180 compliant CSV string
 */
export function formatAsCsv<T extends FormattableData>(data: T): string {
  // Handle empty arrays
  if (isEmptyArray(data)) {
    return '';
  }

  // Handle arrays first (before single item checks)
  if (isSearchMatchArray(data)) {
    return formatSearchMatchesAsCsv(data);
  }

  if (isRequestLogDocArray(data)) {
    return formatDocsAsCsv(data);
  }

  if (isDocMetaArray(data)) {
    return formatDocMetasAsCsv(data);
  }

  if (isRequestLogItemArray(data)) {
    return formatItemsAsCsv(data);
  }

  // Handle single items
  if (isSearchMatch(data)) {
    return formatSearchMatchAsCsv(data);
  }

  if (isRequestLogDoc(data)) {
    return formatDocAsCsv(data);
  }

  if (isDocMeta(data)) {
    return formatDocMetaAsCsv(data);
  }

  if (isRequestLogItem(data)) {
    return formatItemAsCsv(data);
  }

  // Fallback: attempt generic CSV serialization
  throw new Error(`Unsupported data type for CSV formatting: ${typeof data}`);
}
