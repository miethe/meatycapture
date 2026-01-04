/**
 * Item CRUD Integration Tests
 *
 * End-to-end integration tests for the full Item CRUD workflow.
 * Tests the complete flow from ItemCard edit/delete buttons through
 * hooks (useItemEdit, useItemDelete) to mock DocStore persistence.
 *
 * Test Coverage:
 * 1. Load document with items - verify items render correctly
 * 2. Edit item workflow - open modal, modify, save, verify modified_at
 * 3. Delete item workflow - confirmation dialog, deletion, verify removal
 * 4. Modified items persist correctly - DocStore write called with updated data
 * 5. Error handling - network failures, validation errors
 * 6. Integration with all DocStore adapters (mocked)
 */

import React, { useState, useCallback } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { RequestLogDoc, RequestLogItem } from '@core/models';
import { ItemCard } from '../ItemCard';
import { ItemEditForm } from '../ItemEditForm';
import { useItemEdit } from '../hooks/useItemEdit';
import { useItemDelete } from '../hooks/useItemDelete';
import { EditModal } from '@ui/shared/EditModal';
import { ConfirmationDialog } from '@ui/shared/ConfirmationDialog';
import { ToastProvider, useToast } from '@ui/shared/useToast';
import { Toast } from '@ui/shared/Toast';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Mock DocStore interface for testing
 * Simulates the DocStore port from core/ports
 */
interface MockDocStore {
  read: (path: string) => Promise<RequestLogDoc>;
  write: (path: string, doc: RequestLogDoc) => Promise<void>;
  updateItem: (path: string, item: RequestLogItem) => Promise<void>;
  deleteItem: (path: string, itemId: string) => Promise<void>;
}

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create a mock RequestLogItem for testing
 */
function createMockItem(overrides: Partial<RequestLogItem> = {}): RequestLogItem {
  return {
    id: 'REQ-20251231-test-01',
    title: 'Test Item Title',
    type: 'enhancement',
    domain: ['web'],
    context: ['frontend'],
    priority: 'medium',
    status: 'triage',
    tags: ['ux', 'api'],
    notes: [],
    created_at: new Date('2025-12-31T10:00:00Z'),
    ...overrides,
  };
}

/**
 * Create a mock RequestLogDoc with multiple items
 */
function createMockDocument(overrides: Partial<RequestLogDoc> = {}): RequestLogDoc {
  const items = overrides.items || [
    createMockItem({ id: 'REQ-20251231-test-01', title: 'First Item' }),
    createMockItem({
      id: 'REQ-20251231-test-02',
      title: 'Second Item',
      type: 'bug',
      priority: 'high',
    }),
    createMockItem({
      id: 'REQ-20251231-test-03',
      title: 'Third Item',
      type: 'idea',
      status: 'backlog',
    }),
  ];

  return {
    doc_id: 'REQ-20251231-test',
    title: 'Test Document',
    project_id: 'test-project',
    items,
    items_index: items.map((i) => ({ id: i.id, type: i.type, title: i.title })),
    tags: [...new Set(items.flatMap((i) => i.tags))].sort(),
    item_count: items.length,
    created_at: new Date('2025-12-31T09:00:00Z'),
    updated_at: new Date('2025-12-31T12:00:00Z'),
    archived: false,
    ...overrides,
  };
}

/**
 * Default field options for edit form
 */
const defaultFieldOptions = {
  type: ['enhancement', 'bug', 'idea', 'task', 'question'],
  domain: ['web', 'api', 'mobile', 'backend'],
  context: ['frontend', 'backend', 'infrastructure'],
  priority: ['low', 'medium', 'high', 'critical'],
  status: ['triage', 'backlog', 'planned', 'in-progress', 'done', 'wontfix'],
  tags: ['ux', 'api', 'performance', 'security'],
};

// ============================================================================
// Test Wrapper Components
// ============================================================================

/**
 * Wrapper component with ToastProvider for hook tests
 */
function TestWrapper({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <ToastProvider>
      {children}
      <ToastRenderer />
    </ToastProvider>
  );
}

