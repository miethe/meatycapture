/**
 * Request Validation Middleware
 *
 * Provides reusable validation utilities for HTTP request data.
 * Validates query parameters, path parameters, and request bodies with type safety.
 *
 * Features:
 * - Type-safe validation functions (string, number, boolean, enum)
 * - Required vs optional field handling
 * - JSON body parsing with validation
 * - URL query parameter extraction
 * - Path parameter extraction from patterns
 * - Structured error messages using ValidationError
 *
 * All validation errors throw ValidationError with field-level details,
 * which the error handler middleware maps to 400 Bad Request responses.
 *
 * @example
 * ```typescript
 * // Validate required string
 * const projectId = validateString(body.project_id, 'project_id');
 *
 * // Validate enum value
 * const status = validateEnum(body.status, 'status', ['triage', 'backlog', 'done']);
 *
 * // Parse and validate JSON body
 * const data = await parseJsonBody(req, validateProjectCreateBody);
 * ```
 */

import { ValidationError } from './error-handler.js';

/**
 * Validates that a value is present (not null, undefined, or empty string).
 *
 * Throws ValidationError if the value is missing or empty.
 * Empty strings are considered invalid for required fields.
 *
 * @param value - The value to check
 * @param name - Field name for error messages
 * @throws ValidationError if value is missing or empty
 *
 * @example
 * ```typescript
 * validateRequired(body.name, 'name');
 * // Throws if body.name is null, undefined, or ''
 * ```
 */
export function validateRequired(value: unknown, name: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: 'Required field',
      },
    });
  }
}

/**
 * Validates that a value is a string.
 *
 * Ensures the value is present and is of type string.
 * Empty strings are considered invalid.
 *
 * @param value - The value to validate
 * @param name - Field name for error messages
 * @returns The validated string
 * @throws ValidationError if value is not a string or is empty
 *
 * @example
 * ```typescript
 * const title = validateString(body.title, 'title');
 * // Returns body.title if it's a non-empty string
 * ```
 */
export function validateString(value: unknown, name: string): string {
  validateRequired(value, name);

  if (typeof value !== 'string') {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: 'Must be a string',
      },
    });
  }

  if (value.trim() === '') {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: 'Cannot be empty or whitespace only',
      },
    });
  }

  return value;
}

/**
 * Validates that a value is a number.
 *
 * Ensures the value is present and is a valid number (not NaN).
 * Accepts both numeric types and numeric strings (converts strings to numbers).
 *
 * @param value - The value to validate
 * @param name - Field name for error messages
 * @returns The validated number
 * @throws ValidationError if value is not a valid number
 *
 * @example
 * ```typescript
 * const port = validateNumber(query.port, 'port');
 * // Returns numeric value, converts '3737' to 3737
 * ```
 */
export function validateNumber(value: unknown, name: string): number {
  validateRequired(value, name);

  const num = typeof value === 'string' ? Number(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: 'Must be a valid number',
      },
    });
  }

  return num;
}

/**
 * Validates that a value is a boolean.
 *
 * Ensures the value is present and is a valid boolean.
 * Accepts both boolean types and boolean strings ('true', 'false').
 * Case-insensitive for string values.
 *
 * @param value - The value to validate
 * @param name - Field name for error messages
 * @returns The validated boolean
 * @throws ValidationError if value is not a valid boolean
 *
 * @example
 * ```typescript
 * const enabled = validateBoolean(body.enabled, 'enabled');
 * // Returns true/false, converts 'true' to true
 * ```
 */
export function validateBoolean(value: unknown, name: string): boolean {
  validateRequired(value, name);

  // Handle boolean type directly
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle string representations
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }

  throw new ValidationError('Validation failed', {
    fields: {
      [name]: 'Must be a boolean (true or false)',
    },
  });
}

/**
 * Validates that a value is one of a set of allowed enum values.
 *
 * Ensures the value is present and matches one of the allowed values exactly.
 * Comparison is case-sensitive.
 *
 * @param value - The value to validate
 * @param name - Field name for error messages
 * @param allowed - Array of allowed enum values
 * @returns The validated enum value (typed)
 * @throws ValidationError if value is not in the allowed set
 *
 * @example
 * ```typescript
 * const scope = validateEnum(body.scope, 'scope', ['global', 'project']);
 * // Returns 'global' or 'project' if valid, throws otherwise
 * ```
 */
export function validateEnum<T extends string>(
  value: unknown,
  name: string,
  allowed: readonly T[]
): T {
  const str = validateString(value, name);

  if (!allowed.includes(str as T)) {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: `Must be one of: ${allowed.join(', ')}`,
      },
    });
  }

  return str as T;
}

/**
 * Validates an optional field using a validator function.
 *
 * If the value is null or undefined, returns undefined.
 * Otherwise, applies the validator function and returns the validated result.
 * Empty strings are treated as missing (return undefined).
 *
 * @param value - The value to validate (may be null/undefined)
 * @param validator - Function to validate the value if present
 * @returns Validated value or undefined
 * @throws ValidationError if validation fails on a present value
 *
 * @example
 * ```typescript
 * const repoUrl = validateOptional(body.repo_url, (v) => validateString(v, 'repo_url'));
 * // Returns string if present, undefined if missing
 * ```
 */
