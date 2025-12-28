/**
 * Project Command Handlers
 *
 * Shared validation and utility functions for project commands.
 * Provides reusable logic for ID validation, path validation, and error handling.
 * Also manages CLI configuration (config.json) for default project settings.
 *
 * Used by:
 * - project add: Validate new project data
 * - project remove: Validate project exists before deletion
 * - project set-default: Validate project selection and update config
 *
 * Configuration file structure:
 * ```json
 * {
 *   "default_project": "project-id"
 * }
 * ```
 *
 * Location: ~/.meatycapture/config.json
 * Environment override: MEATYCAPTURE_CONFIG_DIR
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { slugify } from '@core/validation';
import { createError } from './errors.js';
import { createProjectStore } from '@adapters/config-local';
import type { Project } from '@core/models';

/**
 * Validates that a custom project ID follows kebab-case format.
 *
 * Kebab-case rules:
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start or end with a hyphen
 * - No consecutive hyphens
 * - Must have at least one character
 *
 * @param id - The project ID to validate
 * @throws ValidationError if ID is invalid
 *
 * @example
 * ```typescript
 * validateProjectId('my-project');    // ✓ Valid
 * validateProjectId('my-project-2');  // ✓ Valid
 * validateProjectId('My-Project');    // ✗ Throws (uppercase)
 * validateProjectId('-my-project');   // ✗ Throws (starts with hyphen)
 * validateProjectId('my--project');   // ✗ Throws (consecutive hyphens)
 * validateProjectId('my_project');    // ✗ Throws (underscore)
 * ```
 */
export function validateProjectId(id: string): void {
  // Check if empty
  if (!id || id.trim() === '') {
    throw createError.validation(
      'Project ID cannot be empty',
      'Provide a valid kebab-case ID (e.g., my-project)'
    );
  }

  // Check kebab-case pattern
  const kebabPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!kebabPattern.test(id)) {
    throw createError.validation(
      `Invalid project ID format: "${id}"`,
      'Use kebab-case: lowercase letters, numbers, and single hyphens only (e.g., my-project)'
    );
  }

  // Additional safety: ensure no path traversal characters
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    throw createError.validation(
      `Project ID contains invalid characters: "${id}"`,
      'Use only lowercase letters, numbers, and hyphens'
    );
  }
}

/**
 * Validates that a path exists and is a directory.
 *
 * @param path - The filesystem path to validate
 * @throws ValidationError if path doesn't exist
 * @throws PermissionError if path is not readable
 *
 * @example
 * ```typescript
 * await validatePathExists('/valid/path');        // ✓ Valid
 * await validatePathExists('/nonexistent/path');  // ✗ Throws ValidationError
 * await validatePathExists('/no-access/path');    // ✗ Throws PermissionError
 * ```
 */
export async function validatePathExists(path: string): Promise<void> {
  // Node.js errors are automatically mapped to appropriate CliError types
  // ENOENT → FileNotFoundError (exit 2)
  // EACCES/EPERM → PermissionError (exit 2)
  const stats = await fs.stat(path);
  if (!stats.isDirectory()) {
    throw createError.validation(
      `Path is not a directory: ${path}`,
      'Provide a valid directory path for project documents'
    );
  }
}

/**
 * Validates that a path is writable by attempting to access it with write permissions.
 *
 * @param path - The filesystem path to validate
 * @throws PermissionError if path is not writable
 *
 * @example
 * ```typescript
 * await validatePathWritable('/writable/path');     // ✓ Valid
 * await validatePathWritable('/readonly/path');     // ✗ Throws PermissionError
 * ```
 */
export async function validatePathWritable(path: string): Promise<void> {
  // fs.constants.W_OK = 2 (write permission)
  // EACCES/EPERM errors automatically mapped to PermissionError
  await fs.access(path, fs.constants.W_OK);
}

