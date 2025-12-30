/**
 * MobileDocList Component
 *
 * Scrollable container for rendering MobileDocCard components in mobile viewer.
 * Supports flat list or grouped display with sticky project headers.
 *
 * Features:
 * - Renders MobileDocCard for each catalog entry
 * - Project group headers (sticky, collapsible) with entry counts
 * - Vertical-only scrolling
 * - Loading skeleton with shimmer animation
 * - Empty state with icon and message
 * - Keyboard navigation (arrow keys between cards)
 * - Proper focus management
 */

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import type { CatalogEntry, GroupedCatalog } from '@core/catalog';
import { MobileDocCard } from './MobileDocCard';
import './mobile-viewer.css';

/**
 * Props for MobileDocList component
 */
export interface MobileDocListProps {
  /** Flat list of catalog entries (used when isGrouped is false) */
  entries: CatalogEntry[];

  /** Grouped entries by project (used when isGrouped is true) */
  groupedEntries?: GroupedCatalog;

  /** Whether to display entries grouped by project */
  isGrouped?: boolean;

  /** Callback when a card is tapped. Receives entry and optional element for focus management */
  onCardTap: (entry: CatalogEntry, element?: HTMLElement) => void;

  /** Currently selected entry */
  selectedEntry?: CatalogEntry | null;

  /** Whether the list is in loading state */
  isLoading?: boolean;

