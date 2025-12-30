/**
 * useViewerFilters Hook
 *
 * Manages filter state for the Request Log Viewer.
 * Extracted from ViewerContainer to enable sharing between desktop and mobile views.
 *
 * Architecture:
 * - Provides immutable filter state using React state
 * - Computes active filter count for badges/indicators
 * - Manages filter options separately (populated from catalog)
 * - Optional sessionStorage persistence for filter continuity
 *
 * Usage:
 * ```typescript
 * const filters = useViewerFilters();
 *
 * // Set a single filter
 * filters.setFilter('types', ['bug', 'enhancement']);
 *
 * // Clear all filters
 * filters.clearAll();
 *
 * // Check active count
 * console.log(`${filters.activeCount} filters active`);
 * ```
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { FilterState, FilterOptions } from '@core/catalog';
import { createEmptyFilter, createEmptyFilterOptions, isFilterState } from '@core/catalog';

/**
 * Storage key for sessionStorage persistence
 */
const STORAGE_KEY = 'meatycapture-viewer-filters';

/**
 * UseViewerFiltersReturn
 *
 * Return type for the useViewerFilters hook.
 * Provides filter state, mutations, and computed values.
 */
export interface UseViewerFiltersReturn {
  /**
   * Current filter state
   *
   * Immutable object containing all filter facets.
   * Use setFilter() to update individual facets.
   */
  filterState: FilterState;

  /**
   * Set a single filter facet
   *
   * Updates the specified filter key with a new value.
   * Supports all FilterState keys: project_id, types, domains,
   * priorities, statuses, tags, text.
   *
   * @param key - Filter facet to update
   * @param value - New value for the facet
   */
  setFilter: (key: keyof FilterState, value: unknown) => void;

  /**
   * Clear all filters to empty state
   *
   * Resets all filter facets to their default empty values.
   * Useful for "Clear All" button in filter UI.
   */
  clearAll: () => void;

  /**
   * Count of active filters (non-empty values)
   *
   * Computed value indicating how many filter facets have values.
   * Useful for badge displays (e.g., "Filters (3)").
   *
   * Counts:
   * - project_id: 1 if defined
   * - types, domains, priorities, statuses, tags: 1 each if length > 0
   * - text: 1 if non-empty string after trim
   */
  activeCount: number;

  /**
   * Available filter options
   *
   * Options to display in filter dropdowns.
   * Populated from catalog data via setFilterOptions().
   */
  filterOptions: FilterOptions;

  /**
   * Set filter options
   *
   * Updates available filter options from catalog data.
   * Called when catalog loads or refreshes.
   *
   * @param options - New filter options
   */
  setFilterOptions: (options: FilterOptions) => void;
}

/**
 * Load filter state from sessionStorage
 *
 * Attempts to restore previously saved filter state.
 * Returns empty filter if storage is unavailable or invalid.
 *
 * @returns Restored filter state or empty filter
 */
function loadFromStorage(): FilterState {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return createEmptyFilter();
    }

    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createEmptyFilter();
    }

    const parsed = JSON.parse(stored);
    if (isFilterState(parsed)) {
      return parsed;
    }

    // Invalid stored state, return empty
    return createEmptyFilter();
  } catch {
    // Storage access failed, return empty
    return createEmptyFilter();
  }
}

/**
 * Save filter state to sessionStorage
 *
 * Persists current filter state for session continuity.
 * Silently fails if storage is unavailable.
 *
 * @param state - Filter state to save
 */
function saveToStorage(state: FilterState): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage access failed, silently ignore
  }
}

/**
 * Calculate the count of active (non-empty) filter facets
 *
 * @param state - Filter state to analyze
 * @returns Number of active filter facets
 */
function calculateActiveCount(state: FilterState): number {
  let count = 0;

  // project_id: active if defined
  if (state.project_id !== undefined) {
    count += 1;
  }

  // Arrays: active if non-empty
  if (state.types.length > 0) count += 1;
  if (state.domains.length > 0) count += 1;
  if (state.priorities.length > 0) count += 1;
  if (state.statuses.length > 0) count += 1;
  if (state.tags.length > 0) count += 1;

  // text: active if non-empty after trim
  if (state.text.trim() !== '') count += 1;

  return count;
}

/**
 * useViewerFilters Hook
 *
 * Manages filter state for the Request Log Viewer.
 * Provides setFilter, clearAll, and computed activeCount.
 *
 * Features:
 * - Immutable filter state with individual facet updates
 * - Active count computation for UI badges
 * - Separate filter options management
 * - Optional sessionStorage persistence
 *
 * State Management:
 * - filterState: Current filter values
 * - filterOptions: Available values for dropdowns
 *
 * Performance:
 * - Stable callback references via useCallback
 * - Memoized activeCount via useMemo
 * - Batched storage writes via useEffect
 *
 * @returns UseViewerFiltersReturn with filter state and operations
 */
export function useViewerFilters(): UseViewerFiltersReturn {
  // ============================================================================
  // State
  // ============================================================================

  /**
   * Filter state with sessionStorage initialization
   */
  const [filterState, setFilterState] = useState<FilterState>(() => loadFromStorage());

  /**
   * Available filter options (from catalog)
   */
  const [filterOptions, setFilterOptionsState] = useState<FilterOptions>(
    createEmptyFilterOptions()
  );

  // ============================================================================
  // Storage Persistence
  // ============================================================================

  /**
   * Persist filter state to sessionStorage on changes
   */
  useEffect(() => {
    saveToStorage(filterState);
  }, [filterState]);

  // ============================================================================
  // Callbacks
  // ============================================================================

  /**
   * Set a single filter facet
   *
   * Updates filter state with new value for specified key.
   * Creates new state object for immutability.
   */
  const setFilter = useCallback((key: keyof FilterState, value: unknown): void => {
    setFilterState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Clear all filters to empty state
   *
   * Resets filter state using factory function.
   */
  const clearAll = useCallback((): void => {
    setFilterState(createEmptyFilter());
  }, []);

  /**
   * Set filter options
   *
   * Wrapper for stable reference.
   */
  const setFilterOptions = useCallback((options: FilterOptions): void => {
    setFilterOptionsState(options);
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Calculate active filter count
   *
   * Memoized to avoid recalculating on every render.
   */
  const activeCount = useMemo(() => calculateActiveCount(filterState), [filterState]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    filterState,
    setFilter,
    clearAll,
    activeCount,
    filterOptions,
    setFilterOptions,
  };
}
