/**
 * ItemCard Component
 *
 * Displays a single request log item with all its fields.
 * Shows item metadata, tags, and structured notes with CRUD operations.
 *
 * Features:
 * - Copy item ID to clipboard
 * - Display all item fields (type, domain, context, priority, status)
 * - Tags as chips
 * - Structured notes with NotesList component (grouped by type)
 * - Add/Edit/Delete notes with modal and confirmation dialog
 * - Accessible copy feedback
 * - Edit and Delete action buttons
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { RequestLogItem, Note, NoteType } from '@core/models';
import { NotesList } from '@ui/shared/NotesList';
import { NoteTypeFilter } from '@ui/shared/NoteTypeFilter';
import { NoteModal } from '@ui/shared/NoteModal';
import { ConfirmationDialog } from '@ui/shared/ConfirmationDialog';

/**
 * Edit icon SVG component (pencil)
 */
function EditIcon(): React.JSX.Element {
  return (
    <svg
      width="24"
      height="24"
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
      width="24"
      height="24"
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

export interface ItemCardProps {
  /** Request log item to display */
  item: RequestLogItem;

  /** Callback when item ID is copied */
  onCopyId: (id: string) => void;

  /** Callback when edit button is clicked (optional) */
  onEdit?: (item: RequestLogItem) => void;

  /** Callback when delete button is clicked (optional) */
  onDelete?: (item: RequestLogItem) => void;

  /** Callback when a note is added (optional - for persistence) */
  onNoteAdd?: (note: Note) => void;

  /** Callback when a note is edited (optional - for persistence) */
  onNoteEdit?: (note: Note) => void;

  /** Callback when a note is deleted (optional - for persistence) */
  onNoteDelete?: (noteId: string) => void;
}

/**
 * ItemCard Component
 *
 * Card layout for displaying a single request log item.
 * Includes all metadata, tags, and structured notes with CRUD operations.
 *
 * @param props - ItemCardProps
 * @returns ItemCard component
 */
export function ItemCard({
  item,
  onCopyId,
  onEdit,
  onDelete,
  onNoteAdd,
  onNoteEdit,
  onNoteDelete,
}: ItemCardProps): React.JSX.Element {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Note type filter state (empty array = show all types)
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteType[]>([]);

  // Note management state
  const [localNotes, setLocalNotes] = useState<Note[]>(item.notes || []);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Sync local notes when item.notes changes from parent
  useEffect(() => {
    setLocalNotes(item.notes || []);
  }, [item.notes]);

  /**
   * Handle edit button click
   */
  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
  };

  /**
   * Handle delete button click
   */
  const handleDelete = () => {
    if (onDelete) {
      onDelete(item);
    }
  };

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

  // -------------------------------------------------------------------------
  // Note CRUD handlers
  // -------------------------------------------------------------------------

  /**
   * Open NoteModal for adding a new note
   */
  const handleAddNote = useCallback(() => {
    setNoteToEdit(null);
    setIsNoteModalOpen(true);
  }, []);

  /**
   * Open NoteModal for editing an existing note
   */
  const handleEditNote = useCallback((note: Note) => {
    setNoteToEdit(note);
    setIsNoteModalOpen(true);
  }, []);

  /**
   * Open delete confirmation dialog for a note
   */
  const handleDeleteNoteClick = useCallback((note: Note) => {
    setNoteToDelete(note);
    setIsDeleteConfirmOpen(true);
  }, []);

  /**
   * Handle saving a note from NoteModal (add or edit)
   */
  const handleNoteSave = useCallback(
    (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      const now = new Date();

      if (noteToEdit && noteData.id) {
        // Edit mode: update existing note
        const updatedNote: Note = {
          ...noteToEdit,
          type: noteData.type,
          content: noteData.content,
          updated_at: now,
        };

        // Update local state immediately for responsive UX
        setLocalNotes((prev) =>
          prev.map((n) => (n.id === updatedNote.id ? updatedNote : n))
        );

        // Call persistence callback if provided
        if (onNoteEdit) {
          onNoteEdit(updatedNote);
        }
      } else {
        // Add mode: create new note with temporary ID
        const newNote: Note = {
          id: crypto.randomUUID(),
          type: noteData.type,
          content: noteData.content,
          created_at: now,
          updated_at: now,
        };

        // Update local state immediately for responsive UX
        setLocalNotes((prev) => [...prev, newNote]);

        // Call persistence callback if provided
        if (onNoteAdd) {
          onNoteAdd(newNote);
        }
      }

      // Close modal and reset edit state
      setIsNoteModalOpen(false);
      setNoteToEdit(null);
    },
    [noteToEdit, onNoteAdd, onNoteEdit]
  );

  /**
   * Handle canceling the NoteModal
   */
  const handleNoteModalCancel = useCallback(() => {
    setIsNoteModalOpen(false);
    setNoteToEdit(null);
  }, []);

  /**
   * Handle confirming note deletion
   */
  const handleDeleteNoteConfirm = useCallback(() => {
    if (noteToDelete) {
      // Update local state immediately for responsive UX
      setLocalNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id));

      // Call persistence callback if provided
      if (onNoteDelete) {
        onNoteDelete(noteToDelete.id);
      }
    }

    // Close dialog and reset state
    setIsDeleteConfirmOpen(false);
    setNoteToDelete(null);
  }, [noteToDelete, onNoteDelete]);

  /**
   * Handle canceling note deletion
   */
  const handleDeleteNoteCancel = useCallback(() => {
    setIsDeleteConfirmOpen(false);
    setNoteToDelete(null);
  }, []);

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

          {/* Action buttons - only show if callbacks are provided */}
          {(onEdit || onDelete) && (
            <div className="viewer-item-actions">
              {onEdit && (
                <button
                  type="button"
                  className="viewer-item-action-button viewer-item-edit-button"
                  onClick={handleEdit}
                  aria-label={`Edit item ${item.id}`}
                  title="Edit item"
                >
                  <EditIcon />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="viewer-item-action-button viewer-item-delete-button"
                  onClick={handleDelete}
                  aria-label={`Delete item ${item.id}`}
                  title="Delete item"
                >
                  <DeleteIcon />
                </button>
              )}
            </div>
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

          {/* Show Modified date only when item has been modified after creation */}
          {item.modified_at && item.modified_at.getTime() !== item.created_at.getTime() && (
            <div className="viewer-meta-field">
              <span className="meta-label">Modified</span>
              <span className="meta-value viewer-item-date">{formatDate(item.modified_at)}</span>
            </div>
          )}
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

      {/* Item Notes - Structured Notes with NotesList */}
      <div className="viewer-item-notes">
        <NotesList
          notes={localNotes}
          activeFilter={noteTypeFilter}
          filterSlot={
            <NoteTypeFilter
              value={noteTypeFilter}
              onChange={setNoteTypeFilter}
            />
          }
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNoteClick}
        />
      </div>

      {/* NoteModal for add/edit operations */}
      <NoteModal
        isOpen={isNoteModalOpen}
        {...(noteToEdit ? { initialNote: noteToEdit } : {})}
        onSave={handleNoteSave}
        onCancel={handleNoteModalCancel}
      />

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Note"
        message={
          noteToDelete
            ? `Are you sure you want to delete this ${noteToDelete.type.toLowerCase()} note? This action cannot be undone.`
            : 'Are you sure you want to delete this note?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteNoteConfirm}
        onCancel={handleDeleteNoteCancel}
        isDangerous={true}
      />
    </div>
  );
}

export default ItemCard;
