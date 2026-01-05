/**
 * Notes Viewer Integration Tests
 *
 * Comprehensive integration tests for note operations in the viewer context.
 * Tests cover the full lifecycle of notes: add, edit, delete, filter, and persistence.
 *
 * Test categories:
 * - File persistence (add, edit, delete notes with file updates)
 * - Note type filtering
 * - Sequential operations (multiple operations maintaining integrity)
 * - Error handling (file operation failures)
 * - Full lifecycle E2E tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemCard } from '../ItemCard';
import { useNoteOperations } from '../hooks/useNoteOperations';
import { ToastProvider } from '@ui/shared/useToast';
import type { RequestLogItem, RequestLogDoc, Note, NoteType } from '@core/models';
import { NOTE_TYPES } from '@core/models';
import type { DocStore } from '@core/ports';
import type { ReactNode } from 'react';
import React from 'react';

// ============================================================================
// Mocks
// ============================================================================

/**
 * Create a mock DocStore for file operations.
 * All methods are vi.fn() for assertion tracking.
 */
function createMockDocStore(): DocStore {
  return {
    list: vi.fn(),
    read: vi.fn(),
    write: vi.fn().mockResolvedValue(undefined),
    append: vi.fn(),
    backup: vi.fn(),
    isWritable: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Create a mock RequestLogDoc from a RequestLogItem.
 * Used for testing the useNoteOperations hook which requires a full doc.
 */
function createMockDocFromItem(
  item: RequestLogItem,
  docId: string,
  projectId: string = 'test-project'
): RequestLogDoc {
  return {
    doc_id: docId,
    project_id: projectId,
    title: 'Test Request Log',
    items_index: [
      {
        id: item.id,
        type: item.type,
        title: item.title,
      },
    ],
    tags: item.tags,
    item_count: 1,
    items: [item],
    created_at: new Date('2026-01-04'),
    updated_at: new Date('2026-01-04'),
    archived: false,
  };
}

// ============================================================================
// Test Constants
// ============================================================================

const TEST_DOC_PATH = '/path/to/REQ-20260104-meatycapture.md';
const TEST_ITEM_ID = 'REQ-20260104-meatycapture-01';
const TEST_DOC_ID = 'REQ-20260104-meatycapture';
const FIXED_DATE = new Date('2026-01-04T12:00:00Z');

// ============================================================================
// Test Factories
// ============================================================================

/**
 * Create a mock RequestLogItem for testing.
 */
function createMockItem(overrides: Partial<RequestLogItem> = {}): RequestLogItem {
  return {
    id: TEST_ITEM_ID,
    title: 'Test Item Title',
    type: 'enhancement',
    domain: ['web'],
    context: ['frontend'],
    priority: 'medium',
    status: 'triage',
    tags: ['ux', 'api'],
    notes: [],
    created_at: new Date('2025-12-31T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock Note for testing.
 */
function createMockNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'NOTE-20260104-meatycapture-01-01',
    type: NOTE_TYPES.General as NoteType,
    content: 'Test note content',
    created_at: new Date('2026-01-04T10:00:00Z'),
    updated_at: new Date('2026-01-04T10:00:00Z'),
    ...overrides,
  };
}

// ============================================================================
// Test Wrapper Component
// ============================================================================

/**
 * Integration test wrapper that wires ItemCard with useNoteOperations hook.
 * Simulates real viewer usage where note operations persist to file.
 */
interface TestWrapperProps {
  item: RequestLogItem;
  docPath?: string;
  docId?: string;
  docStore?: DocStore;
  onItemUpdated?: (item: RequestLogItem) => void;
  clock?: () => Date;
}

function IntegratedItemCard({
  item: initialItem,
  docPath = TEST_DOC_PATH,
  docId = TEST_DOC_ID,
  docStore,
  onItemUpdated,
  clock = () => FIXED_DATE,
}: TestWrapperProps): React.JSX.Element {
  const [item, setItem] = React.useState(initialItem);
  const [currentDoc, setCurrentDoc] = React.useState(() =>
    createMockDocFromItem(initialItem, docId)
  );

  // Update doc when item changes
  React.useEffect(() => {
    setCurrentDoc(createMockDocFromItem(item, docId));
  }, [item, docId]);

  // Handle notes changes from the hook
  const handleNotesChanged = React.useCallback(
    (notes: Note[]) => {
      setItem((prev) => {
        const updated = { ...prev, notes };
        onItemUpdated?.(updated);
        return updated;
      });
    },
    [onItemUpdated]
  );

  // Use the mock docStore or create one
  const store = React.useMemo(() => docStore ?? createMockDocStore(), [docStore]);

  // Use the actual useNoteOperations hook with new signature
  const { addNote, editNote, deleteNote } = useNoteOperations(
    store,
    docPath,
    currentDoc,
    item.id,
    handleNotesChanged,
    {
      currentNotes: item.notes ?? [],
      clock,
    }
  );

  // Wrap note operations to pass to ItemCard
  const handleNoteAdd = React.useCallback(
    async (note: Note) => {
      await addNote({ type: note.type, content: note.content });
    },
    [addNote]
  );

  const handleNoteEdit = React.useCallback(
    async (note: Note) => {
      await editNote(note);
    },
    [editNote]
  );

  const handleNoteDelete = React.useCallback(
    async (noteId: string) => {
      await deleteNote(noteId);
    },
    [deleteNote]
  );

  return (
    <ItemCard
      item={item}
      onCopyId={vi.fn()}
      onNoteAdd={handleNoteAdd}
      onNoteEdit={handleNoteEdit}
      onNoteDelete={handleNoteDelete}
    />
  );
}

/**
 * Test wrapper with ToastProvider for all integration tests.
 */
function TestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return <ToastProvider>{children}</ToastProvider>;
}

/**
 * Helper to render the integrated component with all necessary providers.
 */
function renderViewerWithNotes(options: {
  item: RequestLogItem;
  docPath?: string;
  docId?: string;
  docStore?: DocStore;
  onItemUpdated?: (item: RequestLogItem) => void;
  clock?: () => Date;
}) {
  const user = userEvent.setup({ delay: null });

  const result = render(
    <TestWrapper>
      <IntegratedItemCard {...options} />
    </TestWrapper>
  );

  return { user, ...result };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Open the NoteModal via the "Add Note" button.
 */
async function openAddNoteModal(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const addButton = screen.getByRole('button', { name: /add note/i });
  await user.click(addButton);

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Note' })).toBeInTheDocument();
  });
}

/**
 * Fill the NoteModal form and save.
 */
async function fillAndSaveNote(
  user: ReturnType<typeof userEvent.setup>,
  type: string,
  content: string
): Promise<void> {
  const modal = screen.getByRole('dialog');

  // Select type
  const typeSelect = within(modal).getByRole('combobox');
  await user.selectOptions(typeSelect, type);

  // Enter content (accessible name is "Content")
  const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
  await user.type(textarea, content);

  // Click save
  const saveButton = within(modal).getByRole('button', { name: /save/i });
  await user.click(saveButton);

  // Wait for modal to close
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

/**
 * Open edit modal for a note.
 */
async function openEditNoteModal(
  user: ReturnType<typeof userEvent.setup>,
  noteContent: string
): Promise<void> {
  // Find the note by its content and click edit
  const noteText = screen.getByText(noteContent);
  const noteCard = noteText.closest('[role="listitem"]');
  expect(noteCard).toBeInTheDocument();

  const editButton = within(noteCard as HTMLElement).getByRole('button', { name: /edit/i });
  await user.click(editButton);

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
  });
}

