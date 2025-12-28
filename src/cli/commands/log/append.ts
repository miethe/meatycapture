/**
 * Log Append Command
 *
 * Appends items from JSON input to an existing request-log document.
 * Updates document metadata (item_count, tags, updated_at).
 *
 * Features:
 * - Multiple output formats (human, json, yaml, csv, table)
 * - Stdin support for piped input
 * - Optional backup skip with --no-backup
 * - Standardized exit codes for scripting
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import type { ItemDraft, RequestLogDoc, RequestLogItem } from '@core/models';
import { createAdapters } from '@adapters/factory';
import { realClock } from '@adapters/clock';
import { aggregateTags, updateItemsIndex, serialize, parse } from '@core/serializer';
import { generateItemId, getNextItemNumber } from '@core/validation';
import { formatOutput, type OutputFormat, type FormatOptions } from '@cli/formatters/index.js';
import { readInput, isStdinInput, StdinError } from '@cli/handlers/stdin.js';
import {
  withErrorHandling,
  ValidationError,
  FileNotFoundError,
  ParseError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * CLI input JSON structure for appending items.
 */
interface AppendCliInput {
  /** Project identifier (slug format) - used for validation */
  project: string;
  /** Array of items to append */
  items: ItemDraft[];
}

/**
 * Command options for append command.
 */
interface AppendOptions {
  json?: boolean;
  yaml?: boolean;
  csv?: boolean;
  table?: boolean;
  quiet?: boolean;
  noBackup?: boolean;
}

/**
 * Type guard to validate ItemDraft structure.
 */
function isValidItemDraft(obj: unknown): obj is ItemDraft {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const item = obj as Partial<ItemDraft>;

  return (
    typeof item.title === 'string' &&
    typeof item.type === 'string' &&
    typeof item.domain === 'string' &&
    typeof item.context === 'string' &&
    typeof item.priority === 'string' &&
    typeof item.status === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === 'string') &&
    typeof item.notes === 'string'
  );
}

/**
 * Type guard to validate append CLI input structure.
 */
function isValidAppendInput(obj: unknown): obj is AppendCliInput {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const input = obj as Partial<AppendCliInput>;

  if (!input.project || typeof input.project !== 'string') {
    return false;
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return false;
  }

  for (const item of input.items) {
    if (!isValidItemDraft(item)) {
      return false;
    }
  }

  return true;
}

/**
 * Parses and validates JSON content for append operation.
 *
 * @param content - Raw JSON string
 * @param source - Source description for error messages
 * @returns Parsed and validated CLI input
 * @throws ValidationError if JSON parsing or validation fails
 */
function parseAppendInput(content: string, source: string): AppendCliInput {
  let data: unknown;

  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new ValidationError(
      `Invalid JSON from ${source}: ${error instanceof SyntaxError ? error.message : 'Parse error'}`,
      'Check for missing commas, quotes, or brackets in the JSON input'
    );
  }

  if (!isValidAppendInput(data)) {
    throw new ValidationError(
      'Invalid JSON structure for append',
      'Expected format: {"project": "slug", "items": [{title, type, domain, context, priority, status, tags[], notes}]}'
    );
  }

  return data;
}

/**
 * Reads and parses JSON input for append operation.
 *
 * Handles both file input and stdin (when path is '-').
 *
 * @param inputPath - Path to JSON file or '-' for stdin
 * @returns Parsed and validated CLI input
 * @throws ValidationError if JSON parsing or validation fails
 * @throws FileNotFoundError if input file not found
 */
