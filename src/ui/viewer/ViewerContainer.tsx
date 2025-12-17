/**
 * ViewerContainer Component
 *
 * Main orchestration component for the Request Log Viewer.
 * Manages catalog loading, filtering, sorting, and document caching.
 *
 * Architecture:
 * - Loads catalog on mount using listAllDocuments()
 * - Manages filter state with multi-faceted filtering
 * - Caches full documents on-demand for expansion
 * - Provides manual refresh to re-scan filesystem
 *
 * Child Components (to be integrated):
 * - DocumentFilters (TASK-2.3) - Filter controls
 * - DocumentCatalog (TASK-2.4) - Grouped/sorted list of documents
 * - DocumentDetail (TASK-2.5) - Expanded document view
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { RequestLogDoc } from '@core/models';
import type { CatalogEntry, FilterState, CatalogSort, FilterOptions } from '@core/catalog';
import {
  createEmptyFilter,
  createDefaultSort,
  applyFilters,
  createGroupedCatalog,
} from '@core/catalog';
import { listAllDocuments, extractFilterOptions } from '@core/catalog/utils';
import type { ViewerContainerProps } from './types';
import './viewer.css';

/**
 * ViewerContainer
 *
 * Main container component for the Request Log Viewer feature.
 * Orchestrates catalog loading, filtering, sorting, and caching.
 *
 * State Management:
 * - catalog: All loaded documents (CatalogEntry[])
 * - filterState: Current filter criteria (multi-faceted)
 * - sort: Current sort configuration
 * - filterOptions: Available filter values from catalog
 * - documentCache: Full document data for expanded views
 * - loading: Initial load or refresh state
 * - error: Error message if load fails
 *
 * @param props - ProjectStore and DocStore dependencies
 * @returns ViewerContainer component
 */
