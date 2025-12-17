/**
 * Viewer Module Types
 *
 * Type definitions for the Request Log Viewer UI components.
 * Re-exports catalog types for convenience and defines UI-specific state management.
 */

import type { ProjectStore, DocStore } from '@core/ports';

// Re-export catalog types for convenience
export type {
  FilterState,
  CatalogEntry,
  FilterOptions,
  CatalogSort,
  GroupedCatalog,
  ProjectInfo,
} from '@core/catalog';

/**
 * ViewerContainer state shape
 *
 * Manages all state for the viewer UI including:
 * - Catalog data (all loaded documents)
 * - Filter criteria and available options
 * - Document cache for expanded views
 * - Sort configuration
 * - Loading and error states
 */
export interface ViewerState {
  /** All loaded catalog entries from filesystem scan */
  catalog: import('@core/catalog').CatalogEntry[];

  /** Current filter criteria (multi-faceted) */
  filterState: import('@core/catalog').FilterState;

  /** Current sort configuration */
  sort: import('@core/catalog').CatalogSort;

  /** Available filter values extracted from catalog data */
  filterOptions: import('@core/catalog').FilterOptions;

  /** Loading state during initial catalog load or refresh */
  loading: boolean;

  /** Error message if catalog load fails */
  error: string | null;
}

/**
 * ViewerContainer props interface
 *
 * Required dependencies for the viewer container:
 * - ProjectStore: For fetching enabled projects and metadata
 * - DocStore: For listing and reading request-log documents
 */
export interface ViewerContainerProps {
  /** Project store for fetching project data */
  projectStore: ProjectStore;

  /** Document store for listing and reading documents */
  docStore: DocStore;
}
