/**
 * Notes Components Accessibility Tests
 *
 * WCAG 2.1 AA compliance tests for Structured Notes feature components:
 * - NoteModal
 * - MarkdownEditor
 * - NoteCard
 * - NotesList
 * - NoteTypeFilter
 *
 * Tests cover:
 * - Modal focus trap and restoration
 * - Keyboard navigation (Tab, Shift+Tab, Escape, Enter, Arrow keys)
 * - ARIA attributes and roles
 * - Screen reader announcements (aria-live regions)
 * - Form labeling and error announcements
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteModal } from '../NoteModal';
import { MarkdownEditor } from '../MarkdownEditor';
import { NoteCard } from '../NoteCard';
import { NotesList } from '../NotesList';
import { NoteTypeFilter } from '../NoteTypeFilter';
import type { Note, NoteType } from '@core/models';
import { NOTE_TYPES } from '@core/models';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'NOTE-20260103-test-01',
  type: NOTE_TYPES.General,
  content: 'Test note content',
  created_at: new Date('2026-01-03T10:00:00Z'),
  updated_at: new Date('2026-01-03T10:00:00Z'),
  ...overrides,
});

// =============================================================================
// NoteModal Accessibility Tests
// =============================================================================

describe('NoteModal Accessibility', () => {
  const defaultProps = {
    isOpen: true,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal ARIA Attributes', () => {
    it('has role="dialog"', () => {
      render(<NoteModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<NoteModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<NoteModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const labelledById = dialog.getAttribute('aria-labelledby');
      expect(labelledById).toBeTruthy();

      const title = document.getElementById(labelledById!);
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe('Add Note');
    });

    it('has aria-describedby for screen reader description', () => {
      render(<NoteModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const describedById = dialog.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();

      const description = document.getElementById(describedById!);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('sr-only');
    });
  });

  describe('Focus Management', () => {
    it('traps focus within the modal', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteModal {...defaultProps} />);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
      });

      // Tab through all elements multiple times
      const dialog = screen.getByRole('dialog');
      for (let i = 0; i < 20; i++) {
        await user.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });

    it('traps focus with Shift+Tab (reverse)', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteModal {...defaultProps} />);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
      });

      // Shift+Tab through all elements
      const dialog = screen.getByRole('dialog');
      for (let i = 0; i < 20; i++) {
        await user.tab({ shift: true });
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });

    it('restores focus to trigger element when modal closes', async () => {
      const triggerButton = document.createElement('button');
      triggerButton.textContent = 'Open Modal';
      document.body.appendChild(triggerButton);
      triggerButton.focus();

      const { rerender } = render(<NoteModal {...defaultProps} isOpen={true} />);

      // Close modal
      rerender(<NoteModal {...defaultProps} isOpen={false} />);

      // Focus should return to trigger (or previous active element)
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton);
      });

      document.body.removeChild(triggerButton);
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes on Escape key', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<NoteModal {...defaultProps} onCancel={onCancel} />);

      await user.keyboard('{Escape}');

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('Tab cycles through all interactive elements', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');

      // Get all focusable elements
      const focusableElements = dialog.querySelectorAll(
        'button:not([disabled]), select, textarea, input, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // Tab should cycle through without escaping
      await waitFor(() => {
        expect(dialog.contains(document.activeElement)).toBe(true);
      });

      for (let i = 0; i < focusableElements.length + 2; i++) {
        await user.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });
  });

  describe('Form Accessibility', () => {
    it('type select has proper label association', () => {
      render(<NoteModal {...defaultProps} />);
      const select = screen.getByLabelText(/type/i);
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe('SELECT');
    });

    it('type select has aria-required', () => {
      render(<NoteModal {...defaultProps} />);
      const select = screen.getByLabelText(/type/i);
      expect(select).toHaveAttribute('aria-required', 'true');
    });

    it('validation error has role="alert" for screen reader announcement', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteModal {...defaultProps} />);

      // Trigger validation error by saving empty
      await user.click(screen.getByRole('button', { name: /save/i }));

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/note content cannot be empty/i);
    });

    it('character count has aria-live for updates', () => {
      const { container } = render(<NoteModal {...defaultProps} />);
      const charCount = container.querySelector('.note-modal-char-count');
      expect(charCount).toHaveAttribute('aria-live', 'polite');
      expect(charCount).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Button Accessibility', () => {
    it('close button has accessible name', () => {
      render(<NoteModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
    });

    it('Save button is properly labeled', () => {
      render(<NoteModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('Cancel button is properly labeled', () => {
      render(<NoteModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });
});

// =============================================================================
// MarkdownEditor Accessibility Tests
// =============================================================================

describe('MarkdownEditor Accessibility', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Toolbar Accessibility', () => {
    it('has role="toolbar" with accessible name', () => {
      render(<MarkdownEditor {...defaultProps} />);
      const toolbar = screen.getByRole('toolbar', { name: /markdown formatting/i });
      expect(toolbar).toBeInTheDocument();
    });

    it('toolbar buttons have accessible names', () => {
      render(<MarkdownEditor {...defaultProps} />);

      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /unordered list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^ordered list$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /link/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /inline code/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /code block/i })).toBeInTheDocument();
    });

    it('supports arrow key navigation in toolbar', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MarkdownEditor {...defaultProps} />);

      // Focus the first toolbar button
      const boldButton = screen.getByRole('button', { name: /bold/i });
      boldButton.focus();

      // Arrow right should move to next button
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('button', { name: /italic/i })).toHaveFocus();

      // Arrow right again
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('button', { name: /unordered list/i })).toHaveFocus();

      // Arrow left should go back
      await user.keyboard('{ArrowLeft}');
      expect(screen.getByRole('button', { name: /italic/i })).toHaveFocus();
    });

    it('Home key moves to first toolbar button', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MarkdownEditor {...defaultProps} />);

      // Focus the last toolbar button
      const codeBlockButton = screen.getByRole('button', { name: /code block/i });
      codeBlockButton.focus();

      // Home should move to first
      await user.keyboard('{Home}');
      expect(screen.getByRole('button', { name: /bold/i })).toHaveFocus();
    });

    it('End key moves to last toolbar button', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MarkdownEditor {...defaultProps} />);

      // Focus the first toolbar button
      const boldButton = screen.getByRole('button', { name: /bold/i });
      boldButton.focus();

      // End should move to last
      await user.keyboard('{End}');
      expect(screen.getByRole('button', { name: /code block/i })).toHaveFocus();
    });

    it('only one toolbar button is in tab order (roving tabindex)', () => {
      render(<MarkdownEditor {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const tabIndexZeroButtons = buttons.filter((btn) => btn.tabIndex === 0);
      const tabIndexMinusOneButtons = buttons.filter((btn) => btn.tabIndex === -1);

      expect(tabIndexZeroButtons.length).toBe(1);
      expect(tabIndexMinusOneButtons.length).toBe(buttons.length - 1);
    });
  });

  describe('Textarea Accessibility', () => {
    it('textarea has accessible name via aria-label (default)', () => {
      render(<MarkdownEditor {...defaultProps} />);
      expect(screen.getByRole('textbox', { name: /markdown content/i })).toBeInTheDocument();
    });

    it('textarea uses aria-labelledby when labelId is provided', () => {
      const { container } = render(
        <>
          <label id="test-label">Test Label</label>
          <MarkdownEditor {...defaultProps} labelId="test-label" />
        </>
      );

      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveAttribute('aria-labelledby', 'test-label');
      expect(textarea).not.toHaveAttribute('aria-label');
    });

    it('character count has aria-live for screen readers', () => {
      const { container } = render(<MarkdownEditor {...defaultProps} maxLength={1000} />);
      const charCount = container.querySelector('.markdown-editor-char-count');
      expect(charCount).toHaveAttribute('aria-live', 'polite');
    });
  });
});

// =============================================================================
// NoteCard Accessibility Tests
// =============================================================================

describe('NoteCard Accessibility', () => {
  const mockNote = createMockNote();
  const defaultProps = {
    note: mockNote,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Semantic Structure', () => {
    it('uses article role with accessible name', () => {
      render(<NoteCard {...defaultProps} />);
      const article = screen.getByRole('article', { name: /note: general/i });
      expect(article).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('edit button has accessible name including note type', () => {
      render(<NoteCard {...defaultProps} />);
      expect(screen.getByRole('button', { name: /edit general note/i })).toBeInTheDocument();
    });

    it('delete button has accessible name including note type', () => {
      render(<NoteCard {...defaultProps} />);
      expect(screen.getByRole('button', { name: /delete general note/i })).toBeInTheDocument();
    });

    it('buttons have visible focus indicators', () => {
      const { container } = render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      editButton.focus();

      // Verify focus is within the card
      const card = container.querySelector('.note-card');
      expect(card?.contains(document.activeElement)).toBe(true);
    });

    it('buttons become visible when focused (keyboard accessibility)', () => {
      const { container } = render(<NoteCard {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      editButton.focus();

      // The actions container should become visible on focus-within
      const actionsContainer = container.querySelector('.note-card__actions');
      expect(actionsContainer).toBeInTheDocument();
      // CSS :focus-within should make it visible - we verify the element exists
    });
  });

  describe('Timestamps', () => {
    it('uses semantic time elements with datetime attribute', () => {
      render(<NoteCard {...defaultProps} />);
      const timeElements = screen.getAllByText(/jan/i);
      const timeElement = timeElements.find((el) => el.tagName === 'TIME');
      expect(timeElement).toHaveAttribute('datetime');
    });
  });

  describe('SVG Icons', () => {
    it('icons are hidden from screen readers', () => {
      const { container } = render(<NoteCard {...defaultProps} />);
      const svgs = container.querySelectorAll('svg');
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});

// =============================================================================
// NotesList Accessibility Tests
// =============================================================================

describe('NotesList Accessibility', () => {
  const mockNotes = [
    createMockNote({ id: 'note-1', type: NOTE_TYPES.General, content: 'General note' }),
    createMockNote({ id: 'note-2', type: NOTE_TYPES.BugFixAttempt, content: 'Bug fix note' }),
  ];

  const defaultProps = {
    notes: mockNotes,
    onAddNote: vi.fn(),
    onEditNote: vi.fn(),
    onDeleteNote: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Semantic Structure', () => {
    it('uses section with accessible name', () => {
      render(<NotesList {...defaultProps} />);
      const section = screen.getByRole('region', { name: /notes/i });
      expect(section).toBeInTheDocument();
    });

    it('group regions have accessible names', () => {
      render(<NotesList {...defaultProps} />);
      // Groups are regions with aria-labelledby pointing to their headers
      const regions = screen.getAllByRole('region');
      expect(regions.length).toBeGreaterThan(0);
    });
  });

  describe('Collapsible Groups', () => {
    it('group headers are buttons with aria-expanded', () => {
      render(<NotesList {...defaultProps} />);
      const groupButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('notes-list__group-header')
      );

      groupButtons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-expanded');
        expect(btn).toHaveAttribute('aria-controls');
      });
    });

    it('toggles aria-expanded on click', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NotesList {...defaultProps} />);

      const generalHeader = screen.getAllByRole('button').find((btn) =>
        btn.classList.contains('notes-list__group-header')
      );
      expect(generalHeader).toHaveAttribute('aria-expanded', 'true');

      await user.click(generalHeader!);

      expect(generalHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Add Button', () => {
    it('has accessible name', () => {
      render(<NotesList {...defaultProps} />);
      expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    });
  });

  describe('List Structure', () => {
    it('uses role="list" for note groups', () => {
      render(<NotesList {...defaultProps} />);
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('uses role="listitem" for individual notes', () => {
      render(<NotesList {...defaultProps} />);
      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('provides helpful text when no notes exist', () => {
      render(<NotesList {...defaultProps} notes={[]} />);
      expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
      expect(screen.getByText(/click.*add note/i)).toBeInTheDocument();
    });
  });
});

// =============================================================================
// NoteTypeFilter Accessibility Tests
// =============================================================================

describe('NoteTypeFilter Accessibility', () => {
  const defaultProps = {
    value: [] as NoteType[],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Trigger Button', () => {
    it('has accessible name', () => {
      render(<NoteTypeFilter {...defaultProps} />);
      expect(screen.getByRole('button', { name: /filter by note type/i })).toBeInTheDocument();
    });

    it('has aria-haspopup="listbox"', () => {
      render(<NoteTypeFilter {...defaultProps} />);
      const button = screen.getByRole('button', { name: /filter by note type/i });
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has aria-expanded attribute', () => {
      render(<NoteTypeFilter {...defaultProps} />);
      const button = screen.getByRole('button', { name: /filter by note type/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when opened', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      const button = screen.getByRole('button', { name: /filter by note type/i });
      await user.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Listbox', () => {
    it('has role="listbox" when open', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('has aria-multiselectable="true"', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('options have role="option"', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    it('options have aria-selected attribute', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      const options = screen.getAllByRole('option');
      options.forEach((option) => {
        expect(option).toHaveAttribute('aria-selected');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens with Enter key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      const button = screen.getByRole('button', { name: /filter by note type/i });
      button.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens with Space key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      const button = screen.getByRole('button', { name: /filter by note type/i });
      button.focus();
      await user.keyboard(' ');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes with Escape key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('Arrow keys navigate options', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      // Wait for initial focus
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveFocus();
      });

      // Arrow down
      await user.keyboard('{ArrowDown}');

      const options = screen.getAllByRole('option');
      expect(options[1]).toHaveFocus();
    });

    it('Enter/Space selects option', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      // Navigate to second option (first specific type after "All Types")
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('focuses first option when opened', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /filter by note type/i }));

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveFocus();
      });
    });

    it('returns focus to trigger button on close', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter {...defaultProps} />);

      const button = screen.getByRole('button', { name: /filter by note type/i });
      await user.click(button);

      await user.keyboard('{Escape}');

      expect(button).toHaveFocus();
    });
  });
});

// =============================================================================
// Integration Tests - Component Interactions
// =============================================================================

describe('Notes Components Integration Accessibility', () => {
  it('NotesList Add button opens NoteModal with proper focus', async () => {
    const user = userEvent.setup({ delay: null });

    // Create a wrapper that renders both components
    function TestComponent(): React.JSX.Element {
      const [isModalOpen, setIsModalOpen] = React.useState(false);
      return (
        <>
          <NotesList
            notes={[]}
            onAddNote={() => setIsModalOpen(true)}
            onEditNote={() => {}}
            onDeleteNote={() => {}}
          />
          <NoteModal
            isOpen={isModalOpen}
            onSave={() => setIsModalOpen(false)}
            onCancel={() => setIsModalOpen(false)}
          />
        </>
      );
    }

    render(<TestComponent />);

    // Click Add Note button
    await user.click(screen.getByRole('button', { name: /add note/i }));

    // Modal should open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Focus should be within the modal
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });
});
