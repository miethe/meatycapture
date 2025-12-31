/**
 * MobileViewerHeader Component
 *
 * Sticky header at the top of the mobile viewer containing:
 * - Title
 * - Search input with icon and clear button
 * - Refresh button with loading state
 * - Sort dropdown
 * - Filter badge showing active filter count
 *
 * Features:
 * - Glass morphism background with backdrop blur
 * - Respects safe area top inset (iPhone notch) via useSafeArea hook
 * - Touch-friendly targets (44px minimum)
 * - Proper focus management
 * - ARIA attributes for accessibility
 */

import React, { useRef, useCallback } from 'react';
import type { SortField, SortOrder, CatalogSort } from '@core/catalog/types';
import { MobileSortDropdown } from './MobileSortDropdown';
import { useSafeArea } from '../hooks/useSafeArea';
import './mobile-viewer.css';

export interface MobileViewerHeaderProps {
  /** Current search input value */
  searchValue: string;
  /** Called when search input changes */
  onSearchChange: (value: string) => void;
  /** Called when search is cleared */
  onSearchClear: () => void;
  /** Current sort configuration */
  currentSort: CatalogSort;
  /** Called when sort changes */
  onSort: (field: SortField, order: SortOrder) => void;
  /** Number of currently active filters */
  activeFilterCount: number;
  /** Called when filter badge/button is clicked */
  onFilterClick: () => void;
  /** Called when refresh button is clicked */
  onRefresh: () => void;
  /** Whether refresh is in progress */
  isRefreshing?: boolean;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * Search icon SVG component
 */
function SearchIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/**
 * Clear/close icon SVG component
 */
function ClearIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Refresh icon SVG component
 */
function RefreshIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
    </svg>
  );
}

/**
 * Filter icon SVG component
 */
function FilterIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

/**
 * MobileViewerHeader
 *
 * Sticky header component for the mobile viewer with search, sort,
 * filter, and refresh functionality.
 *
 * @param props - MobileViewerHeaderProps
 */
export function MobileViewerHeader({
  searchValue,
  onSearchChange,
  onSearchClear,
  currentSort,
  onSort,
  activeFilterCount,
  onFilterClick,
  onRefresh,
  isRefreshing = false,
  className = '',
}: MobileViewerHeaderProps): React.JSX.Element {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const safeArea = useSafeArea();

  const handleSearchInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
    },
    [onSearchChange]
  );

  const handleClearClick = useCallback(() => {
    onSearchClear();
    // Focus the input after clearing
    searchInputRef.current?.focus();
  }, [onSearchClear]);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape' && searchValue) {
        event.preventDefault();
        onSearchClear();
      }
    },
    [searchValue, onSearchClear]
  );

  // Apply safe area top inset via inline style
  // This ensures the header content is below the notch/status bar
  const headerStyle: React.CSSProperties = {
    paddingTop: safeArea.top > 0 ? `${safeArea.top}px` : undefined,
  };

  return (
    <header
      className={`mobile-viewer-header ${className}`.trim()}
      style={headerStyle}
      data-testid="mobile-viewer-header"
    >
      {/* Title row */}
      <div className="mobile-viewer-header__title-row">
        <h1 className="mobile-viewer-header__title">Request Log Viewer</h1>
        <div className="mobile-viewer-header__actions">
          {/* Refresh button */}
          <button
            type="button"
            className={`mobile-viewer-header__action-btn mobile-touch-target ${isRefreshing ? 'mobile-viewer-header__action-btn--refreshing' : ''}`}
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? 'Refreshing...' : 'Refresh documents'}
            data-testid="mobile-viewer-header-refresh"
          >
            <RefreshIcon />
          </button>

          {/* Sort dropdown */}
          <MobileSortDropdown
            currentSort={currentSort}
            onSort={onSort}
          />

          {/* Filter button with badge */}
          <button
            type="button"
            className="mobile-viewer-header__action-btn mobile-viewer-header__filter-btn mobile-touch-target"
            onClick={onFilterClick}
            aria-label={
              activeFilterCount > 0
                ? `Open filters. ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active.`
                : 'Open filters'
            }
            data-testid="mobile-viewer-header-filter"
          >
            <FilterIcon />
            {activeFilterCount > 0 && (
              <span
                className="mobile-viewer-header__filter-badge"
                aria-hidden="true"
                data-testid="mobile-viewer-header-filter-badge"
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search row */}
      <div className="mobile-viewer-header__search-row">
        <div className="mobile-viewer-header__search-container">
          <span className="mobile-viewer-header__search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            ref={searchInputRef}
            type="search"
            className="mobile-viewer-header__search-input"
            placeholder="Search documents..."
            value={searchValue}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search documents"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-testid="mobile-viewer-header-search"
          />
          {searchValue && (
            <button
              type="button"
              className="mobile-viewer-header__search-clear mobile-touch-target"
              onClick={handleClearClick}
              aria-label="Clear search"
              data-testid="mobile-viewer-header-search-clear"
            >
              <ClearIcon />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default MobileViewerHeader;