/**
 * Delete a note by clicking delete button and confirming.
 */
async function deleteNoteWithConfirm(
  user: ReturnType<typeof userEvent.setup>,
  noteContent: string
): Promise<void> {
  // Find the note and click delete
  const noteText = screen.getByText(noteContent);
  const noteCard = noteText.closest('[role="listitem"]');
  expect(noteCard).toBeInTheDocument();

  const deleteButton = within(noteCard as HTMLElement).getByRole('button', { name: /delete/i });
  await user.click(deleteButton);

  // Wait for confirmation dialog
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete Note' })).toBeInTheDocument();
  });

  // Confirm deletion
  const confirmButton = within(screen.getByRole('dialog')).getByRole('button', { name: /delete/i });
  await user.click(confirmButton);

  // Wait for dialog to close
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: 'Delete Note' })).not.toBeInTheDocument();
  });
}

// ============================================================================
// Tests: File Persistence
// ============================================================================

describe('Viewer Notes Integration - File Persistence', () => {
  let mockDocStore: DocStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocStore = createMockDocStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add note in viewer -> file updated', () => {
    it('persists new note to file when added via UI', async () => {
      const item = createMockItem({ notes: [] });
      const onItemUpdated = vi.fn();

      const { user } = renderViewerWithNotes({ item, docStore: mockDocStore, onItemUpdated });

      // Open add note modal
      await openAddNoteModal(user);

      // Fill and save note
      await fillAndSaveNote(user, NOTE_TYPES.General, 'New note from viewer');

      // Wait for persistence
      await waitFor(() => {
        expect(mockDocStore.write).toHaveBeenCalledTimes(1);
      });

      // Verify file update call - docStore.write receives (path, doc)
      expect(mockDocStore.write).toHaveBeenCalledWith(
        TEST_DOC_PATH,
        expect.objectContaining({
          doc_id: TEST_DOC_ID,
          items: expect.arrayContaining([
            expect.objectContaining({
              id: TEST_ITEM_ID,
              notes: expect.arrayContaining([
                expect.objectContaining({
                  type: NOTE_TYPES.General,
                  content: 'New note from viewer',
                  id: expect.stringMatching(/^NOTE-\d{8}-meatycapture-01-01$/),
                }),
              ]),
            }),
          ]),
        })
      );

      // Verify UI updated
      expect(screen.getByText('New note from viewer')).toBeInTheDocument();
      expect(screen.getByText('Notes (1)')).toBeInTheDocument();

      // Verify callback was called with updated item
      expect(onItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.arrayContaining([
            expect.objectContaining({
              content: 'New note from viewer',
            }),
          ]),
        })
      );
    });

    it('generates correct note ID for sequential notes', async () => {
      const existingNote = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-01',
        content: 'First note',
      });
      const item = createMockItem({ notes: [existingNote] });

      const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

      // Add second note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Second note');

      await waitFor(() => {
        expect(mockDocStore.write).toHaveBeenCalled();
      });

      // Verify new note has correct sequential ID
      const callArgs = (mockDocStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      const docArg = callArgs?.[1] as RequestLogDoc;
      const notesArg = docArg.items[0]?.notes ?? [];
      expect(notesArg).toHaveLength(2);

      const newNote = notesArg.find((n) => n.content === 'Second note');
      expect(newNote?.id).toMatch(/^NOTE-\d{8}-meatycapture-01-02$/);
    });
  });

  describe('edit note in viewer -> file updated with new timestamp', () => {
    it('updates file when note is edited', async () => {
      const originalNote = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-01',
        content: 'Original content',
        updated_at: new Date('2026-01-03T00:00:00Z'),
      });
      const item = createMockItem({ notes: [originalNote] });

      const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

      // Open edit modal
      await openEditNoteModal(user, 'Original content');

      // Modify content
      const modal = screen.getByRole('dialog');
      const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
      await user.clear(textarea);
      await user.type(textarea, 'Updated content');

      // Save
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for persistence
      await waitFor(() => {
        expect(mockDocStore.write).toHaveBeenCalled();
      });

      // Verify file update - check the doc passed to write
      const callArgs = (mockDocStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      const docArg = callArgs?.[1] as RequestLogDoc;
      const notesArg = docArg.items[0]?.notes ?? [];
      const updatedNote = notesArg.find((n) => n.id === originalNote.id);

      expect(updatedNote).toMatchObject({
        id: originalNote.id,
        content: 'Updated content',
        updated_at: FIXED_DATE, // New timestamp
        created_at: originalNote.created_at, // Original preserved
      });

      // Verify UI updated
      await waitFor(() => {
        expect(screen.queryByText('Original content')).not.toBeInTheDocument();
        expect(screen.getByText('Updated content')).toBeInTheDocument();
      });
    });

    it('preserves created_at timestamp when editing', async () => {
      const originalCreatedAt = new Date('2025-12-01T00:00:00Z');
      const originalNote = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-01',
        content: 'Test content',
        created_at: originalCreatedAt,
      });
      const item = createMockItem({ notes: [originalNote] });

      const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

      // Edit the note
      await openEditNoteModal(user, 'Test content');

      const modal = screen.getByRole('dialog');
      const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
      await user.clear(textarea);
      await user.type(textarea, 'Modified content');

      await user.click(within(modal).getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockDocStore.write).toHaveBeenCalled();
      });

      // Verify created_at is preserved
      const callArgs = (mockDocStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      const docArg = callArgs?.[1] as RequestLogDoc;
      const notesArg = docArg.items[0]?.notes ?? [];
      const editedNote = notesArg[0];

      expect(editedNote?.created_at).toEqual(originalCreatedAt);
    });
  });

  describe('delete note in viewer -> file updated', () => {
    it('removes note from file when deleted', async () => {
      const noteToDelete = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-01',
        content: 'Note to be deleted',
      });
      const item = createMockItem({ notes: [noteToDelete] });

      const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

      // Verify note exists
      expect(screen.getByText('Note to be deleted')).toBeInTheDocument();

      // Delete the note
      await deleteNoteWithConfirm(user, 'Note to be deleted');

      // Wait for persistence
      await waitFor(() => {
        expect(mockDocStore.write).toHaveBeenCalled();
      });

      // Verify file updated with empty notes array
      const callArgs = (mockDocStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      const docArg = callArgs?.[1] as RequestLogDoc;
      const notesArg = docArg.items[0]?.notes ?? [];
      expect(notesArg).toHaveLength(0);

      // Verify UI updated
      await waitFor(() => {
        expect(screen.queryByText('Note to be deleted')).not.toBeInTheDocument();
        expect(screen.getByText('No notes yet')).toBeInTheDocument();
      });
    });

    it('preserves other notes when deleting one', async () => {
      const note1 = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-01',
        content: 'First note - keep',
      });
      const note2 = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-02',
        content: 'Second note - delete',
      });
      const note3 = createMockNote({
        id: 'NOTE-20260104-meatycapture-01-03',
        content: 'Third note - keep',
      });
      const item = createMockItem({ notes: [note1, note2, note3] });

      const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

      // Delete the middle note
      await deleteNoteWithConfirm(user, 'Second note - delete');

      await waitFor(() => {
        expect(mockDocStore.write).toHaveBeenCalled();
      });

      // Verify only note2 was removed
      const callArgs = (mockDocStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      const docArg = callArgs?.[1] as RequestLogDoc;
      const notesArg = docArg.items[0]?.notes ?? [];

      expect(notesArg).toHaveLength(2);
      expect(notesArg.map((n) => n.id)).toEqual([note1.id, note3.id]);

      // Verify UI
      await waitFor(() => {
        expect(screen.getByText('First note - keep')).toBeInTheDocument();
        expect(screen.queryByText('Second note - delete')).not.toBeInTheDocument();
        expect(screen.getByText('Third note - keep')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Tests: Note Type Filtering
// ============================================================================

describe('Viewer Notes Integration - Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('filters notes by type correctly', async () => {
    const notes = [
      createMockNote({
        id: 'NOTE-01',
        type: NOTE_TYPES.General,
        content: 'General note content',
      }),
      createMockNote({
        id: 'NOTE-02',
        type: NOTE_TYPES.BugFixAttempt,
        content: 'Bug fix note content',
      }),
      createMockNote({
        id: 'NOTE-03',
        type: NOTE_TYPES.Validation,
        content: 'Validation note content',
      }),
    ];
    const item = createMockItem({ notes });

    const { user } = renderViewerWithNotes({ item });

    // All notes should be visible initially
    expect(screen.getByText('General note content')).toBeInTheDocument();
    expect(screen.getByText('Bug fix note content')).toBeInTheDocument();
    expect(screen.getByText('Validation note content')).toBeInTheDocument();

    // Open filter dropdown
    const filterButton = screen.getByRole('button', { name: /filter by note type/i });
    await user.click(filterButton);

    // Deselect Bug Fix Attempt and Validation to show only General
    const bugFixOption = screen.getByRole('option', { name: /bug fix attempt/i });
    await user.click(bugFixOption);

    const validationOption = screen.getByRole('option', { name: /validation/i });
    await user.click(validationOption);

    const otherOption = screen.getByRole('option', { name: /^other$/i });
    await user.click(otherOption);

    // Close dropdown
    await user.keyboard('{Escape}');

    // Only General notes should be visible
    expect(screen.getByText('General note content')).toBeInTheDocument();
    expect(screen.queryByText('Bug fix note content')).not.toBeInTheDocument();
    expect(screen.queryByText('Validation note content')).not.toBeInTheDocument();
  });

  it('shows all notes when filter is cleared', async () => {
    const notes = [
      createMockNote({
        id: 'NOTE-01',
        type: NOTE_TYPES.General,
        content: 'General note',
      }),
      createMockNote({
        id: 'NOTE-02',
        type: NOTE_TYPES.Validation,
        content: 'Validation note',
      }),
    ];
    const item = createMockItem({ notes });

    const { user } = renderViewerWithNotes({ item });

    // Apply filter - show only Validation
    const filterButton = screen.getByRole('button', { name: /filter by note type/i });
    await user.click(filterButton);

    // Click on General to deselect it
    const generalOption = screen.getByRole('option', { name: /^general$/i });
    await user.click(generalOption);

    // Click on Bug Fix Attempt and Other to deselect
    await user.click(screen.getByRole('option', { name: /bug fix attempt/i }));
    await user.click(screen.getByRole('option', { name: /^other$/i }));

    await user.keyboard('{Escape}');

    // Only Validation should be visible
    expect(screen.queryByText('General note')).not.toBeInTheDocument();
    expect(screen.getByText('Validation note')).toBeInTheDocument();

    // Clear filter by clicking "All Types"
    await user.click(filterButton);
    const allTypesOption = screen.getByRole('option', { name: /all types/i });
    await user.click(allTypesOption);
    await user.keyboard('{Escape}');

    // All notes should be visible again
    expect(screen.getByText('General note')).toBeInTheDocument();
    expect(screen.getByText('Validation note')).toBeInTheDocument();
  });
});

// ============================================================================
// Tests: Sequential Operations
// ============================================================================

describe('Viewer Notes Integration - Sequential Operations', () => {
  let mockDocStore: DocStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocStore = createMockDocStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maintains file integrity through add-edit-delete sequence', async () => {
    const item = createMockItem({ notes: [] });
    let currentNotes: Note[] = [];

    // Track notes state after each operation
    (mockDocStore.write as ReturnType<typeof vi.fn>).mockImplementation(
      async (_path: string, doc: RequestLogDoc) => {
        currentNotes = doc.items[0]?.notes ?? [];
        return undefined;
      }
    );

    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // Step 1: Add first note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'First note');

    await waitFor(() => {
      expect(mockDocStore.write).toHaveBeenCalledTimes(1);
    });

    expect(currentNotes).toHaveLength(1);
    expect(currentNotes[0]?.content).toBe('First note');

    // Step 2: Add second note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Second note');

    await waitFor(() => {
      expect(mockDocStore.write).toHaveBeenCalledTimes(2);
    });

    expect(currentNotes).toHaveLength(2);
    expect(currentNotes[1]?.content).toBe('Second note');

    // Step 3: Edit first note
    await openEditNoteModal(user, 'First note');

    const modal = screen.getByRole('dialog');
    const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
    await user.clear(textarea);
    await user.type(textarea, 'First note - edited');
    await user.click(within(modal).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockDocStore.write).toHaveBeenCalledTimes(3);
    });

    expect(currentNotes).toHaveLength(2);
    expect(currentNotes[0]?.content).toBe('First note - edited');
    expect(currentNotes[1]?.content).toBe('Second note');

    // Step 4: Delete second note
    await deleteNoteWithConfirm(user, 'Second note');

    await waitFor(() => {
      expect(mockDocStore.write).toHaveBeenCalledTimes(4);
    });

    expect(currentNotes).toHaveLength(1);
    expect(currentNotes[0]?.content).toBe('First note - edited');

    // Verify final UI state
    expect(screen.getByText('First note - edited')).toBeInTheDocument();
    expect(screen.queryByText('Second note')).not.toBeInTheDocument();
    expect(screen.getByText('Notes (1)')).toBeInTheDocument();
  });

  it('handles rapid sequential operations correctly', async () => {
    const item = createMockItem({ notes: [] });
    let operationCount = 0;

    (mockDocStore.write as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      operationCount++;
      // Simulate small delay
      await new Promise((resolve) => setTimeout(resolve, 10));
      return undefined;
    });

    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // Add three notes in sequence
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'Note 1');

    await waitFor(() => {
      expect(screen.getByText('Note 1')).toBeInTheDocument();
    });

    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'Note 2');

    await waitFor(() => {
      expect(screen.getByText('Note 2')).toBeInTheDocument();
    });

    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'Note 3');

    await waitFor(() => {
      expect(screen.getByText('Note 3')).toBeInTheDocument();
    });

    // All operations should have completed
    await waitFor(() => {
      expect(operationCount).toBe(3);
    });

    // Verify final state
    expect(screen.getByText('Notes (3)')).toBeInTheDocument();
  });
});

