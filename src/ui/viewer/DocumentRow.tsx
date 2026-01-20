/**
 * DocumentRow Component
 *
 * Renders a single document row in the catalog table.
 * Displays document metadata in separate columns for better layout control.
 *
 * Column structure:
 * - Expand: Chevron for row expansion
 * - Types: Type distribution indicator
 * - Doc Info: Info icon with doc_id tooltip + copy to clipboard
 * - Title: Document title with archived badge
 * - Status: DocumentStatusIndicator "x/y done"
 * - Modified: Calendar icon + relative date
 * - Tags: Tag chips with overflow tooltip
 * - Actions: Kebab menu (end of row)
 *
 * Features:
 * - Click row to expand/collapse detail view
 * - Loading state during document fetch
 * - Copy doc_id to clipboard with feedback
 * - Tags displayed as chips with overflow handling
 * - Keyboard accessible (Enter to expand)
 * - Hover states for interaction feedback
 * - Kebab menu for document actions (Add Item, Edit, Archive, Delete)
 */

import React, { useState, useCallback } from 'react';
import { CalendarIcon, ChevronDownIcon, ArchiveIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import type { CatalogEntry } from '@core/catalog';
import type { RequestLogDoc } from '@core/models';
import type { FieldOptions } from './types';
import { DocumentDetail } from './DocumentDetail';
import { DocumentKebabMenu } from './DocumentKebabMenu';
import { DocumentStatusIndicator, TypeDistributionIndicator } from './components';
import { Tooltip } from '@ui/shared/Tooltip';
import { copyToClipboard } from '@ui/shared/browserCompat';

/** Maximum number of tags to show before displaying "+N" overflow badge */
const MAX_VISIBLE_TAGS = 3;

export interface DocumentRowProps {
  /** Catalog entry metadata */
  entry: CatalogEntry;

  /** Whether this row is currently expanded */
  isExpanded: boolean;

  /** Toggle expansion state */
  onToggle: () => void;

  /** Load full document data */
  onLoadDocument: () => void;

  /** Loading state while fetching document */
  isLoading: boolean;

  /** Full document data (cached) */
  document: RequestLogDoc | null;

  /** Callback when "Add Item" is clicked */
  onAddItem?: (() => void) | undefined;

  /** Callback when "Edit Document" is clicked */
  onEdit?: (() => void) | undefined;

  /** Callback when "Archive Document" is clicked */
  onArchive?: (() => void) | undefined;

  /** Callback when "Unarchive Document" is clicked */
  onUnarchive?: (() => void) | undefined;

  /** Callback when "Delete Document" is clicked */
  onDelete?: (() => void) | undefined;

  /** Callback when an item is updated inline */
  onItemUpdate?: (
    path: string,
    itemId: string,
    updates: {
      title?: string;
      type?: string;
      domain?: string[];
      subdomain?: string[];
      context?: string;
      feature?: string[];
      priority?: string;
      status?: string;
      tags?: string[];
    }
  ) => void;

  /** Whether a specific item is updating */
  isItemUpdating?: (path: string, itemId: string) => boolean;

  /** Field options for inline editing */
  fieldOptions?: FieldOptions | undefined;

  /** Callback when a new field option is added during editing */
  onAddFieldOption?: ((field: string, value: string) => Promise<void>) | undefined;
}

/**
 * DocumentRow Component
 *
 * Single row in the document catalog table.
 * Displays all document metadata and handles expansion.
 *
 * Memoized to prevent unnecessary re-renders when parent state changes
 * but this component's props remain the same.
 *
 * @param props - DocumentRowProps
 * @returns DocumentRow component
 */
export const DocumentRow = React.memo(function DocumentRow({
  entry,
  isExpanded,
  onToggle,
  onLoadDocument,
  isLoading,
  document,
  onAddItem,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onItemUpdate,
  isItemUpdating,
  fieldOptions,
  onAddFieldOption,
}: DocumentRowProps): React.JSX.Element {
  // Copy feedback state for doc_id copy button
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  /**
   * Handle row click for expansion
   * Loads document data if not already loaded/loading
   */
  const handleRowClick = () => {
    if (!isExpanded && !isLoading) {
      onLoadDocument();
    }
    onToggle();
  };

  /**
   * Handle copy doc_id to clipboard
   * Shows feedback for 2 seconds
   */
  const handleCopyDocId = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent row expansion
      const success = await copyToClipboard(entry.doc_id);

      if (success) {
        setCopyFeedback('Copied!');
      } else {
        setCopyFeedback('Failed');
      }

      // Clear feedback after 2 seconds
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    },
    [entry.doc_id]
  );

  /**
   * Handle keyboard navigation
   * Enter key expands/collapses row
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRowClick();
    }
  };

  /**
   * Format date for display
   * Shows relative time (e.g., "2 days ago") for recent dates
   */
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Document action handlers
   */
  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      console.log('Edit clicked for:', entry.doc_id);
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive();
    } else {
      console.log('Archive clicked for:', entry.doc_id);
    }
  };

  const handleUnarchive = () => {
    if (onUnarchive) {
      onUnarchive();
    } else {
      console.log('Unarchive clicked for:', entry.doc_id);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else {
      console.log('Delete clicked for:', entry.doc_id);
    }
  };

  const handleAddItem = () => {
    if (onAddItem) {
      onAddItem();
    } else {
      console.log('Add Item clicked for:', entry.doc_id);
    }
  };

  // Build class name for row
  const rowClassName = [
    'viewer-document-row',
    isExpanded ? 'expanded' : '',
    entry.archived ? 'archived' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Build accessible label including archive status
  const ariaLabel = [
    `Document ${entry.doc_id}: ${entry.title}`,
    entry.archived ? '(Archived)' : '',
    `, ${entry.item_count} items`,
    `, updated ${formatDate(entry.updated_at)}`,
  ]
    .filter(Boolean)
    .join('');

  // Get the document to use for the kebab menu
  const docForMenu = document || createPlaceholderDoc(entry);

  // Build tags tooltip content (all tags if more than visible)
  const allTagsTooltip =
    document?.tags && document.tags.length > 0 ? document.tags.join(', ') : null;

  return (
    <>
      <tr
        className={rowClassName}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-expanded={isExpanded}
        aria-label={ariaLabel}
      >
        {/* Column 1: Expand/Collapse Button */}
        <td className="viewer-document-cell viewer-expand-cell" role="cell">
          <button
            type="button"
            className="viewer-expand-button"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick();
            }}
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            aria-expanded={isExpanded}
          >
            {isLoading ? (
              <span className="spinner" aria-label="Loading document" />
            ) : (
              <ChevronDownIcon
                className={`doc-row-chevron ${isExpanded ? 'expanded' : ''}`}
                aria-hidden="true"
              />
            )}
          </button>
        </td>

        {/* Column 2: Type Distribution Indicator */}
        <td className="viewer-document-cell viewer-type-indicator-cell" role="cell">
          {document?.items && document.items.length > 0 ? (
            <TypeDistributionIndicator items={document.items} maxTypes={3} />
          ) : (
            <div className="viewer-type-indicator-placeholder" aria-hidden="true" />
          )}
        </td>

        {/* Column 3: Doc Info (info icon with doc_id tooltip + copy) */}
        <td className="viewer-document-cell viewer-doc-info-cell" role="cell">
          <Tooltip content={entry.doc_id} position="top" delay={200}>
            <button
              type="button"
              className="viewer-doc-info-button"
              onClick={handleCopyDocId}
              aria-label={`Document ID: ${entry.doc_id}. Click to copy.`}
              title="Click to copy document ID"
            >
              {copyFeedback ? (
                <span className="viewer-doc-info-feedback" role="status" aria-live="polite">
                  {copyFeedback === 'Copied!' ? '✓' : '✗'}
                </span>
              ) : (
                <InfoCircledIcon className="viewer-doc-info-icon" aria-hidden="true" />
              )}
            </button>
          </Tooltip>
        </td>

        {/* Column 4: Title with archived badge */}
        <td className="viewer-document-cell viewer-title-cell" role="cell">
          <div className="viewer-title-content">
            <span className="viewer-title-text">{entry.title}</span>
            {entry.archived && (
              <span className="doc-archived-badge" role="status" aria-label="Archived document">
                <ArchiveIcon className="doc-archived-icon" aria-hidden="true" />
                <span className="doc-archived-text">Archived</span>
              </span>
            )}
          </div>
        </td>

        {/* Column 5: Item Status (x/y done) */}
        <td className="viewer-document-cell viewer-item-status-cell" role="cell">
          {document?.items && document.items.length > 0 ? (
            <DocumentStatusIndicator items={document.items} size="sm" />
          ) : (
            <span className="doc-meta-item-count">{entry.item_count} items</span>
          )}
        </td>

        {/* Column 6: Modified Date */}
        <td className="viewer-document-cell viewer-modified-date-cell" role="cell">
          <span className="doc-meta-date">
            <CalendarIcon className="doc-meta-icon" aria-hidden="true" />
            <time className="doc-meta-value" dateTime={entry.updated_at.toISOString()}>
              {formatDate(entry.updated_at)}
            </time>
          </span>
        </td>

        {/* Column 7: Tags with overflow - shows MAX_VISIBLE_TAGS then "+N" */}
        <td className="viewer-document-cell viewer-tags-cell" role="cell">
          {document?.tags && document.tags.length > 0 ? (
            <Tooltip content={allTagsTooltip || ''} position="top" delay={300}>
              <div className="viewer-tags-wrapper">
                {document.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                  <span key={tag} className="doc-tag-chip">
                    {tag}
                  </span>
                ))}
                {document.tags.length > MAX_VISIBLE_TAGS && (
                  <span className="doc-tags-overflow">
                    +{document.tags.length - MAX_VISIBLE_TAGS}
                  </span>
                )}
              </div>
            </Tooltip>
          ) : (
            <span className="doc-tags-placeholder">-</span>
          )}
        </td>

        {/* Column 8: Actions (kebab menu) */}
        <td className="viewer-document-cell viewer-actions-cell" role="cell">
          <div
            className="doc-row-actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DocumentKebabMenu
              doc={docForMenu}
              onAddItem={handleAddItem}
              onEdit={handleEdit}
              onArchive={handleArchive}
              onUnarchive={entry.archived ? handleUnarchive : undefined}
              onDelete={handleDelete}
            />
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row - spans all 8 columns */}
      {isExpanded && (
        <tr className="viewer-detail-row" role="row">
          <td colSpan={8} className="viewer-detail-cell" role="cell">
            <div className="viewer-detail-content">
              {document ? (
                <DocumentDetail
                  document={document}
                  isLoading={isLoading}
                  docPath={entry.path}
                  {...(onItemUpdate ? { onItemUpdate } : {})}
                  isItemUpdating={(itemId) =>
                    isItemUpdating ? isItemUpdating(entry.path, itemId) : false
                  }
                  fieldOptions={fieldOptions}
                  onAddFieldOption={onAddFieldOption}
                />
              ) : (
                <div className="detail-placeholder glass">
                  <p>
                    <strong>Failed to load document</strong>
                  </p>
                  <p>Path: {entry.path}</p>
                  <p>Document data could not be loaded. Check console for errors.</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

/**
 * Create a placeholder document from catalog entry for kebab menu
 * Used when the full document hasn't been loaded yet
 */
function createPlaceholderDoc(entry: CatalogEntry): RequestLogDoc {
  return {
    doc_id: entry.doc_id,
    title: entry.title,
    project_id: entry.project_id,
    items: [],
    items_index: [],
    tags: [],
    item_count: entry.item_count,
    created_at: entry.updated_at, // Use updated_at as fallback
    updated_at: entry.updated_at,
    archived: entry.archived ?? false,
  };
}

export default DocumentRow;
