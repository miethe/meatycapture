/**
 * JSON Output Formatter
 *
 * Produces valid, parseable JSON output for machine consumption.
 * Handles all domain types with consistent date serialization (ISO 8601).
 *
 * Design:
 * - Uses native JSON.stringify with custom replacer for Date handling
 * - Pretty-prints with 2-space indentation for readability
 * - Preserves all data fields without transformation
 */

import type { RequestLogDoc, RequestLogItem, Project } from '@core/models';
import type { DocMeta } from '@core/ports';
import type { SearchMatch, FormattableData } from './types.js';

/**
 * Custom JSON replacer that converts Date objects to ISO 8601 strings.
 * Ensures consistent date serialization across all output.
 */
function dateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * Formats a single RequestLogDoc as JSON.
 */
export function formatDocAsJson(doc: RequestLogDoc): string {
  return JSON.stringify(doc, dateReplacer, 2);
}

/**
 * Formats an array of RequestLogDocs as JSON.
 */
export function formatDocsAsJson(docs: RequestLogDoc[]): string {
  return JSON.stringify(docs, dateReplacer, 2);
}

/**
 * Formats a single DocMeta as JSON.
 */
export function formatDocMetaAsJson(meta: DocMeta): string {
  return JSON.stringify(meta, dateReplacer, 2);
}

/**
 * Formats an array of DocMeta as JSON.
 */
export function formatDocMetasAsJson(metas: DocMeta[]): string {
  return JSON.stringify(metas, dateReplacer, 2);
}

/**
 * Formats a single RequestLogItem as JSON.
 */
export function formatItemAsJson(item: RequestLogItem): string {
  return JSON.stringify(item, dateReplacer, 2);
}

/**
 * Formats an array of RequestLogItems as JSON.
 */
export function formatItemsAsJson(items: RequestLogItem[]): string {
  return JSON.stringify(items, dateReplacer, 2);
}

/**
 * Formats a single SearchMatch as JSON.
 */
export function formatSearchMatchAsJson(match: SearchMatch): string {
  return JSON.stringify(match, dateReplacer, 2);
}

/**
 * Formats an array of SearchMatches as JSON.
 */
export function formatSearchMatchesAsJson(matches: SearchMatch[]): string {
  return JSON.stringify(matches, dateReplacer, 2);
}

/**
 * Formats a single Project as JSON.
 */
export function formatProjectAsJson(project: Project): string {
  return JSON.stringify(project, dateReplacer, 2);
}

/**
 * Formats an array of Projects as JSON.
 */
export function formatProjectsAsJson(projects: Project[]): string {
  return JSON.stringify(projects, dateReplacer, 2);
}

/**
 * Generic JSON formatter that handles all formattable data types.
 * Produces valid JSON string with ISO 8601 dates and 2-space indentation.
 *
 * @param data - Any formattable data type
 * @returns Pretty-printed JSON string
 */
export function formatAsJson<T extends FormattableData>(data: T): string {
  return JSON.stringify(data, dateReplacer, 2);
}
