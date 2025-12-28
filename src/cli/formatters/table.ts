/**
 * ASCII Table Output Formatter
 *
 * Produces ASCII-formatted tables for terminal display using cli-table3.
 * Optimized for readability in terminal environments.
 *
 * Design:
 * - Uses cli-table3 for consistent table rendering
 * - Truncates long values to fit terminal width
 * - Provides column headers for all data types
 * - Handles both single items and arrays
 */

import Table from 'cli-table3';
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
 * Maximum width for text columns before truncation.
 */
const MAX_COL_WIDTH = 40;

/**
 * Truncates a string if it exceeds the maximum width.
 */
function truncate(value: string, maxWidth: number = MAX_COL_WIDTH): string {
  if (value.length <= maxWidth) {
    return value;
  }
  return value.slice(0, maxWidth - 3) + '...';
}

/**
 * Formats a date for table display.
 * Uses shorter format than full ISO 8601 for readability.
 */
function formatDate(date: Date): string {
  return serializeDate(date).replace('T', ' ').slice(0, 19);
}

/**
 * Formats tags array for table display.
 */
function formatTags(tags: string[]): string {
  const joined = tags.join(', ');
  return truncate(joined, 30);
}

// ============================================================================
// RequestLogItem Table
// ============================================================================

/**
 * Formats a single RequestLogItem as an ASCII table.
 */
export function formatItemAsTable(item: RequestLogItem): string {
  const table = new Table({
    head: ['Field', 'Value'],
    colWidths: [15, 60],
  });

  table.push(
    ['ID', item.id],
    ['Title', truncate(item.title)],
    ['Type', item.type],
    ['Domain', item.domain],
    ['Context', truncate(item.context)],
    ['Priority', item.priority],
    ['Status', item.status],
    ['Tags', formatTags(item.tags)],
    ['Notes', truncate(item.notes, 55)],
    ['Created', formatDate(item.created_at)]
  );

  return table.toString();
}

/**
 * Formats an array of RequestLogItems as an ASCII table.
 */
export function formatItemsAsTable(items: RequestLogItem[]): string {
  if (items.length === 0) {
    return 'No items found.';
  }

  const table = new Table({
    head: ['ID', 'Title', 'Type', 'Priority', 'Status', 'Tags', 'Created'],
    colWidths: [30, 30, 15, 10, 12, 20, 22],
    wordWrap: true,
  });

  for (const item of items) {
    table.push([
      item.id,
      truncate(item.title, 27),
      item.type,
      item.priority,
      item.status,
      formatTags(item.tags),
      formatDate(item.created_at),
    ]);
  }

  return table.toString();
}

// ============================================================================
// DocMeta Table
// ============================================================================

/**
 * Formats a single DocMeta as an ASCII table.
 */
export function formatDocMetaAsTable(meta: DocMeta): string {
  const table = new Table({
    head: ['Field', 'Value'],
    colWidths: [15, 60],
  });

  table.push(
    ['Doc ID', meta.doc_id],
    ['Title', truncate(meta.title)],
    ['Path', truncate(meta.path, 55)],
    ['Items', String(meta.item_count)],
    ['Updated', formatDate(meta.updated_at)]
  );

  return table.toString();
}

/**
 * Formats an array of DocMetas as an ASCII table.
 */
export function formatDocMetasAsTable(metas: DocMeta[]): string {
  if (metas.length === 0) {
    return 'No documents found.';
  }

  const table = new Table({
    head: ['Doc ID', 'Title', 'Items', 'Updated', 'Path'],
    colWidths: [30, 25, 8, 22, 40],
    wordWrap: true,
  });

  for (const meta of metas) {
    table.push([
      meta.doc_id,
      truncate(meta.title, 22),
      String(meta.item_count),
      formatDate(meta.updated_at),
      truncate(meta.path, 37),
    ]);
  }

  return table.toString();
}

// ============================================================================
// RequestLogDoc Table
// ============================================================================

/**
 * Formats a single RequestLogDoc as an ASCII table.
 * Shows document metadata followed by items table.
 */