/**
 * Generates a project ID from a project name using slugify.
 *
 * This is used when no custom ID is provided. The generated ID is guaranteed
 * to be kebab-case and suitable for use as a project identifier.
 *
 * @param name - The project name
 * @returns Generated kebab-case ID
 * @throws ValidationError if name cannot generate a valid ID
 *
 * @example
 * ```typescript
 * generateProjectIdFromName('My Project')        // 'my-project'
 * generateProjectIdFromName('Project 2.0')       // 'project-20'
 * generateProjectIdFromName('Special!@# Chars')  // 'special-chars'
 * generateProjectIdFromName('   ')               // Throws ValidationError
 * ```
 */
export function generateProjectIdFromName(name: string): string {
  const id = slugify(name);

  if (!id) {
    throw createError.validation(
      `Cannot generate ID from project name: "${name}"`,
      'Use a name with letters or numbers (e.g., "My Project")'
    );
  }

  return id;
}

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * CLI configuration structure.
 *
 * Stored in ~/.meatycapture/config.json
 * Contains user preferences and defaults.
 */
export interface Config {
  /**
   * Default project ID for new documents.
   * Must reference an existing project in projects.json
   */
  default_project?: string;
}

/**
 * Get configuration directory path.
 *
 * Priority:
 * 1. MEATYCAPTURE_CONFIG_DIR environment variable
 * 2. Default: ~/.meatycapture/
 *
 * @returns Absolute path to configuration directory
 */
export function getConfigDir(): string {
  return process.env['MEATYCAPTURE_CONFIG_DIR'] || join(homedir(), '.meatycapture');
}

/**
 * Get configuration file path.
 *
 * @returns Absolute path to config.json
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * Ensure configuration directory exists.
 *
 * Creates the directory with recursive: true if it doesn't exist.
 * Called before any config file operations.
 *
 * @throws Error if directory creation fails
 */
async function ensureConfigDir(): Promise<void> {
  const configDir = getConfigDir();
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create config directory ${configDir}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Read configuration from config.json.
 *
 * Returns empty config object if file doesn't exist.
 * Creates config directory if needed.
 *
 * @returns Configuration object
 * @throws Error if file exists but cannot be read or parsed
 */
export async function getConfig(): Promise<Config> {
  await ensureConfigDir();

  const configPath = getConfigPath();

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as Config;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist yet - return empty config
      return {};
    }
    throw new Error(
      `Failed to read config file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Write configuration to config.json.
 *
 * Creates file and directory if they don't exist.
 * Formats JSON with 2-space indentation.
 *
 * @param config - Configuration object to write
 * @throws Error if write operation fails
 */
export async function setConfig(config: Config): Promise<void> {
  await ensureConfigDir();

  const configPath = getConfigPath();
  const content = JSON.stringify(config, null, 2);

  try {
    await fs.writeFile(configPath, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write config file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Set default project in configuration.
 *
 * Validates that project exists before updating config.
 * Updates config.json with new default_project value.
 *
 * @param projectId - Project ID to set as default
 * @returns The validated project object
 * @throws ResourceNotFoundError if project doesn't exist
 * @throws Error if config write fails
 *
 * @example
 * ```typescript
 * const project = await setDefaultProject('my-project');
 * console.log(`Default set to: ${project.name}`);
 * ```
 */
export async function setDefaultProject(projectId: string): Promise<Project> {
  // Validate project exists
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectId);

  if (!project) {
    throw createError.resource(
      'project',
      projectId,
      "Run 'meatycapture project list' to see available projects"
    );
  }

  // Update config
  const config = await getConfig();
  config.default_project = projectId;
  await setConfig(config);

  return project;
}

/**
 * Get default project from configuration.
 *
 * Returns null if no default is set or if the default project
 * no longer exists in the registry.
 *
 * @returns Default project or null
 *
 * @example
 * ```typescript
 * const defaultProject = await getDefaultProject();
 * if (defaultProject) {
 *   console.log(`Default: ${defaultProject.name}`);
 * }
 * ```
 */
export async function getDefaultProject(): Promise<Project | null> {
  const config = await getConfig();

  if (!config.default_project) {
    return null;
  }

  // Verify project still exists
  const projectStore = createProjectStore();
  return projectStore.get(config.default_project);
}
