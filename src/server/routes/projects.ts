/**
 * ProjectStore REST Endpoints
 *
 * Exposes ProjectStore operations via HTTP REST API.
 * Provides full CRUD functionality for project management.
 *
 * Endpoints:
 * - GET    /api/projects       - List all projects
 * - GET    /api/projects/:id   - Get project by ID
 * - POST   /api/projects       - Create new project
 * - PATCH  /api/projects/:id   - Update existing project
 * - DELETE /api/projects/:id   - Delete project
 *
 * All endpoints use:
 * - Structured error handling with proper HTTP status codes
 * - Request validation via validation middleware
 * - Date serialization for JSON responses
 * - ProjectStore port interface for storage operations
 *
 * Error responses:
 * - 400: Validation error (invalid request body)
 * - 404: Project not found
 * - 409: Conflict (duplicate project ID)
 * - 500: Internal server error
 */

import type { ProjectStore } from '@core/ports';
import type { Project } from '@core/models';
import { withErrorHandling, NotFoundError, ConflictError } from '../middleware/error-handler.js';
import { parseJsonBody } from '../middleware/validation.js';
import {
  validateProjectCreateBody,
  validateProjectUpdateBody,
  validateProjectId,
} from '../schemas/projects.js';

/**
 * Serializes a Project entity to JSON-safe format.
 *
 * Converts Date objects to ISO 8601 strings for JSON transport.
 * This ensures dates are properly serialized in HTTP responses.
 *
 * @param project - Project entity with Date objects
 * @returns JSON-serializable object with date strings
 */
function serializeProject(project: Project): Record<string, unknown> {
  return {
    id: project.id,
    name: project.name,
    default_path: project.default_path,
    repo_url: project.repo_url,
    enabled: project.enabled,
    created_at: project.created_at.toISOString(),
    updated_at: project.updated_at.toISOString(),
  };
}

/**
 * Serializes an array of Project entities.
 *
 * @param projects - Array of projects to serialize
 * @returns Array of JSON-serializable objects
 */
function serializeProjects(projects: Project[]): Record<string, unknown>[] {
  return projects.map(serializeProject);
}

/**
 * Router factory for ProjectStore endpoints.
 *
 * Creates route handlers with dependency-injected ProjectStore.
 * This allows for easy testing and swapping of storage implementations.
 *
 * @param projectStore - ProjectStore implementation to use
 * @returns Object with route handler functions
 *
 * @example
 * ```typescript
 * import { LocalProjectStore } from '@adapters/config-local';
 *
 * const store = new LocalProjectStore();
 * const router = createProjectsRouter(store);
 *
 * // In server request handler:
 * if (method === 'GET' && path === '/api/projects') {
 *   return router.list(req);
 * }
 * ```
 */
