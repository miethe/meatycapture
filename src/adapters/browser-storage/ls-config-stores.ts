/**
 * Browser localStorage Configuration Adapter
 *
 * Web-specific implementation using localStorage API.
 * Manages projects and field catalogs via localStorage in the browser.
 *
 * Features:
 * - Browser localStorage access (no filesystem required)
 * - Configuration stored in localStorage with namespaced keys
 * - Auto-initialization with DEFAULT_FIELD_OPTIONS
 * - Project and field catalog management with timestamps
 * - Synchronous localStorage wrapped in Promises for interface compatibility
 *
 * @example
 * ```typescript
 * import { createBrowserProjectStore, createBrowserFieldCatalogStore } from '@adapters/browser-storage/ls-config-stores';
 *
 * const projectStore = createBrowserProjectStore();
 * const projects = await projectStore.list();
 *
 * const fieldStore = createBrowserFieldCatalogStore();
 * const options = await fieldStore.getGlobal();
 * ```
 */

import type { ProjectStore, FieldCatalogStore } from '@core/ports';
import type { Project, FieldOption, FieldName } from '@core/models';
import { DEFAULT_FIELD_OPTIONS } from '@core/models';
import { slugify } from '@core/validation';

/**
 * localStorage key for projects data.
 * Namespaced to avoid conflicts with other applications.
 */
const PROJECTS_KEY = 'meatycapture_projects';

/**
 * localStorage key for fields data.
 * Namespaced to avoid conflicts with other applications.
 */
const FIELDS_KEY = 'meatycapture_fields';

// ============================================================================
// ProjectStore Implementation
// ============================================================================

/**
 * Projects JSON structure in localStorage.
 * Matches the Tauri adapter format for consistency.
 */
interface ProjectsData {
  projects: Project[];
}

/**
 * Browser localStorage implementation of ProjectStore.
 *
 * Stores projects in localStorage under the key 'meatycapture_projects'.
 * Automatically generates IDs using slugify and manages timestamps.
 * All operations are synchronous wrapped in Promises for interface compatibility.
 *
 * @example
 * ```typescript
 * import { createBrowserProjectStore } from '@adapters/browser-storage/ls-config-stores';
 *
 * const store = createBrowserProjectStore();
 * const projects = await store.list();
 * const project = await store.create({
 *   name: 'My Project',
 *   default_path: '/path/to/docs',
 *   enabled: true
 * });
 * ```
 */
