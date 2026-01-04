/**
 * DocumentDeleteConfirm Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentDeleteConfirm } from '../DocumentDeleteConfirm';
import type { RequestLogDoc } from '@core/models';

// Mock document factory
const createMockDoc = (overrides: Partial<RequestLogDoc> = {}): RequestLogDoc => ({
  doc_id: 'REQ-20251231-test',
  title: 'Test Document',
  project_id: 'test-project',
  items: [],
  items_index: [],
  tags: ['tag1', 'tag2'],
  item_count: 0,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
  archived: false,
  ...overrides,
});

describe('DocumentDeleteConfirm', () => {
  const defaultProps = {
    doc: createMockDoc(),
    isOpen: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<DocumentDeleteConfirm {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders dialog when isOpen is true', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders with Delete Document title', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      expect(screen.getByText('Delete Document')).toBeInTheDocument();
    });

    it('renders Delete and Cancel buttons', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('message formatting', () => {
    it('shows empty document message when item_count is 0', () => {
      const doc = createMockDoc({ doc_id: 'REQ-20251231-empty', item_count: 0 });

      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      expect(
        screen.getByText('Delete empty document REQ-20251231-empty? This cannot be undone.')
      ).toBeInTheDocument();
    });

    it('shows singular item message when item_count is 1', () => {
      const doc = createMockDoc({ doc_id: 'REQ-20251231-single', item_count: 1 });

      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      expect(
        screen.getByText('Delete document REQ-20251231-single with 1 item? This cannot be undone.')
      ).toBeInTheDocument();
    });

    it('shows plural items message when item_count is greater than 1', () => {
      const doc = createMockDoc({ doc_id: 'REQ-20251231-multi', item_count: 5 });

      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      expect(
        screen.getByText('Delete document REQ-20251231-multi with 5 items? This cannot be undone.')
      ).toBeInTheDocument();
    });

    it('handles large item counts correctly', () => {
      const doc = createMockDoc({ doc_id: 'REQ-20251231-large', item_count: 100 });

      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      expect(
        screen.getByText(
          'Delete document REQ-20251231-large with 100 items? This cannot be undone.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onConfirm when Delete button is clicked', async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentDeleteConfirm {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentDeleteConfirm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Wait for exit animation to complete
      await waitFor(
        () => {
          expect(onCancel).toHaveBeenCalledTimes(1);
        },
        { timeout: 500 }
      );
    });

    it('calls onCancel when Escape key is pressed', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentDeleteConfirm {...defaultProps} onCancel={onCancel} />);

      await user.keyboard('{Escape}');

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

      render(<DocumentDeleteConfirm {...defaultProps} onCancel={onCancel} />);

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
  });

  describe('dangerous styling', () => {
    it('applies danger class to Delete button', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).toHaveClass('danger');
    });

    it('does not apply primary class to Delete button', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      expect(deleteButton).not.toHaveClass('primary');
    });
  });

  describe('accessibility', () => {
    it('has correct role attribute', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal attribute', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title', () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      const labelledById = dialog.getAttribute('aria-labelledby');

      expect(labelledById).toBeTruthy();
      expect(document.getElementById(labelledById!)).toHaveTextContent('Delete Document');
    });

    it('has aria-describedby pointing to message', () => {
      const doc = createMockDoc({ item_count: 3 });
      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      const dialog = screen.getByRole('dialog');
      const describedById = dialog.getAttribute('aria-describedby');

      expect(describedById).toBeTruthy();
      expect(document.getElementById(describedById!)).toHaveTextContent(
        'Delete document REQ-20251231-test with 3 items? This cannot be undone.'
      );
    });

    it('focuses Cancel button on open (safer default)', async () => {
      render(<DocumentDeleteConfirm {...defaultProps} />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: 'Cancel' });
        expect(document.activeElement).toBe(cancelButton);
      });
    });
  });

  describe('focus trap', () => {
    it('traps focus within dialog when tabbing forward', async () => {
      const user = userEvent.setup({ delay: null });

      render(<DocumentDeleteConfirm {...defaultProps} />);

      // Cancel button should be focused initially
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      });

      // Tab to Delete button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' }));

      // Tab should cycle back to Cancel button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
    });

    it('traps focus within dialog when tabbing backward', async () => {
      const user = userEvent.setup({ delay: null });

      render(<DocumentDeleteConfirm {...defaultProps} />);

      // Cancel button should be focused initially
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
      });

      // Shift+Tab should cycle to Delete button
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' }));
    });
  });

  describe('different document scenarios', () => {
    it('handles document with complex doc_id', () => {
      const doc = createMockDoc({
        doc_id: 'REQ-20251231-my-complex-project-name',
        item_count: 7,
      });

      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      expect(
        screen.getByText(
          'Delete document REQ-20251231-my-complex-project-name with 7 items? This cannot be undone.'
        )
      ).toBeInTheDocument();
    });

    it('handles archived document the same as active', () => {
      const doc = createMockDoc({
        archived: true,
        item_count: 2,
      });

      render(<DocumentDeleteConfirm {...defaultProps} doc={doc} />);

      expect(
        screen.getByText('Delete document REQ-20251231-test with 2 items? This cannot be undone.')
      ).toBeInTheDocument();
    });
  });

  // Note: Snapshot tests removed - ConfirmationDialog uses random IDs for accessibility
  // which causes flaky snapshots. Behavior is thoroughly tested above.
});
