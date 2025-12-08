/**
 * HTTP Client for MeatyCapture API
 *
 * Browser-compatible HTTP client using the native fetch API.
 * Provides type-safe request methods with automatic:
 * - Bearer token authentication
 * - Request timeout via AbortController
 * - Retry logic with exponential backoff
 * - Date deserialization (ISO strings → Date objects)
 * - HTTP status code → typed error mapping
 *
 * Usage:
 * ```typescript
 * const client = new HttpClient({
 *   baseUrl: 'http://localhost:3001',
 *   authToken: 'my-token',
 *   timeout: 30000,
 *   retries: 3,
 * });
 *
 * const docs = await client.get<DocMeta[]>('/api/docs', { directory: '/path' });
 * const doc = await client.post<RequestLogDoc>('/api/docs/REQ-123', { path: '/path' }, docBody);
 * const isWritable = await client.head('/api/docs/REQ-123', { path: '/path' });
 * ```
 */

import type { HttpClientConfig } from './types.js';
import {
  ApiError,
  NetworkError,
  ValidationError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  ConflictError,
  StorageError,
  TimeoutError,
} from './types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:3737',
  timeout: 30000, // 30 seconds
  retries: 3,
} as const;

/**
 * Deserializes ISO date strings to Date objects recursively
 *
 * Traverses objects and arrays to find and convert ISO 8601 date strings
 * to native Date objects. This enables seamless date handling across the
 * HTTP boundary.
 *
 * @param obj - Value to deserialize (can be primitive, object, or array)
 * @returns Deserialized value with Date objects
 */
function deserializeDates(obj: unknown): unknown {
  // Convert ISO date strings to Date objects
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return new Date(obj);
  }

  // Recursively process arrays
  if (Array.isArray(obj)) {
    return obj.map(deserializeDates);
  }

  // Recursively process objects
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deserializeDates(v)])
    );
  }

  return obj;
}

/**
 * Maps HTTP response to appropriate error class
 *
 * Converts HTTP status codes to domain-specific error types for
 * better error handling and type safety in application code.
 *
 * @param response - HTTP response object
 * @param responseBody - Parsed response body (if available)
 * @returns Typed error instance
 */
async function mapHttpError(response: Response, responseBody?: unknown): Promise<ApiError> {
  let message = `HTTP ${response.status}: ${response.statusText}`;

  // Extract error message from response body if available
  if (responseBody && typeof responseBody === 'object' && 'error' in responseBody) {
    message = String(responseBody.error);
  } else if (responseBody && typeof responseBody === 'object' && 'message' in responseBody) {
    message = String(responseBody.message);
  }

  // Map status codes to error classes
  switch (response.status) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new PermissionDeniedError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 500:
    case 502:
    case 503:
    case 504:
      return new StorageError(message, response.status);
    default:
      return new ApiError(message, { status: response.status });
  }
}

