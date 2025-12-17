/**
 * FilterBadge Component
 *
 * Displays an active filter as a removable chip/badge.
 * Shows the filter category and value with a remove button.
 */

import React from 'react';
import './viewer.css';

export interface FilterBadgeProps {
  /** Filter category label (e.g., "Type", "Domain") */
  label: string;
  /** Filter value (e.g., "enhancement", "web") */
  value: string;
  /** Called when user clicks remove button */
  onRemove: () => void;
}

/**
 * FilterBadge
 *
 * Displays a single active filter as a removable chip.
 * Used to show current filter selections with ability to remove individual filters.
 *
 * @param props - FilterBadgeProps
 */
export function FilterBadge({ label, value, onRemove }: FilterBadgeProps): React.JSX.Element {
  return (
    <div className="chip viewer-filter-badge" role="status" aria-label={`Active filter: ${label} is ${value}`}>
      <span className="viewer-filter-badge-label">{label}:</span>
      <span className="viewer-filter-badge-value">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter: ${value}`}
        title={`Remove ${label}: ${value}`}
      >
        ×
      </button>
    </div>
  );
}

export default FilterBadge;
