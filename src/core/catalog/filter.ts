/**
 * Catalog Filtering Logic
 *
 * Pure, immutable functions for filtering catalog documents based on multiple criteria.
 * All functions are performance-optimized for catalogs with hundreds of documents (<100ms target).
 *
 * Architecture:
 * - Pure functions with no side effects
 * - Immutable operations (return new arrays, never mutate input)
 * - Composable filters that can be applied in sequence
 * - Short-circuit optimization when filters reduce to empty set
 *
 * Filter Logic Modes:
 * - Single-select: project_id (undefined = no filter)
 * - Multi-select OR: types, domains, priorities, statuses (match ANY)
 * - Multi-select AND: tags (match ALL - intersection)
 * - Text search: case-insensitive on title/doc_id
 *
 * Metadata Limitations:
 * CatalogEntry contains only document-level metadata (doc_id, title, item_count, etc).
 * Full item-level metadata (type, domain, priority, status) is only available in the
 * complete RequestLogDoc after loading from disk. As a result:
 *
 * - filterByType/Domain/Priority/Status: Currently return all entries (no metadata available)
 * - filterByTags: Returns all entries (tags are aggregated in full doc, not in DocMeta)
 * - Future enhancement: Extend DocMeta to include aggregated tags and item type summary
 *
 * For full filtering capability, consumers should:
 * 1. Apply text and project filters first (work on metadata)
 * 2. Load full documents for remaining entries
 * 3. Apply type/domain/priority/status/tag filters on loaded docs
 */

import type { CatalogEntry, FilterState } from './types';

