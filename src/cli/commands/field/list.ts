/**
 * Field List Command
 *
 * Lists field catalog options with flexible filtering and formatting.
 * Displays global field options or project-specific effective options.
 *
 * Features:
 * - Filter by specific field name (type, domain, priority, status, context, tags)
 * - Show effective options for a project (global + project-specific)
 * - Multiple output formats: human (default), JSON, YAML, CSV
 * - Alphabetically sorted output
 *
 * Exit codes:
 * - 0: Success (always, even if field options empty)
 * - 2: Project not found (when --project specified and project doesn't exist)
 */

import type { Command } from 'commander';
import { createAdapters } from '@adapters/factory';
import type { FieldOption, FieldName } from '@core/models';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';
import YAML from 'yaml';

/**
 * Valid field names for filtering.
 * Must match FieldName type from core models.
 */
const VALID_FIELD_NAMES: readonly FieldName[] = [
  'type',
  'domain',
  'context',
  'priority',
  'status',
  'tags',
] as const;

/**
 * Command options for field list command.
 */
interface ListOptions {
  json?: boolean;
  yaml?: boolean;
  csv?: boolean;
  table?: boolean;
  quiet?: boolean;
  field?: string;
  project?: string;
  globalOnly?: boolean;
}

/**
 * Grouped field options by field name for display.
 */
interface GroupedOptions {
  [fieldName: string]: FieldOption[];
}

/**
 * Validates that a string is a valid FieldName.
 */
function isValidFieldName(value: string): value is FieldName {
  return (VALID_FIELD_NAMES as readonly string[]).includes(value);
}

/**
 * Groups field options by field name and sorts them.
 *
 * Sorting:
 * - Field names alphabetically
 * - Values within each field alphabetically
 *
 * @param options - Array of field options to group
 * @returns Object with field names as keys and sorted arrays as values
 */
function groupAndSortOptions(options: FieldOption[]): GroupedOptions {
  const grouped: GroupedOptions = {};

  // Group by field name
  for (const option of options) {
    if (!grouped[option.field]) {
      grouped[option.field] = [];
    }
    grouped[option.field]?.push(option);
  }

  // Sort values within each field alphabetically
  for (const field in grouped) {
    const fieldOptions = grouped[field];
    if (fieldOptions) {
      grouped[field] = fieldOptions.sort((a, b) => a.value.localeCompare(b.value));
    }
  }

  return grouped;
}

/**
 * Formats field options as human-readable output.
 *
 * Format:
 * ```
 * type:
 *   bug (type-bug-123) [global]
 *   enhancement (type-enhancement-456) [global]
 *   spike (type-spike-789) [project: my-project]
 *
 * priority:
 *   high (priority-high-111) [global]
 *   low (priority-low-222) [global]
 *   medium (priority-medium-333) [global]
 * ```
 */
function formatAsHuman(grouped: GroupedOptions, projectId?: string): string {
  const fieldNames = Object.keys(grouped).sort();

  if (fieldNames.length === 0) {
    return projectId
      ? `No field options found for project: ${projectId}`
      : 'No field options found';
  }

  const lines: string[] = [];

  for (const fieldName of fieldNames) {
    const options = grouped[fieldName];
    if (!options || options.length === 0) continue;

    lines.push(`${fieldName}:`);

    for (const option of options) {
      const scopeLabel =
        option.scope === 'global'
          ? '[global]'
          : `[project: ${option.project_id || 'unknown'}]`;

      lines.push(`  ${option.value} (${option.id}) ${scopeLabel}`);
    }

    // Add blank line between fields
    lines.push('');
  }

  // Remove trailing blank line
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * Formats field options as JSON.
 *
 * Output structure:
 * ```json
 * {
 *   "type": [
 *     {"id": "type-bug-123", "field": "type", "value": "bug", "scope": "global", "created_at": "2025-01-01T00:00:00.000Z"}
 *   ],
 *   "priority": [...]
 * }
 * ```
 */
function formatAsJson(grouped: GroupedOptions): string {
  return JSON.stringify(grouped, null, 2);
}

/**
 * Formats field options as YAML.
 */
function formatAsYaml(grouped: GroupedOptions): string {
  return YAML.stringify(grouped);
}

/**
 * Formats field options as CSV.
 *
 * Headers: field,value,scope,project_id,id,created_at
 * Rows sorted by field, then value
 */
function formatAsCsv(options: FieldOption[]): string {
  const lines: string[] = [];

  // CSV header
  lines.push('field,value,scope,project_id,id,created_at');

  // Sort by field name, then value
  const sorted = [...options].sort((a, b) => {
    const fieldCompare = a.field.localeCompare(b.field);
    if (fieldCompare !== 0) return fieldCompare;
    return a.value.localeCompare(b.value);
  });

  // CSV rows
  for (const option of sorted) {
    const projectId = option.project_id || '';
    const createdAt = option.created_at.toISOString();

    // Escape values with commas or quotes
    const escapeCsv = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    lines.push(
      [
        escapeCsv(option.field),
        escapeCsv(option.value),
        escapeCsv(option.scope),
        escapeCsv(projectId),
        escapeCsv(option.id),
        escapeCsv(createdAt),
      ].join(',')
    );
  }

  return lines.join('\n');
}

/**
 * Formats field options as ASCII table.
 *
 * For table format, use CSV-like structure but with aligned columns.
 * This is a simplified implementation - could be enhanced with a table library.
 */
function formatAsTable(options: FieldOption[]): string {
  if (options.length === 0) {
    return 'No field options found';
  }

  // Sort by field name, then value
  const sorted = [...options].sort((a, b) => {
    const fieldCompare = a.field.localeCompare(b.field);
    if (fieldCompare !== 0) return fieldCompare;
    return a.value.localeCompare(b.value);
  });

  // Calculate column widths
  const headers = ['FIELD', 'VALUE', 'SCOPE', 'PROJECT_ID', 'ID'];
  const rows = sorted.map((opt) => [
    opt.field,
    opt.value,
    opt.scope,
    opt.project_id || '',
    opt.id,
  ]);

  const colWidths = headers.map((header, i) => {
    const maxDataWidth = Math.max(...rows.map((row) => (row[i]?.length || 0)));
    return Math.max(header.length, maxDataWidth);
  });

  // Build table
  const lines: string[] = [];

  // Header row
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i] || 0)).join(' | ');
  lines.push(headerRow);

  // Separator
  const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');
  lines.push(separator);

  // Data rows
  for (const row of rows) {
    const dataRow = row.map((cell, i) => (cell || '').padEnd(colWidths[i] || 0)).join(' | ');
    lines.push(dataRow);
  }

  return lines.join('\n');
}

