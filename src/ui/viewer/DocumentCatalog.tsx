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

import React, { useState, useMemo, useCallback } from 'react';
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
import type { FieldOptions } from './types';
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

  /** Callback when "Add Item" is clicked for a document */
  onAddItemToDocument?: (path: string, doc: RequestLogDoc) => void;

  /** Callback when "Edit Document" is clicked for a document */
  onEditDocument?: (path: string, doc: RequestLogDoc) => void;

  /** Callback when "Archive Document" is clicked for a document */
  onArchiveDocument?: (path: string, doc: RequestLogDoc) => void;

  /** Callback when "Unarchive Document" is clicked for a document */
  onUnarchiveDocument?: (path: string, doc: RequestLogDoc) => void;

  /** Callback when "Delete Document" is clicked for a document */
  onDeleteDocument?: (path: string, doc: RequestLogDoc) => void;

  /** Callback when an item is updated inline */
  onItemUpdate?: (
    path: string,
    itemId: string,
    updates: {
      title?: string;
      type?: string;
      domain?: string[];
      subdomain?: string[];
      context?: string;
      feature?: string[];
      priority?: string;
      status?: string;
      tags?: string[];
    }
  ) => void;

  /** Whether a specific item is updating */
  isItemUpdating?: (path: string, itemId: string) => boolean;

  /** Field options per project (keyed by project_id) */
  fieldOptions?: Map<string, FieldOptions>;

  /** Callback when a new field option is added during editing */
  onAddFieldOption?: (field: string, value: string, projectId: string) => Promise<void>;
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
  onAddItemToDocument,
  onEditDocument,
  onArchiveDocument,
  onUnarchiveDocument,
  onDeleteDocument,
  onItemUpdate,
  isItemUpdating,
  fieldOptions,
  onAddFieldOption,
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
   *
   * Column layout:
   * - expand: Expand/collapse chevron (50px)
   * - types: Type distribution indicator (80px)
   * - docInfo: Info icon with doc_id tooltip + copy (40px)
   * - title: Document title (flexible, sortable)
   * - itemStatus: Status indicator "x/y done" (80px)
   * - modifiedDate: Calendar icon + date (100px)
   * - tags: Tag chips with overflow (remaining space)
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
        id: 'types',
        header: 'Types',
        cell: () => null, // Rendered manually in DocumentRow (TypeDistributionIndicator)
        size: 80,
      },
      {
        id: 'docInfo',
        header: '',
        cell: () => null, // Rendered manually in DocumentRow (info icon with doc_id tooltip)
        size: 40,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        sortingFn: 'alphanumeric',
      },
      {
        id: 'itemStatus',
        header: 'Status',
        cell: () => null, // Rendered manually in DocumentRow (DocumentStatusIndicator)
        size: 80,
      },
      {
        id: 'modifiedDate',
        header: 'Modified',
        cell: () => null, // Rendered manually in DocumentRow (calendar + date)
        size: 100,
      },
      {
        id: 'tags',
        header: 'Tags',
        cell: () => null, // Rendered manually in DocumentRow (tag chips with overflow)
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
   * Wrapped in useCallback to prevent unnecessary re-renders of child components
   */
  const handleToggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  /**
   * Load document data on demand
   * Sets loading state while fetching
   * Wrapped in useCallback with proper dependencies
   */
  const handleLoadDocument = useCallback(
    async (path: string) => {
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
    },
    [loadingPaths, documentCache, onLoadDocument]
  );

  /**
   * Load document for menu actions (edit/archive/delete/add)
   */
  const loadDocumentForAction = useCallback(
    async (path: string): Promise<RequestLogDoc | undefined> => {
      let doc = documentCache.get(path);
      if (!doc) {
        doc = (await onLoadDocument(path)) ?? undefined;
      }
      return doc;
    },
    [documentCache, onLoadDocument]
  );

  /**
   * Handle "Add Item" action for a document
   * Loads document if not cached, then triggers callback
   */
  const handleAddItem = useCallback(
    async (path: string) => {
      if (!onAddItemToDocument) return;

      const doc = await loadDocumentForAction(path);

      if (doc && onAddItemToDocument) {
        onAddItemToDocument(path, doc);
      } else {
        console.error(`[DocumentCatalog] Failed to load document for Add Item: ${path}`);
      }
    },
    [loadDocumentForAction, onAddItemToDocument]
  );

  /**
   * Handle "Edit Document" action for a document
   */
  const handleEditDocument = useCallback(
    async (path: string) => {
      if (!onEditDocument) return;

      const doc = await loadDocumentForAction(path);

      if (doc) {
        onEditDocument(path, doc);
      } else {
        console.error(`[DocumentCatalog] Failed to load document for Edit: ${path}`);
      }
    },
    [loadDocumentForAction, onEditDocument]
  );

  /**
   * Handle "Archive Document" action for a document
   */
  const handleArchiveDocument = useCallback(
    async (path: string) => {
      if (!onArchiveDocument) return;

      const doc = await loadDocumentForAction(path);

      if (doc) {
        onArchiveDocument(path, doc);
      } else {
        console.error(`[DocumentCatalog] Failed to load document for Archive: ${path}`);
      }
    },
    [loadDocumentForAction, onArchiveDocument]
  );

  /**
   * Handle "Unarchive Document" action for a document
   */
  const handleUnarchiveDocument = useCallback(
    async (path: string) => {
      if (!onUnarchiveDocument) return;

      const doc = await loadDocumentForAction(path);

      if (doc) {
        onUnarchiveDocument(path, doc);
      } else {
        console.error(`[DocumentCatalog] Failed to load document for Unarchive: ${path}`);
      }
    },
    [loadDocumentForAction, onUnarchiveDocument]
  );

  /**
   * Handle "Delete Document" action for a document
   */
  const handleDeleteDocument = useCallback(
    async (path: string) => {
      if (!onDeleteDocument) return;

      const doc = await loadDocumentForAction(path);

      if (doc) {
        onDeleteDocument(path, doc);
      } else {
        console.error(`[DocumentCatalog] Failed to load document for Delete: ${path}`);
      }
    },
    [loadDocumentForAction, onDeleteDocument]
  );

  /**
   * Get cached documents for a list of catalog entries
   * Returns only the documents that have been loaded into the cache
   */
  const getProjectDocuments = useCallback(
    (projectEntries: CatalogEntry[]): RequestLogDoc[] => {
      const docs: RequestLogDoc[] = [];
      for (const entry of projectEntries) {
        const doc = documentCache.get(entry.path);
        if (doc) {
          docs.push(doc);
        }
      }
      return docs;
    },
    [documentCache]
  );

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Render sort indicator icon for column headers
   * Wrapped in useCallback to prevent recreation on every render
   */
  const renderSortIndicator = useCallback(
    (columnId: string) => {
      if (sort.field !== columnId) {
        return null;
      }

      return (
        <span className="sort-indicator" aria-label={`Sorted ${sort.order}ending`}>
          {sort.order === 'asc' ? '↑' : '↓'}
        </span>
      );
    },
    [sort.field, sort.order]
  );

  // ============================================================================
  // Empty State
  // ============================================================================

  if (entries.length === 0) {
    return (
      <div className="viewer-catalog-empty glass" role="status">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            Search
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
          {/* Column widths for fixed table layout */}
          <colgroup>
            <col className="col-expand" />
            <col className="col-types" />
            <col className="col-doc-info" />
            <col className="col-title" />
            <col className="col-status" />
            <col className="col-modified" />
            <col className="col-tags" />
            <col className="col-actions" />
          </colgroup>

          {/* Table Header */}
          <thead role="rowgroup">
            <tr className="viewer-catalog-header" role="row">
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => {
                  const isSortable = ['title'].includes(header.id);
                  const isTypesHeader = header.id === 'types';

                  return (
                    <th
                      key={header.id}
                      className={`viewer-catalog-header-cell ${isSortable ? 'sortable' : ''} ${isTypesHeader ? 'viewer-type-indicator-cell' : ''}`}
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
                                order:
                                  sort.field === header.id && sort.order === 'asc' ? 'desc' : 'asc',
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
            {Array.from(groupedCatalog.groups.entries()).map(
              ([projectId, { project, entries: projectEntries }]) => {
                const isProjectExpanded = expandedProjects.has(projectId);
                const projectDocuments = getProjectDocuments(projectEntries);

                return (
                  <React.Fragment key={projectId}>
                    {/* Project Group Header */}
                    <ProjectGroupRow
                      project={project}
                      documentCount={projectEntries.length}
                      documents={projectDocuments}
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
                          document={documentCache.get(entry.path) || null}
                          onAddItem={
                            onAddItemToDocument ? () => handleAddItem(entry.path) : undefined
                          }
                          onEdit={
                            onEditDocument ? () => handleEditDocument(entry.path) : undefined
                          }
                          onArchive={
                            onArchiveDocument ? () => handleArchiveDocument(entry.path) : undefined
                          }
                          onUnarchive={
                            onUnarchiveDocument
                              ? () => handleUnarchiveDocument(entry.path)
                              : undefined
                          }
                          onDelete={
                            onDeleteDocument ? () => handleDeleteDocument(entry.path) : undefined
                          }
                          {...(onItemUpdate ? { onItemUpdate } : {})}
                          {...(isItemUpdating ? { isItemUpdating } : {})}
                          fieldOptions={fieldOptions?.get(projectId)}
                          onAddFieldOption={
                            onAddFieldOption
                              ? (field: string, value: string) =>
                                  onAddFieldOption(field, value, projectId)
                              : undefined
                          }
                        />
                      ))}
                  </React.Fragment>
                );
              }
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DocumentCatalog;
