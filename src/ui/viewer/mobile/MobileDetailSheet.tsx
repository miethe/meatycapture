/**
 * MobileDetailSheet Component
 *
 * Half-sheet that displays document details when a card is tapped.
 * Starts at 50vh and can expand to full screen (100vh).
 *
 * Features:
 * - Renders at 50vh initial height, expands to 100vh
 * - Drag handle for visual affordance
 * - Drag-to-dismiss gesture (>50px downward = close)
 * - Document metadata display (doc_id, title, item count, dates, tags)
 * - "View Full Document" button to expand
 * - Collapse button when expanded
 * - Portal rendering to document.body
 * - Focus trapping and accessibility (ARIA)
 * - Smooth height transitions
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CatalogEntry } from '@core/catalog/types';
import './mobile-viewer.css';

/**
 * Props for MobileDetailSheet component
 */
export interface MobileDetailSheetProps {
  /** Whether the sheet is currently open/visible */
  isOpen: boolean;

  /** Whether the sheet is expanded to full height (100vh) */
  isExpanded: boolean;

  /** The catalog entry to display, or null if none selected */
  entry: CatalogEntry | null;

  /** Callback when sheet should close */
  onClose: () => void;

  /** Callback when sheet should expand to full height */
  onExpand: () => void;

  /** Callback when sheet should collapse to half height */
  onCollapse: () => void;

  /** Callback when user wants to view the full document */
  onViewFull: (entry: CatalogEntry) => void;
}

/**
 * Format a date for display
 *
 * Returns a human-readable date string (e.g., "Dec 30, 2025")
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return 'Unknown';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date as relative time
 *
 * Returns relative time (e.g., "Today", "Yesterday", "3 days ago")
 * Falls back to absolute date for older dates.
 *
 * @param date - Date to format
 * @returns Relative or formatted date string
 */
