#!/usr/bin/env node
/**
 * MeatyCapture CLI
 *
 * Headless batch document creation and management for request-log documents.
 * Provides commands for creating, appending, and listing documents without UI.
 *
 * Command Groups:
 * - log       Manage request-log documents (create, append, list)
 * - project   Manage project configurations (Phase 2)
 * - field     Manage field catalogs (Phase 3)
 * - config    Manage global configuration (Phase 4)
 *
 * Backward Compatibility:
 * The following flat commands are aliased to their nested equivalents:
 * - create  -> log create
 * - append  -> log append
 * - list    -> log list
 *
 * JSON Input Format:
 * {
 *   "project": "my-project",
 *   "title": "Optional document title",
 *   "items": [
 *     {
 *       "title": "Item title",
 *       "type": "enhancement",
 *       "domain": "web",
 *       "context": "Additional context",
 *       "priority": "medium",
 *       "status": "triage",
 *       "tags": ["tag1", "tag2"],
 *       "notes": "Problem/goal description"
 *     }
 *   ]
 * }
 */

import { Command } from 'commander';

// Command group factories
import { createLogCommand, createAction, appendAction, listAction } from './commands/log';
import { createProjectCommand } from './commands/project';
import { createFieldCommand } from './commands/field';
import { createConfigCommand } from './commands/config';

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('meatycapture')
  .description(
    'Headless batch document creation for MeatyCapture request-logs\n\n' +
      'Command Groups:\n' +
      '  log       Manage request-log documents\n' +
      '  project   Manage project configurations (Phase 2)\n' +
      '  field     Manage field catalogs (Phase 3)\n' +
      '  config    Manage global configuration (Phase 4)'
  )
  .version('0.1.0')
  .addHelpText(
    'after',
    `
Examples:
  meatycapture log create input.json     Create new document from JSON
  meatycapture log append doc.md in.json Append items to existing document
  meatycapture log list my-project       List documents for a project
  meatycapture create input.json         Alias for: log create
  meatycapture --help                    Show this help message

For command group help:
  meatycapture log --help
  meatycapture project --help
  meatycapture field --help
  meatycapture config --help
`
  );

// ============================================================================
// Register Command Groups
// ============================================================================

program.addCommand(createLogCommand());
program.addCommand(createProjectCommand());
program.addCommand(createFieldCommand());
program.addCommand(createConfigCommand());

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================
// These flat commands maintain backward compatibility with the original CLI.
// They are aliases for the nested subcommands under the 'log' group.

program
  .command('create')
  .description('Create a new request-log document (alias for: log create)')
  .argument('<json-file>', 'Path to JSON input file')
  .option('-o, --output <path>', 'Output path for the document (default: auto-generated)')
  .action(createAction);

program
  .command('append')
  .description('Append items to an existing document (alias for: log append)')
  .argument('<doc-path>', 'Path to existing document')
  .argument('<json-file>', 'Path to JSON input file with items to append')
  .action(appendAction);

program
  .command('list')
  .description('List request-log documents (alias for: log list)')
  .argument('[project]', 'Project identifier (optional)')
  .option('-p, --path <path>', 'Custom path to search for documents')
  .action(listAction);

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse();
