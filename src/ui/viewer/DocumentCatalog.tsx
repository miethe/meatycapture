/**
 * DocumentCatalog Component
 *
 * Main catalog table for the Request Log Viewer.
 * Displays documents grouped by project with sorting, grouping, and row expansion.
 *
 * Features:
 * - Project-based grouping with collapsible headers
 * - Sortable columns (doc_id, title, item_count, updated_at)
 * - Row expansion for document detail view
 * - On-demand document loading with caching
 * - Keyboard navigation (arrow keys, Enter)
 * - ARIA table semantics for accessibility
 * - Empty state when no documents match filters
 *
 * Architecture:
 * - Uses TanStack Table for data management
 * - Custom project grouping via ProjectGroupRow component
 * - DocumentRow component for individual entries
 * - Glass/x-morphism styling for visual consistency
 */

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from '@tanstack/react-table';
import type { RequestLogDoc } from '@core/models';
import type { CatalogEntry, CatalogSort, GroupedCatalog } from '@core/catalog';
import { ProjectGroupRow } from './ProjectGroupRow';
import { DocumentRow } from './DocumentRow';

export interface DocumentCatalogProps {
  /** Filtered catalog entries */
  entries: CatalogEntry[];

  /** Entries grouped by project */
  groupedCatalog: GroupedCatalog;

  /** Current sort configuration */
  sort: CatalogSort;

  /** Handle sort change */
  onSortChange: (sort: CatalogSort) => void;

  /** Load full document data on demand */
  onLoadDocument: (path: string) => Promise<RequestLogDoc | null>;

  /** Currently expanded document paths */
  expandedPaths: Set<string>;

  /** Toggle document expansion */
  onToggleExpand: (path: string) => void;

  /** Cached full documents */
  documentCache: Map<string, RequestLogDoc>;
}

/**
 * DocumentCatalog Component
 *
 * Displays the catalog of documents in a sortable, grouped table.
 * Supports project grouping, row expansion, and on-demand loading.
 *
 * @param props - DocumentCatalogProps
 * @returns DocumentCatalog component
 */
export function DocumentCatalog({
  entries,
  groupedCatalog,
  sort,
  onSortChange,
  onLoadDocument,
  expandedPaths,
  onToggleExpand,
  documentCache,
}: DocumentCatalogProps): React.JSX.Element {
  // ============================================================================
  // State Management
  // ============================================================================

  /** Expanded project IDs (for collapsible project groups) */
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(Array.from(groupedCatalog.groups.keys()))
  );

  /** Loading states for document rows */
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());

  // ============================================================================
  // Column Definitions
  // ============================================================================

  /**
   * Table column definitions for TanStack Table
   * Defines sortable fields and cell rendering
   */
  const columns = useMemo<ColumnDef<CatalogEntry>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: () => null, // Rendered manually in DocumentRow
        size: 50,
      },
      {
        accessorKey: 'doc_id',
        header: 'Document ID',
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'title',
        header: 'Title',
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'item_count',
        header: 'Items',
        sortingFn: 'basic',
      },
      {
        accessorKey: 'updated_at',
        header: 'Updated',
        sortingFn: 'datetime',
      },
      {
        id: 'tags',
        header: 'Tags',
        cell: () => null, // Rendered manually in DocumentRow
      },
    ],
    []
  );

  // ============================================================================
  // Table Instance
  // ============================================================================

  /**
   * Convert CatalogSort to TanStack Table SortingState
   */
  const sortingState: SortingState = useMemo(
    () => [
      {
        id: sort.field,
        desc: sort.order === 'desc',
      },
    ],
    [sort]
  );

  /**
   * Initialize TanStack Table
   */
  const table = useReactTable({
    data: entries,
    columns,
    state: {
      sorting: sortingState,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sortingState) : updater;
      if (newSorting.length > 0) {
        const newSort = newSorting[0];
        if (newSort) {
          onSortChange({
            field: newSort.id as CatalogSort['field'],
            order: newSort.desc ? 'desc' : 'asc',
          });
        }
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: false, // Let TanStack handle sorting
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Toggle project group expansion
   */
  const handleToggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  /**
   * Load document data on demand
   * Sets loading state while fetching
   */
  const handleLoadDocument = async (path: string) => {
    if (loadingPaths.has(path) || documentCache.has(path)) {
      return;
    }

    setLoadingPaths((prev) => new Set(prev).add(path));

    try {
      await onLoadDocument(path);
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render sort indicator icon for column headers
   */
  const renderSortIndicator = (columnId: string) => {
    if (sort.field !== columnId) {
      return null;
    }

    return (
      <span className="sort-indicator" aria-label={`Sorted ${sort.order}ending`}>
        {sort.order === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // ============================================================================
  // Empty State
  // ============================================================================

  if (entries.length === 0) {
    return (
      <div className="viewer-catalog-empty glass" role="status">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            🔍
          </span>
          <h3 className="empty-state-title">No Documents Found</h3>
          <p className="empty-state-description">
            No documents match the current filter criteria.
            <br />
            Try adjusting your filters or clearing them to see all documents.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="viewer-catalog glass" role="region" aria-label="Document catalog">
      <div className="viewer-catalog-table-wrapper">
        <table className="viewer-catalog-table" role="table">
          {/* Table Header */}
          <thead role="rowgroup">
            <tr className="viewer-catalog-header" role="row">
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => {
                  const isSortable = ['doc_id', 'title', 'item_count', 'updated_at'].includes(
                    header.id
                  );

                  return (
                    <th
                      key={header.id}
                      className={`viewer-catalog-header-cell ${isSortable ? 'sortable' : ''}`}
                      role="columnheader"
                      aria-sort={
                        sort.field === header.id
                          ? sort.order === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                      onClick={
                        isSortable
                          ? () =>
                              onSortChange({
                                field: header.id as CatalogSort['field'],
                                order: sort.field === header.id && sort.order === 'asc' ? 'desc' : 'asc',
                              })
                          : undefined
                      }
                      style={{ cursor: isSortable ? 'pointer' : 'default' }}
                    >
                      <div className="header-content">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {renderSortIndicator(header.id)}
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          {/* Table Body - Grouped by Project */}
          <tbody role="rowgroup">
            {Array.from(groupedCatalog.groups.entries()).map(([projectId, { project, entries: projectEntries }]) => {
              const isProjectExpanded = expandedProjects.has(projectId);

              return (
                <React.Fragment key={projectId}>
                  {/* Project Group Header */}
                  <ProjectGroupRow
                    project={project}
                    documentCount={projectEntries.length}
                    isExpanded={isProjectExpanded}
                    onToggle={() => handleToggleProject(projectId)}
                  />

                  {/* Document Rows (only if project is expanded) */}
                  {isProjectExpanded &&
                    projectEntries.map((entry) => (
                      <DocumentRow
                        key={entry.path}
                        entry={entry}
                        isExpanded={expandedPaths.has(entry.path)}
                        onToggle={() => onToggleExpand(entry.path)}
                        onLoadDocument={() => handleLoadDocument(entry.path)}
                        isLoading={loadingPaths.has(entry.path)}
                      />
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DocumentCatalog;
