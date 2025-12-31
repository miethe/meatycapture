/**
 * MobileViewerContainer Component
 *
 * Top-level container that orchestrates all mobile viewer components.
 * Manages state for FAB, FilterSheet, and DetailSheet interactions.
 *
 * Features:
 * - Integrates MobileViewerHeader, MobileDocList, MobileFilterFab
 * - Manages MobileFilterSheet and MobileDetailSheet open/close state
 * - Receives filter state from parent ViewerContainer
 * - Handles document tap and sheet transitions
 * - Safe area insets for proper notch/navigation bar spacing
 * - Loading skeleton during initial load
 * - Empty state when no documents match filters
 *
 * Layout:
 * - Sticky header with search, sort, refresh
 * - Scrollable document list (flat or grouped)
 * - FAB positioned bottom-right
 * - Bottom sheets rendered via portals
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type {
  CatalogEntry,
  GroupedCatalog,
  FilterState,
  FilterOptions,
  CatalogSort,
  SortField,
  SortOrder,
} from '@core/catalog';
import type { RequestLogDoc } from '@core/models';
import { MobileViewerHeader } from './MobileViewerHeader';
import { MobileDocList } from './MobileDocList';
import { MobileFilterFab } from './MobileFilterFab';
import { MobileFilterSheet } from './MobileFilterSheet';
import { MobileDetailSheet } from './MobileDetailSheet';
import { useBottomSheet } from '../hooks/useBottomSheet';
import { useHalfSheet } from '../hooks/useHalfSheet';
import { useSafeArea } from '../hooks/useSafeArea';
import './mobile-viewer.css';

/**
 * Safe area insets configuration
 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Props for MobileViewerContainer component
 */
export interface MobileViewerContainerProps {
  /** Catalog entries to display */
  entries: CatalogEntry[];

  /** Grouped catalog for project grouping */
  groupedCatalog: GroupedCatalog;

  /** Current filter state */
  filterState: FilterState;

  /** Available filter options */
  filterOptions: FilterOptions;

  /** Called when filter changes */
  onFilterChange: (key: keyof FilterState, value: unknown) => void;

  /** Called when filters cleared */
  onClearFilters: () => void;

  /** Active filter count for badge */
  activeFilterCount: number;

  /** Called when document needs to be loaded */
  onLoadDocument: (path: string) => Promise<RequestLogDoc | null>;

  /** Current sort configuration */
  sort: CatalogSort;

  /** Called when sort changes */
  onSortChange: (sort: CatalogSort) => void;

  /** Called when refresh requested */
  onRefresh: () => void;

  /** Whether currently loading */
  loading: boolean;

  /** Safe area insets (optional, uses hook fallback) */
  safeAreaInsets?: SafeAreaInsets;

  /** Whether to display entries grouped by project */
  isGrouped?: boolean;
}

/**
 * MobileLoadingSkeleton Component
 *
 * Full-page loading state with shimmer animation.
 * Shown during initial catalog load.
 */
