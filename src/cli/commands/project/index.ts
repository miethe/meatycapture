/**
 * Project Command Group (Stub - Phase 2)
 *
 * Will manage project configurations: add, remove, list, set-default.
 * Currently a placeholder showing planned subcommands.
 *
 * Planned Usage:
 *   meatycapture project add <name>        Add new project
 *   meatycapture project remove <id>       Remove project
 *   meatycapture project list              List all projects
 *   meatycapture project set-default <id>  Set default project
 */

import { Command } from 'commander';

/**
 * Creates and configures the project command group.
 *
 * Currently a stub that displays planned subcommands.
 * Will be fully implemented in Phase 2.
 */
export function createProjectCommand(): Command {
  const project = new Command('project')
    .description('Manage project configurations (Phase 2)')
    .addHelpText(
      'after',
      `
Planned Subcommands (Phase 2):
  add <name>          Add new project with prompts for configuration
  remove <id>         Remove project from registry
  list                List all registered projects
  set-default <id>    Set the default project for new documents

Not yet implemented. See: docs/project_plans/implementation_plans/features/cli-v1.md
`
    )
    .action(() => {
      console.log('Project management commands are planned for Phase 2.');
      console.log('');
      console.log('Planned subcommands:');
      console.log('  add <name>          Add new project');
      console.log('  remove <id>         Remove project from registry');
      console.log('  list                List all registered projects');
      console.log('  set-default <id>    Set default project');
      console.log('');
      console.log('For current log operations, use: meatycapture log --help');
      process.exit(0);
    });

  return project;
}
