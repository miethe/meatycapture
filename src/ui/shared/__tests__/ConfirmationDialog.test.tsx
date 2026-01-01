/**
 * ConfirmationDialog Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationDialog } from '../ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          isOpen={false}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders dialog when isOpen is true', () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    });

    it('renders with default button labels', () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('renders with custom button labels', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          confirmLabel="Delete"
          cancelLabel="Keep"
        />
      );

      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });
  });

  describe('confirmation callback', () => {
    it('calls onConfirm when confirm button is clicked', async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      await user.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when loading', async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
          isLoading={true}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('cancellation callback', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Wait for exit animation to complete
      await waitFor(
        () => {
          expect(onCancel).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });

    it('calls onCancel when clicking overlay', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onCancel={onCancel}
        />
      );

      // Click on the overlay (outside the dialog)
      const overlay = screen.getByRole('dialog').parentElement;
      if (overlay) {
        await user.click(overlay);
      }

      // Wait for exit animation to complete
      await waitFor(
        () => {
          expect(onCancel).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });

    it('does not call onCancel when clicking inside dialog', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onCancel={onCancel}
        />
      );

      // Click on the dialog itself (not buttons)
      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      // Give time for any potential callback
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onCancel).not.toHaveBeenCalled();
    });

    it('does not call onCancel on overlay click when loading', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onCancel={onCancel}
          isLoading={true}
        />
      );

      const overlay = screen.getByRole('dialog').parentElement;
      if (overlay) {
        await user.click(overlay);
      }

      // Give time for any potential callback
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('escape key behavior', () => {
    it('calls onCancel when Escape key is pressed', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onCancel={onCancel}
        />
      );

      await user.keyboard('{Escape}');

      // Wait for exit animation to complete
      await waitFor(
        () => {
          expect(onCancel).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });

    it('does not call onCancel on Escape when loading', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <ConfirmationDialog
          {...defaultProps}
          onCancel={onCancel}
          isLoading={true}
        />
      );

      await user.keyboard('{Escape}');

      // Give time for any potential callback
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('focus trap', () => {
    it('focuses cancel button on open (safer default)', async () => {
      render(<ConfirmationDialog {...defaultProps} />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(document.activeElement).toBe(cancelButton);
      });
    });

    it('traps focus within dialog when tabbing forward', async () => {
      const user = userEvent.setup({ delay: null });

      render(<ConfirmationDialog {...defaultProps} />);

      // Cancel button should be focused initially
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      });

      // Tab to Confirm button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm' }));

      // Tab should cycle back to Cancel button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    });

    it('traps focus within dialog when tabbing backward', async () => {
      const user = userEvent.setup({ delay: null });

      render(<ConfirmationDialog {...defaultProps} />);

      // Cancel button should be focused initially
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      });

      // Shift+Tab should cycle to Confirm button
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm' }));
    });
  });

  describe('dangerous styling', () => {
    it('applies danger class when isDangerous is true', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          isDangerous={true}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('danger');
      expect(confirmButton).not.toHaveClass('primary');
    });

    it('applies primary class when isDangerous is false', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          isDangerous={false}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton).toHaveClass('primary');
      expect(confirmButton).not.toHaveClass('danger');
    });
  });

  describe('loading state', () => {
    it('applies loading class when isLoading is true', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          isLoading={true}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toHaveClass('loading');
    });

    it('disables both buttons when loading', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    });

    it('does not disable buttons when not loading', () => {
      render(
        <ConfirmationDialog
          {...defaultProps}
          isLoading={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('has correct role attribute', () => {
      render(<ConfirmationDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const labelledById = dialog.getAttribute('aria-labelledby');

      expect(labelledById).toBeTruthy();
      expect(document.getElementById(labelledById!)).toHaveTextContent('Confirm Action');
    });

    it('has aria-describedby pointing to message', () => {
      render(<ConfirmationDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const describedById = dialog.getAttribute('aria-describedby');

      expect(describedById).toBeTruthy();
      expect(document.getElementById(describedById!)).toHaveTextContent('Are you sure you want to proceed?');
    });
  });

  describe('body scroll lock', () => {
    it('prevents body scroll when dialog is open', () => {
      // Store original for later verification
      const originalOverflow = document.body.style.overflow;

      const { unmount } = render(<ConfirmationDialog {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');

      // Cleanup should restore original
      unmount();
      expect(document.body.style.overflow).toBe(originalOverflow);
    });
  });
});
