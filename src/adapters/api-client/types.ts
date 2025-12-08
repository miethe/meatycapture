/**
 * API Client Types and Error Classes
 *
 * Type-safe HTTP client abstractions for communicating with the MeatyCapture API server.
 * Provides structured error hierarchy that maps HTTP status codes to domain-specific exceptions.
 *
 * Error Hierarchy:
 * - ApiError (base): All API-related errors
 *   - NetworkError: Network failures, timeouts
 *   - ValidationError: 400 Bad Request
 *   - AuthenticationError: 401 Unauthorized
 *   - PermissionDeniedError: 403 Forbidden
 *   - NotFoundError: 404 Not Found
 *   - ConflictError: 409 Conflict
 *   - StorageError: 500+ Server errors
 *   - TimeoutError: Request timeout (AbortController)
 */

/**
 * Base API error class
 * All API client errors extend from this class
 */
export class ApiError extends Error {
  /** HTTP status code if available */
  status?: number;
  /** Application-specific error code */
  code?: string;
  /** Original error that caused this error */
  cause?: Error;

  constructor(message: string, options?: { status?: number; code?: string; cause?: Error }) {
    super(message);
    this.name = 'ApiError';

    // Only assign properties if they're actually defined (strict optional handling)
    if (options?.status !== undefined) {
      this.status = options.status;
    }
    if (options?.code !== undefined) {
      this.code = options.code;
    }
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Network failure error
 * Thrown when fetch fails due to network issues (DNS, connection refused, etc.)
 */
export class NetworkError extends ApiError {
  constructor(message: string, cause?: Error) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'NetworkError';
  }
}

/**
 * Validation error (400 Bad Request)
 * Thrown when request parameters or body fail validation
 */
export class ValidationError extends ApiError {
  constructor(message: string, options?: { code?: string }) {
    super(message, options?.code !== undefined ? { status: 400, code: options.code } : { status: 400 });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401 Unauthorized)
 * Thrown when authentication token is missing or invalid
 */
export class AuthenticationError extends ApiError {
  constructor(message: string) {
    super(message, { status: 401 });
    this.name = 'AuthenticationError';
  }
}

/**
 * Permission denied error (403 Forbidden)
 * Thrown when user lacks permissions for the requested operation
 */
export class PermissionDeniedError extends ApiError {
  constructor(message: string) {
    super(message, { status: 403 });
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Not found error (404 Not Found)
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(message: string) {
    super(message, { status: 404 });
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409 Conflict)
 * Thrown when operation conflicts with current resource state
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, { status: 409 });
    this.name = 'ConflictError';
  }
}

/**
 * Storage error (500+ Server Error)
 * Thrown when server encounters internal errors
 */
export class StorageError extends ApiError {
  constructor(message: string, status?: number) {
    super(message, { status: status || 500 });
    this.name = 'StorageError';
  }
}

/**
 * Timeout error
 * Thrown when request exceeds configured timeout duration
 */
export class TimeoutError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  /**
   * Base URL for API requests
   * @default process.env.MEATYCAPTURE_API_URL || 'http://localhost:3737'
   * @example 'http://localhost:3001'
   * @example 'https://api.meatycapture.com'
   */
  baseUrl?: string;

  /**
   * Bearer token for authentication
   * @default process.env.MEATYCAPTURE_AUTH_TOKEN
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  authToken?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Number of retry attempts for failed requests
   * Retries are only attempted for:
   * - Network failures (fetch throws)
   * - 5xx server errors
   * @default 3
   */
  retries?: number;
}
