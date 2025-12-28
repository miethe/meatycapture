/**
 * Log Command Group
 *
 * Manages request-log documents: create, append, list.
 * This is the primary command group for document operations.
 *
 * Usage:
 *   meatycapture log create <json-file>     Create new document
 *   meatycapture log append <doc> <json>    Append items to document
 *   meatycapture log list [project]         List documents
 */

import { Command } from 'commander';
import { registerCreateCommand } from './create';
import { registerAppendCommand } from './append';
import { registerListCommand } from './list';

/**
 * Creates and configures the log command group.
 *
 * Returns a Commander Command that can be added to the main program.
 * Registers all log subcommands (create, append, list).
 */
export function createLogCommand(): Command {
  const log = new Command('log')
    .description('Manage request-log documents')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture log create input.json           Create document from JSON
  meatycapture log create input.json -o out.md Create with custom output path
  meatycapture log append doc.md items.json    Append items to existing doc
  meatycapture log list                        List all documents
  meatycapture log list my-project             List documents for project
  meatycapture log list -p ./docs              List documents in directory
`
    );

  // Register all log subcommands
  registerCreateCommand(log);
  registerAppendCommand(log);
  registerListCommand(log);

  return log;
}

// Re-export individual command actions for backward compatibility aliases
export { createAction } from './create';
export { appendAction } from './append';
export { listAction } from './list';
