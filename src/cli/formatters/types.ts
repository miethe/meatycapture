/**
 * CLI Output Formatter Type Definitions
 *
 * Provides type-safe interfaces for formatting CLI output in multiple formats.
 * Supports human-readable, JSON, CSV, YAML, and table output modes.
 *
 * Design rationale:
 * - OutputFormat union ensures exhaustive handling in switch statements
 * - FormatOptions centralizes formatting configuration
 * - Formatter interface enables consistent formatter implementations
 * - SearchResult extends items with match context for search commands
 */

import type { RequestLogDoc, RequestLogItem } from '@core/models';
import type { DocMeta } from '@core/ports';

/**
 * Supported output format types.
 * Each format serves different consumption patterns:
 * - human: Terminal display with colors and formatting
 * - json: Machine-parseable, structured data for piping
 * - csv: Spreadsheet-compatible tabular data
 * - yaml: Human-readable structured data, CI/CD friendly
 * - table: ASCII-formatted tables for terminal display
 */
export type OutputFormat = 'human' | 'json' | 'csv' | 'yaml' | 'table';

/**
 * Configuration options for output formatting.
 */
export interface FormatOptions {
  /** Output format to use */
  format: OutputFormat;
  /** Suppress non-error output (only errors go to stderr) */
  quiet?: boolean;
  /** Enable/disable ANSI colors (default: auto-detect TTY) */
  color?: boolean;
}

/**
 * Search result with match location context.
 * Extends RequestLogItem with metadata about where the match occurred.
 */
export interface SearchMatch {
  /** The matched item */
  item: RequestLogItem;
  /** Document ID containing the match */
  doc_id: string;
  /** File path to the document */
  doc_path: string;
  /** Fields that matched the search query */
  matched_fields: MatchedField[];
}

/**
 * Describes a field match within an item.
 */
export interface MatchedField {
  /** Field name (e.g., 'title', 'notes', 'tags') */
  field: string;
  /** Character offset where match starts (for highlighting) */
  start?: number;
  /** Character offset where match ends */
  end?: number;
  /** Matched substring or tag value */
  match_text: string;
}

/**
 * Union of all formattable data types.
 * Enables type-safe formatting dispatch.
 */
export type FormattableData =
  | RequestLogDoc
  | RequestLogDoc[]
  | DocMeta
  | DocMeta[]
  | RequestLogItem
  | RequestLogItem[]
  | SearchMatch
  | SearchMatch[];

/**
 * Generic formatter interface.
 * Each output format implements this to provide consistent API.
 */
export interface Formatter<T> {
  /**
   * Format data as string for output.
   * @param data - Data to format
   * @param options - Formatting options
   * @returns Formatted string
   */
  format(data: T, options?: Partial<FormatOptions>): string;
}

/**
 * Date serialization format.
 * All dates are serialized as ISO 8601 strings for consistency.
 */
export const DATE_FORMAT = 'ISO8601' as const;

/**
 * Converts Date objects to ISO 8601 strings.
 * Used across all formatters for consistent date handling.
 */
export function serializeDate(date: Date): string {
  return date.toISOString();
}

/**
 * Type guard for RequestLogDoc.
 */
export function isRequestLogDoc(data: unknown): data is RequestLogDoc {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<RequestLogDoc>;
  return (
    typeof d.doc_id === 'string' &&
    typeof d.title === 'string' &&
    Array.isArray(d.items)
  );
}

/**
 * Type guard for RequestLogDoc array.
 */
export function isRequestLogDocArray(data: unknown): data is RequestLogDoc[] {
  return Array.isArray(data) && data.length > 0 && isRequestLogDoc(data[0]);
}

/**
 * Type guard for DocMeta.
 */
export function isDocMeta(data: unknown): data is DocMeta {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<DocMeta>;
  return (
    typeof d.path === 'string' &&
    typeof d.doc_id === 'string' &&
    typeof d.title === 'string' &&
    typeof d.item_count === 'number'
  );
}

/**
 * Type guard for DocMeta array.
 */
export function isDocMetaArray(data: unknown): data is DocMeta[] {
  return Array.isArray(data) && data.length > 0 && isDocMeta(data[0]);
}

/**
 * Type guard for RequestLogItem.
 */
export function isRequestLogItem(data: unknown): data is RequestLogItem {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<RequestLogItem>;
  return (
    typeof d.id === 'string' &&
    typeof d.title === 'string' &&
    typeof d.type === 'string' &&
    Array.isArray(d.tags)
  );
}

/**
 * Type guard for RequestLogItem array.
 */
export function isRequestLogItemArray(data: unknown): data is RequestLogItem[] {
  return Array.isArray(data) && data.length > 0 && isRequestLogItem(data[0]);
}

/**
 * Type guard for SearchMatch.
 */
export function isSearchMatch(data: unknown): data is SearchMatch {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<SearchMatch>;
  return (
    isRequestLogItem(d.item) &&
    typeof d.doc_id === 'string' &&
    typeof d.doc_path === 'string' &&
    Array.isArray(d.matched_fields)
  );
}

/**
 * Type guard for SearchMatch array.
 */
export function isSearchMatchArray(data: unknown): data is SearchMatch[] {
  return Array.isArray(data) && data.length > 0 && isSearchMatch(data[0]);
}

/**
 * Type guard for empty array.
 */
export function isEmptyArray(data: unknown): data is [] {
  return Array.isArray(data) && data.length === 0;
}
