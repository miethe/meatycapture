/**
 * NoteModal Component
 *
 * Modal dialog for creating and editing structured notes.
 * Provides type selection, markdown content editing, and character counting.
 *
 * Features:
 * - Focus trap within modal
 * - Keyboard support (Escape closes modal)
 * - Accessible ARIA attributes
 * - Glass morphism styling
 * - Character count with limit display
 * - Inline validation errors
 * - Edit mode with pre-filled data
 * - Respects prefers-reduced-motion
 */

import React, { useState, useCallback, useEffect, useId, useRef } from 'react';
import {
  Note,
  NoteType,
  NOTE_TYPES,
  NOTE_TYPE_OPTIONS,
  NOTE_MAX_CONTENT_LENGTH,
} from '@core/models';
import { MarkdownEditor } from './MarkdownEditor';
import { useFocusTrap } from './useFocusTrap';
import './shared.css';

/**
 * Props for the NoteModal component
 */
export interface NoteModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Initial note data for edit mode (optional) */
  initialNote?: Note;
  /** Called when user saves the note */
  onSave: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => void;
  /** Called when user cancels (closes modal without saving) */
  onCancel: () => void;
}

/**
 * Modal dialog for creating and editing notes
 */
export function NoteModal({
  isOpen,
  initialNote,
  onSave,
  onCancel,
}: NoteModalProps): React.JSX.Element | null {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const previousActiveElement = useRef<Element | null>(null);

  // Form state
  const [type, setType] = useState<NoteType>(NOTE_TYPES.General);
  const [content, setContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Determine if we're in edit mode
  const isEditMode = !!initialNote;

  // Reset form when modal opens or initialNote changes
  useEffect(() => {
    if (isOpen) {
      // Store the active element to restore focus on close
      previousActiveElement.current = document.activeElement;

      if (initialNote) {
        // Edit mode: pre-fill form
        setType(initialNote.type);
        setContent(initialNote.content);
      } else {
        // Create mode: reset to defaults
        setType(NOTE_TYPES.General);
        setContent('');
      }
      setValidationError(null);
    }
  }, [isOpen, initialNote]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current instanceof HTMLElement) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle overlay click (close modal if clicking outside dialog)
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  // Handle type dropdown change
  const handleTypeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setType(event.target.value as NoteType);
    setValidationError(null);
  }, []);

  // Handle content change from MarkdownEditor
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setValidationError(null);
  }, []);

  // Validate form and save
  const handleSave = useCallback(() => {
    // Validate content is not empty
    if (!content.trim()) {
      setValidationError('Note content cannot be empty');
      return;
    }

    // Validate content length
    if (content.length > NOTE_MAX_CONTENT_LENGTH) {
      setValidationError(
        `Content exceeds maximum length of ${NOTE_MAX_CONTENT_LENGTH.toLocaleString()} characters`
      );
      return;
    }

    // Build note data
    const noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
      type,
      content: content.trim(),
    };

    // Include original ID for edit mode
    if (initialNote) {
      noteData.id = initialNote.id;
    }

    onSave(noteData);
  }, [type, content, initialNote, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Calculate character count info
  const characterCount = content.length;
  const isOverLimit = characterCount > NOTE_MAX_CONTENT_LENGTH;
  const characterCountDisplay = `${characterCount.toLocaleString()} / ${NOTE_MAX_CONTENT_LENGTH.toLocaleString()}`;

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay note-modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="note-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        {/* Header */}
        <div className="note-modal-header">
          <h2 id={titleId} className="note-modal-title">
            {isEditMode ? 'Edit Note' : 'Add Note'}
          </h2>
          <button
            type="button"
            className="note-modal-close"
            onClick={handleCancel}
            aria-label="Close modal"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {/* Description for screen readers */}
        <p id={descriptionId} className="sr-only">
          {isEditMode
            ? 'Edit the note type and content, then save your changes.'
            : 'Select a note type and enter content to create a new note.'}
        </p>

        {/* Content */}
        <div className="note-modal-content">
          {/* Type Dropdown */}
          <div className="field-container">
            <label className="field-label required" htmlFor="note-type-select">
              Type
            </label>
            <select
              id="note-type-select"
              className="input-base select-base"
              value={type}
              onChange={handleTypeChange}
              aria-required="true"
            >
              {NOTE_TYPE_OPTIONS.map((noteType) => (
                <option key={noteType} value={noteType}>
                  {noteType}
                </option>
              ))}
            </select>
          </div>

          {/* Content Editor */}
          <div className="field-container">
            <div className="note-modal-content-label-row">
              <label className="field-label required" id="note-content-label">
                Content
              </label>
              <span
                className={`note-modal-char-count ${isOverLimit ? 'note-modal-char-count-error' : ''}`}
                aria-live="polite"
                aria-atomic="true"
              >
                {characterCountDisplay}
              </span>
            </div>
            <MarkdownEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Enter note content (supports markdown)..."
              maxLength={NOTE_MAX_CONTENT_LENGTH}
              disabled={false}
              className={validationError || isOverLimit ? 'note-modal-editor-error' : ''}
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="error-message error-shake" id="note-validation-error" role="alert">
              {validationError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="note-modal-footer">
          <button type="button" className="button secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handleSave}
            disabled={isOverLimit}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default NoteModal;
