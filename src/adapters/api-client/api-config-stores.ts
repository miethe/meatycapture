/**
 * API Client Adapters for ProjectStore and FieldCatalogStore
 *
 * HTTP-based implementations of ProjectStore and FieldCatalogStore port interfaces.
 * These adapters communicate with the MeatyCapture API server to provide project
 * and field catalog operations over HTTP.
 *
 * Features:
 * - Type-safe HTTP requests using HttpClient
 * - Automatic date deserialization (ISO strings → Date objects)
 * - Error mapping (404 → null for get operations)
 * - Clean separation from local filesystem adapters
 *
 * Usage:
 * ```typescript
 * const client = new HttpClient({ baseUrl: 'http://localhost:3737' });
 * const projectStore = new ApiProjectStore(client);
 * const fieldStore = new ApiFieldCatalogStore(client);
 *
 * const projects = await projectStore.list();
 * const options = await fieldStore.getGlobal();
 * ```
 *
 * @module adapters/api-client/api-config-stores
 */

import type { HttpClient } from './http-client.js';
import type { ProjectStore, FieldCatalogStore } from '@core/ports';
import type { Project, FieldOption, FieldName } from '@core/models';
import { NotFoundError } from './types.js';

/**
 * API-based ProjectStore implementation
 *
 * Implements ProjectStore port interface using HTTP client for remote project operations.
 * Communicates with /api/projects endpoints on the MeatyCapture API server.
 *
 * All methods properly handle:
 * - Date deserialization (HttpClient handles automatically)
 * - Error mapping (404 → null for get())
 * - Type safety with TypeScript generics
 *
 * @example
 * ```typescript
 * const client = new HttpClient();
 * const store = new ApiProjectStore(client);
 *
 * // Create a new project
 * const project = await store.create({
 *   name: 'My Project',
 *   default_path: '/path/to/docs',
 *   enabled: true,
 * });
 *
 * // Update existing project
 * await store.update(project.id, { enabled: false });
 * ```
 */
export class ApiProjectStore implements ProjectStore {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * List all projects
   *
   * Fetches all projects from the server (both enabled and disabled).
   * Projects are returned with Date objects for created_at and updated_at.
   *
   * @returns Array of all projects
   *
   * @example
   * ```typescript
   * const projects = await store.list();
   * console.log(projects.map(p => p.name)); // ['MeatyCapture', 'Other Project']
   * ```
   */
  async list(): Promise<Project[]> {
    return this.client.get<Project[]>('/api/projects');
  }

  /**
   * Get a single project by ID
   *
   * Returns null if project not found (404 response).
   * This is a deliberate design choice for cleaner error handling.
   *
   * @param id - Project identifier (slug format)
   * @returns Project if found, null otherwise
   *
   * @example
   * ```typescript
   * const project = await store.get('meatycapture');
   * if (project) {
   *   console.log(project.name);
   * }
   * ```
   */
  async get(id: string): Promise<Project | null> {
    try {
      return await this.client.get<Project>(`/api/projects/${id}`);
    } catch (error) {
      // Convert 404 NotFoundError to null (expected behavior)
      if (error instanceof NotFoundError) {
        return null;
      }
      // Re-throw all other errors (network, validation, etc.)
      throw error;
    }
  }

  /**
   * Create a new project
   *
   * Server automatically generates:
   * - id: Slugified from name
   * - created_at: Current timestamp
   * - updated_at: Current timestamp
   *
   * @param project - Project data without generated fields
   * @returns Newly created project with all fields populated
   * @throws ValidationError if data is invalid
   * @throws ConflictError if project with generated ID already exists
   *
   * @example
   * ```typescript
   * const project = await store.create({
   *   name: 'New Project',
   *   default_path: '/Users/me/docs',
   *   repo_url: 'https://github.com/user/repo',
   *   enabled: true,
   * });
   * console.log(project.id); // 'new-project'
   * ```
   */
  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    return this.client.post<Project>('/api/projects', undefined, project);
  }

  /**
   * Update an existing project
   *
   * Server automatically updates updated_at timestamp.
   * All fields except id, created_at, and updated_at are updatable.
   *
   * @param id - Project identifier
   * @param updates - Partial project data to merge
   * @returns Updated project
   * @throws NotFoundError if project doesn't exist
   * @throws ValidationError if updates are invalid
   *
   * @example
   * ```typescript
   * const updated = await store.update('my-project', {
   *   enabled: false,
   *   default_path: '/new/path',
   * });
   * ```
   */
  async update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Project> {
    return this.client.patch<Project>(`/api/projects/${id}`, undefined, updates);
  }

  /**
   * Delete a project
   *
   * Note: Does not cascade delete field options or documents.
   * Those resources remain in place and may need manual cleanup.
   *
   * @param id - Project identifier
   * @throws NotFoundError if project doesn't exist
   *
   * @example
   * ```typescript
   * await store.delete('old-project');
   * ```
   */
  async delete(id: string): Promise<void> {
    // DELETE returns 204 No Content (null body)
    await this.client.delete<null>(`/api/projects/${id}`);
  }
}