async function readAppendInput(inputPath: string): Promise<AppendCliInput> {
  const source = isStdinInput(inputPath) ? 'stdin' : inputPath;

  try {
    const content = await readInput(inputPath);
    return parseAppendInput(content, source);
  } catch (error) {
    // Re-throw typed errors as-is
    if (error instanceof ValidationError) {
      throw error;
    }

    // Handle stdin-specific errors
    if (error instanceof StdinError) {
      throw new ValidationError(
        `Stdin error: ${error.message}`,
        'Ensure data is piped correctly (e.g., echo \'{"project":"test",...}\' | meatycapture log append doc.md -)'
      );
    }

    // Handle file not found
    if (error instanceof Error && error.message.includes('not found')) {
      throw new FileNotFoundError(inputPath);
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Determines output format from command options.
 * Default is 'human' if no format flag specified.
 */
function getOutputFormat(options: AppendOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  if (options.csv) return 'csv';
  if (options.table) return 'table';
  return 'human';
}

/**
 * Creates format options from command options.
 */
function createFormatOptions(options: AppendOptions): FormatOptions {
  return {
    format: getOutputFormat(options),
    quiet: options.quiet ?? false,
    color: process.stdout.isTTY ?? false,
  };
}

/**
 * Appends items to a document without creating a backup.
 *
 * This is a manual implementation that bypasses FsDocStore.append()
 * to allow skipping the backup step when --no-backup is specified.
 *
 * @param docPath - Path to the document
 * @param input - Validated append input with items
 * @returns Updated document after append
 */
async function appendWithoutBackup(
  docPath: string,
  input: AppendCliInput
): Promise<RequestLogDoc> {
  // Read existing document
  let content: string;
  try {
    content = await fs.readFile(docPath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new FileNotFoundError(docPath);
    }
    throw error;
  }

  // Parse document
  let doc: RequestLogDoc;
  try {
    doc = parse(content);
  } catch (error) {
    throw new ParseError(
      docPath,
      error instanceof Error ? error.message : 'Unknown parse error',
      'Check the document format and fix any syntax errors in the frontmatter'
    );
  }

  // Generate new items with IDs
  const now = realClock.now();
  let nextNumber = getNextItemNumber(doc.items);
  const newItems: RequestLogItem[] = [];

  for (const item of input.items) {
    const itemId = generateItemId(doc.doc_id, nextNumber);
    newItems.push({
      ...item,
      id: itemId,
      created_at: now,
    });
    nextNumber++;
  }

  // Update document
  const updatedItems = [...doc.items, ...newItems];
  const updatedDoc: RequestLogDoc = {
    ...doc,
    items: updatedItems,
    tags: aggregateTags(updatedItems),
    items_index: updateItemsIndex(updatedItems),
    item_count: updatedItems.length,
    updated_at: now,
  };

  // Write without backup
  const serialized = serialize(updatedDoc);
  await fs.writeFile(docPath, serialized, 'utf-8');

  return updatedDoc;
}

/**
 * Appends items to a document with backup creation.
 *
 * Uses the standard FsDocStore.append() method which automatically
 * creates backups before modification.
 *
 * @param docPath - Path to the document
 * @param input - Validated append input with items
 * @returns Updated document after append
 */
async function appendWithBackup(
  docPath: string,
  input: AppendCliInput
): Promise<RequestLogDoc> {
  const { docStore } = await createAdapters();
  let updatedDoc: RequestLogDoc | null = null;

  for (const item of input.items) {
    try {
      updatedDoc = await docStore.append(docPath, item, realClock);
    } catch (error) {
      // Map file system errors to typed errors
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new FileNotFoundError(docPath);
        }
        if (error.message.includes('parse') || error.message.includes('Parse')) {
          throw new ParseError(docPath, error.message);
        }
      }
      throw error;
    }
  }

  if (!updatedDoc) {
    throw new ValidationError('No items were appended', 'Provide at least one item in the items array');
  }

  return updatedDoc;
}

/**
 * Formats human-readable success output for append operation.
 * Used when no structured output format is specified.
 */
function formatHumanOutput(docPath: string, itemCount: number, doc: RequestLogDoc): string {
  const lines = [
    `Appended ${itemCount} item(s) to: ${docPath}`,
    `  Doc ID: ${doc.doc_id}`,
    `  Total Items: ${doc.item_count}`,
    `  Tags: ${doc.tags.join(', ') || '(none)'}`,
  ];
  return lines.join('\n');
}

/**
 * Appends items to an existing request-log document.
 *
 * Steps:
 * 1. Read and validate JSON input (file or stdin)
 * 2. Verify document exists
 * 3. Append each item to the document
 * 4. Update aggregated metadata
 * 5. Format and output result
 */
export async function appendAction(
  docPath: string,
  jsonPath: string,
  options: AppendOptions
): Promise<void> {
  const formatOptions = createFormatOptions(options);
  const resolvedDocPath = resolve(docPath);

  // Read and validate input
  const input = await readAppendInput(jsonPath);

  // Append items with or without backup
  const updatedDoc = options.noBackup
    ? await appendWithoutBackup(resolvedDocPath, input)
    : await appendWithBackup(resolvedDocPath, input);

  // Output result
  if (!options.quiet) {
    const format = getOutputFormat(options);

    if (format === 'human') {
      // Human format: custom success message
      console.log(formatHumanOutput(resolvedDocPath, input.items.length, updatedDoc));
    } else {
      // Structured formats: output the updated document
      const output = formatOutput(updatedDoc, formatOptions);
      if (output) {
        console.log(output);
      }
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Wrapped action handler with standardized error handling.
 *
 * Maps errors to appropriate exit codes:
 * - ValidationError -> exit 1
 * - FileNotFoundError, ParseError -> exit 2
 * - Other errors -> exit 1 (default)
 */
const wrappedAppendAction = withErrorHandling(appendAction);

/**
 * Registers the append command with a Commander program/command.
 */
export function registerAppendCommand(program: Command): void {
  program
    .command('append')
    .description('Append items to an existing request-log document')
    .argument('<doc-path>', 'Path to existing document')
    .argument('<json-file>', 'Path to JSON input file, or "-" for stdin')
    .option('--json', 'Output updated document as JSON')
    .option('--yaml', 'Output updated document as YAML')
    .option('--csv', 'Output updated document as CSV')
    .option('--table', 'Output updated document as table')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('--no-backup', 'Skip backup creation before modification')
    .action(wrappedAppendAction);
}