export function formatDocAsTable(doc: RequestLogDoc): string {
  // Document metadata table
  const metaTable = new Table({
    head: ['Field', 'Value'],
    colWidths: [15, 60],
  });

  metaTable.push(
    ['Doc ID', doc.doc_id],
    ['Title', truncate(doc.title)],
    ['Project', doc.project_id],
    ['Items', String(doc.item_count)],
    ['Tags', formatTags(doc.tags)],
    ['Created', formatDate(doc.created_at)],
    ['Updated', formatDate(doc.updated_at)]
  );

  const output = [metaTable.toString()];

  // Add items table if there are items
  if (doc.items.length > 0) {
    output.push('');
    output.push('Items:');
    output.push(formatItemsAsTable(doc.items));
  }

  return output.join('\n');
}

/**
 * Formats an array of RequestLogDocs as an ASCII table.
 * Shows summary view without items.
 */
export function formatDocsAsTable(docs: RequestLogDoc[]): string {
  if (docs.length === 0) {
    return 'No documents found.';
  }

  const table = new Table({
    head: ['Doc ID', 'Title', 'Project', 'Items', 'Tags', 'Updated'],
    colWidths: [30, 20, 15, 8, 25, 22],
    wordWrap: true,
  });

  for (const doc of docs) {
    table.push([
      doc.doc_id,
      truncate(doc.title, 17),
      truncate(doc.project_id, 12),
      String(doc.item_count),
      formatTags(doc.tags),
      formatDate(doc.updated_at),
    ]);
  }

  return table.toString();
}

// ============================================================================
// SearchMatch Table
// ============================================================================

/**
 * Formats a single SearchMatch as an ASCII table.
 */
export function formatSearchMatchAsTable(match: SearchMatch): string {
  const table = new Table({
    head: ['Field', 'Value'],
    colWidths: [15, 60],
  });

  const matchedFieldNames = match.matched_fields.map((f) => f.field).join(', ');
  const matchTexts = match.matched_fields.map((f) => f.match_text).join(', ');

  table.push(
    ['Doc ID', match.doc_id],
    ['Doc Path', truncate(match.doc_path, 55)],
    ['Item ID', match.item.id],
    ['Item Title', truncate(match.item.title)],
    ['Type', match.item.type],
    ['Priority', match.item.priority],
    ['Status', match.item.status],
    ['Matched In', matchedFieldNames],
    ['Match Text', truncate(matchTexts, 55)]
  );

  return table.toString();
}

/**
 * Formats an array of SearchMatches as an ASCII table.
 */
export function formatSearchMatchesAsTable(matches: SearchMatch[]): string {
  if (matches.length === 0) {
    return 'No matches found.';
  }

  const table = new Table({
    head: ['Item ID', 'Title', 'Type', 'Doc ID', 'Matched Fields', 'Match Text'],
    colWidths: [28, 25, 12, 28, 18, 25],
    wordWrap: true,
  });

  for (const match of matches) {
    const matchedFieldNames = match.matched_fields.map((f) => f.field).join(', ');
    const matchTexts = match.matched_fields.map((f) => f.match_text).join(', ');

    table.push([
      match.item.id,
      truncate(match.item.title, 22),
      match.item.type,
      match.doc_id,
      truncate(matchedFieldNames, 15),
      truncate(matchTexts, 22),
    ]);
  }

  return table.toString();
}

// ============================================================================
// Generic Formatter
// ============================================================================

/**
 * Generic table formatter that handles all formattable data types.
 * Detects the data type and delegates to the appropriate formatter.
 *
 * @param data - Any formattable data type
 * @returns ASCII table string
 */
export function formatAsTable<T extends FormattableData>(data: T): string {
  // Handle empty arrays
  if (isEmptyArray(data)) {
    return 'No data.';
  }

  // Handle arrays first (before single item checks)
  if (isSearchMatchArray(data)) {
    return formatSearchMatchesAsTable(data);
  }

  if (isRequestLogDocArray(data)) {
    return formatDocsAsTable(data);
  }

  if (isDocMetaArray(data)) {
    return formatDocMetasAsTable(data);
  }

  if (isRequestLogItemArray(data)) {
    return formatItemsAsTable(data);
  }

  // Handle single items
  if (isSearchMatch(data)) {
    return formatSearchMatchAsTable(data);
  }

  if (isRequestLogDoc(data)) {
    return formatDocAsTable(data);
  }

  if (isDocMeta(data)) {
    return formatDocMetaAsTable(data);
  }

  if (isRequestLogItem(data)) {
    return formatItemAsTable(data);
  }

  // Fallback
  throw new Error(`Unsupported data type for table formatting: ${typeof data}`);
}
