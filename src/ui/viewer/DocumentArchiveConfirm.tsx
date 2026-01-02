/**
 * DocumentArchiveConfirm Component
 *
 * Confirmation dialog for archive/unarchive document operations.
 * Archive is a non-destructive operation that hides documents from active view.
 * Documents can be restored later from the Archived filter.
 *
 * Supports both archive (active -> archived) and unarchive (archived -> active) modes
 * via a single component with mode prop.
 */

import React from 'react';
import { ConfirmationDialog } from '@ui/shared/ConfirmationDialog';
import type { RequestLogDoc } from '@core/models';

/**
 * Mode for archive confirmation dialog
 * - 'archive': Archiving an active document
 * - 'unarchive': Restoring an archived document
 */
export type ArchiveMode = 'archive' | 'unarchive';

export interface DocumentArchiveConfirmProps {
  /** Document to archive/unarchive */
  doc: RequestLogDoc;
  /** Whether dialog is open */
  isOpen: boolean;
  /** Archive mode - determines dialog text and behavior */
  mode: ArchiveMode;
  /** Called when user confirms archive/unarchive */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether operation is in progress (shows loading state) */
  isLoading?: boolean;
}

/**
 * Dialog content configuration based on mode
 */
interface DialogContent {
  title: string;
  message: string;
  confirmLabel: string;
}

/**
 * Get dialog content based on archive mode
 */
function getDialogContent(doc: RequestLogDoc, mode: ArchiveMode): DialogContent {
  if (mode === 'unarchive') {
    return {
      title: 'Unarchive Document',
      message: `Restore document ${doc.doc_id} to active documents?`,
      confirmLabel: 'Unarchive',
    };
  }

  return {
    title: 'Archive Document',
    message: `Archive document ${doc.doc_id}? You can restore it later from the Archived filter.`,
    confirmLabel: 'Archive',
  };
}

/**
 * Confirmation dialog for document archive/unarchive operations
 *
 * @example
 * // Archive mode
 * <DocumentArchiveConfirm
 *   doc={activeDoc}
 *   isOpen={showArchiveDialog}
 *   mode="archive"
 *   onConfirm={handleArchive}
 *   onCancel={closeDialog}
 * />
 *
 * @example
 * // Unarchive mode
 * <DocumentArchiveConfirm
 *   doc={archivedDoc}
 *   isOpen={showUnarchiveDialog}
 *   mode="unarchive"
 *   onConfirm={handleUnarchive}
 *   onCancel={closeDialog}
 * />
 */
export function DocumentArchiveConfirm({
  doc,
  isOpen,
  mode,
  onConfirm,
  onCancel,
  isLoading = false,
}: DocumentArchiveConfirmProps): React.JSX.Element | null {
  const { title, message, confirmLabel } = getDialogContent(doc, mode);

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      isDangerous={false}
      isLoading={isLoading}
    />
  );
}

export default DocumentArchiveConfirm;