function formatRelativeDate(date: Date | string | undefined): string {
  if (!date) return 'Unknown';
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

/** Threshold in pixels for drag-to-dismiss gesture */
const DRAG_DISMISS_THRESHOLD = 50;

/**
 * MobileDetailSheet Component
 *
 * Bottom sheet for displaying document details on mobile.
 * Supports half-screen (50vh) and full-screen (100vh) modes.
 *
 * @param props - MobileDetailSheetProps
 * @returns Portal-rendered detail sheet or null if closed
 */
export function MobileDetailSheet({
  isOpen,
  isExpanded,
  entry,
  onClose,
  onExpand,
  onCollapse,
  onViewFull,
}: MobileDetailSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const currentDragY = useRef<number>(0);

  /**
   * Handle touch start for drag gesture
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      dragStartY.current = touch.clientY;
      currentDragY.current = 0;
    }
  }, []);

  /**
   * Handle touch move for drag gesture
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - dragStartY.current;
    // Only track downward movement (positive delta)
    if (deltaY > 0) {
      currentDragY.current = deltaY;
    }
  }, []);

  /**
   * Handle touch end - check if should dismiss
   */
  const handleTouchEnd = useCallback(() => {
    if (currentDragY.current > DRAG_DISMISS_THRESHOLD) {
      onClose();
    }
    dragStartY.current = null;
    currentDragY.current = 0;
  }, [onClose]);

  /**
   * Handle View Full Document button click
   */
  const handleViewFull = useCallback(() => {
    if (entry) {
      onViewFull(entry);
    }
  }, [entry, onViewFull]);

  /**
   * Handle scrim click to close
   */
  const handleScrimClick = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Focus trap - keep focus within sheet when open
   */
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;

    const sheet = sheetRef.current;
    const focusableElements = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !firstElement || !lastElement) return;

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Don't render if not open or no entry
  if (!isOpen || !entry) {
    return null;
  }

  const sheetContent = (
    <>
      {/* Scrim/Backdrop */}
      <div
        className={`mobile-scrim ${isOpen ? 'mobile-scrim--visible' : ''}`}
        onClick={handleScrimClick}
        aria-hidden="true"
        data-testid="mobile-detail-scrim"
      />

      {/* Detail Sheet */}
      <div
        ref={sheetRef}
        className="mobile-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-expanded={isExpanded}
        aria-label={`Document details for ${entry.title}`}
        style={{
          height: isExpanded ? '100vh' : '50vh',
          transition: 'height var(--mobile-animation-normal) var(--mobile-ease-out)',
        }}
        data-testid="mobile-detail-sheet"
      >
        {/* Drag Handle */}
        <div
          className="mobile-detail-sheet__handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label="Drag to dismiss"
          data-testid="mobile-detail-handle"
        >
          <div
            style={{
              width: '36px',
              height: '4px',
              backgroundColor: 'var(--mobile-text-disabled)',
              borderRadius: 'var(--mobile-radius-full)',
              margin: '0 auto',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Header */}
        <header className="mobile-detail-sheet__header">
          {/* Document ID Badge */}
          <code
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              backgroundColor: 'var(--mobile-surface-secondary)',
              borderRadius: 'var(--mobile-radius-sm)',
              fontSize: '12px',
              color: 'var(--mobile-text-secondary)',
              marginBottom: 'var(--mobile-spacing-sm)',
            }}
            data-testid="mobile-detail-doc-id"
          >
            {entry.doc_id}
          </code>

          {/* Title */}
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--mobile-text-primary)',
              lineHeight: 1.3,
            }}
            data-testid="mobile-detail-title"
          >
            {entry.title}
          </h2>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail sheet"
            style={{
              position: 'absolute',
              top: 'var(--mobile-spacing-md)',
              right: 'var(--mobile-spacing-md)',
              width: '32px',
              height: '32px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--mobile-radius-full)',
              color: 'var(--mobile-text-secondary)',
            }}
            data-testid="mobile-detail-close"
          >
            <span aria-hidden="true" style={{ fontSize: '20px' }}>
              &times;
            </span>
          </button>
        </header>

        {/* Content */}
        <div
          className="mobile-detail-sheet__content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--mobile-spacing-md)',
          }}
          data-testid="mobile-detail-content"
        >
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--mobile-spacing-md)',
              marginBottom: 'var(--mobile-spacing-lg)',
            }}
          >
            {/* Item Count */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--mobile-text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Items
              </div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--mobile-text-primary)',
                }}
                data-testid="mobile-detail-item-count"
              >
                {entry.item_count}
              </div>
            </div>

            {/* Project */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--mobile-text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Project
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--mobile-text-primary)',
                }}
                data-testid="mobile-detail-project"
              >
                {entry.project_name}
              </div>
            </div>

            {/* Updated Date */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--mobile-text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Updated
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--mobile-text-primary)',
                }}
                data-testid="mobile-detail-updated"
              >
                {formatRelativeDate(entry.updated_at)}
              </div>
            </div>

            {/* Full Date */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--mobile-text-secondary)',
                  marginBottom: '4px',
                }}
              >
                Date
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--mobile-text-primary)',
                }}
                data-testid="mobile-detail-date"
              >
                {formatDate(entry.updated_at)}
              </div>
            </div>
          </div>

          {/* Tags Section - Placeholder for when CatalogEntry has tags */}
          {/* Note: CatalogEntry doesn't currently include tags from document */}
          {/* This would need to be extended to fetch full document or add tags to CatalogEntry */}

          {/* Action Buttons */}
          <div
            style={{
              marginTop: 'var(--mobile-spacing-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mobile-spacing-sm)',
            }}
          >
            {/* View Full Document Button - loads document and expands sheet */}
            <button
              type="button"
              onClick={handleViewFull}
              style={{
                width: '100%',
                minHeight: '48px',
                padding: 'var(--mobile-spacing-md)',
                backgroundColor: 'var(--mobile-accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--mobile-radius-md)',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              aria-label="View full document content"
              data-testid="mobile-detail-view-full"
            >
              View Full Document
            </button>

            {/* Expand/Collapse toggle button */}
            {!isExpanded ? (
              <button
                type="button"
                onClick={onExpand}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: 'var(--mobile-spacing-md)',
                  backgroundColor: 'transparent',
                  color: 'var(--mobile-text-secondary)',
                  border: '1px solid var(--mobile-glass-border)',
                  borderRadius: 'var(--mobile-radius-md)',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                aria-label="Expand sheet to full height"
                data-testid="mobile-detail-expand"
              >
                Expand
              </button>
            ) : (
              <button
                type="button"
                onClick={onCollapse}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  padding: 'var(--mobile-spacing-md)',
                  backgroundColor: 'transparent',
                  color: 'var(--mobile-text-secondary)',
                  border: '1px solid var(--mobile-glass-border)',
                  borderRadius: 'var(--mobile-radius-md)',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                aria-label="Collapse sheet to half height"
                data-testid="mobile-detail-collapse"
              >
                Collapse
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Render via portal to document.body
  return createPortal(sheetContent, document.body);
}

export default MobileDetailSheet;
