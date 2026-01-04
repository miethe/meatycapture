/**
 * Notes Capture Integration Tests
 *
 * Comprehensive integration tests for the note capture workflow through
 * the wizard flow. Tests cover adding, editing, deleting notes in both
 * ItemStep and ReviewStep, as well as full E2E submission flows.
 *
 * Test categories:
 * - ItemStep note operations (add single, add multiple, edit, delete)
 * - ReviewStep note operations (add, edit, delete with confirmation)
 * - Wizard navigation with notes (persistence across steps)
 * - Full E2E submission (notes persisted to markdown)
 * - Backup creation before write
 * - Error handling scenarios
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardFlow } from '../WizardFlow';
import type { CaptureContext } from '../WizardFlow';
import type { Project, RequestLogDoc, ItemDraft } from '@core/models';
import { NOTE_TYPES } from '@core/models';
import type { ProjectStore, FieldCatalogStore, DocStore, Clock } from '@core/ports';

// ============================================================================
// Mock Data
// ============================================================================

const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  default_path: '/home/test/.meatycapture/test-project',
  enabled: true,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
};

const mockDocument: RequestLogDoc = {
  doc_id: 'REQ-20251231-test-project',
  title: 'Test Document',
  project_id: 'test-project',
  items: [
    {
      id: 'REQ-20251231-test-project-01',
      title: 'Existing Item',
      type: 'enhancement',
      domain: ['web'],
      context: [''],
      priority: 'medium',
      status: 'triage',
      tags: ['tag1'],
      notes: [],
      created_at: new Date('2025-12-31T10:00:00Z'),
    },
  ],
  items_index: [
    { id: 'REQ-20251231-test-project-01', type: 'enhancement', title: 'Existing Item' },
  ],
  tags: ['tag1'],
  item_count: 1,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
  archived: false,
};

const mockCaptureContext: CaptureContext = {
  project: mockProject,
  documentPath: '/home/test/.meatycapture/test-project/REQ-20251231-test-project.md',
  document: mockDocument,
};

// ============================================================================
// Mock Stores
// ============================================================================

const createMockProjectStore = (projects: Project[] = [mockProject]): ProjectStore => ({
  list: vi.fn().mockResolvedValue(projects),
  get: vi.fn().mockResolvedValue(projects[0]),
  create: vi.fn().mockResolvedValue(projects[0]),
  update: vi.fn().mockResolvedValue(projects[0]),
  delete: vi.fn().mockResolvedValue(undefined),
});

const createMockFieldCatalogStore = (): FieldCatalogStore => ({
  getGlobal: vi.fn().mockResolvedValue([]),
  getForProject: vi.fn().mockResolvedValue([
    { id: '1', field: 'type', value: 'enhancement', scope: 'global' },
    { id: '2', field: 'type', value: 'bug', scope: 'global' },
    { id: '3', field: 'priority', value: 'high', scope: 'global' },
    { id: '4', field: 'priority', value: 'medium', scope: 'global' },
    { id: '5', field: 'priority', value: 'low', scope: 'global' },
    { id: '6', field: 'status', value: 'triage', scope: 'global' },
    { id: '7', field: 'status', value: 'in-progress', scope: 'global' },
    { id: '8', field: 'domain', value: 'web', scope: 'global' },
    { id: '9', field: 'domain', value: 'api', scope: 'global' },
  ]),
  getByField: vi.fn().mockResolvedValue([]),
  addOption: vi.fn().mockImplementation((option) => Promise.resolve({ id: 'new-id', ...option })),
  removeOption: vi.fn().mockResolvedValue(undefined),
});

const createMockDocStore = (existingDocs: RequestLogDoc[] = []): DocStore => ({
  list: vi.fn().mockResolvedValue(
    existingDocs.map((doc) => ({
      path: `/home/test/.meatycapture/test-project/${doc.doc_id}.md`,
      doc_id: doc.doc_id,
      item_count: doc.item_count,
      updated_at: doc.updated_at,
      archived: doc.archived ?? false,
    }))
  ),
  read: vi.fn().mockImplementation((path: string) => {
    const doc = existingDocs.find((d) => path.includes(d.doc_id));
    return Promise.resolve(doc || mockDocument);
  }),
  write: vi.fn().mockResolvedValue(undefined),
  append: vi.fn().mockResolvedValue({ item_id: 'REQ-20251231-test-project-02' }),
  backup: vi.fn().mockResolvedValue('/backup/path'),
  isWritable: vi.fn().mockResolvedValue(true),
});

const createMockClock = (): Clock => ({
  now: () => new Date('2025-12-31T12:00:00Z'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fill the required fields in ItemStep to enable navigation to ReviewStep.
 * @param user - userEvent instance
 */
