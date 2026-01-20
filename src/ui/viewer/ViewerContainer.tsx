/**
 * ViewerContainer Component
 *
 * Main orchestration component for the Request Log Viewer.
 * Manages catalog loading, filtering, sorting, and document caching.
 *
 * Architecture:
 * - Loads catalog on mount using listAllDocuments()
 * - Manages filter state with multi-faceted filtering
 * - Caches full documents on-demand for expansion
 * - Provides manual refresh to re-scan filesystem
 *
 * Child Components (to be integrated):
 * - DocumentFilters (TASK-2.3) - Filter controls
 * - DocumentCatalog (TASK-2.4) - Grouped/sorted list of documents
 * - DocumentDetail (TASK-2.5) - Expanded document view
 */

import React, { useState, useEffect, useCallback, useMemo, useId, useRef } from 'react';
import type { RequestLogDoc, Project } from '@core/models';
import type { CatalogEntry, FilterState, CatalogSort, FilterOptions } from '@core/catalog';
import {
  createEmptyFilter,
  createDefaultSort,
  applyFilters,
  createGroupedCatalog,
} from '@core/catalog';
import { listAllDocuments, extractFilterOptions } from '@core/catalog/utils';
import { applyItemUpdate } from '@core/serializer';
import type { ViewerContainerProps, FieldOptions } from './types';
import type { CaptureContext } from '../wizard';
import type { FieldOption } from '@core/models';
import { useFocusTrap, useToast } from '@ui/shared';
import { DocumentCatalog } from './DocumentCatalog';
import { DocumentFilters } from './DocumentFilters';
import { DocumentArchiveConfirm, type ArchiveMode } from './DocumentArchiveConfirm';
import { DocumentDeleteConfirm } from './DocumentDeleteConfirm';
import { DocumentEditForm } from './DocumentEditForm';
import { useDocumentCache } from './hooks/useDocumentCache';
import { useMobileViewport } from './hooks/useMobileViewport';
import { MobileViewerContainer } from './mobile/MobileViewerContainer';
import './viewer.css';

/**
 * ViewerContainer
 *
 * Main container component for the Request Log Viewer feature.
 * Orchestrates catalog loading, filtering, sorting, and caching.
 *
 * State Management:
 * - catalog: All loaded documents (CatalogEntry[])
 * - filterState: Current filter criteria (multi-faceted)
 * - sort: Current sort configuration
 * - filterOptions: Available filter values from catalog
 * - documentCache: Full document data for expanded views
 * - loading: Initial load or refresh state
 * - error: Error message if load fails
 *
 * @param props - ProjectStore and DocStore dependencies
 * @returns ViewerContainer component
 */
/**
 * Helper function to group FieldOption[] by field name into FieldOptions
 */
function groupFieldOptionsByField(options: FieldOption[]): FieldOptions {
  const grouped: FieldOptions = {
    type: [],
    domain: [],
    subdomain: [],
    feature: [],
    priority: [],
    status: [],
    tags: [],
  };

  for (const opt of options) {
    if (opt.field in grouped) {
      grouped[opt.field as keyof FieldOptions].push(opt.value);
    }
  }

  return grouped;
}

