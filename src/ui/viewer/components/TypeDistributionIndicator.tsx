/**
 * TypeDistributionIndicator Component
 *
 * Displays a compact horizontal row of type badges with counts,
 * showing the distribution of item types in a document.
 *
 * Features:
 * - Type icons with counts (e.g., "bug 2", "enhancement 3")
 * - Configurable max types with "+N more" overflow
 * - Tooltip with full breakdown
 * - Accessible with aria-label describing distribution and keyboard support
 * - Memoized for performance
 */

import React, { useMemo } from 'react';
import type { RequestLogItem } from '@core/models';
import { aggregateTypeCounts } from '../utils/indicators';
import { Tooltip } from '@ui/shared/Tooltip';

/**
 * Type icons mapping - simple SVG icons for each type
 */
const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  enhancement: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
    </svg>
  ),
  idea: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15h-4v-1h4v1zm1.31-4.5l-.99.69V14h-4.65v-.81l-.99-.69C7.81 11.77 7 10.45 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.45-.81 2.77-1.69 3.5z" />
    </svg>
  ),
  task: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  ),
  question: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
  ),
};

/**
 * Get the icon for a type, with fallback to a generic circle
 */
function getTypeIcon(type: string): React.ReactNode {
  return (
    TYPE_ICONS[type.toLowerCase()] || (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="6" />
      </svg>
    )
  );
}

/**
 * Get the CSS class for a type badge
 */
function getTypeBadgeClass(type: string): string {
  const normalizedType = type.toLowerCase();
  const knownTypes = ['bug', 'enhancement', 'idea', 'task', 'question'];
  if (knownTypes.includes(normalizedType)) {
    return `type-badge-mini type-badge-mini--${normalizedType}`;
  }
  return 'type-badge-mini';
}

export interface TypeDistributionIndicatorProps {
  /** Array of request log items to analyze */
  items: RequestLogItem[];
  /** Maximum types to show before "+N more" (default: 5) */
  maxTypes?: number;
}

/**
 * TypeDistributionIndicator Component
 *
 * Shows type badges with counts in a horizontal row.
 * Includes tooltip with full breakdown.
 * Keyboard accessible via tabindex for tooltip access.
 */
export const TypeDistributionIndicator = React.memo(function TypeDistributionIndicator({
  items,
  maxTypes = 5,
}: TypeDistributionIndicatorProps): React.JSX.Element | null {
  // Aggregate type counts
  const typeCounts = useMemo(() => aggregateTypeCounts(items), [items]);

  // Sort types by count (descending) and get entries
  const sortedEntries = useMemo(() => {
    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a);
  }, [typeCounts]);

  // Calculate visible and overflow
  const visibleEntries = sortedEntries.slice(0, maxTypes);
  const overflowCount = sortedEntries.length - maxTypes;

  // Generate tooltip content with full breakdown
  const tooltipContent = useMemo(() => {
    if (sortedEntries.length === 0) return 'No items';
    return sortedEntries
      .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
      .join(', ');
  }, [sortedEntries]);

  // Generate aria-label for accessibility
  const ariaLabel = useMemo(() => {
    if (sortedEntries.length === 0) return 'No type distribution data';
    const total = items.length;
    const typeCount = sortedEntries.length;
    return `Type distribution: ${total} item${total !== 1 ? 's' : ''} across ${typeCount} type${typeCount !== 1 ? 's' : ''}. ${tooltipContent}`;
  }, [sortedEntries, items.length, tooltipContent]);

  // Return null for empty items
  if (items.length === 0) {
    return null;
  }

  return (
    <Tooltip content={tooltipContent}>
      <div
        className="type-distribution-indicator"
        aria-label={ariaLabel}
        role="img"
        tabIndex={0}
      >
        {visibleEntries.map(([type, count]) => (
          <span
            key={type}
            className={getTypeBadgeClass(type)}
          >
            <span className="type-badge-mini-icon">
              {getTypeIcon(type)}
            </span>
            <span className="type-badge-mini-count" aria-hidden="true">
              {count}
            </span>
            <span className="visually-hidden">
              {count} {type}{count !== 1 ? 's' : ''}
            </span>
          </span>
        ))}
        {overflowCount > 0 && (
          <span className="type-badge-mini type-badge-mini--overflow">
            +{overflowCount} more
          </span>
        )}
      </div>
    </Tooltip>
  );
});

export default TypeDistributionIndicator;
