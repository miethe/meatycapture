/**
 * Field Command Group
 *
 * Manages field catalog options: list, add, remove, import.
 * Field catalogs provide configurable dropdown/select values for item fields.
 *
 * Usage:
 *   meatycapture field list               List all field options
 *   meatycapture field list --field type  List options for specific field
 *   meatycapture field add <field> <value>   Add option to field catalog (Phase 3)
 *   meatycapture field remove <id>           Remove field option (Phase 3)
 *   meatycapture field import <json-file>    Batch import field options (Phase 3)
 */

import { Command } from 'commander';
import { registerListCommand } from './list.js';
import { registerAddCommand } from './add.js';
import { registerRemoveCommand } from './remove.js';
import { registerImportCommand } from './import.js';

/**
 * Creates and configures the field command group.
 *
 * Phase 3 Tasks:
 * - 3.1: list command implemented
 * - 3.2: add command implemented
 * - 3.3: remove command implemented
 * - 3.4: import command implemented
 */
export function createFieldCommand(): Command {
  const field = new Command('field')
    .description('Manage field catalogs')
    .addHelpText(
      'after',
      `
Available Subcommands:
  list                  List field options (global or project-specific)
  add <field> <value>   Add new option to a field catalog (type, domain, etc.)
  remove <id>           Remove option from field catalog
  import <file>         Batch import field options from JSON/YAML file

Supported Fields:
  type      Item types (enhancement, bug, idea, task, question)
  domain    Domain areas (web, api, mobile, cli, infra, etc.)
  context   Context information (user-facing, internal, etc.)
  priority  Priority levels (low, medium, high, critical)
  status    Status values (triage, backlog, planned, in-progress, done, wontfix)
  tags      Freeform tags for categorization

Examples:
  meatycapture field list                    # List all global field options
  meatycapture field list --field type       # List only type field options
  meatycapture field list --project my-proj  # Show effective options for project
  meatycapture field list --json             # Output as JSON
  meatycapture field add type spike          # Add new type option
  meatycapture field remove type-spike-123   # Remove a field option
`
    );

  // Register implemented subcommands
  registerListCommand(field);
  registerAddCommand(field);
  registerRemoveCommand(field);
  registerImportCommand(field);

  return field;
}
