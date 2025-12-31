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
 * - Visual feedback during drag (sheet follows finger)
 * - If expanded and dragging down, collapse first, then dismiss
 * - Document metadata display (doc_id, title, item count, dates, tags)
 * - "View Full Document" button to expand
 * - Collapse button when expanded
 * - Portal rendering to document.body
 * - Focus trapping and accessibility (ARIA)
 * - Focus restoration to triggering element on close
 * - Smooth height transitions
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CatalogEntry } from '@core/catalog/types';
import {
  calculateDragDistance,
  shouldDismiss,
  calculateTransform,
  clampDragDistance,
} from './utils/gestureUtils';
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

  /** Element to return focus to when sheet closes */
  triggerRef?: React.RefObject<HTMLElement | null>;
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

/** Threshold in pixels for drag-to-dismiss gesture (lower than bottom sheet) */
const DRAG_DISMISS_THRESHOLD = 50;

/** Maximum drag distance for visual feedback */
const MAX_DRAG_DISTANCE = 300;

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
  triggerRef,
}: MobileDetailSheetProps): React.JSX.Element | null {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragDistance, setDragDistance] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Store previous active element for focus restoration
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Check if content is scrolled to top
   * Used to determine if drag should dismiss or scroll
   */
  const isContentAtTop = useCallback((): boolean => {
    if (!contentRef.current) return true;
    return contentRef.current.scrollTop <= 0;
  }, []);

  /**
   * Handle touch start for drag gesture
   * Only initiates drag on handle or when content is scrolled to top
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, isHandle: boolean = false) => {
      const touch = e.touches[0];
      if (!touch) return;

      // Always allow drag from handle
      // Only allow drag from content if scrolled to top
      if (isHandle || isContentAtTop()) {
        dragStartY.current = touch.clientY;
        setIsDragging(true);
      }
    },
    [isContentAtTop]
  );

  /**
   * Handle touch move for drag gesture
   * Provides visual feedback by translating the sheet
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (dragStartY.current === null || !isDragging) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = calculateDragDistance(dragStartY.current, touch.clientY);

      // Only track downward movement (positive delta)
      if (deltaY > 0) {
        // Prevent default to stop scroll interference when dragging
        e.preventDefault();
        const clamped = clampDragDistance(deltaY, MAX_DRAG_DISTANCE);
        setDragDistance(clamped);
      } else {
        // Allow upward scroll in content
        setDragDistance(0);
      }
    },
    [isDragging]
  );

  /**
   * Handle touch end - check if should dismiss or collapse
   */
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    if (shouldDismiss(dragDistance, DRAG_DISMISS_THRESHOLD)) {
      if (isExpanded) {
        // If expanded, collapse first instead of closing
        onCollapse();
      } else {
        // If half-sheet, close
        onClose();
      }
    }

    // Reset drag state
    dragStartY.current = null;
    setDragDistance(0);
    setIsDragging(false);
  }, [dragDistance, isExpanded, onCollapse, onClose, isDragging]);

  /**
   * Handle touch cancel - reset drag state
   */
  const handleTouchCancel = useCallback(() => {
    dragStartY.current = null;
    setDragDistance(0);
    setIsDragging(false);
  }, []);

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
   * Handle close - wraps onClose to ensure focus restoration
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Store previous focus element when sheet opens
   */
  useEffect(() => {
    if (isOpen) {
      // Store current focus or use trigger ref
      previousFocusRef.current =
        triggerRef?.current || (document.activeElement as HTMLElement);
    }
  }, [isOpen, triggerRef]);

  /**
   * Restore focus when sheet closes
   */
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
      // Handle Escape key to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

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
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when sheet is open
   */
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Don't render if not open or no entry
  if (!isOpen || !entry) {
    return null;
  }

  // Calculate transform for visual feedback during drag
  const dragTransform = isDragging && dragDistance > 0 ? calculateTransform(dragDistance, MAX_DRAG_DISTANCE) : 'none';

  // Calculate opacity for visual feedback (fade as dragged down)
  const dragOpacity = isDragging && dragDistance > 0 ? Math.max(0.5, 1 - dragDistance / MAX_DRAG_DISTANCE * 0.5) : 1;

  const sheetContent = (
    <>
      {/* Scrim/Backdrop */}
      <div
        className={`mobile-scrim ${isOpen ? 'mobile-scrim--visible' : ''}`}
        onClick={handleScrimClick}
        aria-hidden="true"
        data-testid="mobile-detail-scrim"
        style={{
          opacity: dragOpacity,
        }}
      />

      {/* Detail Sheet */}
      <div
        ref={sheetRef}
        className={`mobile-detail-sheet ${isExpanded ? 'mobile-detail-sheet--expanded' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-expanded={isExpanded}
        aria-label={`Document details for ${entry.title}`}
        style={{
          height: isExpanded ? '100vh' : '50vh',
          transform: dragTransform,
          transition: isDragging
            ? 'none'
            : 'height var(--mobile-animation-normal) var(--mobile-ease-out), transform var(--mobile-animation-normal) var(--mobile-ease-out)',
        }}
        data-testid="mobile-detail-sheet"
        data-dragging={isDragging}
      >
        {/* Drag Handle */}
        <div
          className="mobile-detail-sheet__handle"
          onTouchStart={(e) => handleTouchStart(e, true)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          aria-label="Drag to dismiss"
          data-testid="mobile-detail-handle"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (isExpanded) {
                onCollapse();
              } else {
                onClose();
              }
            }
          }}
        >
          <div
            className="mobile-detail-sheet__handle-bar"
            style={{
              width: '36px',
              height: '4px',
              backgroundColor: isDragging
                ? 'var(--mobile-text-secondary)'
                : 'var(--mobile-text-disabled)',
              borderRadius: 'var(--mobile-radius-full)',
              margin: '0 auto',
              transition: isDragging ? 'none' : 'background-color var(--mobile-animation-fast) var(--mobile-ease-out)',
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
            onClick={handleClose}
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
          ref={contentRef}
          className="mobile-detail-sheet__content"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--mobile-spacing-md)',
            overscrollBehavior: 'contain',
          }}
          onTouchStart={(e) => handleTouchStart(e, false)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
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
