/**
 * useDocumentCache Hook
 *
 * Manages in-memory cache of loaded RequestLogDoc instances.
 * Provides stable API for cache operations with useCallback optimization.
 *
 * Architecture:
 * - Uses Map<string, RequestLogDoc> for O(1) lookups by path
 * - Provides stable callback references for cache operations
 * - Cache is cleared on invalidate() (e.g., during refresh)
 *
 * Usage:
 * ```typescript
 * const cache = useDocumentCache();
 *
 * // Check cache before loading
 * if (cache.has(path)) {
 *   const doc = cache.get(path);
 * } else {
 *   const doc = await loadFromDisk(path);
 *   cache.set(path, doc);
 * }
 *
 * // Clear cache on refresh
 * cache.invalidate();
 * ```
 */

import { useState, useCallback } from 'react';
import type { RequestLogDoc } from '@core/models';

/**
 * DocumentCacheResult
 *
 * Return type for useDocumentCache hook.
 * Provides stable methods for cache operations and access to underlying Map.
 */
export interface DocumentCacheResult {
  /**
   * Get cached document by path
   *
   * @param path - Document file path
   * @returns Cached document or undefined if not found
   */
  get: (path: string) => RequestLogDoc | undefined;

  /**
   * Store document in cache
   *
   * @param path - Document file path
   * @param doc - Document to cache
   */
  set: (path: string, doc: RequestLogDoc) => void;

  /**
   * Check if document is cached
   *
   * @param path - Document file path
   * @returns True if document is in cache
   */
  has: (path: string) => boolean;

  /**
   * Clear all cached documents
   *
   * Removes all entries from cache.
   * Used during refresh to force re-loading from disk.
   */
  invalidate: () => void;

  /**
   * Get the cache Map for passing to children
   *
   * Returns the underlying Map instance.
   * Useful for passing to child components that need direct access.
   *
   * @returns Cache Map instance
   */
  cache: Map<string, RequestLogDoc>;
}

/**
 * useDocumentCache Hook
 *
 * Provides in-memory cache for loaded RequestLogDoc instances.
 * All methods are stable (useCallback) to prevent unnecessary re-renders.
 *
 * State Management:
 * - Uses Map<string, RequestLogDoc> for efficient lookups
 * - Cache persists across re-renders until invalidate() is called
 * - No automatic cache expiration (manual control via invalidate)
 *
 * Performance:
 * - O(1) cache lookups via Map.has() and Map.get()
 * - Stable callback references prevent child re-renders
 * - Map instance reference changes only on set/invalidate
 *
 * @returns DocumentCacheResult with cache operations
 */
export function useDocumentCache(): DocumentCacheResult {
  // Internal cache state
  const [cache, setCache] = useState<Map<string, RequestLogDoc>>(new Map());

  /**
   * Get cached document
   *
   * Stable callback that retrieves document from current cache.
   * Returns undefined if path is not in cache.
   */
  const get = useCallback(
    (path: string): RequestLogDoc | undefined => {
      return cache.get(path);
    },
    [cache]
  );

  /**
   * Store document in cache
   *
   * Stable callback that creates new Map with added entry.
   * Triggers re-render with updated cache state.
   */
  const set = useCallback((path: string, doc: RequestLogDoc): void => {
    setCache((prev) => new Map(prev).set(path, doc));
  }, []);

  /**
   * Check if document is cached
   *
   * Stable callback that checks cache membership.
   * More efficient than get() when only checking existence.
   */
  const has = useCallback(
    (path: string): boolean => {
      return cache.has(path);
    },
    [cache]
  );

  /**
   * Clear all cached documents
   *
   * Stable callback that resets cache to empty Map.
   * Used during refresh to force re-loading from disk.
   */
  const invalidate = useCallback((): void => {
    setCache(new Map());
  }, []);

  return {
    get,
    set,
    has,
    invalidate,
    cache,
  };
}
