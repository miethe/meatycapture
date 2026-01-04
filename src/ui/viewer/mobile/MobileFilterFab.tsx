/**
 * MobileFilterFab Component
 *
 * Floating action button (FAB) for opening the filter sheet on mobile.
 * Displays a badge with the count of active filters and provides
 * accessible touch interaction with visual feedback.
 *
 * Respects prefers-reduced-motion accessibility setting.
 * Respects safe area insets for notched devices.
 */

import type { CSSProperties } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSafeArea } from '../hooks/useSafeArea';
import './mobile-viewer.css';

export interface MobileFilterFabProps {
  /** Number of currently active filters */
  activeCount: number;
  /** Callback when FAB is pressed */
  onClick: () => void;
  /** Whether the FAB should be hidden (e.g., when filter sheet is open) */
  isHidden?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Filter icon SVG component - funnel shape
 */
function FilterIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

/**
 * MobileFilterFab - Floating action button for filter access
 *
 * Features:
 * - 56x56px circular button positioned bottom-right
 * - Badge showing active filter count (hidden when 0)
 * - Pop animation on badge count change (disabled for reduced motion)
 * - Touch feedback with scale transform (0.95) and opacity (0.9) (disabled for reduced motion)
 * - Safe area inset support via useSafeArea hook
 * - Accessible with dynamic ARIA label
 * - Keyboard focus states for accessibility
 * - Respects prefers-reduced-motion setting
 * - Supports ref forwarding for focus management
 */
export const MobileFilterFab = forwardRef<HTMLButtonElement, MobileFilterFabProps>(
  function MobileFilterFab({ activeCount, onClick, isHidden = false, className = '' }, ref) {
    const badgeRef = useRef<HTMLSpanElement>(null);
    const prevCountRef = useRef(activeCount);
    const [isPressed, setIsPressed] = useState(false);

    // Check for reduced motion preference
    const { prefersReducedMotion } = useReducedMotion();

    // Get safe area insets for proper bottom positioning
    const safeArea = useSafeArea();

    // Trigger badge pop animation when count changes (skip for reduced motion)
    useEffect(() => {
      if (
        !prefersReducedMotion &&
        activeCount !== prevCountRef.current &&
        activeCount > 0 &&
        badgeRef.current
      ) {
        // Remove animation class first to reset
        badgeRef.current.style.animation = 'none';
        // Force reflow
        void badgeRef.current.offsetHeight;
        // Re-apply animation
        badgeRef.current.style.animation = '';
      }
      prevCountRef.current = activeCount;
    }, [activeCount, prefersReducedMotion]);

    /**
     * Handle touch start - apply pressed state
     * Only applies visual feedback if not hidden (sheet not open) and reduced motion not preferred
     */
    const handleTouchStart = useCallback(() => {
      if (!isHidden && !prefersReducedMotion) {
        setIsPressed(true);
      }
    }, [isHidden, prefersReducedMotion]);

    /**
     * Handle touch end - remove pressed state
     */
    const handleTouchEnd = useCallback(() => {
      setIsPressed(false);
    }, []);

    /**
     * Handle touch cancel - remove pressed state
     * Ensures pressed state is cleared if touch is interrupted
     */
    const handleTouchCancel = useCallback(() => {
      setIsPressed(false);
    }, []);

    /**
     * Handle mouse down for desktop testing
     * Provides same feedback as touch for consistency
     */
    const handleMouseDown = useCallback(() => {
      if (!isHidden && !prefersReducedMotion) {
        setIsPressed(true);
      }
    }, [isHidden, prefersReducedMotion]);

    /**
     * Handle mouse up - remove pressed state
     */
    const handleMouseUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    /**
     * Handle mouse leave - remove pressed state if mouse leaves while pressed
     */
    const handleMouseLeave = useCallback(() => {
      setIsPressed(false);
    }, []);

    // Build aria-label based on active count
    const ariaLabel = activeCount > 0 ? `Open filters, ${activeCount} active` : 'Open filters';

    // Build class names - don't apply pressed class for reduced motion (CSS handles it)
    const fabClasses = [
      'mobile-filter-fab',
      isHidden && 'mobile-filter-fab--hidden',
      !prefersReducedMotion && isPressed && 'mobile-filter-fab--pressed',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Badge style - no animation for reduced motion
    const badgeStyle: CSSProperties = prefersReducedMotion ? { animation: 'none' } : {};

    // Calculate FAB position with safe area bottom inset
    // Base spacing (16px from CSS var --mobile-spacing-md) + safe area bottom inset
    const fabStyle: CSSProperties = {
      bottom: `calc(var(--mobile-spacing-md) + ${safeArea.bottom}px)`,
    };

    return (
      <button
        ref={ref}
        type="button"
        className={fabClasses}
        style={fabStyle}
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        aria-label={ariaLabel}
        data-testid="mobile-filter-fab"
      >
        <FilterIcon />
        {activeCount > 0 && (
          <span
            ref={badgeRef}
            className="mobile-filter-fab__badge"
            style={badgeStyle}
            aria-hidden="true"
          >
            {activeCount}
          </span>
        )}
      </button>
    );
  }
);

export default MobileFilterFab;
