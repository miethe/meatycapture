/**
 * MobileFilterSheet Component
 *
 * Bottom sheet modal for mobile filter controls.
 * Slides up from bottom and covers most of the screen.
 *
 * Features:
 * - All 7 filter types in full-width layout
 * - Clear All and Apply Filters actions
 * - Drag handle for visual affordance
 * - Scrim/backdrop with tap-to-dismiss
 * - Focus trapping and body scroll locking
 * - Portal rendering to document.body
 * - WCAG 2.1 AA compliant
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { FilterState, FilterOptions } from '@core/catalog';
import { trapFocus, lockBodyScroll, unlockBodyScroll } from './utils/focusUtils';
import './mobile-viewer.css';

/**
 * Props for MobileFilterSheet component
 */
export interface MobileFilterSheetProps {
  /** Whether the sheet is currently open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** Current filter state */
  filterState: FilterState;
  /** Available filter options from catalog */
  filterOptions: FilterOptions;
  /** Called when a filter value changes */
  onFilterChange: (key: keyof FilterState, value: unknown) => void;
  /** Called when user clears all filters */
  onClearAll: () => void;
  /** Called when user applies filters */
  onApply: () => void;
  /** Number of currently active filters */
  activeFilterCount: number;
}

/**
 * Sentinel value for "All Projects" option
 * (empty string not suitable for select value)
 */
const ALL_PROJECTS_VALUE = '__all__';

/**
 * MobileFilterSheet
 *
 * Full-screen bottom sheet containing all filter controls for mobile.
 * Rendered via portal to document.body for proper z-index stacking.
 *
 * Layout:
 * - Drag handle at top (visual affordance)
 * - Header with title and Clear All button
 * - Scrollable content with all filter sections
 * - Fixed footer with Apply button and active count badge
 *
 * Accessibility:
 * - role="dialog" and aria-modal="true"
 * - Focus trapped within sheet when open
 * - Body scroll locked when open
 * - Escape key closes sheet (handled by parent)
 * - 48px minimum touch targets
 *
 * @param props - MobileFilterSheetProps
 */
