/**
 * NoteTypeFilter Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteTypeFilter } from '../NoteTypeFilter';
import { NOTE_TYPES, NOTE_TYPE_OPTIONS } from '@core/models';

describe('NoteTypeFilter', () => {
  const defaultOnChange = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders trigger button with "All Types" when value is empty', () => {
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveTextContent('All Types');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders trigger button with "All Types" when all types selected', () => {
      render(<NoteTypeFilter value={[...NOTE_TYPE_OPTIONS]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      expect(trigger).toHaveTextContent('All Types');
    });

    it('renders trigger button with type name when single type selected', () => {
      render(<NoteTypeFilter value={[NOTE_TYPES.General]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      expect(trigger).toHaveTextContent('General');
    });

    it('renders trigger button with count when multiple types selected', () => {
      render(
        <NoteTypeFilter
          value={[NOTE_TYPES.General, NOTE_TYPES.BugFixAttempt]}
          onChange={defaultOnChange}
        />
      );

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      expect(trigger).toHaveTextContent('2 types');
    });

    it('dropdown is not visible initially', () => {
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('dropdown toggle', () => {
    it('opens dropdown when trigger is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes dropdown when trigger is clicked again', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(trigger);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders all options when open', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      // "All Types" option + 4 individual type options
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5);

      expect(screen.getByRole('option', { name: /All Types/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /General/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Bug Fix Attempt/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Validation/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Other/i })).toBeInTheDocument();
    });
  });

  describe('selection behavior', () => {
    it('shows all types as selected when value is empty', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      const allTypesOption = screen.getByRole('option', { name: /All Types/i });
      expect(allTypesOption).toHaveAttribute('aria-selected', 'true');

      // All individual types should also be selected
      const generalOption = screen.getByRole('option', { name: /^General$/i });
      expect(generalOption).toHaveAttribute('aria-selected', 'true');
    });

    it('shows only selected types as selected', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[NOTE_TYPES.General]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      const generalOption = screen.getByRole('option', { name: /^General$/i });
      const bugFixOption = screen.getByRole('option', { name: /Bug Fix Attempt/i });

      expect(generalOption).toHaveAttribute('aria-selected', 'true');
      expect(bugFixOption).toHaveAttribute('aria-selected', 'false');
    });

    it('toggles individual type selection', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      await user.click(screen.getByRole('option', { name: /^General$/i }));

      // Clicking General when all selected removes it
      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([NOTE_TYPES.BugFixAttempt, NOTE_TYPES.Validation, NOTE_TYPES.Other])
      );
      expect(onChange).toHaveBeenCalledWith(expect.not.arrayContaining([NOTE_TYPES.General]));
    });

    it('clears selection when All Types is clicked', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(
        <NoteTypeFilter value={[NOTE_TYPES.General, NOTE_TYPES.BugFixAttempt]} onChange={onChange} />
      );

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      await user.click(screen.getByRole('option', { name: /All Types/i }));

      // Clicking "All Types" should clear to empty (meaning show all)
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it('keeps dropdown open after selection for multi-select', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      await user.click(screen.getByRole('option', { name: /^General$/i }));

      // Dropdown should still be open
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('click outside', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <div>
          <NoteTypeFilter value={[]} onChange={defaultOnChange} />
          <button>Outside</button>
        </div>
      );

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Outside' }));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('does not close when clicking inside dropdown', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      const dropdown = screen.getByRole('listbox');

      await user.click(dropdown);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('focuses first option when dropdown opens', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('option', { name: /All Types/i }));
      });
    });

    it('navigates down with ArrowDown key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('option', { name: /All Types/i }));
      });

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('option', { name: /^General$/i }));

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('option', { name: /Bug Fix Attempt/i }));
    });

    it('wraps around when navigating past last option', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      // Navigate to last item (Other)
      await user.keyboard('{End}');
      expect(document.activeElement).toBe(screen.getByRole('option', { name: /^Other$/i }));

      // Should wrap to first item (All Types)
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('option', { name: /All Types/i }));
    });

    it('navigates up with ArrowUp key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('option', { name: /All Types/i }));
      });

      // Should wrap to last item
      await user.keyboard('{ArrowUp}');
      expect(document.activeElement).toBe(screen.getByRole('option', { name: /^Other$/i }));
    });

    it('navigates to first option with Home key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      await user.keyboard('{End}'); // Go to last item

      await user.keyboard('{Home}');
      expect(document.activeElement).toBe(screen.getByRole('option', { name: /All Types/i }));
    });

    it('navigates to last option with End key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      // Wait for focus to move to first option after opening
      await waitFor(() => {
        expect(document.activeElement).toHaveAttribute('role', 'option');
      });

      await user.keyboard('{End}');
      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Other');
      });
    });

    it('toggles selection with Enter key', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      await user.keyboard('{ArrowDown}'); // Move to General

      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalled();
    });

    it('toggles selection with Space key', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      await user.keyboard('{ArrowDown}'); // Move to General

      await user.keyboard(' ');

      expect(onChange).toHaveBeenCalled();
    });

    it('closes dropdown with Escape key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('returns focus to trigger after Escape', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      await user.click(trigger);

      await user.keyboard('{Escape}');

      expect(document.activeElement).toBe(trigger);
    });

    it('closes dropdown on Tab key', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Tab}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('opens dropdown with ArrowDown on trigger', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      trigger.focus();

      await user.keyboard('{ArrowDown}');

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct role on dropdown container', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();
      expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('has correct role on options', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5);
    });

    it('has aria-haspopup on trigger', () => {
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('updates aria-expanded on trigger when dropdown opens/closes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      const trigger = screen.getByRole('button', { name: 'Filter by note type' });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-selected on options', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[NOTE_TYPES.General]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      const generalOption = screen.getByRole('option', { name: /^General$/i });
      const bugFixOption = screen.getByRole('option', { name: /Bug Fix Attempt/i });

      expect(generalOption).toHaveAttribute('aria-selected', 'true');
      expect(bugFixOption).toHaveAttribute('aria-selected', 'false');
    });

    it('has aria-label on dropdown', async () => {
      const user = userEvent.setup({ delay: null });
      render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Note type filter options');
    });
  });

  describe('snapshot', () => {
    it('matches closed state snapshot', () => {
      const { container } = render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);
      expect(container).toMatchSnapshot();
    });

    it('matches open state snapshot with all types', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<NoteTypeFilter value={[]} onChange={defaultOnChange} />);

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with partial selection', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(
        <NoteTypeFilter
          value={[NOTE_TYPES.General, NOTE_TYPES.BugFixAttempt]}
          onChange={defaultOnChange}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with single selection', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(
        <NoteTypeFilter value={[NOTE_TYPES.Validation]} onChange={defaultOnChange} />
      );

      await user.click(screen.getByRole('button', { name: 'Filter by note type' }));

      expect(container).toMatchSnapshot();
    });
  });
});
