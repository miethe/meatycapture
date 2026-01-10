/**
 * ReviewStep Component
 *
 * Final review and submit step of the capture wizard.
 * Displays a summary of all captured data and handles submission.
 * Fourth step in the wizard flow (Project -> Doc -> Item -> Review).
 *
 * Features:
 * - Project and document summary
 * - Item details with metadata badges
 * - Structured notes display with type grouping
 * - Inline note editing via NoteModal
 * - Delete confirmation for notes
 */

import React, { useState, useCallback } from 'react';
import { StepShell } from '../shared/StepShell';
import { NotesList } from '../shared/NotesList';
import { NoteModal } from '../shared/NoteModal';
import { ConfirmationDialog } from '../shared/ConfirmationDialog';
import type { Project, ItemDraft, Note } from '../../core/models';
import './wizard.css';

interface ReviewStepProps {
  /** Selected project */
  project: Project;
  /** Document path (full path to file) */
  docPath: string;
  /** Whether creating a new document */
  isNewDoc: boolean;
  /** Item draft to review */
  draft: ItemDraft;
  /** Called when user clicks Back button */
  onBack: () => void;
  /** Called when user submits the form */
  onSubmit: () => Promise<void>;
  /** Called when user clicks Add Another after successful submit */
  onAddAnother: () => void;
  /** Called when user clicks Done to complete the wizard */
  onComplete: () => void;
  /** Called when a note is added */
  onAddNote?: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => void;
  /** Called when a note is edited */
  onEditNote?: (note: Note) => void;
  /** Called when a note is deleted */
  onDeleteNote?: (noteId: string) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Whether submission was successful */
  submitSuccess?: boolean;
}

