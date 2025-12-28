/**
 * Log View Command
 *
 * Displays the complete contents of a request-log document with filtering
 * and multiple output format support. Designed for both human inspection
 * and machine consumption in scripting workflows.
 *
 * Features:
 * - Multiple output formats: JSON, YAML, markdown, human-readable
 * - Item filtering by type, status, or tag (filters combine with AND)
 * - Items-only mode to skip frontmatter/metadata
 * - Quiet mode for scripting (exit codes only)
 *
 * Exit Codes:
 * - 0: Success
 * - 2: File not found or I/O error
 * - 3: Parse error (malformed document)
 */

import type { Command } from 'commander';
import { resolve } from 'node:path';
import { createFsDocStore } from '@adapters/fs-local';
import { serialize } from '@core/serializer';
import type { RequestLogDoc, RequestLogItem } from '@core/models';
import {
  formatOutput,
  formatItemsAsJson,
  formatItemsAsYaml,
  formatItemsAsHuman,
} from '@cli/formatters';
import type { OutputFormat, FormatOptions } from '@cli/formatters';
import {
  FileNotFoundError,
  ParseError,
  handleError,
  isQuietMode,
  setQuietMode,
} from '@cli/handlers/errors';
import { ExitCodes } from '@cli/handlers/exitCodes';

/**
 * Command options for view command.
 *
 * Output format flags are mutually exclusive - if multiple are specified,
 * the last one wins (standard CLI behavior).
 */
export interface ViewOptions {
  /** Output as JSON */
  json?: boolean;
  /** Output as YAML */
  yaml?: boolean;
  /** Output original markdown */
  markdown?: boolean;
  /** Show only items, skip frontmatter/metadata */
  itemsOnly?: boolean;
  /** Filter to items of this type */
  filterType?: string;
  /** Filter to items with this status */
  filterStatus?: string;
  /** Filter to items with this tag */
  filterTag?: string;
  /** Suppress output (useful with exit codes) */
  quiet?: boolean;
}

/**
 * Determines the output format from command options.
 *
 * Priority (if multiple specified): markdown > yaml > json > human
 * This matches typical CLI override patterns where later flags take precedence.
 */
function resolveOutputFormat(options: ViewOptions): OutputFormat | 'markdown' {
  if (options.markdown) return 'markdown';
  if (options.yaml) return 'yaml';
  if (options.json) return 'json';
  return 'human';
}

/**
 * Filters items based on type, status, and tag criteria.
 *
 * All active filters are combined with AND logic:
 * - Item must match ALL specified filters to be included
 * - Unspecified filters are ignored (match any)
 * - Comparisons are case-insensitive for better UX
 *
 * @param items - Source items to filter
 * @param options - Filter criteria from command options
 * @returns Filtered array of items
 */
