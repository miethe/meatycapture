/**
 * EditModal Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditModal } from '../EditModal';

describe('EditModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Edit Item',
    onClose: vi.fn(),
    onSave: vi.fn(),
    children: <div>Form content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<EditModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit Item')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<EditModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Item')).toBeInTheDocument();
    });

    it('renders children in content area', () => {
      render(<EditModal {...defaultProps} />);

      expect(screen.getByText('Form content')).toBeInTheDocument();
    });

    it('renders default button labels', () => {
      render(<EditModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
      render(<EditModal {...defaultProps} saveLabel="Submit" cancelLabel="Discard" />);

      expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('renders close button with correct aria-label', () => {
      render(<EditModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct role and aria attributes', () => {
      render(<EditModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');

      // Verify the title is linked via aria-labelledby
      const labelledById = dialog.getAttribute('aria-labelledby');
      expect(labelledById).toBeTruthy();
      const title = document.getElementById(labelledById!);
      expect(title).toHaveTextContent('Edit Item');
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <EditModal {...defaultProps}>
          <input data-testid="input-1" type="text" />
          <input data-testid="input-2" type="text" />
        </EditModal>
      );

      // Wait for focus trap to initialize
      await waitFor(() => {
        expect(document.activeElement).not.toBe(document.body);
      });

      // Get all focusable elements
      const closeButton = screen.getByRole('button', { name: 'Close modal' });
      const input1 = screen.getByTestId('input-1');
      const input2 = screen.getByTestId('input-2');
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const saveButton = screen.getByRole('button', { name: 'Save' });

      // Focus should be on first focusable element (close button)
      await waitFor(() => {
        expect(document.activeElement).toBe(closeButton);
      });

      // Tab through all elements
      await user.tab();
      expect(document.activeElement).toBe(input1);

      await user.tab();
      expect(document.activeElement).toBe(input2);

      await user.tab();
      expect(document.activeElement).toBe(cancelButton);

      await user.tab();
      expect(document.activeElement).toBe(saveButton);

      // Tab should cycle back to first element
      await user.tab();
      expect(document.activeElement).toBe(closeButton);
    });

    it('supports shift+tab to cycle backwards', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <EditModal {...defaultProps}>
          <input data-testid="input-1" type="text" />
        </EditModal>
      );

      const closeButton = screen.getByRole('button', { name: 'Close modal' });

      // Wait for focus trap to initialize
      await waitFor(() => {
        expect(document.activeElement).toBe(closeButton);
      });

      // Shift+Tab should go to last element (save button)
      await user.tab({ shift: true });
      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(document.activeElement).toBe(saveButton);
    });
  });

  describe('Close behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Close modal' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking overlay background', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} />);

      // Click on the overlay (the outermost div with role="presentation")
      const overlay = screen.getByRole('presentation');
      await user.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside modal content', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} />);

      // Click on the modal content
      await user.click(screen.getByText('Form content'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Save behavior', () => {
    it('calls onSave when save button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();

      render(<EditModal {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('does not call onSave when saveDisabled is true', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();

      render(<EditModal {...defaultProps} onSave={onSave} saveDisabled />);

      const saveButton = screen.getByRole('button', { name: 'Save' });
      expect(saveButton).toBeDisabled();

      await user.click(saveButton);

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Loading state (isSaving)', () => {
    it('shows spinner when isSaving is true', () => {
      render(<EditModal {...defaultProps} isSaving />);

      // The spinner should be present
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('shows "Saving..." text when isSaving is true', () => {
      render(<EditModal {...defaultProps} isSaving />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('disables save button when isSaving is true', () => {
      render(<EditModal {...defaultProps} isSaving />);

      // Find the save button by looking at primary button
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find((btn) => btn.classList.contains('primary'));
      expect(saveButton).toBeDisabled();
    });

    it('disables cancel button when isSaving is true', () => {
      render(<EditModal {...defaultProps} isSaving />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('disables close button when isSaving is true', () => {
      render(<EditModal {...defaultProps} isSaving />);

      expect(screen.getByRole('button', { name: 'Close modal' })).toBeDisabled();
    });

    it('does not call onClose on Escape when isSaving is true', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} isSaving />);

      await user.keyboard('{Escape}');

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose on overlay click when isSaving is true', async () => {
      const user = userEvent.setup({ delay: null });
      const onClose = vi.fn();

      render(<EditModal {...defaultProps} onClose={onClose} isSaving />);

      const overlay = screen.getByRole('presentation');
      await user.click(overlay);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onSave when isSaving is true', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();

      render(<EditModal {...defaultProps} onSave={onSave} isSaving />);

      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find((btn) => btn.classList.contains('primary'));
      await user.click(saveButton!);

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Custom width', () => {
    it('applies default width of 32rem', () => {
      render(<EditModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveStyle({ width: '32rem' });
    });

    it('applies custom width', () => {
      render(<EditModal {...defaultProps} width="40rem" />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveStyle({ width: '40rem' });
    });

    it('applies maxWidth of 90vw', () => {
      render(<EditModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveStyle({ maxWidth: '90vw' });
    });
  });

  describe('Children rendering', () => {
    it('renders complex children', () => {
      render(
        <EditModal {...defaultProps}>
          <form>
            <label htmlFor="test-input">Test Input</label>
            <input id="test-input" type="text" />
            <button type="submit">Submit Form</button>
          </form>
        </EditModal>
      );

      expect(screen.getByLabelText('Test Input')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit Form' })).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <EditModal {...defaultProps}>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <p>Paragraph 3</p>
        </EditModal>
      );

      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 3')).toBeInTheDocument();
    });

    it('renders null children without error', () => {
      render(<EditModal {...defaultProps}>{null}</EditModal>);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('has correct CSS classes on modal', () => {
      render(<EditModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('edit-modal');
      expect(modal).toHaveClass('glass');
    });

    it('has correct CSS classes on overlay', () => {
      render(<EditModal {...defaultProps} />);

      const overlay = screen.getByRole('presentation');
      expect(overlay).toHaveClass('modal-overlay');
    });

    it('has correct CSS class on header', () => {
      render(<EditModal {...defaultProps} />);

      const header = document.querySelector('.edit-modal-header');
      expect(header).toBeInTheDocument();
    });

    it('has correct CSS class on content area', () => {
      render(<EditModal {...defaultProps} />);

      const content = document.querySelector('.edit-modal-content');
      expect(content).toBeInTheDocument();
    });

    it('has correct CSS class on footer', () => {
      render(<EditModal {...defaultProps} />);

      const footer = document.querySelector('.edit-modal-footer');
      expect(footer).toBeInTheDocument();
    });
  });
});