function MobileLoadingSkeleton(): React.JSX.Element {
  return (
    <div
      className="mobile-viewer-container__loading"
      role="status"
      aria-label="Loading documents"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mobile-spacing-md)',
        padding: 'var(--mobile-spacing-md)',
      }}
    >
      {/* Skeleton cards */}
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            minHeight: 'var(--mobile-card-min-height, 80px)',
            padding: 'var(--mobile-spacing-md)',
            background: 'var(--mobile-surface-secondary)',
            borderRadius: 'var(--mobile-radius-md)',
          }}
          aria-hidden="true"
        >
          {/* Header skeleton */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 'var(--mobile-spacing-sm)',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '16px',
                borderRadius: 'var(--mobile-radius-sm)',
                background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <div
              style={{
                width: '60px',
                height: '16px',
                borderRadius: 'var(--mobile-radius-sm)',
                background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>

          {/* Title skeleton */}
          <div
            style={{
              width: '80%',
              height: '20px',
              borderRadius: 'var(--mobile-radius-sm)',
              marginBottom: 'var(--mobile-spacing-sm)',
              background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }}
          />

          {/* Meta skeleton */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                width: '100px',
                height: '14px',
                borderRadius: 'var(--mobile-radius-sm)',
                background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <div
              style={{
                width: '80px',
                height: '14px',
                borderRadius: 'var(--mobile-radius-sm)',
                background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * MobileEmptyState Component
 *
 * Displayed when no documents match the current filters.
 * Provides visual feedback and suggestion to adjust filters.
 */
function MobileEmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}): React.JSX.Element {
  return (
    <div
      className="mobile-viewer-container__empty"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mobile-spacing-xl)',
        textAlign: 'center',
      }}
      role="status"
      aria-label={hasFilters ? 'No documents match filters' : 'No documents found'}
    >
      {/* Empty state icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{
          color: 'var(--mobile-text-disabled)',
          marginBottom: 'var(--mobile-spacing-lg)',
        }}
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>

      <h3
        style={{
          margin: 0,
          marginBottom: 'var(--mobile-spacing-sm)',
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--mobile-text-primary)',
        }}
      >
        {hasFilters ? 'No matching documents' : 'No documents yet'}
      </h3>

      <p
        style={{
          margin: 0,
          marginBottom: 'var(--mobile-spacing-lg)',
          fontSize: '0.875rem',
          color: 'var(--mobile-text-secondary)',
          maxWidth: '280px',
        }}
      >
        {hasFilters
          ? 'Try adjusting your filters or search terms to find documents.'
          : 'Create your first request log document to get started.'}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          style={{
            padding: 'var(--mobile-spacing-sm) var(--mobile-spacing-lg)',
            backgroundColor: 'var(--mobile-accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--mobile-radius-md)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            minHeight: '44px',
          }}
          aria-label="Clear all filters"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

/**
 * MobileViewerContainer Component
 *
 * Orchestrates all mobile viewer components including header, document list,
 * FAB, filter sheet, and detail sheet.
 *
 * State Management:
 * - Filter sheet: useBottomSheet hook
 * - Detail sheet: useHalfSheet hook
 * - Selected entry: local useState
 * - Safe area: useSafeArea hook (with prop override)
 *
 * Event Flow:
 * 1. FAB tap -> Opens FilterSheet
 * 2. Card tap -> Sets selectedEntry, opens DetailSheet
 * 3. Filter Apply -> Closes FilterSheet
 * 4. Detail "View Full" -> Calls onLoadDocument, expands sheet
 * 5. Sheet dismiss -> Closes respective sheet
 *
 * @param props - MobileViewerContainerProps
 * @returns Mobile viewer container component
 */
export function MobileViewerContainer({
  entries,
  groupedCatalog,
  filterState,
  filterOptions,
  onFilterChange,
  onClearFilters,
  activeFilterCount,
  onLoadDocument,
  sort,
  onSortChange,
  onRefresh,
  loading,
  safeAreaInsets,
  isGrouped = false,
}: MobileViewerContainerProps): React.JSX.Element {
  // Sheet state management
  const filterSheet = useBottomSheet();
  const detailSheet = useHalfSheet();

  // Selected document for detail view
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);

  // Reference to the FAB button for focus restoration after filter sheet closes
  const fabRef = useRef<HTMLButtonElement | null>(null);

  // Reference to the last focused card for focus restoration on detail sheet close
  const lastFocusedCardRef = useRef<HTMLElement | null>(null);

  // Search text for header (managed locally, synced to filter on change)
  const searchValue = filterState.text;

  // Safe area insets (use prop override or hook fallback)
  const hookSafeArea = useSafeArea();
  const safeArea = useMemo(
    () => safeAreaInsets ?? hookSafeArea,
    [safeAreaInsets, hookSafeArea]
  );

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (value: string) => {
      onFilterChange('text', value);
    },
    [onFilterChange]
  );

  /**
   * Handle search clear
   */
  const handleSearchClear = useCallback(() => {
    onFilterChange('text', '');
  }, [onFilterChange]);

  /**
   * Handle sort change from header
   */
  const handleSort = useCallback(
    (field: SortField, order: SortOrder) => {
      onSortChange({ field, order });
    },
    [onSortChange]
  );

  /**
   * Handle card tap - open detail sheet
   * Stores reference to tapped card element for focus restoration
   */
  const handleCardTap = useCallback(
    (entry: CatalogEntry, element?: HTMLElement) => {
      // Store the card element for focus restoration on close
      lastFocusedCardRef.current = element ?? null;
      setSelectedEntry(entry);
      detailSheet.open();
    },
    [detailSheet]
  );

  /**
   * Handle apply filters - close filter sheet
   */
  const handleApplyFilters = useCallback(() => {
    filterSheet.close();
  }, [filterSheet]);

  /**
   * Handle detail sheet expand - load full document
   */
  const handleDetailExpand = useCallback(() => {
    detailSheet.expand();
  }, [detailSheet]);

  /**
   * Handle detail sheet collapse
   */
  const handleDetailCollapse = useCallback(() => {
    detailSheet.collapse();
  }, [detailSheet]);

  /**
   * Handle view full document
   * Loads the document and potentially navigates or expands
   */
  const handleViewFull = useCallback(
    async (entry: CatalogEntry) => {
      await onLoadDocument(entry.path);
      // Could navigate to full document view here
      // For now, just expand the sheet
      detailSheet.expand();
    },
    [onLoadDocument, detailSheet]
  );

  /**
   * Handle detail sheet close
   * Returns focus to the originally tapped card after animation completes
   */
  const handleDetailClose = useCallback(() => {
    detailSheet.close();
    // Return focus and clear selection after animation completes
    setTimeout(() => {
      // Return focus to the card that opened the sheet
      if (lastFocusedCardRef.current) {
        lastFocusedCardRef.current.focus();
        lastFocusedCardRef.current = null;
      }
      setSelectedEntry(null);
    }, 300); // Match animation duration
  }, [detailSheet]);

  /**
   * Handle filter sheet open from header or FAB
   */
  const handleFilterClick = useCallback(() => {
    filterSheet.open();
  }, [filterSheet]);

  // Determine if any filters are active (excluding text search which is in header)
  const hasNonTextFilters = activeFilterCount > 0;

  return (
    <div
      className="mobile-viewer-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--mobile-surface-primary)',
        paddingTop: safeArea.top,
        paddingBottom: safeArea.bottom,
        paddingLeft: safeArea.left,
        paddingRight: safeArea.right,
      }}
      data-testid="mobile-viewer-container"
    >
      {/* Header */}
      <MobileViewerHeader
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        currentSort={sort}
        onSort={handleSort}
        activeFilterCount={activeFilterCount}
        onFilterClick={handleFilterClick}
        onRefresh={onRefresh}
        isRefreshing={loading}
      />

      {/* Main Content */}
      {loading ? (
        <MobileLoadingSkeleton />
      ) : entries.length === 0 ? (
        <MobileEmptyState
          hasFilters={hasNonTextFilters || searchValue.trim() !== ''}
          onClearFilters={onClearFilters}
        />
      ) : (
        <MobileDocList
          entries={entries}
          groupedEntries={groupedCatalog}
          isGrouped={isGrouped}
          onCardTap={handleCardTap}
          selectedEntry={selectedEntry}
          isLoading={false}
          emptyMessage="No documents match your filters"
        />
      )}

      {/* Filter FAB */}
      <MobileFilterFab
        ref={fabRef}
        activeCount={activeFilterCount}
        onClick={handleFilterClick}
        isHidden={filterSheet.isOpen || detailSheet.isOpen}
      />

      {/* Filter Sheet (Portal) */}
      <MobileFilterSheet
        isOpen={filterSheet.isOpen}
        onClose={filterSheet.close}
        filterState={filterState}
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
        onClearAll={onClearFilters}
        onApply={handleApplyFilters}
        activeFilterCount={activeFilterCount}
        triggerRef={fabRef}
      />

      {/* Detail Sheet (Portal) */}
      <MobileDetailSheet
        isOpen={detailSheet.isOpen}
        isExpanded={detailSheet.isExpanded}
        entry={selectedEntry}
        onClose={handleDetailClose}
        onExpand={handleDetailExpand}
        onCollapse={handleDetailCollapse}
        onViewFull={handleViewFull}
        triggerRef={lastFocusedCardRef}
      />

      {/* Screen reader live region for filter count updates */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {activeFilterCount > 0
          ? `${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active, ${entries.length} document${entries.length === 1 ? '' : 's'} shown`
          : `${entries.length} document${entries.length === 1 ? '' : 's'} shown`}
      </div>
    </div>
  );
}

export default MobileViewerContainer;
