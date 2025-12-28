/**
 * Project List Command
 *
 * Lists all configured projects in the MeatyCapture registry.
 * Displays project metadata including ID, name, path, repo URL, and status.
 *
 * Features:
 * - Multiple output formats: human (default), JSON, YAML, CSV, table
 * - Filtering by enabled/disabled status
 * - Sorting by id, name, or created date
 * - Quiet mode for scripting
 *
 * Exit codes:
 * - 0: Success (always, even if no projects exist)
 */

import type { Command } from 'commander';
import { createAdapters } from '@adapters/factory';
import type { Project } from '@core/models';
import {
  formatOutput,
  type OutputFormat,
  type FormatOptions,
} from '@cli/formatters';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Sort field options for project listing.
 * - id: Alphabetical by project ID
 * - name: Alphabetical by project name (default)
 * - created: Chronological by created_at
 */
type SortField = 'id' | 'name' | 'created';

/**
 * Validates that a string is a valid SortField.
 */
function isValidSortField(value: string): value is SortField {
  return ['id', 'name', 'created'].includes(value);
}

/**
 * Command options for project list command.
 */
interface ListOptions {
  json?: boolean;
  yaml?: boolean;
  csv?: boolean;
  table?: boolean;
  quiet?: boolean;
  sort?: string;
  enabledOnly?: boolean;
  disabledOnly?: boolean;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > csv > table > human (default)
 */
function resolveOutputFormat(options: ListOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  if (options.csv) return 'csv';
  if (options.table) return 'table';
  // Default to human for project listing
  return 'human';
}

/**
 * Parses and validates the sort field option.
 * Returns 'name' as default if not specified or invalid.
 */
function parseSortField(value: string | undefined): SortField {
  if (!value) return 'name';
  if (isValidSortField(value)) return value;
  // Invalid sort field - silently default to 'name' for consistency
  return 'name';
}

/**
 * Comparator functions for sorting Project arrays.
 * Each returns negative/zero/positive for ascending order.
 */
const sortComparators: Record<SortField, (a: Project, b: Project) => number> = {
  id: (a, b) => a.id.localeCompare(b.id),
  name: (a, b) => a.name.localeCompare(b.name),
  created: (a, b) => a.created_at.getTime() - b.created_at.getTime(),
};

/**
 * Sorts projects by the specified field.
 * All sort orders are ascending by default.
 */
function sortProjects(projects: Project[], sortField: SortField): Project[] {
  const comparator = sortComparators[sortField];
  return [...projects].sort(comparator);
}

/**
 * Filters projects by enabled/disabled status.
 */
function filterProjects(
  projects: Project[],
  enabledOnly: boolean,
  disabledOnly: boolean
): Project[] {
  if (enabledOnly && disabledOnly) {
    // Both flags set - show nothing (impossible condition)
    return [];
  }
  if (enabledOnly) {
    return projects.filter((p) => p.enabled);
  }
  if (disabledOnly) {
    return projects.filter((p) => !p.enabled);
  }
  return projects;
}

/**
 * Lists all configured projects.
 *
 * Fetches projects from the ProjectStore and displays them in the
 * requested format. Supports filtering and sorting options.
 *
 * Exit codes:
 * - 0: Success (always, even if no projects exist - empty list is valid)
 */
export async function listAction(options: ListOptions): Promise<void> {
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

  // Parse sorting option
  const sortField = parseSortField(options.sort);

  // Fetch projects from store
  const { projectStore } = await createAdapters();
  let projects = await projectStore.list();

  // Apply filtering
  projects = filterProjects(
    projects,
    options.enabledOnly ?? false,
    options.disabledOnly ?? false
  );

  // Apply sorting
  projects = sortProjects(projects, sortField);

  // Format and output
  if (projects.length === 0) {
    // Empty result is still success
    if (!isQuietMode()) {
      if (format === 'json') {
        console.log('[]');
      } else if (format === 'yaml') {
        console.log('[]');
      } else if (format === 'csv') {
        // CSV header only for empty results
        console.log('id,name,default_path,repo_url,enabled,created_at,updated_at');
      } else {
        // Table/human format - show informative message
        const filterMsg =
          options.enabledOnly
            ? ' (enabled)'
            : options.disabledOnly
              ? ' (disabled)'
              : '';
        console.log(`No projects found${filterMsg}.`);
        console.log("Run 'meatycapture project add <name>' to create one.");
      }
    }
    process.exit(ExitCodes.SUCCESS);
    return;
  }

  // Output formatted results
  const output = formatOutput(projects, formatOptions);
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
    .description('List all registered projects')
    .option('--json', 'Output as JSON array')
    .option('--yaml', 'Output as YAML')
    .option('--csv', 'Output as CSV')
    .option('--table', 'Output as ASCII table')
    .option('-q, --quiet', 'Suppress non-error output')
    .option(
      '--sort <field>',
      'Sort by: id|name|created (default: name)',
      'name'
    )
    .option('--enabled-only', 'Show only enabled projects')
    .option('--disabled-only', 'Show only disabled projects')
    .action(withErrorHandling(listAction));
}