/**
 * Resolves output format from mutually exclusive flags.
 * Priority: json > yaml > csv > table > human (default)
 */
function resolveOutputFormat(options: ListOptions): 'json' | 'yaml' | 'csv' | 'table' | 'human' {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  if (options.csv) return 'csv';
  if (options.table) return 'table';
  return 'human';
}

/**
 * Lists field catalog options.
 *
 * Fetches field options from the FieldCatalogStore and displays them
 * in the requested format. Supports filtering by field name and project.
 *
 * Exit codes:
 * - 0: Success (always, even if no field options exist)
 * - 2: Project not found (when --project used and project doesn't exist)
 */
export async function listAction(options: ListOptions): Promise<void> {
  // Set quiet mode globally for suppressing output
  if (options.quiet) {
    setQuietMode(true);
  }

  // Validate --field option if provided
  if (options.field && !isValidFieldName(options.field)) {
    throw createError.validation(
      `Invalid field name: ${options.field}`,
      `Valid field names: ${VALID_FIELD_NAMES.join(', ')}`
    );
  }

  // Validate project exists if --project specified
  const { projectStore, fieldStore } = await createAdapters();

  if (options.project) {
    const project = await projectStore.get(options.project);

    if (!project) {
      throw createError.resource('project', options.project);
    }
  }

  // Fetch field options based on options
  let fieldOptions: FieldOption[];

  if (options.project) {
    // Get effective options for project (global + project-specific)
    fieldOptions = await fieldStore.getForProject(options.project);
  } else if (options.globalOnly) {
    // Get only global options
    fieldOptions = await fieldStore.getGlobal();
  } else {
    // Default: get global options
    fieldOptions = await fieldStore.getGlobal();
  }

  // Filter by field name if specified
  if (options.field) {
    fieldOptions = fieldOptions.filter((opt) => opt.field === options.field);
  }

  // Determine output format
  const format = resolveOutputFormat(options);

  // Format and output based on format type
  if (fieldOptions.length === 0) {
    // Empty result is still success
    if (!isQuietMode()) {
      if (format === 'json') {
        console.log('{}');
      } else if (format === 'yaml') {
        console.log('{}');
      } else if (format === 'csv') {
        // CSV header only for empty results
        console.log('field,value,scope,project_id,id,created_at');
      } else if (format === 'table') {
        console.log('No field options found');
      } else {
        // Human format
        const filterMsg = options.field ? ` for field: ${options.field}` : '';
        const projectMsg = options.project ? ` (project: ${options.project})` : '';
        console.log(`No field options found${filterMsg}${projectMsg}.`);
      }
    }
    process.exit(ExitCodes.SUCCESS);
    return;
  }

  // Format output based on format type
  let output = '';

  if (format === 'csv') {
    // CSV doesn't use grouping
    output = formatAsCsv(fieldOptions);
  } else if (format === 'table') {
    // Table doesn't use grouping
    output = formatAsTable(fieldOptions);
  } else {
    // Human, JSON, YAML use grouping
    const grouped = groupAndSortOptions(fieldOptions);

    if (format === 'json') {
      output = formatAsJson(grouped);
    } else if (format === 'yaml') {
      output = formatAsYaml(grouped);
    } else {
      // Human format
      output = formatAsHuman(grouped, options.project);
    }
  }

  if (output && !isQuietMode()) {
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
    .description('List available field options')
    .option('--json', 'Output as JSON (grouped by field)')
    .option('--yaml', 'Output as YAML (grouped by field)')
    .option('--csv', 'Output as CSV (flat list)')
    .option('--table', 'Output as ASCII table')
    .option('-q, --quiet', 'Suppress non-error output')
    .option(
      '--field <name>',
      `Filter by field name (${VALID_FIELD_NAMES.join('|')})`
    )
    .option('--project <id>', 'Show effective options for project (global + project-specific)')
    .option('--global-only', 'Show only global options')
    .action(withErrorHandling(listAction));
}
