/**
 * Field Import Command
 *
 * Batch imports field options from JSON/YAML files into the field catalog.
 * Supports both global and project-specific imports with merge capabilities.
 *
 * Features:
 * - Auto-detect format by file extension (.json, .yaml, .yml)
 * - Import to global or project-specific scope
 * - Merge mode to skip duplicates or strict mode to fail on conflicts
 * - Atomic validation - all options validated before import
 * - Detailed summary reporting in multiple formats
 *
 * Input format:
 * ```json
 * {
 *   "type": ["feature-request", "chore"],
 *   "priority": ["p0", "p1", "p2"],
 *   "status": ["needs-review", "approved"]
 * }
 * ```
 *
 * Exit codes:
 * - 0: Success (all imported or merged)
 * - 1: Parse error (invalid JSON/YAML)
 * - 2: File not found
 * - 3: Duplicate conflict (without --merge)
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import YAML from 'yaml';
import { createFieldCatalogStore, createProjectStore } from '@adapters/config-local';
import type { FieldName } from '@core/models';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
  FileNotFoundError,
  ValidationError,
  ResourceConflictError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Valid field names that can be imported.
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
 * Command options for field import command.
 */
interface ImportOptions {
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
  project?: string;
  merge?: boolean;
}

/**
 * Input file structure: field names mapped to arrays of values.
 */
interface ImportInput {
  [field: string]: string[];
}

/**
 * Summary of import operation results.
 */
interface ImportSummary {
  total_fields: number;
  total_values: number;
  added: number;
  skipped: number;
  fields: {
    [field: string]: {
      added: number;
      skipped: number;
    };
  };
}

/**
 * Type guard to validate field name is in FieldName union.
 */
function isValidFieldName(value: string): value is FieldName {
  return (VALID_FIELD_NAMES as readonly string[]).includes(value);
}

/**
 * Reads and parses import file from disk.
 *
 * Auto-detects format by file extension:
 * - .json → JSON.parse()
 * - .yaml/.yml → YAML.parse()
 *
 * @param filePath - Path to import file
 * @returns Parsed import data
 * @throws FileNotFoundError if file doesn't exist
 * @throws ValidationError if file cannot be parsed
 */