export function createProjectsRouter(projectStore: ProjectStore) {
  return {
    /**
     * GET /api/projects
     *
     * Lists all projects in the system.
     * Returns both enabled and disabled projects.
     *
     * Response: 200 OK
     * ```json
     * [
     *   {
     *     "id": "meatycapture",
     *     "name": "MeatyCapture",
     *     "default_path": "/path/to/docs",
     *     "repo_url": "https://github.com/user/repo",
     *     "enabled": true,
     *     "created_at": "2025-12-08T10:00:00.000Z",
     *     "updated_at": "2025-12-08T10:00:00.000Z"
     *   }
     * ]
     * ```
     *
     * @param _req - HTTP request (unused, but required for handler signature)
     * @returns JSON array of all projects
     */
    list: async (_req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const projects = await projectStore.list();
          return Response.json(serializeProjects(projects));
        },
        { method: 'GET', path: '/api/projects' }
      );
    },

    /**
     * GET /api/projects/:id
     *
     * Gets a single project by ID.
     *
     * Path parameters:
     * - id: Project identifier (slug format)
     *
     * Response: 200 OK
     * ```json
     * {
     *   "id": "meatycapture",
     *   "name": "MeatyCapture",
     *   "default_path": "/path/to/docs",
     *   "enabled": true,
     *   "created_at": "2025-12-08T10:00:00.000Z",
     *   "updated_at": "2025-12-08T10:00:00.000Z"
     * }
     * ```
     *
     * Error responses:
     * - 404: Project not found
     *
     * @param _req - HTTP request (unused)
     * @param id - Project ID from URL path parameter
     * @returns JSON project object or 404 error
     */
    get: async (_req: Request, id: string): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Validate project ID format
          const validatedId = validateProjectId(id);

          // Fetch project from store
          const project = await projectStore.get(validatedId);

          if (!project) {
            throw new NotFoundError(`Project not found: ${validatedId}`);
          }

          return Response.json(serializeProject(project));
        },
        { method: 'GET', path: `/api/projects/${id}` }
      );
    },

    /**
     * POST /api/projects
     *
     * Creates a new project.
     *
     * Request body:
     * ```json
     * {
     *   "name": "My Project",
     *   "default_path": "/path/to/docs",
     *   "repo_url": "https://github.com/user/repo",  // optional
     *   "enabled": true
     * }
     * ```
     *
     * The server will automatically generate:
     * - id: Slugified from name (e.g., "my-project")
     * - created_at: Current timestamp
     * - updated_at: Current timestamp
     *
     * Response: 201 Created
     * ```json
     * {
     *   "id": "my-project",
     *   "name": "My Project",
     *   "default_path": "/path/to/docs",
     *   "repo_url": "https://github.com/user/repo",
     *   "enabled": true,
     *   "created_at": "2025-12-08T10:00:00.000Z",
     *   "updated_at": "2025-12-08T10:00:00.000Z"
     * }
     * ```
     *
     * Error responses:
     * - 400: Validation error (missing required fields, invalid format)
     * - 409: Conflict (project with generated ID already exists)
     *
     * @param req - HTTP request with JSON body
     * @returns JSON project object with 201 status or error
     */
    create: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Parse and validate request body
          const body = await parseJsonBody(req, validateProjectCreateBody);

          try {
            // Attempt to create project
            const project = await projectStore.create(body);

            return Response.json(serializeProject(project), { status: 201 });
          } catch (error) {
            // Map adapter errors to HTTP errors
            if (error instanceof Error && error.message.includes('already exists')) {
              throw new ConflictError(error.message);
            }
            throw error;
          }
        },
        { method: 'POST', path: '/api/projects' }
      );
    },

    /**
     * PATCH /api/projects/:id
     *
     * Updates an existing project.
     *
     * Path parameters:
     * - id: Project identifier
     *
     * Request body (all fields optional):
     * ```json
     * {
     *   "name": "Updated Name",
     *   "default_path": "/new/path",
     *   "repo_url": "https://github.com/new/repo",
     *   "enabled": false
     * }
     * ```
     *
     * At least one field must be provided for update.
     * The server will automatically update the updated_at timestamp.
     *
     * Response: 200 OK
     * ```json
     * {
     *   "id": "my-project",
     *   "name": "Updated Name",
     *   "default_path": "/new/path",
     *   "repo_url": "https://github.com/new/repo",
     *   "enabled": false,
     *   "created_at": "2025-12-08T10:00:00.000Z",
     *   "updated_at": "2025-12-08T11:00:00.000Z"
     * }
     * ```
     *
     * Error responses:
     * - 400: Validation error (invalid field values, no fields provided)
     * - 404: Project not found
     *
     * @param req - HTTP request with JSON body
     * @param id - Project ID from URL path parameter
     * @returns JSON updated project object or error
     */
    update: async (req: Request, id: string): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Validate project ID format
          const validatedId = validateProjectId(id);

          // Parse and validate request body
          const updates = await parseJsonBody(req, validateProjectUpdateBody);

          try {
            // Attempt to update project
            const project = await projectStore.update(validatedId, updates);

            return Response.json(serializeProject(project));
          } catch (error) {
            // Map adapter errors to HTTP errors
            if (error instanceof Error && error.message.includes('not found')) {
              throw new NotFoundError(`Project not found: ${validatedId}`);
            }
            throw error;
          }
        },
        { method: 'PATCH', path: `/api/projects/${id}` }
      );
    },

    /**
     * DELETE /api/projects/:id
     *
     * Deletes a project.
     *
     * Path parameters:
     * - id: Project identifier
     *
     * Note: This does not cascade delete field options or documents.
     * Those resources remain in place and may need manual cleanup.
     *
     * Response: 204 No Content
     * (Empty response body on success)
     *
     * Error responses:
     * - 404: Project not found
     *
     * @param _req - HTTP request (unused)
     * @param id - Project ID from URL path parameter
     * @returns Empty response with 204 status or 404 error
     */
    delete: async (_req: Request, id: string): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Validate project ID format
          const validatedId = validateProjectId(id);

          try {
            // Attempt to delete project
            await projectStore.delete(validatedId);

            // Return 204 No Content on success
            return new Response(null, { status: 204 });
          } catch (error) {
            // Map adapter errors to HTTP errors
            if (error instanceof Error && error.message.includes('not found')) {
              throw new NotFoundError(`Project not found: ${validatedId}`);
            }
            throw error;
          }
        },
        { method: 'DELETE', path: `/api/projects/${id}` }
      );
    },
  };
}
