/**
 * Config Command Group (Phase 4)
 *
 * Manages global configuration: init, show, get, set, list, path.
 *
 * Subcommands:
 *   meatycapture config init          Initialize default configuration (implemented)
 *   meatycapture config show          Display current configuration (implemented)
 *   meatycapture config set <key>     Set config value (implemented)
 *   meatycapture config get <key>     Get config value (planned)
 *   meatycapture config list          List all config values (planned)
 *   meatycapture config path          Show config directory path (planned)
 */

import { Command } from 'commander';
import { registerInitCommand } from './init.js';
import { registerShowCommand } from './show.js';
import { registerSetCommand } from './set.js';

/**
 * Creates and configures the config command group.
 *
 * Implements Phase 4 configuration management commands.
 * Currently includes: init, show, set commands.
 */
export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage global configuration (Phase 4)')
    .addHelpText(
      'after',
      `
Subcommands:
  init              Initialize default configuration
  show              Display current configuration and environment variables
  set <key> <val>   Set a configuration value

Planned Subcommands (Phase 4):
  get <key>     Get a configuration value
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
  registerInitCommand(config);
  registerShowCommand(config);
  registerSetCommand(config);

  return config;
}
