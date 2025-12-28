/**
 * Log Search Command
 *
 * Searches request-log documents for items matching a query.
 * Supports text search in title/notes and special prefix syntax
 * for filtering by tags, type, or status.
 *
 * Usage:
 *   meatycapture log search <query> [project]
 *
 * Query Syntax:
 *   meatycapture log search "login bug"           # Text in title/notes
 *   meatycapture log search "tag:ux"              # Items with tag "ux"
 *   meatycapture log search "type:enhancement"    # Items of type enhancement
 *   meatycapture log search "status:triage"       # Items with status triage
 *   meatycapture log search "tag:api login"       # Combined (AND logic)
 *
 * Exit Codes:
 *   0 - Success (even if no results)
 *   2 - I/O error (path not accessible)
 */

import type { Command } from 'commander';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';
import {
  formatOutput,
  type OutputFormat,
  type SearchMatch,
} from '@cli/formatters';
import {
  searchDocuments,
  parseMatchMode,
  type SearchOptions,
  type MatchMode,
} from '@cli/handlers/search.js';
import {
  handleError,
  CliError,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Gets the default document path for a project.
 *
 * Resolution order:
 * 1. Project's configured default_path
 * 2. MEATYCAPTURE_DEFAULT_PROJECT_PATH environment variable
 * 3. ~/.meatycapture/docs/<project-id>/
 */
async function getProjectDocPath(projectId: string): Promise<string> {
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectId);

  if (project) {
    return project.default_path;
  }

  const envPath = process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
  if (envPath) {
    return join(envPath, projectId);
  }

  return join(homedir(), '.meatycapture', 'docs', projectId);
}

/**
 * Command options for search command.
 */
interface SearchCommandOptions {
  path?: string;
  json?: boolean;
  yaml?: boolean;
  csv?: boolean;
  table?: boolean;
  match?: string;
  limit?: string;
  quiet?: boolean;
}

/**
 * Determines output format from options.
 *
 * Flag priority: --json > --yaml > --csv > --table > default (human)
 */
function resolveFormat(options: SearchCommandOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  if (options.csv) return 'csv';
  if (options.table) return 'table';
  return 'human';
}

/**
 * Parses limit option, returning 0 for unlimited.
 */
function parseLimit(limit: string | undefined): number {
  if (!limit) return 0;

  const parsed = parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

/**
 * Searches request-log documents for items matching a query.
 *
 * Reads all documents in the specified path, parses the query,
 * and returns matching items with field match information.
 *
 * @param query - Search query string
 * @param projectId - Optional project identifier for path resolution
 * @param options - Command options
 */
export async function searchAction(
  query: string,
  projectId: string | undefined,
  options: SearchCommandOptions
): Promise<void> {
  try {
    // Handle quiet mode
    if (options.quiet) {
      setQuietMode(true);
    }

    // Validate query
    if (!query || query.trim().length === 0) {
      throw new CliError(
        'Search query is required',
        ExitCodes.VALIDATION_ERROR,
        'Provide a search query, e.g., meatycapture log search "bug"'
      );
    }

    // Resolve search path
    let searchPath: string;
    if (options.path) {
      searchPath = resolve(options.path);
    } else if (projectId) {
      searchPath = await getProjectDocPath(projectId);
    } else {
      searchPath = join(homedir(), '.meatycapture', 'docs');
    }

    // Load documents
    const docStore = createFsDocStore();
    const docMetas = await docStore.list(searchPath);

    if (docMetas.length === 0) {
      outputResults([], options);
      process.exit(ExitCodes.SUCCESS);
      return;
    }

    // Read all documents for searching
    const docsWithPaths: Array<{ doc: ReturnType<typeof docStore.read> extends Promise<infer T> ? T : never; path: string }> = [];

    for (const meta of docMetas) {
      try {
        const doc = await docStore.read(meta.path);
        docsWithPaths.push({ doc, path: meta.path });
      } catch {
        // Skip documents that fail to read
        // Could log warning in verbose mode
        continue;
      }
    }

    // Configure search options
    const searchOptions: SearchOptions = {
      matchMode: parseMatchMode(options.match) as MatchMode,
      limit: parseLimit(options.limit),
    };

    // Execute search
    const matches = searchDocuments(docsWithPaths, query, searchOptions);

    // Output results
    outputResults(matches, options);

    process.exit(ExitCodes.SUCCESS);
  } catch (error) {
    // Map I/O errors to exit code 2
    if (isIoError(error)) {
      handleError(error, ExitCodes.IO_ERROR);
    }

    handleError(error);
  }
}

/**
 * Outputs search results in the configured format.
 */
function outputResults(
  matches: SearchMatch[],
  options: SearchCommandOptions
): void {
  // In quiet mode, suppress output
  if (isQuietMode()) {
    return;
  }

  const format = resolveFormat(options);
  const output = formatOutput(matches, { format, quiet: false });

  console.log(output);
}

/**
 * Type guard for I/O errors.
 */
function isIoError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  // Check for Node.js file system error codes
  if ('code' in error) {
    const code = (error as { code: string }).code;
    return ['ENOENT', 'EACCES', 'EPERM', 'EROFS', 'ENOTDIR'].includes(code);
  }

  // Check for specific error messages
  const message = error.message.toLowerCase();
  return (
    message.includes('permission denied') ||
    message.includes('no such file') ||
    message.includes('not accessible')
  );
}

/**
 * Registers the search command with a Commander program/command.
 */
export function registerSearchCommand(program: Command): void {
  program
    .command('search')
    .description('Search request-log documents for items matching a query')
    .argument('<query>', 'Search query (supports tag:, type:, status: prefixes)')
    .argument('[project]', 'Project identifier (optional)')
    .option('-p, --path <path>', 'Custom path to search for documents')
    .option('--json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .option('--csv', 'Output as CSV')
    .option('--table', 'Output as table')
    .option(
      '--match <mode>',
      'Match mode: full|starts|contains (default: contains)'
    )
    .option('--limit <n>', 'Limit number of results')
    .option('-q, --quiet', 'Suppress output')
    .addHelpText(
      'after',
      `
Query Syntax:
  Plain text      Search in title and notes
  tag:<name>      Search for items with tag
  type:<type>     Search for items of type (enhancement, bug, etc.)
  status:<status> Search for items with status (triage, backlog, etc.)

  Multiple terms are combined with AND logic.

Examples:
  meatycapture log search "login bug"
  meatycapture log search "tag:ux"
  meatycapture log search "type:enhancement" my-project
  meatycapture log search "tag:api status:triage" --table
  meatycapture log search "urgent" -p ./docs --json
`
    )
    .action(searchAction);
}
