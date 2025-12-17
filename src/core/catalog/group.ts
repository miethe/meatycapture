/**
 * Catalog Grouping and Sorting Functions
 *
 * Pure functions for organizing and sorting catalog entries by project.
 * All functions are immutable and side-effect free.
 *
 * Key operations:
 * - Group documents by project for hierarchical display
 * - Sort documents within groups by various fields
 * - Sort projects by name, document count, or recent activity
 * - Create complete grouped catalog structures
 *
 * Architecture:
 * - Pure, immutable transformations
 * - No external dependencies beyond type imports
 * - Handles edge cases (missing project info, null values)
 * - Stable sort behavior with predictable null handling
 */

import type { CatalogEntry, CatalogSort, GroupedCatalog, ProjectInfo } from './types';

/**
 * Group catalog entries by project ID
 *
 * Creates a Map of project_id to array of catalog entries.
 * Handles missing or null project_id by grouping under 'unknown'.
 *
 * This is a pure function - original array is not modified.
 * Returns a new Map with grouped entries.
 *
 * @param entries - Catalog entries to group
 * @returns Map where key is project_id, value is array of entries for that project
 *
 * @example
 * ```ts
 * const entries = [
 *   { project_id: 'capture-app', doc_id: 'REQ-001', ... },
 *   { project_id: 'api-server', doc_id: 'REQ-002', ... },
 *   { project_id: 'capture-app', doc_id: 'REQ-003', ... },
 * ];
 * const grouped = groupByProject(entries);
 * // Map {
 * //   'capture-app' => [entry1, entry3],
 * //   'api-server' => [entry2]
 * // }
 * ```
 */
export function groupByProject(entries: CatalogEntry[]): Map<string, CatalogEntry[]> {
  const groups = new Map<string, CatalogEntry[]>();

  for (const entry of entries) {
    // Handle missing or null project_id gracefully
    const projectId = entry.project_id || 'unknown';

    if (!groups.has(projectId)) {
      groups.set(projectId, []);
    }

    groups.get(projectId)!.push(entry);
  }

  return groups;
}

/**
 * Sort catalog entries by specified field and order
 *
 * Supports sorting by: updated_at, item_count, doc_id, title
 * Handles null/undefined values by pushing them to the end (desc) or beginning (asc).
 *
 * For dates: compares timestamps (milliseconds)
 * For strings: uses localeCompare for proper alphabetical sorting
 * For numbers: direct numeric comparison
 *
 * This is a pure function - returns new sorted array, original is unchanged.
 *
 * @param entries - Catalog entries to sort
 * @param sort - Sort configuration (field and order)
 * @returns New array with entries sorted by specified criteria
 *
 * @example
 * ```ts
 * // Sort by most recent first
 * const sorted = sortDocuments(entries, { field: 'updated_at', order: 'desc' });
 *
 * // Sort by title alphabetically
 * const byTitle = sortDocuments(entries, { field: 'title', order: 'asc' });
 *
 * // Sort by item count (highest first)
 * const byCount = sortDocuments(entries, { field: 'item_count', order: 'desc' });
 * ```
 */
export function sortDocuments(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  const { field, order } = sort;
  const direction = order === 'asc' ? 1 : -1;

  // Create a copy to avoid mutating the original array
  return [...entries].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    // Handle null/undefined values
    // For desc: push nullish to end (smaller value)
    // For asc: push nullish to beginning (smaller value)
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1; // a goes after b
    if (bVal == null) return -1; // b goes after a

    // Date comparison (updated_at)
    if (aVal instanceof Date && bVal instanceof Date) {
      return direction * (aVal.getTime() - bVal.getTime());
    }

    // String comparison (doc_id, title)
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction * aVal.localeCompare(bVal);
    }

    // Number comparison (item_count)
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction * (aVal - bVal);
    }

    // Fallback: no change in order
    return 0;
  });
}

/**
 * Sort project IDs for display order
 *
 * Three sorting modes:
 * - 'name': Alphabetically by project_name (case-insensitive)
 * - 'count': By number of documents (descending - most docs first)
 * - 'updated': By most recent document update (descending - newest first)
 *
 * This function requires the full entries array to extract project names
 * and calculate counts/recent updates for each project.
 *
 * @param projectIds - Project IDs to sort
 * @param entries - All catalog entries (needed for sorting context)
 * @param sortBy - Sorting mode: 'name' | 'count' | 'updated'
 * @returns New array of project IDs in sorted order
 *
 * @example
 * ```ts
 * // Sort projects alphabetically
 * const byName = sortProjects(['api', 'capture', 'admin'], entries, 'name');
 * // => ['admin', 'api', 'capture']
 *
 * // Sort by number of documents
 * const byCount = sortProjects(['api', 'capture'], entries, 'count');
 * // => ['capture', 'api'] if capture has more docs
 *
 * // Sort by most recent activity
 * const byActivity = sortProjects(['api', 'capture'], entries, 'updated');
 * // => ['api', 'capture'] if api was updated more recently
 * ```
 */
