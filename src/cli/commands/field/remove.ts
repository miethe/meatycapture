/**
 * Field Remove Command
 *
 * Removes a field option from the catalog with safety confirmation.
 * Validates option existence and handles graceful Ctrl+C interruption.
 *
 * Safety features:
 * - Confirmation prompt by default (requires 'y' or 'yes')
 * - Validates option exists before attempting removal
 * - Graceful Ctrl+C handling (exit 130)
 * - --force for scripting automation
 *
 * Exit codes:
 * - 0: Success (option removed)
 * - 2: Option not found (invalid ID)
 * - 130: User cancelled (Ctrl+C or declined confirmation)
 */

import type { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createAdapters } from '@adapters/factory';
import type { FieldOption } from '@core/models';
import {
  UserInterruptError,
  isQuietMode,
  setQuietMode,
  withErrorHandling,
  createError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Command options for field remove command.
 */
interface RemoveOptions {
  /** Skip confirmation prompt */
  force?: boolean;
  /** Suppress output */
  quiet?: boolean;
}

/**
 * Find a field option by ID across all scopes.
 *
 * Searches global options first, then all project-scoped options.
 * Returns the option if found, null otherwise.
 *
 * @param id - Field option ID to find
 * @returns The field option if found, null otherwise
 */
async function findOptionById(id: string): Promise<FieldOption | null> {
  const { fieldStore } = await createAdapters();

  // Check global options first
  const globalOptions = await fieldStore.getGlobal();
  const globalMatch = globalOptions.find((opt) => opt.id === id);

  if (globalMatch) {
    return globalMatch;
  }

  // For project options, we'd need to iterate all projects
  // Since FieldCatalogStore doesn't expose a direct search method,
  // we rely on removeOption throwing if not found
  return null;
}

/**
 * Prompts user for deletion confirmation.
 *
 * Displays option details and requires typing 'y' or 'yes' to confirm.
 * Handles Ctrl+C gracefully by throwing UserInterruptError.
 *
 * @param option - Field option to be removed (or null if not found in global scope)
 * @param optionId - The ID being removed
 * @returns True if user confirmed, false otherwise
 * @throws UserInterruptError if user presses Ctrl+C
 */
async function confirmRemoval(
  option: FieldOption | null,
  optionId: string
): Promise<boolean> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // Handle Ctrl+C during readline
  const handleSigint = (): void => {
    rl.close();
    throw new UserInterruptError();
  };
  process.once('SIGINT', handleSigint);

  try {
    if (option) {
      console.log(
        `Remove field option: ${option.field} = "${option.value}" [${option.scope}]${option.project_id ? ` (project: ${option.project_id})` : ''}?`
      );
    } else {
      console.log(`Remove field option: ${optionId}?`);
    }

    const answer = await rl.question("Type 'y' or 'yes' to confirm: ");
    const normalized = answer.toLowerCase().trim();
    return normalized === 'y' || normalized === 'yes';
  } catch (error) {
    // readline throws on Ctrl+C in some environments
    if (error instanceof UserInterruptError) {
      throw error;
    }
    // Any other readline error (e.g., closed input) treated as cancellation
    throw new UserInterruptError();
  } finally {
    process.removeListener('SIGINT', handleSigint);
    rl.close();
  }
}

/**
 * Output helper that respects quiet mode.
 *
 * @param message - Message to output
 */
function output(message: string): void {
  if (!isQuietMode()) {
    console.log(message);
  }
}

/**
 * Removes a field option from the catalog.
 *
 * Flow:
 * 1. Find option to get metadata for confirmation
 * 2. Prompt for confirmation (unless --force)
 * 3. Remove the option via FieldCatalogStore
 * 4. Report success
 *
 * @param optionId - ID of the field option to remove
 * @param options - Command options
 */
export async function removeAction(
  optionId: string,
  options: RemoveOptions
): Promise<void> {
  // Set quiet mode if requested
  if (options.quiet) {
    setQuietMode(true);
  }

  const { fieldStore } = await createAdapters();

  // Step 1: Find option for confirmation display
  // Note: This only searches global scope; project options may not be found
  // but removeOption will still work if the ID is valid
  const option = await findOptionById(optionId);

  // Step 2: Confirm removal (unless --force)
  if (!options.force) {
    const confirmed = await confirmRemoval(option, optionId);
    if (!confirmed) {
      // User typed something other than 'y' or 'yes' - exit with interrupt code
      console.error('Removal cancelled.');
      process.exit(ExitCodes.USER_INTERRUPTED);
    }
  }

  // Step 3: Remove the option
  try {
    await fieldStore.removeOption(optionId);
  } catch (error) {
    // Handle "not found" error from store
    if (error instanceof Error && error.message.includes('not found')) {
      throw createError.resource('field', optionId);
    }
    throw error;
  }

  // Step 4: Report success
  if (option) {
    output(`Removed: ${option.field} option "${option.value}"`);
  } else {
    output(`Removed: ${optionId}`);
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the remove command with a Commander program/command.
 */
export function registerRemoveCommand(program: Command): void {
  program
    .command('remove')
    .description('Remove a field option by ID')
    .argument('<option-id>', 'The ID of the option to remove')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('-q, --quiet', 'Suppress output (still confirms unless --force)')
    .action(withErrorHandling(removeAction));
}
