/**
 * ProjectProgressIndicator Component
 *
 * Displays project progress as "X/Y done" ratio with a visual progress bar.
 * Shows a tooltip with full status breakdown on hover/focus.
 *
 * Features:
 * - Visual progress bar with percentage fill
 * - "X/Y done" ratio text display
 * - Color-coded based on completion percentage (green for high, yellow/red for low)
 * - Tooltip showing full status breakdown
 * - Special styling for 100% completion
 * - Accessible with ARIA attributes for progress bar and keyboard support
 * - Memoized for performance
 */

import React, { useMemo } from 'react';
import type { RequestLogDoc } from '@core/models';
import { calculateProjectProgress } from '../utils/indicators';
import { Tooltip } from '@ui/shared/Tooltip';

export interface ProjectProgressIndicatorProps {
  /** Array of RequestLogDoc documents to aggregate progress from */
  documents: RequestLogDoc[];
}

/**
 * ProjectProgressIndicator Component
 *
 * Shows project-level progress across multiple documents.
 * Displays done/total ratio with visual progress bar and tooltip breakdown.
 * Keyboard accessible via tabindex for tooltip access.
 *
 * @param props - ProjectProgressIndicatorProps
 * @returns ProjectProgressIndicator component
 */
export const ProjectProgressIndicator = React.memo(function ProjectProgressIndicator({
  documents,
}: ProjectProgressIndicatorProps): React.JSX.Element {
  // Calculate progress from all documents
  const progress = useMemo(() => calculateProjectProgress(documents), [documents]);

  // Calculate percentage for progress bar
  const percentage = useMemo(() => {
    if (progress.total === 0) return 0;
    return Math.round((progress.done / progress.total) * 100);
  }, [progress.done, progress.total]);

  // Build tooltip content with status breakdown
  const tooltipContent = useMemo(() => {
    if (progress.total === 0) {
      return 'No items in project';
    }

    const statusEntries = Object.entries(progress.statusBreakdown)
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([status, count]) => `${count} ${status}`)
      .join(', ');

    return statusEntries || 'No status data';
  }, [progress.statusBreakdown, progress.total]);

  // Determine color variant based on percentage
  const colorVariant = useMemo(() => {
    if (progress.total === 0) return '';
    if (percentage >= 75) return 'project-progress--high';
    if (percentage >= 40) return 'project-progress--medium';
    return 'project-progress--low';
  }, [percentage, progress.total]);

  // Build class name for the indicator
  const className = [
    'project-progress-indicator',
    colorVariant,
    percentage === 100 && progress.total > 0 ? 'project-progress--complete' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Accessible label for screen readers
  const ariaLabel = useMemo(() => {
    if (progress.total === 0) {
      return 'No items in project';
    }
    return `${progress.done} of ${progress.total} items done, ${percentage}% complete`;
  }, [progress.done, progress.total, percentage]);

  // Handle empty state
  if (progress.total === 0) {
    return (
      <div className="project-progress-indicator project-progress--empty" aria-label={ariaLabel}>
        <span className="project-progress-text">No items</span>
      </div>
    );
  }

  return (
    <Tooltip content={tooltipContent} position="top" delay={200}>
      <div className={className} aria-label={ariaLabel} tabIndex={0}>
        <div
          className="project-progress-bar"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${percentage}%`}
        >
          <div
            className="project-progress-fill"
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          />
        </div>
        <span className="project-progress-text">
          {progress.done}/{progress.total} done
        </span>
      </div>
    </Tooltip>
  );
});

export default ProjectProgressIndicator;