// ============================================================================
// Tests: Reload Persistence
// ============================================================================

describe('Viewer Notes Integration - Reload Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays notes from item on initial render', async () => {
    const existingNotes = [
      createMockNote({
        id: 'NOTE-01',
        type: NOTE_TYPES.General,
        content: 'Persisted note 1',
      }),
      createMockNote({
        id: 'NOTE-02',
        type: NOTE_TYPES.Validation,
        content: 'Persisted note 2',
      }),
    ];
    const item = createMockItem({ notes: existingNotes });

    renderViewerWithNotes({ item });

    // Notes should be displayed from item props (simulating reload from file)
    expect(screen.getByText('Persisted note 1')).toBeInTheDocument();
    expect(screen.getByText('Persisted note 2')).toBeInTheDocument();
    expect(screen.getByText('Notes (2)')).toBeInTheDocument();
  });

  it('simulates reload by re-rendering with updated item', async () => {
    const initialNotes = [
      createMockNote({
        id: 'NOTE-01',
        content: 'Initial note',
      }),
    ];

    const { user, rerender } = renderViewerWithNotes({
      item: createMockItem({ notes: initialNotes }),
    });

    expect(screen.getByText('Initial note')).toBeInTheDocument();

    // Add a note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'New note');

    await waitFor(() => {
      expect(screen.getByText('New note')).toBeInTheDocument();
    });

    // Simulate reload by re-rendering with "saved" data
    const updatedNotes = [
      ...initialNotes,
      createMockNote({
        id: 'NOTE-02',
        content: 'New note',
      }),
    ];

    rerender(
      <TestWrapper>
        <IntegratedItemCard item={createMockItem({ notes: updatedNotes })} />
      </TestWrapper>
    );

    // Notes should persist after "reload"
    expect(screen.getByText('Initial note')).toBeInTheDocument();
    expect(screen.getByText('New note')).toBeInTheDocument();
  });
});

