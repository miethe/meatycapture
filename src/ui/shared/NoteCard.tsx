/**
 * NoteCard Component
 *
 * Displays a single structured note with metadata, content, and action icons.
 * Used in the Structured Notes feature for displaying note entries.
 *
 * Features:
 * - Type badge with color coding (General, Bug Fix Attempt, Validation, Other)
 * - Note content display (plain text for MVP)
 * - Created/updated timestamps
 * - Edit and delete action buttons
 * - Accessible with proper ARIA attributes
 * - Glass/x-morphism styling consistent with design system
 */

import React from 'react';
import type { Note } from '@core/models';
import { NOTE_TYPE_LABELS, NOTE_TYPE_COLORS } from '@core/models';
import './NoteCard.css';

/**
 * Edit icon SVG component (pencil)
 */
function EditIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/**
 * Delete icon SVG component (trash)
 */
function DeleteIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/**
 * Format a date for display in human-readable format.
 * Example: "Jan 3, 2026 at 10:30 AM"
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Check if two dates are different (ignoring milliseconds).
 * Used to determine whether to show "Updated" timestamp.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are different by more than 1 second
 */
function datesAreDifferent(date1: Date, date2: Date): boolean {
  // Consider dates different if they differ by more than 1 second
  return Math.abs(date1.getTime() - date2.getTime()) > 1000;
}

export interface NoteCardProps {
  /** The note to display */
  note: Note;
  /** Callback when edit button is clicked */
  onEdit: (note: Note) => void;
  /** Callback when delete button is clicked */
  onDelete: (note: Note) => void;
}

/**
 * NoteCard Component
 *
 * Displays a single structured note with type badge, content,
 * timestamps, and edit/delete actions.
 *
 * @param props - NoteCardProps
 * @returns NoteCard component
 */
export function NoteCard({ note, onEdit, onDelete }: NoteCardProps): React.JSX.Element {
  /**
   * Handle edit button click
   */
  const handleEdit = () => {
    onEdit(note);
  };

  /**
   * Handle delete button click
   */
  const handleDelete = () => {
    onDelete(note);
  };

  // Get display label and color class for note type
  const typeLabel = NOTE_TYPE_LABELS[note.type] || note.type;
  const typeColorClass = NOTE_TYPE_COLORS[note.type] || 'note-type-other';

  // Determine if we should show the updated timestamp
  const showUpdated = datesAreDifferent(note.created_at, note.updated_at);

  return (
    <article className="note-card glass" role="article" aria-label={`Note: ${typeLabel}`}>
      {/* Header with badge and actions */}
      <div className="note-card__header">
        <span className={`note-card__badge ${typeColorClass}`}>{typeLabel}</span>

        <div className="note-card__actions">
          <button
            type="button"
            className="note-card__action-button note-card__edit-button"
            onClick={handleEdit}
            aria-label={`Edit ${typeLabel} note`}
            title="Edit note"
          >
            <EditIcon />
          </button>
          <button
            type="button"
            className="note-card__action-button note-card__delete-button"
            onClick={handleDelete}
            aria-label={`Delete ${typeLabel} note`}
            title="Delete note"
          >
            <DeleteIcon />
          </button>
        </div>
      </div>

      {/* Note content */}
      <div className="note-card__content">
        <p className="note-card__text">{note.content}</p>
      </div>

      {/* Timestamps footer */}
      <div className="note-card__footer">
        <span className="note-card__timestamp">
          <span className="note-card__timestamp-label">Created:</span>{' '}
          <time dateTime={note.created_at.toISOString()}>{formatDate(note.created_at)}</time>
        </span>

        {showUpdated && (
          <span className="note-card__timestamp">
            <span className="note-card__timestamp-label">Updated:</span>{' '}
            <time dateTime={note.updated_at.toISOString()}>{formatDate(note.updated_at)}</time>
          </span>
        )}
      </div>
    </article>
  );
}

export default NoteCard;