/**
 * Filter catalog entries by project
 *
 * Single-select project filter. If projectId is undefined, returns all entries.
 * Otherwise, returns only entries matching the specified project.
 *
 * Performance: O(n) where n = number of entries
 *
 * @param entries - Array of catalog entries to filter
 * @param projectId - Project identifier to filter by (undefined = no filter)
 * @returns Filtered array containing only entries from the specified project
 *
 * @example
 * ```typescript
 * const allEntries = [
 *   { project_id: 'capture-app', doc_id: 'REQ-001', ... },
 *   { project_id: 'api-server', doc_id: 'REQ-002', ... }
 * ];
 *
 * filterByProject(allEntries, 'capture-app');
 * // Returns: [{ project_id: 'capture-app', doc_id: 'REQ-001', ... }]
 *
 * filterByProject(allEntries, undefined);
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByProject(
  entries: CatalogEntry[],
  projectId: string | undefined
): CatalogEntry[] {
  // No filter applied if projectId is undefined
  if (projectId === undefined) {
    return entries;
  }

  // Filter to entries matching the specified project
  return entries.filter((entry) => entry.project_id === projectId);
}

/**
 * Filter catalog entries by item type
 *
 * Multi-select OR logic: returns entries that contain ANY of the specified types.
 * If types array is empty, returns all entries.
 *
 * **Metadata Limitation**: CatalogEntry does not contain item-level type information.
 * This function currently returns all entries as a pass-through. To filter by type,
 * full RequestLogDoc documents must be loaded to access items_index type data.
 *
 * Performance: O(n) where n = number of entries (when metadata available)
 *
 * @param entries - Array of catalog entries to filter
 * @param types - Array of type values to match (OR logic: match any)
 * @returns Filtered array (currently returns all entries due to metadata limitation)
 *
 * @example
 * ```typescript
 * // Future behavior when metadata is available:
 * const entries = [
 *   { items_index: [{ type: 'bug' }, { type: 'enhancement' }], ... },
 *   { items_index: [{ type: 'feature' }], ... }
 * ];
 *
 * filterByType(entries, ['bug', 'enhancement']);
 * // Would return: entries with at least one item matching 'bug' OR 'enhancement'
 *
 * filterByType(entries, []);
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByType(entries: CatalogEntry[], types: string[]): CatalogEntry[] {
  // No filter applied if types array is empty
  if (types.length === 0) {
    return entries;
  }

  // LIMITATION: CatalogEntry doesn't have item-level type metadata
  // To properly implement this, we need to either:
  // 1. Load full RequestLogDoc for each entry (expensive)
  // 2. Extend DocMeta/CatalogEntry to include type summary
  // For now, return all entries as pass-through
  return entries;
}

/**
 * Filter catalog entries by domain
 *
 * Multi-select OR logic: returns entries that contain ANY of the specified domains.
 * If domains array is empty, returns all entries.
 *
 * **Metadata Limitation**: CatalogEntry does not contain item-level domain information.
 * This function currently returns all entries as a pass-through. To filter by domain,
 * full RequestLogDoc documents must be loaded to access items domain data.
 *
 * Performance: O(n) where n = number of entries (when metadata available)
 *
 * @param entries - Array of catalog entries to filter
 * @param domains - Array of domain values to match (OR logic: match any)
 * @returns Filtered array (currently returns all entries due to metadata limitation)
 *
 * @example
 * ```typescript
 * // Future behavior when metadata is available:
 * filterByDomain(entries, ['web', 'api']);
 * // Would return: entries with at least one item in 'web' OR 'api' domain
 *
 * filterByDomain(entries, []);
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByDomain(entries: CatalogEntry[], domains: string[]): CatalogEntry[] {
  // No filter applied if domains array is empty
  if (domains.length === 0) {
    return entries;
  }

  // LIMITATION: CatalogEntry doesn't have item-level domain metadata
  // Return all entries as pass-through (see filterByType for details)
  return entries;
}

/**
 * Filter catalog entries by priority
 *
 * Multi-select OR logic: returns entries that contain ANY of the specified priorities.
 * If priorities array is empty, returns all entries.
 *
 * **Metadata Limitation**: CatalogEntry does not contain item-level priority information.
 * This function currently returns all entries as a pass-through. To filter by priority,
 * full RequestLogDoc documents must be loaded to access items priority data.
 *
 * Performance: O(n) where n = number of entries (when metadata available)
 *
 * @param entries - Array of catalog entries to filter
 * @param priorities - Array of priority values to match (OR logic: match any)
 * @returns Filtered array (currently returns all entries due to metadata limitation)
 *
 * @example
 * ```typescript
 * // Future behavior when metadata is available:
 * filterByPriority(entries, ['high', 'critical']);
 * // Would return: entries with at least one item with 'high' OR 'critical' priority
 *
 * filterByPriority(entries, []);
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByPriority(entries: CatalogEntry[], priorities: string[]): CatalogEntry[] {
  // No filter applied if priorities array is empty
  if (priorities.length === 0) {
    return entries;
  }

  // LIMITATION: CatalogEntry doesn't have item-level priority metadata
  // Return all entries as pass-through (see filterByType for details)
  return entries;
}

/**
 * Filter catalog entries by status
 *
 * Multi-select OR logic: returns entries that contain ANY of the specified statuses.
 * If statuses array is empty, returns all entries.
 *
 * **Metadata Limitation**: CatalogEntry does not contain item-level status information.
 * This function currently returns all entries as a pass-through. To filter by status,
 * full RequestLogDoc documents must be loaded to access items status data.
 *
 * Performance: O(n) where n = number of entries (when metadata available)
 *
 * @param entries - Array of catalog entries to filter
 * @param statuses - Array of status values to match (OR logic: match any)
 * @returns Filtered array (currently returns all entries due to metadata limitation)
 *
 * @example
 * ```typescript
 * // Future behavior when metadata is available:
 * filterByStatus(entries, ['triage', 'in-progress']);
 * // Would return: entries with at least one item in 'triage' OR 'in-progress' status
 *
 * filterByStatus(entries, []);
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByStatus(entries: CatalogEntry[], statuses: string[]): CatalogEntry[] {
  // No filter applied if statuses array is empty
  if (statuses.length === 0) {
    return entries;
  }

  // LIMITATION: CatalogEntry doesn't have item-level status metadata
  // Return all entries as pass-through (see filterByType for details)
  return entries;
}

/**
 * Filter catalog entries by tags
 *
 * Multi-select AND logic: returns entries that contain ALL of the specified tags.
 * This is intersection logic - the document must have every tag in the filter array.
 * If tags array is empty, returns all entries.
 *
 * **Metadata Limitation**: CatalogEntry does not contain aggregated tags from the document.
 * Tags are stored in the full RequestLogDoc frontmatter. This function currently returns
 * all entries as a pass-through. To filter by tags, extend DocMeta to include the tags
 * array, or load full documents.
 *
 * Performance: O(n * m) where n = entries, m = tags (when metadata available)
 *
 * @param entries - Array of catalog entries to filter
 * @param tags - Array of tags to match (AND logic: document must have ALL tags)
 * @returns Filtered array (currently returns all entries due to metadata limitation)
 *
 * @example
 * ```typescript
 * // Future behavior when metadata is available:
 * const entries = [
 *   { tags: ['api', 'bug', 'security'], ... },
 *   { tags: ['api', 'enhancement'], ... },
 *   { tags: ['api', 'bug'], ... }
 * ];
 *
 * filterByTags(entries, ['api', 'bug']);
 * // Would return: entries[0] and entries[2] (both have 'api' AND 'bug')
 *
 * filterByTags(entries, []);
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByTags(entries: CatalogEntry[], tags: string[]): CatalogEntry[] {
  // No filter applied if tags array is empty
  if (tags.length === 0) {
    return entries;
  }

  // LIMITATION: CatalogEntry doesn't have aggregated tags metadata
  // Tags are in RequestLogDoc frontmatter, not in DocMeta
  // To fix: extend DocMeta interface to include tags: string[]
  // Return all entries as pass-through for now
  return entries;
}

/**
 * Filter catalog entries by text search
 *
 * Case-insensitive search on both title and doc_id fields.
 * Returns entries where the search text appears in EITHER field.
 * If text is empty/whitespace, returns all entries.
 *
 * Performance: O(n) where n = number of entries
 *
 * @param entries - Array of catalog entries to filter
 * @param text - Search text (case-insensitive, searches title and doc_id)
 * @returns Filtered array containing entries matching the search text
 *
 * @example
 * ```typescript
 * const entries = [
 *   { doc_id: 'REQ-20251203-capture-app', title: 'User Authentication Bug', ... },
 *   { doc_id: 'REQ-20251204-api-server', title: 'API Rate Limiting', ... }
 * ];
 *
 * filterByText(entries, 'auth');
 * // Returns: [first entry] (matches 'auth' in title 'Authentication')
 *
 * filterByText(entries, 'req-2025');
 * // Returns: both entries (matches doc_id prefix)
 *
 * filterByText(entries, '');
 * // Returns: all entries (no filter applied)
 * ```
 */
