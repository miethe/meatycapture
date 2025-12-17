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
 */

import React from 'react';
import { FileTextIcon, CalendarIcon, ChevronDownIcon, DotsVerticalIcon } from '@radix-ui/react-icons';
import type { CatalogEntry } from '@core/catalog';
import type { RequestLogDoc } from '@core/models';
import { DocumentDetail } from './DocumentDetail';

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
   * Handle menu button click
   * Prevents row expansion and shows placeholder console log
   */
  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    // Placeholder - menu will be added later
    console.log('Menu clicked for:', entry.doc_id);
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

  return (
    <>
      <tr
        className={`viewer-document-row ${isExpanded ? 'expanded' : ''}`}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-expanded={isExpanded}
        aria-label={`Document ${entry.doc_id}: ${entry.title}, ${entry.item_count} items, updated ${formatDate(entry.updated_at)}`}
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

        {/* Document ID */}
        <td className="viewer-document-cell" role="cell">
          <code className="doc-id-code">{entry.doc_id}</code>
        </td>

        {/* Title */}
        <td className="viewer-document-cell viewer-title-cell" role="cell">
          {entry.title}
        </td>

        {/* Inline Metadata Display */}
        <td className="viewer-document-cell viewer-metadata-cell" role="cell">
          <div className="doc-row-metadata">
            <span className="doc-meta-item">
              <FileTextIcon className="doc-meta-icon" aria-hidden="true" />
              <span className="doc-meta-value">{entry.item_count}</span>
            </span>
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
            <div className="doc-row-actions">
              <button
                type="button"
                className="doc-row-menu-btn"
                onClick={handleMenuClick}
                aria-label="More actions"
                title="More actions"
              >
                <DotsVerticalIcon aria-hidden="true" />
              </button>
            </div>
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="viewer-detail-row" role="row">
          <td colSpan={4} className="viewer-detail-cell" role="cell">
            <div className="viewer-detail-content">
              {document ? (
                <DocumentDetail document={document} isLoading={isLoading} />
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

export default DocumentRow;
