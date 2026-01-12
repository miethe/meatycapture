/**
 * DocumentRow Component
 *
 * Renders a single document row in the catalog table.
 * Displays document metadata (doc_id, title, item_count, updated_at, tags).
 * Handles row expansion for detailed document view.
 *
 * Features:
 * - Click row to expand/collapse detail view
 * - Loading state during document fetch
 * - Tags displayed as chips
 * - Keyboard accessible (Enter to expand)
 * - Hover states for interaction feedback
 * - Kebab menu for document actions (Add Item, Edit, Archive, Delete)
 */

import React from 'react';
import { FileTextIcon, CalendarIcon, ChevronDownIcon, ArchiveIcon } from '@radix-ui/react-icons';
import type { CatalogEntry } from '@core/catalog';
import type { RequestLogDoc } from '@core/models';
import { DocumentDetail } from './DocumentDetail';
import { DocumentKebabMenu } from './DocumentKebabMenu';
import { DocumentStatusIndicator, TypeDistributionIndicator } from './components';

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
      priority?: string;
      status?: string;
      tags?: string[];
    }
  ) => void;

  /** Whether a specific item is updating */
  isItemUpdating?: (path: string, itemId: string) => boolean;
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
}: DocumentRowProps): React.JSX.Element {
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
        {/* Expand/Collapse Button */}
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

        {/* Type Distribution Indicator */}
        <td className="viewer-document-cell viewer-type-indicator-cell" role="cell">
          {document?.items && document.items.length > 0 ? (
            <TypeDistributionIndicator items={document.items} maxTypes={3} />
          ) : (
            <div className="viewer-type-indicator-placeholder" aria-hidden="true" />
          )}
        </td>

        {/* Document ID */}
        <td className="viewer-document-cell" role="cell">
          <div className="doc-id-container">
            <code className="doc-id-code">{entry.doc_id}</code>
            {entry.archived && (
              <span className="doc-archived-badge" role="status" aria-label="Archived document">
                <ArchiveIcon className="doc-archived-icon" aria-hidden="true" />
                <span className="doc-archived-text">Archived</span>
              </span>
            )}
          </div>
        </td>

        {/* Title */}
        <td className="viewer-document-cell viewer-title-cell" role="cell">
          {entry.title}
        </td>

        {/* Inline Metadata Display */}
        <td className="viewer-document-cell viewer-metadata-cell" role="cell">
          <div className="doc-row-metadata">
            {/* Status completion indicator when document loaded */}
            {document?.items && document.items.length > 0 ? (
              <DocumentStatusIndicator items={document.items} size="sm" />
            ) : (
              <span className="doc-meta-item">
                <FileTextIcon className="doc-meta-icon" aria-hidden="true" />
                <span className="doc-meta-value">{entry.item_count}</span>
              </span>
            )}
            <span className="doc-meta-item">
              <CalendarIcon className="doc-meta-icon" aria-hidden="true" />
              <time className="doc-meta-value" dateTime={entry.updated_at.toISOString()}>
                {formatDate(entry.updated_at)}
              </time>
            </span>
            {document && document.tags && document.tags.length > 0 && (
              <div className="doc-row-tags">
                {document.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="doc-tag-chip">
                    {tag}
                  </span>
                ))}
                {document.tags.length > 3 && (
                  <span className="doc-tag-more">+{document.tags.length - 3}</span>
                )}
              </div>
            )}
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
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="viewer-detail-row" role="row">
          <td colSpan={5} className="viewer-detail-cell" role="cell">
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
