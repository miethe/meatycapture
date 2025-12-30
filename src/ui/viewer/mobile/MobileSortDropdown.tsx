/**
 * MobileSortDropdown Component
 *
 * Dropdown menu for sorting documents in the mobile viewer header.
 * Appears as an icon button that opens a menu with sort options.
 *
 * Features:
 * - Touch-friendly 48px+ targets
 * - Direction toggle on re-click same option
 * - Current sort indicated with checkmark
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Outside click to close
 * - ARIA attributes for accessibility
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { SortField, SortOrder, CatalogSort } from '@core/catalog/types';
import './mobile-viewer.css';

export interface MobileSortDropdownProps {
  /** Current sort configuration */
  currentSort: CatalogSort;
  /** Called when sort changes */
  onSort: (field: SortField, order: SortOrder) => void;
  /** Optional additional CSS class */
  className?: string;
}

/** Sort option configuration */
interface SortOption {
  field: SortField;
  label: string;
}

/** Available sort options with labels */
const SORT_OPTIONS: SortOption[] = [
  { field: 'updated_at', label: 'Date Modified' },
  { field: 'item_count', label: 'Item Count' },
  { field: 'doc_id', label: 'Document ID' },
  { field: 'title', label: 'Title' },
];

/**
 * Sort icon SVG component
 */
function SortIcon(): React.JSX.Element {
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
      <path d="M3 6h18M6 12h12M9 18h6" />
    </svg>
  );
}

/**
 * Checkmark icon SVG component
 */
function CheckmarkIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Arrow indicator for sort direction
 */
function DirectionIndicator({ order }: { order: SortOrder }): React.JSX.Element {
  return (
    <span
      className="mobile-sort-dropdown__direction"
      aria-label={order === 'asc' ? 'ascending' : 'descending'}
    >
      {order === 'asc' ? '\u2191' : '\u2193'}
    </span>
  );
}

/**
 * MobileSortDropdown
 *
 * Icon button dropdown for sorting documents in mobile view.
 * Clicking the same option toggles between ascending and descending.
 *
 * @param props - MobileSortDropdownProps
 */
export function MobileSortDropdown({
  currentSort,
  onSort,
  className = '',
}: MobileSortDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Focus first option when menu opens
  useEffect(() => {
    if (isOpen && optionRefs.current[0]) {
      // Find the current sort field index to focus it initially
      const currentIndex = SORT_OPTIONS.findIndex((opt) => opt.field === currentSort.field);
      const indexToFocus = currentIndex >= 0 ? currentIndex : 0;
      setFocusedIndex(indexToFocus);
      optionRefs.current[indexToFocus]?.focus();
    }
  }, [isOpen, currentSort.field]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleOptionSelect = useCallback(
    (field: SortField) => {
      // If same field is selected, toggle the order
      if (field === currentSort.field) {
        const newOrder: SortOrder = currentSort.order === 'asc' ? 'desc' : 'asc';
        onSort(field, newOrder);
      } else {
        // New field selected, use descending by default (most recent/highest first)
        onSort(field, 'desc');
      }
      setIsOpen(false);
      setFocusedIndex(-1);
    },
    [currentSort, onSort]
  );

  const handleTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          handleToggle();
          break;
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          }
          break;
      }
    },
    [handleToggle, isOpen]
  );

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev < SORT_OPTIONS.length - 1 ? prev + 1 : 0;
            optionRefs.current[nextIndex]?.focus();
            return nextIndex;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const nextIndex = prev > 0 ? prev - 1 : SORT_OPTIONS.length - 1;
            optionRefs.current[nextIndex]?.focus();
            return nextIndex;
          });
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          optionRefs.current[0]?.focus();
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(SORT_OPTIONS.length - 1);
          optionRefs.current[SORT_OPTIONS.length - 1]?.focus();
          break;
      }
    },
    []
  );

  const handleOptionKeyDown = useCallback(
    (event: React.KeyboardEvent, field: SortField) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOptionSelect(field);
      }
    },
    [handleOptionSelect]
  );

  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.field === currentSort.field)?.label ?? '';

  return (
    <div
      className={`mobile-sort-dropdown ${className}`.trim()}
      ref={containerRef}
      data-testid="mobile-sort-dropdown"
    >
      <button
        type="button"
        className="mobile-sort-dropdown__trigger mobile-touch-target"
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Sort by ${currentSortLabel}, ${currentSort.order === 'asc' ? 'ascending' : 'descending'}. Press to change sort.`}
        data-testid="mobile-sort-dropdown-trigger"
      >
        <SortIcon />
      </button>

      {isOpen && (
        <div
          className="mobile-sort-dropdown__menu"
          ref={menuRef}
          role="menu"
          aria-label="Sort options"
          onKeyDown={handleMenuKeyDown}
          data-testid="mobile-sort-dropdown-menu"
        >
          {SORT_OPTIONS.map((option, index) => {
            const isSelected = currentSort.field === option.field;
            return (
              <button
                key={option.field}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                type="button"
                className={`mobile-sort-dropdown__option mobile-touch-target ${isSelected ? 'mobile-sort-dropdown__option--selected' : ''}`}
                role="menuitem"
                aria-checked={isSelected}
                onClick={() => handleOptionSelect(option.field)}
                onKeyDown={(e) => handleOptionKeyDown(e, option.field)}
                tabIndex={focusedIndex === index ? 0 : -1}
                data-testid={`mobile-sort-option-${option.field}`}
              >
                <span className="mobile-sort-dropdown__option-check">
                  {isSelected && <CheckmarkIcon />}
                </span>
                <span className="mobile-sort-dropdown__option-label">{option.label}</span>
                {isSelected && <DirectionIndicator order={currentSort.order} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MobileSortDropdown;
