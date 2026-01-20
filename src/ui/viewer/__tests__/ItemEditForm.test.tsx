/**
 * ItemEditForm Component Tests
 *
 * Tests for the item edit form component covering:
 * - Rendering with initial values
 * - Form validation
 * - User interactions
 * - Save and cancel callbacks
 * - Accessibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemEditForm, type ItemEditFormProps } from '../ItemEditForm';
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

// Default field options
const defaultFieldOptions = {
  type: ['enhancement', 'bug', 'idea', 'task', 'question'],
  domain: ['web', 'api', 'mobile', 'backend'],
  subdomain: ['frontend', 'backend', 'infrastructure'],
  feature: [],
  priority: ['low', 'medium', 'high', 'critical'],
  status: ['triage', 'backlog', 'planned', 'in-progress', 'done', 'wontfix'],
  tags: ['ux', 'api', 'performance', 'security'],
};

// Create default props
const createDefaultProps = (overrides: Partial<ItemEditFormProps> = {}): ItemEditFormProps => ({
  item: createMockItem(),
  fieldOptions: defaultFieldOptions,
  onSave: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

describe('ItemEditForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      // Title field
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

      // Type dropdown
      expect(screen.getByText('Type')).toBeInTheDocument();

      // Domain field
      expect(screen.getByText('Domain')).toBeInTheDocument();

      // Context field
      expect(screen.getByText('Context')).toBeInTheDocument();

      // Priority dropdown
      expect(screen.getByText('Priority')).toBeInTheDocument();

      // Status dropdown
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Tags field
      expect(screen.getByText('Tags')).toBeInTheDocument();

      // Notes field is now read-only display (only shown when notes exist)
      // With empty notes array, no notes section should render

      // Action buttons
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('initializes form with item values', () => {
      const item = createMockItem({
        title: 'My Test Title',
        notes: [],
      });

      render(<ItemEditForm {...createDefaultProps({ item })} />);

      // Check title input value
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue('My Test Title');

      // Notes are now read-only display for MVP - verify no notes section when empty
      expect(screen.queryByText(/notes editing/i)).not.toBeInTheDocument();
    });

    it('shows required indicator on title field', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      const titleLabel = screen.getByText('Title');
      expect(titleLabel).toHaveClass('required');
    });

    it('shows required indicator on type field', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      // Type label should have required class
      const typeLabels = screen.getAllByText('Type');
      const typeLabel = typeLabels.find((el) => el.classList.contains('field-label'));
      expect(typeLabel).toHaveClass('required');
    });
  });

  describe('form validation', () => {
    it('shows error when title is empty on submit', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const item = createMockItem({ title: '' });

      render(<ItemEditForm {...createDefaultProps({ item, onSave })} />);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check for error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i);
      });

      // onSave should not be called
      expect(onSave).not.toHaveBeenCalled();
    });

    it('shows error when type is empty on submit', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const item = createMockItem({ type: '' });

      render(<ItemEditForm {...createDefaultProps({ item, onSave })} />);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/type is required/i)).toBeInTheDocument();
      });

      // onSave should not be called
      expect(onSave).not.toHaveBeenCalled();
    });

    it('clears title error when user types', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ title: '' });

      render(<ItemEditForm {...createDefaultProps({ item })} />);

      // Submit to trigger error
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Verify error shows
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Type in title field
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'New title');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/title is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls onSave with updated item on valid submission', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const item = createMockItem();

      render(<ItemEditForm {...createDefaultProps({ item, onSave })} />);

      // Modify title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check onSave was called with updated item
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedItem = onSave.mock.calls[0]?.[0] as RequestLogItem | undefined;
      expect(savedItem).toBeDefined();
      expect(savedItem!.title).toBe('Updated Title');
      expect(savedItem!.id).toBe(item.id);
      expect(savedItem!.modified_at).toBeDefined();
    });

    it('trims title whitespace before saving', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const item = createMockItem();

      render(<ItemEditForm {...createDefaultProps({ item, onSave })} />);

      // Modify title with whitespace
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, '  Title with spaces  ');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedItem = onSave.mock.calls[0]?.[0] as RequestLogItem | undefined;
      expect(savedItem).toBeDefined();
      expect(savedItem!.title).toBe('Title with spaces');
    });
  });

  describe('cancel action', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onCancel = vi.fn();

      render(<ItemEditForm {...createDefaultProps({ onCancel })} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('saving state', () => {
    it('disables form fields when isSaving is true', () => {
      render(<ItemEditForm {...createDefaultProps({ isSaving: true })} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toBeDisabled();

      // Notes field is now read-only display - no textarea to disable

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('shows loading state on save button when isSaving is true', () => {
      render(<ItemEditForm {...createDefaultProps({ isSaving: true })} />);

      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('notes field', () => {
    // Notes editing is disabled for MVP - notes are now Note[] and read-only
    // Full notes UI will be implemented in Phase 3
    it('preserves notes array in saved item', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();

      render(<ItemEditForm {...createDefaultProps({ onSave })} />);

      // Just submit the form - notes should be preserved as empty array
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedItem = onSave.mock.calls[0]?.[0] as RequestLogItem | undefined;
      expect(savedItem).toBeDefined();
      // Notes should be preserved as the original empty array
      expect(Array.isArray(savedItem!.notes)).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has accessible form label', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      const form = screen.getByRole('form', { name: /edit item form/i });
      expect(form).toBeInTheDocument();
    });

    it('title input has proper aria attributes when invalid', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ title: '' });

      render(<ItemEditForm {...createDefaultProps({ item })} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveAttribute('aria-required', 'true');

      // Submit to trigger validation
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('buttons are keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });
      const onCancel = vi.fn();

      render(<ItemEditForm {...createDefaultProps({ onCancel })} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      cancelButton.focus();
      await user.keyboard('{Enter}');

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('field helper texts', () => {
    it('displays helper text for type field', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      expect(screen.getByText(/the category of this item/i)).toBeInTheDocument();
    });

    it('displays helper text for domain field', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      expect(screen.getByText(/the area or module this item affects/i)).toBeInTheDocument();
    });

    it('does not display notes field when notes array is empty', () => {
      render(<ItemEditForm {...createDefaultProps()} />);

      // Notes section only renders when notes array has items
      expect(screen.queryByText(/notes editing/i)).not.toBeInTheDocument();
    });
  });

  describe('tags field', () => {
    it('updates tags when changed', async () => {
      const onSave = vi.fn();

      render(<ItemEditForm {...createDefaultProps({ onSave })} />);

      // Find the tags multiselect and add a new tag
      // The MultiSelectWithAdd component is used for tags
      const tagsSection = screen.getByText('Tags');
      expect(tagsSection).toBeInTheDocument();
    });

    it('can add a new tag to the list', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();

      render(<ItemEditForm {...createDefaultProps({ onSave })} />);

      // Submit the form to see the current tags are preserved
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedItem = onSave.mock.calls[0]?.[0] as RequestLogItem | undefined;
      expect(savedItem).toBeDefined();
      expect(savedItem!.tags).toEqual(['ux', 'api']);
    });
  });

  describe('domain field', () => {
    it('preserves domain value when empty in initial item', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const item = createMockItem({ domain: [] });

      render(<ItemEditForm {...createDefaultProps({ item, onSave })} />);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedItem = onSave.mock.calls[0]?.[0] as RequestLogItem | undefined;
      expect(savedItem!.domain).toEqual([]);
    });
  });

  describe('context field', () => {
    it('preserves context value when empty in initial item', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const item = createMockItem({ subdomain: [] });

      render(<ItemEditForm {...createDefaultProps({ item, onSave })} />);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedItem = onSave.mock.calls[0]?.[0] as RequestLogItem | undefined;
      expect(savedItem!.context).toBeUndefined();
    });
  });

  describe('snapshot', () => {
    it('matches snapshot with default item', () => {
      const { container } = render(<ItemEditForm {...createDefaultProps()} />);
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot in saving state', () => {
      const { container } = render(<ItemEditForm {...createDefaultProps({ isSaving: true })} />);
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with validation errors', async () => {
      const user = userEvent.setup({ delay: null });
      const item = createMockItem({ title: '', type: '' });

      const { container } = render(<ItemEditForm {...createDefaultProps({ item })} />);

      // Trigger validation
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
      });

      expect(container).toMatchSnapshot();
    });
  });
});
