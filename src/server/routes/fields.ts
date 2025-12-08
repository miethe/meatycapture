/**
 * FieldCatalogStore REST API Routes
 *
 * Provides HTTP endpoints for field catalog operations using existing
 * LocalFieldCatalogStore adapter. Manages global and project-scoped field options
 * for type, domain, context, priority, status, and tags.
 *
 * Endpoints:
 * - GET  /api/fields/global - Get all global field options
 * - GET  /api/fields/project/:id - Get effective options for a project (global + project)
 * - GET  /api/fields/by-field/:field - Get options for a specific field (optional project filter)
 * - POST /api/fields - Add a new field option (global or project-scoped)
 * - DELETE /api/fields/:id - Remove a field option
 *
 * All responses include proper HTTP status codes and structured JSON payloads.
 * Validation errors return 400 with field-level details.
 * Not found errors return 404.
 * Conflict errors (duplicates) return 409.
 *
 * @example
 * ```typescript
 * // Create router with store instance
 * const fieldStore = new LocalFieldCatalogStore();
 * const fieldsRouter = createFieldsRouter(fieldStore);
 *
 * // Use in server fetch handler
 * if (path.startsWith('/api/fields/')) {
 *   return fieldsRouter.route(req);
 * }
 * ```
 */

import { withErrorHandling, NotFoundError, ValidationError, ConflictError } from '../middleware/error-handler.js';
import { parseJsonBody, extractQueryParam, extractPathParam } from '../middleware/validation.js';
import {
  validateFieldOptionCreateBody,
  validateFieldName,
  validateFieldOptionId,
  validateProjectIdParam,
  validateOptionalProjectId,
} from '../schemas/fields.js';
import type { FieldCatalogStore } from '@core/ports';
import type { FieldOption } from '@core/models';

/**
 * Serializes a FieldOption for JSON response.
 *
 * Converts Date objects to ISO 8601 strings for JSON compatibility.
 * Ensures consistent date format across all API responses.
 *
 * @param option - FieldOption with Date objects
 * @returns Plain object with ISO date strings
 */
function serializeFieldOption(option: FieldOption): object {
  return {
    ...option,
    created_at: option.created_at.toISOString(),
  };
}

/**
 * Serializes an array of FieldOptions for JSON response.
 *
 * @param options - Array of FieldOptions
 * @returns Array of plain objects with ISO date strings
 */
function serializeFieldOptions(options: FieldOption[]): object[] {
  return options.map(serializeFieldOption);
}

/**
 * Creates a field catalog router with bound route handlers.
 *
 * Returns an object with handlers for all field catalog endpoints.
 * Each handler is bound to the provided store instance and includes
 * error handling, validation, and proper response formatting.
 *
 * @param fieldStore - FieldCatalogStore implementation instance
 * @returns Router object with handler methods
 */