function filterItems(
  items: RequestLogItem[],
  options: ViewOptions
): RequestLogItem[] {
  return items.filter((item) => {
    // Type filter (case-insensitive)
    if (
      options.filterType &&
      item.type.toLowerCase() !== options.filterType.toLowerCase()
    ) {
      return false;
    }

    // Status filter (case-insensitive)
    if (
      options.filterStatus &&
      item.status.toLowerCase() !== options.filterStatus.toLowerCase()
    ) {
      return false;
    }

    // Tag filter (case-insensitive, must contain the tag)
    if (options.filterTag) {
      const normalizedFilterTag = options.filterTag.toLowerCase();
      const hasTag = item.tags.some(
        (tag) => tag.toLowerCase() === normalizedFilterTag
      );
      if (!hasTag) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Formats items array based on output format.
 *
 * For items-only mode, we format just the items array rather than
 * the full document. Markdown mode serializes items to their markdown
 * representation.
 */
function formatItemsOutput(
  items: RequestLogItem[],
  format: OutputFormat | 'markdown',
  formatOptions: FormatOptions
): string {
  switch (format) {
    case 'json':
      return formatItemsAsJson(items);

    case 'yaml':
      return formatItemsAsYaml(items);

    case 'markdown':
      // Serialize each item to markdown section format
      return items
        .map((item) => {
          const lines = [
            `## ${item.id} - ${item.title}`,
            '',
            `**Type:** ${item.type} | **Domain:** ${item.domain} | **Priority:** ${item.priority} | **Status:** ${item.status}`,
            `**Tags:** ${item.tags.join(', ')}`,
            `**Context:** ${item.context}`,
            '',
            '### Problem/Goal',
            item.notes,
          ];
          return lines.join('\n');
        })
        .join('\n\n---\n\n');

    case 'human':
      return formatItemsAsHuman(items, formatOptions);

    default:
      // Fallback to human-readable
      return formatItemsAsHuman(items, formatOptions);
  }
}

/**
 * Formats a complete document based on output format.
 *
 * For filtered documents, creates a modified version with only
 * the matching items while preserving all metadata.
 */
function formatDocOutput(
  doc: RequestLogDoc,
  format: OutputFormat | 'markdown',
  formatOptions: FormatOptions
): string {
  switch (format) {
    case 'json':
      return formatOutput(doc, { ...formatOptions, format: 'json' });

    case 'yaml':
      return formatOutput(doc, { ...formatOptions, format: 'yaml' });

    case 'markdown':
      // Use the serializer to produce canonical markdown format
      return serialize(doc);

    case 'human':
      return formatOutput(doc, { ...formatOptions, format: 'human' });

    default:
      return formatOutput(doc, { ...formatOptions, format: 'human' });
  }
}

/**
 * Main action handler for the view command.
 *
 * Reads and displays a request-log document with optional filtering.
 * Handles all error cases with appropriate exit codes for scripting.
 *
 * @param docPath - Path to the request-log document
 * @param options - Command options for format and filtering
 */
export async function viewAction(
  docPath: string,
  options: ViewOptions
): Promise<void> {
  // Set quiet mode if requested (affects all output)
  if (options.quiet) {
    setQuietMode(true);
  }

  try {
    const resolvedPath = resolve(docPath);
    const docStore = createFsDocStore();

    // Read the document - may throw on file not found or parse error
    let doc: RequestLogDoc;
    try {
      doc = await docStore.read(resolvedPath);
    } catch (error) {
      // Distinguish between file not found and parse errors
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('ENOENT')) {
          throw new FileNotFoundError(resolvedPath);
        }
        // Parse errors from serializer
        if (
          error.message.includes('Invalid') ||
          error.message.includes('Missing') ||
          error.message.includes('malformed')
        ) {
          throw new ParseError(resolvedPath, error.message);
        }
      }
      throw error;
    }

    // Apply filters to items
    const filteredItems = filterItems(doc.items, options);

    // Determine output format
    const format = resolveOutputFormat(options);
    const formatOptions: FormatOptions = {
      format: format === 'markdown' ? 'human' : format,
      ...(options.quiet !== undefined && { quiet: options.quiet }),
    };

    // Generate output
    let output: string;

    if (options.itemsOnly) {
      // Items-only mode: just the items array
      output = formatItemsOutput(filteredItems, format, formatOptions);
    } else if (hasActiveFilters(options)) {
      // Filtered document: create modified doc with filtered items
      const filteredDoc: RequestLogDoc = {
        ...doc,
        items: filteredItems,
        item_count: filteredItems.length,
        // Recalculate tags for filtered items only
        tags: [...new Set(filteredItems.flatMap((item) => item.tags))].sort(),
        items_index: filteredItems.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
        })),
      };
      output = formatDocOutput(filteredDoc, format, formatOptions);
    } else {
      // Full document, no filters
      output = formatDocOutput(doc, format, formatOptions);
    }

    // Output results (respects quiet mode)
    if (!isQuietMode() && output) {
      console.log(output);
    }

    process.exit(ExitCodes.SUCCESS);
  } catch (error) {
    // Map errors to appropriate exit codes
    if (error instanceof FileNotFoundError) {
      handleError(error);
    }

    if (error instanceof ParseError) {
      // Parse errors get RESOURCE_NOT_FOUND (exit code 3) per spec
      const parseError = new ParseError(
        docPath,
        error.reason,
        'Check the document format and fix any syntax errors'
      );
      // Override the default exit code for parse errors
      console.error(`Error: ${parseError.message}`);
      if (parseError.suggestion) {
        console.error(`  -> ${parseError.suggestion}`);
      }
      process.exit(ExitCodes.RESOURCE_NOT_FOUND);
    }

    // Fallback for unexpected errors
    handleError(error);
  }
}

/**
 * Checks if any filter options are active.
 */
function hasActiveFilters(options: ViewOptions): boolean {
  return !!(options.filterType || options.filterStatus || options.filterTag);
}

/**
 * Registers the view command with a Commander program/command.
 *
 * Adds the 'view' subcommand to the log command group with all
 * options for output format and filtering.
 */
export function registerViewCommand(program: Command): void {
  program
    .command('view')
    .description('Display contents of a request-log document')
    .argument('<doc-path>', 'Path to the request-log document')
    .option('--json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .option('--markdown', 'Output original markdown (default for human)')
    .option('--items-only', 'Show only items, no frontmatter/metadata')
    .option('--filter-type <type>', 'Show only items of this type')
    .option('--filter-status <status>', 'Show only items with this status')
    .option('--filter-tag <tag>', 'Show only items with this tag')
    .option('-q, --quiet', 'Suppress output (useful with exit codes)')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture log view ./docs/REQ-20251203-app.md
  meatycapture log view ./docs/REQ-20251203-app.md --json
  meatycapture log view ./docs/REQ-20251203-app.md --items-only
  meatycapture log view ./docs/REQ-20251203-app.md --filter-type bug
  meatycapture log view ./docs/REQ-20251203-app.md --filter-tag ux --filter-status triage

Exit Codes:
  0  Success
  2  File not found
  3  Parse error (malformed document)
`
    )
    .action(viewAction);
}