  /** Message to display when list is empty */
  emptyMessage?: string;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Loading skeleton card component with shimmer animation
 */
function SkeletonCard(): React.JSX.Element {
  return (
    <div
      className="mobile-doc-card mobile-doc-card--loading"
      style={{
        minHeight: 'var(--mobile-card-min-height)',
        padding: 'var(--mobile-spacing-sm) var(--mobile-spacing-md)',
        background: 'var(--mobile-surface-secondary)',
        borderRadius: 'var(--mobile-radius-md)',
        marginBottom: 'var(--mobile-spacing-sm)',
      }}
      aria-hidden="true"
    >
      {/* Header skeleton */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 'var(--mobile-spacing-xs)',
        }}
      >
        <div
          style={{
            width: '120px',
            height: '18px',
            borderRadius: 'var(--mobile-radius-sm)',
            background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div
          style={{
            width: '60px',
            height: '18px',
            borderRadius: 'var(--mobile-radius-sm)',
            background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>

      {/* Title skeleton */}
      <div
        style={{
          width: '80%',
          height: '20px',
          borderRadius: 'var(--mobile-radius-sm)',
          marginBottom: 'var(--mobile-spacing-xs)',
          background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />

      {/* Meta skeleton */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '14px',
            borderRadius: 'var(--mobile-radius-sm)',
            background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
        <div
          style={{
            width: '80px',
            height: '14px',
            borderRadius: 'var(--mobile-radius-sm)',
            background: 'linear-gradient(90deg, var(--mobile-surface-secondary) 25%, var(--mobile-glass-border) 50%, var(--mobile-surface-secondary) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Loading skeleton component showing 4 placeholder cards
 */
function LoadingSkeleton(): React.JSX.Element {
  return (
    <div
      className="mobile-doc-list__loading"
      role="status"
      aria-label="Loading documents"
    >
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

/**
 * Empty state component with icon and message
 */
function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      className="mobile-doc-list__empty"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mobile-spacing-xl)',
        color: 'var(--mobile-text-secondary)',
        textAlign: 'center',
        minHeight: '200px',
      }}
      role="status"
      aria-label={message}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{
          marginBottom: 'var(--mobile-spacing-md)',
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p
        style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 500,
        }}
      >
        {message}
      </p>
    </div>
  );
}

/**
 * Project group header component (sticky, collapsible)
 */
interface GroupHeaderProps {
  projectName: string;
  entryCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}

function GroupHeader({
  projectName,
  entryCount,
  isCollapsed,
  onToggle,
}: GroupHeaderProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'sticky',
        top: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: 'var(--mobile-spacing-sm) var(--mobile-spacing-md)',
        backgroundColor: 'var(--mobile-glass-bg-heavy)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--mobile-glass-border)',
        cursor: 'pointer',
        zIndex: 'var(--mobile-z-elevated)',
        border: 'none',
        textAlign: 'left',
        transition: 'background-color var(--mobile-animation-fast) var(--mobile-ease-out)',
      }}
      aria-expanded={!isCollapsed}
      aria-controls={`group-${projectName}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mobile-spacing-sm)' }}>
        {/* Collapse/Expand chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform var(--mobile-animation-fast) var(--mobile-ease-out)',
          }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--mobile-text-primary)',
          }}
        >
          {projectName}
        </span>
      </div>
      <span
        style={{
          fontSize: '0.75rem',
          color: 'var(--mobile-text-secondary)',
          backgroundColor: 'var(--mobile-surface-secondary)',
          padding: '2px 8px',
          borderRadius: 'var(--mobile-radius-full)',
        }}
      >
        {entryCount} {entryCount === 1 ? 'doc' : 'docs'}
      </span>
    </button>
  );
}

/**
 * MobileDocList Component
 *
 * Scrollable container for displaying request-log documents in mobile view.
 * Supports flat list or project-grouped display with sticky headers.
 *
 * @param props - MobileDocListProps
 * @returns MobileDocList component
 */
export function MobileDocList({
  entries,
  groupedEntries,
  isGrouped = false,
  onCardTap,
  selectedEntry = null,
  isLoading = false,
  emptyMessage = 'No documents found',
  className = '',
}: MobileDocListProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  /**
   * Get flat list of all visible entries (respecting collapsed groups)
   */
  const visibleEntries = useMemo(() => {
    if (!isGrouped || !groupedEntries) {
      return entries;
    }

    const result: CatalogEntry[] = [];
    groupedEntries.groups.forEach((group, projectId) => {
      if (!collapsedGroups.has(projectId)) {
        result.push(...group.entries);
      }
    });
    return result;
  }, [entries, groupedEntries, isGrouped, collapsedGroups]);

  /**
   * Toggle group collapse state
   */
  const toggleGroup = useCallback((projectId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }, []);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;

      if (key !== 'ArrowUp' && key !== 'ArrowDown') {
        return;
      }

      event.preventDefault();

      const currentIndex = focusedIndex;
      let nextIndex: number;

      if (key === 'ArrowDown') {
        nextIndex = currentIndex < visibleEntries.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : visibleEntries.length - 1;
      }

      setFocusedIndex(nextIndex);

      // Focus the card at the new index
      const entry = visibleEntries[nextIndex];
      if (entry) {
        const cardElement = cardRefs.current.get(entry.doc_id);
        if (cardElement) {
          cardElement.focus();
        }
      }
    },
    [focusedIndex, visibleEntries]
  );

  /**
   * Track focus on cards
   */
  const handleCardFocus = useCallback(
    (entry: CatalogEntry) => {
      const index = visibleEntries.findIndex((e) => e.doc_id === entry.doc_id);
      if (index !== -1) {
        setFocusedIndex(index);
      }
    },
    [visibleEntries]
  );

  /**
   * Register card ref for focus management
   */
  const registerCardRef = useCallback(
    (docId: string) => (element: HTMLElement | null) => {
      if (element) {
        cardRefs.current.set(docId, element);
      } else {
        cardRefs.current.delete(docId);
      }
    },
    []
  );

  /**
   * Reset focus when entries change
   */
  useEffect(() => {
    setFocusedIndex(-1);
  }, [entries, groupedEntries]);

  // Build class name string
  const listClassName = ['mobile-doc-list', className].filter(Boolean).join(' ');

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={listClassName}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          padding: 'var(--mobile-spacing-md)',
        }}
      >
        <LoadingSkeleton />
      </div>
    );
  }

  // Show empty state
  if (entries.length === 0 && (!groupedEntries || groupedEntries.groups.size === 0)) {
    return (
      <div
        className={listClassName}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  /**
   * Render flat list (non-grouped)
   */
  const renderFlatList = () => (
    <div style={{ padding: 'var(--mobile-spacing-md)' }}>
      {entries.map((entry) => (
        <div
          key={entry.doc_id}
          ref={registerCardRef(entry.doc_id)}
          onFocus={() => handleCardFocus(entry)}
          style={{ marginBottom: 'var(--mobile-spacing-sm)' }}
        >
          <MobileDocCard
            entry={entry}
            onTap={onCardTap}
            isSelected={selectedEntry?.doc_id === entry.doc_id}
          />
        </div>
      ))}
    </div>
  );

  /**
   * Render grouped list with sticky headers
   */
  const renderGroupedList = () => {
    if (!groupedEntries) {
      return renderFlatList();
    }

    const groups = Array.from(groupedEntries.groups.entries());

    return (
      <>
        {groups.map(([projectId, group]) => {
          const isCollapsed = collapsedGroups.has(projectId);

          return (
            <div key={projectId} id={`group-${projectId}`}>
              <GroupHeader
                projectName={group.project.name}
                entryCount={group.entries.length}
                isCollapsed={isCollapsed}
                onToggle={() => toggleGroup(projectId)}
              />
              {!isCollapsed && (
                <div style={{ padding: 'var(--mobile-spacing-md)' }}>
                  {group.entries.map((entry) => (
                    <div
                      key={entry.doc_id}
                      ref={registerCardRef(entry.doc_id)}
                      onFocus={() => handleCardFocus(entry)}
                      style={{ marginBottom: 'var(--mobile-spacing-sm)' }}
                    >
                      <MobileDocCard
                        entry={entry}
                        onTap={onCardTap}
                        isSelected={selectedEntry?.doc_id === entry.doc_id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div
      ref={listRef}
      className={listClassName}
      onKeyDown={handleKeyDown}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
      role="list"
      aria-label="Document list"
    >
      {isGrouped ? renderGroupedList() : renderFlatList()}
    </div>
  );
}

export default MobileDocList;
