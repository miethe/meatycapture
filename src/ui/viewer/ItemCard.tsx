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
 * - Note count badge with type breakdown tooltip
 * - Add/Edit/Delete notes with modal and confirmation dialog
 * - Accessible copy feedback
 * - Edit and Delete action buttons
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import type { RequestLogItem, Note, NoteType } from '@core/models';
import { DEFAULT_FIELD_OPTIONS, NOTE_TYPE_LABELS } from '@core/models';
import { NotesList } from '@ui/shared/NotesList';
import { NoteTypeFilter } from '@ui/shared/NoteTypeFilter';
import { NoteModal } from '@ui/shared/NoteModal';
import { ConfirmationDialog } from '@ui/shared/ConfirmationDialog';
import { DropdownWithAdd } from '@ui/shared/DropdownWithAdd';
import { MultiSelectCombobox } from '@ui/shared/MultiSelectCombobox';
import { MultiSelectWithAdd } from '@ui/shared/MultiSelectWithAdd';
import { Tooltip } from '@ui/shared/Tooltip';
import { aggregateNoteTypeCounts } from './utils/indicators';
import { StatusIndicator } from './components';

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

/**
 * Note icon SVG component for the note count badge
 */
function NoteIcon(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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

  /** Field options for inline editing */
  fieldOptions?: {
    type: string[];
    domain: string[];
    subdomain: string[];
    priority: string[];
    status: string[];
    tags: string[];
  };

  /** Called when an inline field update occurs */
  onItemUpdate?: (updates: {
    title?: string;
    type?: string;
    domain?: string[];
    subdomain?: string[];
    context?: string;
    priority?: string;
    status?: string;
    tags?: string[];
  }) => void;

  /** Whether inline field updates are currently saving */
  isUpdating?: boolean;
}

/**
 * NoteCountBadge Component
 *
 * Displays a badge showing the total note count with a tooltip
 * showing the breakdown by note type.
 */
interface NoteCountBadgeProps {
  /** Array of notes to count */
  notes: Note[];
}