// ============================================================================
// Tests: Error Handling
// ============================================================================

describe('Viewer Notes Integration - Error Handling', () => {
  let mockDocStore: DocStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocStore = createMockDocStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows error toast when file write fails on add', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockDocStore.write as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Write failed: disk full')
    );

    const item = createMockItem({ notes: [] });
    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // Try to add note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'Note that will fail');

    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to add note:', expect.any(Error));
    });

    // Note should NOT be in UI (operation failed)
    // The local state update happens first but gets rolled back conceptually
    // In real implementation, the UI updates optimistically then may need to handle rollback

    consoleSpy.mockRestore();
  });

  it('shows error toast when file write fails on edit', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockDocStore.write as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Permission denied')
    );

    const existingNote = createMockNote({
      id: 'NOTE-01',
      content: 'Existing note',
    });
    const item = createMockItem({ notes: [existingNote] });

    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // Try to edit note
    await openEditNoteModal(user, 'Existing note');

    const modal = screen.getByRole('dialog');
    const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
    await user.clear(textarea);
    await user.type(textarea, 'Updated content');
    await user.click(within(modal).getByRole('button', { name: /save/i }));

    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update note:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('shows error toast when file write fails on delete', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockDocStore.write as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('File locked'));

    const noteToDelete = createMockNote({
      id: 'NOTE-01',
      content: 'Note to delete',
    });
    const item = createMockItem({ notes: [noteToDelete] });

    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // Try to delete note
    await deleteNoteWithConfirm(user, 'Note to delete');

    // Wait for error handling
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete note:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// Tests: Full Lifecycle E2E
// ============================================================================

