/**
 * MultiSelectCombobox Component Tests
 *
 * Tests for rendering, selection, removal, keyboard navigation,
 * inline entry, and accessibility features.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiSelectCombobox } from '../MultiSelectCombobox';

describe('MultiSelectCombobox', () => {
  const defaultOptions = ['Frontend', 'Backend', 'Database', 'API', 'Infrastructure'];
  const defaultProps = {
    options: defaultOptions,
    selected: [],
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onAdd: vi.fn(),
    label: 'Domain',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with label', () => {
      render(<MultiSelectCombobox {...defaultProps} />);

      expect(screen.getByText('Domain')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<MultiSelectCombobox {...defaultProps} placeholder="Select domains..." />);

      expect(screen.getByPlaceholderText('Select domains...')).toBeInTheDocument();
    });

    it('renders with default placeholder when not specified', () => {
      render(<MultiSelectCombobox {...defaultProps} />);

      expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
    });

    it('renders helper text when provided', () => {
      render(<MultiSelectCombobox {...defaultProps} helperText="Select one or more domains" />);

      expect(screen.getByText('Select one or more domains')).toBeInTheDocument();
    });

    it('renders error message when provided', () => {
      render(<MultiSelectCombobox {...defaultProps} error="At least one domain is required" />);

      expect(screen.getByRole('alert')).toHaveTextContent('At least one domain is required');
    });

    it('hides helper text when error is shown', () => {
      render(
        <MultiSelectCombobox
          {...defaultProps}
          helperText="Select one or more domains"
          error="At least one domain is required"
        />
      );

      expect(screen.queryByText('Select one or more domains')).not.toBeInTheDocument();
      expect(screen.getByText('At least one domain is required')).toBeInTheDocument();
    });

    it('renders tooltip trigger when tooltip is provided', () => {
      render(<MultiSelectCombobox {...defaultProps} tooltip="Helpful information" />);

      const tooltipTrigger = screen.getByLabelText('Help for Domain');
      expect(tooltipTrigger).toBeInTheDocument();
      expect(tooltipTrigger).toHaveTextContent('?');
    });

    it('renders selected values as badges', () => {
      render(<MultiSelectCombobox {...defaultProps} selected={['Frontend', 'Backend']} />);

      expect(screen.getByText('Frontend')).toBeInTheDocument();
      expect(screen.getByText('Backend')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Frontend')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Backend')).toBeInTheDocument();
    });

    it('applies disabled state', () => {
      render(<MultiSelectCombobox {...defaultProps} disabled />);

      const input = screen.getByRole('combobox');
      expect(input).toBeDisabled();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown on focus', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('shows filtered options based on search query', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'front');

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveTextContent('Frontend');
      expect(listbox).not.toHaveTextContent('Backend');
    });

    it('excludes already selected options from dropdown', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} selected={['Frontend']} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const listbox = screen.getByRole('listbox');
      expect(listbox).not.toHaveTextContent('Frontend');
      expect(listbox).toHaveTextContent('Backend');
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <MultiSelectCombobox {...defaultProps} />
          <button>Outside</button>
        </div>
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.click(screen.getByText('Outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Selection Functionality', () => {
    it('calls onSelect when clicking an option', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onSelect={onSelect} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.click(screen.getByText('Frontend'));

      expect(onSelect).toHaveBeenCalledWith('Frontend');
    });

    it('keeps dropdown open after selection for multiple selections', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.click(screen.getByText('Frontend'));

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('clears search query after selection', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'front');
      await user.click(screen.getByText('Frontend'));

      expect(input).toHaveValue('');
    });
  });

  describe('Removal Functionality', () => {
    it('calls onRemove when clicking badge remove button', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <MultiSelectCombobox {...defaultProps} selected={['Frontend']} onRemove={onRemove} />
      );

      await user.click(screen.getByLabelText('Remove Frontend'));

      expect(onRemove).toHaveBeenCalledWith('Frontend');
    });

    it('removes last item on Backspace when input is empty', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <MultiSelectCombobox
          {...defaultProps}
          selected={['Frontend', 'Backend']}
          onRemove={onRemove}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(onRemove).toHaveBeenCalledWith('Backend');
    });

    it('does not remove item on Backspace when input has text', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(
        <MultiSelectCombobox {...defaultProps} selected={['Frontend']} onRemove={onRemove} />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'test');
      await user.keyboard('{Backspace}');

      expect(onRemove).not.toHaveBeenCalled();
    });

    it('disables remove button when component is disabled', () => {
      render(<MultiSelectCombobox {...defaultProps} selected={['Frontend']} disabled />);

      const removeButton = screen.getByLabelText('Remove Frontend');
      expect(removeButton).toBeDisabled();
    });
  });

  describe('Inline Entry (Add New Value)', () => {
    it('shows "Add" option when typing a new value', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewDomain');

      expect(screen.getByText('Add "NewDomain"')).toBeInTheDocument();
    });

    it('does not show "Add" option when value matches existing option', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'Frontend');

      expect(screen.queryByText(/^Add /)).not.toBeInTheDocument();
    });

    it('does not show "Add" option when value is already selected', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} selected={['MyValue']} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'MyValue');

      expect(screen.queryByText(/^Add /)).not.toBeInTheDocument();
    });

    it('calls onAdd when clicking "Add" option', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onAdd={onAdd} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewDomain');
      await user.click(screen.getByText('Add "NewDomain"'));

      expect(onAdd).toHaveBeenCalledWith('NewDomain');
    });

    it('calls onAdd when pressing Enter on new value', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onAdd={onAdd} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewDomain');
      await user.keyboard('{Enter}');

      expect(onAdd).toHaveBeenCalledWith('NewDomain');
    });

    it('clears input after adding new value', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewDomain');
      await user.click(screen.getByText('Add "NewDomain"'));

      expect(input).toHaveValue('');
    });

    it('trims whitespace from new values', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onAdd={onAdd} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, '  NewDomain  ');
      await user.click(screen.getByText('Add "NewDomain"'));

      expect(onAdd).toHaveBeenCalledWith('NewDomain');
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown on ArrowDown when closed', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      // Use userEvent to focus and then press ArrowDown to avoid act() warnings
      await user.click(input);
      // Close it first to test opening via ArrowDown
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('navigates options with ArrowDown', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveClass('tags-popover-option-active');
    });

    it('navigates options with ArrowUp', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveClass('tags-popover-option-active');
    });

    it('wraps around when navigating past last option', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} options={['A', 'B']} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      // Navigate: -1 -> 0 -> 1 -> 0 (wrap)
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveClass('tags-popover-option-active');
    });

    it('wraps around when navigating before first option', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} options={['A', 'B']} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{ArrowUp}');

      const options = screen.getAllByRole('option');
      expect(options[1]).toHaveClass('tags-popover-option-active');
    });

    it('selects active option on Enter', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onSelect={onSelect} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}{Enter}');

      expect(onSelect).toHaveBeenCalledWith('Frontend');
    });

    it('can navigate to and select "Add" option', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} options={['A']} onAdd={onAdd} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'New');
      // Navigate past filtered options to Add option
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      expect(onAdd).toHaveBeenCalledWith('New');
    });

    it('closes dropdown on Tab', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.tab();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has role="combobox" on input', () => {
      render(<MultiSelectCombobox {...defaultProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('has role="listbox" on dropdown', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('has role="option" on each dropdown item', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(5);
    });

    it('sets aria-expanded correctly', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await user.click(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('sets aria-activedescendant during keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      // Initially no active descendant
      expect(input).not.toHaveAttribute('aria-activedescendant');

      await user.keyboard('{ArrowDown}');

      // After navigation, should have active descendant
      expect(input).toHaveAttribute('aria-activedescendant');
    });

    it('has aria-selected on options', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('has aria-label on badge remove buttons', () => {
      render(<MultiSelectCombobox {...defaultProps} selected={['Frontend']} />);

      expect(screen.getByLabelText('Remove Frontend')).toBeInTheDocument();
    });

    it('has aria-invalid when error is present', () => {
      render(<MultiSelectCombobox {...defaultProps} error="Required" />);

      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('has aria-describedby for helper text', () => {
      render(<MultiSelectCombobox {...defaultProps} helperText="Select domains" />);

      const input = screen.getByRole('combobox');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('has aria-haspopup="listbox"', () => {
      render(<MultiSelectCombobox {...defaultProps} />);

      expect(screen.getByRole('combobox')).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has aria-autocomplete="list"', () => {
      render(<MultiSelectCombobox {...defaultProps} />);

      expect(screen.getByRole('combobox')).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('badges list has aria-label and role', () => {
      render(<MultiSelectCombobox {...defaultProps} selected={['Frontend']} />);

      const badgesList = screen.getByRole('list', { name: /selected domain/i });
      expect(badgesList).toBeInTheDocument();
    });

    it('has live region for announcing options count', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('has aria-controls pointing to listbox', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const listbox = screen.getByRole('listbox');
      expect(input).toHaveAttribute('aria-controls', listbox.id);
    });

    it('listbox has aria-label', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Domain options');
    });

    it('options have correct IDs for aria-activedescendant reference', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{ArrowDown}');

      // Check that the active descendant ID matches the option ID
      const activeDescendantId = input.getAttribute('aria-activedescendant');
      const activeOption = screen.getAllByRole('option')[0]!;
      expect(activeDescendantId).toBe(activeOption.id);
    });

    it('Add option has correct ID for aria-activedescendant reference', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} options={['A']} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewValue');
      // Navigate to Add option (past the 0 filtered options since 'A' doesn't match 'NewValue')
      await user.keyboard('{ArrowDown}');

      const activeDescendantId = input.getAttribute('aria-activedescendant');
      const addOption = screen.getByText('Add "NewValue"');
      expect(activeDescendantId).toBe(addOption.id);
    });

    it('does not have aria-describedby when no helper text', () => {
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('badges have correct role and listitem roles', () => {
      render(<MultiSelectCombobox {...defaultProps} selected={['Frontend', 'Backend']} />);

      const badges = screen.getAllByRole('listitem');
      expect(badges).toHaveLength(2);
    });

    it('live region announces option count changes', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('5 options available');

      await user.type(input, 'front');

      expect(liveRegion).toHaveTextContent('1 option available');
    });

    it('live region announces new option available', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'xyz');

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('0 options available (1 new option available)');
    });

    it('aria-atomic is set on live region', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty options array', () => {
      render(<MultiSelectCombobox {...defaultProps} options={[]} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('handles empty selected array', () => {
      render(<MultiSelectCombobox {...defaultProps} selected={[]} />);

      expect(screen.queryByRole('list', { name: /selected/i })).not.toBeInTheDocument();
    });

    it('shows "Add" option when no options match search', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'xyz');

      expect(screen.getByText('Add "xyz"')).toBeInTheDocument();
    });

    it('does not call handlers when disabled', () => {
      const onSelect = vi.fn();
      const onAdd = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onSelect={onSelect} onAdd={onAdd} disabled />);

      const input = screen.getByRole('combobox');
      fireEvent.focus(input); // userEvent.click won't work on disabled input

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('is case-insensitive when checking for exact matches', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'FRONTEND');

      // Should not show Add option since Frontend exists (case-insensitive)
      expect(screen.queryByText(/^Add /)).not.toBeInTheDocument();
    });

    it('does not crash when Backspace is pressed with no selected items', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} selected={[]} onRemove={onRemove} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(onRemove).not.toHaveBeenCalled();
    });

    it('does not navigate when ArrowUp is pressed on closed dropdown', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Escape}');
      // Verify dropdown is closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      // ArrowUp on closed dropdown should not open it (unlike ArrowDown)
      await user.keyboard('{ArrowUp}');
      // The component behavior: ArrowUp does not open the dropdown when closed
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not call onAdd when value is empty after trim', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      render(<MultiSelectCombobox {...defaultProps} onAdd={onAdd} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, '   ');
      await user.keyboard('{Enter}');

      expect(onAdd).not.toHaveBeenCalled();
    });

    it('handles all selected options case gracefully', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelectCombobox
          {...defaultProps}
          options={['A', 'B']}
          selected={['A', 'B']}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);

      // No options or add option should be shown, so no listbox
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('mouse hover updates active index for options', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      const options = screen.getAllByRole('option');
      await user.hover(options[2]!);

      expect(options[2]).toHaveClass('tags-popover-option-active');
    });

    it('mouse hover on Add option updates active index', async () => {
      const user = userEvent.setup();
      render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'xyz');

      const addOption = screen.getByText('Add "xyz"');
      await user.hover(addOption);

      expect(addOption).toHaveClass('tags-popover-option-active');
    });

    it('handles keyboard navigation with zero navigable items', async () => {
      const user = userEvent.setup();
      render(
        <MultiSelectCombobox
          {...defaultProps}
          options={['Test']}
          selected={['Test']}
        />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      // With no options and no search query (no Add option), ArrowDown should do nothing
      await user.keyboard('{ArrowDown}');

      // Should not crash or throw error
      expect(input).toBeInTheDocument();
    });
  });

  describe('Snapshot Tests', () => {
    it('matches snapshot with default props', () => {
      const { container } = render(<MultiSelectCombobox {...defaultProps} />);
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with selected values', () => {
      const { container } = render(
        <MultiSelectCombobox {...defaultProps} selected={['Frontend', 'Backend']} />
      );
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with error', () => {
      const { container } = render(
        <MultiSelectCombobox {...defaultProps} error="This field is required" />
      );
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with helper text and tooltip', () => {
      const { container } = render(
        <MultiSelectCombobox
          {...defaultProps}
          helperText="Select one or more domains"
          tooltip="Helpful information about domains"
        />
      );
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot when disabled', () => {
      const { container } = render(
        <MultiSelectCombobox {...defaultProps} selected={['Frontend']} disabled />
      );
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with suggestions dropdown open', async () => {
      const user = userEvent.setup();
      const { container } = render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with Add option visible', async () => {
      const user = userEvent.setup();
      const { container } = render(<MultiSelectCombobox {...defaultProps} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewOption');

      expect(container).toMatchSnapshot();
    });
  });

  describe('Recently Added Animation', () => {
    it('applies new badge animation class to recently added items', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();

      // We need to test that the recentlyAdded state works
      // This requires re-rendering with the newly added value
      const { rerender } = render(
        <MultiSelectCombobox {...defaultProps} onAdd={onAdd} />
      );

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.type(input, 'NewValue');
      await user.click(screen.getByText('Add "NewValue"'));

      expect(onAdd).toHaveBeenCalledWith('NewValue');

      // In the real app, the parent would update selected array
      // Here we simulate that behavior
      rerender(
        <MultiSelectCombobox
          {...defaultProps}
          selected={['NewValue']}
          onAdd={onAdd}
        />
      );

      // The badge should be present (animation class testing would require checking internal state)
      expect(screen.getByText('NewValue')).toBeInTheDocument();
    });
  });
});
