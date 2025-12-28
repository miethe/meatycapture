/**
 * Project Enable Command
 *
 * Enables a project by setting its enabled field to true.
 * Idempotent - succeeds if project is already enabled.
 *
 * Features:
 * - Updates project enabled status to true
 * - Updates updated_at timestamp automatically via store
 * - Multiple output formats: human (default), JSON, YAML
 * - Quiet mode for scripting
 *
 * Exit codes:
 * - 0: Success (project enabled or already enabled)
 * - 3: Project not found
 */

import type { Command } from 'commander';
import { createProjectStore } from '@adapters/config-local';
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
 * Command options for project enable command.
 */
interface EnableOptions {
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > human (default)
 */
function resolveOutputFormat(options: EnableOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Enables a project by ID.
 *
 * Sets the project's enabled field to true. If the project is already enabled,
 * succeeds without modification (idempotent).
 *
 * Exit codes:
 * - 0: Success (project enabled or already enabled)
 * - 3: Project not found
 *
 * @param id - Project identifier (slug format)
 * @param options - Command options
 */
export async function enableAction(
  id: string,
  options: EnableOptions
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

  // Get project from store
  const projectStore = createProjectStore();
  const project = await projectStore.get(id);

  if (!project) {
    if (!isQuietMode()) {
      console.error(`Error: Project not found: ${id}`);
    }
    process.exit(ExitCodes.RESOURCE_NOT_FOUND);
    return;
  }

  // Check if already enabled
  const wasEnabled = project.enabled;

  // Update project (idempotent - will update even if already enabled)
  const updated = await projectStore.update(id, { enabled: true });

  // Output result based on format
  if (!isQuietMode()) {
    if (format === 'json' || format === 'yaml') {
      // JSON/YAML: output the updated project
      const output = formatOutput(updated, formatOptions);
      if (output) {
        console.log(output);
      }
    } else {
      // Human format: success message
      const statusMsg = wasEnabled ? 'is already enabled' : 'enabled';
      console.log(`✓ Project "${updated.name}" (${updated.id}) ${statusMsg}`);
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the enable command with a Commander program/command.
 */
export function registerEnableCommand(program: Command): void {
  program
    .command('enable')
    .description('Enable a project')
    .argument('<id>', 'Project ID to enable')
    .option('--json', 'Output updated project as JSON')
    .option('--yaml', 'Output updated project as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(withErrorHandling(enableAction));
}