export function ReviewStep({
  project,
  docPath,
  isNewDoc,
  draft,
  onBack,
  onSubmit,
  onAddAnother,
  onComplete,
  onAddNote,
  onEditNote,
  onDeleteNote,
  isSubmitting = false,
  submitSuccess = false,
}: ReviewStepProps): React.JSX.Element {
  // ============================================================================
  // State for Notes Management
  // ============================================================================

  // NoteModal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // ============================================================================
  // Notes Handlers
  // ============================================================================

  /**
   * Open NoteModal for adding a new note
   */
  const handleOpenAddNote = useCallback(() => {
    setEditingNote(undefined);
    setIsNoteModalOpen(true);
  }, []);

  /**
   * Open NoteModal for editing an existing note
   */
  const handleOpenEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  }, []);

  /**
   * Close NoteModal without saving
   */
  const handleCloseNoteModal = useCallback(() => {
    setIsNoteModalOpen(false);
    setEditingNote(undefined);
  }, []);

  /**
   * Save note from modal (add or edit)
   */
  const handleSaveNote = useCallback(
    (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (noteData.id && editingNote) {
        // Editing existing note
        if (onEditNote) {
          const updatedNote: Note = {
            ...editingNote,
            type: noteData.type,
            content: noteData.content,
            updated_at: new Date(),
          };
          onEditNote(updatedNote);
        }
      } else {
        // Adding new note
        if (onAddNote) {
          onAddNote({
            type: noteData.type,
            content: noteData.content,
          });
        }
      }
      handleCloseNoteModal();
    },
    [editingNote, onAddNote, onEditNote, handleCloseNoteModal]
  );

  /**
   * Open delete confirmation dialog
   */
  const handleOpenDeleteConfirm = useCallback((note: Note) => {
    setNoteToDelete(note);
    setIsDeleteDialogOpen(true);
  }, []);

  /**
   * Close delete confirmation dialog
   */
  const handleCloseDeleteConfirm = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setNoteToDelete(null);
  }, []);

  /**
   * Confirm note deletion
   */
  const handleConfirmDelete = useCallback(() => {
    if (noteToDelete && onDeleteNote) {
      onDeleteNote(noteToDelete.id);
    }
    handleCloseDeleteConfirm();
  }, [noteToDelete, onDeleteNote, handleCloseDeleteConfirm]);

  // ============================================================================
  // Submit Handler
  // ============================================================================

  // Handle submit button click
  const handleSubmit = async () => {
    await onSubmit();
  };

  // Success state - show completion message and options
  if (submitSuccess) {
    return (
      <StepShell
        stepNumber={4}
        totalSteps={4}
        title="Success!"
        subtitle="Your request has been saved"
        showBack={false}
      >
        <div className="review-success" role="status" aria-live="polite">
          <div className="success-icon" role="img" aria-label="Success checkmark">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="var(--color-success)"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M20 32L28 40L44 24"
                stroke="var(--color-success)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="success-message">Your request has been successfully saved to:</p>
          <div className="success-path" aria-label={`Saved to ${docPath}`}>
            <code>{docPath}</code>
          </div>
          <div className="success-actions">
            <button
              type="button"
              className="button primary"
              onClick={onAddAnother}
              aria-label="Add another item to this document"
            >
              Add Another Item
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={onComplete}
              aria-label="Start a new capture session"
            >
              Done
            </button>
          </div>
        </div>
      </StepShell>
    );
  }

  // Review state - show summary and submit button
  return (
    <StepShell
      stepNumber={4}
      totalSteps={4}
      title="Review & Submit"
      subtitle="Confirm your request before saving"
      onBack={onBack}
      showBack={!isSubmitting}
    >
      <div className="review-container">
        {/* Project & Document Info */}
        <section className="review-section">
          <h3 className="review-section-title">Project & Document</h3>
          <div className="review-card">
            <div className="review-field">
              <span className="review-label">Project:</span>
              <span className="review-value">{project.name}</span>
            </div>
            <div className="review-field">
              <span className="review-label">Path:</span>
              <span className="review-value review-code">{project.default_path}</span>
            </div>
            <div className="review-field">
              <span className="review-label">Document:</span>
              <div className="review-value-with-badge">
                <span className="review-code">{docPath}</span>
                <span className={`review-badge ${isNewDoc ? 'new' : 'existing'}`}>
                  {isNewDoc ? 'New' : 'Existing'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Item Details */}
        <section className="review-section">
          <h3 className="review-section-title">Request Details</h3>
          <div className="review-card">
            <div className="review-field full-width">
              <h4 className="review-item-title">{draft.title}</h4>
            </div>

            <div className="review-metadata">
              <div className="review-metadata-item">
                <span className="review-label">Type:</span>
                <span className="review-value review-badge-inline type">{draft.type}</span>
              </div>
              {draft.domain.length > 0 && (
                <div className="review-field">
                  <span className="review-label">Domain:</span>
                  <div className="review-badges">
                    {draft.domain.map((d) => (
                      <span key={d} className="review-badge-inline domain">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {draft.subdomain.length > 0 && (
                <div className="review-field">
                  <span className="review-label">Subdomain:</span>
                  <div className="review-badges">
                    {draft.subdomain.map((s) => (
                      <span key={s} className="review-badge-inline subdomain">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {draft.context && (
                <div className="review-field">
                  <span className="review-label">Context:</span>
                  <span className="review-value">{draft.context}</span>
                </div>
              )}
              <div className="review-metadata-item">
                <span className="review-label">Priority:</span>
                <span className="review-value review-badge-inline priority">{draft.priority}</span>
              </div>
              <div className="review-metadata-item">
                <span className="review-label">Status:</span>
                <span className="review-value review-badge-inline status">{draft.status}</span>
              </div>
            </div>

            {/* Tags */}
            {draft.tags.length > 0 && (
              <div className="review-field full-width">
                <span className="review-label">Tags:</span>
                <div className="review-tags">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Structured Notes Section */}
        <section className="review-section">
          <h3 className="review-section-title">Notes</h3>
          <NotesList
            notes={draft.notes || []}
            onAddNote={handleOpenAddNote}
            onEditNote={handleOpenEditNote}
            onDeleteNote={handleOpenDeleteConfirm}
          />
        </section>

        {/* Submit Button */}
        <div className="review-submit">
          <button
            type="button"
            className="button primary submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="Submit request"
          >
            {isSubmitting && <span className="spinner" />}
            {isSubmitting ? 'Saving...' : 'Submit Request'}
          </button>
        </div>
      </div>

      {/* Note Modal for Add/Edit */}
      <NoteModal
        isOpen={isNoteModalOpen}
        {...(editingNote ? { initialNote: editingNote } : {})}
        onSave={handleSaveNote}
        onCancel={handleCloseNoteModal}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Note"
        message={
          noteToDelete
            ? `Are you sure you want to delete this ${noteToDelete.type} note? This action cannot be undone.`
            : 'Are you sure you want to delete this note?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCloseDeleteConfirm}
        isDangerous={true}
      />
    </StepShell>
  );
}

export default ReviewStep;
