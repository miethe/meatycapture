/**
 * MobileDocCard Component
 *
 * Mobile-optimized card for displaying a single request-log document.
 * Designed for touch interaction with proper touch targets (44px minimum).
 *
 * Features:
 * - Touch-compliant card height (88px minimum)
 * - Doc ID badge, title, item count, updated date
 * - First 2 tags with overflow indicator (+N)
 * - Tap to open half-sheet detail view
 * - Keyboard accessible (Enter/Space)
 * - Proper ARIA labels for accessibility
 */

import React, { useCallback, useRef } from 'react';
import type { CatalogEntry } from '@core/catalog';
import './mobile-viewer.css';

/**
 * Props for MobileDocCard component
 */
export interface MobileDocCardProps {
  /** Catalog entry to display */
  entry: CatalogEntry;

  /** Callback when card is tapped. Receives entry and optional element for focus management */
  onTap: (entry: CatalogEntry, element?: HTMLElement) => void;

  /** Whether this card is currently selected */
  isSelected?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Format a date as relative time or short date
 *
 * @param date - Date to format
 * @returns Formatted date string (e.g., "2 hours ago", "Yesterday", "Dec 15")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as short date (e.g., "Dec 15")
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * MobileDocCard Component
 *
 * Card layout for displaying a single request-log document in mobile view.
 * Optimized for touch interaction with proper sizing and accessibility.
 *
 * @param props - MobileDocCardProps
 * @returns MobileDocCard component
 */
export function MobileDocCard({
  entry,
  onTap,
  isSelected = false,
  className = '',
}: MobileDocCardProps): React.JSX.Element {
  // Ref to the card element for focus management
  const cardRef = useRef<HTMLElement>(null);

  /**
   * Handle card tap/click
   * Passes the card element reference for focus restoration
   */
  const handleTap = useCallback(() => {
    onTap(entry, cardRef.current ?? undefined);
  }, [entry, onTap]);

  /**
   * Handle keyboard interaction (Enter/Space)
   * Passes the card element reference for focus restoration
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onTap(entry, cardRef.current ?? undefined);
      }
    },
    [entry, onTap]
  );

  // Build class name string
  const cardClassName = [
    'mobile-doc-card',
    isSelected ? 'mobile-doc-card--selected' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Prepare tags display (max 2 visible, with overflow indicator)
  const visibleTags: string[] = []; // CatalogEntry doesn't include tags, this is a placeholder
  const maxVisibleTags = 2;
  const overflowCount = Math.max(0, visibleTags.length - maxVisibleTags);
  const displayTags = visibleTags.slice(0, maxVisibleTags);

  // Format date for display
  const formattedDate = formatRelativeTime(entry.updated_at);

  // Build accessible label
  const accessibleLabel = `Document ${entry.doc_id}: ${entry.title}, ${entry.item_count} items, updated ${formattedDate}`;

  return (
    <article
      ref={cardRef}
      className={cardClassName}
      onClick={handleTap}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={accessibleLabel}
      aria-pressed={isSelected}
      style={{
        minHeight: 'var(--mobile-card-min-height)',
        padding: 'var(--mobile-spacing-sm) var(--mobile-spacing-md)',
        cursor: 'pointer',
      }}
    >
      {/* Card Header */}
      <div className="mobile-doc-card__header">
        {/* Doc ID Badge */}
        <code
          style={{
            fontSize: '0.75rem',
            backgroundColor: 'var(--mobile-surface-secondary)',
            padding: '2px 6px',
            borderRadius: 'var(--mobile-radius-sm)',
            fontFamily: 'monospace',
          }}
        >
          {entry.doc_id}
        </code>

        {/* Item Count */}
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--mobile-text-secondary)',
          }}
        >
          {entry.item_count} {entry.item_count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Title */}
      <h3
        className="mobile-doc-card__title"
        style={{
          margin: 'var(--mobile-spacing-xs) 0',
          fontSize: '1rem',
          fontWeight: 500,
          color: 'var(--mobile-text-primary)',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.title}
      </h3>

      {/* Meta Row */}
      <div
        className="mobile-doc-card__meta"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--mobile-spacing-sm)',
        }}
      >
        {/* Project Name */}
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--mobile-text-secondary)',
          }}
        >
          {entry.project_name}
        </span>

        {/* Updated Date */}
        <time
          dateTime={entry.updated_at.toISOString()}
          style={{
            fontSize: '0.75rem',
            color: 'var(--mobile-text-secondary)',
          }}
        >
          {formattedDate}
        </time>
      </div>

      {/* Tags (if any) */}
      {displayTags.length > 0 && (
        <div
          className="mobile-doc-card__tags"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--mobile-spacing-xs)',
            marginTop: 'var(--mobile-spacing-xs)',
          }}
        >
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="mobile-doc-card__tag"
              style={{
                fontSize: '0.625rem',
                backgroundColor: 'var(--mobile-accent-primary)',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: 'var(--mobile-radius-full)',
              }}
            >
              {tag}
            </span>
          ))}
          {overflowCount > 0 && (
            <span
              className="mobile-doc-card__tag mobile-doc-card__tag--overflow"
              style={{
                fontSize: '0.625rem',
                backgroundColor: 'var(--mobile-surface-secondary)',
                color: 'var(--mobile-text-secondary)',
                padding: '2px 8px',
                borderRadius: 'var(--mobile-radius-full)',
              }}
            >
              +{overflowCount}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export default MobileDocCard;