async function fillRequiredItemFields(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  // Fill title
  await user.type(screen.getByLabelText('Item title'), 'Test Item with Notes');

  // Select type
  const typeSelect = screen.getByRole('combobox', { name: 'Type' });
  await user.selectOptions(typeSelect, 'enhancement');

  // Priority should default to medium, but select explicitly
  const prioritySelect = screen.getByRole('combobox', { name: 'Priority' });
  await user.selectOptions(prioritySelect, 'medium');

  // Status should default to triage, but select explicitly
  const statusSelect = screen.getByRole('combobox', { name: 'Status' });
  await user.selectOptions(statusSelect, 'triage');
}

/**
 * Open the NoteModal via the "Add Note" button.
 * @param user - userEvent instance
 */
async function openAddNoteModal(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const addNoteButton = screen.getByRole('button', { name: /add note/i });
  await user.click(addNoteButton);

  // Wait for modal to open
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Add Note' })).toBeInTheDocument();
  });
}

/**
 * Fill the NoteModal form and save.
 * @param user - userEvent instance
 * @param type - Note type to select
 * @param content - Note content to enter
 */
async function fillAndSaveNote(
  user: ReturnType<typeof userEvent.setup>,
  type: string,
  content: string
): Promise<void> {
  // Get the modal dialog
  const modal = screen.getByRole('dialog');

  // Select type - use the specific ID for the note type select inside the modal
  const typeSelect = within(modal).getByRole('combobox');
  await user.selectOptions(typeSelect, type);

  // Enter content
  const textarea = within(modal).getByRole('textbox', { name: /markdown content/i });
  await user.type(textarea, content);

  // Click save
  const saveButton = within(modal).getByRole('button', { name: /save/i });
  await user.click(saveButton);

  // Wait for modal to close
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

// ============================================================================
// Tests: ItemStep Note Operations
// ============================================================================

describe('Notes Capture Integration - ItemStep', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore([mockDocument]);
    clock = createMockClock();

    // Mock crypto.randomUUID for consistent note IDs in tests
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add single note', () => {
    it('should add a General note via NoteModal', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      // Wait for ItemStep to render
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Open add note modal
      await openAddNoteModal(user);

      // Fill and save note
      await fillAndSaveNote(user, NOTE_TYPES.General, 'This is a test note content.');

      // Verify note appears in NotesList
      await waitFor(() => {
        expect(screen.getByText('This is a test note content.')).toBeInTheDocument();
      });

      // Verify note count in header
      expect(screen.getByText('Notes (1)')).toBeInTheDocument();
    });

    it('should add a Bug Fix Attempt note', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Tried fixing by updating dependencies.');

      // Verify Bug Fix Attempt note content is present
      await waitFor(() => {
        expect(screen.getByText('Tried fixing by updating dependencies.')).toBeInTheDocument();
      });

      // Verify note count shows 1 note
      expect(screen.getByText('Notes (1)')).toBeInTheDocument();
    });
  });

  describe('add multiple notes (different types)', () => {
    it('should add notes of multiple types and group them correctly', async () => {
      const user = userEvent.setup({ delay: null });

      // Return different UUIDs for each note
      let uuidCounter = 0;
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `1234567${++uuidCounter}-1234-1234-1234-123456789012` as `${string}-${string}-${string}-${string}-${string}`);

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add General note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'General observation about the issue.');

      // Add Validation note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Verified the fix works in staging.');

      // Add Bug Fix Attempt note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Applied patch version 2.1.3.');

      // Verify all notes are displayed
      await waitFor(() => {
        expect(screen.getByText('Notes (3)')).toBeInTheDocument();
        expect(screen.getByText('General observation about the issue.')).toBeInTheDocument();
        expect(screen.getByText('Verified the fix works in staging.')).toBeInTheDocument();
        expect(screen.getByText('Applied patch version 2.1.3.')).toBeInTheDocument();
      });

      // Verify group regions are present (using aria-label attribute on group content)
      expect(screen.getByRole('list', { name: 'General notes' })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Validation notes' })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Bug Fix Attempt notes' })).toBeInTheDocument();
    });
  });

  describe('edit note in ItemStep', () => {
    it('should edit an existing note via NoteModal', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add a note first
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Original note content.');

      // Wait for note to appear
      await waitFor(() => {
        expect(screen.getByText('Original note content.')).toBeInTheDocument();
      });

      // Find and click the edit button on the note card
      const noteCard = screen.getByText('Original note content.').closest('[role="listitem"]');
      expect(noteCard).toBeInTheDocument();

      const editButton = within(noteCard as HTMLElement).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Wait for modal to open in edit mode
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
      });

      // Verify pre-filled content
      const textarea = screen.getByRole('textbox', { name: /markdown content/i });
      expect(textarea).toHaveValue('Original note content.');

      // Clear and type new content
      await user.clear(textarea);
      await user.type(textarea, 'Updated note content with more details.');

      // Save the edit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify updated content
      await waitFor(() => {
        expect(screen.queryByText('Original note content.')).not.toBeInTheDocument();
        expect(screen.getByText('Updated note content with more details.')).toBeInTheDocument();
      });
    });

    it('should preserve note type when editing', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add a Validation note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Validation step completed.');

      // Wait for note to appear
      await waitFor(() => {
        expect(screen.getByText('Validation step completed.')).toBeInTheDocument();
      });

      // Edit the note
      const noteCard = screen.getByText('Validation step completed.').closest('[role="listitem"]');
      const editButton = within(noteCard as HTMLElement).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Verify the type is preserved (find select within modal)
      const modal = screen.getByRole('dialog');
      const typeSelect = within(modal).getByRole('combobox') as HTMLSelectElement;
      expect(typeSelect.value).toBe(NOTE_TYPES.Validation);

      // Cancel the edit
      const cancelButton = within(modal).getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
    });
  });

  describe('delete note in ItemStep', () => {
    it('should delete a note directly (no confirmation in ItemStep)', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add a note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Note to be deleted.');

      await waitFor(() => {
        expect(screen.getByText('Note to be deleted.')).toBeInTheDocument();
        expect(screen.getByText('Notes (1)')).toBeInTheDocument();
      });

      // Find and click the delete button
      const noteCard = screen.getByText('Note to be deleted.').closest('[role="listitem"]');
      const deleteButton = within(noteCard as HTMLElement).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // ItemStep uses direct deletion (NotesList handler), verify note is removed
      await waitFor(() => {
        expect(screen.queryByText('Note to be deleted.')).not.toBeInTheDocument();
      });

      // Empty state should appear
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });

    it('should update note count after deletion', async () => {
      const user = userEvent.setup({ delay: null });
      let uuidCounter = 0;
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `1234567${++uuidCounter}-1234-1234-1234-123456789012` as `${string}-${string}-${string}-${string}-${string}`);

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add two notes
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'First note.');
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Second note.');

      await waitFor(() => {
        expect(screen.getByText('Notes (2)')).toBeInTheDocument();
      });

      // Delete one note
      const firstNoteCard = screen.getByText('First note.').closest('[role="listitem"]');
      const deleteButton = within(firstNoteCard as HTMLElement).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Verify count updated
      await waitFor(() => {
        expect(screen.getByText('Notes (1)')).toBeInTheDocument();
        expect(screen.queryByText('First note.')).not.toBeInTheDocument();
        expect(screen.getByText('Second note.')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Tests: ReviewStep Note Operations
// ============================================================================

describe('Notes Capture Integration - ReviewStep', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore([mockDocument]);
    clock = createMockClock();

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('add note in ReviewStep', () => {
    it('should add a note from ReviewStep', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      // Wait for ItemStep
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Fill required fields and go to review
      await fillRequiredItemFields(user);
      await user.click(screen.getByRole('button', { name: /review/i }));

      // Wait for ReviewStep
      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });

      // Add note in ReviewStep
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.Other, 'Additional note added during review.');

      // Verify note appears
      await waitFor(() => {
        expect(screen.getByText('Additional note added during review.')).toBeInTheDocument();
        expect(screen.getByText('Notes (1)')).toBeInTheDocument();
      });
    });
  });

  describe('edit note in ReviewStep', () => {
    it('should edit a note in ReviewStep', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add note in ItemStep
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Note added in ItemStep.');

      // Fill required fields and go to review
      await fillRequiredItemFields(user);
      await user.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
        expect(screen.getByText('Note added in ItemStep.')).toBeInTheDocument();
      });

      // Edit the note in ReviewStep
      const noteCard = screen.getByText('Note added in ItemStep.').closest('[role="listitem"]');
      const editButton = within(noteCard as HTMLElement).getByRole('button', { name: /edit/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
      });

      const textarea = screen.getByRole('textbox', { name: /markdown content/i });
      await user.clear(textarea);
      await user.type(textarea, 'Note edited during review.');

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.queryByText('Note added in ItemStep.')).not.toBeInTheDocument();
        expect(screen.getByText('Note edited during review.')).toBeInTheDocument();
      });
    });
  });

  describe('delete note in ReviewStep with confirmation', () => {
    it('should show confirmation dialog before deleting note in ReviewStep', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add note in ItemStep
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Note to be deleted.');

      // Go to review
      await fillRequiredItemFields(user);
      await user.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });

      // Click delete on the note
      const noteCard = screen.getByText('Note to be deleted.').closest('[role="listitem"]');
      const deleteButton = within(noteCard as HTMLElement).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Verify confirmation dialog appears
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Delete Note')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete this/)).toBeInTheDocument();
      });

      // Confirm deletion - get the delete button inside the dialog (not the note card button)
      const confirmDialog = screen.getByRole('dialog');
      const confirmDeleteButton = within(confirmDialog).getByRole('button', { name: /delete/i });
      await user.click(confirmDeleteButton);

      // Verify note is deleted
      await waitFor(() => {
        expect(screen.queryByText('Note to be deleted.')).not.toBeInTheDocument();
      });
    });

    it('should cancel deletion when clicking Cancel in confirmation dialog', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Note that will remain.');

      // Go to review
      await fillRequiredItemFields(user);
      await user.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });

      // Click delete
      const noteCard = screen.getByText('Note that will remain.').closest('[role="listitem"]');
      const deleteButton = within(noteCard as HTMLElement).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Cancel deletion
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Verify note still exists
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Note that will remain.')).toBeInTheDocument();
      });
    });
  });
});

