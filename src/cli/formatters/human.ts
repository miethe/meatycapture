/**
 * Human-Readable Output Formatter
 *
 * Produces colored, formatted output for terminal display using chalk.
 * Optimized for human readability with visual hierarchy and highlighting.
 *
 * Design:
 * - Uses chalk for ANSI color support
 * - Respects color option and TTY detection
 * - Provides visual hierarchy with indentation and symbols
 * - Shows contextual information with clear labels
 */

import chalk, { Chalk, type ChalkInstance } from 'chalk';
import type { RequestLogDoc, RequestLogItem } from '@core/models';
import type { DocMeta } from '@core/ports';
import type {
  SearchMatch,
  FormattableData,
  FormatOptions,
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
 * Gets a chalk instance configured for color settings.
 * Respects the color option or auto-detects based on TTY.
 */
function getChalk(options?: Partial<FormatOptions>): ChalkInstance {
  if (options?.color === false) {
    return new Chalk({ level: 0 });
  }
  if (options?.color === true) {
    return new Chalk({ level: 3 });
  }
  // Auto-detect: chalk does this by default
  return chalk;
}

/**
 * Formats a date for human display.
 */
function formatDate(date: Date): string {
  return serializeDate(date).replace('T', ' ').slice(0, 19);
}

/**
 * Gets color for priority level.
 */
function priorityColor(c: ChalkInstance, priority: string): string {
  switch (priority.toLowerCase()) {
    case 'critical':
      return c.red.bold(priority);
    case 'high':
      return c.red(priority);
    case 'medium':
      return c.yellow(priority);
    case 'low':
      return c.green(priority);
    default:
      return c.gray(priority);
  }
}

/**
 * Gets color for status.
 */
function statusColor(c: ChalkInstance, status: string): string {
  switch (status.toLowerCase()) {
    case 'done':
      return c.green(status);
    case 'in-progress':
      return c.blue(status);
    case 'planned':
      return c.cyan(status);
    case 'backlog':
      return c.gray(status);
    case 'triage':
      return c.yellow(status);
    case 'wontfix':
      return c.red.strikethrough(status);
    default:
      return c.gray(status);
  }
}

/**
 * Gets color for item type.
 */
function typeColor(c: ChalkInstance, type: string): string {
  switch (type.toLowerCase()) {
    case 'bug':
      return c.red(type);
    case 'enhancement':
      return c.green(type);
    case 'idea':
      return c.magenta(type);
    case 'task':
      return c.blue(type);
    case 'question':
      return c.cyan(type);
    default:
      return c.gray(type);
  }
}

/**
 * Formats tags with highlighting.
 */
function formatTags(c: ChalkInstance, tags: string[]): string {
  if (tags.length === 0) {
    return c.gray('(none)');
  }
  return tags.map((tag) => c.cyan(`#${tag}`)).join(' ');
}

// ============================================================================
// RequestLogItem Formatters
// ============================================================================

/**
 * Formats a single RequestLogItem for human display.
 */
export function formatItemAsHuman(
  item: RequestLogItem,
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);
  const lines: string[] = [];

  lines.push(c.bold.white(item.title));
  lines.push(c.dim(`ID: ${item.id}`));
  lines.push('');

  const metadata = [
    `${c.dim('Type:')} ${typeColor(c, item.type)}`,
    `${c.dim('Priority:')} ${priorityColor(c, item.priority)}`,
    `${c.dim('Status:')} ${statusColor(c, item.status)}`,
  ].join('  ');
  lines.push(metadata);

  lines.push(`${c.dim('Domain:')} ${c.white(item.domain)}`);
  lines.push(`${c.dim('Context:')} ${c.white(item.context)}`);
  lines.push(`${c.dim('Tags:')} ${formatTags(c, item.tags)}`);
  lines.push(`${c.dim('Created:')} ${c.gray(formatDate(item.created_at))}`);

  if (item.notes) {
    lines.push('');
    lines.push(c.dim('Notes:'));
    lines.push(c.white(item.notes));
  }

  return lines.join('\n');
}

/**
 * Formats an array of RequestLogItems for human display.
 */
export function formatItemsAsHuman(
  items: RequestLogItem[],
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);

  if (items.length === 0) {
    return c.yellow('No items found.');
  }

  const output: string[] = [];
  output.push(c.bold(`Found ${items.length} item(s):`));
  output.push('');

  for (const item of items) {
    output.push(c.dim('─'.repeat(60)));
    output.push(formatItemAsHuman(item, options));
    output.push('');
  }

  return output.join('\n');
}

// ============================================================================
// DocMeta Formatters
// ============================================================================

/**
 * Formats a single DocMeta for human display.
 */
export function formatDocMetaAsHuman(
  meta: DocMeta,
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);
  const lines: string[] = [];

  lines.push(c.bold.white(meta.title));
  lines.push(c.dim(`ID: ${meta.doc_id}`));
  lines.push(`${c.dim('Path:')} ${c.cyan(meta.path)}`);
  lines.push(`${c.dim('Items:')} ${c.yellow(String(meta.item_count))}`);
  lines.push(`${c.dim('Updated:')} ${c.gray(formatDate(meta.updated_at))}`);

  return lines.join('\n');
}

/**
 * Formats an array of DocMetas for human display.
 */
export function formatDocMetasAsHuman(
  metas: DocMeta[],
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);

  if (metas.length === 0) {
    return c.yellow('No documents found.');
  }

  const output: string[] = [];
  output.push(c.bold(`Found ${metas.length} document(s):`));
  output.push('');

  for (const meta of metas) {
    output.push(c.dim('─'.repeat(60)));
    output.push(formatDocMetaAsHuman(meta, options));
    output.push('');
  }

  return output.join('\n');
}

