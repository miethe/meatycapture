/**
 * Config Init Command
 *
 * Initializes default configuration structure with sample project.
 *
 * Features:
 * - Creates ~/.meatycapture/ directory if missing
 * - Creates config.json with version and timestamps
 * - Creates projects.json with sample "meatycapture" project
 * - Creates fields.json with default field options (via auto-initialization)
 * - Custom config directory via --config-dir flag
 * - Force overwrite with --force flag
 * - Fails with exit code 3 if config exists without --force
 *
 * Exit codes:
 * - 0: Success
 * - 2: I/O error (permission denied, etc.)
 * - 3: Config already exists (without --force)
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import {
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';
import { createFieldCatalogStore } from '@adapters/config-local';

/**
 * Configuration file structure.
 * Stores global configuration values and metadata.
 */
interface ConfigFile {
  version: string;
  created_at: string;
  updated_at: string;
}

/**
 * Projects file structure for initialization.
 */
interface ProjectsFile {
  projects: Array<{
    id: string;
    name: string;
    default_path: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Command options for config init command.
 */
interface InitOptions {
  configDir?: string;
  force?: boolean;
  quiet?: boolean;
}

/**
 * Gets the configuration directory path.
 * Priority:
 * 1. --config-dir flag
 * 2. MEATYCAPTURE_CONFIG_DIR environment variable
 * 3. Default: ~/.meatycapture/
 */
function getConfigDir(options: InitOptions): string {
  if (options.configDir) {
    return options.configDir;
  }
  return process.env['MEATYCAPTURE_CONFIG_DIR'] || join(homedir(), '.meatycapture');
}

/**
 * Checks if configuration already exists.
 *
 * Considers config to exist if config.json file exists.
 *
 * @param configDir - Path to configuration directory
 * @returns true if config exists, false otherwise
 */
async function configExists(configDir: string): Promise<boolean> {
  const configFile = join(configDir, 'config.json');

  try {
    await fs.access(configFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the configuration directory.
 *
 * @param configDir - Path to configuration directory
 * @returns true if directory was created, false if it already existed
 */
async function createConfigDir(configDir: string): Promise<boolean> {
  try {
    await fs.access(configDir);
    return false; // Already exists
  } catch {
    // Doesn't exist - create it
    try {
      await fs.mkdir(configDir, { recursive: true });
      return true;
    } catch (error) {
      throw createError.permission(
        configDir,
        'write',
        `Cannot create config directory at ${configDir}`
      );
    }
  }
}

/**
 * Creates the default config.json file.
 *
 * @param configDir - Path to configuration directory
 */
async function createConfigFile(configDir: string): Promise<void> {
  const configFile = join(configDir, 'config.json');
  const now = new Date().toISOString();

  const config: ConfigFile = {
    version: '1.0.0',
    created_at: now,
    updated_at: now,
  };

  const content = JSON.stringify(config, null, 2);

  try {
    await fs.writeFile(configFile, content, 'utf-8');
  } catch (error) {
    throw createError.permission(
      configFile,
      'write',
      `Cannot write config file at ${configFile}`
    );
  }
}

/**
 * Creates the default projects.json file with sample project.
 *
 * @param configDir - Path to configuration directory
 */
async function createProjectsFile(configDir: string): Promise<void> {
  const projectsFile = join(configDir, 'projects.json');
  const now = new Date().toISOString();

  const projects: ProjectsFile = {
    projects: [
      {
        id: 'meatycapture',
        name: 'MeatyCapture',
        default_path: join(configDir, 'docs', 'meatycapture'),
        enabled: true,
        created_at: now,
        updated_at: now,
      },
    ],
  };

  const content = JSON.stringify(projects, null, 2);

  try {
    await fs.writeFile(projectsFile, content, 'utf-8');
  } catch (error) {
    throw createError.permission(
      projectsFile,
      'write',
      `Cannot write projects file at ${projectsFile}`
    );
  }
}

/**
 * Creates the default fields.json file by triggering store initialization.
 *
 * The LocalFieldCatalogStore automatically initializes with DEFAULT_FIELD_OPTIONS
 * on first access, so we just need to trigger a read operation.
 *
 * @param configDir - Path to configuration directory
 */
async function createFieldsFile(configDir: string): Promise<void> {
  const fieldStore = createFieldCatalogStore(configDir);

  // Trigger initialization by reading global fields
  // This will create fields.json if it doesn't exist
  await fieldStore.getGlobal();
}

/**
 * Removes existing configuration files.
 *
 * Used when --force flag is provided to overwrite existing config.
 *
 * @param configDir - Path to configuration directory
 */
async function removeExistingConfig(configDir: string): Promise<void> {
  const files = ['config.json', 'projects.json', 'fields.json'];

  for (const file of files) {
    const filePath = join(configDir, file);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors - file might not exist
    }
  }
}

/**
 * Initializes default configuration structure.
 *
 * Creates:
 * 1. Configuration directory (~/.meatycapture/)
 * 2. config.json with version and timestamps
 * 3. projects.json with sample "meatycapture" project
 * 4. fields.json with default field options
 *
 * Exit codes:
 * - 0: Success
 * - 2: I/O error (permission denied, etc.)
 * - 3: Config already exists (without --force)
 */
export async function initAction(options: InitOptions): Promise<void> {
  // Set quiet mode globally for formatters
  if (options.quiet) {
    setQuietMode(true);
  }

  const configDir = getConfigDir(options);

  // Check if config already exists
  const exists = await configExists(configDir);

  if (exists && !options.force) {
    // Config exists and --force not provided
    throw createError.generic(
      `Configuration already exists at ${configDir}`,
      ExitCodes.RESOURCE_CONFLICT,
      'Use --force to overwrite existing configuration'
    );
  }

  // Start initialization
  if (!isQuietMode()) {
    console.log('Initializing MeatyCapture configuration...');
  }

  // Remove existing config if --force
  if (exists && options.force) {
    await removeExistingConfig(configDir);
  }

  // Track what was created for reporting
  const created: string[] = [];

  // 1. Create config directory
  const dirCreated = await createConfigDir(configDir);
  if (dirCreated) {
    created.push(configDir + '/');
  }

  // 2. Create config.json
  await createConfigFile(configDir);
  created.push(join(configDir, 'config.json'));

  // 3. Create projects.json
  await createProjectsFile(configDir);
  created.push(join(configDir, 'projects.json'));

  // 4. Create fields.json (via store initialization)
  await createFieldsFile(configDir);
  created.push(join(configDir, 'fields.json'));

  // Report results
  if (!isQuietMode()) {
    for (const path of created) {
      console.log(`Created: ${path}`);
    }
    console.log('✓ Configuration initialized successfully');
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Registers the init command with a Commander program/command.
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize default configuration')
    .option('--config-dir <path>', 'Use custom config directory')
    .option('--force', 'Overwrite existing configuration')
    .option('-q, --quiet', 'Suppress output')
    .action(withErrorHandling(initAction));
}
