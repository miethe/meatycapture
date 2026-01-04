/**
 * ConfirmationDialog Component
 *
 * Generic modal dialog for delete/archive confirmation actions.
 * Glass morphism aesthetic with accessible keyboard navigation.
 * Implements focus trap, escape key handling, and loading states.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import './shared.css';

export interface ConfirmationDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Confirm button label (default: "Confirm") */
  confirmLabel?: string;
  /** Cancel button label (default: "Cancel") */
  cancelLabel?: string;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** If true, confirm button styled as dangerous (red) */
  isDangerous?: boolean;
  /** If true, show loading state on confirm button */
  isLoading?: boolean;
}

/**
 * Confirmation dialog with focus trap and keyboard support
 */
export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDangerous = false,
  isLoading = false,
}: ConfirmationDialogProps): React.JSX.Element | null {
  const [isExiting, setIsExiting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useRef(`dialog-title-${Math.random().toString(36).slice(2, 9)}`);
  const messageId = useRef(`dialog-message-${Math.random().toString(36).slice(2, 9)}`);

  // Handle close with exit animation
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onCancel();
    }, 200); // Match exit animation duration
  }, [onCancel]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        event.preventDefault();
        handleClose();
      }
    },
    [handleClose, isLoading]
  );

  // Focus trap implementation
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement | undefined;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

    if (!firstElement || !lastElement) return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Set up event listeners and initial focus
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open (safer default)
    cancelButtonRef.current?.focus();

    // Add event listeners
    const handleKeyDownWrapper = (event: KeyboardEvent) => {
      handleKeyDown(event);
      handleTabKey(event);
    };

    document.addEventListener('keydown', handleKeyDownWrapper);

    // Prevent body scroll when dialog is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDownWrapper);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleKeyDown, handleTabKey]);

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget && !isLoading) {
        handleClose();
      }
    },
    [handleClose, isLoading]
  );

  // Handle confirm action
  const handleConfirm = useCallback(() => {
    if (!isLoading) {
      onConfirm();
    }
  }, [onConfirm, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay ${isExiting ? 'modal-overlay-exit' : ''}`}
      onClick={handleOverlayClick}
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        className={`confirmation-dialog glass ${isExiting ? 'confirmation-dialog-exit' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        aria-describedby={messageId.current}
      >
        <h2 id={titleId.current} className="confirmation-dialog-title">
          {title}
        </h2>
        <p id={messageId.current} className="confirmation-dialog-message">
          {message}
        </p>
        <div className="confirmation-dialog-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="button secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={`button ${isDangerous ? 'danger' : 'primary'} ${isLoading ? 'loading' : ''}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="button-content-hidden">{confirmLabel}</span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationDialog;