/**
 * API-based FieldCatalogStore implementation
 *
 * Implements FieldCatalogStore port interface using HTTP client for remote field catalog operations.
 * Communicates with /api/fields endpoints on the MeatyCapture API server.
 *
 * Manages field options with global and project-specific scoping.
 * Resolution: effective options = global + project-specific additions.
 *
 * @example
 * ```typescript
 * const client = new HttpClient();
 * const store = new ApiFieldCatalogStore(client);
 *
 * // Get all global options
 * const globalOptions = await store.getGlobal();
 *
 * // Get effective options for a project (global + project)
 * const projectOptions = await store.getForProject('my-project');
 *
 * // Add a project-specific option
 * await store.addOption({
 *   field: 'priority',
 *   value: 'urgent',
 *   scope: 'project',
 *   project_id: 'my-project',
 * });
 * ```
 */
export class ApiFieldCatalogStore implements FieldCatalogStore {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * Get all global field options
   *
   * Returns only options with scope='global'.
   * These are the base options available to all projects.
   *
   * @returns Array of global field options across all fields
   *
   * @example
   * ```typescript
   * const global = await store.getGlobal();
   * console.log(global.filter(o => o.field === 'type'));
   * // [{ field: 'type', value: 'enhancement', scope: 'global', ... }]
   * ```
   */
  async getGlobal(): Promise<FieldOption[]> {
    return this.client.get<FieldOption[]>('/api/fields/global');
  }

  /**
   * Get effective field options for a specific project
   *
   * Returns merged set: global options + project-specific options.
   * This is the resolved view that UI components should use.
   *
   * @param projectId - Project identifier
   * @returns Array of all applicable field options for the project
   *
   * @example
   * ```typescript
   * const options = await store.getForProject('meatycapture');
   * // Returns global options + project-specific options
   * ```
   */
  async getForProject(projectId: string): Promise<FieldOption[]> {
    return this.client.get<FieldOption[]>(`/api/fields/project/${projectId}`);
  }

  /**
   * Get options for a specific field, optionally filtered by project
   *
   * If projectId is provided, returns global + project-specific options for that field.
   * If projectId is omitted, returns only global options for that field.
   *
   * @param field - Field name (type, domain, context, priority, status, tags)
   * @param projectId - Optional project ID for project-specific filtering
   * @returns Array of field options for the specified field
   *
   * @example
   * ```typescript
   * // Get global 'type' options
   * const types = await store.getByField('type');
   *
   * // Get 'priority' options for a specific project
   * const priorities = await store.getByField('priority', 'my-project');
   * ```
   */
  async getByField(field: FieldName, projectId?: string): Promise<FieldOption[]> {
    // Build query parameters if projectId provided
    const query = projectId ? { project_id: projectId } : undefined;
    return this.client.get<FieldOption[]>(`/api/fields/by-field/${field}`, query);
  }

  /**
   * Add a new field option (global or project-scoped)
   *
   * Server automatically generates:
   * - id: Unique identifier
   * - created_at: Current timestamp
   *
   * Validation rules:
   * - scope must be 'global' or 'project'
   * - If scope='project', project_id is required
   * - If scope='global', project_id must not be provided
   *
   * @param option - Field option data without generated fields
   * @returns Newly created field option with all fields populated
   * @throws ValidationError if validation fails
   * @throws ConflictError if duplicate option exists
   *
   * @example
   * ```typescript
   * // Add global option
   * await store.addOption({
   *   field: 'type',
   *   value: 'spike',
   *   scope: 'global',
   * });
   *
   * // Add project-specific option
   * await store.addOption({
   *   field: 'priority',
   *   value: 'urgent',
   *   scope: 'project',
   *   project_id: 'my-project',
   * });
   * ```
   */
  async addOption(option: Omit<FieldOption, 'id' | 'created_at'>): Promise<FieldOption> {
    return this.client.post<FieldOption>('/api/fields', undefined, option);
  }

  /**
   * Remove a field option by ID
   *
   * Searches both global and project-scoped options.
   *
   * @param id - Field option identifier
   * @throws NotFoundError if option doesn't exist
   *
   * @example
   * ```typescript
   * await store.removeOption('type-spike-1701619200000');
   * ```
   */
  async removeOption(id: string): Promise<void> {
    // DELETE returns 204 No Content (null body)
    await this.client.delete<null>(`/api/fields/${id}`);
  }
}
