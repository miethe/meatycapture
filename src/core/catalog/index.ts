/**
 * Catalog Module
 *
 * Request Log Viewer catalog types and utilities.
 *
 * This module provides:
 * - Type definitions for filtering and sorting catalog entries
 * - Type guards for runtime validation
 * - Factory functions for creating default values
 *
 * Usage:
 * ```typescript
 * import { FilterState, createEmptyFilter, isFilterEmpty } from '@core/catalog';
 *
 * const filter = createEmptyFilter();
 * if (isFilterEmpty(filter)) {
 *   // No filters applied
 * }
 * ```
 */

export type {
  FilterState,
  CatalogEntry,
  ProjectInfo,
  GroupedCatalog,
  FilterOptions,
  SortField,
  SortOrder,
  CatalogSort,
} from './types';

export {
  isFilterEmpty,
  isCatalogEntry,
  isFilterState,
  isSortField,
  isSortOrder,
  isCatalogSort,
  createEmptyFilter,
  createDefaultSort,
  createEmptyFilterOptions,
  createEmptyGroupedCatalog,
  createCatalogEntry,
} from './types';
