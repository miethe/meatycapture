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
        aria-label={`Document ${entry.doc_id}: ${entry.title}`}
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
              <span className="expand-icon" aria-hidden="true">
                {isExpanded ? '▼' : '▶'}
              </span>
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

        {/* Item Count */}
        <td className="viewer-document-cell viewer-count-cell" role="cell">
          {entry.item_count}
        </td>

        {/* Updated Date */}
        <td className="viewer-document-cell viewer-date-cell" role="cell">
          <time dateTime={entry.updated_at.toISOString()}>
            {formatDate(entry.updated_at)}
          </time>
        </td>

        {/* Tags */}
        <td className="viewer-document-cell viewer-tags-cell" role="cell">
          {/* Tags will be loaded from full document, placeholder for now */}
          <div className="tags-container">
            <span className="tags-placeholder">—</span>
          </div>
        </td>
      </tr>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <tr className="viewer-detail-row" role="row">
          <td colSpan={6} className="viewer-detail-cell" role="cell">
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
