/**
 * NotesList Component
 *
 * Container component managing note display, grouping, filtering, and add button.
 * Used in the Structured Notes feature for organizing notes by type.
 *
 * Features:
 * - Notes grouped by type (General, Bug Fix Attempt, Validation, Other)
 * - Collapsible group headers with type name and count
 * - Filtering by note type
 * - Empty state with add button
 * - Accessible with proper ARIA attributes
 * - Glass/x-morphism styling consistent with design system
 */

import React, { useMemo, useState } from 'react';
import type { Note, NoteType } from '@core/models';
import { NOTE_TYPE_OPTIONS, NOTE_TYPE_LABELS } from '@core/models';
import { NoteCard } from './NoteCard';
import './NotesList.css';

/**
 * Plus icon SVG component for add button
 */
function PlusIcon(): React.JSX.Element {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Chevron icon SVG component for collapsible headers
 */
function ChevronIcon({ expanded }: { expanded: boolean }): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`notes-list__chevron ${expanded ? 'notes-list__chevron--expanded' : ''}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export interface NotesListProps {
  /** Array of notes to display */
  notes: Note[];
  /** Optional filter for note types - if undefined or empty, shows all */
  activeFilter?: NoteType[];
  /** Callback when add note button is clicked */
  onAddNote: () => void;
  /** Callback when edit button is clicked on a note */
  onEditNote: (note: Note) => void;
  /** Callback when delete button is clicked on a note */
  onDeleteNote: (note: Note) => void;
}

/**
 * Groups notes by their type and sorts each group by created_at descending.
 *
 * @param notes - Array of notes to group
 * @returns Map of NoteType to sorted Note array
 */
function groupNotesByType(notes: Note[]): Map<NoteType, Note[]> {
  const groups = new Map<NoteType, Note[]>();

  // Initialize groups in display order
  NOTE_TYPE_OPTIONS.forEach((type) => groups.set(type, []));

  // Group notes
  notes.forEach((note) => {
    const group = groups.get(note.type);
    if (group) {
      group.push(note);
    }
  });

  // Sort each group by created_at descending (newest first)
  groups.forEach((group) => {
    group.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  });

  return groups;
}

/**
 * NotesList Component
 *
 * Displays notes grouped by type with collapsible sections,
 * filtering support, and empty state handling.
 *
 * @param props - NotesListProps
 * @returns NotesList component
 */
export function NotesList({
  notes,
  activeFilter,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: NotesListProps): React.JSX.Element {
  // Track which groups are expanded (all expanded by default)
  const [expandedGroups, setExpandedGroups] = useState<Set<NoteType>>(
    () => new Set(NOTE_TYPE_OPTIONS)
  );

  // Filter notes based on activeFilter
  const filteredNotes = useMemo(() => {
    if (!activeFilter || activeFilter.length === 0) {
      return notes;
    }
    return notes.filter((note) => activeFilter.includes(note.type));
  }, [notes, activeFilter]);

  // Group the filtered notes
  const groupedNotes = useMemo(() => groupNotesByType(filteredNotes), [filteredNotes]);

  // Toggle group expansion
  const toggleGroup = (type: NoteType) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Check if we have any notes to display
  const hasNotes = filteredNotes.length > 0;

  // Empty state
  if (!hasNotes) {
    return (
      <section className="notes-list glass" aria-label="Notes">
        <div className="notes-list__header">
          <h3 className="notes-list__title">Notes</h3>
          <button
            type="button"
            className="button primary small notes-list__add-button"
            onClick={onAddNote}
            aria-label="Add note"
          >
            <PlusIcon />
            <span>Add Note</span>
          </button>
        </div>
        <div className="notes-list__empty">
          <p className="notes-list__empty-text">No notes yet</p>
          <p className="notes-list__empty-hint">
            Click &quot;Add Note&quot; to create your first note.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="notes-list glass" aria-label="Notes">
      {/* Header with add button */}
      <div className="notes-list__header">
        <h3 className="notes-list__title">Notes ({filteredNotes.length})</h3>
        <button
          type="button"
          className="button primary small notes-list__add-button"
          onClick={onAddNote}
          aria-label="Add note"
        >
          <PlusIcon />
          <span>Add Note</span>
        </button>
      </div>

      {/* Grouped notes */}
      <div className="notes-list__groups">
        {NOTE_TYPE_OPTIONS.map((type) => {
          const typeNotes = groupedNotes.get(type) || [];
          const count = typeNotes.length;

          // Hide empty groups
          if (count === 0) {
            return null;
          }

          const isExpanded = expandedGroups.has(type);
          const headerId = `notes-group-header-${type.toLowerCase().replace(/\s+/g, '-')}`;
          const contentId = `notes-group-content-${type.toLowerCase().replace(/\s+/g, '-')}`;

          return (
            <div
              key={type}
              className="notes-list__group"
              role="region"
              aria-labelledby={headerId}
            >
              {/* Group header - collapsible */}
              <button
                type="button"
                id={headerId}
                className="notes-list__group-header"
                onClick={() => toggleGroup(type)}
                aria-expanded={isExpanded}
                aria-controls={contentId}
              >
                <ChevronIcon expanded={isExpanded} />
                <h4 className="notes-list__group-title">
                  {NOTE_TYPE_LABELS[type]}
                  <span className="notes-list__group-count">({count})</span>
                </h4>
              </button>

              {/* Group content - notes */}
              {isExpanded && (
                <div
                  id={contentId}
                  className="notes-list__group-content"
                  role="list"
                  aria-label={`${NOTE_TYPE_LABELS[type]} notes`}
                >
                  {typeNotes.map((note) => (
                    <div key={note.id} role="listitem">
                      <NoteCard
                        note={note}
                        onEdit={onEditNote}
                        onDelete={onDeleteNote}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default NotesList;
