/**
 * ItemCountIndicator Component
 *
 * Displays total item count with a tooltip showing status breakdown.
 * Uses glass morphism styling matching existing viewer badges.
 *
 * @module @ui/viewer/components
 */

import React, { useMemo } from 'react';
import { Tooltip } from '@ui/shared/Tooltip';
import { aggregateStatusCounts } from '../utils/indicators';
import type { RequestLogItem } from '@core/models';

/**
 * Props for ItemCountIndicator component
 */
export interface ItemCountIndicatorProps {
  /** Array of items to count and aggregate */
  items: RequestLogItem[];
  /** Size variant for the indicator */
  size?: 'sm' | 'md';
}

/**
 * Status display order for tooltip breakdown.
 * Ordered by workflow progression: done first (completed), then active, then pending.
 */
const STATUS_ORDER = ['done', 'in-progress', 'planned', 'backlog', 'triage', 'wontfix'] as const;

/**
 * Human-readable labels for status values
 */
const STATUS_LABELS: Record<string, string> = {
  done: 'done',
  'in-progress': 'in-progress',
  planned: 'planned',
  backlog: 'backlog',
  triage: 'triage',
  wontfix: 'wontfix',
};

/**
 * Formats status breakdown into human-readable tooltip text.
 * Only includes statuses with count > 0, ordered by STATUS_ORDER.
 *
 * @param counts - Record of status to count mappings
 * @returns Formatted string like "2 done, 1 in-progress, 2 backlog"
 */
function formatStatusBreakdown(counts: Record<string, number>): string {
  const parts: string[] = [];

  for (const status of STATUS_ORDER) {
    const count = counts[status];
    if (count && count > 0) {
      const label = STATUS_LABELS[status] ?? status;
      parts.push(`${count} ${label}`);
    }
  }

  // Include any statuses not in STATUS_ORDER (custom statuses)
  for (const [status, count] of Object.entries(counts)) {
    if (count > 0 && !STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number])) {
      parts.push(`${count} ${status}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'No items';
}

/**
 * ItemCountIndicator displays a badge with total item count
 * and a tooltip showing the breakdown by status.
 * Keyboard accessible via tabindex for tooltip access.
 *
 * @example
 * ```tsx
 * import { ItemCountIndicator } from '@ui/viewer/components';
 *
 * function DocumentRow({ items }) {
 *   return (
 *     <div>
 *       <ItemCountIndicator items={items} size="sm" />
 *     </div>
 *   );
 * }
 * ```
 */
export const ItemCountIndicator = React.memo(function ItemCountIndicator({
  items,
  size = 'sm',
}: ItemCountIndicatorProps): React.JSX.Element {
  // Memoize aggregation to avoid recalculating on every render
  const statusCounts = useMemo(() => aggregateStatusCounts(items), [items]);

  // Memoize tooltip content
  const tooltipContent = useMemo(() => formatStatusBreakdown(statusCounts), [statusCounts]);

  const totalCount = items.length;
  const itemLabel = totalCount === 1 ? 'item' : 'items';

  // Build CSS class based on size
  const sizeClass = size === 'md' ? 'item-count-indicator--md' : '';

  return (
    <Tooltip content={tooltipContent} position="top">
      <span
        className={`item-count-indicator ${sizeClass}`.trim()}
        aria-label={`${totalCount} ${itemLabel}: ${tooltipContent}`}
        tabIndex={0}
      >
        {totalCount} {itemLabel}
      </span>
    </Tooltip>
  );
});

export default ItemCountIndicator;
