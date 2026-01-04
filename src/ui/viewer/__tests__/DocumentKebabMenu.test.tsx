/**
 * DocumentKebabMenu Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentKebabMenu } from '../DocumentKebabMenu';
import type { RequestLogDoc } from '@core/models';

// Mock document for testing
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

describe('DocumentKebabMenu', () => {
  const defaultProps = {
    doc: createMockDoc(),
    onDelete: vi.fn(),
    onArchive: vi.fn(),
    onEdit: vi.fn(),
    onAddItem: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders trigger button', () => {
      render(<DocumentKebabMenu {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /actions for document/i });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('has correct aria-label with doc id', () => {
      render(<DocumentKebabMenu {...defaultProps} />);

      const trigger = screen.getByRole('button', {
        name: 'Actions for document REQ-20251231-test',
      });
      expect(trigger).toBeInTheDocument();
    });

    it('menu is not visible initially', () => {
      render(<DocumentKebabMenu {...defaultProps} />);

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('menu items for non-archived document', () => {
    it('shows all menu items when opened', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(screen.getByRole('menuitem', { name: 'Add Item' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Edit Document' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Archive Document' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Delete Document' })).toBeInTheDocument();
    });

    it('does not show Unarchive for non-archived document', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(
        screen.queryByRole('menuitem', { name: 'Unarchive Document' })
      ).not.toBeInTheDocument();
    });

    it('shows Archive for non-archived document', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(screen.getByRole('menuitem', { name: 'Archive Document' })).toBeInTheDocument();
    });
  });

  describe('menu items for archived document', () => {
    it('shows Unarchive for archived document', async () => {
      const user = userEvent.setup({ delay: null });
      const archivedDoc = createMockDoc({ archived: true });

      render(<DocumentKebabMenu {...defaultProps} doc={archivedDoc} onUnarchive={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(screen.getByRole('menuitem', { name: 'Unarchive Document' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Archive Document' })).not.toBeInTheDocument();
    });

    it('does not show Archive for archived document with onUnarchive', async () => {
      const user = userEvent.setup({ delay: null });
      const archivedDoc = createMockDoc({ archived: true });

      render(<DocumentKebabMenu {...defaultProps} doc={archivedDoc} onUnarchive={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(screen.queryByRole('menuitem', { name: 'Archive Document' })).not.toBeInTheDocument();
    });
  });

  describe('action callbacks', () => {
    it('calls onAddItem when Add Item is clicked', async () => {
      const onAddItem = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentKebabMenu {...defaultProps} onAddItem={onAddItem} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Add Item' }));

      expect(onAddItem).toHaveBeenCalledTimes(1);
    });

    it('calls onEdit when Edit Document is clicked', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentKebabMenu {...defaultProps} onEdit={onEdit} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Edit Document' }));

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onArchive when Archive Document is clicked', async () => {
      const onArchive = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentKebabMenu {...defaultProps} onArchive={onArchive} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Archive Document' }));

      expect(onArchive).toHaveBeenCalledTimes(1);
    });

    it('calls onUnarchive when Unarchive Document is clicked', async () => {
      const onUnarchive = vi.fn();
      const user = userEvent.setup({ delay: null });
      const archivedDoc = createMockDoc({ archived: true });

      render(<DocumentKebabMenu {...defaultProps} doc={archivedDoc} onUnarchive={onUnarchive} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Unarchive Document' }));

      expect(onUnarchive).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when Delete Document is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentKebabMenu {...defaultProps} onDelete={onDelete} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete Document' }));

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('closes menu after action is selected', async () => {
      const user = userEvent.setup({ delay: null });

      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.click(screen.getByRole('menuitem', { name: 'Add Item' }));

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('menu item order', () => {
    it('shows items in correct order for non-archived doc', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(4);
      expect(items[0]).toHaveTextContent('Add Item');
      expect(items[1]).toHaveTextContent('Edit Document');
      expect(items[2]).toHaveTextContent('Archive Document');
      expect(items[3]).toHaveTextContent('Delete Document');
    });

    it('shows items in correct order for archived doc', async () => {
      const user = userEvent.setup({ delay: null });
      const archivedDoc = createMockDoc({ archived: true });

      render(<DocumentKebabMenu {...defaultProps} doc={archivedDoc} onUnarchive={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      const items = screen.getAllByRole('menuitem');
      expect(items).toHaveLength(4);
      expect(items[0]).toHaveTextContent('Add Item');
      expect(items[1]).toHaveTextContent('Edit Document');
      expect(items[2]).toHaveTextContent('Unarchive Document');
      expect(items[3]).toHaveTextContent('Delete Document');
    });
  });

  describe('dangerous item styling', () => {
    it('applies dangerous class to Delete Document', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      expect(deleteItem).toHaveClass('kebab-menu-item-dangerous');
    });

    it('does not apply dangerous class to other items', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      const addItem = screen.getByRole('menuitem', { name: 'Add Item' });
      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });

      expect(addItem).not.toHaveClass('kebab-menu-item-dangerous');
      expect(editItem).not.toHaveClass('kebab-menu-item-dangerous');
      expect(archiveItem).not.toHaveClass('kebab-menu-item-dangerous');
    });
  });

  describe('icons', () => {
    it('renders icons for all menu items', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      const items = screen.getAllByRole('menuitem');

      // Each item should have an SVG icon
      items.forEach((item) => {
        const svg = item.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('icons have correct dimensions', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      const items = screen.getAllByRole('menuitem');
      const firstSvg = items[0]?.querySelector('svg');

      expect(firstSvg).toHaveAttribute('width', '16');
      expect(firstSvg).toHaveAttribute('height', '16');
    });
  });

  describe('keyboard navigation', () => {
    it('supports keyboard navigation through items', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      // First item should be focused
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Add Item' }));
      });

      // Navigate down
      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit Document' }));

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: 'Archive Document' })
      );

      await user.keyboard('{ArrowDown}');
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: 'Delete Document' })
      );
    });

    it('closes menu on Escape', async () => {
      const user = userEvent.setup({ delay: null });
      render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('selects item on Enter', async () => {
      const onAddItem = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<DocumentKebabMenu {...defaultProps} onAddItem={onAddItem} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Add Item' }));
      });

      await user.keyboard('{Enter}');

      expect(onAddItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles archived doc without onUnarchive callback', async () => {
      const user = userEvent.setup({ delay: null });
      const archivedDoc = createMockDoc({ archived: true });

      // No onUnarchive provided - should still render without error
      render(<DocumentKebabMenu {...defaultProps} doc={archivedDoc} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      // Should not show Unarchive or Archive
      expect(
        screen.queryByRole('menuitem', { name: 'Unarchive Document' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Archive Document' })).not.toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('matches closed state snapshot', () => {
      const { container } = render(<DocumentKebabMenu {...defaultProps} />);
      expect(container).toMatchSnapshot();
    });

    it('matches open state snapshot for non-archived doc', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<DocumentKebabMenu {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(container).toMatchSnapshot();
    });

    it('matches open state snapshot for archived doc', async () => {
      const user = userEvent.setup({ delay: null });
      const archivedDoc = createMockDoc({ archived: true });

      const { container } = render(
        <DocumentKebabMenu {...defaultProps} doc={archivedDoc} onUnarchive={vi.fn()} />
      );

      await user.click(screen.getByRole('button', { name: /actions for document/i }));

      expect(container).toMatchSnapshot();
    });
  });
});