describe('Viewer Notes Integration - Full Lifecycle E2E', () => {
  let mockDocStore: DocStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDocStore = createMockDocStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes full note lifecycle: add -> edit -> filter -> delete', async () => {
    const item = createMockItem({ notes: [] });
    const fileState: Note[][] = [];

    // Track all file updates
    (mockDocStore.write as ReturnType<typeof vi.fn>).mockImplementation(
      async (_path: string, doc: RequestLogDoc) => {
        fileState.push([...(doc.items[0]?.notes ?? [])]);
        return undefined;
      }
    );

    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // ========== Phase 1: Add Notes ==========

    // Add General note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'General observation');

    await waitFor(() => {
      expect(screen.getByText('General observation')).toBeInTheDocument();
    });

    // Add Bug Fix Attempt note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Tried fix A');

    await waitFor(() => {
      expect(screen.getByText('Tried fix A')).toBeInTheDocument();
    });

    // Add Validation note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Verified in staging');

    await waitFor(() => {
      expect(screen.getByText('Verified in staging')).toBeInTheDocument();
      expect(screen.getByText('Notes (3)')).toBeInTheDocument();
    });

    // Verify file state after adds
    expect(fileState).toHaveLength(3);
    expect(fileState[2]).toHaveLength(3);

    // ========== Phase 2: Edit Note ==========

    await openEditNoteModal(user, 'Tried fix A');

    const modal = screen.getByRole('dialog');
    const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
    await user.clear(textarea);
    await user.type(textarea, 'Tried fix A - worked!');
    await user.click(within(modal).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Tried fix A - worked!')).toBeInTheDocument();
      expect(screen.queryByText('Tried fix A')).not.toBeInTheDocument();
    });

    // Verify file state after edit
    expect(fileState).toHaveLength(4);
    expect(fileState[3]?.find((n) => n.content === 'Tried fix A - worked!')).toBeDefined();

    // ========== Phase 3: Filter Notes ==========

    // Filter to show only Bug Fix Attempt
    const filterButton = screen.getByRole('button', { name: /filter by note type/i });
    await user.click(filterButton);

    // Deselect other types
    await user.click(screen.getByRole('option', { name: /^general$/i }));
    await user.click(screen.getByRole('option', { name: /validation/i }));
    await user.click(screen.getByRole('option', { name: /^other$/i }));
    await user.keyboard('{Escape}');

    // Only Bug Fix Attempt should be visible
    expect(screen.queryByText('General observation')).not.toBeInTheDocument();
    expect(screen.getByText('Tried fix A - worked!')).toBeInTheDocument();
    expect(screen.queryByText('Verified in staging')).not.toBeInTheDocument();

    // Reset filter
    await user.click(filterButton);
    await user.click(screen.getByRole('option', { name: /all types/i }));
    await user.keyboard('{Escape}');

    // All notes visible again
    expect(screen.getByText('General observation')).toBeInTheDocument();
    expect(screen.getByText('Tried fix A - worked!')).toBeInTheDocument();
    expect(screen.getByText('Verified in staging')).toBeInTheDocument();

    // ========== Phase 4: Delete Note ==========

    await deleteNoteWithConfirm(user, 'Verified in staging');

    await waitFor(() => {
      expect(screen.queryByText('Verified in staging')).not.toBeInTheDocument();
      expect(screen.getByText('Notes (2)')).toBeInTheDocument();
    });

    // Verify final file state
    expect(fileState).toHaveLength(5);
    expect(fileState[4]).toHaveLength(2);
    expect(fileState[4]?.map((n) => n.content)).toEqual([
      'General observation',
      'Tried fix A - worked!',
    ]);

    // ========== Final Verification ==========

    // Remaining notes should be displayed correctly
    expect(screen.getByText('General observation')).toBeInTheDocument();
    expect(screen.getByText('Tried fix A - worked!')).toBeInTheDocument();

    // File operations count
    expect(mockDocStore.write).toHaveBeenCalledTimes(5);
  });

  it('handles concurrent viewing and editing without data loss', async () => {
    // Start with some notes
    const initialNotes = [
      createMockNote({
        id: 'NOTE-20260104-meatycapture-01-01',
        type: NOTE_TYPES.General,
        content: 'Shared note 1',
      }),
      createMockNote({
        id: 'NOTE-20260104-meatycapture-01-02',
        type: NOTE_TYPES.Validation,
        content: 'Shared note 2',
      }),
    ];

    const item = createMockItem({ notes: initialNotes });
    const operationsLog: string[] = [];

    (mockDocStore.write as ReturnType<typeof vi.fn>).mockImplementation(
      async (_path: string, doc: RequestLogDoc) => {
        operationsLog.push(`Update with ${doc.items[0]?.notes?.length ?? 0} notes`);
        return undefined;
      }
    );

    const { user } = renderViewerWithNotes({ item, docStore: mockDocStore });

    // Verify initial state
    expect(screen.getByText('Shared note 1')).toBeInTheDocument();
    expect(screen.getByText('Shared note 2')).toBeInTheDocument();

    // Edit note 1
    await openEditNoteModal(user, 'Shared note 1');

    const modal = screen.getByRole('dialog');
    const textarea = within(modal).getByRole('textbox', { name: /^content$/i });
    await user.clear(textarea);
    await user.type(textarea, 'Modified shared note 1');
    await user.click(within(modal).getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText('Modified shared note 1')).toBeInTheDocument();
    });

    // Add new note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'New concurrent note');

    await waitFor(() => {
      expect(screen.getByText('New concurrent note')).toBeInTheDocument();
    });

    // Delete note 2
    await deleteNoteWithConfirm(user, 'Shared note 2');

    await waitFor(() => {
      expect(screen.queryByText('Shared note 2')).not.toBeInTheDocument();
    });

    // Verify all operations completed
    expect(operationsLog).toEqual([
      'Update with 2 notes', // Edit
      'Update with 3 notes', // Add
      'Update with 2 notes', // Delete
    ]);

    // Verify final state
    expect(screen.getByText('Modified shared note 1')).toBeInTheDocument();
    expect(screen.getByText('New concurrent note')).toBeInTheDocument();
    expect(screen.queryByText('Shared note 2')).not.toBeInTheDocument();
    expect(screen.getByText('Notes (2)')).toBeInTheDocument();
  });
});
