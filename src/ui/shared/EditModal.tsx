/**
 * EditModal Component
 *
 * A generic modal wrapper component for edit forms.
 * Provides consistent structure: header with title and close button,
 * scrollable content area, and footer with cancel/save buttons.
 *
 * Features:
 * - Focus trap (Tab cycles only within modal)
 * - Keyboard support (Escape closes modal)
 * - Loading state for save button
 * - Accessible ARIA attributes
 * - Glass morphism styling
 * - Respects prefers-reduced-motion
 */

import React, { useCallback, useEffect, useId } from 'react';
import { useFocusTrap } from './useFocusTrap';
import './shared.css';

export interface EditModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Form content (rendered in scrollable area) */
  children: React.ReactNode;
  /** Called when modal closes (cancel or X button) */
  onClose: () => void;
  /** Called when save clicked */
  onSave: () => void;
  /** Loading state for save button */
  isSaving?: boolean;
  /** Disable save button */
  saveDisabled?: boolean;
  /** Custom save button label (default: "Save") */
  saveLabel?: string;
  /** Custom cancel button label (default: "Cancel") */
  cancelLabel?: string;
  /** Optional width override (default: "32rem") */
  width?: string;
}

export function EditModal({
  isOpen,
  title,
  children,
  onClose,
  onSave,
  isSaving = false,
  saveDisabled = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  width = '32rem',
}: EditModalProps): React.JSX.Element | null {
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Handle overlay click (close modal if not saving)
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking the overlay itself, not the modal content
      if (event.target === event.currentTarget && !isSaving) {
        onClose();
      }
    },
    [isSaving, onClose]
  );

  // Handle Escape key at document level for reliable keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  // Handle save button click
  const handleSave = useCallback(() => {
    if (!isSaving && !saveDisabled) {
      onSave();
    }
  }, [isSaving, saveDisabled, onSave]);

  // Handle cancel button click
  const handleCancel = useCallback(() => {
    if (!isSaving) {
      onClose();
    }
  }, [isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay edit-modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="edit-modal glass"
        style={{ width, maxWidth: '90vw' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="edit-modal-header">
          <h2 id={titleId} className="edit-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="edit-modal-close"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Close modal"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="edit-modal-content">{children}</div>

        {/* Footer */}
        <div className="edit-modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handleSave}
            disabled={isSaving || saveDisabled}
          >
            {isSaving && <span className="spinner" aria-hidden="true" />}
            <span className={isSaving ? 'sr-only' : undefined}>
              {isSaving ? 'Saving...' : saveLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditModal;