// ============================================================================
// RequestLogDoc Formatters
// ============================================================================

/**
 * Formats a single RequestLogDoc for human display.
 */
export function formatDocAsHuman(
  doc: RequestLogDoc,
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);
  const lines: string[] = [];

  // Header
  lines.push(c.bold.white(doc.title));
  lines.push(c.dim(`ID: ${doc.doc_id}`));
  lines.push('');

  // Metadata
  lines.push(`${c.dim('Project:')} ${c.cyan(doc.project_id)}`);
  lines.push(`${c.dim('Items:')} ${c.yellow(String(doc.item_count))}`);
  lines.push(`${c.dim('Tags:')} ${formatTags(c, doc.tags)}`);
  lines.push(`${c.dim('Created:')} ${c.gray(formatDate(doc.created_at))}`);
  lines.push(`${c.dim('Updated:')} ${c.gray(formatDate(doc.updated_at))}`);

  // Items
  if (doc.items.length > 0) {
    lines.push('');
    lines.push(c.bold('Items:'));

    for (const item of doc.items) {
      lines.push('');
      lines.push(c.dim('─'.repeat(50)));
      lines.push(formatItemAsHuman(item, options));
    }
  }

  return lines.join('\n');
}

/**
 * Formats an array of RequestLogDocs for human display.
 * Shows summary view without items.
 */
export function formatDocsAsHuman(
  docs: RequestLogDoc[],
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);

  if (docs.length === 0) {
    return c.yellow('No documents found.');
  }

  const output: string[] = [];
  output.push(c.bold(`Found ${docs.length} document(s):`));
  output.push('');

  for (const doc of docs) {
    output.push(c.dim('─'.repeat(60)));
    output.push(c.bold.white(doc.title));
    output.push(c.dim(`ID: ${doc.doc_id}`));
    output.push(`${c.dim('Project:')} ${c.cyan(doc.project_id)}`);
    output.push(`${c.dim('Items:')} ${c.yellow(String(doc.item_count))}`);
    output.push(`${c.dim('Tags:')} ${formatTags(c, doc.tags)}`);
    output.push(`${c.dim('Updated:')} ${c.gray(formatDate(doc.updated_at))}`);
    output.push('');
  }

  return output.join('\n');
}

// ============================================================================
// SearchMatch Formatters
// ============================================================================

/**
 * Formats a single SearchMatch for human display.
 */
export function formatSearchMatchAsHuman(
  match: SearchMatch,
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);
  const lines: string[] = [];

  // Item header
  lines.push(c.bold.white(match.item.title));
  lines.push(c.dim(`ID: ${match.item.id}`));
  lines.push(c.dim(`Doc: ${match.doc_id} (${match.doc_path})`));
  lines.push('');

  // Match info
  const matchedFields = match.matched_fields.map((f) => f.field).join(', ');
  lines.push(`${c.dim('Matched in:')} ${c.magenta(matchedFields)}`);

  // Show match text with highlighting
  for (const field of match.matched_fields) {
    lines.push(`  ${c.dim(`${field.field}:`)} ${c.yellow(field.match_text)}`);
  }

  lines.push('');

  // Item metadata
  const metadata = [
    `${c.dim('Type:')} ${typeColor(c, match.item.type)}`,
    `${c.dim('Priority:')} ${priorityColor(c, match.item.priority)}`,
    `${c.dim('Status:')} ${statusColor(c, match.item.status)}`,
  ].join('  ');
  lines.push(metadata);
  lines.push(`${c.dim('Tags:')} ${formatTags(c, match.item.tags)}`);

  return lines.join('\n');
}

/**
 * Formats an array of SearchMatches for human display.
 */
export function formatSearchMatchesAsHuman(
  matches: SearchMatch[],
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);

  if (matches.length === 0) {
    return c.yellow('No matches found.');
  }

  const output: string[] = [];
  output.push(c.bold.green(`Found ${matches.length} match(es):`));
  output.push('');

  for (const match of matches) {
    output.push(c.dim('─'.repeat(60)));
    output.push(formatSearchMatchAsHuman(match, options));
    output.push('');
  }

  return output.join('\n');
}

// ============================================================================
// Generic Formatter
// ============================================================================

/**
 * Generic human formatter that handles all formattable data types.
 * Detects the data type and delegates to the appropriate formatter.
 *
 * @param data - Any formattable data type
 * @param options - Format options (color, quiet)
 * @returns Colored, human-readable string
 */
export function formatAsHuman<T extends FormattableData>(
  data: T,
  options?: Partial<FormatOptions>
): string {
  const c = getChalk(options);

  // Handle empty arrays
  if (isEmptyArray(data)) {
    return c.yellow('No data.');
  }

  // Handle arrays first (before single item checks)
  if (isSearchMatchArray(data)) {
    return formatSearchMatchesAsHuman(data, options);
  }

  if (isRequestLogDocArray(data)) {
    return formatDocsAsHuman(data, options);
  }

  if (isDocMetaArray(data)) {
    return formatDocMetasAsHuman(data, options);
  }

  if (isRequestLogItemArray(data)) {
    return formatItemsAsHuman(data, options);
  }

  // Handle single items
  if (isSearchMatch(data)) {
    return formatSearchMatchAsHuman(data, options);
  }

  if (isRequestLogDoc(data)) {
    return formatDocAsHuman(data, options);
  }

  if (isDocMeta(data)) {
    return formatDocMetaAsHuman(data, options);
  }

  if (isRequestLogItem(data)) {
    return formatItemAsHuman(data, options);
  }

  // Fallback
  throw new Error(`Unsupported data type for human formatting: ${typeof data}`);
}
