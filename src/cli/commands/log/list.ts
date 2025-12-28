/**
 * Log List Command
 *
 * Lists request-log documents for a project or directory.
 * Displays document metadata including ID, title, item count, and timestamps.
 *
 * Features:
 * - Multiple output formats: table (default), JSON, YAML, CSV
 * - Sorting by name, date, or item count
 * - Result limiting and reverse sort order
 * - Quiet mode for scripting
 *
 * Exit codes:
 * - 0: Success (even if no documents found)
 * - 2: I/O error (path not accessible)
 * - 3: Project not found
 */

import type { Command } from 'commander';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';
import type { DocMeta } from '@core/ports';
import {
  formatOutput,
  type OutputFormat,
  type FormatOptions,
} from '@cli/formatters';
import {
  withErrorHandling,
  ResourceNotFoundError,
  CliError,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Sort field options for document listing.
 * - name: Alphabetical by doc_id
 * - date: Chronological by updated_at (default)
 * - items: Numeric by item_count
 */
type SortField = 'name' | 'date' | 'items';

/**
 * Validates that a string is a valid SortField.
 */
function isValidSortField(value: string): value is SortField {
  return ['name', 'date', 'items'].includes(value);
}

/**
 * Command options for list command.
 */
interface ListOptions {
  path?: string;
  json?: boolean;
  yaml?: boolean;
  csv?: boolean;
  table?: boolean;
  quiet?: boolean;
  sort?: string;
  reverse?: boolean;
  limit?: string;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > csv > table > human (default: table for DocMeta)
 */
function resolveOutputFormat(options: ListOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  if (options.csv) return 'csv';
  if (options.table) return 'table';
  // Default to table for human-readable document listing
  return 'table';
}

/**
 * Parses and validates the sort field option.
 * Returns 'date' as default if not specified or invalid.
 */
function parseSortField(value: string | undefined): SortField {
  if (!value) return 'date';
  if (isValidSortField(value)) return value;
  // Invalid sort field - silently default to 'date' for backward compatibility
  return 'date';
}

/**
 * Parses limit option to a positive integer.
 * Returns undefined if not specified or invalid.
 */
function parseLimit(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
}

/**
 * Comparator functions for sorting DocMeta arrays.
 * Each returns negative/zero/positive for ascending order.
 */
const sortComparators: Record<SortField, (a: DocMeta, b: DocMeta) => number> = {
  name: (a, b) => a.doc_id.localeCompare(b.doc_id),
  date: (a, b) => a.updated_at.getTime() - b.updated_at.getTime(),
  items: (a, b) => a.item_count - b.item_count,
};

/**
 * Sorts documents by the specified field and order.
 *
 * Default behavior (for backward compatibility):
 * - date: descending (newest first)
 * - name, items: ascending
 *
 * The --reverse flag inverts the default order.
 */
function sortDocuments(
  docs: DocMeta[],
  sortField: SortField,
  reverse: boolean
): DocMeta[] {
  const comparator = sortComparators[sortField];

  // Default sort direction: date descending, others ascending
  const defaultDescending = sortField === 'date';
  const shouldReverse = defaultDescending !== reverse;

  return [...docs].sort((a, b) => {
    const result = comparator(a, b);
    return shouldReverse ? -result : result;
  });
}

/**
 * Gets the default document path for a project.
 *
 * Resolution order:
 * 1. Project's configured default_path
 * 2. MEATYCAPTURE_DEFAULT_PROJECT_PATH environment variable
 * 3. ~/.meatycapture/docs/<project-id>/
 *
 * @throws ResourceNotFoundError if project ID specified but not found
 */
async function getProjectDocPath(projectId: string): Promise<string> {
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectId);

  if (project) {
    return project.default_path;
  }

  // Check if project was explicitly requested (not falling through)
  // If project ID was given but not found, throw error
  const envPath = process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
  if (envPath) {
    return join(envPath, projectId);
  }

  return join(homedir(), '.meatycapture', 'docs', projectId);
}

/**
 * Checks if a project exists in the registry.
 * Used to distinguish "project not found" from "default path fallback".
 */
async function projectExists(projectId: string): Promise<boolean> {
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectId);
  return project !== null;
}

