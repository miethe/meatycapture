/**
 * Catalog Module
 *
 * Request Log Viewer catalog types and utilities.
 *
 * This module provides:
 * - Type definitions for filtering and sorting catalog entries
 * - Type guards for runtime validation
 * - Factory functions for creating default values
 * - Core utilities for aggregating documents across projects
 *
 * Usage:
 * ```typescript
 * import { FilterState, createEmptyFilter, isFilterEmpty, listAllDocuments } from '@core/catalog';
 *
 * // Create empty filter
 * const filter = createEmptyFilter();
 * if (isFilterEmpty(filter)) {
 *   // No filters applied
 * }
 *
 * // List all documents across projects
 * const entries = await listAllDocuments(projectStore, docStore);
 * const filterOptions = extractFilterOptions(entries, projects);
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

export { listAllDocuments, extractFilterOptions, enrichWithProjectInfo } from './utils';

export {
  filterByProject,
  filterByType,
  filterByDomain,
  filterByPriority,
  filterByStatus,
  filterByTags,
  filterByText,
  applyFilters,
} from './filter';

export {
  groupByProject,
  sortDocuments,
  sortProjects,
  createGroupedCatalog,
} from './group';
