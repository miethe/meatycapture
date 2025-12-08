/**
 * FieldCatalogStore Endpoint Schema Validators
 *
 * Request validation schemas for field catalog operations.
 * Validates request bodies for field option creation and queries.
 *
 * Endpoints covered:
 * - GET /api/fields/global (get all global options)
 * - GET /api/fields/project/:project_id (get options for project)
 * - GET /api/fields/:field_name (get options by field name)
 * - POST /api/fields (create new field option)
 * - DELETE /api/fields/:id (delete field option)
 *
 * Validates:
 * - Field names (type, domain, context, priority, status, tags)
 * - Field scopes (global, project)
 * - Field option creation data
 *
 * All validators throw ValidationError with field-level details on failure.
 */

import type { FieldOption, FieldName, FieldScope } from '@core/models';
import {
  validateString,
  validateEnum,
  validateObject,
  validateOptional,
} from '../middleware/validation.js';
import { ValidationError } from '../middleware/error-handler.js';

/**
 * Valid field names that support configurable options.
 * Must match FieldName type from core models.
 */
const VALID_FIELD_NAMES: readonly FieldName[] = [
  'type',
  'domain',
  'context',
  'priority',
  'status',
  'tags',
] as const;

/**
 * Valid field option scopes.
 * Must match FieldScope type from core models.
 */
const VALID_FIELD_SCOPES: readonly FieldScope[] = ['global', 'project'] as const;

/**
 * Validates a field name parameter.
 *
 * Ensures the field name is one of the supported field types:
 * - type: Item type (enhancement, bug, etc.)
 * - domain: Domain/area (web, api, etc.)
 * - context: Additional context categorization
 * - priority: Priority level (low, medium, high, critical)
 * - status: Item status (triage, backlog, done, etc.)
 * - tags: Tag values for categorization
 *
 * @param value - Field name to validate
 * @returns Validated FieldName
 * @throws ValidationError if field name is invalid
 *
 * @example
 * ```typescript
 * const fieldName = validateFieldName(body.field);
 * // Returns 'type' | 'domain' | 'context' | 'priority' | 'status' | 'tags'
 * ```
 */
export function validateFieldName(value: unknown): FieldName {
  return validateEnum(value, 'field', VALID_FIELD_NAMES);
}

/**
 * Validates a field option scope parameter.
 *
 * Ensures the scope is one of:
 * - global: Available to all projects
 * - project: Specific to a single project
 *
 * @param value - Scope value to validate
 * @returns Validated FieldScope
 * @throws ValidationError if scope is invalid
 *
 * @example
 * ```typescript
 * const scope = validateFieldScope(body.scope);
 * // Returns 'global' | 'project'
 * ```
 */
export function validateFieldScope(value: unknown): FieldScope {
  return validateEnum(value, 'scope', VALID_FIELD_SCOPES);
}

/**
 * Validates a field option creation request body.
 *
 * Used for POST /api/fields endpoint.
 * Validates all fields required to create a new field option.
 * Excludes generated fields (id, created_at).
 *
 * Required fields:
 * - field: Field name this option belongs to
 * - value: The option value (e.g., 'enhancement', 'bug')
 * - scope: Whether this is global or project-specific
 *
 * Conditionally required:
 * - project_id: Required when scope='project', forbidden when scope='global'
 *
 * Validation rules:
 * - If scope='project', project_id must be provided
 * - If scope='global', project_id must not be provided
 *
 * The server will generate:
 * - id: Unique identifier
 * - created_at: Current timestamp
 *
 * @param body - Raw request body
 * @returns Validated field option data without generated fields
 * @throws ValidationError if validation fails or project_id rules violated
 *
 * @example
 * ```typescript
 * const optionData = await parseJsonBody(req, validateFieldOptionCreateBody);
 * const option = await fieldCatalogStore.addOption(optionData);
 * ```
 */
export function validateFieldOptionCreateBody(
  body: unknown
): Omit<FieldOption, 'id' | 'created_at'> {
  const obj = validateObject(body, 'body');

  const field = validateFieldName(obj.field);
  const value = validateString(obj.value, 'value');
  const scope = validateFieldScope(obj.scope);
  const project_id = validateOptional(obj.project_id, (v) => validateString(v, 'project_id'));

  // Validate project_id requirements based on scope
  if (scope === 'project' && !project_id) {
    throw new ValidationError('Validation failed', {
      fields: {
        project_id: 'Required when scope is "project"',
      },
    });
  }

  if (scope === 'global' && project_id) {
    throw new ValidationError('Validation failed', {
      fields: {
        project_id: 'Must not be provided when scope is "global"',
      },
    });
  }

  // Build result with required fields
  const result: Omit<FieldOption, 'id' | 'created_at'> = {
    field,
    value,
    scope,
  };

  // Add optional project_id only if present
  if (project_id !== undefined) {
    result.project_id = project_id;
  }

  return result;
}

/**
 * Validates a field option ID parameter from URL path.
 *
 * Used for DELETE /api/fields/:id endpoint.
 * Ensures the option ID is a valid non-empty string.
 *
 * @param id - Field option ID from path parameter
 * @returns Validated field option ID
 * @throws ValidationError if ID is missing or invalid
 *
 * @example
 * ```typescript
 * const optionId = extractPathParam(url.pathname, /^\/api\/fields\/([^/]+)$/);
 * const validatedId = validateFieldOptionId(optionId);
 * ```
 */
export function validateFieldOptionId(id: string | undefined): string {
  if (!id) {
    throw new ValidationError('Validation failed', {
      fields: {
        id: 'Path parameter "id" is required',
      },
    });
  }
  return validateString(id, 'id');
}

/**
 * Validates a project ID parameter for project-specific field queries.
 *
 * Used for GET /api/fields/project/:project_id endpoint.
 * Ensures the project ID is a valid non-empty string.
 *
 * @param id - Project ID from path parameter
 * @returns Validated project ID
 * @throws ValidationError if ID is missing or invalid
 *
 * @example
 * ```typescript
 * const projectId = extractPathParam(url.pathname, /^\/api\/fields\/project\/([^/]+)$/);
 * const validatedId = validateProjectIdParam(projectId);
 * ```
 */
export function validateProjectIdParam(id: string | undefined): string {
  if (!id) {
    throw new ValidationError('Validation failed', {
      fields: {
        project_id: 'Path parameter "project_id" is required',
      },
    });
  }
  return validateString(id, 'project_id');
}

/**
 * Validates an optional project_id query parameter.
 *
 * Used for GET /api/fields/:field_name?project_id=<id> endpoint.
 * Allows filtering field options by project when provided.
 *
 * @param projectId - Project ID from query parameter (may be undefined)
 * @returns Validated project ID or undefined
 * @throws ValidationError if provided but invalid
 *
 * @example
 * ```typescript
 * const projectId = extractQueryParam(url, 'project_id');
 * const validatedId = validateOptionalProjectId(projectId);
 * // Returns string or undefined
 * ```
 */
export function validateOptionalProjectId(projectId: string | undefined): string | undefined {
  return validateOptional(projectId, (v) => validateString(v, 'project_id'));
}
