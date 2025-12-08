/**
 * ProjectStore Endpoint Schema Validators
 *
 * Request validation schemas for project CRUD operations.
 * Validates request bodies for project creation and updates.
 *
 * Endpoints covered:
 * - GET /api/projects (list all projects)
 * - GET /api/projects/:id (get single project)
 * - POST /api/projects (create project)
 * - PATCH /api/projects/:id (update project)
 * - DELETE /api/projects/:id (delete project)
 *
 * All validators throw ValidationError with field-level details on failure.
 */

import type { Project } from '@core/models';
import {
  validateString,
  validateBoolean,
  validateObject,
  validateOptional,
} from '../middleware/validation.js';

/**
 * Validates a project creation request body.
 *
 * Used for POST /api/projects endpoint.
 * Validates all fields required to create a new project.
 * Excludes generated fields (id, created_at, updated_at).
 *
 * Required fields:
 * - name: Project display name
 * - default_path: Filesystem path for project documents
 * - enabled: Whether project is active
 *
 * Optional fields:
 * - repo_url: Repository URL for context
 *
 * The server will generate:
 * - id: Slugified from name
 * - created_at: Current timestamp
 * - updated_at: Current timestamp
 *
 * @param body - Raw request body
 * @returns Validated project data without generated fields
 * @throws ValidationError if validation fails on any field
 *
 * @example
 * ```typescript
 * const projectData = await parseJsonBody(req, validateProjectCreateBody);
 * const project = await projectStore.create(projectData);
 * ```
 */
export function validateProjectCreateBody(
  body: unknown
): Omit<Project, 'id' | 'created_at' | 'updated_at'> {
  const obj = validateObject(body, 'body');

  // Build result with required fields
  const result: Omit<Project, 'id' | 'created_at' | 'updated_at'> = {
    name: validateString(obj.name, 'name'),
    default_path: validateString(obj.default_path, 'default_path'),
    enabled: validateBoolean(obj.enabled, 'enabled'),
  };

  // Add optional repo_url only if present
  const repo_url = validateOptional(obj.repo_url, (v) => validateString(v, 'repo_url'));
  if (repo_url !== undefined) {
    result.repo_url = repo_url;
  }

  return result;
}

/**
 * Validates a project update request body.
 *
 * Used for PATCH /api/projects/:id endpoint.
 * All fields are optional - only provided fields will be updated.
 * Excludes generated fields (id, created_at, updated_at).
 *
 * Optional fields:
 * - name: Updated project display name
 * - default_path: Updated filesystem path
 * - enabled: Updated active status
 * - repo_url: Updated repository URL
 *
 * The server will automatically:
 * - Update updated_at timestamp
 * - Preserve id and created_at
 *
 * @param body - Raw request body
 * @returns Validated partial project data
 * @throws ValidationError if validation fails on any provided field
 *
 * @example
 * ```typescript
 * const updates = await parseJsonBody(req, validateProjectUpdateBody);
 * const project = await projectStore.update(projectId, updates);
 * ```
 */
export function validateProjectUpdateBody(
  body: unknown
): Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>> {
  const obj = validateObject(body, 'body');

  // Build partial update object with only provided fields
  const updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>> = {};

  // Validate each field if present
  if (obj.name !== undefined) {
    updates.name = validateString(obj.name, 'name');
  }

  if (obj.default_path !== undefined) {
    updates.default_path = validateString(obj.default_path, 'default_path');
  }

  if (obj.enabled !== undefined) {
    updates.enabled = validateBoolean(obj.enabled, 'enabled');
  }

  if ('repo_url' in obj) {
    // repo_url can be set to null/undefined to clear it, or a string to set it
    const repo_url = validateOptional(obj.repo_url, (v) => validateString(v, 'repo_url'));
    if (repo_url !== undefined) {
      updates.repo_url = repo_url;
    }
  }

  // Ensure at least one field is being updated
  if (Object.keys(updates).length === 0) {
    throw new Error('Update request must include at least one field to update');
  }

  return updates;
}

/**
 * Validates a project ID parameter from URL path.
 *
 * Used for GET/PATCH/DELETE /api/projects/:id endpoints.
 * Ensures the project ID is a valid non-empty string.
 *
 * @param id - Project ID from path parameter
 * @returns Validated project ID
 * @throws ValidationError if ID is missing or invalid
 *
 * @example
 * ```typescript
 * const projectId = extractPathParam(url.pathname, /^\/api\/projects\/([^/]+)$/);
 * const validatedId = validateProjectId(projectId);
 * ```
 */
export function validateProjectId(id: string | undefined): string {
  if (!id) {
    throw new Error('Path parameter "id" is required');
  }
  return validateString(id, 'id');
}