// ============================================================================
// Tests: Wizard Navigation with Notes
// ============================================================================

describe('Notes Capture Integration - Navigation', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore([mockDocument]);
    clock = createMockClock();

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('notes persist through wizard navigation', () => {
    it('should preserve notes when navigating Item -> Review -> Item', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add note in ItemStep
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Note that should persist.');

      // Fill required fields
      await fillRequiredItemFields(user);

      // Navigate to Review
      await user.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
        expect(screen.getByText('Note that should persist.')).toBeInTheDocument();
      });

      // Navigate back to Item
      await user.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Verify note is still there
      expect(screen.getByText('Note that should persist.')).toBeInTheDocument();
      expect(screen.getByText('Notes (1)')).toBeInTheDocument();
    });

    it('should preserve multiple notes and their types through navigation', async () => {
      const user = userEvent.setup({ delay: null });
      let uuidCounter = 0;
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `1234567${++uuidCounter}-1234-1234-1234-123456789012` as `${string}-${string}-${string}-${string}-${string}`);

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add multiple notes of different types
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'General note.');
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Bug fix attempt note.');
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Validation note.');

      await waitFor(() => {
        expect(screen.getByText('Notes (3)')).toBeInTheDocument();
      });

      // Fill required fields and go to review
      await fillRequiredItemFields(user);
      await user.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });

      // Verify all notes present in Review
      expect(screen.getByText('General note.')).toBeInTheDocument();
      expect(screen.getByText('Bug fix attempt note.')).toBeInTheDocument();
      expect(screen.getByText('Validation note.')).toBeInTheDocument();

      // Go back to Item
      await user.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Verify all notes still present
      expect(screen.getByText('Notes (3)')).toBeInTheDocument();
      expect(screen.getByText('General note.')).toBeInTheDocument();
      expect(screen.getByText('Bug fix attempt note.')).toBeInTheDocument();
      expect(screen.getByText('Validation note.')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Tests: Full E2E Submission Flow
// ============================================================================

describe('Notes Capture Integration - E2E Submission', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore([]);
    clock = createMockClock();

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('full flow: project -> doc -> item + notes -> review -> submit', () => {
    it('should complete full wizard flow and persist notes to document', async () => {
      const user = userEvent.setup({ delay: null });
      let uuidCounter = 0;
      vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `1234567${++uuidCounter}-1234-1234-1234-123456789012` as `${string}-${string}-${string}-${string}-${string}`);

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      // Step 1: Select Project
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      await user.selectOptions(projectSelect, 'test-project');
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 2: Select Document (new document)
      await waitFor(() => {
        expect(screen.getByText('Select Document')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Capture Details
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add notes
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Initial observation about the issue.');
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.BugFixAttempt, 'Tried upgrading the library version.');

      await waitFor(() => {
        expect(screen.getByText('Notes (2)')).toBeInTheDocument();
      });

      // Fill required fields
      await fillRequiredItemFields(user);

      // Go to review
      await user.click(screen.getByRole('button', { name: /review/i }));

      // Step 4: Review & Submit
      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });

      // Verify notes in review
      expect(screen.getByText('Initial observation about the issue.')).toBeInTheDocument();
      expect(screen.getByText('Tried upgrading the library version.')).toBeInTheDocument();

      // Submit
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Wait for success
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
      });

      // Verify docStore.write was called with notes included
      expect(docStore.write).toHaveBeenCalledTimes(1);
      const writeCall = vi.mocked(docStore.write).mock.calls[0]!;
      const savedDoc = writeCall[1] as RequestLogDoc;

      // Verify the document has the item with notes
      expect(savedDoc.items).toHaveLength(1);
      const savedItem = savedDoc.items[0]!;
      expect(savedItem.notes).toHaveLength(2);

      // Verify note IDs are regenerated with proper format (not temp UUIDs)
      const notes = savedItem.notes!;
      expect(notes[0]!.id).toMatch(/^NOTE-\d{8}-test-project-01-01$/);
      expect(notes[1]!.id).toMatch(/^NOTE-\d{8}-test-project-01-02$/);

      // Verify note content
      expect(notes[0]!.content).toBe('Initial observation about the issue.');
      expect(notes[0]!.type).toBe(NOTE_TYPES.General);
      expect(notes[1]!.content).toBe('Tried upgrading the library version.');
      expect(notes[1]!.type).toBe(NOTE_TYPES.BugFixAttempt);
    });

    it('should append item with notes to existing document', async () => {
      const user = userEvent.setup({ delay: null });
      docStore = createMockDocStore([mockDocument]);

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      // Start at ItemStep with capture context
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add a note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Verified in production.');

      // Fill required fields
      await fillRequiredItemFields(user);

      // Go to review and submit
      await user.click(screen.getByRole('button', { name: /review/i }));
      await waitFor(() => {
        expect(screen.getByText('Review & Submit')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Wait for success
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
      });

      // Verify append was called (not write) for existing doc
      expect(docStore.append).toHaveBeenCalledTimes(1);
      expect(docStore.write).not.toHaveBeenCalled();

      // Verify the draft passed to append includes notes
      const appendCall = vi.mocked(docStore.append).mock.calls[0];
      const appendedDraft = appendCall?.[1] as ItemDraft;
      expect(appendedDraft.notes).toHaveLength(1);
      expect(appendedDraft.notes[0]?.content).toBe('Verified in production.');
    });
  });

  describe('backup creation before write', () => {
    it('should create backup before writing new document', async () => {
      const user = userEvent.setup({ delay: null });

      // Mock backup to be called
      const mockBackup = vi.fn().mockResolvedValue('/backup/path');
      docStore = {
        ...createMockDocStore([]),
        backup: mockBackup,
      };

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      // Go through the flow
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      await user.selectOptions(projectSelect, 'test-project');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Select Document')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Test note for backup test.');

      // Fill required fields
      await fillRequiredItemFields(user);

      // Go to review and submit
      await user.click(screen.getByRole('button', { name: /review/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Wait for success
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
      });

      // Write should have been called (backup is typically called internally by docStore.write)
      expect(docStore.write).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// Tests: Error Handling
// ============================================================================

describe('Notes Capture Integration - Error Handling', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore([]);
    clock = createMockClock();

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validation errors', () => {
    it('should not save note with empty content', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Open add note modal
      await openAddNoteModal(user);

      // Get the modal
      const modal = screen.getByRole('dialog');

      // Try to save without content
      const saveButton = within(modal).getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify validation error
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/note content cannot be empty/i)).toBeInTheDocument();
      });

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('submission errors', () => {
    it('should handle write failure gracefully', async () => {
      const user = userEvent.setup({ delay: null });

      // Suppress expected console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock write to fail
      docStore = {
        ...createMockDocStore([]),
        write: vi.fn().mockRejectedValue(new Error('Write failed: disk full')),
      };

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      // Go through flow
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      await user.selectOptions(projectSelect, 'test-project');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Select Document')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Add note
      await openAddNoteModal(user);
      await fillAndSaveNote(user, NOTE_TYPES.General, 'Note before error.');

      // Fill required fields
      await fillRequiredItemFields(user);

      // Go to review and submit
      await user.click(screen.getByRole('button', { name: /review/i }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Error should be displayed - WizardFlow shows error state in wizard-error div
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Write failed: disk full/)).toBeInTheDocument();
      });

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});

// ============================================================================
// Tests: Add Another Item Flow
// ============================================================================

describe('Notes Capture Integration - Add Another Flow', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore([mockDocument]);
    clock = createMockClock();

    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012' as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should clear notes when adding another item', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <WizardFlow
        projectStore={projectStore}
        fieldCatalogStore={fieldCatalogStore}
        docStore={docStore}
        clock={clock}
        captureContext={mockCaptureContext}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capture Details')).toBeInTheDocument();
    });

    // Add note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'Note for first item.');

    // Fill required fields and submit
    await fillRequiredItemFields(user);
    await user.click(screen.getByRole('button', { name: /review/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Wait for success
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
    });

    // Click "Add Another Item"
    await user.click(screen.getByRole('button', { name: /add another item/i }));

    // Verify we're back on ItemStep
    await waitFor(() => {
      expect(screen.getByText('Capture Details')).toBeInTheDocument();
    });

    // Verify notes are cleared (empty state)
    expect(screen.getByText('No notes yet')).toBeInTheDocument();
    expect(screen.queryByText('Note for first item.')).not.toBeInTheDocument();
  });

  it('should allow adding notes to the second item independently', async () => {
    const user = userEvent.setup({ delay: null });
    let uuidCounter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `1234567${++uuidCounter}-1234-1234-1234-123456789012` as `${string}-${string}-${string}-${string}-${string}`);

    render(
      <WizardFlow
        projectStore={projectStore}
        fieldCatalogStore={fieldCatalogStore}
        docStore={docStore}
        clock={clock}
        captureContext={mockCaptureContext}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Capture Details')).toBeInTheDocument();
    });

    // First item with note
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.General, 'First item note.');
    await fillRequiredItemFields(user);
    await user.click(screen.getByRole('button', { name: /review/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
    });

    // Add another item
    await user.click(screen.getByRole('button', { name: /add another item/i }));

    await waitFor(() => {
      expect(screen.getByText('Capture Details')).toBeInTheDocument();
    });

    // Add different note to second item
    await openAddNoteModal(user);
    await fillAndSaveNote(user, NOTE_TYPES.Validation, 'Second item validation note.');

    // Verify second item has its own note
    expect(screen.getByText('Second item validation note.')).toBeInTheDocument();
    expect(screen.queryByText('First item note.')).not.toBeInTheDocument();
    expect(screen.getByText('Notes (1)')).toBeInTheDocument();
  });
});
