/**
 * StatusIndicator Component
 *
 * Displays a colored dot indicator for item status with optional tooltip.
 * Uses CSS classes defined in viewer.css for consistent styling.
 *
 * Features:
 * - Colored dot based on status (triage, backlog, planned, in-progress, done, wontfix)
 * - Optional tooltip showing status name
 * - Two size variants: sm (default) and md
 * - Accessible with proper aria-label and keyboard support
 * - Memoized for performance
 */

import React, { memo } from 'react';
import { Tooltip } from '@ui/shared/Tooltip';

/**
 * Valid status values for the indicator
 */
export type StatusType = 'triage' | 'backlog' | 'planned' | 'in-progress' | 'done' | 'wontfix';

/**
 * Size variants for the indicator
 */
export type StatusSize = 'sm' | 'md';

export interface StatusIndicatorProps {
  /** Status value to display */
  status: string;
  /** Size of the indicator dot */
  size?: StatusSize;
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
}

/**
 * Known status values for class mapping
 */
const KNOWN_STATUSES: readonly StatusType[] = [
  'triage',
  'backlog',
  'planned',
  'in-progress',
  'done',
  'wontfix',
] as const;

/**
 * Format status string for display in tooltip
 * Handles special cases like "in-progress" -> "In Progress", "wontfix" -> "Won't Fix"
 */
function formatStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'in-progress':
      return 'In Progress';
    case 'wontfix':
      return "Won't Fix";
    default:
      // Capitalize first letter of each word
      return status
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
  }
}

/**
 * Check if a status is a known status type
 */
function isKnownStatus(status: string): status is StatusType {
  return KNOWN_STATUSES.includes(status.toLowerCase() as StatusType);
}

/**
 * Build CSS class names for the status indicator
 */
function buildClassName(status: string, size: StatusSize): string {
  const classes = ['status-indicator'];

  // Add status-specific class if it's a known status
  const normalizedStatus = status.toLowerCase();
  if (isKnownStatus(normalizedStatus)) {
    classes.push(`status-indicator--${normalizedStatus}`);
  }

  // Add size class for medium size
  if (size === 'md') {
    classes.push('status-indicator--lg');
  }

  return classes.join(' ');
}

/**
 * StatusIndicator Component
 *
 * A small colored dot that indicates the status of an item.
 * Wrapped with Tooltip when showTooltip is true.
 * Keyboard accessible via tabindex for tooltip access.
 *
 * @example
 * // Basic usage
 * <StatusIndicator status="in-progress" />
 *
 * @example
 * // Medium size without tooltip
 * <StatusIndicator status="done" size="md" showTooltip={false} />
 */
export const StatusIndicator = memo(function StatusIndicator({
  status,
  size = 'sm',
  showTooltip = true,
}: StatusIndicatorProps): React.JSX.Element {
  const className = buildClassName(status, size);
  const label = formatStatusLabel(status);

  const indicator = (
    <span
      className={className}
      role="img"
      aria-label={`Status: ${label}`}
      tabIndex={showTooltip ? 0 : undefined}
      data-testid="status-indicator"
    />
  );

  if (showTooltip) {
    return (
      <Tooltip content={label} position="top">
        {indicator}
      </Tooltip>
    );
  }

  return indicator;
});

export default StatusIndicator;
