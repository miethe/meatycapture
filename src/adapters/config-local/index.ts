/**
 * Local Configuration Adapter
 *
 * Manages projects and field catalogs via JSON files:
 * - projects.json: Project registry
 * - fields.json: Global + project-scoped field options
 * - Default path: ~/.meatycapture/
 * - Environment variable overrides
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { ConfigStore, ProjectStore, FieldCatalogStore } from '@core/ports';
import type { AppConfig, ConfigKey, Project, FieldOption, FieldName } from '@core/models';
import { DEFAULT_FIELD_OPTIONS } from '@core/models';
import { slugify } from '@core/validation';

/**
 * Configuration directory path resolution.
 *
 * Priority:
 * 1. MEATYCAPTURE_CONFIG_DIR environment variable
 * 2. Default: ~/.meatycapture/
 *
 * @returns Absolute path to the configuration directory
 */
function getConfigDir(): string {
  return process.env['MEATYCAPTURE_CONFIG_DIR'] || join(homedir(), '.meatycapture');
}

/**
 * Ensures the configuration directory exists.
 *
 * Creates the directory with recursive: true if it doesn't exist.
 * This is called before any read/write operations on config files.
 *
 * @param configDir - Path to the configuration directory
 */
async function ensureConfigDir(configDir: string): Promise<void> {
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create config directory ${configDir}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// ConfigStore Implementation
// ============================================================================

/**
 * Application configuration file structure.
 */
interface ConfigFile {
  version: string;
  default_project?: string;
  api_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Local filesystem implementation of ConfigStore.
 *
 * Stores application configuration in a JSON file at ~/.meatycapture/config.json
 * Automatically initializes with defaults on first access.
 *
 * @example
 * ```typescript
 * import { createConfigStore } from '@adapters/config-local';
 *
 * const store = createConfigStore();
 * const config = await store.get();
 * const updated = await store.set('default_project', 'my-project');
 * ```
 */
export class LocalConfigStore implements ConfigStore {
  private readonly configDir: string;
  private readonly configFile: string;
  private static readonly CURRENT_VERSION = '1.0.0';

  constructor(configDir?: string) {
    this.configDir = configDir || getConfigDir();
    this.configFile = join(this.configDir, 'config.json');
  }

  /**
   * Reads the config file from disk.
   *
   * Returns default config if file doesn't exist yet.
   * Creates config directory if needed.
   *
   * @returns Application configuration
   */
  private async readConfig(): Promise<AppConfig> {
    await ensureConfigDir(this.configDir);

    try {
      const content = await fs.readFile(this.configFile, 'utf-8');
      const data = JSON.parse(content) as ConfigFile;

      // Deserialize Date objects
      const config: AppConfig = {
        version: data.version,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };

      // Conditionally add optional properties
      if (data.default_project !== undefined) {
        config.default_project = data.default_project;
      }
      if (data.api_url !== undefined) {
        config.api_url = data.api_url;
      }

      return config;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist yet - return default config without writing
        const now = new Date();
        return {
          version: LocalConfigStore.CURRENT_VERSION,
          created_at: now,
          updated_at: now,
        };
      }
      throw new Error(
        `Failed to read config file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Writes config to disk.
   *
   * @param config - Application configuration to write
   */
  private async writeConfig(config: AppConfig): Promise<void> {
    await ensureConfigDir(this.configDir);

    const data: ConfigFile = {
      version: config.version,
      created_at: config.created_at.toISOString(),
      updated_at: config.updated_at.toISOString(),
    };

    // Conditionally add optional properties
    if (config.default_project !== undefined) {
      data.default_project = config.default_project;
    }
    if (config.api_url !== undefined) {
      data.api_url = config.api_url;
    }

    const content = JSON.stringify(data, null, 2);

    try {
      await fs.writeFile(this.configFile, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write config file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets the current application configuration.
   *
   * Returns default config if file doesn't exist yet.
   * Does not create the file until first set() call.
   *
   * @returns Current application configuration
   */
  async get(): Promise<AppConfig> {
    return this.readConfig();
  }

  /**
   * Sets a configuration value.
   *
   * Automatically updates the updated_at timestamp.
   * Creates the config file if it doesn't exist.
   *
   * @param key - Configuration key to set
   * @param value - Configuration value
   * @returns Updated application configuration
   */
  async set(key: ConfigKey, value: string): Promise<AppConfig> {
    const config = await this.readConfig();

    // Update the specified key
    if (key === 'default_project') {
      config.default_project = value;
    } else if (key === 'api_url') {
      config.api_url = value;
    }

    // Update timestamp
    config.updated_at = new Date();

    // Write to disk
    await this.writeConfig(config);

    return config;
  }

  /**
   * Checks if configuration file exists.
   *
   * @returns true if config file exists, false otherwise
   */
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.configFile);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// ProjectStore Implementation
// ============================================================================

/**
 * Projects JSON file structure.
 */
interface ProjectsFile {
  projects: Project[];
}

/**
 * Local filesystem implementation of ProjectStore.
 *
 * Stores projects in a JSON file at ~/.meatycapture/projects.json
 * Automatically generates IDs using slugify and manages timestamps.
 *
 * @example
 * ```typescript
 * import { createProjectStore } from '@adapters/config-local';
 *
 * const store = createProjectStore();
 * const projects = await store.list();
 * const project = await store.create({
 *   name: 'My Project',
 *   default_path: '/path/to/docs',
 *   enabled: true
 * });
 * ```
 */
export class LocalProjectStore implements ProjectStore {
  private readonly configDir: string;
  private readonly projectsFile: string;

  constructor(configDir?: string) {
    this.configDir = configDir || getConfigDir();
    this.projectsFile = join(this.configDir, 'projects.json');
  }

  /**
   * Reads the projects file from disk.
   *
   * Returns empty array if file doesn't exist yet.
   * Creates config directory if needed.
   *
   * @returns Array of all projects
   */
  private async readProjects(): Promise<Project[]> {
    await ensureConfigDir(this.configDir);

    try {
      const content = await fs.readFile(this.projectsFile, 'utf-8');
      const data = JSON.parse(content) as ProjectsFile;

      // Deserialize Date objects
      return data.projects.map((p) => ({
        ...p,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at),
      }));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist yet
        return [];
      }
      throw new Error(
        `Failed to read projects file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Writes projects to disk.
   *
   * @param projects - Array of projects to write
   */
  private async writeProjects(projects: Project[]): Promise<void> {
    await ensureConfigDir(this.configDir);

    const data: ProjectsFile = { projects };
    const content = JSON.stringify(data, null, 2);

    try {
      await fs.writeFile(this.projectsFile, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write projects file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Lists all projects.
   *
   * @returns Array of all projects (enabled and disabled)
   */
  async list(): Promise<Project[]> {
    return this.readProjects();
  }

  /**
   * Gets a single project by ID.
   *
   * @param id - Project identifier (slug format)
   * @returns Project if found, null otherwise
   */
  async get(id: string): Promise<Project | null> {
    const projects = await this.readProjects();
    return projects.find((p) => p.id === id) || null;
  }

  /**
   * Creates a new project.
   *
   * Automatically generates:
   * - ID from name using slugify
   * - created_at timestamp
   * - updated_at timestamp
   *
   * @param project - Project data without generated fields
   * @returns Newly created project with all fields populated
   * @throws Error if a project with the generated ID already exists
   */
  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const projects = await this.readProjects();

    // Generate ID from name
    const id = slugify(project.name);
    if (!id) {
      throw new Error(`Invalid project name: cannot generate ID from "${project.name}"`);
    }

    // Check for duplicate ID
    if (projects.some((p) => p.id === id)) {
      throw new Error(`Project with ID "${id}" already exists`);
    }

    // Create new project with generated fields
    const now = new Date();
    const newProject: Project = {
      ...project,
      id,
      created_at: now,
      updated_at: now,
    };

    // Add to projects array and write
    projects.push(newProject);
    await this.writeProjects(projects);

    return newProject;
  }

  /**
   * Updates an existing project.
   *
   * Automatically updates the updated_at timestamp.
   *
   * @param id - Project identifier
   * @param updates - Partial project data to merge
   * @returns Updated project
   * @throws Error if project not found
   */
  async update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Project> {
    const projects = await this.readProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Project not found: ${id}`);
    }

    const existing = projects[index];
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    // Merge updates and set updated_at
    const updated: Project = {
      ...existing,
      ...updates,
      id, // Ensure ID is not changed
      created_at: existing.created_at, // Preserve creation timestamp
      updated_at: new Date(),
    };

    projects[index] = updated;
    await this.writeProjects(projects);

    return updated;
  }

  /**
   * Deletes a project.
   *
   * Note: Does not cascade delete field options or documents.
   *
   * @param id - Project identifier
   * @throws Error if project not found
   */
  async delete(id: string): Promise<void> {
    const projects = await this.readProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Project not found: ${id}`);
    }

    projects.splice(index, 1);
    await this.writeProjects(projects);
  }
}

// ============================================================================
// FieldCatalogStore Implementation
// ============================================================================

/**
 * Fields JSON file structure.
 */
interface FieldsFile {
  global: FieldOption[];
  projects: Record<string, FieldOption[]>;
}

/**
 * Local filesystem implementation of FieldCatalogStore.
 *
 * Stores field options in a JSON file at ~/.meatycapture/fields.json
 * Manages both global and project-scoped field options.
 * Initializes with DEFAULT_FIELD_OPTIONS on first access.
 *
 * @example
 * ```typescript
 * import { createFieldCatalogStore } from '@adapters/config-local';
 *
 * const store = createFieldCatalogStore();
 * const globalOptions = await store.getGlobal();
 * const projectOptions = await store.getForProject('my-project');
 * await store.addOption({
 *   field: 'type',
 *   value: 'spike',
 *   scope: 'global'
 * });
 * ```
 */
export class LocalFieldCatalogStore implements FieldCatalogStore {
  private readonly configDir: string;
  private readonly fieldsFile: string;

  constructor(configDir?: string) {
    this.configDir = configDir || getConfigDir();
    this.fieldsFile = join(this.configDir, 'fields.json');
  }

  /**
   * Generates a unique ID for a field option.
   *
   * Format: {field}-{value-slug}-{timestamp}
   * Example: type-enhancement-1701619200000
   *
   * @param field - Field name
   * @param value - Field value
   * @returns Generated ID
   */
  private generateOptionId(field: string, value: string): string {
    const valueSlug = slugify(value);
    const timestamp = Date.now();
    return `${field}-${valueSlug}-${timestamp}`;
  }

  /**
   * Reads the fields file from disk.
   *
   * Initializes with DEFAULT_FIELD_OPTIONS if file doesn't exist.
   *
   * @returns Fields file data
   */
  private async readFields(): Promise<FieldsFile> {
    await ensureConfigDir(this.configDir);

    try {
      const content = await fs.readFile(this.fieldsFile, 'utf-8');
      const data = JSON.parse(content) as FieldsFile;

      // Deserialize Date objects in global options
      data.global = data.global.map((opt) => ({
        ...opt,
        created_at: new Date(opt.created_at),
      }));

      // Deserialize Date objects in project options
      for (const projectId in data.projects) {
        const projectOptions = data.projects[projectId];
        if (projectOptions) {
          data.projects[projectId] = projectOptions.map((opt) => ({
            ...opt,
            created_at: new Date(opt.created_at),
          }));
        }
      }

      return data;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist - initialize with defaults
        return this.initializeDefaults();
      }
      throw new Error(
        `Failed to read fields file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Initializes the fields file with DEFAULT_FIELD_OPTIONS.
   *
   * Creates global options for type, priority, and status.
   * Writes the initial data to disk.
   *
   * @returns Initialized fields file data
   */
  private async initializeDefaults(): Promise<FieldsFile> {
    const now = new Date();
    const global: FieldOption[] = [];

    // Create global options from DEFAULT_FIELD_OPTIONS
    for (const [field, values] of Object.entries(DEFAULT_FIELD_OPTIONS)) {
      for (const value of values) {
        global.push({
          id: this.generateOptionId(field, value),
          field: field as FieldName,
          value,
          scope: 'global',
          created_at: now,
        });
      }
    }

    const data: FieldsFile = {
      global,
      projects: {},
    };

    await this.writeFields(data);
    return data;
  }

  /**
   * Writes fields data to disk.
   *
   * @param data - Fields file data to write
   */
  private async writeFields(data: FieldsFile): Promise<void> {
    await ensureConfigDir(this.configDir);

    const content = JSON.stringify(data, null, 2);

    try {
      await fs.writeFile(this.fieldsFile, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write fields file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets all global field options.
   *
   * Returns only options with scope='global'.
   *
   * @returns Array of global field options across all fields
   */
  async getGlobal(): Promise<FieldOption[]> {
    const data = await this.readFields();
    return data.global;
  }

  /**
   * Gets effective field options for a specific project.
   *
   * Returns merged set: global options + project-specific options.
   * This is the resolved view that UI components should use.
   *
   * @param projectId - Project identifier
   * @returns Array of all applicable field options for the project
   */
  async getForProject(projectId: string): Promise<FieldOption[]> {
    const data = await this.readFields();
    const projectOptions = data.projects[projectId] || [];

    // Merge global and project options
    return [...data.global, ...projectOptions];
  }

  /**
   * Gets options for a specific field, optionally filtered by project.
   *
   * If projectId is provided, returns global + project-specific options
   * for that field. Otherwise, returns only global options for the field.
   *
   * @param field - Field name (type, domain, context, priority, status, tags)
   * @param projectId - Optional project ID for project-specific filtering
   * @returns Array of field options for the specified field
   */
  async getByField(field: FieldName, projectId?: string): Promise<FieldOption[]> {
    if (projectId) {
      const allOptions = await this.getForProject(projectId);
      return allOptions.filter((opt) => opt.field === field);
    }

    const data = await this.readFields();
    return data.global.filter((opt) => opt.field === field);
  }

  /**
   * Adds a new field option (global or project-scoped).
   *
   * Automatically generates ID and created_at timestamp.
   *
   * @param option - Field option data without generated fields
   * @returns Newly created field option with all fields populated
   * @throws Error if project_id required but missing (when scope='project')
   * @throws Error if duplicate option exists for the same field/value/scope combination
   */
  async addOption(option: Omit<FieldOption, 'id' | 'created_at'>): Promise<FieldOption> {
    const data = await this.readFields();

    // Validate project scope requirements
    if (option.scope === 'project' && !option.project_id) {
      throw new Error('project_id is required for project-scoped options');
    }

    // Generate ID and timestamp
    const newOption: FieldOption = {
      ...option,
      id: this.generateOptionId(option.field, option.value),
      created_at: new Date(),
    };

    // Add to appropriate scope
    if (option.scope === 'global') {
      // Check for duplicates in global scope
      const duplicate = data.global.find(
        (opt) => opt.field === option.field && opt.value === option.value
      );
      if (duplicate) {
        throw new Error(`Global option already exists for ${option.field}: ${option.value}`);
      }

      data.global.push(newOption);
    } else if (option.scope === 'project' && option.project_id) {
      // Initialize project options array if needed
      if (!data.projects[option.project_id]) {
        data.projects[option.project_id] = [];
      }

      const projectOptions = data.projects[option.project_id];
      if (!projectOptions) {
        throw new Error(`Failed to initialize project options for ${option.project_id}`);
      }

      // Check for duplicates in project scope
      const duplicate = projectOptions.find(
        (opt) => opt.field === option.field && opt.value === option.value
      );
      if (duplicate) {
        throw new Error(`Project option already exists for ${option.field}: ${option.value}`);
      }

      projectOptions.push(newOption);
    }

    await this.writeFields(data);
    return newOption;
  }

  /**
   * Removes a field option by ID.
   *
   * Searches both global and project-scoped options.
   *
   * @param id - Field option identifier
   * @throws Error if option not found
   */
  async removeOption(id: string): Promise<void> {
    const data = await this.readFields();

    // Try to remove from global options
    const globalIndex = data.global.findIndex((opt) => opt.id === id);
    if (globalIndex !== -1) {
      data.global.splice(globalIndex, 1);
      await this.writeFields(data);
      return;
    }

    // Try to remove from project options
    for (const projectId in data.projects) {
      const projectOptions = data.projects[projectId];
      if (!projectOptions) continue;

      const projectIndex = projectOptions.findIndex((opt) => opt.id === id);
      if (projectIndex !== -1) {
        projectOptions.splice(projectIndex, 1);
        await this.writeFields(data);
        return;
      }
    }

    throw new Error(`Field option not found: ${id}`);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new ConfigStore instance.
 *
 * @param configDir - Optional custom config directory (defaults to ~/.meatycapture)
 * @returns A new LocalConfigStore instance
 *
 * @example
 * ```typescript
 * const store = createConfigStore();
 * const config = await store.get();
 * ```
 */
export function createConfigStore(configDir?: string): ConfigStore {
  return new LocalConfigStore(configDir);
}

/**
 * Creates a new ProjectStore instance.
 *
 * @param configDir - Optional custom config directory (defaults to ~/.meatycapture)
 * @returns A new LocalProjectStore instance
 *
 * @example
 * ```typescript
 * const store = createProjectStore();
 * const projects = await store.list();
 * ```
 */
export function createProjectStore(configDir?: string): ProjectStore {
  return new LocalProjectStore(configDir);
}

/**
 * Creates a new FieldCatalogStore instance.
 *
 * @param configDir - Optional custom config directory (defaults to ~/.meatycapture)
 * @returns A new LocalFieldCatalogStore instance
 *
 * @example
 * ```typescript
 * const store = createFieldCatalogStore();
 * const options = await store.getGlobal();
 * ```
 */
export function createFieldCatalogStore(configDir?: string): FieldCatalogStore {
  return new LocalFieldCatalogStore(configDir);
}
