/**
 * NotesList Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesList } from '../NotesList';
import type { Note } from '@core/models';
import { NOTE_TYPES } from '@core/models';

// Mock note factory for testing
const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: `NOTE-${Date.now()}-test-01-${Math.random().toString(36).slice(2, 4)}`,
  type: NOTE_TYPES.General,
  content: 'Test note content',
  created_at: new Date('2026-01-03T10:00:00Z'),
  updated_at: new Date('2026-01-03T10:00:00Z'),
  ...overrides,
});

describe('NotesList', () => {
  const defaultProps = {
    notes: [] as Note[],
    onAddNote: vi.fn(),
    onEditNote: vi.fn(),
    onDeleteNote: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('empty state', () => {
    it('renders empty state when no notes', () => {
      render(<NotesList {...defaultProps} notes={[]} />);

      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Click "Add Note" to create your first note/)
      ).toBeInTheDocument();
    });

    it('renders add button in empty state', () => {
      render(<NotesList {...defaultProps} notes={[]} />);

      const addButton = screen.getByRole('button', { name: /add note/i });
      expect(addButton).toBeInTheDocument();
    });

    it('calls onAddNote when add button clicked in empty state', async () => {
      const onAddNote = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<NotesList {...defaultProps} notes={[]} onAddNote={onAddNote} />);

      const addButton = screen.getByRole('button', { name: /add note/i });
      await user.click(addButton);

      expect(onAddNote).toHaveBeenCalledTimes(1);
    });

    it('has section with proper aria-label', () => {
      render(<NotesList {...defaultProps} notes={[]} />);

      const section = screen.getByRole('region', { name: 'Notes' });
      expect(section).toBeInTheDocument();
    });
  });

  describe('header', () => {
    it('renders title with note count when notes exist', () => {
      const notes = [createMockNote(), createMockNote()];
      render(<NotesList {...defaultProps} notes={notes} />);

      expect(screen.getByText('Notes (2)')).toBeInTheDocument();
    });

    it('renders add button when notes exist', () => {
      const notes = [createMockNote()];
      render(<NotesList {...defaultProps} notes={notes} />);

      const addButton = screen.getByRole('button', { name: /add note/i });
      expect(addButton).toBeInTheDocument();
    });

    it('calls onAddNote when add button clicked', async () => {
      const onAddNote = vi.fn();
      const user = userEvent.setup({ delay: null });
      const notes = [createMockNote()];

      render(<NotesList {...defaultProps} notes={notes} onAddNote={onAddNote} />);

      const addButton = screen.getByRole('button', { name: /add note/i });
      await user.click(addButton);

      expect(onAddNote).toHaveBeenCalledTimes(1);
    });
  });

  describe('grouping', () => {
    // Helper to get group headers by their CSS class
    const getGroupHeaders = (container: HTMLElement) =>
      container.querySelectorAll('.notes-list__group-header');

    it('groups notes by type', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General }),
        createMockNote({ id: 'note-2', type: NOTE_TYPES.BugFixAttempt }),
        createMockNote({ id: 'note-3', type: NOTE_TYPES.General }),
      ];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      // Check group headers exist by CSS class
      const groupHeaders = getGroupHeaders(container);
      const headerTexts = Array.from(groupHeaders).map((h) => h.textContent);

      expect(headerTexts.some((t) => t?.includes('General'))).toBe(true);
      expect(headerTexts.some((t) => t?.includes('Bug Fix Attempt'))).toBe(true);
    });

    it('shows count in group headers', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General }),
        createMockNote({ id: 'note-2', type: NOTE_TYPES.General }),
        createMockNote({ id: 'note-3', type: NOTE_TYPES.Validation }),
      ];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      // Check counts in headers using CSS selectors
      const groupHeaders = getGroupHeaders(container);
      const generalHeader = Array.from(groupHeaders).find((h) => h.textContent?.includes('General'));
      const validationHeader = Array.from(groupHeaders).find((h) => h.textContent?.includes('Validation'));

      expect(within(generalHeader as HTMLElement).getByText('(2)')).toBeInTheDocument();
      expect(within(validationHeader as HTMLElement).getByText('(1)')).toBeInTheDocument();
    });

    it('hides empty groups', () => {
      const notes = [createMockNote({ type: NOTE_TYPES.General })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      // Check using CSS class selectors
      const groupHeaders = getGroupHeaders(container);
      const headerTexts = Array.from(groupHeaders).map((h) => h.textContent);

      // General should exist
      expect(headerTexts.some((t) => t?.includes('General'))).toBe(true);

      // Other types should not exist (no notes of those types)
      expect(headerTexts.some((t) => t?.includes('Bug Fix Attempt'))).toBe(false);
      expect(headerTexts.some((t) => t?.includes('Validation'))).toBe(false);
      expect(headerTexts.filter((t) => t?.includes('Other')).length).toBe(0);
    });

    it('displays groups in correct order', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.Other }),
        createMockNote({ id: 'note-2', type: NOTE_TYPES.General }),
        createMockNote({ id: 'note-3', type: NOTE_TYPES.Validation }),
        createMockNote({ id: 'note-4', type: NOTE_TYPES.BugFixAttempt }),
      ];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const groupHeaders = container.querySelectorAll('.notes-list__group-header');
      const headerTexts = Array.from(groupHeaders).map((h) => h.textContent);

      // Order should be: General, Bug Fix Attempt, Validation, Other
      expect(headerTexts[0]).toContain('General');
      expect(headerTexts[1]).toContain('Bug Fix Attempt');
      expect(headerTexts[2]).toContain('Validation');
      expect(headerTexts[3]).toContain('Other');
    });
  });

  describe('sorting within groups', () => {
    it('sorts notes by created_at descending (newest first)', () => {
      const oldNote = createMockNote({
        id: 'old-note',
        type: NOTE_TYPES.General,
        content: 'Old content',
        created_at: new Date('2026-01-01T10:00:00Z'),
      });
      const newNote = createMockNote({
        id: 'new-note',
        type: NOTE_TYPES.General,
        content: 'New content',
        created_at: new Date('2026-01-03T10:00:00Z'),
      });
      const middleNote = createMockNote({
        id: 'middle-note',
        type: NOTE_TYPES.General,
        content: 'Middle content',
        created_at: new Date('2026-01-02T10:00:00Z'),
      });

      // Pass in wrong order to test sorting
      const notes = [oldNote, newNote, middleNote];
      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      // Get all note content elements in order using CSS class
      const noteTextElements = container.querySelectorAll('.note-card__text');
      expect(noteTextElements[0]).toHaveTextContent('New content');
      expect(noteTextElements[1]).toHaveTextContent('Middle content');
      expect(noteTextElements[2]).toHaveTextContent('Old content');
    });
  });

  describe('filtering', () => {
    it('shows all notes when activeFilter is undefined', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General, content: 'General note' }),
        createMockNote({
          id: 'note-2',
          type: NOTE_TYPES.BugFixAttempt,
          content: 'Bug fix note',
        }),
      ];

      render(<NotesList {...defaultProps} notes={notes} />);

      expect(screen.getByText('General note')).toBeInTheDocument();
      expect(screen.getByText('Bug fix note')).toBeInTheDocument();
    });

    it('shows all notes when activeFilter is empty array', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General, content: 'General note' }),
        createMockNote({
          id: 'note-2',
          type: NOTE_TYPES.Validation,
          content: 'Validation note',
        }),
      ];

      render(<NotesList {...defaultProps} notes={notes} activeFilter={[]} />);

      expect(screen.getByText('General note')).toBeInTheDocument();
      expect(screen.getByText('Validation note')).toBeInTheDocument();
    });

    it('filters notes to only show matching types', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General, content: 'General note' }),
        createMockNote({
          id: 'note-2',
          type: NOTE_TYPES.BugFixAttempt,
          content: 'Bug fix note',
        }),
        createMockNote({
          id: 'note-3',
          type: NOTE_TYPES.Validation,
          content: 'Validation note',
        }),
      ];

      render(
        <NotesList
          {...defaultProps}
          notes={notes}
          activeFilter={[NOTE_TYPES.General, NOTE_TYPES.Validation]}
        />
      );

      expect(screen.getByText('General note')).toBeInTheDocument();
      expect(screen.getByText('Validation note')).toBeInTheDocument();
      expect(screen.queryByText('Bug fix note')).not.toBeInTheDocument();
    });

    it('shows empty state when filter excludes all notes', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General, content: 'General note' }),
      ];

      render(
        <NotesList {...defaultProps} notes={notes} activeFilter={[NOTE_TYPES.BugFixAttempt]} />
      );

      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      expect(screen.queryByText('General note')).not.toBeInTheDocument();
    });

    it('updates note count in header based on filter', () => {
      const notes = [
        createMockNote({ id: 'note-1', type: NOTE_TYPES.General }),
        createMockNote({ id: 'note-2', type: NOTE_TYPES.General }),
        createMockNote({ id: 'note-3', type: NOTE_TYPES.BugFixAttempt }),
      ];

      render(
        <NotesList {...defaultProps} notes={notes} activeFilter={[NOTE_TYPES.General]} />
      );

      expect(screen.getByText('Notes (2)')).toBeInTheDocument();
    });
  });

  describe('collapsible groups', () => {
    // Helper to get group header by CSS class
    const getGroupHeader = (container: HTMLElement) =>
      container.querySelector('.notes-list__group-header') as HTMLElement;

    it('groups are expanded by default', () => {
      const notes = [createMockNote({ content: 'Test content' })];

      render(<NotesList {...defaultProps} notes={notes} />);

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('collapses group when header clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const notes = [createMockNote({ type: NOTE_TYPES.General, content: 'Test content' })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const groupHeader = getGroupHeader(container);
      await user.click(groupHeader);

      expect(screen.queryByText('Test content')).not.toBeInTheDocument();
    });

    it('expands collapsed group when header clicked again', async () => {
      const user = userEvent.setup({ delay: null });
      const notes = [createMockNote({ type: NOTE_TYPES.General, content: 'Test content' })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const groupHeader = getGroupHeader(container);

      // Collapse
      await user.click(groupHeader);
      expect(screen.queryByText('Test content')).not.toBeInTheDocument();

      // Expand
      await user.click(groupHeader);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('has aria-expanded attribute on group header', async () => {
      const user = userEvent.setup({ delay: null });
      const notes = [createMockNote({ type: NOTE_TYPES.General })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const groupHeader = getGroupHeader(container);

      expect(groupHeader).toHaveAttribute('aria-expanded', 'true');

      await user.click(groupHeader);

      expect(groupHeader).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-controls linking header to content', () => {
      const notes = [createMockNote({ type: NOTE_TYPES.General })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const groupHeader = getGroupHeader(container);
      const controlsId = groupHeader.getAttribute('aria-controls');

      expect(controlsId).toBeTruthy();
      expect(document.getElementById(controlsId!)).toBeInTheDocument();
    });
  });

  describe('NoteCard integration', () => {
    it('renders NoteCard for each note', () => {
      const notes = [
        createMockNote({ id: 'note-1', content: 'First note' }),
        createMockNote({ id: 'note-2', content: 'Second note' }),
      ];

      render(<NotesList {...defaultProps} notes={notes} />);

      expect(screen.getByText('First note')).toBeInTheDocument();
      expect(screen.getByText('Second note')).toBeInTheDocument();
    });

    it('passes onEditNote to NoteCard', async () => {
      const onEditNote = vi.fn();
      const user = userEvent.setup({ delay: null });
      const note = createMockNote({ content: 'Test note' });

      render(<NotesList {...defaultProps} notes={[note]} onEditNote={onEditNote} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      await user.click(editButton);

      expect(onEditNote).toHaveBeenCalledTimes(1);
      expect(onEditNote).toHaveBeenCalledWith(note);
    });

    it('passes onDeleteNote to NoteCard', async () => {
      const onDeleteNote = vi.fn();
      const user = userEvent.setup({ delay: null });
      const note = createMockNote({ content: 'Test note' });

      render(<NotesList {...defaultProps} notes={[note]} onDeleteNote={onDeleteNote} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      await user.click(deleteButton);

      expect(onDeleteNote).toHaveBeenCalledTimes(1);
      expect(onDeleteNote).toHaveBeenCalledWith(note);
    });
  });

  describe('accessibility', () => {
    it('has main section with aria-label', () => {
      const notes = [createMockNote()];
      render(<NotesList {...defaultProps} notes={notes} />);

      const section = screen.getByRole('region', { name: 'Notes' });
      expect(section).toBeInTheDocument();
    });

    it('group regions have aria-labelledby', () => {
      const notes = [createMockNote({ type: NOTE_TYPES.General })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const group = container.querySelector('.notes-list__group');
      expect(group).toHaveAttribute('role', 'region');
      expect(group).toHaveAttribute('aria-labelledby');
    });

    it('group content has role="list"', () => {
      const notes = [createMockNote()];
      render(<NotesList {...defaultProps} notes={notes} />);

      const list = screen.getByRole('list', { name: /notes/i });
      expect(list).toBeInTheDocument();
    });

    it('notes have role="listitem"', () => {
      const notes = [createMockNote()];
      render(<NotesList {...defaultProps} notes={notes} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBe(1);
    });

    it('add button has aria-label', () => {
      const notes = [createMockNote()];
      render(<NotesList {...defaultProps} notes={notes} />);

      const addButton = screen.getByRole('button', { name: 'Add note' });
      expect(addButton).toBeInTheDocument();
    });

    it('group headers are keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });
      const notes = [createMockNote({ content: 'Test content' })];

      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const groupHeader = container.querySelector('.notes-list__group-header') as HTMLElement;
      groupHeader.focus();
      expect(document.activeElement).toBe(groupHeader);

      await user.keyboard('{Enter}');
      expect(screen.queryByText('Test content')).not.toBeInTheDocument();

      await user.keyboard(' ');
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('CSS structure', () => {
    it('has glass class on main container', () => {
      const notes = [createMockNote()];
      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      const notesList = container.querySelector('.notes-list');
      expect(notesList).toHaveClass('glass');
    });

    it('has proper header structure', () => {
      const notes = [createMockNote()];
      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      expect(container.querySelector('.notes-list__header')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__title')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__add-button')).toBeInTheDocument();
    });

    it('has proper group structure', () => {
      const notes = [createMockNote()];
      const { container } = render(<NotesList {...defaultProps} notes={notes} />);

      expect(container.querySelector('.notes-list__groups')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__group')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__group-header')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__group-content')).toBeInTheDocument();
    });

    it('has proper empty state structure', () => {
      const { container } = render(<NotesList {...defaultProps} notes={[]} />);

      expect(container.querySelector('.notes-list__empty')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__empty-text')).toBeInTheDocument();
      expect(container.querySelector('.notes-list__empty-hint')).toBeInTheDocument();
    });
  });
});