/**
 * HTTP Client for MeatyCapture API
 *
 * Type-safe HTTP client with automatic error handling, retries, and date deserialization.
 * All public methods return promises that resolve to typed responses or throw typed errors.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly authToken?: string;
  private readonly timeout: number;
  private readonly retries: number;

  /**
   * Creates a new HTTP client instance
   *
   * @param config - Client configuration
   */
  constructor(config: HttpClientConfig = {}) {
    // Resolve base URL: config > env var > default
    const resolvedBaseUrl = config.baseUrl
      || (typeof process !== 'undefined' ? process.env.MEATYCAPTURE_API_URL : undefined)
      || DEFAULT_CONFIG.baseUrl;

    // Ensure baseUrl doesn't end with slash for consistent URL joining
    this.baseUrl = resolvedBaseUrl.endsWith('/')
      ? resolvedBaseUrl.slice(0, -1)
      : resolvedBaseUrl;

    // Resolve auth token: config > env var
    const resolvedToken = config.authToken
      || (typeof process !== 'undefined' ? process.env.MEATYCAPTURE_AUTH_TOKEN : undefined);

    // Only assign authToken if actually defined (strict optional handling)
    if (resolvedToken !== undefined) {
      this.authToken = resolvedToken;
    }

    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.retries = config.retries ?? DEFAULT_CONFIG.retries;
  }

  /**
   * Builds complete URL from path and query parameters
   *
   * @param path - API path (e.g., '/api/docs')
   * @param query - Optional query parameters
   * @returns Complete URL string
   */
  private buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Builds request headers with authentication
   *
   * @returns Headers object with Content-Type and optional Authorization
   */
  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Executes HTTP request with retry logic and timeout
   *
   * Implements exponential backoff for retries (1s, 2s, 4s).
   * Retries only on network failures and 5xx errors.
   * Does NOT retry on 4xx client errors.
   *
   * @param url - Complete URL to request
   * @param options - Fetch options
   * @param attempt - Current attempt number (used for recursion)
   * @returns HTTP response
   * @throws NetworkError, TimeoutError, or ApiError subclass
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 5xx server errors if retries remaining
      if (response.status >= 500 && attempt < this.retries) {
        const backoffDelay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(`Request timeout after ${this.timeout}ms: ${url}`);
      }

      // Retry network failures if retries remaining
      if (attempt < this.retries) {
        const backoffDelay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      // All retries exhausted - throw network error
      throw new NetworkError(
        `Network request failed after ${attempt} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Processes HTTP response and extracts typed data
   *
   * Handles error responses, deserializes dates, and returns typed result.
   *
   * @param response - HTTP response
   * @returns Typed response data (if successful)
   * @throws ApiError or subclass on error responses
   */
  private async processResponse<T>(response: Response): Promise<T> {
    // Parse response body (may be empty for HEAD requests)
    let body: unknown;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        body = await response.json();
      } catch {
        // Empty or invalid JSON body (e.g., HEAD request)
        body = null;
      }
    }

    // Handle error responses
    if (!response.ok) {
      throw await mapHttpError(response, body);
    }

    // Deserialize dates and return typed result
    return deserializeDates(body) as T;
  }

  /**
   * GET request
   *
   * @param path - API path (e.g., '/api/docs')
   * @param query - Optional query parameters
   * @returns Typed response data
   * @throws ApiError or subclass on failure
   *
   * @example
   * ```typescript
   * const docs = await client.get<DocMeta[]>('/api/docs', { directory: '/path' });
   * ```
   */
  async get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers,
    });

    return this.processResponse<T>(response);
  }

  /**
   * POST request
   *
   * @param path - API path (e.g., '/api/docs/REQ-123')
   * @param query - Optional query parameters
   * @param body - Optional request body (will be JSON.stringify'd)
   * @returns Typed response data
   * @throws ApiError or subclass on failure
   *
   * @example
   * ```typescript
   * const result = await client.post<{ success: boolean }>(
   *   '/api/docs/REQ-123',
   *   { path: '/path/to/doc.md' },
   *   { doc_id: 'REQ-123', title: 'My Doc', ... }
   * );
   * ```
   */
  async post<T>(path: string, query?: Record<string, string>, body?: unknown): Promise<T> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    // Build request options with strict optional handling
    const options: RequestInit = {
      method: 'POST',
      headers,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, options);

    return this.processResponse<T>(response);
  }

  /**
   * PATCH request
   *
   * @param path - API path (e.g., '/api/docs/REQ-123/items')
   * @param query - Optional query parameters
   * @param body - Optional request body (will be JSON.stringify'd)
   * @returns Typed response data
   * @throws ApiError or subclass on failure
   *
   * @example
   * ```typescript
   * const updatedDoc = await client.patch<RequestLogDoc>(
   *   '/api/docs/REQ-123/items',
   *   { path: '/path/to/doc.md' },
   *   { title: 'New item', type: 'enhancement', ... }
   * );
   * ```
   */
  async patch<T>(path: string, query?: Record<string, string>, body?: unknown): Promise<T> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    // Build request options with strict optional handling
    const options: RequestInit = {
      method: 'PATCH',
      headers,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, options);

    return this.processResponse<T>(response);
  }

  /**
   * DELETE request
   *
   * @param path - API path (e.g., '/api/projects/my-project')
   * @param query - Optional query parameters
   * @returns Typed response data
   * @throws ApiError or subclass on failure
   *
   * @example
   * ```typescript
   * await client.delete<{ success: boolean }>('/api/projects/my-project');
   * ```
   */
  async delete<T>(path: string, query?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    const response = await this.fetchWithRetry(url, {
      method: 'DELETE',
      headers,
    });

    return this.processResponse<T>(response);
  }

  /**
   * HEAD request (check resource existence/writability)
   *
   * @param path - API path (e.g., '/api/docs/REQ-123')
   * @param query - Optional query parameters
   * @returns true if 200 OK, false if 403 Forbidden
   * @throws ApiError or subclass on other failures
   *
   * @example
   * ```typescript
   * const isWritable = await client.head('/api/docs/REQ-123', { path: '/path/to/doc.md' });
   * if (isWritable) {
   *   // Proceed with write operation
   * }
   * ```
   */
  async head(path: string, query?: Record<string, string>): Promise<boolean> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    const response = await this.fetchWithRetry(url, {
      method: 'HEAD',
      headers,
    });

    // HEAD returns 200 for writable, 403 for not writable
    if (response.status === 200) {
      return true;
    }

    if (response.status === 403) {
      return false;
    }

    // Any other status is an error
    throw await mapHttpError(response);
  }
}