/**
 * Lists request-log documents for a project.
 *
 * If project is specified, lists docs in that project's directory.
 * Otherwise, lists all docs in the default documents directory.
 *
 * Exit codes:
 * - 0: Success (even if no documents found)
 * - 2: I/O error (path not accessible)
 * - 3: Project not found (when project ID specified but doesn't exist)
 */
export async function listAction(
  projectId: string | undefined,
  options: ListOptions
): Promise<void> {
  // Set quiet mode globally for formatters
  if (options.quiet) {
    setQuietMode(true);
  }

  // Determine output format
  const format = resolveOutputFormat(options);
  const formatOptions: FormatOptions = {
    format,
    quiet: options.quiet ?? false,
    color: process.stdout.isTTY,
  };

  // Parse sorting options
  const sortField = parseSortField(options.sort);
  const reverse = options.reverse ?? false;
  const limit = parseLimit(options.limit);

  // Resolve search path
  let searchPath: string;
  if (options.path) {
    searchPath = resolve(options.path);
  } else if (projectId) {
    // Validate project exists when explicitly specified
    const exists = await projectExists(projectId);
    if (!exists) {
      throw new ResourceNotFoundError(
        'project',
        projectId,
        "Run 'meatycapture project list' to see available projects"
      );
    }
    searchPath = await getProjectDocPath(projectId);
  } else {
    searchPath = join(homedir(), '.meatycapture', 'docs');
  }

  // Fetch documents
  const docStore = createFsDocStore();
  let docs: DocMeta[];

  try {
    docs = await docStore.list(searchPath);
  } catch (error) {
    // Map file system errors to IO_ERROR exit code
    if (error instanceof Error && 'code' in error) {
      const nodeError = error as Error & { code: string };
      if (nodeError.code === 'ENOENT' || nodeError.code === 'EACCES') {
        throw new CliError(
          `Cannot access path: ${searchPath}`,
          ExitCodes.IO_ERROR,
          'Verify the directory exists and you have read permissions'
        );
      }
    }
    throw error;
  }

  // Apply sorting
  docs = sortDocuments(docs, sortField, reverse);

  // Apply limit
  if (limit !== undefined && limit < docs.length) {
    docs = docs.slice(0, limit);
  }

  // Format and output
  if (docs.length === 0) {
    // Empty result is still success
    if (!isQuietMode()) {
      if (format === 'json') {
        console.log('[]');
      } else if (format === 'yaml') {
        console.log('[]');
      } else if (format === 'csv') {
        // CSV header only for empty results
        console.log('path,doc_id,title,item_count,updated_at');
      } else {
        // Table/human format - show informative message
        console.log(`No documents found in: ${searchPath}`);
      }
    }
    process.exit(ExitCodes.SUCCESS);
    return;
  }

  // Output formatted results
  const output = formatOutput(docs, formatOptions);
  if (output) {
    console.log(output);
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the list command with a Commander program/command.
 */
export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List request-log documents for a project')
    .argument('[project]', 'Project identifier (optional)')
    .option('-p, --path <path>', 'Custom path to search for documents')
    .option('--json', 'Output as JSON array')
    .option('--yaml', 'Output as YAML')
    .option('--csv', 'Output as CSV (path, doc_id, title, item_count, updated_at)')
    .option('--table', 'Output as ASCII table (default)')
    .option('-q, --quiet', 'Suppress non-error output')
    .option(
      '--sort <field>',
      'Sort by: name|date|items (default: date)',
      'date'
    )
    .option('--reverse', 'Reverse sort order')
    .option('--limit <n>', 'Limit number of results')
    .action(withErrorHandling(listAction));
}
