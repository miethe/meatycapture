/**
 * API Client Adapter
 *
 * Browser-compatible HTTP client for communicating with the MeatyCapture API server.
 * Provides type-safe request methods with automatic retry logic, timeout handling,
 * and date deserialization.
 *
 * @module adapters/api-client
 */

export { HttpClient } from './http-client.js';
export type { HttpClientConfig } from './types.js';
export {
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
export { ApiDocStore } from './api-doc-store.js';
export { ApiProjectStore, ApiFieldCatalogStore } from './api-config-stores.js';
