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
import type { Project, RequestLogDoc } from '@core/models';
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
 * Extract available filter options from catalog entries, projects, and cached documents
 *
 * Builds FilterOptions structure for populating filter UI dropdowns.
 * Extracts unique values from all items across all cached documents.
 *
 * Why projects come from Project[] not CatalogEntry[]:
 * - Projects can exist without documents (newly created, empty)
 * - Filter UI should show all projects for selection
 * - CatalogEntry[] only contains projects that have documents
 *
 * Why documentCache is optional:
 * - On initial load, cache may be empty
 * - Filter options will be populated progressively as documents load
 * - ViewerContainer should call this again after preloading completes
 *
 * @param _entries - Catalog entries (reserved for future use - could extract doc-level tags)
 * @param projects - All projects for building project filter options
 * @param documentCache - Optional map of path -> RequestLogDoc for item-level extraction
 * @returns FilterOptions with all fields populated from available data
 *
 * @example
 * ```typescript
 * const options = extractFilterOptions(entries, projects, documentCache);
 * // Returns: {
 * //   projects: [{ id: 'app', name: 'App' }, { id: 'api', name: 'API' }],
 * //   types: ['bug', 'enhancement', 'idea'],
 * //   domains: ['api', 'web'],
 * //   subdomains: ['auth', 'ui'],
 * //   features: ['login', 'dashboard'],
 * //   priorities: ['high', 'medium', 'low'],
 * //   statuses: ['backlog', 'in-progress', 'done'],
 * //   tags: ['api', 'frontend', 'urgent']
 * // }
 * ```
 */
export function extractFilterOptions(
  _entries: CatalogEntry[],
  projects: Project[],
  documentCache?: Map<string, RequestLogDoc>
): FilterOptions {
  // Build project filter options
  // Sort by name for consistent UI display
  const projectOptions: ProjectInfo[] = projects
    .map((p) => ({
      id: p.id,
      name: p.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Collect unique values from all items across all cached documents
  const typesSet = new Set<string>();
  const domainsSet = new Set<string>();
  const subdomainsSet = new Set<string>();
  const featuresSet = new Set<string>();
  const prioritiesSet = new Set<string>();
  const statusesSet = new Set<string>();
  const tagsSet = new Set<string>();

  if (documentCache) {
    for (const doc of documentCache.values()) {
      // Aggregate document-level tags
      for (const tag of doc.tags) {
        tagsSet.add(tag);
      }

      // Aggregate item-level fields
      for (const item of doc.items) {
        if (item.type) {
          typesSet.add(item.type);
        }

        // domain is string[] - add each value
        if (item.domain && Array.isArray(item.domain)) {
          for (const d of item.domain) {
            domainsSet.add(d);
          }
        }

        // subdomain is string[] - add each value
        if (item.subdomain && Array.isArray(item.subdomain)) {
          for (const s of item.subdomain) {
            subdomainsSet.add(s);
          }
        }

        // feature is string[] (optional) - add each value
        if (item.feature && Array.isArray(item.feature)) {
          for (const f of item.feature) {
            featuresSet.add(f);
          }
        }

        if (item.priority) {
          prioritiesSet.add(item.priority);
        }

        if (item.status) {
          statusesSet.add(item.status);
        }

        // item-level tags
        if (item.tags && Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            tagsSet.add(tag);
          }
        }
      }
    }
  }

  // Convert sets to sorted arrays for consistent UI display
  return {
    projects: projectOptions,
    types: Array.from(typesSet).sort(),
    domains: Array.from(domainsSet).sort(),
    subdomains: Array.from(subdomainsSet).sort(),
    features: Array.from(featuresSet).sort(),
    priorities: Array.from(prioritiesSet).sort(),
    statuses: Array.from(statusesSet).sort(),
    tags: Array.from(tagsSet).sort(),
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
 *   { path: '/docs/REQ-20251216.md', doc_id: 'REQ-20251216-app', archived: false, ... }
 * ];
 * const project: Project = { id: 'app', name: 'My App', ... };
 *
 * const entries = enrichWithProjectInfo(docMetas, project);
 * // Returns: [
 * //   { path: '/docs/REQ-20251216.md', doc_id: 'REQ-20251216-app',
 * //     project_id: 'app', project_name: 'My App', archived: false, ... }
 * // ]
 * ```
 */
export function enrichWithProjectInfo(docMetas: DocMeta[], project: Project): CatalogEntry[] {
  return docMetas.map((docMeta) => ({
    path: docMeta.path,
    doc_id: docMeta.doc_id,
    title: docMeta.title,
    item_count: docMeta.item_count,
    updated_at: docMeta.updated_at,
    project_id: project.id,
    project_name: project.name,
    archived: docMeta.archived,
  }));
}