export function filterByText(entries: CatalogEntry[], text: string): CatalogEntry[] {
  // No filter applied if text is empty or only whitespace
  const trimmedText = text.trim();
  if (trimmedText === '') {
    return entries;
  }

  // Convert search text to lowercase for case-insensitive comparison
  const searchText = trimmedText.toLowerCase();

  // Filter entries where title OR doc_id contains the search text
  return entries.filter((entry) => {
    const titleLower = entry.title.toLowerCase();
    const docIdLower = entry.doc_id.toLowerCase();
    return titleLower.includes(searchText) || docIdLower.includes(searchText);
  });
}

/**
 * Apply all filters to catalog entries
 *
 * Composite filter function that applies all filter facets in sequence using AND logic.
 * Each filter type is applied one after another, progressively narrowing the result set.
 *
 * Filter Application Order (optimized for performance):
 * 1. Project filter (typically most selective)
 * 2. Text search (works on metadata, relatively fast)
 * 3. Type, domain, priority, status filters (metadata limited - currently pass-through)
 * 4. Tag filter (metadata limited - currently pass-through)
 *
 * Short-circuit optimization: If any filter reduces the set to empty, subsequent filters
 * are skipped (no point filtering an empty array).
 *
 * Performance: O(n) for metadata-based filters, where n = number of entries
 *
 * @param entries - Array of catalog entries to filter
 * @param filter - Complete filter state with all facets
 * @returns Filtered array after applying all filter criteria
 *
 * @example
 * ```typescript
 * const allEntries = [...]; // 500 catalog entries
 *
 * const filter: FilterState = {
 *   project_id: 'capture-app',
 *   types: ['bug', 'enhancement'],
 *   domains: [],
 *   priorities: ['high'],
 *   statuses: [],
 *   tags: ['api', 'security'],
 *   text: 'authentication'
 * };
 *
 * const filtered = applyFilters(allEntries, filter);
 * // Returns entries that match ALL criteria:
 * // - From 'capture-app' project
 * // - Contains 'authentication' in title or doc_id
 * // - (type/domain/priority/status/tags currently pass-through due to metadata limits)
 * ```
 */
export function applyFilters(entries: CatalogEntry[], filter: FilterState): CatalogEntry[] {
  // Start with all entries
  let filtered = entries;

  // Apply project filter first (often most selective)
  filtered = filterByProject(filtered, filter.project_id);
  if (filtered.length === 0) return filtered; // Short-circuit if empty

  // Apply text search (works on metadata, fast)
  filtered = filterByText(filtered, filter.text);
  if (filtered.length === 0) return filtered; // Short-circuit if empty

  // Apply type filter (currently pass-through due to metadata limitation)
  filtered = filterByType(filtered, filter.types);
  if (filtered.length === 0) return filtered; // Short-circuit if empty

  // Apply domain filter (currently pass-through due to metadata limitation)
  filtered = filterByDomain(filtered, filter.domains);
  if (filtered.length === 0) return filtered; // Short-circuit if empty

  // Apply priority filter (currently pass-through due to metadata limitation)
  filtered = filterByPriority(filtered, filter.priorities);
  if (filtered.length === 0) return filtered; // Short-circuit if empty

  // Apply status filter (currently pass-through due to metadata limitation)
  filtered = filterByStatus(filtered, filter.statuses);
  if (filtered.length === 0) return filtered; // Short-circuit if empty

  // Apply tags filter last (AND logic, currently pass-through due to metadata limitation)
  filtered = filterByTags(filtered, filter.tags);

  return filtered;
}