async function readImportFile(filePath: string): Promise<ImportInput> {
  let content: string;

  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new FileNotFoundError(filePath);
    }
    throw error;
  }

  const ext = extname(filePath).toLowerCase();

  try {
    if (ext === '.yaml' || ext === '.yml') {
      return YAML.parse(content) as ImportInput;
    } else {
      // Default to JSON for .json or no extension
      return JSON.parse(content) as ImportInput;
    }
  } catch (error) {
    throw new ValidationError(
      `Failed to parse ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ext === '.yaml' || ext === '.yml'
        ? 'Check YAML syntax and indentation'
        : 'Check JSON syntax for missing commas or quotes'
    );
  }
}

/**
 * Validates import input structure and field values.
 *
 * Ensures:
 * - Input is an object (not array or primitive)
 * - All keys are valid field names
 * - All values are arrays of non-empty strings
 *
 * @param input - Raw parsed input
 * @returns Validated and trimmed input
 * @throws ValidationError if input structure is invalid
 */
function validateImportInput(input: unknown): ImportInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError(
      'Import file must be an object with field names as keys',
      'Format: { "field": ["value1", "value2"], ... }'
    );
  }

  const obj = input as Record<string, unknown>;
  const validated: ImportInput = {};

  for (const [field, values] of Object.entries(obj)) {
    if (!isValidFieldName(field)) {
      throw new ValidationError(
        `Invalid field name in import: ${field}`,
        `Valid field names are: ${VALID_FIELD_NAMES.join(', ')}`
      );
    }

    if (!Array.isArray(values)) {
      throw new ValidationError(
        `Field "${field}" must have an array of values`,
        `Format: "${field}": ["value1", "value2"]`
      );
    }

    for (const value of values) {
      if (typeof value !== 'string' || value.trim() === '') {
        throw new ValidationError(
          `Field "${field}" contains invalid value: ${JSON.stringify(value)}`,
          'All values must be non-empty strings'
        );
      }
    }

    validated[field] = values.map((v) => v.trim());
  }

  return validated;
}

/**
 * Executes the field import operation.
 *
 * Workflow:
 * 1. Read and parse input file
 * 2. Validate input structure and values
 * 3. Verify project exists (if --project specified)
 * 4. Pre-check for duplicates (if not in merge mode)
 * 5. Import all options (atomic operation)
 * 6. Report summary in requested format
 *
 * @param filePath - Path to import file
 * @param options - Command options
 */
export async function importAction(filePath: string, options: ImportOptions): Promise<void> {
  if (options.quiet) {
    setQuietMode(true);
  }

  // Read and parse file
  const rawInput = await readImportFile(filePath);
  const input = validateImportInput(rawInput);

  // If --project specified, verify project exists
  if (options.project) {
    const projectStore = createProjectStore();
    const project = await projectStore.get(options.project);
    if (!project) {
      throw createError.resource('project', options.project);
    }
  }

  const fieldStore = createFieldCatalogStore();
  const scope = options.project ? ('project' as const) : ('global' as const);

  // Pre-check for duplicates if not in merge mode
  const existingOptions = options.project
    ? await fieldStore.getForProject(options.project)
    : await fieldStore.getGlobal();

  // Filter to only options matching our scope
  const relevantExisting = existingOptions.filter((opt) =>
    options.project
      ? opt.scope === 'project' && opt.project_id === options.project
      : opt.scope === 'global'
  );

  // Build set of existing field:value combinations
  const existingSet = new Set(relevantExisting.map((opt) => `${opt.field}:${opt.value}`));

  // Collect duplicates for validation
  const duplicates: string[] = [];
  for (const [field, values] of Object.entries(input)) {
    for (const value of values) {
      if (existingSet.has(`${field}:${value}`)) {
        duplicates.push(`${field}:${value}`);
      }
    }
  }

  // If duplicates exist and not in merge mode, fail
  if (duplicates.length > 0 && !options.merge) {
    throw new ResourceConflictError(
      'field',
      duplicates.join(', '),
      'Use --merge to skip existing values and add only new ones'
    );
  }

  // Import options
  const summary: ImportSummary = {
    total_fields: Object.keys(input).length,
    total_values: Object.values(input).flat().length,
    added: 0,
    skipped: 0,
    fields: {},
  };

  for (const [field, values] of Object.entries(input)) {
    summary.fields[field] = { added: 0, skipped: 0 };

    for (const value of values) {
      const key = `${field}:${value}`;

      if (existingSet.has(key)) {
        summary.skipped++;
        summary.fields[field]!.skipped++;
        continue;
      }

      try {
        // Build option data with proper type handling for project_id
        const optionData = options.project
          ? {
              field: field as FieldName,
              value,
              scope,
              project_id: options.project,
            }
          : {
              field: field as FieldName,
              value,
              scope,
            };

        await fieldStore.addOption(optionData);
        summary.added++;
        summary.fields[field]!.added++;
        // Add to set to prevent duplicate attempts within same import
        existingSet.add(key);
      } catch (error) {
        // If somehow we still get a duplicate, skip it in merge mode
        if (
          options.merge &&
          error instanceof Error &&
          error.message.includes('already exists')
        ) {
          summary.skipped++;
          summary.fields[field]!.skipped++;
        } else {
          throw error;
        }
      }
    }
  }

  // Output summary
  if (!isQuietMode()) {
    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else if (options.yaml) {
      console.log(YAML.stringify(summary));
    } else {
      // Human format
      console.log(`Import complete: ${summary.added} added, ${summary.skipped} skipped`);
      console.log('');
      for (const [field, counts] of Object.entries(summary.fields)) {
        const parts: string[] = [];
        if (counts.added > 0) parts.push(`${counts.added} added`);
        if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`);
        console.log(`  ${field}: ${parts.join(', ')}`);
      }
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the import command with a Commander program/command.
 */
export function registerImportCommand(program: Command): void {
  program
    .command('import')
    .description('Batch import field options from JSON/YAML file')
    .argument('<file>', 'Path to import file (.json, .yaml, .yml)')
    .option('--json', 'Output summary as JSON')
    .option('--yaml', 'Output summary as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('--project <id>', 'Import as project-specific options')
    .option('--merge', 'Skip existing values instead of failing on duplicates')
    .action(withErrorHandling(importAction));
}
