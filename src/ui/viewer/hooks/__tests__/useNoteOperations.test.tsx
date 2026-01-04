/**
 * useNoteOperations Hook Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNoteOperations } from '../useNoteOperations';
import { ToastProvider } from '@ui/shared/useToast';
import type { Note, NoteType } from '@core/models';
import type { ReactNode } from 'react';

// Mock updateItemNotes
vi.mock('@core/serializer/item-update', () => ({
  updateItemNotes: vi.fn(),
}));

import { updateItemNotes } from '@core/serializer/item-update';

const mockUpdateItemNotes = vi.mocked(updateItemNotes);

// Wrapper with ToastProvider for all tests
const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// Test constants
const TEST_DOC_PATH = '/path/to/REQ-20260104-meatycapture.md';
const TEST_ITEM_ID = 'REQ-20260104-meatycapture-01';
const TEST_DOC_ID = 'REQ-20260104-meatycapture';
const FIXED_DATE = new Date('2026-01-04T12:00:00Z');

// Note factory
const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'NOTE-20260104-meatycapture-01-01',
  type: 'General' as NoteType,
  content: 'Test note content',
  created_at: new Date('2026-01-04T10:00:00Z'),
  updated_at: new Date('2026-01-04T10:00:00Z'),
  ...overrides,
});

describe('useNoteOperations', () => {
  const mockOnNotesChanged = vi.fn();
  const mockClock = vi.fn(() => FIXED_DATE);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateItemNotes.mockResolvedValue(undefined as never);
    mockClock.mockReturnValue(FIXED_DATE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with isOperating false', () => {
      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      expect(result.current.isOperating).toBe(false);
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      expect(typeof result.current.addNote).toBe('function');
      expect(typeof result.current.editNote).toBe('function');
      expect(typeof result.current.deleteNote).toBe('function');
    });
  });

  describe('addNote', () => {
    it('generates correct note ID for first note', async () => {
      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({
          type: 'General',
          content: 'New note content',
        });
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'NOTE-20260104-meatycapture-01-01',
          }),
        ])
      );
    });

    it('generates correct note ID based on existing notes', async () => {
      const existingNotes = [
        createMockNote({ id: 'NOTE-20260104-meatycapture-01-01' }),
        createMockNote({ id: 'NOTE-20260104-meatycapture-01-02' }),
      ];

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: existingNotes,
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({
          type: 'Bug Fix Attempt',
          content: 'Third note',
        });
      });

      // Should use next number (03) after existing 01, 02
      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'NOTE-20260104-meatycapture-01-03',
          }),
        ])
      );
    });

    it('sets created_at and updated_at to current time', async () => {
      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({
          type: 'General',
          content: 'Test content',
        });
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            created_at: FIXED_DATE,
            updated_at: FIXED_DATE,
          }),
        ])
      );
    });

    it('calls onNotesChanged with updated notes array', async () => {
      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({
          type: 'General',
          content: 'New note',
        });
      });

      expect(mockOnNotesChanged).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'General',
            content: 'New note',
          }),
        ])
      );
    });

    it('preserves existing notes when adding', async () => {
      const existingNote = createMockNote();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({
          type: 'Validation',
          content: 'New note',
        });
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([existingNote, expect.objectContaining({ type: 'Validation' })])
      );
    });

    it('sets isOperating to true during save', async () => {
      let resolveSave: (() => void) | undefined;
      const slowSave = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockUpdateItemNotes.mockReturnValue(slowSave as never);

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      let addPromise: Promise<void>;
      act(() => {
        addPromise = result.current.addNote({
          type: 'General',
          content: 'Test',
        });
      });

      expect(result.current.isOperating).toBe(true);

      await act(async () => {
        resolveSave?.();
        await addPromise;
      });

      expect(result.current.isOperating).toBe(false);
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Write failed');
      mockUpdateItemNotes.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({
          type: 'General',
          content: 'Test',
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to add note:', error);
      expect(mockOnNotesChanged).not.toHaveBeenCalled();
      expect(result.current.isOperating).toBe(false);

      consoleSpy.mockRestore();
    });

    it('prevents concurrent operations', async () => {
      let resolveSave: (() => void) | undefined;
      const slowSave = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockUpdateItemNotes.mockReturnValue(slowSave as never);

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: mockClock,
          }),
        { wrapper }
      );

      let firstAdd: Promise<void>;
      act(() => {
        firstAdd = result.current.addNote({ type: 'General', content: 'First' });
      });

      // Try second add while first is in progress
      act(() => {
        result.current.addNote({ type: 'General', content: 'Second' });
      });

      // Only first call should be made
      expect(mockUpdateItemNotes).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveSave?.();
        await firstAdd;
      });
    });
  });

  describe('editNote', () => {
    it('updates the note in the array', async () => {
      const existingNote = createMockNote();
      const updatedNote: Note = {
        ...existingNote,
        content: 'Updated content',
      };

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.editNote(updatedNote);
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: existingNote.id,
            content: 'Updated content',
          }),
        ])
      );
    });

    it('updates updated_at timestamp', async () => {
      const existingNote = createMockNote({
        updated_at: new Date('2026-01-01T00:00:00Z'),
      });

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.editNote(existingNote);
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            updated_at: FIXED_DATE,
          }),
        ])
      );
    });

    it('preserves created_at timestamp', async () => {
      const originalCreatedAt = new Date('2025-12-01T00:00:00Z');
      const existingNote = createMockNote({
        created_at: originalCreatedAt,
      });

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.editNote(existingNote);
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            created_at: originalCreatedAt,
          }),
        ])
      );
    });

    it('calls onNotesChanged with updated array', async () => {
      const existingNote = createMockNote();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.editNote({ ...existingNote, content: 'New content' });
      });

      expect(mockOnNotesChanged).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: 'New content',
          }),
        ])
      );
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Write failed');
      mockUpdateItemNotes.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const existingNote = createMockNote();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.editNote(existingNote);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to update note:', error);
      expect(mockOnNotesChanged).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('only modifies the target note', async () => {
      const note1 = createMockNote({ id: 'NOTE-20260104-meatycapture-01-01', content: 'First' });
      const note2 = createMockNote({ id: 'NOTE-20260104-meatycapture-01-02', content: 'Second' });

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [note1, note2],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.editNote({ ...note1, content: 'Modified First' });
      });

      const [, , notesArg] = mockUpdateItemNotes.mock.calls[0] as [string, string, Note[]];
      expect(notesArg).toHaveLength(2);
      expect(notesArg[0]).toMatchObject({ id: note1.id, content: 'Modified First' });
      expect(notesArg[1]).toMatchObject({ id: note2.id, content: 'Second' });
    });
  });

  describe('deleteNote', () => {
    it('removes the note from the array', async () => {
      const noteToDelete = createMockNote();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [noteToDelete],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.deleteNote(noteToDelete.id);
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(TEST_DOC_PATH, TEST_ITEM_ID, []);
    });

    it('preserves other notes when deleting', async () => {
      const note1 = createMockNote({ id: 'NOTE-20260104-meatycapture-01-01' });
      const note2 = createMockNote({ id: 'NOTE-20260104-meatycapture-01-02' });
      const note3 = createMockNote({ id: 'NOTE-20260104-meatycapture-01-03' });

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [note1, note2, note3],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.deleteNote(note2.id);
      });

      const [, , notesArg] = mockUpdateItemNotes.mock.calls[0] as [string, string, Note[]];
      expect(notesArg).toHaveLength(2);
      expect(notesArg.map((n) => n.id)).toEqual([note1.id, note3.id]);
    });

    it('calls onNotesChanged with updated array', async () => {
      const note = createMockNote();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [note],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.deleteNote(note.id);
      });

      expect(mockOnNotesChanged).toHaveBeenCalledWith([]);
    });

    it('handles errors gracefully', async () => {
      const error = new Error('Write failed');
      mockUpdateItemNotes.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const note = createMockNote();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [note],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.deleteNote(note.id);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete note:', error);
      expect(mockOnNotesChanged).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('handles deleting non-existent note gracefully', async () => {
      const existingNote = createMockNote({ id: 'existing-note' });

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [existingNote],
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.deleteNote('non-existent-note');
      });

      // Should still call updateItemNotes with the existing note
      expect(mockUpdateItemNotes).toHaveBeenCalledWith(TEST_DOC_PATH, TEST_ITEM_ID, [existingNote]);
    });
  });

  describe('note ID generation edge cases', () => {
    it('handles non-sequential note numbers', async () => {
      // Notes with gaps in numbering
      const existingNotes = [
        createMockNote({ id: 'NOTE-20260104-meatycapture-01-01' }),
        createMockNote({ id: 'NOTE-20260104-meatycapture-01-05' }), // Gap
      ];

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: existingNotes,
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({ type: 'General', content: 'Test' });
      });

      // Should use 06 (max + 1)
      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'NOTE-20260104-meatycapture-01-06',
          }),
        ])
      );
    });

    it('handles different project slug in doc ID', async () => {
      const { result } = renderHook(
        () =>
          useNoteOperations(
            '/path/to/doc.md',
            'REQ-20260104-other-project-01',
            'REQ-20260104-other-project',
            mockOnNotesChanged,
            {
              currentNotes: [],
              clock: mockClock,
            }
          ),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({ type: 'General', content: 'Test' });
      });

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        '/path/to/doc.md',
        'REQ-20260104-other-project-01',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'NOTE-20260104-other-project-01-01',
          }),
        ])
      );
    });

    it('handles malformed note IDs gracefully', async () => {
      // Notes with invalid ID format
      const existingNotes = [
        createMockNote({ id: 'invalid-format' }),
        createMockNote({ id: 'NOTE-20260104-meatycapture-01-03' }),
      ];

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: existingNotes,
            clock: mockClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({ type: 'General', content: 'Test' });
      });

      // Should use 04 (max valid + 1), ignoring malformed ID
      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'NOTE-20260104-meatycapture-01-04',
          }),
        ])
      );
    });
  });

  describe('clock injection', () => {
    it('uses default clock when not provided', async () => {
      const beforeTest = new Date();

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            // No clock provided
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({ type: 'General', content: 'Test' });
      });

      const afterTest = new Date();

      const [, , notesArg] = mockUpdateItemNotes.mock.calls[0] as [string, string, Note[]];
      const addedNote = notesArg[0];

      // created_at should be between before and after test
      if (addedNote) {
        expect(addedNote.created_at.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
        expect(addedNote.created_at.getTime()).toBeLessThanOrEqual(afterTest.getTime());
      }
    });

    it('uses injected clock for timestamps', async () => {
      const customDate = new Date('2025-06-15T08:30:00Z');
      const customClock = vi.fn(() => customDate);

      const { result } = renderHook(
        () =>
          useNoteOperations(TEST_DOC_PATH, TEST_ITEM_ID, TEST_DOC_ID, mockOnNotesChanged, {
            currentNotes: [],
            clock: customClock,
          }),
        { wrapper }
      );

      await act(async () => {
        await result.current.addNote({ type: 'General', content: 'Test' });
      });

      expect(customClock).toHaveBeenCalled();

      expect(mockUpdateItemNotes).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        TEST_ITEM_ID,
        expect.arrayContaining([
          expect.objectContaining({
            created_at: customDate,
            updated_at: customDate,
          }),
        ])
      );
    });
  });
});
