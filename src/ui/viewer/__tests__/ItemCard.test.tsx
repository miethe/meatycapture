/**
 * ItemCard Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemCard } from '../ItemCard';
import type { RequestLogItem } from '@core/models';

// Mock item for testing
const createMockItem = (overrides: Partial<RequestLogItem> = {}): RequestLogItem => ({
  id: 'REQ-20251231-test-01',
  title: 'Test Item Title',
  type: 'enhancement',
  domain: 'web',
  context: 'frontend',
  priority: 'medium',
  status: 'triage',
  tags: ['ux', 'api'],
  notes: 'Test notes content',
  created_at: new Date('2025-12-31T10:00:00Z'),
  ...overrides,
});

describe('ItemCard', () => {
  const defaultProps = {
    item: createMockItem(),
    onCopyId: vi.fn(),
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders item ID and title', () => {
      render(<ItemCard {...defaultProps} />);

      expect(screen.getByText('REQ-20251231-test-01')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Item Title' })).toBeInTheDocument();
    });

    it('renders item metadata fields', () => {
      render(<ItemCard {...defaultProps} />);

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('enhancement')).toBeInTheDocument();
      expect(screen.getByText('Domain')).toBeInTheDocument();
      expect(screen.getByText('web')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('triage')).toBeInTheDocument();
    });

    it('renders tags as chips', () => {
      render(<ItemCard {...defaultProps} />);

      expect(screen.getByText('ux')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
    });

    it('renders copy button', () => {
      render(<ItemCard {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy item id/i });
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe('edit button', () => {
    it('does not render edit button when onEdit is not provided', () => {
      render(<ItemCard {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /edit item/i })).not.toBeInTheDocument();
    });

    it('renders edit button when onEdit is provided', () => {
      const onEdit = vi.fn();
      render(<ItemCard {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      expect(editButton).toBeInTheDocument();
    });

    it('calls onEdit with item when edit button is clicked', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });
      const item = createMockItem();

      render(<ItemCard item={item} onCopyId={vi.fn()} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: /edit item/i });
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(item);
    });

    it('edit button is keyboard accessible', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<ItemCard {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: /edit item/i });
      editButton.focus();
      await user.keyboard('{Enter}');

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('edit button activates with Space key', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<ItemCard {...defaultProps} onEdit={onEdit} />);

      const editButton = screen.getByRole('button', { name: /edit item/i });
      editButton.focus();
      await user.keyboard(' ');

      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('edit button has correct aria-label', () => {
      render(<ItemCard {...defaultProps} onEdit={vi.fn()} />);

      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      expect(editButton).toHaveAttribute('aria-label', 'Edit item REQ-20251231-test-01');
    });
  });

  describe('delete button', () => {
    it('does not render delete button when onDelete is not provided', () => {
      render(<ItemCard {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /delete item/i })).not.toBeInTheDocument();
    });

    it('renders delete button when onDelete is provided', () => {
      const onDelete = vi.fn();
      render(<ItemCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete item REQ-20251231-test-01/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it('calls onDelete with item when delete button is clicked', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });
      const item = createMockItem();

      render(<ItemCard item={item} onCopyId={vi.fn()} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete item/i });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(item);
    });

    it('delete button is keyboard accessible', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<ItemCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete item/i });
      deleteButton.focus();
      await user.keyboard('{Enter}');

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('delete button activates with Space key', async () => {
      const onDelete = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(<ItemCard {...defaultProps} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete item/i });
      deleteButton.focus();
      await user.keyboard(' ');

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('delete button has correct aria-label', () => {
      render(<ItemCard {...defaultProps} onDelete={vi.fn()} />);

      const deleteButton = screen.getByRole('button', { name: /delete item REQ-20251231-test-01/i });
      expect(deleteButton).toHaveAttribute('aria-label', 'Delete item REQ-20251231-test-01');
    });
  });

  describe('action buttons container', () => {
    it('does not render actions container when no callbacks provided', () => {
      const { container } = render(<ItemCard {...defaultProps} />);

      expect(container.querySelector('.viewer-item-actions')).not.toBeInTheDocument();
    });

    it('renders actions container when onEdit is provided', () => {
      const { container } = render(<ItemCard {...defaultProps} onEdit={vi.fn()} />);

      expect(container.querySelector('.viewer-item-actions')).toBeInTheDocument();
    });

    it('renders actions container when onDelete is provided', () => {
      const { container } = render(<ItemCard {...defaultProps} onDelete={vi.fn()} />);

      expect(container.querySelector('.viewer-item-actions')).toBeInTheDocument();
    });

    it('renders both buttons when both callbacks are provided', () => {
      render(<ItemCard {...defaultProps} onEdit={vi.fn()} onDelete={vi.fn()} />);

      expect(screen.getByRole('button', { name: /edit item/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete item/i })).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('renders edit icon with proper SVG', () => {
      render(<ItemCard {...defaultProps} onEdit={vi.fn()} />);

      const editButton = screen.getByRole('button', { name: /edit item/i });
      const svg = editButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('renders delete icon with proper SVG', () => {
      render(<ItemCard {...defaultProps} onDelete={vi.fn()} />);

      const deleteButton = screen.getByRole('button', { name: /delete item/i });
      const svg = deleteButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('button styling', () => {
    it('edit button has correct CSS class', () => {
      render(<ItemCard {...defaultProps} onEdit={vi.fn()} />);

      const editButton = screen.getByRole('button', { name: /edit item/i });
      expect(editButton).toHaveClass('viewer-item-action-button');
      expect(editButton).toHaveClass('viewer-item-edit-button');
    });

    it('delete button has correct CSS class', () => {
      render(<ItemCard {...defaultProps} onDelete={vi.fn()} />);

      const deleteButton = screen.getByRole('button', { name: /delete item/i });
      expect(deleteButton).toHaveClass('viewer-item-action-button');
      expect(deleteButton).toHaveClass('viewer-item-delete-button');
    });
  });

  describe('priority styling', () => {
    it('applies priority-critical class for critical priority', () => {
      const item = createMockItem({ priority: 'critical' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const priorityBadge = container.querySelector('.priority-badge');
      expect(priorityBadge).toHaveClass('priority-critical');
    });

    it('applies priority-high class for high priority', () => {
      const item = createMockItem({ priority: 'high' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const priorityBadge = container.querySelector('.priority-badge');
      expect(priorityBadge).toHaveClass('priority-high');
    });

    it('applies priority-medium class for medium priority', () => {
      const item = createMockItem({ priority: 'medium' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const priorityBadge = container.querySelector('.priority-badge');
      expect(priorityBadge).toHaveClass('priority-medium');
    });

    it('applies priority-low class for low priority', () => {
      const item = createMockItem({ priority: 'low' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const priorityBadge = container.querySelector('.priority-badge');
      expect(priorityBadge).toHaveClass('priority-low');
    });

    it('applies no extra priority class for unknown priority', () => {
      const item = createMockItem({ priority: 'unknown' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const priorityBadge = container.querySelector('.priority-badge');
      expect(priorityBadge).not.toHaveClass('priority-critical');
      expect(priorityBadge).not.toHaveClass('priority-high');
      expect(priorityBadge).not.toHaveClass('priority-medium');
      expect(priorityBadge).not.toHaveClass('priority-low');
    });
  });

  describe('status styling', () => {
    it('applies status-done class for done status', () => {
      const item = createMockItem({ status: 'done' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).toHaveClass('status-done');
    });

    it('applies status-in-progress class for in-progress status', () => {
      const item = createMockItem({ status: 'in-progress' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).toHaveClass('status-in-progress');
    });

    it('applies status-planned class for planned status', () => {
      const item = createMockItem({ status: 'planned' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).toHaveClass('status-planned');
    });

    it('applies status-backlog class for backlog status', () => {
      const item = createMockItem({ status: 'backlog' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).toHaveClass('status-backlog');
    });

    it('applies status-triage class for triage status', () => {
      const item = createMockItem({ status: 'triage' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).toHaveClass('status-triage');
    });

    it('applies status-wontfix class for wontfix status', () => {
      const item = createMockItem({ status: 'wontfix' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).toHaveClass('status-wontfix');
    });

    it('applies no extra status class for unknown status', () => {
      const item = createMockItem({ status: 'unknown' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const statusBadge = container.querySelector('.status-badge');
      expect(statusBadge).not.toHaveClass('status-done');
      expect(statusBadge).not.toHaveClass('status-in-progress');
      expect(statusBadge).not.toHaveClass('status-planned');
      expect(statusBadge).not.toHaveClass('status-backlog');
      expect(statusBadge).not.toHaveClass('status-triage');
      expect(statusBadge).not.toHaveClass('status-wontfix');
    });
  });

  describe('copy ID functionality', () => {
    it('copies ID to clipboard and shows success feedback', async () => {
      const user = userEvent.setup({ delay: null });
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const onCopyId = vi.fn();
      render(<ItemCard item={createMockItem()} onCopyId={onCopyId} />);

      const copyButton = screen.getByRole('button', { name: /copy item id/i });
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('REQ-20251231-test-01');
      expect(onCopyId).toHaveBeenCalledWith('REQ-20251231-test-01');
      expect(screen.getByText('Copied!')).toBeInTheDocument();

      vi.unstubAllGlobals();
    });

    it('shows failure feedback when clipboard copy fails', async () => {
      const user = userEvent.setup({ delay: null });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const onCopyId = vi.fn();
      render(<ItemCard item={createMockItem()} onCopyId={onCopyId} />);

      const copyButton = screen.getByRole('button', { name: /copy item id/i });
      await user.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('REQ-20251231-test-01');
      expect(onCopyId).not.toHaveBeenCalled();
      expect(screen.getByText('Failed to copy')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy item ID:', expect.any(Error));

      consoleSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe('empty tags', () => {
    it('does not render tags section when tags array is empty', () => {
      const item = createMockItem({ tags: [] });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      expect(container.querySelector('.viewer-item-tags')).not.toBeInTheDocument();
    });
  });

  describe('empty notes', () => {
    it('does not render notes section when notes is empty', () => {
      const item = createMockItem({ notes: '' });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      expect(container.querySelector('.viewer-item-notes')).not.toBeInTheDocument();
    });
  });

  describe('modified date display', () => {
    it('shows Modified date when modified_at differs from created_at', () => {
      const createdAt = new Date('2025-12-31T10:00:00Z');
      const modifiedAt = new Date('2025-12-31T14:30:00Z');

      const item = createMockItem({
        created_at: createdAt,
        modified_at: modifiedAt,
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);

      // Should show both Created and Modified labels
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('does NOT show Modified date when modified_at equals created_at', () => {
      const sameDate = new Date('2025-12-31T10:00:00Z');

      const item = createMockItem({
        created_at: sameDate,
        modified_at: sameDate,
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);

      // Should only show Created label, not Modified
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('does NOT show Modified date when modified_at is undefined (backward compatibility)', () => {
      const item = createMockItem({
        created_at: new Date('2025-12-31T10:00:00Z'),
        // No modified_at field - simulates old format
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);

      // Should only show Created label, not Modified
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('handles items with modified_at as undefined explicitly', () => {
      // Create item without modified_at field to simulate legacy items
      const item = createMockItem({
        id: 'REQ-20251231-legacy-01',
        title: 'Legacy Item',
        type: 'bug',
        domain: 'api',
        context: 'Legacy context',
        priority: 'high',
        status: 'backlog',
        tags: ['legacy'],
        notes: 'Legacy notes',
        created_at: new Date('2025-11-01T08:00:00Z'),
      });
      // Explicitly delete modified_at to simulate a legacy item
      delete (item as Partial<RequestLogItem>).modified_at;

      render(<ItemCard item={item} onCopyId={vi.fn()} />);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('shows different dates when item was modified on different day', () => {
      const createdAt = new Date('2025-12-01T10:00:00Z');
      const modifiedAt = new Date('2025-12-15T14:30:00Z');

      const item = createMockItem({
        created_at: createdAt,
        modified_at: modifiedAt,
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);

      // Should show both dates
      expect(screen.getByText('Modified')).toBeInTheDocument();
      // Look for the modified date - Dec 15
      expect(screen.getByText(/Dec 15, 2025/i)).toBeInTheDocument();
    });
  });
});
