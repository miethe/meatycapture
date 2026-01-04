/**
 * NoteCard Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteCard } from '../NoteCard';
import type { Note, NoteType } from '@core/models';
import { NOTE_TYPES } from '@core/models';

// Mock note for testing
const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'NOTE-20260103-test-01-01',
  type: NOTE_TYPES.General,
  content: 'Test note content',
  created_at: new Date('2026-01-03T10:00:00Z'),
  updated_at: new Date('2026-01-03T10:00:00Z'),
  ...overrides,
});

describe('NoteCard', () => {
  const defaultProps = {
    note: createMockNote(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders note content', () => {
      render(<NoteCard {...defaultProps} />);

      expect(screen.getByText('Test note content')).toBeInTheDocument();
    });

    it('renders as an article element with proper role', () => {
      render(<NoteCard {...defaultProps} />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute('aria-label', 'Note: General');
    });

    it('renders with glass class for styling', () => {
      const { container } = render(<NoteCard {...defaultProps} />);

      const noteCard = container.querySelector('.note-card');
      expect(noteCard).toHaveClass('glass');
    });
  });

  describe('type badge', () => {
    it('renders General type badge correctly', () => {
      const note = createMockNote({ type: NOTE_TYPES.General });
      render(<NoteCard {...defaultProps} note={note} />);

      const badge = screen.getByText('General');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('note-card__badge');
      expect(badge).toHaveClass('note-type-general');
    });

    it('renders Bug Fix Attempt type badge correctly', () => {
      const note = createMockNote({ type: NOTE_TYPES.BugFixAttempt });
      render(<NoteCard {...defaultProps} note={note} />);

      const badge = screen.getByText('Bug Fix Attempt');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('note-type-bugfix');
    });

    it('renders Validation type badge correctly', () => {
      const note = createMockNote({ type: NOTE_TYPES.Validation });
      render(<NoteCard {...defaultProps} note={note} />);

      const badge = screen.getByText('Validation');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('note-type-validation');
    });

    it('renders Other type badge correctly', () => {
      const note = createMockNote({ type: NOTE_TYPES.Other });
      render(<NoteCard {...defaultProps} note={note} />);

      const badge = screen.getByText('Other');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('note-type-other');
    });

    it('falls back to note-type-other for unknown type', () => {
      const note = createMockNote({ type: 'Unknown Type' as NoteType });
      render(<NoteCard {...defaultProps} note={note} />);

      const badge = screen.getByText('Unknown Type');
      expect(badge).toHaveClass('note-type-other');
    });
  });

  describe('timestamps', () => {
    it('renders created timestamp', () => {
      const sameDate = new Date('2026-01-03T10:30:00Z');
      const note = createMockNote({
        created_at: sameDate,
        updated_at: sameDate, // Same date so only created shows
      });
      render(<NoteCard {...defaultProps} note={note} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
      // Check for the time element with proper datetime attribute
      const timeElement = screen.getByText(/Jan 3, 2026/);
      expect(timeElement).toBeInTheDocument();
    });

    it('does NOT show updated timestamp when same as created', () => {
      const sameDate = new Date('2026-01-03T10:00:00Z');
      const note = createMockNote({
        created_at: sameDate,
        updated_at: sameDate,
      });
      render(<NoteCard {...defaultProps} note={note} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
      expect(screen.queryByText('Updated:')).not.toBeInTheDocument();
    });

    it('shows updated timestamp when different from created', () => {
      const note = createMockNote({
        created_at: new Date('2026-01-03T10:00:00Z'),
        updated_at: new Date('2026-01-03T14:30:00Z'),
      });
      render(<NoteCard {...defaultProps} note={note} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
      expect(screen.getByText('Updated:')).toBeInTheDocument();
    });

    it('shows updated timestamp when dates are on different days', () => {
      const note = createMockNote({
        created_at: new Date('2026-01-01T10:00:00Z'),
        updated_at: new Date('2026-01-03T14:30:00Z'),
      });
      render(<NoteCard {...defaultProps} note={note} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
      expect(screen.getByText('Updated:')).toBeInTheDocument();
    });

    it('does NOT show updated when dates differ by less than 1 second', () => {
      const note = createMockNote({
        created_at: new Date('2026-01-03T10:00:00.000Z'),
        updated_at: new Date('2026-01-03T10:00:00.500Z'),
      });
      render(<NoteCard {...defaultProps} note={note} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
      expect(screen.queryByText('Updated:')).not.toBeInTheDocument();
    });

    it('renders time elements with proper datetime attributes', () => {
      const createdAt = new Date('2026-01-03T10:00:00Z');
      const updatedAt = new Date('2026-01-03T14:30:00Z');
      const note = createMockNote({ created_at: createdAt, updated_at: updatedAt });

      const { container } = render(<NoteCard {...defaultProps} note={note} />);

      const timeElements = container.querySelectorAll('time');
      expect(timeElements).toHaveLength(2);
      expect(timeElements[0]).toHaveAttribute('dateTime', createdAt.toISOString());
      expect(timeElements[1]).toHaveAttribute('dateTime', updatedAt.toISOString());
    });
  });

  describe('edit button', () => {
    it('renders edit button', () => {
      render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      expect(editButton).toBeInTheDocument();
    });

    it('calls onEdit with note when clicked', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });
      const note = createMockNote();

      render(<NoteCard note={note} onEdit={onEdit} onDelete={vi.fn()} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(note);
    });

    it('is keyboard accessible with Enter', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<NoteCard {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      editButton.focus();
      await user.keyboard('{Enter}');

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible with Space', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<NoteCard {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      editButton.focus();
      await user.keyboard(' ');

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('has correct aria-label including note type', () => {
      const note = createMockNote({ type: NOTE_TYPES.Validation });
      render(<NoteCard {...defaultProps} note={note} />);

      const editButton = screen.getByRole('button', { name: 'Edit Validation note' });
      expect(editButton).toBeInTheDocument();
    });

    it('has proper CSS classes', () => {
      render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      expect(editButton).toHaveClass('note-card__action-button');
      expect(editButton).toHaveClass('note-card__edit-button');
    });
  });

  describe('delete button', () => {
    it('renders delete button', () => {
      render(<NoteCard {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('calls onDelete with note when clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });
      const note = createMockNote();

      render(<NoteCard note={note} onEdit={vi.fn()} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(note);
    });

    it('is keyboard accessible with Enter', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<NoteCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      deleteButton.focus();
      await user.keyboard('{Enter}');

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('is keyboard accessible with Space', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<NoteCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      deleteButton.focus();
      await user.keyboard(' ');

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('has correct aria-label including note type', () => {
      const note = createMockNote({ type: NOTE_TYPES.BugFixAttempt });
      render(<NoteCard {...defaultProps} note={note} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete Bug Fix Attempt note' });
      expect(deleteButton).toBeInTheDocument();
    });

    it('has proper CSS classes', () => {
      render(<NoteCard {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      expect(deleteButton).toHaveClass('note-card__action-button');
      expect(deleteButton).toHaveClass('note-card__delete-button');
    });
  });

  describe('icons', () => {
    it('renders edit icon with proper SVG attributes', () => {
      render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      const svg = editButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders delete icon with proper SVG attributes', () => {
      render(<NoteCard {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });
      const svg = deleteButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('content display', () => {
    it('has CSS class that applies whitespace styling', () => {
      const note = createMockNote({
        content: 'Line 1\nLine 2\n  Indented line',
      });
      const { container } = render(<NoteCard {...defaultProps} note={note} />);

      const contentText = container.querySelector('.note-card__text');
      // CSS applies white-space: pre-wrap; we verify the class is applied
      expect(contentText).toHaveClass('note-card__text');
    });

    it('renders multiline content correctly', () => {
      const multilineContent = 'First line\nSecond line\nThird line';
      const note = createMockNote({ content: multilineContent });

      const { container } = render(<NoteCard {...defaultProps} note={note} />);

      // Check the content is preserved in the element (textContent preserves newlines)
      const contentText = container.querySelector('.note-card__text');
      expect(contentText?.textContent).toBe(multilineContent);
    });

    it('handles empty content gracefully', () => {
      const note = createMockNote({ content: '' });
      const { container } = render(<NoteCard {...defaultProps} note={note} />);

      const contentText = container.querySelector('.note-card__text');
      expect(contentText).toBeInTheDocument();
      expect(contentText).toHaveTextContent('');
    });

    it('handles very long content', () => {
      const longContent = 'A'.repeat(1000);
      const note = createMockNote({ content: longContent });

      render(<NoteCard {...defaultProps} note={note} />);

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper article role', () => {
      render(<NoteCard {...defaultProps} />);

      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('has aria-label on article with note type', () => {
      const note = createMockNote({ type: NOTE_TYPES.Validation });
      render(<NoteCard {...defaultProps} note={note} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', 'Note: Validation');
    });

    it('action buttons have title attributes', () => {
      render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });

      expect(editButton).toHaveAttribute('title', 'Edit note');
      expect(deleteButton).toHaveAttribute('title', 'Delete note');
    });

    it('buttons can receive focus', () => {
      render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit.*note/i });
      const deleteButton = screen.getByRole('button', { name: /delete.*note/i });

      editButton.focus();
      expect(document.activeElement).toBe(editButton);

      deleteButton.focus();
      expect(document.activeElement).toBe(deleteButton);
    });
  });

  describe('CSS structure', () => {
    it('has proper header structure', () => {
      const { container } = render(<NoteCard {...defaultProps} />);

      expect(container.querySelector('.note-card__header')).toBeInTheDocument();
      expect(container.querySelector('.note-card__badge')).toBeInTheDocument();
      expect(container.querySelector('.note-card__actions')).toBeInTheDocument();
    });

    it('has proper content structure', () => {
      const { container } = render(<NoteCard {...defaultProps} />);

      expect(container.querySelector('.note-card__content')).toBeInTheDocument();
      expect(container.querySelector('.note-card__text')).toBeInTheDocument();
    });

    it('has proper footer structure', () => {
      const { container } = render(<NoteCard {...defaultProps} />);

      expect(container.querySelector('.note-card__footer')).toBeInTheDocument();
      expect(container.querySelector('.note-card__timestamp')).toBeInTheDocument();
      expect(container.querySelector('.note-card__timestamp-label')).toBeInTheDocument();
    });
  });
});
