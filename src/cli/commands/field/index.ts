/**
 * Field Command Group (Stub - Phase 3)
 *
 * Will manage field catalogs: add options, list, remove.
 * Currently a placeholder showing planned subcommands.
 *
 * Planned Usage:
 *   meatycapture field add <field> <value>   Add option to field catalog
 *   meatycapture field list [field]          List field options
 *   meatycapture field remove <field> <id>   Remove field option
 */

import { Command } from 'commander';

/**
 * Creates and configures the field command group.
 *
 * Currently a stub that displays planned subcommands.
 * Will be fully implemented in Phase 3.
 */
export function createFieldCommand(): Command {
  const field = new Command('field')
    .description('Manage field catalogs (Phase 3)')
    .addHelpText(
      'after',
      `
Planned Subcommands (Phase 3):
  add <field> <value>   Add new option to a field catalog (type, domain, etc.)
  list [field]          List options for a field or all fields
  remove <field> <id>   Remove option from field catalog

Supported Fields:
  type      Item types (enhancement, bug, idea, etc.)
  domain    Domain areas (web, api, mobile, etc.)
  priority  Priority levels (low, medium, high, critical)
  status    Status values (triage, accepted, done, etc.)

Not yet implemented. See: docs/project_plans/implementation_plans/features/cli-v1.md
`
    )
    .action(() => {
      console.log('Field catalog management commands are planned for Phase 3.');
      console.log('');
      console.log('Planned subcommands:');
      console.log('  add <field> <value>   Add option to field catalog');
      console.log('  list [field]          List field options');
      console.log('  remove <field> <id>   Remove field option');
      console.log('');
      console.log('For current log operations, use: meatycapture log --help');
      process.exit(0);
    });

  return field;
}
