/**
 * Config Show Command
 *
 * Displays current configuration and environment variable overrides.
 *
 * Features:
 * - Shows configuration directory path
 * - Shows config file locations (projects.json, fields.json)
 * - Shows default project (if set via env or from registry)
 * - Shows environment variable status (set/unset)
 * - Multiple output formats: human (default), JSON, YAML
 * - Quiet mode for scripting
 * - Convenience flag --config-dir for path-only output
 *
 * Exit codes:
 * - 0: Success (config show never fails)
 */

import type { Command } from 'commander';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { OutputFormat } from '@cli/formatters';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';
import { createProjectStore } from '@adapters/config-local';

/**
 * Configuration display structure.
 * Contains resolved paths and environment variable status.
 */
interface ConfigDisplay {
  config_dir: string;
  projects_file: string;
  fields_file: string;
  default_project: string | null;
  environment: {
    MEATYCAPTURE_CONFIG_DIR: string | null;
    MEATYCAPTURE_DEFAULT_PROJECT: string | null;
    MEATYCAPTURE_DEFAULT_PROJECT_PATH: string | null;
  };
}

/**
 * Command options for config show command.
 */
interface ShowOptions {
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
  configDir?: boolean;
}

/**
 * Determines output format from mutually exclusive flags.
 * Priority: json > yaml > human (default)
 */
function resolveOutputFormat(options: ShowOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Gets the configuration directory path.
 * Priority:
 * 1. MEATYCAPTURE_CONFIG_DIR environment variable
 * 2. Default: ~/.meatycapture/
 */
function getConfigDir(): string {
  return process.env['MEATYCAPTURE_CONFIG_DIR'] || join(homedir(), '.meatycapture');
}

/**
 * Gets the default project from environment or project registry.
 *
 * Priority:
 * 1. MEATYCAPTURE_DEFAULT_PROJECT environment variable
 * 2. First enabled project in registry
 * 3. null (no default set)
 */
async function getDefaultProject(): Promise<string | null> {
  // Check environment variable first
  const envDefault = process.env['MEATYCAPTURE_DEFAULT_PROJECT'];
  if (envDefault) {
    return envDefault;
  }

  // Try to get from project registry
  try {
    const projectStore = createProjectStore();
    const projects = await projectStore.list();
    const enabledProjects = projects.filter((p) => p.enabled);

    // Return first enabled project ID, or null if none
    return enabledProjects.length > 0 && enabledProjects[0] ? enabledProjects[0].id : null;
  } catch {
    // If we can't read projects (e.g., file doesn't exist), return null
    return null;
  }
}

/**
 * Collects current configuration data.
 */
async function getConfigData(): Promise<ConfigDisplay> {
  const configDir = getConfigDir();
  const defaultProject = await getDefaultProject();

  return {
    config_dir: configDir,
    projects_file: join(configDir, 'projects.json'),
    fields_file: join(configDir, 'fields.json'),
    default_project: defaultProject,
    environment: {
      MEATYCAPTURE_CONFIG_DIR: process.env['MEATYCAPTURE_CONFIG_DIR'] || null,
      MEATYCAPTURE_DEFAULT_PROJECT: process.env['MEATYCAPTURE_DEFAULT_PROJECT'] || null,
      MEATYCAPTURE_DEFAULT_PROJECT_PATH: process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'] || null,
    },
  };
}

/**
 * Formats configuration data for human-readable output.
 */
function formatHumanOutput(config: ConfigDisplay): string {
  const lines: string[] = [];

  lines.push('Configuration:');
  lines.push(`  Config Directory: ${config.config_dir}`);
  lines.push(`  Projects File:    ${config.projects_file}`);
  lines.push(`  Fields File:      ${config.fields_file}`);
  lines.push(`  Default Project:  ${config.default_project || '(not set)'}`);
  lines.push('');
  lines.push('Environment Variables:');
  lines.push(`  MEATYCAPTURE_CONFIG_DIR:            ${config.environment.MEATYCAPTURE_CONFIG_DIR || '(not set)'}`);
  lines.push(`  MEATYCAPTURE_DEFAULT_PROJECT:       ${config.environment.MEATYCAPTURE_DEFAULT_PROJECT || '(not set)'}`);
  lines.push(`  MEATYCAPTURE_DEFAULT_PROJECT_PATH:  ${config.environment.MEATYCAPTURE_DEFAULT_PROJECT_PATH || '(not set)'}`);

  return lines.join('\n');
}

/**
 * Formats configuration data as YAML.
 */
function formatYamlOutput(config: ConfigDisplay): string {
  const lines: string[] = [];

  lines.push('config_dir: ' + config.config_dir);
  lines.push('projects_file: ' + config.projects_file);
  lines.push('fields_file: ' + config.fields_file);
  lines.push('default_project: ' + (config.default_project || 'null'));
  lines.push('environment:');
  lines.push('  MEATYCAPTURE_CONFIG_DIR: ' + (config.environment.MEATYCAPTURE_CONFIG_DIR || 'null'));
  lines.push('  MEATYCAPTURE_DEFAULT_PROJECT: ' + (config.environment.MEATYCAPTURE_DEFAULT_PROJECT || 'null'));
  lines.push('  MEATYCAPTURE_DEFAULT_PROJECT_PATH: ' + (config.environment.MEATYCAPTURE_DEFAULT_PROJECT_PATH || 'null'));

  return lines.join('\n');
}

/**
 * Displays current configuration.
 *
 * Shows configuration directory path, config file locations,
 * default project setting, and environment variable status.
 *
 * Exit codes:
 * - 0: Success (always - config show never fails)
 */
export async function showAction(options: ShowOptions): Promise<void> {
  // Set quiet mode globally for formatters
  if (options.quiet) {
    setQuietMode(true);
  }

  // Handle --config-dir convenience flag (path-only output)
  if (options.configDir) {
    if (!isQuietMode()) {
      console.log(getConfigDir());
    }
    process.exit(ExitCodes.SUCCESS);
    return;
  }

  // Determine output format
  const format = resolveOutputFormat(options);

  // Collect configuration data
  const configData = await getConfigData();

  // Output based on format
  if (!isQuietMode()) {
    if (format === 'json') {
      console.log(JSON.stringify(configData, null, 2));
    } else if (format === 'yaml') {
      console.log(formatYamlOutput(configData));
    } else {
      // Human format
      console.log(formatHumanOutput(configData));
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the show command with a Commander program/command.
 */
export function registerShowCommand(program: Command): void {
  program
    .command('show')
    .description('Display current configuration and environment variables')
    .option('--json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .option('-q, --quiet', 'Suppress output')
    .option('--config-dir', 'Show only config directory path (convenience)')
    .action(withErrorHandling(showAction));
}
