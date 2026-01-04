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
 * - Drag-to-dismiss gesture support
 * - Scrim/backdrop with tap-to-dismiss
 * - Focus trapping and body scroll locking
 * - Portal rendering to document.body
 * - Safe area insets via useSafeArea hook
 * - Reduced motion support (respects prefers-reduced-motion)
 * - WCAG 2.1 AA compliant
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FilterState, FilterOptions } from '@core/catalog';
import { trapFocus, lockBodyScroll, unlockBodyScroll } from './utils/focusUtils';
import {
  calculateDragDistance,
  shouldDismiss,
  clampDragDistance,
  DEFAULT_MAX_DRAG_DISTANCE,
} from './utils/gestureUtils';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSafeArea } from '../hooks/useSafeArea';
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
  /** Element to return focus to when sheet closes */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Sentinel value for "All Projects" option
 * (empty string not suitable for select value)
 */
const ALL_PROJECTS_VALUE = '__all__';

/**
 * Dismiss threshold in pixels - drag must exceed this to close
 */
const DISMISS_THRESHOLD = 100;

/**
 * Safe zone in pixels - initial drag within this zone won't trigger dismiss
 * This allows scrolling to take priority
 */
const SAFE_ZONE_PX = 20;

/**
 * Ease factor for visual feedback (0.7 = 70% of actual drag distance)
 */
const DRAG_EASE_FACTOR = 0.7;

/**
 * Velocity threshold for fast swipe dismiss (px/ms)
 */
const VELOCITY_THRESHOLD = 0.5;

/**
 * State for drag gesture tracking
 */
interface DragState {
  isDragging: boolean;
  startY: number;
  currentY: number;
  startTime: number;
  scrolledUp: boolean;
  inSafeZone: boolean;
}

/**
 * Initial drag state
 */
