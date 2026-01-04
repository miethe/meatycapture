/**
 * useNoteOperations Hook
 *
 * Manages note CRUD operations for the Request Log Viewer with file persistence.
 * Provides add, edit, and delete operations for notes attached to items,
 * handling ID generation, timestamps, and file system updates.
 *
 * The hook uses the DocStore adapter pattern for file operations, applying
 * in-memory transformations from `applyNoteUpdate` then persisting via
 * DocStore.write().
 *
 * Usage:
 * ```tsx
 * const { addNote, editNote, deleteNote, isOperating } = useNoteOperations(
 *   docStore,
 *   docPath,
 *   doc,
 *   itemId,
 *   (notes) => setItemNotes(notes)
 * );
 *
 * // Pass to ItemCard
 * <ItemCard
 *   onNoteAdd={async (noteData) => addNote(noteData)}
 *   onNoteEdit={async (note) => editNote(note)}
 *   onNoteDelete={async (noteId) => deleteNote(noteId)}
 * />
 * ```
 */

import { useState, useCallback } from 'react';
import type { Note, RequestLogDoc } from '@core/models';
import type { DocStore } from '@core/ports';
import { applyNoteUpdate } from '@core/serializer/item-update';
import { useToast } from '@ui/shared/useToast';

/**
 * Return type for useNoteOperations hook
 */
export interface UseNoteOperationsResult {
  /**
   * Add a new note to the item.
   * Generates ID and timestamps automatically.
   * @param note - Note data without id, created_at, or updated_at
   */
  addNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;

  /**
   * Edit an existing note.
   * Updates the updated_at timestamp automatically.
   * @param note - The complete note with updated content
   */
  editNote: (note: Note) => Promise<void>;

  /**
   * Delete a note from the item.
   * @param noteId - ID of the note to delete
   */
  deleteNote: (noteId: string) => Promise<void>;

  /**
   * True while any async operation is in progress.
   * Used to disable UI controls during saves.
   */
  isOperating: boolean;
}

/**
 * Options for useNoteOperations hook
 */
export interface UseNoteOperationsOptions {
  /**
   * Current notes array for the item.
   * Required for calculating next note number and performing updates.
   */
  currentNotes: Note[];

  /**
   * Optional clock function for testing.
   * Defaults to returning current Date.
   */
  clock?: () => Date;
}

/**
 * Extracts the item number suffix from an item ID.
 * E.g., "REQ-20260104-project-01" returns "01"
 *
 * @param itemId - Full item ID
 * @returns Two-digit item number string, or "01" if parsing fails
 */
function extractItemNumber(itemId: string): string {
  const match = itemId.match(/-(\d{2})$/);
  return match?.[1] ?? '01';
}

/**
 * Formats a date as YYYYMMDD for ID generation.
 *
 * @param date - Date to format
 * @returns Formatted string (e.g., "20260104")
 */
function formatDateForId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Extracts the project slug from a document ID.
 * E.g., "REQ-20260104-meatycapture" returns "meatycapture"
 *
 * @param docId - Document ID
 * @returns Project slug, or "unknown" if parsing fails
 */
function extractProjectSlug(docId: string): string {
  // Format: REQ-YYYYMMDD-<slug>
  const match = docId.match(/^REQ-\d{8}-(.+)$/);
  return match?.[1] ?? 'unknown';
}

/**
 * Calculates the next note number based on existing notes.
 * Finds the highest existing number and adds 1.
 *
 * @param notes - Current notes array
 * @returns Next note number (1 if no notes exist)
 */
function getNextNoteNumber(notes: Note[]): number {
  if (notes.length === 0) {
    return 1;
  }

  // Extract note numbers from IDs (format: NOTE-YYYYMMDD-slug-XX-NN)
  const noteNumbers = notes
    .map((note) => {
      const match = note.id.match(/-(\d{2})$/);
      const numStr = match?.[1];
      return numStr ? parseInt(numStr, 10) : 0;
    })
    .filter((num) => num > 0);

  if (noteNumbers.length === 0) {
    return 1;
  }

  return Math.max(...noteNumbers) + 1;
}

/**
 * Generates a unique note ID.
 *
 * Format: NOTE-YYYYMMDD-<project-slug>-<item-number>-<note-number>
 * Example: NOTE-20260104-meatycapture-01-03
 *
 * @param docId - Parent document ID
 * @param itemId - Parent item ID
 * @param noteNumber - Note sequence number
 * @param date - Date for the ID
 * @returns Generated note ID
 */
