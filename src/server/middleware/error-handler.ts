/**
 * Error Handling Middleware
 *
 * Centralized error handling for the Bun HTTP server.
 * Provides consistent error responses, logging, and production sanitization.
 *
 * Features:
 * - Custom error classes for common HTTP scenarios
 * - Automatic error-to-status-code mapping
 * - Structured JSON error responses
 * - Stack trace logging for debugging
 * - Production mode sanitization (hides internal details)
 * - Request context tracking
 */

import { logger } from '../../core/logging/index.js';

/**
 * Structured error response format
 * Returned to clients as JSON
 */
export interface ErrorResponse {
  /** Error code/type identifier (e.g., 'NotFound', 'ValidationError') */
  error: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional details (validation errors, field-level info, etc.) */
  details?: unknown;
}

/**
 * Request context for error logging
 * Captures HTTP request metadata for debugging
 */
export interface RequestContext {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request URL path */
  path: string;
  /** Request headers (for auth, content-type debugging) */
  headers?: Record<string, string>;
}

// ============================================================================
// Custom Error Classes
// ============================================================================
// These provide semantic error types that map to specific HTTP status codes
// and include optional metadata for error details.
// ============================================================================

/**
 * 404 Not Found Error
 *
 * Thrown when a requested resource (document, project, field option) doesn't exist.
 * Maps to HTTP 404 status code.
 *
 * @example
 * ```typescript
 * throw new NotFoundError('Document not found: REQ-20251208-myproject');
 * ```
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    // Maintains proper stack trace for debugging in V8 engines
    Error.captureStackTrace?.(this, NotFoundError);
  }
}

/**
 * 400 Bad Request / Validation Error
 *
 * Thrown when request validation fails (missing required fields, invalid formats, etc.).
 * Maps to HTTP 400 status code.
 *
 * The `details` field can contain structured validation error information,
 * such as field-level error messages or schema validation results.
 *
 * @example
 * ```typescript
 * throw new ValidationError('Invalid project data', {
 *   fields: {
 *     name: 'Required field',
 *     default_path: 'Must be absolute path'
 *   }
 * });
 * ```
 */
export class ValidationError extends Error {
  /** Structured validation error details */
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    Error.captureStackTrace?.(this, ValidationError);
  }
}

/**
 * 409 Conflict Error
 *
 * Thrown when a resource conflict occurs (duplicate ID, concurrent modification, etc.).
 * Maps to HTTP 409 status code.
 *
 * @example
 * ```typescript
 * throw new ConflictError('Project with ID "myproject" already exists');
 * ```
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Error.captureStackTrace?.(this, ConflictError);
  }
}

/**
 * 403 Forbidden / Permission Error
 *
 * Thrown when a file system permission error occurs or access is denied.
 * Maps to HTTP 403 status code.
 *
 * @example
 * ```typescript
 * throw new PermissionError('Cannot write to directory: permission denied');
 * ```
 */
export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
    Error.captureStackTrace?.(this, PermissionError);
  }
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Maps any error to an HTTP status code and structured error response.
 *
 * Handles:
 * - Custom error classes (NotFoundError, ValidationError, etc.)
 * - Node.js file system errors (ENOENT, EACCES, etc.)
 * - Generic JavaScript errors
 *
 * Error mapping strategy:
 * - Custom error classes → Their designated HTTP status
 * - ENOENT (file not found) → 404
 * - EACCES (permission denied) → 403
 * - EEXIST (file exists) → 409
 * - All other errors → 500 Internal Server Error
 *
 * Production sanitization:
 * - In production (NODE_ENV === 'production'), 500 errors are sanitized
 * - Stack traces and internal details are hidden from clients
 * - Only generic error messages are returned
 *
 * @param error - The error to map
 * @returns Object with HTTP status code and error response body
 *
 * @example
 * ```typescript
 * const { status, body } = mapErrorToResponse(new NotFoundError('Doc not found'));
 * // status: 404, body: { error: 'NotFoundError', message: 'Doc not found' }
 *
 * const { status, body } = mapErrorToResponse({ code: 'ENOENT', message: 'File not found' });
 * // status: 404, body: { error: 'NotFound', message: 'File not found' }
 * ```
 */