export function MobileFilterSheet({
  isOpen,
  onClose,
  filterState,
  filterOptions,
  onFilterChange,
  onClearAll,
  onApply,
  activeFilterCount,
}: MobileFilterSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll and manage focus when sheet opens/closes
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Focus first focusable element when sheet opens
      if (sheetRef.current) {
        const firstFocusable = sheetRef.current.querySelector<HTMLElement>(
          'button, select, input'
        );
        firstFocusable?.focus();
      }
    } else {
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Handle keyboard navigation for focus trapping
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (sheetRef.current) {
        trapFocus(sheetRef.current, event.nativeEvent);
      }
    },
    []
  );

  // Handle project selection
  const handleProjectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onFilterChange('project_id', value === ALL_PROJECTS_VALUE ? undefined : value);
    },
    [onFilterChange]
  );

  // Handle multi-select checkbox toggle
  const handleMultiSelectToggle = useCallback(
    (key: 'types' | 'domains' | 'priorities' | 'statuses' | 'tags', value: string) => {
      const currentValues = filterState[key];
      if (currentValues.includes(value)) {
        onFilterChange(key, currentValues.filter((v) => v !== value));
      } else {
        onFilterChange(key, [...currentValues, value]);
      }
    },
    [filterState, onFilterChange]
  );

  // Handle text search input
  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange('text', event.target.value);
    },
    [onFilterChange]
  );

  // Handle scrim click (close sheet)
  const handleScrimClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  const sheetContent = (
    <>
      {/* Scrim/Backdrop */}
      <div
        className="mobile-scrim mobile-scrim--visible"
        onClick={handleScrimClick}
        aria-hidden="true"
      />

      {/* Filter Sheet */}
      <div
        ref={sheetRef}
        className="mobile-filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        onKeyDown={handleKeyDown}
      >
        {/* Drag Handle */}
        <div className="mobile-filter-sheet__handle" aria-hidden="true">
          <div className="mobile-filter-sheet__handle-bar" />
        </div>

        {/* Header */}
        <div className="mobile-filter-sheet__header">
          <h2 id="filter-sheet-title" className="mobile-filter-sheet__title">
            Filters
          </h2>
          <button
            type="button"
            className="mobile-filter-sheet__clear-btn"
            onClick={onClearAll}
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mobile-filter-sheet__content">
          {/* Project Filter (Single Select) */}
          <div className="mobile-filter-sheet__section">
            <label
              htmlFor="filter-project"
              className="mobile-filter-sheet__label"
            >
              Project
            </label>
            <select
              id="filter-project"
              className="mobile-filter-sheet__select"
              value={filterState.project_id ?? ALL_PROJECTS_VALUE}
              onChange={handleProjectChange}
            >
              <option value={ALL_PROJECTS_VALUE}>All Projects</option>
              {filterOptions.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Types Filter (Multi-Select) */}
          <div className="mobile-filter-sheet__section">
            <span className="mobile-filter-sheet__label">Types</span>
            <div
              className="mobile-filter-sheet__checkbox-group"
              role="group"
              aria-label="Type filters"
            >
              {filterOptions.types.map((type) => (
                <label
                  key={type}
                  className="mobile-filter-sheet__checkbox-item"
                >
                  <input
                    type="checkbox"
                    checked={filterState.types.includes(type)}
                    onChange={() => handleMultiSelectToggle('types', type)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">
                    {type}
                  </span>
                </label>
              ))}
              {filterOptions.types.length === 0 && (
                <span className="mobile-filter-sheet__empty">No types available</span>
              )}
            </div>
          </div>

          {/* Domains Filter (Multi-Select) */}
          <div className="mobile-filter-sheet__section">
            <span className="mobile-filter-sheet__label">Domains</span>
            <div
              className="mobile-filter-sheet__checkbox-group"
              role="group"
              aria-label="Domain filters"
            >
              {filterOptions.domains.map((domain) => (
                <label
                  key={domain}
                  className="mobile-filter-sheet__checkbox-item"
                >
                  <input
                    type="checkbox"
                    checked={filterState.domains.includes(domain)}
                    onChange={() => handleMultiSelectToggle('domains', domain)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">
                    {domain}
                  </span>
                </label>
              ))}
              {filterOptions.domains.length === 0 && (
                <span className="mobile-filter-sheet__empty">No domains available</span>
              )}
            </div>
          </div>

          {/* Priorities Filter (Multi-Select) */}
          <div className="mobile-filter-sheet__section">
            <span className="mobile-filter-sheet__label">Priorities</span>
            <div
              className="mobile-filter-sheet__checkbox-group"
              role="group"
              aria-label="Priority filters"
            >
              {filterOptions.priorities.map((priority) => (
                <label
                  key={priority}
                  className="mobile-filter-sheet__checkbox-item"
                >
                  <input
                    type="checkbox"
                    checked={filterState.priorities.includes(priority)}
                    onChange={() => handleMultiSelectToggle('priorities', priority)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">
                    {priority}
                  </span>
                </label>
              ))}
              {filterOptions.priorities.length === 0 && (
                <span className="mobile-filter-sheet__empty">No priorities available</span>
              )}
            </div>
          </div>

          {/* Statuses Filter (Multi-Select) */}
          <div className="mobile-filter-sheet__section">
            <span className="mobile-filter-sheet__label">Statuses</span>
            <div
              className="mobile-filter-sheet__checkbox-group"
              role="group"
              aria-label="Status filters"
            >
              {filterOptions.statuses.map((status) => (
                <label
                  key={status}
                  className="mobile-filter-sheet__checkbox-item"
                >
                  <input
                    type="checkbox"
                    checked={filterState.statuses.includes(status)}
                    onChange={() => handleMultiSelectToggle('statuses', status)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">
                    {status}
                  </span>
                </label>
              ))}
              {filterOptions.statuses.length === 0 && (
                <span className="mobile-filter-sheet__empty">No statuses available</span>
              )}
            </div>
          </div>

          {/* Tags Filter (Multi-Select) */}
          <div className="mobile-filter-sheet__section">
            <span className="mobile-filter-sheet__label">Tags</span>
            <div
              className="mobile-filter-sheet__checkbox-group"
              role="group"
              aria-label="Tag filters"
            >
              {filterOptions.tags.map((tag) => (
                <label
                  key={tag}
                  className="mobile-filter-sheet__checkbox-item"
                >
                  <input
                    type="checkbox"
                    checked={filterState.tags.includes(tag)}
                    onChange={() => handleMultiSelectToggle('tags', tag)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">
                    {tag}
                  </span>
                </label>
              ))}
              {filterOptions.tags.length === 0 && (
                <span className="mobile-filter-sheet__empty">No tags available</span>
              )}
            </div>
          </div>

          {/* Search Text Input */}
          <div className="mobile-filter-sheet__section">
            <label
              htmlFor="filter-search"
              className="mobile-filter-sheet__label"
            >
              Search
            </label>
            <input
              id="filter-search"
              type="search"
              className="mobile-filter-sheet__input"
              value={filterState.text}
              onChange={handleTextChange}
              placeholder="Search documents..."
              aria-label="Search text filter"
            />
          </div>
        </div>

        {/* Actions Footer */}
        <div className="mobile-filter-sheet__actions">
          <button
            type="button"
            className="mobile-filter-sheet__apply-btn"
            onClick={onApply}
            aria-label={
              activeFilterCount > 0
                ? `Apply ${activeFilterCount} active filters`
                : 'Apply filters'
            }
          >
            <span>Apply Filters</span>
            {activeFilterCount > 0 && (
              <span className="mobile-filter-sheet__badge">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );

  // Render via portal to document.body
  return createPortal(sheetContent, document.body);
}

export default MobileFilterSheet;