function NoteCountBadge({ notes }: NoteCountBadgeProps): React.JSX.Element | null {
  // All hooks must be called unconditionally before any early returns
  // Memoize the aggregation to avoid unnecessary recalculations
  const noteTypeCounts = useMemo(() => aggregateNoteTypeCounts(notes), [notes]);

  // Build the tooltip content showing type breakdown
  const tooltipContent = useMemo(() => {
    if (notes.length === 0) {
      return '';
    }

    const typesWithCounts = Object.entries(noteTypeCounts)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => {
        const label = NOTE_TYPE_LABELS[type as NoteType] || type;
        return `${count} ${label}`;
      });

    // Single type case: "3 General notes"
    if (typesWithCounts.length === 1) {
      return `${typesWithCounts[0]} note${notes.length === 1 ? '' : 's'}`;
    }

    // Mixed types: "2 General, 1 Validation"
    return typesWithCounts.join(', ');
  }, [noteTypeCounts, notes.length]);

  const badgeLabel = useMemo(
    () => `${notes.length} note${notes.length === 1 ? '' : 's'}`,
    [notes.length]
  );

  // Now we can safely do the early return after all hooks are called
  if (notes.length === 0) {
    return null;
  }

  return (
    <Tooltip content={tooltipContent} position="top" delay={200}>
      <span
        className="note-count-badge"
        aria-label={`${badgeLabel}: ${tooltipContent}`}
      >
        <NoteIcon />
        <span>{notes.length}</span>
      </span>
    </Tooltip>
  );
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
  fieldOptions,
  onItemUpdate,
  isUpdating = false,
}: ItemCardProps): React.JSX.Element {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Collapse state - default to collapsed
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Note type filter state (empty array = show all types)
  const [noteTypeFilter, setNoteTypeFilter] = useState<NoteType[]>([]);

  // Note management state
  const [localNotes, setLocalNotes] = useState<Note[]>(item.notes || []);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const isEditable = !!onItemUpdate;
  const isFieldDisabled = !isEditable || isUpdating;

  const resolvedFieldOptions = useMemo(() => {
    if (fieldOptions) {
      return fieldOptions;
    }

    const unique = (values: string[]) => Array.from(new Set(values)).sort();

    return {
      type: unique([...DEFAULT_FIELD_OPTIONS.type, item.type]),
      domain: unique(item.domain),
      subdomain: unique(item.subdomain),
      priority: unique([...DEFAULT_FIELD_OPTIONS.priority, item.priority]),
      status: unique([...DEFAULT_FIELD_OPTIONS.status, item.status]),
      tags: unique(item.tags),
    };
  }, [fieldOptions, item]);

  const mergeOptions = useCallback((prev: string[], next: string[]) => {
    return Array.from(new Set([...prev, ...next])).sort();
  }, []);

  const [localTypeOptions, setLocalTypeOptions] = useState<string[]>(resolvedFieldOptions.type);
  const [localDomainOptions, setLocalDomainOptions] = useState<string[]>(
    resolvedFieldOptions.domain
  );
  const [localSubdomainOptions, setLocalSubdomainOptions] = useState<string[]>(
    resolvedFieldOptions.subdomain
  );
  const [localPriorityOptions, setLocalPriorityOptions] = useState<string[]>(
    resolvedFieldOptions.priority
  );
  const [localStatusOptions, setLocalStatusOptions] = useState<string[]>(
    resolvedFieldOptions.status
  );
  const [localTagOptions, setLocalTagOptions] = useState<string[]>(resolvedFieldOptions.tags);

  useEffect(() => {
    setLocalTypeOptions((prev) => mergeOptions(prev, resolvedFieldOptions.type));
    setLocalDomainOptions((prev) => mergeOptions(prev, resolvedFieldOptions.domain));
    setLocalSubdomainOptions((prev) => mergeOptions(prev, resolvedFieldOptions.subdomain));
    setLocalPriorityOptions((prev) => mergeOptions(prev, resolvedFieldOptions.priority));
    setLocalStatusOptions((prev) => mergeOptions(prev, resolvedFieldOptions.status));
    setLocalTagOptions((prev) => mergeOptions(prev, resolvedFieldOptions.tags));
  }, [mergeOptions, resolvedFieldOptions]);

  const typeOptions = useMemo(
    () => localTypeOptions.map((value) => ({ id: value, label: value })),
    [localTypeOptions]
  );
  const priorityOptions = useMemo(
    () => localPriorityOptions.map((value) => ({ id: value, label: value })),
    [localPriorityOptions]
  );
  const statusOptions = useMemo(
    () => localStatusOptions.map((value) => ({ id: value, label: value })),
    [localStatusOptions]
  );
  const tagOptions = useMemo(
    () => localTagOptions.map((value) => ({ id: value, label: value })),
    [localTagOptions]
  );

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

  const handleFieldUpdate = useCallback(
    (updates: {
      title?: string;
      type?: string;
      domain?: string[];
      subdomain?: string[];
      context?: string;
      priority?: string;
      status?: string;
      tags?: string[];
    }) => {
      if (!onItemUpdate) return;
      onItemUpdate(updates);
    },
    [onItemUpdate]
  );

  const handleDomainSelect = useCallback(
    (value: string) => handleFieldUpdate({ domain: [value] }),
    [handleFieldUpdate]
  );

  const handleDomainRemove = useCallback(() => handleFieldUpdate({ domain: [] }), [handleFieldUpdate]);

  const handleDomainAdd = useCallback(
    (value: string) => {
      setLocalDomainOptions((prev) => mergeOptions(prev, [value]));
      handleFieldUpdate({ domain: [value] });
    },
    [handleFieldUpdate, mergeOptions]
  );

  const handleSubdomainSelect = useCallback(
    (value: string) => handleFieldUpdate({ subdomain: [value] }),
    [handleFieldUpdate]
  );

  const handleSubdomainRemove = useCallback(
    () => handleFieldUpdate({ subdomain: [] }),
    [handleFieldUpdate]
  );

  const handleSubdomainAdd = useCallback(
    (value: string) => {
      setLocalSubdomainOptions((prev) => mergeOptions(prev, [value]));
      handleFieldUpdate({ subdomain: [value] });
    },
    [handleFieldUpdate, mergeOptions]
  );

  const handleContextChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFieldUpdate({ context: event.target.value });
    },
    [handleFieldUpdate]
  );

  const handleTagsChange = useCallback(
    (values: string[]) => handleFieldUpdate({ tags: values }),
    [handleFieldUpdate]
  );

  const handleAddTag = useCallback(
    async (value: string) => {
      setLocalTagOptions((prev) => mergeOptions(prev, [value]));
      const nextTags = item.tags.includes(value) ? item.tags : [...item.tags, value];
      handleFieldUpdate({ tags: nextTags });
    },
    [item.tags, handleFieldUpdate, mergeOptions]
  );

  const handleTypeAdd = useCallback(
    async (value: string) => {
      setLocalTypeOptions((prev) => mergeOptions(prev, [value]));
      handleFieldUpdate({ type: value });
    },
    [handleFieldUpdate, mergeOptions]
  );

  const handlePriorityAdd = useCallback(
    async (value: string) => {
      setLocalPriorityOptions((prev) => mergeOptions(prev, [value]));
      handleFieldUpdate({ priority: value });
    },
    [handleFieldUpdate, mergeOptions]
  );

  const handleStatusAdd = useCallback(
    async (value: string) => {
      setLocalStatusOptions((prev) => mergeOptions(prev, [value]));
      handleFieldUpdate({ status: value });
    },
    [handleFieldUpdate, mergeOptions]
  );

  return (
    <div className="viewer-item-card glass">
      {/* Item Header */}
      <div className="viewer-item-header">
        <div className="viewer-item-id-row">
          <button
            type="button"
            className="viewer-item-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand item details' : 'Collapse item details'}
          >
            {isCollapsed ? (
              <ChevronRightIcon aria-hidden="true" />
            ) : (
              <ChevronDownIcon aria-hidden="true" />
            )}
          </button>
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

          {/* Status indicator */}
          <StatusIndicator status={item.status} size="sm" showTooltip={true} />

          {/* Note count badge */}
          <NoteCountBadge notes={localNotes} />

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

      {/* Collapsible content */}
      <div
        className={`viewer-item-collapsible ${isCollapsed ? 'collapsed' : 'expanded'}`}
        aria-hidden={isCollapsed}
      >
        <div className="viewer-item-collapsible-inner">
          {/* Item Metadata */}
          <div className="viewer-item-meta">
            <div className="viewer-item-meta-row">
              <DropdownWithAdd
                label="Type"
                options={typeOptions}
                value={item.type}
                onChange={(value) => handleFieldUpdate({ type: value })}
                onAddNew={handleTypeAdd}
                placeholder="Select type..."
                disabled={isFieldDisabled}
                idBase={`item-${item.id}-type`}
              />

              <MultiSelectCombobox
                label="Domain"
                options={localDomainOptions}
                selected={item.domain}
                onSelect={handleDomainSelect}
                onRemove={handleDomainRemove}
                onAdd={handleDomainAdd}
                placeholder="Select or type domain..."
                disabled={isFieldDisabled}
                idBase={`item-${item.id}-domain`}
              />

              <MultiSelectCombobox
                label="Subdomain"
                options={localSubdomainOptions}
                selected={item.subdomain}
                onSelect={handleSubdomainSelect}
                onRemove={handleSubdomainRemove}
                onAdd={handleSubdomainAdd}
                placeholder="Select or type subdomain..."
                disabled={isFieldDisabled}
                idBase={`item-${item.id}-subdomain`}
              />
            </div>

            <div className="viewer-item-meta-row">
              <DropdownWithAdd
                label="Priority"
                options={priorityOptions}
                value={item.priority}
                onChange={(value) => handleFieldUpdate({ priority: value })}
                onAddNew={handlePriorityAdd}
                placeholder="Select priority..."
                disabled={isFieldDisabled}
                idBase={`item-${item.id}-priority`}
              />

              <DropdownWithAdd
                label="Status"
                options={statusOptions}
                value={item.status}
                onChange={(value) => handleFieldUpdate({ status: value })}
                onAddNew={handleStatusAdd}
                placeholder="Select status..."
                disabled={isFieldDisabled}
                idBase={`item-${item.id}-status`}
              />

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

            {/* Context - Optional free-form text */}
            <div className="viewer-item-meta-row">
              <div className="viewer-meta-field viewer-meta-field-wide">
                <label className="meta-label" htmlFor={`item-${item.id}-context`}>
                  Context
                </label>
                <input
                  id={`item-${item.id}-context`}
                  type="text"
                  className="input-base"
                  value={item.context || ''}
                  onChange={handleContextChange}
                  placeholder="Optional background/context..."
                  disabled={isFieldDisabled}
                  aria-label="Item context"
                />
              </div>
            </div>
          </div>

          {/* Item Tags */}
          <div className="viewer-item-tags">
            <MultiSelectWithAdd
              label="Tags"
              options={tagOptions}
              values={item.tags}
              onChange={handleTagsChange}
              onAddNew={handleAddTag}
              placeholder="Add tags..."
              disabled={isFieldDisabled}
              idBase={`item-${item.id}-tags`}
            />
          </div>

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
        </div>
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
