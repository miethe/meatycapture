/**
 * Field Add Command
 *
 * Adds a new option to a field catalog (global or project-scoped).
 *
 * Features:
 * - Add global field options (default)
 * - Add project-specific field options with --project flag
 * - Field name validation (type, domain, context, priority, status, tags)
 * - Value validation (non-empty string)
 * - Duplicate detection (same field/value/scope)
 * - Multiple output formats (JSON, YAML, human)
 *
 * Exit codes:
 * - 0: Success (option added)
 * - 1: Validation error (invalid field name, empty value)
 * - 3: Duplicate value (option already exists for field/scope)
 * - 4: Project not found (when --project specified)
 */

import type { Command } from 'commander';
import { createFieldCatalogStore, createProjectStore } from '@adapters/config-local';
import type { FieldName } from '@core/models';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
  ResourceConflictError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';
import YAML from 'yaml';

/**
 * Valid field names for field catalog.
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
 * Command options for field add command.
 */
interface AddOptions {
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
  project?: string;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > human (default)
 */
function resolveOutputFormat(options: AddOptions): 'json' | 'yaml' | 'human' {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Validates that a string is a valid FieldName.
 */
function isValidFieldName(value: string): value is FieldName {
  return (VALID_FIELD_NAMES as readonly string[]).includes(value);
}

/**
 * Adds a new field option to the field catalog.
 *
 * Process:
 * 1. Validate field name is valid (type, domain, etc.)
 * 2. Validate value is non-empty
 * 3. Verify project exists if --project specified
 * 4. Add option via FieldCatalogStore (handles duplicate detection)
 * 5. Output created option
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (invalid field name, empty value)
 * - 3: Duplicate value (option already exists)
 * - 4: Project not found
 */
export async function addAction(
  fieldArg: string,
  valueArg: string,
  options: AddOptions
): Promise<void> {
  // Set quiet mode globally for suppressing output
  if (options.quiet) {
    setQuietMode(true);
  }

  // Validate field name
  if (!isValidFieldName(fieldArg)) {
    throw createError.validation(
      `Invalid field name: ${fieldArg}`,
      `Valid field names: ${VALID_FIELD_NAMES.join(', ')}`
    );
  }

  // Validate value is non-empty
  const value = valueArg.trim();
  if (!value) {
    throw createError.validation(
      'Value cannot be empty',
      'Provide a non-empty value for the field option'
    );
  }

  // If --project specified, verify project exists
  if (options.project) {
    const projectStore = createProjectStore();
    const project = await projectStore.get(options.project);

    if (!project) {
      throw createError.resource('project', options.project);
    }
  }

  // Create the option via FieldCatalogStore
  const fieldStore = createFieldCatalogStore();

  try {
    // Build option data with proper type handling for project_id
    const optionData = options.project
      ? {
          field: fieldArg,
          value,
          scope: 'project' as const,
          project_id: options.project,
        }
      : {
          field: fieldArg,
          value,
          scope: 'global' as const,
        };

    const newOption = await fieldStore.addOption(optionData);

    // Determine output format
    const format = resolveOutputFormat(options);

    // Output result
    if (!isQuietMode()) {
      if (format === 'json') {
        // JSON format: serialize with null for undefined project_id
        console.log(
          JSON.stringify(
            {
              id: newOption.id,
              field: newOption.field,
              value: newOption.value,
              scope: newOption.scope,
              project_id: newOption.project_id ?? null,
              created_at: newOption.created_at.toISOString(),
            },
            null,
            2
          )
        );
      } else if (format === 'yaml') {
        // YAML format: serialize with null for undefined project_id
        const yamlData = {
          id: newOption.id,
          field: newOption.field,
          value: newOption.value,
          scope: newOption.scope,
          project_id: newOption.project_id ?? null,
          created_at: newOption.created_at.toISOString(),
        };
        console.log(YAML.stringify(yamlData));
      } else {
        // Human format: concise, informative output
        const scopeInfo =
          newOption.scope === 'project'
            ? `project: ${newOption.project_id}`
            : 'global';
        console.log(
          `Added option: ${newOption.value} to ${newOption.field} [${scopeInfo}]`
        );
        console.log(`  ID: ${newOption.id}`);
      }
    }

    process.exit(ExitCodes.SUCCESS);
  } catch (error) {
    // Handle duplicate error from store
    // Store throws generic Error with message pattern: "already exists for {field}: {value}"
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ResourceConflictError('field', `${fieldArg}:${value}`);
    }
    // Re-throw other errors for central error handler
    throw error;
  }
}

/**
 * Registers the add command with a Commander program/command.
 */
export function registerAddCommand(program: Command): void {
  program
    .command('add')
    .description('Add a new field option')
    .argument('<field>', `Field name (${VALID_FIELD_NAMES.join('|')})`)
    .argument('<value>', 'Option value to add')
    .option('--json', 'Output created option as JSON')
    .option('--yaml', 'Output created option as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('--project <id>', 'Add as project-specific option (default: global)')
    .addHelpText(
      'after',
      `
Examples:
  # Add global field option
  meatycapture field add type spike
  → Adds "spike" to global type field options

  # Add project-specific option
  meatycapture field add priority urgent --project my-project
  → Adds "urgent" to priority options for my-project only

  # Output as JSON
  meatycapture field add domain infra --json
  → Returns created option in JSON format for scripting

  # Output as YAML
  meatycapture field add status blocked --yaml

Supported Fields:
  type       Item types (enhancement, bug, idea, task, question)
  domain     Domain areas (web, api, mobile, cli, infra)
  context    Context information (user-facing, internal, technical)
  priority   Priority levels (low, medium, high, critical)
  status     Status values (triage, backlog, planned, in-progress, done)
  tags       Freeform tags for categorization

Exit Codes:
  0  Success - option added to field catalog
  1  Validation error (invalid field name, empty value)
  3  Duplicate value (option already exists for field/scope)
  4  Project not found (when using --project)
`
    )
    .action(withErrorHandling(addAction));
}
