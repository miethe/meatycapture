/**
 * Catalog Utilities
 *
 * Core utilities for aggregating and enriching request-log documents
 * across all projects for the Request Log Viewer catalog feature.
 *
 * Key Functions:
 * - listAllDocuments: Scan all enabled projects and aggregate DocMeta into CatalogEntry[]
 * - extractFilterOptions: Build available filter values from catalog data
 * - enrichWithProjectInfo: Add project context to DocMeta arrays
 *
 * Error Handling Philosophy:
 * - Never throw exceptions - always return valid results (possibly empty)
 * - Log warnings for non-critical failures (filesystem errors, inaccessible projects)
 * - Continue processing other projects if one fails
 * - Provide clear diagnostic information for troubleshooting
 */

import type { DocStore, ProjectStore, DocMeta } from '@core/ports';
import type { Project } from '@core/models';
import type { CatalogEntry, FilterOptions, ProjectInfo } from './types';

/**
 * List all request-log documents across enabled projects
 *
 * Aggregates documents from all enabled projects into a unified catalog.
 * This is the primary entry point for building the catalog view in the UI.
 *
 * Process:
 * 1. Fetch all projects from ProjectStore
 * 2. Filter to only enabled projects
 * 3. For each enabled project, scan its default_path directory for documents
 * 4. Enrich each DocMeta with project_id and project_name to create CatalogEntry
 * 5. Aggregate all results into a single array
 * 6. Sort by updated_at descending (most recent first)
 *
 * Error Handling:
 * - If a project's directory is inaccessible or docStore.list() fails,
 *   log a warning and skip that project (continue with others)
 * - If projectStore.list() fails, return empty array (log error)
 * - Never throw - always return valid CatalogEntry[] (possibly empty)
 *
 * @param projectStore - Project store for fetching all projects
 * @param docStore - Document store for listing documents in project directories
 * @returns Promise resolving to array of catalog entries sorted by most recent first
 *
 * @example
 * ```typescript
 * const entries = await listAllDocuments(projectStore, docStore);
 * // Returns: [
 * //   { doc_id: 'REQ-20251216-app', project_id: 'app', project_name: 'App', ... },
 * //   { doc_id: 'REQ-20251215-api', project_id: 'api', project_name: 'API', ... }
 * // ]
 * ```
 */
export async function listAllDocuments(
  projectStore: ProjectStore,
  docStore: DocStore
): Promise<CatalogEntry[]> {
  try {
    // Fetch all projects from store
    const allProjects = await projectStore.list();

    // Filter to only enabled projects
    const enabledProjects = allProjects.filter((project) => project.enabled);

    if (enabledProjects.length === 0) {
      console.warn('[catalog] No enabled projects found - returning empty catalog');
      return [];
    }

    console.info(
      `[catalog] Scanning ${enabledProjects.length} enabled project(s): ${enabledProjects.map((p) => p.id).join(', ')}`
    );

    // Aggregate catalog entries from all enabled projects
    const allEntries: CatalogEntry[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process each enabled project sequentially
    for (const project of enabledProjects) {
      try {
        // List documents in project's default_path directory
        const docMetas = await docStore.list(project.default_path);

        // Enrich with project information to create CatalogEntry[]
        const entries = enrichWithProjectInfo(docMetas, project);

        allEntries.push(...entries);
        successCount++;

        console.info(
          `[catalog] Project '${project.id}': found ${docMetas.length} document(s) in ${project.default_path}`
        );
      } catch (error) {
        // Non-fatal error: skip this project and continue with others
        failCount++;
        console.warn(
          `[catalog] Project '${project.id}': failed to scan directory '${project.default_path}' - skipping`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // Sort by updated_at descending (most recent first)
    allEntries.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

    console.info(
      `[catalog] Scan complete: ${allEntries.length} document(s) from ${successCount} project(s) (${failCount} failed)`
    );

    return allEntries;
  } catch (error) {
    // Fatal error: projectStore.list() failed
    console.error(
      '[catalog] Fatal error fetching projects - returning empty catalog',
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

/**
 * Extract available filter options from catalog entries and projects
 *
 * Builds FilterOptions structure for populating filter UI dropdowns.
 * Currently only populates projects array - other fields (types, domains, etc.)
 * will be populated in future phases when we have full document data.
 *
 * Why projects come from Project[] not CatalogEntry[]:
 * - Projects can exist without documents (newly created, empty)
 * - Filter UI should show all projects for selection
 * - CatalogEntry[] only contains projects that have documents
 *
 * Future Enhancement (Phase 2+):
 * - Parse full document data to extract types, domains, priorities, statuses
 * - Aggregate unique tags across all documents
 * - This requires reading full RequestLogDoc, not just DocMeta
 *
 * @param _entries - Catalog entries (currently unused, reserved for future use)
 * @param projects - All projects for building project filter options
 * @returns FilterOptions with projects populated, other fields empty
 *
 * @example
 * ```typescript
 * const options = extractFilterOptions(entries, projects);
 * // Returns: {
 * //   projects: [{ id: 'app', name: 'App' }, { id: 'api', name: 'API' }],
 * //   types: [],
 * //   domains: [],
 * //   priorities: [],
 * //   statuses: [],
 * //   tags: []
 * // }
 * ```
 */
export function extractFilterOptions(
  _entries: CatalogEntry[],
  projects: Project[]
): FilterOptions {
  // Build project filter options
  // Sort by name for consistent UI display
  const projectOptions: ProjectInfo[] = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Other fields empty for now (DocMeta doesn't contain this info)
  // Will be populated when we read full RequestLogDoc in future phases
  return {
    projects: projectOptions,
    types: [],
    domains: [],
    priorities: [],
    statuses: [],
    tags: [],
  };
}

/**
 * Enrich DocMeta array with project information to create CatalogEntry[]
 *
 * Pure helper function that adds project_id and project_name to each DocMeta,
 * converting them to CatalogEntry objects. This enrichment enables:
 * - Project-based filtering in the catalog
 * - Project name display in the UI
 * - Project grouping for hierarchical views
 *
 * Why this is a separate function:
 * - Pure function with no side effects - easy to test
 * - Reusable across different contexts
 * - Clear single responsibility
 * - Type-safe transformation
 *
 * @param docMetas - Array of document metadata from DocStore
 * @param project - Project to associate with these documents
 * @returns Array of catalog entries with project information added
 *
 * @example
 * ```typescript
 * const docMetas: DocMeta[] = [
 *   { path: '/docs/REQ-20251216.md', doc_id: 'REQ-20251216-app', ... }
 * ];
 * const project: Project = { id: 'app', name: 'My App', ... };
 *
 * const entries = enrichWithProjectInfo(docMetas, project);
 * // Returns: [
 * //   { path: '/docs/REQ-20251216.md', doc_id: 'REQ-20251216-app',
 * //     project_id: 'app', project_name: 'My App', ... }
 * // ]
 * ```
 */
export function enrichWithProjectInfo(
  docMetas: DocMeta[],
  project: Project
): CatalogEntry[] {
  return docMetas.map((docMeta) => ({
    ...docMeta,
    project_id: project.id,
    project_name: project.name,
  }));
}
