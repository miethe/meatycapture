/**
 * Project Set-Default Command
 *
 * Sets the default project in CLI configuration for new documents.
 * Validates that project exists before updating config.
 *
 * Features:
 * - Validates project ID exists in registry
 * - Updates ~/.meatycapture/config.json
 * - Multiple output formats: human (default), JSON, YAML
 * - Quiet mode for scripting
 *
 * Exit codes:
 * - 0: Success (default project set)
 * - 3: Resource not found (project doesn't exist)
 */

import type { Command } from 'commander';
import yaml from 'yaml';
import {
  setDefaultProject,
  getConfig,
} from '@cli/handlers/project.js';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Command options for project set-default command.
 */
interface SetDefaultOptions {
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > human (default)
 */
function resolveOutputFormat(options: SetDefaultOptions): 'human' | 'json' | 'yaml' {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Sets the default project in CLI configuration.
 *
 * Validates that project exists, then updates config.json with the
 * default_project setting. Outputs confirmation in requested format.
 *
 * Exit codes:
 * - 0: Success (default project set)
 * - 3: Resource not found (project doesn't exist)
 */
export async function setDefaultAction(
  id: string,
  options: SetDefaultOptions
): Promise<void> {
  // Set quiet mode globally
  if (options.quiet) {
    setQuietMode(true);
  }

  // Determine output format
  const format = resolveOutputFormat(options);

  // Validate and set default project (throws ResourceNotFoundError if not found)
  const project = await setDefaultProject(id);

  // Get updated config for output
  const config = await getConfig();

  // Output in requested format
  if (!isQuietMode()) {
    if (format === 'json') {
      console.log(JSON.stringify(config, null, 2));
    } else if (format === 'yaml') {
      console.log(yaml.stringify(config));
    } else {
      // Human format (default)
      console.log(`✓ Default project set to "${project.name}" (${project.id})`);
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the set-default command with a Commander program/command.
 */
export function registerSetDefaultCommand(program: Command): void {
  program
    .command('set-default')
    .description('Set the default project for new documents')
    .argument('<id>', 'Project ID to set as default')
    .option('--json', 'Output config as JSON')
    .option('--yaml', 'Output config as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(withErrorHandling(setDefaultAction));
}