export class BrowserProjectStore implements ProjectStore {
  /**
   * Reads projects from localStorage.
   *
   * Returns empty array if no data exists yet.
   * Deserializes Date objects from JSON strings.
   *
   * @returns Array of all projects
   */
  private readProjects(): Project[] {
    try {
      const data = localStorage.getItem(PROJECTS_KEY);
      if (!data) {
        if (import.meta.env.DEV) {
          console.warn('[BrowserProjectStore] No projects found in localStorage');
        }
        return [];
      }

      const parsed = JSON.parse(data) as ProjectsData;

      // Deserialize Date objects
      return parsed.projects.map((p) => ({
        ...p,
        created_at: new Date(p.created_at),
        updated_at: new Date(p.updated_at),
      }));
    } catch (error) {
      throw new Error(
        `Failed to read projects from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Writes projects to localStorage.
   *
   * Serializes data as JSON before storing.
   *
   * @param projects - Array of projects to write
   */
  private writeProjects(projects: Project[]): void {
    try {
      const data: ProjectsData = { projects };
      const serialized = JSON.stringify(data, null, 2);
      localStorage.setItem(PROJECTS_KEY, serialized);
    } catch (error) {
      throw new Error(
        `Failed to write projects to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Lists all projects.
   *
   * @returns Array of all projects (enabled and disabled)
   */
  async list(): Promise<Project[]> {
    return Promise.resolve(this.readProjects());
  }

  /**
   * Gets a single project by ID.
   *
   * @param id - Project identifier (slug format)
   * @returns Project if found, null otherwise
   */
  async get(id: string): Promise<Project | null> {
    const projects = this.readProjects();
    return Promise.resolve(projects.find((p) => p.id === id) || null);
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
    const projects = this.readProjects();

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
    this.writeProjects(projects);

    return Promise.resolve(newProject);
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
    const projects = this.readProjects();
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
    this.writeProjects(projects);

    return Promise.resolve(updated);
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
    const projects = this.readProjects();
    const index = projects.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Project not found: ${id}`);
    }

    projects.splice(index, 1);
    this.writeProjects(projects);

    return Promise.resolve();
  }
}

// ============================================================================
// FieldCatalogStore Implementation
// ============================================================================

/**
 * Fields JSON structure in localStorage.
 * Matches the Tauri adapter format for consistency.
 */
interface FieldsData {
  global: FieldOption[];
  projects: Record<string, FieldOption[]>;
}

/**
 * Browser localStorage implementation of FieldCatalogStore.
 *
 * Stores field options in localStorage under the key 'meatycapture_fields'.
 * Manages both global and project-scoped field options.
 * Initializes with DEFAULT_FIELD_OPTIONS on first access.
 * All operations are synchronous wrapped in Promises for interface compatibility.
 *
 * @example
 * ```typescript
 * import { createBrowserFieldCatalogStore } from '@adapters/browser-storage/ls-config-stores';
 *
 * const store = createBrowserFieldCatalogStore();
 * const globalOptions = await store.getGlobal();
 * const projectOptions = await store.getForProject('my-project');
 * await store.addOption({
 *   field: 'type',
 *   value: 'spike',
 *   scope: 'global'
 * });
 * ```
 */
export class BrowserFieldCatalogStore implements FieldCatalogStore {
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
   * Reads fields data from localStorage.
   *
   * Initializes with DEFAULT_FIELD_OPTIONS if no data exists.
   * Deserializes Date objects from JSON strings.
   *
   * @returns Fields data structure
   */
  private readFields(): FieldsData {
    try {
      const data = localStorage.getItem(FIELDS_KEY);
      if (!data) {
        if (import.meta.env.DEV) {
          console.warn('[BrowserFieldCatalogStore] No fields found in localStorage, initializing with defaults');
        }
        // No data exists - initialize with defaults
        return this.initializeDefaults();
      }

      const parsed = JSON.parse(data) as FieldsData;

      // Deserialize Date objects in global options
      parsed.global = parsed.global.map((opt) => ({
        ...opt,
        created_at: new Date(opt.created_at),
      }));

      // Deserialize Date objects in project options
      for (const projectId in parsed.projects) {
        const projectOptions = parsed.projects[projectId];
        if (projectOptions) {
          parsed.projects[projectId] = projectOptions.map((opt) => ({
            ...opt,
            created_at: new Date(opt.created_at),
          }));
        }
      }

      return parsed;
    } catch (error) {
      throw new Error(
        `Failed to read fields from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Initializes fields data with DEFAULT_FIELD_OPTIONS.
   *
   * Creates global options for type, priority, and status.
   * Writes the initial data to localStorage.
   *
   * @returns Initialized fields data structure
   */
  private initializeDefaults(): FieldsData {
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

    const data: FieldsData = {
      global,
      projects: {},
    };

    this.writeFields(data);
    return data;
  }

  /**
   * Writes fields data to localStorage.
   *
   * Serializes data as JSON before storing.
   *
   * @param data - Fields data structure to write
   */
  private writeFields(data: FieldsData): void {
    try {
      const serialized = JSON.stringify(data, null, 2);
      localStorage.setItem(FIELDS_KEY, serialized);
    } catch (error) {
      throw new Error(
        `Failed to write fields to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    const data = this.readFields();
    return Promise.resolve(data.global);
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
    const data = this.readFields();
    const projectOptions = data.projects[projectId] || [];

    // Merge global and project options
    return Promise.resolve([...data.global, ...projectOptions]);
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
      return Promise.resolve(allOptions.filter((opt) => opt.field === field));
    }

    const data = this.readFields();
    return Promise.resolve(data.global.filter((opt) => opt.field === field));
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
    const data = this.readFields();

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

    this.writeFields(data);
    return Promise.resolve(newOption);
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
    const data = this.readFields();

    // Try to remove from global options
    const globalIndex = data.global.findIndex((opt) => opt.id === id);
    if (globalIndex !== -1) {
      data.global.splice(globalIndex, 1);
      this.writeFields(data);
      return Promise.resolve();
    }

    // Try to remove from project options
    for (const projectId in data.projects) {
      const projectOptions = data.projects[projectId];
      if (!projectOptions) continue;

      const projectIndex = projectOptions.findIndex((opt) => opt.id === id);
      if (projectIndex !== -1) {
        projectOptions.splice(projectIndex, 1);
        this.writeFields(data);
        return Promise.resolve();
      }
    }

    throw new Error(`Field option not found: ${id}`);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Singleton instance of BrowserProjectStore.
 * Ensures consistent state across multiple calls to createBrowserProjectStore().
 */
let projectStoreInstance: ProjectStore | null = null;

/**
 * Singleton instance of BrowserFieldCatalogStore.
 * Ensures consistent state across multiple calls to createBrowserFieldCatalogStore().
 */
let fieldCatalogStoreInstance: FieldCatalogStore | null = null;

/**
 * Creates or returns the singleton BrowserProjectStore instance.
 *
 * Uses singleton pattern to ensure all parts of the application
 * share the same store instance and localStorage state.
 *
 * @returns The singleton BrowserProjectStore instance
 *
 * @example
 * ```typescript
 * const store = createBrowserProjectStore();
 * const projects = await store.list();
 * ```
 */
export function createBrowserProjectStore(): ProjectStore {
  if (!projectStoreInstance) {
    projectStoreInstance = new BrowserProjectStore();
  }
  return projectStoreInstance;
}

/**
 * Creates or returns the singleton BrowserFieldCatalogStore instance.
 *
 * Uses singleton pattern to ensure all parts of the application
 * share the same store instance and localStorage state.
 *
 * @returns The singleton BrowserFieldCatalogStore instance
 *
 * @example
 * ```typescript
 * const store = createBrowserFieldCatalogStore();
 * const options = await store.getGlobal();
 * ```
 */
export function createBrowserFieldCatalogStore(): FieldCatalogStore {
  if (!fieldCatalogStoreInstance) {
    fieldCatalogStoreInstance = new BrowserFieldCatalogStore();
  }
  return fieldCatalogStoreInstance;
}
