/**
 * MobileFilterFab Component
 *
 * Floating action button (FAB) for opening the filter sheet on mobile.
 * Displays a badge with the count of active filters and provides
 * accessible touch interaction with visual feedback.
 */

import { useEffect, useRef } from 'react';
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
 * - Pop animation on badge count change
 * - Touch feedback with scale transform
 * - Safe area inset support via CSS
 * - Accessible with dynamic ARIA label
 */
export function MobileFilterFab({
  activeCount,
  onClick,
  isHidden = false,
  className = '',
}: MobileFilterFabProps) {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevCountRef = useRef(activeCount);

  // Trigger badge pop animation when count changes
  useEffect(() => {
    if (activeCount !== prevCountRef.current && activeCount > 0 && badgeRef.current) {
      // Remove animation class first to reset
      badgeRef.current.style.animation = 'none';
      // Force reflow
      void badgeRef.current.offsetHeight;
      // Re-apply animation
      badgeRef.current.style.animation = '';
    }
    prevCountRef.current = activeCount;
  }, [activeCount]);

  // Build aria-label based on active count
  const ariaLabel = activeCount > 0
    ? `Open filters, ${activeCount} active`
    : 'Open filters';

  // Build class names
  const fabClasses = [
    'mobile-filter-fab',
    isHidden && 'mobile-filter-fab--hidden',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={fabClasses}
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid="mobile-filter-fab"
    >
      <FilterIcon />
      {activeCount > 0 && (
        <span
          ref={badgeRef}
          className="mobile-filter-fab__badge"
          aria-hidden="true"
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}

export default MobileFilterFab;
