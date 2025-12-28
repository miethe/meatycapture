/**
 * Config Set Command
 *
 * Sets configuration values with validation.
 *
 * Features:
 * - Set configuration key-value pairs
 * - Validates key is recognized (default_project for MVP)
 * - Validates value (project must exist for default_project)
 * - Creates config.json if it doesn't exist
 * - Updates existing config with new value
 * - Quiet mode for scripting
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (invalid key)
 * - 4: Resource not found (project doesn't exist)
 */

import type { Command } from 'commander';
import { createConfigStore, createAdapters } from '@adapters/factory';
import type { ConfigKey } from '@core/models';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Command options for config set command.
 */
interface SetOptions {
  quiet?: boolean;
}

/**
 * Valid configuration keys that can be set.
 * Used for validation and error messages.
 */
const VALID_KEYS: ConfigKey[] = ['default_project', 'api_url'];

/**
 * Validates that the provided key is a recognized configuration key.
 * Throws ValidationError if key is not in VALID_KEYS.
 */
function validateKey(key: string): asserts key is ConfigKey {
  if (!VALID_KEYS.includes(key as ConfigKey)) {
    throw createError.validation(
      `Unknown configuration key: ${key}`,
      `Valid keys: ${VALID_KEYS.join(', ')}`
    );
  }
}

/**
 * Validates the value for a specific configuration key.
 *
 * For 'default_project': validates that the project exists in the registry.
 * For 'api_url': validates URL format and protocol (http/https only).
 * Throws ValidationError or ResourceNotFoundError if validation fails.
 */
async function validateValue(key: ConfigKey, value: string): Promise<void> {
  if (key === 'default_project') {
    const { projectStore } = await createAdapters();
    const project = await projectStore.get(value);

    if (!project) {
      throw createError.resource(
        'project',
        value,
        "Run 'meatycapture project list' to see available projects"
      );
    }
  } else if (key === 'api_url') {
    // Allow empty string to clear the api_url
    if (value === '' || value.toLowerCase() === 'null' || value.toLowerCase() === 'none') {
      return; // Empty value is valid - will clear the setting
    }
    // Validate URL format
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw createError.validation(
          `Invalid URL protocol: ${url.protocol}`,
          'Use http:// or https:// protocol'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid URL')) {
        throw createError.validation(
          `Invalid URL format: ${value}`,
          "Use a valid URL like http://localhost:3737, or '' to clear"
        );
      }
      // Re-throw validation errors from above
      throw error;
    }
  }
}

/**
 * Sets a configuration value.
 *
 * Validates inputs, updates the configuration in the store, and displays
 * a success message in the requested format.
 *
 * Exit codes:
 * - 0: Success
 * - 1: Validation error (invalid key)
 * - 4: Resource not found (project doesn't exist)
 */
export async function setAction(
  key: string,
  value: string,
  options: SetOptions
): Promise<void> {
  // Set quiet mode globally for formatters
  if (options.quiet) {
    setQuietMode(true);
  }

  // Validate key is recognized
  validateKey(key);

  // Validate value is appropriate for the key
  await validateValue(key, value);

  // Get config store
  const configStore = createConfigStore();

  // Set the configuration value
  await configStore.set(key, value);

  // Display success message
  if (!isQuietMode()) {
    console.log(`Set ${key} = ${value}`);
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the set command with a Commander program/command.
 */
export function registerSetCommand(program: Command): void {
  program
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key to set')
    .argument('<value>', 'Configuration value')
    .option('-q, --quiet', 'Suppress non-error output')
    .addHelpText(
      'after',
      `
Configuration Keys:
  default_project    Set the default project for new documents
  api_url           Set the API server URL for remote mode

Examples:
  meatycapture config set default_project my-app
  meatycapture config set api_url http://localhost:3737
  meatycapture config set api_url https://meatycapture.example.com
  meatycapture config set api_url ''        # Clear API URL (switch to local mode)
  meatycapture config set default_project another-project --quiet

Notes:
  - For 'default_project', the project must exist in the registry
  - For 'api_url', must be a valid http:// or https:// URL
  - Use '', 'null', or 'none' to clear the api_url setting
  - Use 'meatycapture project list' to see available projects
  - Creates config.json if it doesn't exist
  - API URL can also be set via MEATYCAPTURE_API_URL environment variable
`
    )
    .action(withErrorHandling(setAction));
}
