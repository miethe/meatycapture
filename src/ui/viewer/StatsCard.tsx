/**
 * StatsCard Component
 *
 * Displays a single statistic with icon, label, and value.
 * Used in DocumentDetail to show Item Count, Updated, Created dates.
 *
 * Features:
 * - Icon with glass background
 * - Label and value display
 * - Glass-morphism styling
 * - Responsive design
 * - Accessible with proper semantics
 */

import { type ReactNode } from 'react';

export interface StatsCardProps {
  /** Icon to display (should be a Radix Icon component or React element) */
  icon: ReactNode;
  /** Label text (e.g., "Item Count", "Updated") */
  label: string;
  /** Value to display (e.g., "3", "Today", "Dec 15") */
  value: string | number;
  /** Optional additional CSS class */
  className?: string;
}

/**
 * StatsCard Component
 *
 * Compact card for displaying a statistic with icon and label.
 * Follows the glass-morphism aesthetic of the application.
 *
 * @param props - StatsCardProps
 * @returns StatsCard component
 *
 * @example
 * ```tsx
 * import { CalendarIcon } from '@radix-ui/react-icons';
 *
 * <StatsCard
 *   icon={<CalendarIcon />}
 *   label="Updated"
 *   value="Today"
 * />
 * ```
 */
export function StatsCard({ icon, label, value, className = '' }: StatsCardProps) {
  return (
    <div className={`stats-card ${className}`} role="group" aria-label={`${label}: ${value}`}>
      <span className="stats-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="stats-content">
        <span className="stats-label">{label}</span>
        <span className="stats-value">{value}</span>
      </div>
    </div>
  );
}

export default StatsCard;