function generateNoteId(docId: string, itemId: string, noteNumber: number, date: Date): string {
  const dateStr = formatDateForId(date);
  const projectSlug = extractProjectSlug(docId);
  const itemNumber = extractItemNumber(itemId);
  const paddedNoteNumber = String(noteNumber).padStart(2, '0');

  return `NOTE-${dateStr}-${projectSlug}-${itemNumber}-${paddedNoteNumber}`;
}

/**
 * Hook for managing note CRUD operations with file persistence.
 *
 * @param docStore - DocStore adapter for file operations
 * @param docPath - Absolute path to the request-log markdown file
 * @param currentDoc - Current document state (for applying updates)
 * @param itemId - ID of the item the notes belong to
 * @param onNotesChanged - Callback when notes array changes (for UI updates)
 * @param options - Additional options including currentNotes and optional clock
 * @returns Note operation functions and loading state
 */
export function useNoteOperations(
  docStore: DocStore,
  docPath: string,
  currentDoc: RequestLogDoc,
  itemId: string,
  onNotesChanged: (notes: Note[]) => void,
  options: UseNoteOperationsOptions
): UseNoteOperationsResult {
  const { currentNotes, clock = () => new Date() } = options;
  const [isOperating, setIsOperating] = useState(false);
  const { addToast } = useToast();

  /**
   * Add a new note with generated ID and timestamps.
   */
  const addNote = useCallback(
    async (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
      if (isOperating) return;

      setIsOperating(true);

      try {
        const now = clock();
        const nextNumber = getNextNoteNumber(currentNotes);
        const noteId = generateNoteId(currentDoc.doc_id, itemId, nextNumber, now);

        const newNote: Note = {
          id: noteId,
          type: noteData.type,
          content: noteData.content,
          created_at: now,
          updated_at: now,
        };

        const updatedNotes = [...currentNotes, newNote];

        // Apply in-memory transformation
        const { updatedDoc, changed } = applyNoteUpdate(currentDoc, itemId, updatedNotes);

        // Persist to file via DocStore
        if (changed) {
          await docStore.write(docPath, updatedDoc);
        }

        // Update UI state
        onNotesChanged(updatedNotes);

        addToast({
          type: 'success',
          message: 'Note added',
        });
      } catch (error) {
        console.error('Failed to add note:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to add note',
          duration: 7000,
        });
      } finally {
        setIsOperating(false);
      }
    },
    [isOperating, clock, currentNotes, currentDoc, itemId, docPath, docStore, onNotesChanged, addToast]
  );

  /**
   * Edit an existing note with updated timestamp.
   */
  const editNote = useCallback(
    async (note: Note) => {
      if (isOperating) return;

      setIsOperating(true);

      try {
        const now = clock();

        // Update the note's timestamp
        const updatedNote: Note = {
          ...note,
          updated_at: now,
        };

        // Replace the note in the array
        const updatedNotes = currentNotes.map((n) => (n.id === note.id ? updatedNote : n));

        // Apply in-memory transformation
        const { updatedDoc, changed } = applyNoteUpdate(currentDoc, itemId, updatedNotes);

        // Persist to file via DocStore
        if (changed) {
          await docStore.write(docPath, updatedDoc);
        }

        // Update UI state
        onNotesChanged(updatedNotes);

        addToast({
          type: 'success',
          message: 'Note updated',
        });
      } catch (error) {
        console.error('Failed to update note:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update note',
          duration: 7000,
        });
      } finally {
        setIsOperating(false);
      }
    },
    [isOperating, clock, currentNotes, currentDoc, itemId, docPath, docStore, onNotesChanged, addToast]
  );

  /**
   * Delete a note from the item.
   */
  const deleteNote = useCallback(
    async (noteId: string) => {
      if (isOperating) return;

      setIsOperating(true);

      try {
        // Remove the note from the array
        const updatedNotes = currentNotes.filter((n) => n.id !== noteId);

        // Apply in-memory transformation
        const { updatedDoc, changed } = applyNoteUpdate(currentDoc, itemId, updatedNotes);

        // Persist to file via DocStore
        if (changed) {
          await docStore.write(docPath, updatedDoc);
        }

        // Update UI state
        onNotesChanged(updatedNotes);

        addToast({
          type: 'success',
          message: 'Note deleted',
        });
      } catch (error) {
        console.error('Failed to delete note:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to delete note',
          duration: 7000,
        });
      } finally {
        setIsOperating(false);
      }
    },
    [isOperating, currentNotes, currentDoc, itemId, docPath, docStore, onNotesChanged, addToast]
  );

  return {
    addNote,
    editNote,
    deleteNote,
    isOperating,
  };
}

export default useNoteOperations;