/**
 * Toast renderer component to display toasts in tests
 */
function ToastRenderer(): React.JSX.Element {
  const { toasts, dismissToast } = useToast();
  return (
    <div data-testid="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

// ============================================================================
// Integration Test Component
// ============================================================================

interface ItemCRUDTestHarnessProps {
  initialDocument: RequestLogDoc;
  docStore: MockDocStore;
  documentPath: string;
}

/**
 * Test harness component that integrates:
 * - Document with items display
 * - ItemCard with edit/delete buttons
 * - useItemEdit hook with EditModal and ItemEditForm
 * - useItemDelete hook with ConfirmationDialog
 * - DocStore mock for persistence
 */
function ItemCRUDTestHarness({
  initialDocument,
  docStore,
  documentPath,
}: ItemCRUDTestHarnessProps): React.JSX.Element {
  const [document, setDocument] = useState<RequestLogDoc>(initialDocument);

  // Handler for item update - calls DocStore and updates local state
  const handleItemUpdated = useCallback(
    async (updatedItem: RequestLogItem) => {
      // Call mock DocStore
      await docStore.updateItem(documentPath, updatedItem);

      // Update local document state
      setDocument((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        items_index: prev.items_index.map((entry) =>
          entry.id === updatedItem.id
            ? { id: updatedItem.id, type: updatedItem.type, title: updatedItem.title }
            : entry
        ),
        updated_at: new Date(),
      }));
    },
    [docStore, documentPath]
  );

  // Handler for item delete - calls DocStore and updates local state
  const handleItemDeleted = useCallback(
    async (itemId: string) => {
      // Call mock DocStore
      await docStore.deleteItem(documentPath, itemId);

      // Update local document state
      setDocument((prev) => {
        const newItems = prev.items.filter((item) => item.id !== itemId);
        return {
          ...prev,
          items: newItems,
          items_index: prev.items_index.filter((entry) => entry.id !== itemId),
          item_count: newItems.length,
          tags: [...new Set(newItems.flatMap((i) => i.tags))].sort(),
          updated_at: new Date(),
        };
      });
    },
    [docStore, documentPath]
  );

  // Use edit and delete hooks
  const { requestEdit, modalProps, formProps } = useItemEdit(
    handleItemUpdated,
    defaultFieldOptions
  );

  const { requestDelete, dialogProps } = useItemDelete(handleItemDeleted);

  // Handler for copy ID
  const handleCopyId = useCallback((id: string) => {
    console.info(`[Test] Copied item ID: ${id}`);
  }, []);

  return (
    <div data-testid="item-crud-harness">
      {/* Document header */}
      <div data-testid="document-header">
        <h2>{document.title}</h2>
        <span data-testid="item-count">{document.item_count} items</span>
        <span data-testid="updated-at">{document.updated_at.toISOString()}</span>
      </div>

      {/* Item list */}
      <div data-testid="item-list" role="list">
        {document.items.map((item) => (
          <div key={item.id} role="listitem" data-testid={`item-${item.id}`}>
            <ItemCard
              item={item}
              onCopyId={handleCopyId}
              onEdit={requestEdit}
              onDelete={requestDelete}
            />
          </div>
        ))}
      </div>

      {/* Edit Modal with Form */}
      <EditModal
        isOpen={modalProps.isOpen}
        title={modalProps.title}
        onClose={modalProps.onClose}
        onSave={modalProps.onSave}
        isSaving={modalProps.isSaving}
        saveDisabled={modalProps.saveDisabled}
      >
        {formProps && (
          <ItemEditForm
            item={formProps.item}
            fieldOptions={defaultFieldOptions}
            onSave={formProps.onSave}
            onCancel={formProps.onCancel}
            isSaving={formProps.isSaving}
          />
        )}
      </EditModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog {...dialogProps} />
    </div>
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('ItemCRUD Integration Tests', () => {
  let mockDocStore: MockDocStore;

  beforeEach(() => {
    // Create mock DocStore with default implementations
    mockDocStore = {
      read: vi.fn().mockResolvedValue(createMockDocument()),
      write: vi.fn().mockResolvedValue(undefined),
      updateItem: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. Load Document with Items
  // ==========================================================================

  describe('1. Load document with items', () => {
    it('renders all items from the document', () => {
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Verify all items are rendered
      expect(screen.getByTestId('item-REQ-20251231-test-01')).toBeInTheDocument();
      expect(screen.getByTestId('item-REQ-20251231-test-02')).toBeInTheDocument();
      expect(screen.getByTestId('item-REQ-20251231-test-03')).toBeInTheDocument();

      // Verify item count
      expect(screen.getByTestId('item-count')).toHaveTextContent('3 items');
    });

    it('renders item details correctly', () => {
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Check first item details
      expect(screen.getByRole('heading', { name: 'First Item' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Second Item' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Third Item' })).toBeInTheDocument();
    });

    it('displays edit and delete buttons on each item', () => {
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Each item should have edit and delete buttons
      const editButtons = screen.getAllByRole('button', { name: /edit item/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete item/i });

      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });

    it('handles empty document gracefully', () => {
      const document = createMockDocument({ items: [] });

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('item-count')).toHaveTextContent('0 items');
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 2. Edit Item Workflow
  // ==========================================================================

  describe('2. Edit item workflow', () => {
    it('opens edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit on first item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      // Modal should be open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modal should have correct title
      expect(screen.getByText('Edit: First Item')).toBeInTheDocument();
    });

    it('populates form with current item values', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit on first item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Form should have current values
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue('First Item');
    });

    it('saves changes and updates modified_at', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();
      const beforeSave = Date.now();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit on first item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Change the title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      // Click save in the form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // DocStore should be called with updated item
      await waitFor(() => {
        expect(mockDocStore.updateItem).toHaveBeenCalledTimes(1);
      });

      const callArgs = (mockDocStore.updateItem as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(callArgs[0]).toBe('/test/path/doc.md');
      expect(callArgs[1]).toMatchObject({
        id: 'REQ-20251231-test-01',
        title: 'Updated Title',
      });

      // modified_at should be set to a recent time
      const afterSave = Date.now();
      const modifiedAt = new Date(callArgs[1].modified_at).getTime();
      expect(modifiedAt).toBeGreaterThanOrEqual(beforeSave);
      expect(modifiedAt).toBeLessThanOrEqual(afterSave);
    });

    it('closes modal after successful save', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('shows success toast after save', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Wait for toast
      await waitFor(() => {
        const toastContainer = screen.getByTestId('toast-container');
        expect(toastContainer).toHaveTextContent(/item updated/i);
      });
    });

    it('updates document state after edit', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit first item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Change title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Item should show new title in the list
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Updated Title' })).toBeInTheDocument();
      });
    });

    it('cancels edit without saving', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Change title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Changed Title');

      // Click cancel in form
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      const cancelButton = cancelButtons[0]!;
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore should NOT be called
      expect(mockDocStore.updateItem).not.toHaveBeenCalled();

      // Original title should still be shown
      expect(screen.getByRole('heading', { name: 'First Item' })).toBeInTheDocument();
    });

    it('validates required fields before save', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click edit
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Clear title (required field)
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Error should be shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/title is required/i);
      });

      // DocStore should NOT be called
      expect(mockDocStore.updateItem).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 3. Delete Item Workflow
  // ==========================================================================

  describe('3. Delete item workflow', () => {
    it('opens confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click delete on first item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      // Confirmation dialog should be open
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      // Dialog should mention the item ID
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/REQ-20251231-test-01/i)).toBeInTheDocument();
    });

    it('confirms deletion and removes item', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click delete on first item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // DocStore should be called
      await waitFor(() => {
        expect(mockDocStore.deleteItem).toHaveBeenCalledTimes(1);
        expect(mockDocStore.deleteItem).toHaveBeenCalledWith(
          '/test/path/doc.md',
          'REQ-20251231-test-01'
        );
      });
    });

    it('closes dialog after successful deletion', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Delete first item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('shows success toast after deletion', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Delete first item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Success toast should appear
      await waitFor(() => {
        const toastContainer = screen.getByTestId('toast-container');
        expect(toastContainer).toHaveTextContent(/item deleted/i);
      });
    });

    it('updates document state after deletion', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Verify initial state
      expect(screen.getByTestId('item-count')).toHaveTextContent('3 items');
      expect(screen.getByTestId('item-REQ-20251231-test-01')).toBeInTheDocument();

      // Delete first item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Wait for dialog to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Item should be removed from list
      await waitFor(() => {
        expect(screen.queryByTestId('item-REQ-20251231-test-01')).not.toBeInTheDocument();
      });

      // Item count should update
      expect(screen.getByTestId('item-count')).toHaveTextContent('2 items');
    });

    it('cancels deletion without removing item', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Click delete
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      const cancelButton = cancelButtons[0]!;
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore should NOT be called
      expect(mockDocStore.deleteItem).not.toHaveBeenCalled();

      // Item should still be present
      expect(screen.getByTestId('item-REQ-20251231-test-01')).toBeInTheDocument();
      expect(screen.getByTestId('item-count')).toHaveTextContent('3 items');
    });
  });

  // ==========================================================================
  // 4. Persistence and DocStore Integration
  // ==========================================================================

  describe('4. Modified items persist correctly', () => {
    it('calls DocStore.updateItem with full item data', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit first item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Change title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDocStore.updateItem).toHaveBeenCalled();
      });

      // Verify the call includes all item fields
      const updatedItem = (mockDocStore.updateItem as ReturnType<typeof vi.fn>).mock.calls[0]![1];
      expect(updatedItem).toMatchObject({
        id: 'REQ-20251231-test-01',
        title: 'New Title',
        type: expect.any(String),
        domain: expect.any(Array),
        context: expect.any(Array),
        priority: expect.any(String),
        status: expect.any(String),
        tags: expect.any(Array),
        notes: expect.any(Array),
        created_at: expect.any(Date),
        modified_at: expect.any(Date),
      });
    });

    it('calls DocStore.deleteItem with correct path and ID', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/custom/path/document.md"
          />
        </TestWrapper>
      );

      // Delete second item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-02/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDocStore.deleteItem).toHaveBeenCalledWith(
          '/custom/path/document.md',
          'REQ-20251231-test-02'
        );
      });
    });

    it('preserves original created_at when editing', async () => {
      const user = userEvent.setup();
      const originalCreatedAt = new Date('2025-06-15T08:30:00Z');
      const items = [createMockItem({ id: 'REQ-test-01', created_at: originalCreatedAt })];
      const document = createMockDocument({ items });

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit item
      const editButton = screen.getByRole('button', { name: /edit item REQ-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Save without changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockDocStore.updateItem).toHaveBeenCalled();
      });

      // created_at should be preserved
      const updatedItem = (mockDocStore.updateItem as ReturnType<typeof vi.fn>).mock.calls[0]![1];
      expect(updatedItem.created_at).toEqual(originalCreatedAt);

      // modified_at should be present
      expect(updatedItem.modified_at).toBeDefined();
    });
  });

  // ==========================================================================
  // 5. Error Handling
  // ==========================================================================

  describe('5. Error handling', () => {
    it('shows error toast when save fails', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      // Make updateItem fail
      (mockDocStore.updateItem as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error: Failed to save')
      );

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Error toast should appear
      await waitFor(() => {
        const toastContainer = screen.getByTestId('toast-container');
        expect(toastContainer).toHaveTextContent(/Network error|Failed to update/i);
      });

      // Modal should stay open for retry
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('shows error toast when delete fails', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      // Make deleteItem fail
      (mockDocStore.deleteItem as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Permission denied')
      );

      // Suppress console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Delete item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Error toast should appear
      await waitFor(() => {
        const toastContainer = screen.getByTestId('toast-container');
        expect(toastContainer).toHaveTextContent(/Permission denied|Failed to delete/i);
      });

      // Dialog should stay open for retry
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Item should NOT be removed from state
      expect(screen.getByTestId('item-REQ-20251231-test-01')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('keeps modal open on save failure for retry', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      // First call fails, second succeeds
      (mockDocStore.updateItem as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(undefined);

      // Suppress console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // First save attempt (fails)
      let saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Wait for error
      await waitFor(() => {
        expect(mockDocStore.updateItem).toHaveBeenCalledTimes(1);
      });

      // Modal should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Second save attempt (succeeds)
      saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Modal should close after success
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(mockDocStore.updateItem).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // 6. Keyboard and Accessibility
  // ==========================================================================

  describe('6. Keyboard and accessibility', () => {
    it('closes edit modal with Escape key', async () => {
      const user = userEvent.setup();
      const document = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={document}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Open edit modal
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore should NOT be called
      expect(mockDocStore.updateItem).not.toHaveBeenCalled();
    });

    it('closes delete dialog with Escape key', async () => {
      const user = userEvent.setup();
      const doc = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={doc}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Open delete dialog
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore should NOT be called
      expect(mockDocStore.deleteItem).not.toHaveBeenCalled();
    });

    it('edit and delete buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      const doc = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={doc}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Find and focus edit button
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      editButton.focus();
      await user.keyboard('{Enter}');

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Now test delete button with Space key
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-01/i,
      });
      deleteButton.focus();
      await user.keyboard(' ');

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('dialogs have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      const doc = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={doc}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Open edit modal
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby');
      });
    });
  });

  // ==========================================================================
  // 7. Sequential Operations
  // ==========================================================================

  describe('7. Sequential operations', () => {
    it('can edit multiple items sequentially', async () => {
      const user = userEvent.setup();
      const doc = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={doc}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit first item
      const editButton1 = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton1);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'First Updated');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Edit second item
      const editButton2 = screen.getByRole('button', { name: /edit item REQ-20251231-test-02/i });
      await user.click(editButton2);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const titleInput2 = screen.getByLabelText(/title/i);
      await user.clear(titleInput2);
      await user.type(titleInput2, 'Second Updated');

      const saveButton2 = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton2);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Both updates should have been called
      expect(mockDocStore.updateItem).toHaveBeenCalledTimes(2);

      // Both items should be updated in UI
      expect(screen.getByRole('heading', { name: 'First Updated' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Second Updated' })).toBeInTheDocument();
    });

    it('can delete multiple items sequentially', async () => {
      const user = userEvent.setup();
      const doc = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={doc}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Verify initial state
      expect(screen.getByTestId('item-count')).toHaveTextContent('3 items');

      // Delete first item
      let deleteButton = screen.getByRole('button', { name: /delete item REQ-20251231-test-01/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      let confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('item-count')).toHaveTextContent('2 items');

      // Delete second item
      deleteButton = screen.getByRole('button', { name: /delete item REQ-20251231-test-02/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(screen.getByTestId('item-count')).toHaveTextContent('1 items');

      // Both deletes should have been called
      expect(mockDocStore.deleteItem).toHaveBeenCalledTimes(2);
    });

    it('can mix edit and delete operations', async () => {
      const user = userEvent.setup();
      const doc = createMockDocument();

      render(
        <TestWrapper>
          <ItemCRUDTestHarness
            initialDocument={doc}
            docStore={mockDocStore}
            documentPath="/test/path/doc.md"
          />
        </TestWrapper>
      );

      // Edit first item
      const editButton = screen.getByRole('button', { name: /edit item REQ-20251231-test-01/i });
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Edited Item');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Delete second item
      const deleteButton = screen.getByRole('button', {
        name: /delete item REQ-20251231-test-02/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify final state
      expect(screen.getByRole('heading', { name: 'Edited Item' })).toBeInTheDocument();
      expect(screen.queryByTestId('item-REQ-20251231-test-02')).not.toBeInTheDocument();
      expect(screen.getByTestId('item-count')).toHaveTextContent('2 items');

      expect(mockDocStore.updateItem).toHaveBeenCalledTimes(1);
      expect(mockDocStore.deleteItem).toHaveBeenCalledTimes(1);
    });
  });
});