const initialDragState: DragState = {
  isDragging: false,
  startY: 0,
  currentY: 0,
  startTime: 0,
  scrolledUp: false,
  inSafeZone: true,
};

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
 * - Focus trapped within sheet when open (Tab cycles within)
 * - Body scroll locked when open
 * - Escape key closes sheet
 * - Focus returns to trigger element on close
 * - 48px minimum touch targets
 * - Respects prefers-reduced-motion setting
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
  triggerRef,
}: MobileFilterSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const [translateY, setTranslateY] = useState(0);
  const [isSnappingBack, setIsSnappingBack] = useState(false);

  // Store previous active element for focus restoration
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Check for reduced motion preference
  const { prefersReducedMotion } = useReducedMotion();

  // Get safe area insets for proper padding
  const safeArea = useSafeArea();

  // Store previous focus element when sheet opens
  useEffect(() => {
    if (isOpen) {
      // Store current focus or use trigger ref
      previousFocusRef.current = triggerRef?.current || (document.activeElement as HTMLElement);
    }
  }, [isOpen, triggerRef]);

  // Restore focus when sheet closes
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll and manage focus when sheet opens/closes
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Focus first focusable element when sheet opens
      if (sheetRef.current) {
        const firstFocusable = sheetRef.current.querySelector<HTMLElement>('button, select, input');
        firstFocusable?.focus();
      }
      // Reset drag state when opening
      setDragState(initialDragState);
      setTranslateY(0);
      setIsSnappingBack(false);
    } else {
      unlockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Handle keyboard navigation: focus trapping and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key to close sheet
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === 'Tab' && sheetRef.current) {
        trapFocus(sheetRef.current, event);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle keyboard navigation for focus trapping (React event backup)
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (sheetRef.current) {
      trapFocus(sheetRef.current, event.nativeEvent);
    }
  }, []);

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
        onFilterChange(
          key,
          currentValues.filter((v) => v !== value)
        );
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

  /**
   * Handle touch start on sheet
   */
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    // Check if content is scrolled - if user scrolled up first, don't allow dismiss
    const content = contentRef.current;
    const scrolledUp = content ? content.scrollTop > 0 : false;

    setDragState({
      isDragging: true,
      startY: touch.clientY,
      currentY: touch.clientY,
      startTime: Date.now(),
      scrolledUp,
      inSafeZone: true,
    });
  }, []);

  /**
   * Handle touch move on sheet
   */
  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!dragState.isDragging) return;

      const touch = event.touches[0];
      if (!touch) return;

      const distance = calculateDragDistance(dragState.startY, touch.clientY);

      // Check if we're still in the safe zone
      const stillInSafeZone = Math.abs(distance) < SAFE_ZONE_PX;

      // If user scrolled up first and is trying to drag down, don't allow dismiss
      // This prevents interference with scrolling inside the sheet
      if (dragState.scrolledUp && distance > 0) {
        return;
      }

      // If dragging upward (negative), don't allow (no-op if user scrolls up first)
      if (distance < 0) {
        setDragState((prev) => ({
          ...prev,
          scrolledUp: true,
          currentY: touch.clientY,
        }));
        return;
      }

      // Update drag state
      setDragState((prev) => ({
        ...prev,
        currentY: touch.clientY,
        inSafeZone: stillInSafeZone,
      }));

      // Apply visual feedback with ease factor if outside safe zone
      // For reduced motion, still track the drag but with instant visual feedback
      if (!stillInSafeZone && distance > 0) {
        const easedDistance = distance * DRAG_EASE_FACTOR;
        const clampedDistance = clampDragDistance(easedDistance, DEFAULT_MAX_DRAG_DISTANCE);
        setTranslateY(clampedDistance);
      }
    },
    [dragState.isDragging, dragState.startY, dragState.scrolledUp]
  );

  /**
   * Handle touch end on sheet
   */
  const handleTouchEnd = useCallback(() => {
    if (!dragState.isDragging) return;

    const distance = calculateDragDistance(dragState.startY, dragState.currentY);
    const elapsed = Date.now() - dragState.startTime;
    const velocity = elapsed > 0 ? distance / elapsed : 0;

    // Check if should dismiss:
    // 1. Distance exceeds threshold, OR
    // 2. Fast swipe velocity (even if distance is less)
    const shouldDismissSheet =
      (shouldDismiss(distance, DISMISS_THRESHOLD) || velocity > VELOCITY_THRESHOLD) &&
      !dragState.scrolledUp &&
      !dragState.inSafeZone;

    if (shouldDismissSheet) {
      // Dismiss the sheet
      onClose();
    } else if (translateY > 0) {
      // Snap back - instant for reduced motion, animated otherwise
      if (!prefersReducedMotion) {
        setIsSnappingBack(true);
      }
      setTranslateY(0);
      // Reset snap back state after animation completes (skip timeout for reduced motion)
      if (!prefersReducedMotion) {
        setTimeout(() => {
          setIsSnappingBack(false);
        }, 250); // Match CSS animation duration
      }
    }

    // Reset drag state
    setDragState(initialDragState);
  }, [dragState, translateY, onClose, prefersReducedMotion]);

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  // Calculate transform style for drag feedback
  // For reduced motion: no transition animation, just instant position updates
  // Include safe area insets for side padding (landscape mode with notches)
  const getSheetStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      // Apply side insets for landscape mode with notches
      paddingLeft: safeArea.left > 0 ? `${safeArea.left}px` : undefined,
      paddingRight: safeArea.right > 0 ? `${safeArea.right}px` : undefined,
      // Bottom inset for home indicator
      paddingBottom: safeArea.bottom > 0 ? `${safeArea.bottom}px` : undefined,
    };

    if (translateY > 0) {
      return {
        ...baseStyle,
        transform: `translateY(${translateY}px)`,
        transition: prefersReducedMotion
          ? 'none'
          : isSnappingBack
            ? 'transform var(--mobile-animation-close) var(--mobile-ease-out)'
            : 'none',
      };
    }
    if (isSnappingBack && !prefersReducedMotion) {
      return {
        ...baseStyle,
        transform: 'translateY(0)',
        transition: 'transform var(--mobile-animation-close) var(--mobile-ease-out)',
      };
    }
    return baseStyle;
  };

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
        className={`mobile-filter-sheet ${dragState.isDragging ? 'mobile-filter-sheet--dragging' : ''}`}
        style={getSheetStyle()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-sheet-title"
        onKeyDown={handleKeyDown}
      >
        {/* Drag Handle - touch handlers here only, not on entire sheet */}
        <div
          className="mobile-filter-sheet__handle"
          aria-hidden="true"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
        <div ref={contentRef} className="mobile-filter-sheet__content">
          {/* Project Filter (Single Select) */}
          <div className="mobile-filter-sheet__section">
            <label htmlFor="filter-project" className="mobile-filter-sheet__label">
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
                <label key={type} className="mobile-filter-sheet__checkbox-item">
                  <input
                    type="checkbox"
                    checked={filterState.types.includes(type)}
                    onChange={() => handleMultiSelectToggle('types', type)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">{type}</span>
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
                <label key={domain} className="mobile-filter-sheet__checkbox-item">
                  <input
                    type="checkbox"
                    checked={filterState.domains.includes(domain)}
                    onChange={() => handleMultiSelectToggle('domains', domain)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">{domain}</span>
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
                <label key={priority} className="mobile-filter-sheet__checkbox-item">
                  <input
                    type="checkbox"
                    checked={filterState.priorities.includes(priority)}
                    onChange={() => handleMultiSelectToggle('priorities', priority)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">{priority}</span>
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
                <label key={status} className="mobile-filter-sheet__checkbox-item">
                  <input
                    type="checkbox"
                    checked={filterState.statuses.includes(status)}
                    onChange={() => handleMultiSelectToggle('statuses', status)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">{status}</span>
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
                <label key={tag} className="mobile-filter-sheet__checkbox-item">
                  <input
                    type="checkbox"
                    checked={filterState.tags.includes(tag)}
                    onChange={() => handleMultiSelectToggle('tags', tag)}
                    className="mobile-filter-sheet__checkbox"
                  />
                  <span className="mobile-filter-sheet__checkbox-label">{tag}</span>
                </label>
              ))}
              {filterOptions.tags.length === 0 && (
                <span className="mobile-filter-sheet__empty">No tags available</span>
              )}
            </div>
          </div>

          {/* Search Text Input */}
          <div className="mobile-filter-sheet__section">
            <label htmlFor="filter-search" className="mobile-filter-sheet__label">
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
              activeFilterCount > 0 ? `Apply ${activeFilterCount} active filters` : 'Apply filters'
            }
          >
            <span>Apply Filters</span>
            {activeFilterCount > 0 && (
              <span className="mobile-filter-sheet__badge">{activeFilterCount}</span>
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
