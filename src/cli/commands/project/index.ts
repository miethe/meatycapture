/**
 * Project Command Group
 *
 * Manages project configurations: add, remove, list, enable, disable, update, set-default.
 *
 * Usage:
 *   meatycapture project list              List all registered projects
 *   meatycapture project enable <id>       Enable a project
 *   meatycapture project disable <id>      Disable a project
 *   meatycapture project update <id>       Update project configuration
 *   meatycapture project add <name>        Add new project (Phase 2)
 *   meatycapture project remove <id>       Remove project (Phase 2)
 *   meatycapture project set-default <id>  Set default project (Phase 2)
 */

import { Command } from 'commander';
import { registerListCommand } from './list.js';
import { registerEnableCommand } from './enable.js';
import { registerDisableCommand } from './disable.js';
import { registerUpdateCommand } from './update.js';
import { registerAddCommand } from './add.js';
import { registerSetDefaultCommand } from './set-default.js';

/**
 * Creates and configures the project command group.
 *
 * Phase 2 implementation with list, enable, disable, update, add, and set-default subcommands active.
 * Additional subcommands (remove) coming in later phases.
 */
export function createProjectCommand(): Command {
  const project = new Command('project')
    .description('Manage project configurations')
    .addHelpText(
      'after',
      `
Available Subcommands:
  list                List all registered projects
  add <name> <path>   Create a new project in the registry
  enable <id>         Enable a project
  disable <id>        Disable a project
  update <id>         Update project configuration
  set-default <id>    Set the default project for new documents

Planned Subcommands:
  remove <id>         Remove project from registry

Examples:
  meatycapture project list              List all projects
  meatycapture project list --json       Output as JSON
  meatycapture project list --enabled-only  Show only enabled projects
  meatycapture project add "My Project" "/path/to/docs"
  meatycapture project add "API" "/docs" --id api --repo-url https://github.com/user/repo
  meatycapture project enable my-project Enable a project
  meatycapture project disable my-project Disable a project
  meatycapture project update my-project --name "New Name"
  meatycapture project update my-project --path /new/path
`
    );

  // Register implemented subcommands
  registerListCommand(project);
  registerAddCommand(project);
  registerEnableCommand(project);
  registerDisableCommand(project);
  registerUpdateCommand(project);
  registerSetDefaultCommand(project);

  return project;
}