export function ViewerContainer({
  projectStore,
  docStore,
  fieldCatalogStore,
  onAddItemToDocument,
}: ViewerContainerProps): React.JSX.Element {
  // ============================================================================
  // Viewport Detection
  // ============================================================================

  /** Mobile viewport detection for responsive rendering */
  const { isMobile, width } = useMobileViewport();

  /**
   * Development mode logging for viewport breakpoint changes
   * Helps debug responsive behavior during development
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[ViewerContainer] Viewport: ${isMobile ? 'mobile' : 'desktop'} (${width}px)`);
    }
  }, [isMobile, width]);

  // ============================================================================
  // State Management
  // ============================================================================

  /** All loaded catalog entries from filesystem */
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

  /** Projects list for resolving project info */
  const [projects, setProjects] = useState<Project[]>([]);

  /** Current filter criteria */
  const [filterState, setFilterState] = useState<FilterState>(createEmptyFilter());

  /** Current sort configuration */
  const [sort, setSort] = useState<CatalogSort>(createDefaultSort());

  /** Available filter values (extracted from catalog) */
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
    types: [],
    domains: [],
    priorities: [],
    statuses: [],
    tags: [],
  });

  /** Document cache hook for on-demand loading */
  const documentCache = useDocumentCache();

  /** Expanded document paths (for detail view) */
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  /** Loading state during catalog load/refresh */
  const [loading, setLoading] = useState<boolean>(true);

  /** Error message if catalog load fails */
  const [error, setError] = useState<string | null>(null);

  /** Field options per project (keyed by project_id) */
  const [projectFieldOptions, setProjectFieldOptions] = useState<Map<string, FieldOptions>>(
    new Map()
  );

  // ============================================================================
  // Document Action State
  // ============================================================================

  /** Document currently targeted by a menu action */
  const [activeDocPath, setActiveDocPath] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<RequestLogDoc | null>(null);

  /** Dialog visibility flags */
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>('archive');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  /** Action loading states */
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [updatingItemIds, setUpdatingItemIds] = useState<Set<string>>(new Set());

  /** Toast helper */
  const { addToast } = useToast();

  /** Edit modal accessibility */
  const editModalTitleId = useId();
  const editModalRef = useFocusTrap<HTMLDivElement>(isEditModalOpen);

  /**
   * Build a stable key for tracking item update state.
   */
  const getItemUpdateKey = useCallback((path: string, itemId: string) => {
    return `${path}::${itemId}`;
  }, []);

  // ============================================================================
  // Catalog Loading
  // ============================================================================

  /**
   * Load catalog from filesystem
   *
   * Scans all enabled projects and aggregates documents into catalog.
   * Extracts available filter options from loaded data.
   * Called on mount and when user clicks refresh button.
   */
  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.info('[ViewerContainer] Loading catalog...');

      // Load all documents across enabled projects
      const entries = await listAllDocuments(projectStore, docStore);

      // Load projects for filter options and reference
      const projectList = await projectStore.list();

      // Extract available filter values
      const options = extractFilterOptions(entries, projectList);

      setCatalog(entries);
      setProjects(projectList);
      setFilterOptions(options);

      console.info(`[ViewerContainer] Loaded ${entries.length} document(s)`);

      // Load field options for all projects
      const fieldOptionsMap = new Map<string, FieldOptions>();
      for (const project of projectList) {
        try {
          const options = await fieldCatalogStore.getForProject(project.id);
          fieldOptionsMap.set(project.id, groupFieldOptionsByField(options));
        } catch (err) {
          console.warn(`[ViewerContainer] Failed to load field options for project ${project.id}:`, err);
        }
      }
      setProjectFieldOptions(fieldOptionsMap);
      console.info(`[ViewerContainer] Loaded field options for ${fieldOptionsMap.size} project(s)`);
    } catch (err) {
      console.error('[ViewerContainer] Failed to load catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [projectStore, docStore, fieldCatalogStore]);

  /**
   * Load catalog on mount
   */
  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  /**
   * Ref to track if document preloading has been initiated
   * Prevents re-running preload when cache updates trigger re-renders
   */
  const preloadingRef = useRef<boolean>(false);
  const preloadedPathsRef = useRef<Set<string>>(new Set());

  /**
   * Preload all documents after catalog loads
   *
   * This enables indicators (TypeDistributionIndicator, ProjectProgressIndicator)
   * to display immediately without waiting for user to expand each row.
   * Runs in background after initial catalog load completes.
   *
   * Uses refs to prevent infinite loops from cache updates triggering re-renders.
   * Processes documents sequentially to avoid overwhelming the server.
   */
  useEffect(() => {
    if (loading || catalog.length === 0) {
      return;
    }

    // Skip if already preloading or all documents already preloaded
    if (preloadingRef.current) {
      return;
    }

    const preloadDocuments = async () => {
      preloadingRef.current = true;
      console.info('[ViewerContainer] Preloading all documents for indicators...');
      let preloadedCount = 0;

      for (const entry of catalog) {
        // Skip if already preloaded in this session
        if (preloadedPathsRef.current.has(entry.path)) {
          continue;
        }

        // Skip if already in cache
        if (documentCache.has(entry.path)) {
          preloadedPathsRef.current.add(entry.path);
          continue;
        }

        try {
          const doc = await docStore.read(entry.path);
          documentCache.set(entry.path, doc);
          preloadedPathsRef.current.add(entry.path);
          preloadedCount++;
        } catch (err) {
          console.warn(`[ViewerContainer] Failed to preload: ${entry.path}`, err);
          // Mark as attempted to avoid retrying failed paths
          preloadedPathsRef.current.add(entry.path);
        }
      }

      console.info(`[ViewerContainer] Preloaded ${preloadedCount} documents`);
      preloadingRef.current = false;
    };

    preloadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, catalog.length, docStore]);

  /**
   * Handle manual refresh button
   *
   * Re-scans filesystem for new/updated documents.
   * Clears document cache and expanded paths to force re-loading.
   */
  const handleRefresh = useCallback(() => {
    documentCache.invalidate(); // Clear cache
    setExpandedPaths(new Set()); // Collapse all expanded rows
    // Reset preload tracking so documents will be preloaded again
    preloadingRef.current = false;
    preloadedPathsRef.current = new Set();
    loadCatalog();
  }, [documentCache, loadCatalog]);

  // ============================================================================
  // Filter Management
  // ============================================================================

  /**
   * Handle filter change for a specific facet
   *
   * Updates filter state with new value for the specified key.
   * Supports both single-value and multi-value filter facets.
   *
   * @param key - Filter facet to update
   * @param value - New value for the facet
   */
  const handleFilterChange = useCallback((key: keyof FilterState, value: unknown) => {
    setFilterState((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Clear all filters
   *
   * Resets filter state to empty (all facets cleared).
   */
  const handleClearFilters = useCallback(() => {
    setFilterState(createEmptyFilter());
  }, []);

  // ============================================================================
  // Sort Management
  // ============================================================================

  /**
   * Handle sort change
   *
   * Updates sort configuration (field and order).
   *
   * @param newSort - New sort configuration
   */
  const handleSortChange = useCallback((newSort: CatalogSort) => {
    setSort(newSort);
  }, []);

  // ============================================================================
  // Document Loading (On-Demand)
  // ============================================================================

  /**
   * Load full document on demand
   *
   * Fetches full RequestLogDoc from disk and caches it.
   * Returns cached version if already loaded.
   * Used when user expands a document for detail view.
   *
   * @param path - Document file path
   * @returns Full document or null if load fails
   */
  const handleLoadDocument = useCallback(
    async (path: string): Promise<RequestLogDoc | null> => {
      // Check cache first
      if (documentCache.has(path)) {
        console.info(`[ViewerContainer] Document cache hit: ${path}`);
        return documentCache.get(path)!;
      }

      // Load from disk
      try {
        console.info(`[ViewerContainer] Loading document: ${path}`);
        const doc = await docStore.read(path);

        // Cache for future use
        documentCache.set(path, doc);

        return doc;
      } catch (err) {
        console.error(`[ViewerContainer] Failed to load document: ${path}`, err);
        return null;
      }
    },
    [documentCache, docStore]
  );

  // ============================================================================
  // Document Expansion Management
  // ============================================================================

  /**
   * Toggle document expansion
   *
   * Adds or removes document path from expanded set.
   *
   * @param path - Document path to toggle
   */
  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // ============================================================================
  // Add Item to Document Handler
  // ============================================================================

  /**
   * Handle "Add Item" action from document menu
   *
   * Creates capture context and navigates to wizard via callback.
   * Requires the document to be loaded and the project to be found.
   *
   * @param path - Document file path
   * @param doc - Full document data
   */
  const handleAddItemToDocument = useCallback(
    (path: string, doc: RequestLogDoc) => {
      if (!onAddItemToDocument) {
        console.warn('[ViewerContainer] onAddItemToDocument callback not provided');
        return;
      }

      // Find the project for this document
      const project = projects.find((p) => p.id === doc.project_id);
      if (!project) {
        console.error(`[ViewerContainer] Project not found for document: ${doc.project_id}`);
        return;
      }

      // Create capture context
      const context: CaptureContext = {
        project,
        documentPath: path,
        document: doc,
      };

      // Navigate to wizard with context
      onAddItemToDocument(context);
    },
    [projects, onAddItemToDocument]
  );

  // ============================================================================
  // Document Action Handlers (Edit/Archive/Delete)
  // ============================================================================

  /**
   * Set the active document context for menu actions
   */
  const setActiveDocument = useCallback((path: string, doc: RequestLogDoc) => {
    setActiveDocPath(path);
    setActiveDoc(doc);
  }, []);

  /**
   * Clear active document context
   */
  const clearActiveDocument = useCallback(() => {
    setActiveDocPath(null);
    setActiveDoc(null);
  }, []);

  /**
   * Request edit flow for a document
   */
  const handleRequestEditDocument = useCallback(
    (path: string, doc: RequestLogDoc) => {
      setActiveDocument(path, doc);
      setIsEditModalOpen(true);
    },
    [setActiveDocument]
  );

  /**
   * Request archive flow for a document
   */
  const handleRequestArchiveDocument = useCallback(
    (path: string, doc: RequestLogDoc) => {
      setActiveDocument(path, doc);
      setArchiveMode('archive');
      setIsArchiveConfirmOpen(true);
    },
    [setActiveDocument]
  );

  /**
   * Request unarchive flow for a document
   */
  const handleRequestUnarchiveDocument = useCallback(
    (path: string, doc: RequestLogDoc) => {
      setActiveDocument(path, doc);
      setArchiveMode('unarchive');
      setIsArchiveConfirmOpen(true);
    },
    [setActiveDocument]
  );

  /**
   * Request delete flow for a document
   */
  const handleRequestDeleteDocument = useCallback(
    (path: string, doc: RequestLogDoc) => {
      setActiveDocument(path, doc);
      setIsDeleteConfirmOpen(true);
    },
    [setActiveDocument]
  );

  /**
   * Update a single catalog entry by path
   */
  const updateCatalogEntry = useCallback((path: string, updates: Partial<CatalogEntry>) => {
    setCatalog((prev) =>
      prev.map((entry) => (entry.path === path ? { ...entry, ...updates } : entry))
    );
  }, []);

  /**
   * Remove a catalog entry by path
   */
  const removeCatalogEntry = useCallback((path: string) => {
    setCatalog((prev) => prev.filter((entry) => entry.path !== path));
  }, []);

  /**
   * Close edit modal and clear state
   */
  const handleCloseEditModal = useCallback(() => {
    if (!isSavingEdit) {
      setIsEditModalOpen(false);
      clearActiveDocument();
    }
  }, [isSavingEdit, clearActiveDocument]);

  /**
   * Handle edit modal overlay clicks
   */
  const handleEditOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !isSavingEdit) {
        handleCloseEditModal();
      }
    },
    [isSavingEdit, handleCloseEditModal]
  );

  /**
   * Save document edits
   */
  const handleSaveEdit = useCallback(
    async (updatedDoc: RequestLogDoc) => {
      if (!activeDocPath || isSavingEdit) return;

      setIsSavingEdit(true);

      try {
        await docStore.write(activeDocPath, updatedDoc);
        documentCache.set(activeDocPath, updatedDoc);
        updateCatalogEntry(activeDocPath, {
          title: updatedDoc.title,
          updated_at: updatedDoc.updated_at,
          archived: updatedDoc.archived,
        });
        setIsEditModalOpen(false);
        clearActiveDocument();
        addToast({
          type: 'success',
          message: 'Document updated',
        });
      } catch (error) {
        console.error('Failed to update document:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update document',
          duration: 7000,
        });
      } finally {
        setIsSavingEdit(false);
      }
    },
    [
      activeDocPath,
      isSavingEdit,
      docStore,
      documentCache,
      updateCatalogEntry,
      clearActiveDocument,
      addToast,
    ]
  );

  /**
   * Confirm archive/unarchive action
   */
  const handleConfirmArchive = useCallback(async () => {
    if (!activeDocPath || !activeDoc || isArchiving) return;

    setIsArchiving(true);

    try {
      const updatedDoc: RequestLogDoc = {
        ...activeDoc,
        archived: archiveMode === 'archive',
        updated_at: new Date(),
      };

      await docStore.write(activeDocPath, updatedDoc);
      documentCache.set(activeDocPath, updatedDoc);
      updateCatalogEntry(activeDocPath, {
        archived: updatedDoc.archived,
        updated_at: updatedDoc.updated_at,
      });
      setIsArchiveConfirmOpen(false);
      clearActiveDocument();
      addToast({
        type: 'success',
        message: updatedDoc.archived ? 'Document archived' : 'Document restored',
      });
    } catch (error) {
      console.error('Failed to archive/unarchive document:', error);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to archive document',
        duration: 7000,
      });
    } finally {
      setIsArchiving(false);
    }
  }, [
    activeDocPath,
    activeDoc,
    archiveMode,
    isArchiving,
    docStore,
    documentCache,
    updateCatalogEntry,
    clearActiveDocument,
    addToast,
  ]);

  /**
   * Cancel archive/unarchive action
   */
  const handleCancelArchive = useCallback(() => {
    if (!isArchiving) {
      setIsArchiveConfirmOpen(false);
      clearActiveDocument();
    }
  }, [isArchiving, clearActiveDocument]);

  /**
   * Confirm delete action
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!activeDocPath || !activeDoc || isDeleting) return;

    const deleteDocument = docStore.delete;
    if (!deleteDocument) {
      addToast({
        type: 'error',
        message: 'Delete not supported by the current storage adapter',
        duration: 7000,
      });
      return;
    }

    setIsDeleting(true);

    try {
      await deleteDocument.call(docStore, activeDocPath);
      removeCatalogEntry(activeDocPath);
      documentCache.remove(activeDocPath);
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        next.delete(activeDocPath);
        return next;
      });
      setIsDeleteConfirmOpen(false);
      clearActiveDocument();
      addToast({
        type: 'success',
        message: 'Document deleted',
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete document',
        duration: 7000,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [
    activeDocPath,
    activeDoc,
    isDeleting,
    docStore,
    removeCatalogEntry,
    documentCache,
    addToast,
    clearActiveDocument,
  ]);

  /**
   * Cancel delete action
   */
  const handleCancelDelete = useCallback(() => {
    if (!isDeleting) {
      setIsDeleteConfirmOpen(false);
      clearActiveDocument();
    }
  }, [isDeleting, clearActiveDocument]);

  /**
   * Handle inline item updates from the document detail view.
   */
  const handleItemUpdate = useCallback(
    async (
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
    ) => {
      const updateKey = getItemUpdateKey(path, itemId);

      if (updatingItemIds.has(updateKey)) {
        return;
      }

      const currentDoc = documentCache.get(path);
      if (!currentDoc) {
        return;
      }

      setUpdatingItemIds((prev) => new Set(prev).add(updateKey));

      try {
        const { updatedDoc, changed } = applyItemUpdate(currentDoc, itemId, updates);

        if (!changed) {
          return;
        }

        await docStore.write(path, updatedDoc);
        documentCache.set(path, updatedDoc);

        if (activeDocPath === path) {
          setActiveDoc(updatedDoc);
        }

        setCatalog((prev) =>
          prev.map((entry) =>
            entry.path === path
              ? {
                  ...entry,
                  updated_at: updatedDoc.updated_at,
                }
              : entry
          )
        );
      } catch (error) {
        console.error('Failed to update item:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update item',
          duration: 7000,
        });
      } finally {
        setUpdatingItemIds((prev) => {
          const next = new Set(prev);
          next.delete(updateKey);
          return next;
        });
      }
    },
    [
      activeDocPath,
      addToast,
      documentCache,
      docStore,
      getItemUpdateKey,
      updatingItemIds,
    ]
  );

  const isItemUpdating = useCallback(
    (path: string, itemId: string): boolean => {
      return updatingItemIds.has(getItemUpdateKey(path, itemId));
    },
    [getItemUpdateKey, updatingItemIds]
  );

  /**
   * Handle adding a new field option to the field catalog
   * Persists the option and updates local state
   */
  const handleAddFieldOption = useCallback(
    async (field: string, value: string, projectId: string) => {
      try {
        // Add to field catalog store (persists to disk)
        await fieldCatalogStore.addOption({
          field: field as 'type' | 'domain' | 'subdomain' | 'feature' | 'priority' | 'status' | 'tags',
          value,
          scope: 'project',
          project_id: projectId,
        });

        // Update local state to reflect the new option
        setProjectFieldOptions((prev) => {
          const next = new Map(prev);
          const existing = next.get(projectId) || {
            type: [],
            domain: [],
            subdomain: [],
            feature: [],
            priority: [],
            status: [],
            tags: [],
          };

          // Add the new value if not already present
          const fieldKey = field as keyof FieldOptions;
          if (!existing[fieldKey].includes(value)) {
            next.set(projectId, {
              ...existing,
              [fieldKey]: [...existing[fieldKey], value].sort(),
            });
          }

          return next;
        });

        console.info(`[ViewerContainer] Added field option: ${field}="${value}" for project ${projectId}`);
      } catch (error) {
        console.error('[ViewerContainer] Failed to add field option:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to add field option',
          duration: 5000,
        });
      }
    },
    [fieldCatalogStore, addToast]
  );

  /**
   * Close edit modal on Escape key
   */
  useEffect(() => {
    if (!isEditModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSavingEdit) {
        event.preventDefault();
        handleCloseEditModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, isSavingEdit, handleCloseEditModal]);

  // ============================================================================
  // Derived State (Filtering & Sorting)
  // ============================================================================

  /**
   * Apply filters and sorting to catalog
   *
   * Filters catalog entries based on current filter state,
   * then groups by project and sorts within groups.
   */
  const filteredAndSorted = useMemo(() => {
    // Apply all filter facets
    const filtered = applyFilters(catalog, filterState);

    // Group by project and sort
    const grouped = createGroupedCatalog(filtered, sort, 'name');

    return {
      filtered,
      grouped,
    };
  }, [catalog, filterState, sort]);

  const { filtered: filteredCatalog, grouped: groupedCatalog } = filteredAndSorted;

  /**
   * Compute active filter count for mobile badge
   *
   * Counts the number of filter facets that have active values.
   * Used to display badge count on mobile filter FAB.
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterState.project_id) count++;
    if (filterState.types.length > 0) count++;
    if (filterState.domains.length > 0) count++;
    if (filterState.priorities.length > 0) count++;
    if (filterState.statuses.length > 0) count++;
    if (filterState.tags.length > 0) count++;
    if (filterState.text.trim()) count++;
    if (filterState.archiveStatus !== 'active') count++;
    return count;
  }, [filterState]);

  // ============================================================================
  // Render
  // ============================================================================

  // Mobile rendering - uses MobileViewerContainer for touch-optimized UI
  if (isMobile) {
    return (
      <MobileViewerContainer
        entries={filteredCatalog}
        groupedCatalog={groupedCatalog}
        filterState={filterState}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        activeFilterCount={activeFilterCount}
        onLoadDocument={handleLoadDocument}
        sort={sort}
        onSortChange={handleSortChange}
        onRefresh={handleRefresh}
        loading={loading}
        isGrouped={true}
      />
    );
  }

  // Desktop rendering - original viewer UI
  return (
    <div className="viewer-container">
      {/* Header with title and refresh button */}
      <div className="viewer-header">
        <h2>Request Log Viewer</h2>
        <button
          type="button"
          className="button secondary"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh catalog"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        /* Error State */
        <ErrorState error={error} onRetry={handleRefresh} />
      ) : catalog.length === 0 ? (
        /* Empty State */
        <EmptyState />
      ) : (
        /* Main Content */
        <>
          {/* Document Filters */}
          <DocumentFilters
            filterState={filterState}
            filterOptions={filterOptions}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            resultCount={filteredCatalog.length}
            totalCount={catalog.length}
          />

          {/* DocumentCatalog - TASK-2.4 */}
          <DocumentCatalog
            entries={filteredCatalog}
            groupedCatalog={groupedCatalog}
            sort={sort}
            onSortChange={handleSortChange}
            onLoadDocument={handleLoadDocument}
            expandedPaths={expandedPaths}
            onToggleExpand={handleToggleExpand}
            documentCache={documentCache.cache}
            onAddItemToDocument={handleAddItemToDocument}
            onEditDocument={handleRequestEditDocument}
            onArchiveDocument={handleRequestArchiveDocument}
            onUnarchiveDocument={handleRequestUnarchiveDocument}
            onDeleteDocument={handleRequestDeleteDocument}
            onItemUpdate={handleItemUpdate}
            isItemUpdating={isItemUpdating}
            fieldOptions={projectFieldOptions}
            onAddFieldOption={handleAddFieldOption}
          />

          {activeDoc && (
            <DocumentDeleteConfirm
              doc={activeDoc}
              isOpen={isDeleteConfirmOpen}
              onConfirm={handleConfirmDelete}
              onCancel={handleCancelDelete}
            />
          )}

          {activeDoc && (
            <DocumentArchiveConfirm
              doc={activeDoc}
              isOpen={isArchiveConfirmOpen}
              mode={archiveMode}
              onConfirm={handleConfirmArchive}
              onCancel={handleCancelArchive}
              isLoading={isArchiving}
            />
          )}

          {activeDoc && isEditModalOpen && (
            <div
              className="modal-overlay edit-modal-overlay"
              onClick={handleEditOverlayClick}
              role="presentation"
            >
              <div
                ref={editModalRef}
                className="edit-modal glass"
                role="dialog"
                aria-modal="true"
                aria-labelledby={editModalTitleId}
              >
                <div className="edit-modal-header">
                  <h2 id={editModalTitleId} className="edit-modal-title">
                    Edit Document
                  </h2>
                  <button
                    type="button"
                    className="edit-modal-close"
                    onClick={handleCloseEditModal}
                    disabled={isSavingEdit}
                    aria-label="Close modal"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <div className="edit-modal-content">
                  <DocumentEditForm
                    doc={activeDoc}
                    onSave={handleSaveEdit}
                    onCancel={handleCloseEditModal}
                    isSaving={isSavingEdit}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * LoadingSkeleton Component
 *
 * Skeleton UI shown during initial catalog load or refresh.
 * Uses glass/x-morphism skeleton animations from shared.css.
 */
function LoadingSkeleton(): React.JSX.Element {
  return (
    <div className="viewer-loading" aria-live="polite" aria-busy="true">
      <div className="skeleton skeleton-text large" aria-label="Loading header" />
      <div className="skeleton skeleton-card" aria-label="Loading filters" />
      <div className="skeleton skeleton-card" aria-label="Loading catalog 1" />
      <div className="skeleton skeleton-card" aria-label="Loading catalog 2" />
      <div className="skeleton skeleton-card" aria-label="Loading catalog 3" />
    </div>
  );
}

/**
 * ErrorState Component
 *
 * Error UI shown when catalog load fails.
 * Provides retry button to attempt reload.
 *
 * @param props - Error message and retry handler
 */
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps): React.JSX.Element {
  return (
    <div className="viewer-error glass" role="alert" aria-live="assertive">
      <div className="error-message">
        <span className="error-icon" aria-hidden="true">
          Warning
        </span>
        <div>
          <h3>Failed to Load Catalog</h3>
          <p>{error}</p>
        </div>
      </div>
      <button
        type="button"
        className="button primary"
        onClick={onRetry}
        aria-label="Retry loading catalog"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * EmptyState Component
 *
 * Empty state shown when no documents exist.
 * Suggests creating documents via the capture wizard.
 */
function EmptyState(): React.JSX.Element {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        Document
      </span>
      <h3 className="empty-state-title">No Documents Found</h3>
      <p className="empty-state-description">
        No request-log documents found in enabled projects.
        <br />
        Use the Capture wizard to create your first document.
      </p>
    </div>
  );
}

export default ViewerContainer;
