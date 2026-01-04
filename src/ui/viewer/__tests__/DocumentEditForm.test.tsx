/**
 * DocumentEditForm Component Tests
 *
 * Tests for the document edit form component covering:
 * - Rendering with initial values
 * - Form validation
 * - User interactions
 * - Save and cancel callbacks
 * - Accessibility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentEditForm, type DocumentEditFormProps } from '../DocumentEditForm';
import type { RequestLogDoc } from '@core/models';

// Mock document for testing
const createMockDoc = (
  overrides: Partial<RequestLogDoc & { description?: string }> = {}
): RequestLogDoc => ({
  doc_id: 'REQ-20251231-test',
  title: 'Test Document Title',
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

// Create default props
const createDefaultProps = (
  overrides: Partial<DocumentEditFormProps> = {}
): DocumentEditFormProps => ({
  doc: createMockDoc(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  ...overrides,
});

describe('DocumentEditForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      // Title field
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

      // Description field
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();

      // Action buttons
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('initializes form with document values', () => {
      const doc = createMockDoc({
        title: 'My Test Document',
      });

      render(<DocumentEditForm {...createDefaultProps({ doc })} />);

      // Check title input value
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue('My Test Document');
    });

    it('initializes description from extended property', () => {
      const doc = createMockDoc({
        description: 'Test description content',
      } as Partial<RequestLogDoc & { description?: string }>);

      render(<DocumentEditForm {...createDefaultProps({ doc })} />);

      const descriptionTextarea = screen.getByLabelText(/description/i);
      expect(descriptionTextarea).toHaveValue('Test description content');
    });

    it('shows required indicator on title field', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      const titleLabel = screen.getByText('Title');
      expect(titleLabel).toHaveClass('required');
    });

    it('does not show required indicator on description field', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      const descriptionLabel = screen.getByText('Description');
      expect(descriptionLabel).not.toHaveClass('required');
    });

    it('displays helper text for title field', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      expect(screen.getByText(/the document title displayed in the catalog/i)).toBeInTheDocument();
    });

    it('displays helper text for description field', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      expect(
        screen.getByText(/optional notes or description for this document/i)
      ).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows error when title is empty on submit', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc({ title: '' });

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

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

    it('shows error when title contains only whitespace', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc({ title: '   ' });

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

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

    it('clears title error when user types', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDoc({ title: '' });

      render(<DocumentEditForm {...createDefaultProps({ doc })} />);

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
    it('calls onSave with updated document on valid submission', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc();

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

      // Modify title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Document Title');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Check onSave was called with updated document
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedDoc = onSave.mock.calls[0]?.[0] as RequestLogDoc | undefined;
      expect(savedDoc).toBeDefined();
      expect(savedDoc!.title).toBe('Updated Document Title');
      expect(savedDoc!.doc_id).toBe(doc.doc_id);
      expect(savedDoc!.updated_at).toBeDefined();
    });

    it('trims title whitespace before saving', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc();

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

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

      const savedDoc = onSave.mock.calls[0]?.[0] as RequestLogDoc | undefined;
      expect(savedDoc).toBeDefined();
      expect(savedDoc!.title).toBe('Title with spaces');
    });

    it('includes description in saved document when provided', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc();

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

      // Add description
      const descriptionTextarea = screen.getByLabelText(/description/i);
      await user.type(descriptionTextarea, 'This is a test description');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedDoc = onSave.mock.calls[0]?.[0] as
        | (RequestLogDoc & { description?: string })
        | undefined;
      expect(savedDoc).toBeDefined();
      expect(savedDoc!.description).toBe('This is a test description');
    });

    it('does not include description when empty', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc();

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

      // Submit form without adding description
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedDoc = onSave.mock.calls[0]?.[0] as
        | (RequestLogDoc & { description?: string })
        | undefined;
      expect(savedDoc).toBeDefined();
      expect(savedDoc!.description).toBeUndefined();
    });

    it('trims description whitespace before saving', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc();

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

      // Add description with whitespace
      const descriptionTextarea = screen.getByLabelText(/description/i);
      await user.type(descriptionTextarea, '  Description with spaces  ');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedDoc = onSave.mock.calls[0]?.[0] as
        | (RequestLogDoc & { description?: string })
        | undefined;
      expect(savedDoc).toBeDefined();
      expect(savedDoc!.description).toBe('Description with spaces');
    });

    it('updates modified_at timestamp on save', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const originalDate = new Date('2025-12-31T10:00:00Z');
      const doc = createMockDoc({ updated_at: originalDate });

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      const savedDoc = onSave.mock.calls[0]?.[0] as RequestLogDoc | undefined;
      expect(savedDoc).toBeDefined();
      expect(savedDoc!.updated_at).not.toEqual(originalDate);
    });
  });

  describe('cancel action', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onCancel = vi.fn();

      render(<DocumentEditForm {...createDefaultProps({ onCancel })} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onSave when cancel button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(<DocumentEditForm {...createDefaultProps({ onSave, onCancel })} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('saving state', () => {
    it('disables form fields when isSaving is true', () => {
      render(<DocumentEditForm {...createDefaultProps({ isSaving: true })} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toBeDisabled();

      const descriptionTextarea = screen.getByLabelText(/description/i);
      expect(descriptionTextarea).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('shows loading state on save button when isSaving is true', () => {
      render(<DocumentEditForm {...createDefaultProps({ isSaving: true })} />);

      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('description field', () => {
    it('updates description value on change', async () => {
      const user = userEvent.setup({ delay: null });

      render(<DocumentEditForm {...createDefaultProps()} />);

      const descriptionTextarea = screen.getByLabelText(/description/i);
      await user.type(descriptionTextarea, 'Updated description content');

      expect(descriptionTextarea).toHaveValue('Updated description content');
    });

    it('allows empty description', async () => {
      const user = userEvent.setup({ delay: null });
      const onSave = vi.fn();
      const doc = createMockDoc({
        description: 'Existing description',
      } as Partial<RequestLogDoc & { description?: string }>);

      render(<DocumentEditForm {...createDefaultProps({ doc, onSave })} />);

      // Clear description
      const descriptionTextarea = screen.getByLabelText(/description/i);
      await user.clear(descriptionTextarea);

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
      });

      // Description should not be included when empty
      const savedDoc = onSave.mock.calls[0]?.[0] as
        | (RequestLogDoc & { description?: string })
        | undefined;
      expect(savedDoc!.description).toBeUndefined();
    });
  });

  describe('accessibility', () => {
    it('has accessible form label', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      const form = screen.getByRole('form', { name: /edit document form/i });
      expect(form).toBeInTheDocument();
    });

    it('title input has proper aria attributes when invalid', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDoc({ title: '' });

      render(<DocumentEditForm {...createDefaultProps({ doc })} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveAttribute('aria-required', 'true');

      // Submit to trigger validation
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('title input has aria-describedby linking to helper and error', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDoc({ title: '' });

      render(<DocumentEditForm {...createDefaultProps({ doc })} />);

      const titleInput = screen.getByLabelText(/title/i);

      // Before validation error
      expect(titleInput.getAttribute('aria-describedby')).toContain('title-helper');

      // Trigger validation error
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // After validation error
      await waitFor(() => {
        const describedBy = titleInput.getAttribute('aria-describedby');
        expect(describedBy).toContain('title-error');
        expect(describedBy).toContain('title-helper');
      });
    });

    it('description textarea has aria-describedby linking to helper', () => {
      render(<DocumentEditForm {...createDefaultProps()} />);

      const descriptionTextarea = screen.getByLabelText(/description/i);
      expect(descriptionTextarea.getAttribute('aria-describedby')).toContain('description-helper');
    });

    it('buttons are keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });
      const onCancel = vi.fn();

      render(<DocumentEditForm {...createDefaultProps({ onCancel })} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      cancelButton.focus();
      await user.keyboard('{Enter}');

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshot', () => {
    it('matches snapshot with default document', () => {
      const { container } = render(<DocumentEditForm {...createDefaultProps()} />);
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot in saving state', () => {
      const { container } = render(
        <DocumentEditForm {...createDefaultProps({ isSaving: true })} />
      );
      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with validation errors', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDoc({ title: '' });

      const { container } = render(<DocumentEditForm {...createDefaultProps({ doc })} />);

      // Trigger validation
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });

    it('matches snapshot with description filled', () => {
      const doc = createMockDoc({
        title: 'Document with Description',
        description: 'This is a detailed description of the document.',
      } as Partial<RequestLogDoc & { description?: string }>);

      const { container } = render(<DocumentEditForm {...createDefaultProps({ doc })} />);
      expect(container).toMatchSnapshot();
    });
  });
});
