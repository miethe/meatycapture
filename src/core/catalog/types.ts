/**
 * Catalog Module Types
 *
 * Type definitions for the Request Log Viewer catalog feature.
 * Enables browsing, filtering, and sorting request-log documents across projects.
 *
 * This module is UI-agnostic and contains pure TypeScript types for:
 * - Filter state management (multi-select with OR/intersection logic)
 * - Catalog entries with project metadata
 * - Project-grouped catalog display
 * - Available filter options for dropdowns
 * - Sort configuration and fields
 * - Type guards and factory functions
 *
 * Architecture:
 * - Integrates with DocStore and ProjectStore ports
 * - No React or UI dependencies
 * - Supports both flat and project-grouped catalog views
 */

import type { DocMeta } from '@core/ports';

/**
 * Filter state for catalog browsing
 *
 * Supports multi-faceted filtering with different logic modes:
 * - Single-select: project_id (optional)
 * - Multi-select OR logic: types, domains, priorities, statuses (any match)
 * - Multi-select AND logic: tags (all must match - intersection)
 * - Text search: case-insensitive on title/doc_id
 *
 * Empty arrays or undefined values = no filter applied for that facet
 */
export interface FilterState {
  /** Single project filter (undefined = all projects) */
  project_id?: string;

  /** Item types to include (OR logic: match any) */
  types: string[];

  /** Domains to include (OR logic: match any) */
  domains: string[];

  /** Priorities to include (OR logic: match any) */
  priorities: string[];

  /** Statuses to include (OR logic: match any) */
  statuses: string[];

  /**
   * Tags to include (AND logic: document must have ALL tags - intersection)
   * Example: ['api', 'bug'] = only docs with both 'api' AND 'bug' tags
   */
  tags: string[];

  /** Case-insensitive text search on title and doc_id */
  text: string;
}

/**
 * Catalog entry with project context
 *
 * Extends DocMeta with project information for display and filtering.
 * Represents a single request-log document in the catalog view.
 */
export interface CatalogEntry {
  /** Filesystem path to the document */
  path: string;

  /** Document identifier (e.g., 'REQ-20251203-capture-app') */
  doc_id: string;

  /** Document title */
  title: string;

  /** Total number of items in the document */
  item_count: number;

  /** Timestamp of last modification */
  updated_at: Date;

  /** Associated project ID */
  project_id: string;

  /** Human-readable project name for display */
  project_name: string;
}

/**
 * Project metadata for catalog grouping
 */
export interface ProjectInfo {
  /** Project identifier (slug format) */
  id: string;

  /** Human-readable project name */
  name: string;
}

/**
 * Project-grouped catalog structure
 *
 * Groups catalog entries by project for hierarchical display.
 * Useful for project-organized views in the UI.
 *
 * Structure: Map<project_id, {project: ProjectInfo, entries: CatalogEntry[]}>
 */
export interface GroupedCatalog {
  /** Map of project_id to project info and its catalog entries */
  groups: Map<
    string,
    {
      project: ProjectInfo;
      entries: CatalogEntry[];
    }
  >;
}

/**
 * Available filter options
 *
 * Extracted from actual catalog data to populate filter dropdowns.
 * All values are unique and sorted for consistent UI display.
 */
export interface FilterOptions {
  /** Available projects (id + name) */
  projects: ProjectInfo[];

  /** Available item types across all documents */
  types: string[];

  /** Available domains across all documents */
  domains: string[];

  /** Available priorities across all documents */
  priorities: string[];

  /** Available statuses across all documents */
  statuses: string[];

  /** Available tags across all documents */
  tags: string[];
}

/**
 * Sortable field names
 *
 * Union type of all fields that support sorting in the catalog view.
 */
export type SortField = 'updated_at' | 'item_count' | 'doc_id' | 'title';

/**
 * Sort direction
 *
 * Standard ascending/descending sort order.
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Sort configuration
 *
 * Defines how catalog entries should be sorted.
 * Default: updated_at descending (most recent first)
 */
export interface CatalogSort {
  /** Field to sort by */
  field: SortField;

