/**
 * Config Command Group (Stub - Phase 4)
 *
 * Will manage global configuration: get, set, list, path.
 * Currently a placeholder showing planned subcommands.
 *
 * Planned Usage:
 *   meatycapture config get <key>     Get config value
 *   meatycapture config set <key>     Set config value
 *   meatycapture config list          List all config values
 *   meatycapture config path          Show config directory path
 */

import { Command } from 'commander';

/**
 * Creates and configures the config command group.
 *
 * Currently a stub that displays planned subcommands.
 * Will be fully implemented in Phase 4.
 */
export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage global configuration (Phase 4)')
    .addHelpText(
      'after',
      `
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
  MEATYCAPTURE_DEFAULT_PROJECT_PATH  Override default project path

Not yet implemented. See: docs/project_plans/implementation_plans/features/cli-v1.md
`
    )
    .action(() => {
      console.log('Configuration management commands are planned for Phase 4.');
      console.log('');
      console.log('Planned subcommands:');
      console.log('  get <key>     Get config value');
      console.log('  set <key>     Set config value');
      console.log('  list          List all config values');
      console.log('  path          Show config directory path');
      console.log('');
      console.log('For current log operations, use: meatycapture log --help');
      process.exit(0);
    });

  return config;
}
