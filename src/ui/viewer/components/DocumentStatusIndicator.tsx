/**
 * DocumentStatusIndicator Component
 *
 * Displays document completion status as "x/y done" text with color coding.
 * Shows a tooltip on hover with full status breakdown and visual progress bar.
 *
 * Features:
 * - "x/y done" display in a bordered container
 * - Color-coded: green (100%), yellow (0%), neutral (partial)
 * - Tooltip with status breakdown and segmented progress bar
 * - Accessible with ARIA attributes and keyboard support
 * - Memoized for performance
 */

import React, { useMemo } from 'react';
import type { RequestLogItem } from '@core/models';
import { aggregateStatusCounts } from '../utils/indicators';
import { Tooltip } from '@ui/shared/Tooltip';
import './DocumentStatusIndicator.css';

export interface DocumentStatusIndicatorProps {
  /** Array of RequestLogItem to calculate status from */
  items: RequestLogItem[];
  /** Size variant for the indicator */
  size?: 'sm' | 'md';
}

/**
 * Status display order for breakdown and progress bar.
 * Ordered by workflow progression: done first, then active, then pending.
 */
const STATUS_ORDER = ['done', 'in-progress', 'planned', 'backlog', 'triage', 'wontfix'] as const;

/**
 * Human-readable labels for status values (capitalized for display)
 */
const STATUS_LABELS: Record<string, string> = {
  done: 'Done',
  'in-progress': 'In Progress',
  planned: 'Planned',
  backlog: 'Backlog',
  triage: 'Triage',
  wontfix: 'Wontfix',
};

/**
 * DocumentStatusIndicator Component
 *
 * Shows document-level completion as "x/y done" with color-coded container.
 * Hover tooltip displays full status breakdown and segmented progress bar.
 * Keyboard accessible via tabindex for tooltip access.
 *
 * @param props - DocumentStatusIndicatorProps
 * @returns DocumentStatusIndicator component
 */
export const DocumentStatusIndicator = React.memo(function DocumentStatusIndicator({
  items,
  size = 'sm',
}: DocumentStatusIndicatorProps): React.JSX.Element {
  // Aggregate status counts from items
  const statusCounts = useMemo(() => aggregateStatusCounts(items), [items]);

  // Calculate done count and total
  const doneCount = statusCounts['done'] ?? 0;
  const totalCount = items.length;

  // Determine color state based on completion
  const colorState = useMemo(() => {
    if (totalCount === 0) return 'empty';
    if (doneCount === totalCount) return 'complete';
    if (doneCount === 0) return 'empty';
    return 'partial';
  }, [doneCount, totalCount]);

  // Build breakdown text for tooltip line 1
  const breakdownText = useMemo(() => {
    const parts: string[] = [];

    // Add statuses in order
    for (const status of STATUS_ORDER) {
      const count = statusCounts[status];
      if (count && count > 0) {
        const label = STATUS_LABELS[status] ?? status;
        parts.push(`${count} ${label}`);
      }
    }

    // Include any custom statuses not in STATUS_ORDER
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > 0 && !STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number])) {
        parts.push(`${count} ${status}`);
      }
    }

    return parts.length > 0 ? parts.join(', ') : 'No items';
  }, [statusCounts]);

  // Calculate progress bar segments for tooltip
  const progressSegments = useMemo(() => {
    if (totalCount === 0) return [];

    const segments: Array<{ status: string; percentage: number; count: number }> = [];

    // Add segments in order
    for (const status of STATUS_ORDER) {
      const count = statusCounts[status];
      if (count && count > 0) {
        segments.push({
          status,
          percentage: (count / totalCount) * 100,
          count,
        });
      }
    }

    // Include any custom statuses
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > 0 && !STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number])) {
        segments.push({
          status,
          percentage: (count / totalCount) * 100,
          count,
        });
      }
    }

    return segments;
  }, [statusCounts, totalCount]);

  // Build accessible label
  const ariaLabel = useMemo(() => {
    if (totalCount === 0) {
      return 'No items in document';
    }
    const percentage = Math.round((doneCount / totalCount) * 100);
    return `${doneCount} of ${totalCount} items done, ${percentage}% complete. ${breakdownText}`;
  }, [doneCount, totalCount, breakdownText]);

  // Build CSS class name
  const className = [
    'doc-status-indicator',
    size === 'md' ? 'doc-status-indicator--md' : '',
    colorState === 'complete' ? 'doc-status-indicator--complete' : '',
    colorState === 'empty' ? 'doc-status-indicator--empty' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Handle empty state (no items)
  if (totalCount === 0) {
    return (
      <div className={className} aria-label={ariaLabel}>
        <span className="doc-status-text">0/0 done</span>
      </div>
    );
  }

  // Tooltip content with breakdown text and progress bar
  const tooltipContent = (
    <div className="doc-status-tooltip">
      <div className="doc-status-tooltip-text">{breakdownText}</div>
      <div
        className="doc-status-tooltip-bar"
        role="img"
        aria-label={`Progress: ${progressSegments.map((s) => `${s.count} ${s.status}`).join(', ')}`}
      >
        {progressSegments.map((segment) => (
          <div
            key={segment.status}
            className={`doc-status-tooltip-segment doc-status-tooltip-segment--${segment.status}`}
            style={{ width: `${segment.percentage}%` }}
            title={`${segment.count} ${STATUS_LABELS[segment.status] ?? segment.status}`}
          />
        ))}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top" delay={200}>
      <div className={className} aria-label={ariaLabel} tabIndex={0} role="status">
        <span className="doc-status-text">
          {doneCount}/{totalCount} done
        </span>
      </div>
    </Tooltip>
  );
});

export default DocumentStatusIndicator;
