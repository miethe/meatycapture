/**
 * Project Update Command
 *
 * Updates an existing project's configuration in the MeatyCapture registry.
 * Allows updating name, path, and repo URL with validation.
 *
 * Features:
 * - Update one or more project fields (name, path, repo-url)
 * - Path validation (existence and writability)
 * - Multiple output formats: human (default), JSON, YAML
 * - Quiet mode for scripting
 * - Automatic updated_at timestamp handling
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (no fields specified, invalid path)
 * - 3: Project not found (ResourceNotFoundError)
 */

import type { Command } from 'commander';
import { createProjectStore } from '@adapters/config-local';
import { createFsDocStore } from '@adapters/fs-local';
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
  createError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Command options for project update command.
 */
interface UpdateOptions {
  name?: string;
  path?: string;
  repoUrl?: string;
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > human (default)
 */
function resolveOutputFormat(options: UpdateOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Validates that at least one update field is provided.
 * Throws ValidationError if no fields are specified.
 */
function validateUpdateFields(options: UpdateOptions): void {
  const hasUpdates = Boolean(options.name || options.path || options.repoUrl);

  if (!hasUpdates) {
    throw createError.validation(
      'At least one field must be specified for update',
      'Use --name, --path, or --repo-url to specify updates'
    );
  }
}

/**
 * Validates that a path exists and is writable.
 * Throws ValidationError if path is invalid.
 */
async function validatePath(path: string): Promise<void> {
  const docStore = createFsDocStore();
  const isWritable = await docStore.isWritable(path);

  if (!isWritable) {
    throw createError.validation(
      `Path is not writable: ${path}`,
      'Ensure the directory exists and you have write permissions'
    );
  }
}

/**
 * Updates an existing project's configuration.
 *
 * Validates inputs, updates the project in the store, and displays
 * the updated project in the requested format.
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (no fields specified, invalid path)
 * - 3: Project not found (ResourceNotFoundError)
 */
export async function updateAction(
  id: string,
  options: UpdateOptions
): Promise<void> {
  // Set quiet mode globally for formatters
  if (options.quiet) {
    setQuietMode(true);
  }

  // Validate that at least one field is provided
  validateUpdateFields(options);

  // Validate path if provided
  if (options.path) {
    await validatePath(options.path);
  }

  // Get project store
  const projectStore = createProjectStore();

  // Check if project exists
  const existingProject = await projectStore.get(id);
  if (!existingProject) {
    throw createError.resource(
      'project',
      id,
      "Run 'meatycapture project list' to see available projects"
    );
  }

  // Build update object with only specified fields
  const updates: Partial<Pick<Project, 'name' | 'default_path' | 'repo_url'>> = {};

  if (options.name !== undefined) {
    updates.name = options.name;
  }

  if (options.path !== undefined) {
    updates.default_path = options.path;
  }

  if (options.repoUrl !== undefined) {
    updates.repo_url = options.repoUrl;
  }

  // Update project in store (store handles updated_at timestamp)
  const updatedProject = await projectStore.update(id, updates);

  // Determine output format
  const format = resolveOutputFormat(options);
  const formatOptions: FormatOptions = {
    format,
    quiet: options.quiet ?? false,
    color: process.stdout.isTTY,
  };

  // Format and output updated project
  if (!isQuietMode()) {
    // For human format, show success message before project details
    if (format === 'human') {
      console.log(`Project '${id}' updated successfully.\n`);
    }

    const output = formatOutput(updatedProject, formatOptions);
    if (output) {
      console.log(output);
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the update command with a Commander program/command.
 */
export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('Update an existing project configuration')
    .argument('<id>', 'Project ID to update')
    .option('--name <name>', 'Update project name')
    .option('--path <path>', 'Update default document path')
    .option('--repo-url <url>', 'Update repository URL')
    .option('--json', 'Output updated project as JSON')
    .option('--yaml', 'Output updated project as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture project update my-project --name "New Name"
  meatycapture project update my-project --path /new/path
  meatycapture project update my-project --name "Updated" --path ~/docs
  meatycapture project update my-project --repo-url https://github.com/user/repo
  meatycapture project update my-project --json

Notes:
  - At least one update field (--name, --path, --repo-url) is required
  - Path validation ensures the directory exists and is writable
  - The updated_at timestamp is automatically updated
`
    )
    .action(withErrorHandling(updateAction));
}