export function sortProjects(
  projectIds: string[],
  entries: CatalogEntry[],
  sortBy: 'name' | 'count' | 'updated'
): string[] {
  // Create copy to avoid mutation
  const ids = [...projectIds];

  // Build lookup maps for efficient sorting
  const projectMap = new Map<string, { name: string; count: number; updated: Date | null }>();

  for (const id of ids) {
    const projectEntries = entries.filter((e) => (e.project_id || 'unknown') === id);

    // Get project name from first entry
    const name = projectEntries[0]?.project_name || 'Unknown';

    // Count documents
    const count = projectEntries.length;

    // Find most recent update
    const updated = projectEntries.reduce<Date | null>((latest, entry) => {
      if (!entry.updated_at) return latest;
      if (!latest) return entry.updated_at;
      return entry.updated_at > latest ? entry.updated_at : latest;
    }, null);

    projectMap.set(id, { name, count, updated });
  }

  // Sort based on mode
  return ids.sort((a, b) => {
    const aData = projectMap.get(a);
    const bData = projectMap.get(b);

    if (!aData || !bData) return 0;

    switch (sortBy) {
      case 'name':
        // Alphabetical, case-insensitive
        return aData.name.toLowerCase().localeCompare(bData.name.toLowerCase());

      case 'count':
        // Descending by document count (most first)
        return bData.count - aData.count;

      case 'updated': {
        // Descending by most recent update (newest first)
        if (!aData.updated && !bData.updated) return 0;
        if (!aData.updated) return 1; // a goes after b
        if (!bData.updated) return -1; // b goes after a
        return bData.updated.getTime() - aData.updated.getTime();
      }

      default:
        return 0;
    }
  });
}

/**
 * Extract project information from catalog entries
 *
 * Finds the first entry matching the project ID and extracts
 * the project name. Returns 'Unknown' if project not found.
 *
 * This is a helper function for building grouped catalog structures.
 *
 * @param entries - All catalog entries
 * @param projectId - Project ID to look up
 * @returns Project info with id and name
 *
 * @internal
 */
function getProjectInfo(entries: CatalogEntry[], projectId: string): ProjectInfo {
  const entry = entries.find((e) => (e.project_id || 'unknown') === projectId);

  return {
    id: projectId,
    name: entry?.project_name || 'Unknown',
  };
}

/**
 * Create complete grouped catalog structure
 *
 * Combines grouping and sorting into final hierarchical structure.
 * Groups entries by project, sorts entries within each group,
 * and sorts the projects themselves.
 *
 * This is the main function for creating organized catalog views.
 * Returns a GroupedCatalog ready for UI rendering.
 *
 * Default project sort is 'name' (alphabetical).
 *
 * @param entries - Catalog entries to organize
 * @param docSort - How to sort documents within each project group
 * @param projectSort - How to sort projects ('name' | 'count' | 'updated'), defaults to 'name'
 * @returns Grouped catalog with sorted projects and sorted entries
 *
 * @example
 * ```ts
 * const catalog = createGroupedCatalog(
 *   entries,
 *   { field: 'updated_at', order: 'desc' },
 *   'count'
 * );
 *
 * // Iterate through sorted projects
 * for (const [projectId, { project, entries }] of catalog.groups) {
 *   console.log(`Project: ${project.name}`);
 *   for (const entry of entries) {
 *     console.log(`  - ${entry.title}`);
 *   }
 * }
 * ```
 */
export function createGroupedCatalog(
  entries: CatalogEntry[],
  docSort: CatalogSort,
  projectSort: 'name' | 'count' | 'updated' = 'name'
): GroupedCatalog {
  // Group entries by project
  const groupedMap = groupByProject(entries);

  // Sort documents within each group
  const sortedGroups = new Map<
    string,
    {
      project: ProjectInfo;
      entries: CatalogEntry[];
    }
  >();

  for (const [projectId, projectEntries] of groupedMap) {
    const sorted = sortDocuments(projectEntries, docSort);
    const project = getProjectInfo(entries, projectId);

    sortedGroups.set(projectId, {
      project,
      entries: sorted,
    });
  }

  // Sort project IDs
  const sortedProjectIds = sortProjects(Array.from(groupedMap.keys()), entries, projectSort);

  // Rebuild map in sorted order
  const finalGroups = new Map<
    string,
    {
      project: ProjectInfo;
      entries: CatalogEntry[];
    }
  >();

  for (const projectId of sortedProjectIds) {
    const group = sortedGroups.get(projectId);
    if (group) {
      finalGroups.set(projectId, group);
    }
  }

  return {
    groups: finalGroups,
  };
}
