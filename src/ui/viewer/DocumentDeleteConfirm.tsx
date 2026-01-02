/**
 * DocumentDeleteConfirm Component
 *
 * Delete confirmation dialog for documents with cascading items count warning.
 * Uses ConfirmationDialog with dangerous styling for destructive action.
 */

import React from 'react';
import { ConfirmationDialog } from '@ui/shared/ConfirmationDialog';
import type { RequestLogDoc } from '@core/models';

export interface DocumentDeleteConfirmProps {
  /** Document to be deleted */
  doc: RequestLogDoc;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Called when user confirms delete */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Generate contextual delete message based on item count
 */
function getDeleteMessage(doc: RequestLogDoc): string {
  const { doc_id, item_count } = doc;

  if (item_count === 0) {
    return `Delete empty document ${doc_id}? This cannot be undone.`;
  }

  if (item_count === 1) {
    return `Delete document ${doc_id} with 1 item? This cannot be undone.`;
  }

  return `Delete document ${doc_id} with ${item_count} items? This cannot be undone.`;
}

/**
 * Document delete confirmation dialog
 * Shows warning message with item count and doc_id
 */
export function DocumentDeleteConfirm({
  doc,
  isOpen,
  onConfirm,
  onCancel,
}: DocumentDeleteConfirmProps): React.JSX.Element {
  const message = getDeleteMessage(doc);

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title="Delete Document"
      message={message}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      isDangerous={true}
    />
  );
}

export default DocumentDeleteConfirm;
