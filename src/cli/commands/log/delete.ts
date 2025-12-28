/**
 * Log Delete Command
 *
 * Deletes a request-log document with confirmation and backup safety.
 * Provides --force for scripting and --no-backup for advanced users.
 *
 * Safety features:
 * - Confirmation prompt by default (requires 'yes')
 * - Backup creation before deletion (default behavior)
 * - Graceful Ctrl+C handling (exit 130)
 */

import type { Command } from 'commander';
import { resolve, basename } from 'node:path';
import { promises as fs } from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createFsDocStore } from '@adapters/fs-local';
import type { RequestLogDoc } from '@core/models';
import {
  FileNotFoundError,
  UserInterruptError,
  isQuietMode,
  withErrorHandling,
} from '@cli/handlers';
import { ExitCodes } from '@cli/handlers/exitCodes';

/**
 * Command options for delete command.
 */
interface DeleteOptions {
  /** Skip confirmation prompt */
  force?: boolean;
  /** Create backup before deletion (default true, --no-backup sets to false) */
  backup: boolean;
  /** Suppress output */
  quiet?: boolean;
}

/**
 * Prompts user for deletion confirmation.
 *
 * Displays document info and requires typing 'yes' to confirm.
 * Handles Ctrl+C gracefully by throwing UserInterruptError.
 *
 * @param doc - Document to be deleted
 * @param willBackup - Whether a backup will be created
 * @returns True if user confirmed with 'yes', false otherwise
 * @throws UserInterruptError if user presses Ctrl+C
 */
async function confirmDelete(doc: RequestLogDoc, willBackup: boolean): Promise<boolean> {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  // Handle Ctrl+C during readline
  const handleSigint = (): void => {
    rl.close();
    throw new UserInterruptError();
  };
  process.once('SIGINT', handleSigint);

  try {
    console.log(`Are you sure you want to delete ${doc.doc_id}?`);
    console.log(`This document contains ${doc.item_count} item(s).${willBackup ? ' A backup will be created.' : ''}`);

    const answer = await rl.question("Type 'yes' to confirm: ");
    return answer.toLowerCase().trim() === 'yes';
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
 */
function output(message: string): void {
  if (!isQuietMode()) {
    console.log(message);
  }
}

/**
 * Deletes a request-log document.
 *
 * Flow:
 * 1. Read document to verify it exists and get metadata
 * 2. Prompt for confirmation (unless --force)
 * 3. Create backup (unless --no-backup)
 * 4. Delete the file
 * 5. Report success with backup path if applicable
 *
 * @param docPath - Path to document to delete
 * @param options - Command options
 */
export async function deleteAction(docPath: string, options: DeleteOptions): Promise<void> {
  const resolvedPath = resolve(docPath);
  const docStore = createFsDocStore();

  // Step 1: Read document (verifies existence and gets metadata for confirmation)
  let doc: RequestLogDoc;
  try {
    doc = await docStore.read(resolvedPath);
  } catch (error) {
    // Check if it's a file not found error
    if (error instanceof Error && error.message.includes('not found')) {
      throw new FileNotFoundError(resolvedPath, 'Check the path and try again');
    }
    throw error;
  }

  // Step 2: Confirm deletion (unless --force)
  if (!options.force) {
    const confirmed = await confirmDelete(doc, options.backup);
    if (!confirmed) {
      // User typed something other than 'yes' - exit with interrupt code
      console.error('Deletion cancelled.');
      process.exit(ExitCodes.USER_INTERRUPTED);
    }
  }

  // Step 3: Create backup (unless --no-backup)
  let backupPath: string | undefined;
  if (options.backup) {
    backupPath = await docStore.backup(resolvedPath);
  }

  // Step 4: Delete the file
  await fs.unlink(resolvedPath);

  // Step 5: Report success
  const fileName = basename(resolvedPath);
  output(`Deleted: ${fileName}`);
  if (backupPath) {
    output(`  Backup: ${backupPath}`);
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the delete command with a Commander program/command.
 */
export function registerDeleteCommand(program: Command): void {
  program
    .command('delete')
    .description('Delete a request-log document')
    .argument('<doc-path>', 'Path to the document to delete')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--no-backup', "Don't create backup before deletion")
    .option('-q, --quiet', 'Suppress output (still confirms unless --force)')
    .action(
      withErrorHandling(async (docPath: string, options: DeleteOptions) => {
        // Set quiet mode if requested
        if (options.quiet) {
          const { setQuietMode } = await import('@cli/handlers');
          setQuietMode(true);
        }
        await deleteAction(docPath, options);
      })
    );
}
