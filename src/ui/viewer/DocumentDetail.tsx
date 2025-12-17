/**
 * DocumentDetail Component
 *
 * Expanded view of a request log document.
 * Displays document header, tags, items index, and full item details.
 *
 * Features:
 * - Document metadata (doc_id, title, item_count, updated_at)
 * - Tags as chips
 * - Collapsible items index (id, type, title)
 * - Full item cards with markdown rendering
 * - Copy document ID to clipboard
 * - Loading state skeleton
 * - Error handling
 */

import React, { useState } from 'react';
import type { RequestLogDoc } from '@core/models';
import { ItemCard } from './ItemCard';

export interface DocumentDetailProps {
  /** Full document with all items */
  document: RequestLogDoc;

  /** Loading state while fetching document */
  isLoading: boolean;
}

/**
 * DocumentDetail Component
 *
 * Main detail view for a request log document.
 * Shows all document metadata and item cards.
 *
 * @param props - DocumentDetailProps
 * @returns DocumentDetail component
 */
export function DocumentDetail({
  document,
  isLoading,
}: DocumentDetailProps): React.JSX.Element {
  const [showItemsIndex, setShowItemsIndex] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  /**
   * Handle copy document ID to clipboard
   */
  const handleCopyDocId = async () => {
    try {
      await navigator.clipboard.writeText(document.doc_id);
      setCopyFeedback('Copied!');

      // Clear feedback after 2 seconds
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy document ID:', err);
      setCopyFeedback('Failed to copy');
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    }
  };

  /**
   * Handle copy item ID (bubbled from ItemCard)
   */
  const handleCopyItemId = (itemId: string) => {
    console.info(`[DocumentDetail] Item ID copied: ${itemId}`);
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Toggle items index visibility
   */
  const handleToggleIndex = () => {
    setShowItemsIndex((prev) => !prev);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="viewer-document-detail" aria-busy="true" aria-live="polite">
        <div className="viewer-document-header">
          <div className="skeleton skeleton-text large" aria-label="Loading document header" />
          <div className="skeleton skeleton-text" aria-label="Loading document metadata" />
        </div>
        <div className="skeleton skeleton-card" aria-label="Loading items" />
      </div>
    );
  }

  return (
    <div className="viewer-document-detail">
      {/* Document Header */}
      <div className="viewer-document-header">
        <div className="viewer-document-id-row">
          <code className="viewer-document-id">{document.doc_id}</code>
          <button
            type="button"
            className="viewer-copy-button"
            onClick={handleCopyDocId}
            aria-label={`Copy document ID ${document.doc_id}`}
            title="Copy document ID"
          >
            <span className="copy-icon" aria-hidden="true">
              📋
            </span>
          </button>
          {copyFeedback && (
            <span className="copy-feedback" role="status" aria-live="polite">
              {copyFeedback}
            </span>
          )}
        </div>

        <h3 className="viewer-document-title">{document.title}</h3>

        <div className="viewer-document-meta">
          <div className="viewer-document-meta-item">
            <span className="meta-label">Item Count</span>
            <span className="meta-value">{document.item_count}</span>
          </div>
          <div className="viewer-document-meta-item">
            <span className="meta-label">Updated</span>
            <span className="meta-value">{formatDate(document.updated_at)}</span>
          </div>
          <div className="viewer-document-meta-item">
            <span className="meta-label">Created</span>
            <span className="meta-value">{formatDate(document.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Document Tags */}
      {document.tags.length > 0 && (
        <div className="viewer-document-tags">
          <span className="meta-label">Document Tags</span>
          <div className="viewer-document-tags-list">
            {document.tags.map((tag) => (
              <span key={tag} className="chip viewer-document-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items Index Summary (Collapsible) */}
      <div className="viewer-items-index">
        <button
          type="button"
          className="viewer-items-index-toggle"
          onClick={handleToggleIndex}
          aria-expanded={showItemsIndex}
          aria-controls="items-index-list"
        >
          <span
            className="viewer-index-chevron"
            aria-hidden="true"
            style={{
              transform: showItemsIndex ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
          <span className="viewer-index-title">Items Index ({document.items_index.length})</span>
        </button>

        {showItemsIndex && (
          <div
            id="items-index-list"
            className="viewer-items-index-list"
            role="region"
            aria-label="Items index"
          >
            {document.items_index.map((indexEntry) => (
              <div key={indexEntry.id} className="viewer-index-entry">
                <code className="viewer-index-id">{indexEntry.id}</code>
                <span className="viewer-index-type type-badge">{indexEntry.type}</span>
                <span className="viewer-index-title-text">{indexEntry.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Cards */}
      <div className="viewer-items-list" role="list" aria-label="Request log items">
        {document.items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true">
              📄
            </span>
            <h3 className="empty-state-title">No Items</h3>
            <p className="empty-state-description">This document has no items.</p>
          </div>
        ) : (
          document.items.map((item) => (
            <div key={item.id} role="listitem">
              <ItemCard item={item} onCopyId={handleCopyItemId} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DocumentDetail;