export function createFieldsRouter(fieldStore: FieldCatalogStore) {
  return {
    /**
     * GET /api/fields/global
     *
     * Retrieves all global field options across all fields.
     * Returns only options with scope='global'.
     *
     * Response: 200 OK with array of FieldOptions
     *
     * @returns JSON response with global field options
     */
    getGlobal: async (): Promise<Response> => {
      return withErrorHandling(
        async () => {
          const options = await fieldStore.getGlobal();
          return Response.json(serializeFieldOptions(options));
        },
        { method: 'GET', path: '/api/fields/global' }
      );
    },

    /**
     * GET /api/fields/project/:id
     *
     * Retrieves effective field options for a specific project.
     * Returns merged set: global options + project-specific options.
     * This is the resolved view that UI components should use.
     *
     * Path parameters:
     * - id: Project identifier (required)
     *
     * Response: 200 OK with array of FieldOptions
     * Error: 400 Bad Request if project ID is invalid
     *
     * @param projectId - Project identifier from path parameter
     * @returns JSON response with merged field options
     */
    getForProject: async (projectId: string): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Validate project ID parameter
          const validProjectId = validateProjectIdParam(projectId);

          const options = await fieldStore.getForProject(validProjectId);
          return Response.json(serializeFieldOptions(options));
        },
        { method: 'GET', path: `/api/fields/project/${projectId}` }
      );
    },

    /**
     * GET /api/fields/by-field/:field
     *
     * Retrieves options for a specific field name, optionally filtered by project.
     * If project_id query param is provided, returns global + project options.
     * Otherwise, returns only global options.
     *
     * Path parameters:
     * - field: Field name (type, domain, context, priority, status, tags)
     *
     * Query parameters:
     * - project_id: Optional project ID for filtering
     *
     * Response: 200 OK with array of FieldOptions
     * Error: 400 Bad Request if field name is invalid
     *
     * @param req - HTTP request
     * @param field - Field name from path parameter
     * @returns JSON response with field options
     *
     * @example
     * ```typescript
     * // Get global options for 'type' field
     * GET /api/fields/by-field/type
     *
     * // Get project-specific options for 'priority' field
     * GET /api/fields/by-field/priority?project_id=my-project
     * ```
     */
    getByField: async (req: Request, field: string): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Validate field name (must be one of: type, domain, context, priority, status, tags)
          const validField = validateFieldName(field);

          // Extract optional project_id query parameter
          const url = new URL(req.url);
          const projectId = extractQueryParam(url, 'project_id');
          const validProjectId = validateOptionalProjectId(projectId);

          const options = await fieldStore.getByField(validField, validProjectId);
          return Response.json(serializeFieldOptions(options));
        },
        { method: 'GET', path: `/api/fields/by-field/${field}` }
      );
    },

    /**
     * POST /api/fields
     *
     * Creates a new field option (global or project-scoped).
     * Automatically generates ID and created_at timestamp.
     *
     * Request body (JSON):
     * - field: Field name (type, domain, context, priority, status, tags)
     * - value: Option value string (e.g., 'enhancement', 'bug')
     * - scope: 'global' or 'project'
     * - project_id: Required when scope='project', forbidden when scope='global'
     *
     * Validation rules:
     * - field must be a valid field name
     * - scope must be 'global' or 'project'
     * - If scope='project', project_id is required
     * - If scope='global', project_id must not be provided
     * - Duplicate field/value combinations within same scope are rejected
     *
     * Response: 201 Created with the new FieldOption
     * Error: 400 Bad Request if validation fails
     * Error: 409 Conflict if duplicate option exists
     *
     * @param req - HTTP request with JSON body
     * @returns JSON response with created field option
     *
     * @example
     * ```typescript
     * // Create global option
     * POST /api/fields
     * {
     *   "field": "type",
     *   "value": "spike",
     *   "scope": "global"
     * }
     *
     * // Create project-specific option
     * POST /api/fields
     * {
     *   "field": "priority",
     *   "value": "urgent",
     *   "scope": "project",
     *   "project_id": "my-project"
     * }
     * ```
     */
    addOption: async (req: Request): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Parse and validate request body
          const body = await parseJsonBody(req, validateFieldOptionCreateBody);

          try {
            const option = await fieldStore.addOption(body);
            return Response.json(serializeFieldOption(option), { status: 201 });
          } catch (error) {
            // Map adapter errors to HTTP errors
            if (error instanceof Error) {
              // Duplicate option error
              if (error.message.includes('already exists')) {
                throw new ConflictError(error.message);
              }

              // Missing project_id for project scope
              if (error.message.includes('project_id is required')) {
                throw new ValidationError(error.message);
              }
            }

            // Re-throw unknown errors
            throw error;
          }
        },
        { method: 'POST', path: '/api/fields' }
      );
    },

    /**
     * DELETE /api/fields/:id
     *
     * Removes a field option by ID.
     * Searches both global and project-scoped options.
     *
     * Path parameters:
     * - id: Field option identifier (required)
     *
     * Response: 204 No Content on success
     * Error: 400 Bad Request if ID is invalid
     * Error: 404 Not Found if option doesn't exist
     *
     * @param id - Field option ID from path parameter
     * @returns Empty response with 204 status
     *
     * @example
     * ```typescript
     * DELETE /api/fields/type-enhancement-1701619200000
     * ```
     */
    removeOption: async (id: string): Promise<Response> => {
      return withErrorHandling(
        async () => {
          // Validate ID parameter
          const validId = validateFieldOptionId(id);

          try {
            await fieldStore.removeOption(validId);
            return new Response(null, { status: 204 });
          } catch (error) {
            // Map "not found" error to 404
            if (error instanceof Error && error.message.includes('not found')) {
              throw new NotFoundError(error.message);
            }

            // Re-throw unknown errors
            throw error;
          }
        },
        { method: 'DELETE', path: `/api/fields/${id}` }
      );
    },

  };
}

/**
 * Routes an incoming request to the appropriate field catalog handler.
 *
 * Convenience function that wraps createFieldsRouter and provides
 * a simple routing interface for the main server fetch handler.
 *
 * Matches request method and path pattern to handler functions.
 * Returns 404 if no route matches.
 *
 * Supported routes:
 * - GET /api/fields/global
 * - GET /api/fields/project/:id
 * - GET /api/fields/by-field/:field
 * - POST /api/fields
 * - DELETE /api/fields/:id
 *
 * @param req - HTTP request to route
 * @param fieldStore - FieldCatalogStore implementation instance
 * @returns Response from matched handler or 404
 *
 * @example
 * ```typescript
 * // In server fetch handler
 * if (path.startsWith('/api/fields')) {
 *   return routeFieldsRequest(req, fieldStore);
 * }
 * ```
 */
export async function routeFieldsRequest(
  req: Request,
  fieldStore: FieldCatalogStore
): Promise<Response> {
  const router = createFieldsRouter(fieldStore);
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;

  // GET /api/fields/global
  if (method === 'GET' && path === '/api/fields/global') {
    return router.getGlobal();
  }

  // GET /api/fields/project/:id
  const projectMatch = extractPathParam(path, /^\/api\/fields\/project\/([^/]+)$/);
  if (method === 'GET' && projectMatch) {
    return router.getForProject(projectMatch);
  }

  // GET /api/fields/by-field/:field
  const fieldMatch = extractPathParam(path, /^\/api\/fields\/by-field\/([^/]+)$/);
  if (method === 'GET' && fieldMatch) {
    return router.getByField(req, fieldMatch);
  }

  // POST /api/fields
  if (method === 'POST' && path === '/api/fields') {
    return router.addOption(req);
  }

  // DELETE /api/fields/:id
  const deleteMatch = extractPathParam(path, /^\/api\/fields\/([^/]+)$/);
  if (method === 'DELETE' && deleteMatch) {
    return router.removeOption(deleteMatch);
  }

  // No route matched - return 404
  return Response.json(
    {
      error: 'Not Found',
      message: `Route not found: ${method} ${path}`,
    },
    { status: 404 }
  );
}
