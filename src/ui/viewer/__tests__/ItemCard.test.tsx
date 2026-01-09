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
  domain: ['web'],
  subdomain: ['frontend'],
  priority: 'medium',
  status: 'triage',
  tags: ['ux', 'api'],
  notes: [],
  created_at: new Date('2025-12-31T10:00:00Z'),
  ...overrides,
});

/**
 * Helper to expand the ItemCard by clicking the collapse toggle.
 * ItemCard defaults to collapsed state, so many tests need to expand first.
 */
async function expandItemCard(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const expandButton = screen.getByRole('button', { name: /expand item details/i });
  await user.click(expandButton);
}

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

    it('renders item metadata fields when expanded', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ItemCard {...defaultProps} />);
      await expandItemCard(user);

      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('enhancement')).toBeInTheDocument();
      expect(screen.getByText('Domain')).toBeInTheDocument();
      expect(screen.getByText('web')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('triage')).toBeInTheDocument();
    });

    it('renders tags as chips when expanded', async () => {
      const user = userEvent.setup({ delay: null });
      render(<ItemCard {...defaultProps} />);
      await expandItemCard(user);

      expect(screen.getByText('ux')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
    });

    it('renders copy button', () => {
      render(<ItemCard {...defaultProps} />);

      const copyButton = screen.getByRole('button', { name: /copy item id/i });
      expect(copyButton).toBeInTheDocument();
    });

    it('renders collapse toggle button', () => {
      render(<ItemCard {...defaultProps} />);

      const collapseToggle = screen.getByRole('button', { name: /expand item details/i });
      expect(collapseToggle).toBeInTheDocument();
    });

    it('starts in collapsed state by default', () => {
      const { container } = render(<ItemCard {...defaultProps} />);

      const collapsible = container.querySelector('.viewer-item-collapsible');
      expect(collapsible).toHaveClass('collapsed');
    });

    it('expands when toggle is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<ItemCard {...defaultProps} />);
      await expandItemCard(user);

      const collapsible = container.querySelector('.viewer-item-collapsible');
      expect(collapsible).toHaveClass('expanded');
      // Button should now show "Collapse" label
      expect(screen.getByRole('button', { name: /collapse item details/i })).toBeInTheDocument();
    });

    it('collapses when toggle is clicked again', async () => {
      const user = userEvent.setup({ delay: null });
      const { container } = render(<ItemCard {...defaultProps} />);

      // Expand first
      await expandItemCard(user);

      // Click again to collapse
      const collapseButton = screen.getByRole('button', { name: /collapse item details/i });
      await user.click(collapseButton);

      const collapsible = container.querySelector('.viewer-item-collapsible');
      expect(collapsible).toHaveClass('collapsed');
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

      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
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

      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
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

  // Note: priority-badge and status-badge tests removed since ItemCard now uses
  // DropdownWithAdd components for inline editing instead of static badges.
  // Priority and status values are displayed in dropdowns, not styled badges.

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
    it('renders tags section with empty state when tags array is empty', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ tags: [] });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Tags section is always rendered for inline editing capability
      expect(container.querySelector('.viewer-item-tags')).toBeInTheDocument();
    });
  });

  describe('notes section', () => {
    it('renders notes section with empty state when notes is empty array', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ notes: [] });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // NotesList renders with empty state and "Add Note" button
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    });

    it('renders notes section with NotesList when notes exist', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-20251231-test-01-01',
            type: 'General',
            content: 'Test note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Should render NotesList with the note
      expect(screen.getByText('Notes (1)')).toBeInTheDocument();
      expect(screen.getByText('Test note content')).toBeInTheDocument();
    });

    it('opens NoteModal when Add Note button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ notes: [] });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      const addButton = screen.getByRole('button', { name: /add note/i });
      await user.click(addButton);

      // NoteModal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Check for the modal title with the heading role
      expect(screen.getByRole('heading', { name: 'Add Note' })).toBeInTheDocument();
    });

    it('opens NoteModal in edit mode when edit button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-20251231-test-01-01',
            type: 'General',
            content: 'Test note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Click edit on the note - use aria-label which includes "General" for the note type
      const noteEditButton = screen.getByRole('button', { name: /edit general note/i });
      await user.click(noteEditButton);

      // NoteModal should be open in edit mode
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeInTheDocument();
    });

    it('opens delete confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-20251231-test-01-01',
            type: 'General',
            content: 'Test note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Click delete on the note - use aria-label which includes "General" for the note type
      const noteDeleteButton = screen.getByRole('button', { name: /delete general note/i });
      await user.click(noteDeleteButton);

      // Confirmation dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Delete Note' })).toBeInTheDocument();
    });

    it('calls onNoteAdd callback when a note is added', async () => {
      const user = userEvent.setup({ delay: null });
      const onNoteAdd = vi.fn();
      const item = createMockItem({ notes: [] });

      // Mock crypto.randomUUID
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(
        '12345678-1234-1234-1234-123456789012' as ReturnType<typeof crypto.randomUUID>
      );

      render(<ItemCard item={item} onCopyId={vi.fn()} onNoteAdd={onNoteAdd} />);
      await expandItemCard(user);

      // Open modal
      await user.click(screen.getByRole('button', { name: /add note/i }));

      // Fill in content
      const textarea = screen.getByPlaceholderText(/enter note content/i);
      await user.type(textarea, 'New test note');

      // Save
      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(onNoteAdd).toHaveBeenCalledTimes(1);
      expect(onNoteAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'General',
          content: 'New test note',
        })
      );
    });

    it('calls onNoteDelete callback when a note is deleted', async () => {
      const user = userEvent.setup({ delay: null });
      const onNoteDelete = vi.fn();
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-20251231-test-01-01',
            type: 'General',
            content: 'Test note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} onNoteDelete={onNoteDelete} />);
      await expandItemCard(user);

      // Click delete on the note - use aria-label which includes "General" for the note type
      const noteDeleteButton = screen.getByRole('button', { name: /delete general note/i });
      await user.click(noteDeleteButton);

      // Confirm deletion - the confirm button in the dialog
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      expect(onNoteDelete).toHaveBeenCalledTimes(1);
      expect(onNoteDelete).toHaveBeenCalledWith('NOTE-20251231-test-01-01');
    });
  });

  describe('modified date display', () => {
    it('shows Modified date when modified_at differs from created_at', async () => {
      const user = userEvent.setup({ delay: null });
      const createdAt = new Date('2025-12-31T10:00:00Z');
      const modifiedAt = new Date('2025-12-31T14:30:00Z');

      const item = createMockItem({
        created_at: createdAt,
        modified_at: modifiedAt,
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Should show both Created and Modified labels
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('does NOT show Modified date when modified_at equals created_at', async () => {
      const user = userEvent.setup({ delay: null });
      const sameDate = new Date('2025-12-31T10:00:00Z');

      const item = createMockItem({
        created_at: sameDate,
        modified_at: sameDate,
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Should only show Created label, not Modified
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('does NOT show Modified date when modified_at is undefined (backward compatibility)', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        created_at: new Date('2025-12-31T10:00:00Z'),
        // No modified_at field - simulates old format
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Should only show Created label, not Modified
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('handles items with modified_at as undefined explicitly', async () => {
      const user = userEvent.setup({ delay: null });
      // Create item without modified_at field to simulate legacy items
      const item = createMockItem({
        id: 'REQ-20251231-legacy-01',
        title: 'Legacy Item',
        type: 'bug',
        domain: ['api'],
        subdomain: ['Legacy context'],
        priority: 'high',
        status: 'backlog',
        tags: ['legacy'],
        notes: [],
        created_at: new Date('2025-11-01T08:00:00Z'),
      });
      // Explicitly delete modified_at to simulate a legacy item
      delete (item as Partial<RequestLogItem>).modified_at;

      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.queryByText('Modified')).not.toBeInTheDocument();
    });

    it('shows different dates when item was modified on different day', async () => {
      const user = userEvent.setup({ delay: null });
      const createdAt = new Date('2025-12-01T10:00:00Z');
      const modifiedAt = new Date('2025-12-15T14:30:00Z');

      const item = createMockItem({
        created_at: createdAt,
        modified_at: modifiedAt,
      });

      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Should show both dates
      expect(screen.getByText('Modified')).toBeInTheDocument();
      // Look for the modified date - Dec 15
      expect(screen.getByText(/Dec 15, 2025/i)).toBeInTheDocument();
    });
  });

  describe('note type filter', () => {
    it('renders the note type filter dropdown when expanded', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'General note',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // NoteTypeFilter button should be present with "All Types" label by default
      const filterButton = screen.getByRole('button', { name: /filter by note type/i });
      expect(filterButton).toBeInTheDocument();
      expect(filterButton).toHaveTextContent('All Types');
    });

    it('shows all note types by default (empty filter = show all)', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'General note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
          {
            id: 'NOTE-02',
            type: 'Bug Fix Attempt',
            content: 'Bug fix note content',
            created_at: new Date('2025-12-31T11:00:00Z'),
            updated_at: new Date('2025-12-31T11:00:00Z'),
          },
          {
            id: 'NOTE-03',
            type: 'Validation',
            content: 'Validation note content',
            created_at: new Date('2025-12-31T12:00:00Z'),
            updated_at: new Date('2025-12-31T12:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // All notes should be visible
      expect(screen.getByText('General note content')).toBeInTheDocument();
      expect(screen.getByText('Bug fix note content')).toBeInTheDocument();
      expect(screen.getByText('Validation note content')).toBeInTheDocument();
      // Notes count should show all 3
      expect(screen.getByText('Notes (3)')).toBeInTheDocument();
    });

    it('filters notes when a specific type is selected', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'General note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
          {
            id: 'NOTE-02',
            type: 'Bug Fix Attempt',
            content: 'Bug fix note content',
            created_at: new Date('2025-12-31T11:00:00Z'),
            updated_at: new Date('2025-12-31T11:00:00Z'),
          },
          {
            id: 'NOTE-03',
            type: 'Validation',
            content: 'Validation note content',
            created_at: new Date('2025-12-31T12:00:00Z'),
            updated_at: new Date('2025-12-31T12:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Open filter dropdown
      const filterButton = screen.getByRole('button', { name: /filter by note type/i });
      await user.click(filterButton);

      // Click "All Types" to deselect all, then select only "General"
      // First click on "All Types" (which is currently selected) - this keeps all selected
      // Then click on "Bug Fix Attempt" to deselect it
      const bugFixOption = screen.getByRole('option', { name: /bug fix attempt/i });
      await user.click(bugFixOption);

      // Now click on "Validation" to deselect it
      const validationOption = screen.getByRole('option', { name: /validation/i });
      await user.click(validationOption);

      // Now click on "Other" to deselect it
      const otherOption = screen.getByRole('option', { name: /^other$/i });
      await user.click(otherOption);

      // Close dropdown by clicking outside or pressing Escape
      await user.keyboard('{Escape}');

      // Only General notes should be visible
      expect(screen.getByText('General note content')).toBeInTheDocument();
      expect(screen.queryByText('Bug fix note content')).not.toBeInTheDocument();
      expect(screen.queryByText('Validation note content')).not.toBeInTheDocument();

      // Filter button should show "General"
      expect(filterButton).toHaveTextContent('General');
    });

    it('filter dropdown is keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'General note content',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Focus the filter button and open with Enter
      const filterButton = screen.getByRole('button', { name: /filter by note type/i });
      filterButton.focus();
      await user.keyboard('{Enter}');

      // Dropdown should be open - listbox should be present
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');

      // Close with Escape
      await user.keyboard('{Escape}');

      // Dropdown should be closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('renders filter dropdown even when notes list is empty', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ notes: [] });
      render(<ItemCard item={item} onCopyId={vi.fn()} />);
      await expandItemCard(user);

      // Filter should still be present in empty state
      const filterButton = screen.getByRole('button', { name: /filter by note type/i });
      expect(filterButton).toBeInTheDocument();
    });
  });

  describe('note count badge', () => {
    it('does not show note count badge when there are no notes', () => {
      const item = createMockItem({ notes: [] });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      expect(container.querySelector('.note-count-badge')).not.toBeInTheDocument();
    });

    it('shows note count badge with correct count when notes exist', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Note 1',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
          {
            id: 'NOTE-02',
            type: 'General',
            content: 'Note 2',
            created_at: new Date('2025-12-31T11:00:00Z'),
            updated_at: new Date('2025-12-31T11:00:00Z'),
          },
          {
            id: 'NOTE-03',
            type: 'Bug Fix Attempt',
            content: 'Note 3',
            created_at: new Date('2025-12-31T12:00:00Z'),
            updated_at: new Date('2025-12-31T12:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('3');
    });

    it('shows note count badge with singular note for 1 note', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Single note',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1');
    });

    it('note count badge has accessible aria-label describing note count and types', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Note 1',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
          {
            id: 'NOTE-02',
            type: 'General',
            content: 'Note 2',
            created_at: new Date('2025-12-31T11:00:00Z'),
            updated_at: new Date('2025-12-31T11:00:00Z'),
          },
          {
            id: 'NOTE-03',
            type: 'Bug Fix Attempt',
            content: 'Note 3',
            created_at: new Date('2025-12-31T12:00:00Z'),
            updated_at: new Date('2025-12-31T12:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      expect(badge).toHaveAttribute('aria-label');
      // aria-label should contain both "3 notes" and type breakdown
      expect(badge?.getAttribute('aria-label')).toContain('3 notes');
      expect(badge?.getAttribute('aria-label')).toContain('General');
      expect(badge?.getAttribute('aria-label')).toContain('Bug Fix Attempt');
    });

    it('note count badge aria-label handles single type correctly', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Note 1',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
          {
            id: 'NOTE-02',
            type: 'General',
            content: 'Note 2',
            created_at: new Date('2025-12-31T11:00:00Z'),
            updated_at: new Date('2025-12-31T11:00:00Z'),
          },
          {
            id: 'NOTE-03',
            type: 'General',
            content: 'Note 3',
            created_at: new Date('2025-12-31T12:00:00Z'),
            updated_at: new Date('2025-12-31T12:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      expect(badge).toHaveAttribute('aria-label');
      // For single type, it should say "3 General notes"
      expect(badge?.getAttribute('aria-label')).toMatch(/3 General notes/);
    });

    it('note count badge aria-label handles single note correctly', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'Validation',
            content: 'Single note',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      expect(badge).toHaveAttribute('aria-label');
      // For single note, it should be "1 Validation note" (singular)
      expect(badge?.getAttribute('aria-label')).toMatch(/1 Validation note$/);
    });

    it('note count badge has correct CSS class', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Note 1',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      expect(badge).toHaveClass('note-count-badge');
    });

    it('note count badge contains an SVG note icon', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Note 1',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      const badge = container.querySelector('.note-count-badge');
      const svg = badge?.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('note count badge is positioned in the header row', () => {
      const item = createMockItem({
        notes: [
          {
            id: 'NOTE-01',
            type: 'General',
            content: 'Note 1',
            created_at: new Date('2025-12-31T10:00:00Z'),
            updated_at: new Date('2025-12-31T10:00:00Z'),
          },
        ],
      });
      const { container } = render(<ItemCard item={item} onCopyId={vi.fn()} />);

      // Badge should be inside the viewer-item-id-row
      const idRow = container.querySelector('.viewer-item-id-row');
      const badge = idRow?.querySelector('.note-count-badge');
      expect(badge).toBeInTheDocument();
    });
  });
});