export function ViewerContainer({
  projectStore,
  docStore,
}: ViewerContainerProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  /** All loaded catalog entries from filesystem */
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

  /** Current filter criteria */
  const [filterState, setFilterState] = useState<FilterState>(createEmptyFilter());

  /** Current sort configuration */
  const [sort, setSort] = useState<CatalogSort>(createDefaultSort());

  /** Available filter values (extracted from catalog) */
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
    types: [],
    domains: [],
    priorities: [],
    statuses: [],
    tags: [],
  });

  /** Cache of full documents (path -> RequestLogDoc) */
  const [documentCache, setDocumentCache] = useState<Map<string, RequestLogDoc>>(new Map());

  /** Loading state during catalog load/refresh */
  const [loading, setLoading] = useState<boolean>(true);

  /** Error message if catalog load fails */
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Catalog Loading
  // ============================================================================

  /**
   * Load catalog from filesystem
   *
   * Scans all enabled projects and aggregates documents into catalog.
   * Extracts available filter options from loaded data.
   * Called on mount and when user clicks refresh button.
   */
  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.info('[ViewerContainer] Loading catalog...');

      // Load all documents across enabled projects
      const entries = await listAllDocuments(projectStore, docStore);

      // Load projects for filter options
      const projects = await projectStore.list();

      // Extract available filter values
      const options = extractFilterOptions(entries, projects);

      setCatalog(entries);
      setFilterOptions(options);

      console.info(`[ViewerContainer] Loaded ${entries.length} document(s)`);
    } catch (err) {
      console.error('[ViewerContainer] Failed to load catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [projectStore, docStore]);

  /**
   * Load catalog on mount
   */
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  /**
   * Handle manual refresh button
   *
   * Re-scans filesystem for new/updated documents.
   * Clears document cache to force re-loading.
   */
  const handleRefresh = useCallback(() => {
    setDocumentCache(new Map()); // Clear cache
    loadCatalog();
  }, [loadCatalog]);

  // ============================================================================
  // Filter Management
  // ============================================================================

  /**
   * Handle filter change for a specific facet
   *
   * Updates filter state with new value for the specified key.
   * Supports both single-value and multi-value filter facets.
   *
   * @param key - Filter facet to update
   * @param value - New value for the facet
   */
  const handleFilterChange = useCallback((key: keyof FilterState, value: unknown) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Clear all filters
   *
   * Resets filter state to empty (all facets cleared).
   */
  const handleClearFilters = useCallback(() => {
    setFilterState(createEmptyFilter());
  }, []);

  // ============================================================================
  // Sort Management
  // ============================================================================

  /**
   * Handle sort change
   *
   * Updates sort configuration (field and order).
   *
   * @param newSort - New sort configuration
   */
  const handleSortChange = useCallback((newSort: CatalogSort) => {
    setSort(newSort);
  }, []);

  // ============================================================================
  // Document Loading (On-Demand)
  // ============================================================================

  /**
   * Load full document on demand
   *
   * Fetches full RequestLogDoc from disk and caches it.
   * Returns cached version if already loaded.
   * Used when user expands a document for detail view.
   *
   * @param path - Document file path
   * @returns Full document or null if load fails
   */
  const handleLoadDocument = useCallback(
    async (path: string): Promise<RequestLogDoc | null> => {
      // Check cache first
      if (documentCache.has(path)) {
        console.info(`[ViewerContainer] Document cache hit: ${path}`);
        return documentCache.get(path)!;
      }

      // Load from disk
      try {
        console.info(`[ViewerContainer] Loading document: ${path}`);
        const doc = await docStore.read(path);

        // Cache for future use
        setDocumentCache((prev) => new Map(prev).set(path, doc));

        return doc;
      } catch (err) {
        console.error(`[ViewerContainer] Failed to load document: ${path}`, err);
        return null;
      }
    },
    [documentCache, docStore]
  );

  // ============================================================================
  // Reserved Handler References (for child components in future tasks)
  // ============================================================================

  // Prevent unused variable warnings for handlers reserved for child components
  // These will be passed to DocumentFilters (TASK-2.3) and DocumentCatalog (TASK-2.4)
  void filterOptions;
  void handleFilterChange;
  void handleSortChange;
  void handleLoadDocument;

  // ============================================================================
  // Derived State (Filtering & Sorting)
  // ============================================================================

  /**
   * Apply filters and sorting to catalog
   *
   * Filters catalog entries based on current filter state,
   * then groups by project and sorts within groups.
   */
  const filteredAndSorted = useMemo(() => {
    // Apply all filter facets
    const filtered = applyFilters(catalog, filterState);

    // Group by project and sort
    const grouped = createGroupedCatalog(filtered, sort, 'name');

    return {
      filtered,
      grouped,
    };
  }, [catalog, filterState, sort]);

  const { filtered: filteredCatalog } = filteredAndSorted;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="viewer-container">
      {/* Header with title and refresh button */}
      <div className="viewer-header">
        <h2>Request Log Viewer</h2>
        <button
          type="button"
          className="button secondary"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh catalog"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        /* Error State */
        <ErrorState error={error} onRetry={handleRefresh} />
      ) : catalog.length === 0 ? (
        /* Empty State */
        <EmptyState />
      ) : (
        /* Main Content */
        <>
          {/* DocumentFilters placeholder - will be replaced in TASK-2.3 */}
          <div className="viewer-filters-placeholder glass" aria-label="Filter controls placeholder">
            <h3>Filters</h3>
            <p>
              Active filters: {filterState.project_id ? '1 project, ' : ''}
              {filterState.types.length > 0 ? `${filterState.types.length} types, ` : ''}
              {filterState.domains.length > 0 ? `${filterState.domains.length} domains, ` : ''}
              {filterState.priorities.length > 0 ? `${filterState.priorities.length} priorities, ` : ''}
              {filterState.statuses.length > 0 ? `${filterState.statuses.length} statuses, ` : ''}
              {filterState.tags.length > 0 ? `${filterState.tags.length} tags, ` : ''}
              {filterState.text ? `text: "${filterState.text}"` : ''}
            </p>
            {JSON.stringify(filterState) !== JSON.stringify(createEmptyFilter()) && (
              <button
                type="button"
                className="button small"
                onClick={handleClearFilters}
                aria-label="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* DocumentCatalog placeholder - will be replaced in TASK-2.4 */}
          <div className="viewer-catalog-placeholder glass" aria-label="Document catalog placeholder">
            <h3>Documents</h3>
            <p>
              Showing {filteredCatalog.length} of {catalog.length} document(s)
            </p>
            <p>
              Sort: {sort.field} ({sort.order})
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * LoadingSkeleton Component
 *
 * Skeleton UI shown during initial catalog load or refresh.
 * Uses glass/x-morphism skeleton animations from shared.css.
 */
function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="viewer-loading" aria-live="polite" aria-busy="true">
      <div className="skeleton skeleton-text large" aria-label="Loading header" />
      <div className="skeleton skeleton-card" aria-label="Loading filters" />
      <div className="skeleton skeleton-card" aria-label="Loading catalog 1" />
      <div className="skeleton skeleton-card" aria-label="Loading catalog 2" />
      <div className="skeleton skeleton-card" aria-label="Loading catalog 3" />
    </div>
  );
}

/**
 * ErrorState Component
 *
 * Error UI shown when catalog load fails.
 * Provides retry button to attempt reload.
 *
 * @param props - Error message and retry handler
 */
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="viewer-error glass" role="alert" aria-live="assertive">
      <div className="error-message">
        <span className="error-icon" aria-hidden="true">⚠</span>
        <div>
          <h3>Failed to Load Catalog</h3>
          <p>{error}</p>
        </div>
      </div>
      <button
        type="button"
        className="button primary"
        onClick={onRetry}
        aria-label="Retry loading catalog"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * EmptyState Component
 *
 * Empty state shown when no documents exist.
 * Suggests creating documents via the capture wizard.
 */
function EmptyState(): React.JSX.Element {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">📄</span>
      <h3 className="empty-state-title">No Documents Found</h3>
      <p className="empty-state-description">
        No request-log documents found in enabled projects.
        <br />
        Use the Capture wizard to create your first document.
      </p>
    </div>
  );
}

export default ViewerContainer;
