/**
 * DocumentArchiveConfirm Component Tests
 *
 * Tests for archive/unarchive confirmation dialog.
 * Verifies dialog content, mode handling, and callback behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentArchiveConfirm } from '../DocumentArchiveConfirm';
import type { RequestLogDoc } from '@core/models';

// Mock document factory
const createMockDoc = (overrides: Partial<RequestLogDoc> = {}): RequestLogDoc => ({
  doc_id: 'REQ-20251231-test-project',
  title: 'Test Document',
  project_id: 'test-project',
  items: [],
  items_index: [],
  tags: ['ux', 'api'],
  item_count: 0,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T12:00:00Z'),
  archived: false,
  ...overrides,
});

describe('DocumentArchiveConfirm', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('archive mode', () => {
    it('renders with correct title', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('heading', { name: 'Archive Document' })).toBeInTheDocument();
    });

    it('renders message with doc_id', () => {
      const doc = createMockDoc({ doc_id: 'REQ-20251231-my-project' });

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText(
          'Archive document REQ-20251231-my-project? You can restore it later from the Archived filter.'
        )
      ).toBeInTheDocument();
    });

    it('renders Archive confirm button', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('unarchive mode', () => {
    it('renders with correct title', () => {
      const doc = createMockDoc({ archived: true });

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="unarchive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('heading', { name: 'Unarchive Document' })).toBeInTheDocument();
    });

    it('renders message with doc_id', () => {
      const doc = createMockDoc({ doc_id: 'REQ-20251231-archived-project', archived: true });

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="unarchive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(
        screen.getByText('Restore document REQ-20251231-archived-project to active documents?')
      ).toBeInTheDocument();
    });

    it('renders Unarchive confirm button', () => {
      const doc = createMockDoc({ archived: true });

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="unarchive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Unarchive' })).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('calls onConfirm when confirm button clicked', async () => {
      const user = userEvent.setup();
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Archive' }));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Note: ConfirmationDialog has exit animation, onCancel is called after delay
      // Wait for the animation to complete
      await vi.waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onConfirm for unarchive mode', async () => {
      const user = userEvent.setup();
      const doc = createMockDoc({ archived: true });

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="unarchive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Unarchive' }));

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('isOpen prop', () => {
    it('does not render when isOpen is false', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={false}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders dialog when isOpen is true', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('isLoading prop', () => {
    it('disables confirm button when loading', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });

    it('defaults isLoading to false', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: 'Archive' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeDisabled();
    });
  });

  describe('isDangerous behavior', () => {
    it('uses non-dangerous styling (not red)', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByRole('button', { name: 'Archive' });
      // Archive is not dangerous - should have primary styling, not danger
      expect(confirmButton).toHaveClass('primary');
      expect(confirmButton).not.toHaveClass('danger');
    });
  });

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('dialog is modal', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has labeled dialog', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('has described dialog', () => {
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('keyboard interaction', () => {
    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      await user.keyboard('{Escape}');

      // Wait for exit animation
      await vi.waitFor(() => {
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      });
    });

    it('does not close on Escape when loading', async () => {
      const user = userEvent.setup();
      const doc = createMockDoc();

      render(
        <DocumentArchiveConfirm
          doc={doc}
          isOpen={true}
          mode="archive"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      await user.keyboard('{Escape}');

      // Give time for potential async behavior
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });
});
