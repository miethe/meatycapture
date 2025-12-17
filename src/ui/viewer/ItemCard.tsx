/**
 * ItemCard Component
 *
 * Displays a single request log item with all its fields.
 * Shows item metadata, tags, and markdown-rendered notes.
 *
 * Features:
 * - Copy item ID to clipboard
 * - Display all item fields (type, domain, context, priority, status)
 * - Tags as chips
 * - Markdown rendering for notes
 * - Accessible copy feedback
 */

import React, { useState } from 'react';
import type { RequestLogItem } from '@core/models';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ItemCardProps {
  /** Request log item to display */
  item: RequestLogItem;

  /** Callback when item ID is copied */
  onCopyId: (id: string) => void;
}

/**
 * ItemCard Component
 *
 * Card layout for displaying a single request log item.
 * Includes all metadata, tags, and notes with markdown rendering.
 *
 * @param props - ItemCardProps
 * @returns ItemCard component
 */
export function ItemCard({ item, onCopyId }: ItemCardProps): React.JSX.Element {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  /**
   * Handle copy item ID to clipboard
   */
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setCopyFeedback('Copied!');
      onCopyId(item.id);

      // Clear feedback after 2 seconds
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy item ID:', err);
      setCopyFeedback('Failed to copy');
      setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get color class for priority
   */
  const getPriorityClass = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'priority-critical';
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  /**
   * Get color class for status
   */
  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'done':
        return 'status-done';
      case 'in-progress':
        return 'status-in-progress';
      case 'planned':
        return 'status-planned';
      case 'backlog':
        return 'status-backlog';
      case 'triage':
        return 'status-triage';
      case 'wontfix':
        return 'status-wontfix';
      default:
        return '';
    }
  };

  return (
    <div className="viewer-item-card glass">
      {/* Item Header */}
      <div className="viewer-item-header">
        <div className="viewer-item-id-row">
          <code className="viewer-item-id">{item.id}</code>
          <button
            type="button"
            className="viewer-copy-button"
            onClick={handleCopyId}
            aria-label={`Copy item ID ${item.id}`}
            title="Copy item ID"
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
        <h3 className="viewer-item-title">{item.title}</h3>
      </div>

      {/* Item Metadata */}
      <div className="viewer-item-meta">
        <div className="viewer-item-meta-row">
          <div className="viewer-meta-field">
            <span className="meta-label">Type</span>
            <span className="meta-value type-badge">{item.type}</span>
          </div>

          <div className="viewer-meta-field">
            <span className="meta-label">Domain</span>
            <span className="meta-value">{item.domain}</span>
          </div>

          <div className="viewer-meta-field">
            <span className="meta-label">Context</span>
            <span className="meta-value">{item.context}</span>
          </div>
        </div>

        <div className="viewer-item-meta-row">
          <div className="viewer-meta-field">
            <span className="meta-label">Priority</span>
            <span className={`meta-value priority-badge ${getPriorityClass(item.priority)}`}>
              {item.priority}
            </span>
          </div>

          <div className="viewer-meta-field">
            <span className="meta-label">Status</span>
            <span className={`meta-value status-badge ${getStatusClass(item.status)}`}>
              {item.status}
            </span>
          </div>

          <div className="viewer-meta-field">
            <span className="meta-label">Created</span>
            <span className="meta-value viewer-item-date">{formatDate(item.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Item Tags */}
      {item.tags.length > 0 && (
        <div className="viewer-item-tags">
          <span className="meta-label">Tags</span>
          <div className="viewer-item-tags-list">
            {item.tags.map((tag) => (
              <span key={tag} className="chip viewer-item-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Item Notes (Markdown) */}
      {item.notes && (
        <div className="viewer-item-notes">
          <div className="viewer-item-notes-label">
            <span className="meta-label">Notes</span>
          </div>
          <MarkdownRenderer content={item.notes} className="viewer-item-notes-content" />
        </div>
      )}
    </div>
  );
}

export default ItemCard;
