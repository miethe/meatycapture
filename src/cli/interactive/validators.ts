/**
 * Interactive Input Validators
 *
 * Validation functions for interactive prompt inputs.
 * Returns error message string on validation failure, null on success.
 */

import type { FieldName } from '@core/models';

/**
 * Valid field names for field catalog.
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
 * Validates that a value is non-empty after trimming.
 *
 * @param value - Value to validate
 * @param fieldName - Name of field for error message
 * @returns Error message or null
 */
export function validateNonEmpty(value: string, fieldName = 'Value'): string | null {
  if (!value.trim()) {
    return `${fieldName} cannot be empty`;
  }
  return null;
}

/**
 * Validates project ID format (kebab-case).
 *
 * Rules:
 * - Lowercase alphanumeric and hyphens only
 * - Cannot start or end with hyphen
 * - No consecutive hyphens
 * - Minimum 2 characters
 *
 * @param id - Project ID to validate
 * @returns Error message or null
 */
export function validateProjectId(id: string): string | null {
  if (!id.trim()) {
    return 'Project ID cannot be empty';
  }

  // Check kebab-case format
  const kebabPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!kebabPattern.test(id)) {
    return 'Project ID must be kebab-case (lowercase, alphanumeric, hyphens only)';
  }

  if (id.length < 2) {
    return 'Project ID must be at least 2 characters';
  }

  return null;
}

/**
 * Validates that a path exists and is a directory.
 * Note: This is a synchronous check for validation during prompts.
 *
 * @param path - Path to validate
 * @returns Error message or null
 */
export function validatePath(path: string): string | null {
  if (!path.trim()) {
    return 'Path cannot be empty';
  }

  // Basic path validation (doesn't check existence - that's done async)
  // Just check for obviously invalid paths
  if (path.includes('\0')) {
    return 'Invalid path (contains null character)';
  }

  return null;
}

/**
 * Validates URL format (basic check).
 *
 * @param url - URL to validate
 * @returns Error message or null
 */
export function validateUrl(url: string): string | null {
  if (!url.trim()) {
    return null; // Empty is OK for optional URLs
  }

  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format (must start with http:// or https://)';
  }
}

/**
 * Validates field name is one of the allowed values.
 *
 * @param fieldName - Field name to validate
 * @returns Error message or null
 */
export function validateFieldName(fieldName: string): string | null {
  if (!fieldName.trim()) {
    return 'Field name cannot be empty';
  }

  const normalized = fieldName.toLowerCase();
  if (!(VALID_FIELD_NAMES as readonly string[]).includes(normalized)) {
    return `Invalid field name. Must be one of: ${VALID_FIELD_NAMES.join(', ')}`;
  }

  return null;
}

/**
 * Validates field scope is either 'global' or 'project'.
 *
 * @param scope - Scope to validate
 * @returns Error message or null
 */
export function validateFieldScope(scope: string): string | null {
  if (!scope.trim()) {
    return 'Scope cannot be empty';
  }

  const normalized = scope.toLowerCase();
  if (normalized !== 'global' && normalized !== 'project') {
    return 'Scope must be either "global" or "project"';
  }

  return null;
}

/**
 * Creates a validator that checks if value is in a list of allowed values.
 *
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of field for error message
 * @param caseSensitive - Whether comparison is case-sensitive (default: false)
 * @returns Validator function
 */
export function createEnumValidator(
  allowedValues: readonly string[],
  fieldName = 'Value',
  caseSensitive = false
): (value: string) => string | null {
  return (value: string): string | null => {
    if (!value.trim()) {
      return `${fieldName} cannot be empty`;
    }

    const normalizedValue = caseSensitive ? value : value.toLowerCase();
    const normalizedAllowed = caseSensitive
      ? allowedValues
      : allowedValues.map((v) => v.toLowerCase());

    if (!normalizedAllowed.includes(normalizedValue)) {
      return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
    }

    return null;
  };
}

/**
 * Validates a yes/no response.
 * Accepts: y, yes, n, no (case-insensitive)
 *
 * @param value - Value to validate
 * @returns Error message or null
 */
export function validateYesNo(value: string): string | null {
  if (!value.trim()) {
    return null; // Empty is OK - will use default
  }

  const normalized = value.toLowerCase();
  if (!['y', 'yes', 'n', 'no'].includes(normalized)) {
    return 'Please enter y/yes or n/no';
  }

  return null;
}

/**
 * Validates a number input.
 *
 * @param value - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Error message or null
 */
export function validateNumber(
  value: string,
  min?: number,
  max?: number
): string | null {
  if (!value.trim()) {
    return 'Please enter a number';
  }

  const num = parseInt(value, 10);
  if (isNaN(num)) {
    return 'Invalid number';
  }

  if (min !== undefined && num < min) {
    return `Number must be at least ${min}`;
  }

  if (max !== undefined && num > max) {
    return `Number must be at most ${max}`;
  }

  return null;
}