export function mapErrorToResponse(error: unknown): { status: number; body: ErrorResponse } {
  const isProduction = process.env.NODE_ENV === 'production';

  // Handle custom error classes
  if (error instanceof NotFoundError) {
    return {
      status: 404,
      body: {
        error: 'NotFound',
        message: error.message,
      },
    };
  }

  if (error instanceof ValidationError) {
    const body: ErrorResponse = {
      error: 'ValidationError',
      message: error.message,
    };
    if (error.details !== undefined) {
      body.details = error.details;
    }
    return {
      status: 400,
      body,
    };
  }

  if (error instanceof ConflictError) {
    return {
      status: 409,
      body: {
        error: 'Conflict',
        message: error.message,
      },
    };
  }

  if (error instanceof PermissionError) {
    return {
      status: 403,
      body: {
        error: 'Forbidden',
        message: error.message,
      },
    };
  }

  // Handle Node.js file system errors by checking error code
  if (error && typeof error === 'object' && 'code' in error) {
    const nodeError = error as { code: string; message?: string };

    // ENOENT: File or directory not found
    if (nodeError.code === 'ENOENT') {
      return {
        status: 404,
        body: {
          error: 'NotFound',
          message: nodeError.message || 'Resource not found',
        },
      };
    }

    // EACCES: Permission denied
    if (nodeError.code === 'EACCES') {
      return {
        status: 403,
        body: {
          error: 'Forbidden',
          message: nodeError.message || 'Permission denied',
        },
      };
    }

    // EEXIST: File or directory already exists
    if (nodeError.code === 'EEXIST') {
      return {
        status: 409,
        body: {
          error: 'Conflict',
          message: nodeError.message || 'Resource already exists',
        },
      };
    }
  }

  // Default: 500 Internal Server Error
  // Sanitize internal error details in production
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';

  return {
    status: 500,
    body: {
      error: 'InternalServerError',
      message: isProduction
        ? 'An internal server error occurred. Please try again later.'
        : message,
    },
  };
}

// ============================================================================
// Error Wrapper
// ============================================================================

/**
 * Wraps a route handler with error handling logic.
 *
 * This function catches all errors thrown by the handler, logs them with
 * stack traces and request context, maps them to HTTP responses, and
 * returns structured error responses.
 *
 * Usage pattern:
 * ```typescript
 * // In route handler
 * return withErrorHandling(async () => {
 *   const doc = await docStore.read(docId);
 *   return Response.json(doc);
 * }, { method: 'GET', path: `/api/docs/${docId}` });
 * ```
 *
 * Error handling flow:
 * 1. Execute handler
 * 2. If error occurs:
 *    a. Log error with stack trace and request context
 *    b. Map error to HTTP status code and response
 *    c. Return JSON error response
 * 3. If success, return handler's response
 *
 * Logging includes:
 * - Error message and stack trace
 * - Error name/type
 * - HTTP method and path
 * - Request headers (for debugging auth, content-type issues)
 *
 * @param handler - Async function that returns a Response
 * @param context - Optional request context for logging
 * @returns Promise resolving to Response (success or error)
 *
 * @example
 * ```typescript
 * // Basic usage
 * export async function handleGetDoc(docId: string): Promise<Response> {
 *   return withErrorHandling(async () => {
 *     const doc = await docStore.read(docId);
 *     return Response.json(doc);
 *   });
 * }
 *
 * // With request context
 * export async function handleRequest(req: Request): Promise<Response> {
 *   const url = new URL(req.url);
 *   return withErrorHandling(
 *     async () => {
 *       // Handler logic...
 *       return Response.json({ success: true });
 *     },
 *     {
 *       method: req.method,
 *       path: url.pathname,
 *       headers: Object.fromEntries(req.headers.entries()),
 *     }
 *   );
 * }
 * ```
 */
export async function withErrorHandling(
  handler: () => Response | Promise<Response>,
  context?: RequestContext
): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    // Log error with full details for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'Error';
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // Build log context with error details and request context
    const logContext: Record<string, unknown> = {
      errorName,
      errorMessage,
      ...(context && {
        request: {
          method: context.method,
          path: context.path,
        },
      }),
    };

    // Include validation details if available
    if (error instanceof ValidationError && error.details) {
      logContext.validationDetails = error.details;
    }

    // Log with stack trace
    logger.error('Request handler error', logContext);

    // Log stack trace separately for better readability
    if (stackTrace) {
      logger.debug('Error stack trace', { stack: stackTrace });
    }

    // Map error to HTTP response
    const { status, body } = mapErrorToResponse(error);

    // Return structured error response
    return Response.json(body, {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
