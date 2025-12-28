/**
 * Config Command Group (Phase 4)
 *
 * Manages global configuration: show, get, set, list, path.
 *
 * Subcommands:
 *   meatycapture config show          Display current configuration (implemented)
 *   meatycapture config get <key>     Get config value (planned)
 *   meatycapture config set <key>     Set config value (planned)
 *   meatycapture config list          List all config values (planned)
 *   meatycapture config path          Show config directory path (planned)
 */

import { Command } from 'commander';
import { registerShowCommand } from './show.js';

/**
 * Creates and configures the config command group.
 *
 * Implements Phase 4 configuration management commands.
 * Currently includes: show command.
 */
export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage global configuration (Phase 4)')
    .addHelpText(
      'after',
      `
Subcommands:
  show          Display current configuration and environment variables

Planned Subcommands (Phase 4):
  get <key>     Get a configuration value
  set <key>     Set a configuration value (interactive)
  list          List all configuration values
  path          Show configuration directory path

Configuration Keys:
  default_project       Default project for new documents
  config_dir            Configuration directory location
  backup_enabled        Enable/disable automatic backups

Environment Variables:
  MEATYCAPTURE_CONFIG_DIR            Override config directory
  MEATYCAPTURE_DEFAULT_PROJECT       Override default project
  MEATYCAPTURE_DEFAULT_PROJECT_PATH  Override default project path
`
    );

  // Register subcommands
  registerShowCommand(config);

  return config;
}