export function validateOptional<T>(
  value: unknown,
  validator: (v: unknown) => T
): T | undefined {
  // Treat null, undefined, and empty string as "not present"
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return validator(value);
}

/**
 * Validates that a value is an array of strings.
 *
 * Ensures the value is an array and all elements are non-empty strings.
 * Returns the validated string array.
 *
 * @param value - The value to validate
 * @param name - Field name for error messages
 * @returns The validated string array
 * @throws ValidationError if value is not a string array
 *
 * @example
 * ```typescript
 * const tags = validateStringArray(body.tags, 'tags');
 * // Returns string[] if valid
 * ```
 */
export function validateStringArray(value: unknown, name: string): string[] {
  validateRequired(value, name);

  if (!Array.isArray(value)) {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: 'Must be an array',
      },
    });
  }

  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ValidationError('Validation failed', {
        fields: {
          [name]: `Array element at index ${i} must be a non-empty string`,
        },
      });
    }
  }

  return value as string[];
}

/**
 * Parses and validates a JSON request body.
 *
 * Handles:
 * - Content-Type validation (must be application/json)
 * - JSON parsing with error handling
 * - Custom validation via validator function
 *
 * The validator function should throw ValidationError for invalid data.
 *
 * @param req - HTTP request with JSON body
 * @param validator - Function to validate the parsed body
 * @returns Validated and typed body data
 * @throws ValidationError if JSON is invalid or validation fails
 *
 * @example
 * ```typescript
 * const project = await parseJsonBody(req, (body) => {
 *   return {
 *     name: validateString(body.name, 'name'),
 *     default_path: validateString(body.default_path, 'default_path'),
 *   };
 * });
 * ```
 */
export async function parseJsonBody<T>(
  req: Request,
  validator: (body: unknown) => T
): Promise<T> {
  // Check Content-Type header
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new ValidationError('Invalid request', {
      message: 'Content-Type must be application/json',
    });
  }

  // Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON', {
      message: error instanceof Error ? error.message : 'Failed to parse JSON body',
    });
  }

  // Validate parsed body
  return validator(body);
}

/**
 * Extracts a query parameter from a URL.
 *
 * Returns the parameter value as a string if present, or undefined if missing.
 * If required=true, throws ValidationError when parameter is missing.
 *
 * @param url - Parsed URL object
 * @param name - Query parameter name
 * @param required - Whether the parameter is required (default: false)
 * @returns Parameter value or undefined
 * @throws ValidationError if required parameter is missing
 *
 * @example
 * ```typescript
 * const projectId = extractQueryParam(url, 'project_id', true);
 * // Returns string value or throws if missing
 *
 * const filter = extractQueryParam(url, 'filter');
 * // Returns string value or undefined if missing
 * ```
 */
export function extractQueryParam(
  url: URL,
  name: string,
  required: boolean = false
): string | undefined {
  const value = url.searchParams.get(name);

  if (required && !value) {
    throw new ValidationError('Missing required query parameter', {
      fields: {
        [name]: 'Required query parameter',
      },
    });
  }

  return value || undefined;
}

/**
 * Extracts a path parameter from a URL pathname using a regex pattern.
 *
 * Applies the regex pattern to the pathname and extracts the parameter
 * at the specified capture group index.
 *
 * @param pathname - URL pathname string
 * @param pattern - Regex pattern with capture groups
 * @param paramIndex - Index of the capture group (1-based, default: 1)
 * @returns Extracted parameter value or undefined if no match
 *
 * @example
 * ```typescript
 * // Extract project ID from /api/projects/myproject
 * const id = extractPathParam(url.pathname, /^\/api\/projects\/([^/]+)$/, 1);
 * // Returns 'myproject'
 *
 * // Extract doc ID from /api/docs/REQ-20251208-myproject
 * const docId = extractPathParam(url.pathname, /^\/api\/docs\/([^/]+)$/, 1);
 * // Returns 'REQ-20251208-myproject'
 * ```
 */
export function extractPathParam(
  pathname: string,
  pattern: RegExp,
  paramIndex: number = 1
): string | undefined {
  const match = pathname.match(pattern);
  return match?.[paramIndex];
}

/**
 * Validates that an object has a specific structure.
 *
 * Generic helper for validating object shapes. Checks that the value
 * is an object (not null, not array) before applying further validation.
 *
 * @param value - The value to check
 * @param name - Field name for error messages
 * @returns The value cast as an object
 * @throws ValidationError if value is not an object
 *
 * @example
 * ```typescript
 * const obj = validateObject(body, 'body');
 * // Throws if body is not a plain object
 * ```
 */
export function validateObject(value: unknown, name: string): Record<string, unknown> {
  validateRequired(value, name);

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Validation failed', {
      fields: {
        [name]: 'Must be an object',
      },
    });
  }

  return value as Record<string, unknown>;
}
