/**
 * MobileSearchBar Component
 *
 * Standalone search input component with clear button for mobile interfaces.
 * Can be used in the header or embedded in the filter sheet.
 * Provides accessible search functionality with proper ARIA attributes.
 */

import React, { useState, useCallback } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './mobile-viewer.css';

export interface MobileSearchBarProps {
  /** Current search value (controlled) */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when clear button is pressed */
  onClear: () => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS class names */
  className?: string;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
}

/**
 * Search icon SVG component - magnifying glass
 */
function SearchIcon() {
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
 * Clear icon SVG component - X mark
 */
function ClearIcon() {
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
 * MobileSearchBar - Search input with clear functionality
 *
 * Features:
 * - Full-width search input with padding
 * - Search icon on the left
 * - Clear button (X) on the right when value is non-empty
 * - 44px+ touch target for clear button
 * - Focus visible outline (3px+ ring)
 * - Respects reduced-motion preference
 * - Proper ARIA labeling for accessibility
 */
export function MobileSearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search documents...',
  className = '',
  autoFocus = false,
}: MobileSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { prefersReducedMotion } = useReducedMotion();

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

  // Build class names
  const containerClasses = [
    'mobile-search-bar',
    isFocused && 'mobile-search-bar--focused',
    prefersReducedMotion && 'mobile-search-bar--reduced-motion',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasValue = value.length > 0;

  return (
    <div className={containerClasses} data-testid="mobile-search-bar">
      <span className="mobile-search-bar__icon mobile-search-bar__icon--search">
        <SearchIcon />
      </span>
      <input
        type="text"
        role="searchbox"
        className="mobile-search-bar__input"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label="Search documents"
        autoFocus={autoFocus}
      />
      {hasValue && (
        <button
          type="button"
          className="mobile-search-bar__icon mobile-search-bar__icon--clear"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  );
}

export default MobileSearchBar;