  /** Sort direction (asc/desc) */
  order: SortOrder;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a filter state is completely empty
 *
 * Returns true if no filters are applied (all facets are empty/undefined).
 * Useful for optimizing catalog queries - skip filtering if no criteria set.
 *
 * @param filter - Filter state to check
 * @returns true if all filter facets are empty/undefined/default
 */
export function isFilterEmpty(filter: FilterState): boolean {
  return (
    filter.project_id === undefined &&
    filter.types.length === 0 &&
    filter.domains.length === 0 &&
    filter.priorities.length === 0 &&
    filter.statuses.length === 0 &&
    filter.tags.length === 0 &&
    filter.text.trim() === ''
  );
}

/**
 * Type guard to check if an object is a valid CatalogEntry
 *
 * Validates all required fields and their types.
 *
 * @param obj - Object to validate
 * @returns true if obj is a valid CatalogEntry
 */
export function isCatalogEntry(obj: unknown): obj is CatalogEntry {
  if (!obj || typeof obj !== 'object') return false;

  const entry = obj as Partial<CatalogEntry>;

  return (
    typeof entry.path === 'string' &&
    typeof entry.doc_id === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.item_count === 'number' &&
    entry.updated_at instanceof Date &&
    typeof entry.project_id === 'string' &&
    typeof entry.project_name === 'string'
  );
}

/**
 * Type guard to check if an object is a valid FilterState
 *
 * Validates filter structure with correct types for all facets.
 *
 * @param obj - Object to validate
 * @returns true if obj is a valid FilterState
 */
export function isFilterState(obj: unknown): obj is FilterState {
  if (!obj || typeof obj !== 'object') return false;

  const filter = obj as Partial<FilterState>;

  return (
    (filter.project_id === undefined || typeof filter.project_id === 'string') &&
    Array.isArray(filter.types) &&
    filter.types.every((t) => typeof t === 'string') &&
    Array.isArray(filter.domains) &&
    filter.domains.every((d) => typeof d === 'string') &&
    Array.isArray(filter.priorities) &&
    filter.priorities.every((p) => typeof p === 'string') &&
    Array.isArray(filter.statuses) &&
    filter.statuses.every((s) => typeof s === 'string') &&
    Array.isArray(filter.tags) &&
    filter.tags.every((t) => typeof t === 'string') &&
    typeof filter.text === 'string'
  );
}

/**
 * Type guard to check if a value is a valid SortField
 *
 * @param value - Value to check
 * @returns true if value is a valid sortable field name
 */
export function isSortField(value: unknown): value is SortField {
  return (
    typeof value === 'string' &&
    ['updated_at', 'item_count', 'doc_id', 'title'].includes(value)
  );
}

/**
 * Type guard to check if a value is a valid SortOrder
 *
 * @param value - Value to check
 * @returns true if value is 'asc' or 'desc'
 */
export function isSortOrder(value: unknown): value is SortOrder {
  return typeof value === 'string' && ['asc', 'desc'].includes(value);
}

/**
 * Type guard to check if an object is a valid CatalogSort
 *
 * @param obj - Object to validate
 * @returns true if obj is a valid CatalogSort configuration
 */
export function isCatalogSort(obj: unknown): obj is CatalogSort {
  if (!obj || typeof obj !== 'object') return false;

  const sort = obj as Partial<CatalogSort>;

  return isSortField(sort.field) && isSortOrder(sort.order);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create an empty filter state
 *
 * Returns a FilterState with all facets cleared/empty.
 * Use this as the initial state or to reset all filters.
 *
 * @returns Empty filter state with no criteria applied
 */
export function createEmptyFilter(): FilterState {
  return {
    types: [],
    domains: [],
    priorities: [],
    statuses: [],
    tags: [],
    text: '',
  };
}

/**
 * Create default sort configuration
 *
 * Returns default catalog sort: most recently updated first.
 * This is the standard sort for browsing request-logs (newest first).
 *
 * @returns Default sort configuration (updated_at descending)
 */
export function createDefaultSort(): CatalogSort {
  return {
    field: 'updated_at',
    order: 'desc',
  };
}

/**
 * Create empty filter options structure
 *
 * Returns FilterOptions with all arrays empty.
 * Useful for initialization before populating from catalog data.
 *
 * @returns Empty filter options with no values
 */
export function createEmptyFilterOptions(): FilterOptions {
  return {
    projects: [],
    types: [],
    domains: [],
    priorities: [],
    statuses: [],
    tags: [],
  };
}

/**
 * Create empty grouped catalog structure
 *
 * Returns GroupedCatalog with no groups.
 * Useful for initialization before populating from catalog entries.
 *
 * @returns Empty grouped catalog
 */
export function createEmptyGroupedCatalog(): GroupedCatalog {
  return {
    groups: new Map(),
  };
}

/**
 * Create CatalogEntry from DocMeta and project info
 *
 * Convenience factory for converting DocMeta to CatalogEntry.
 * Adds project context to document metadata.
 *
 * @param docMeta - Document metadata from DocStore
 * @param projectId - Associated project ID
 * @param projectName - Human-readable project name
 * @returns Catalog entry with project information
 */
export function createCatalogEntry(
  docMeta: DocMeta,
  projectId: string,
  projectName: string
): CatalogEntry {
  return {
    path: docMeta.path,
    doc_id: docMeta.doc_id,
    title: docMeta.title,
    item_count: docMeta.item_count,
    updated_at: docMeta.updated_at,
    project_id: projectId,
    project_name: projectName,
  };
}
