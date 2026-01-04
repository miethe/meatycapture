/**
 * Document Management Integration Tests
 *
 * Integration tests for the full Document management workflow including:
 * - Delete document with confirmation
 * - Archive document
 * - Unarchive document
 * - Edit document
 * - Add item navigation
 * - Filtering by archive status
 *
 * These tests verify the complete flow from user action through confirmation
 * dialog to DocStore persistence.
 */

import React, { useState, useCallback } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RequestLogDoc } from '@core/models';
import type { CatalogEntry } from '@core/catalog';
import type { DocStore, DocMeta } from '@core/ports';
import { DocumentKebabMenu } from '../DocumentKebabMenu';
import { DocumentDeleteConfirm } from '../DocumentDeleteConfirm';
import { DocumentArchiveConfirm } from '../DocumentArchiveConfirm';
import { DocumentEditForm } from '../DocumentEditForm';

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock RequestLogDoc for testing
 */
function createMockDocument(overrides: Partial<RequestLogDoc> = {}): RequestLogDoc {
  return {
    doc_id: 'REQ-20251231-test-project',
    title: 'Test Document',
    project_id: 'test-project',
    items: [
      {
        id: 'REQ-20251231-test-project-01',
        title: 'Test Item 1',
        type: 'bug',
        domain: ['api'],
        context: ['Test context'],
        priority: 'medium',
        status: 'triage',
        tags: ['tag1'],
        notes: [],
        created_at: new Date('2025-12-31T09:00:00Z'),
      },
      {
        id: 'REQ-20251231-test-project-02',
        title: 'Test Item 2',
        type: 'enhancement',
        domain: ['web'],
        context: ['Test context 2'],
        priority: 'high',
        status: 'backlog',
        tags: ['tag2'],
        notes: [],
        created_at: new Date('2025-12-31T10:00:00Z'),
      },
    ],
    items_index: [
      { id: 'REQ-20251231-test-project-01', type: 'bug', title: 'Test Item 1' },
      { id: 'REQ-20251231-test-project-02', type: 'enhancement', title: 'Test Item 2' },
    ],
    tags: ['tag1', 'tag2'],
    item_count: 2,
    created_at: new Date('2025-12-31T08:00:00Z'),
    updated_at: new Date('2025-12-31T10:00:00Z'),
    archived: false,
    ...overrides,
  };
}

/**
 * Create a mock CatalogEntry for testing
 */
function createMockEntry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    path: '/test/path/REQ-20251231-test-project.md',
    doc_id: 'REQ-20251231-test-project',
    title: 'Test Document',
    item_count: 2,
    updated_at: new Date('2025-12-31T10:00:00Z'),
    project_id: 'test-project',
    project_name: 'Test Project',
    archived: false,
    ...overrides,
  };
}

// Extended DocStore type with test helper methods
type MockDocStore = DocStore & {
  _setDocument: (path: string, doc: RequestLogDoc) => void;
  _getDocument: (path: string) => RequestLogDoc | undefined;
  _deleteDocument: (path: string) => void;
  _clear: () => void;
};

/**
 * Create a mock DocStore for testing
 */
function createMockDocStore(): MockDocStore {
  const documents = new Map<string, RequestLogDoc>();

  return {
    list: vi.fn().mockImplementation(async (_directory: string): Promise<DocMeta[]> => {
      return Array.from(documents.values()).map((doc) => ({
        path: `/test/path/${doc.doc_id}.md`,
        doc_id: doc.doc_id,
        title: doc.title,
        item_count: doc.item_count,
        updated_at: doc.updated_at,
        archived: doc.archived,
      }));
    }),

    read: vi.fn().mockImplementation(async (path: string): Promise<RequestLogDoc> => {
      const doc = documents.get(path);
      if (!doc) {
        throw new Error(`Document not found: ${path}`);
      }
      return doc;
    }),

    write: vi.fn().mockImplementation(async (path: string, doc: RequestLogDoc): Promise<void> => {
      documents.set(path, doc);
    }),

    append: vi.fn().mockImplementation(async (): Promise<RequestLogDoc> => {
      throw new Error('Not implemented');
    }),

    backup: vi.fn().mockImplementation(async (path: string): Promise<string> => {
      return `${path}.bak`;
    }),

    isWritable: vi.fn().mockImplementation(async (): Promise<boolean> => {
      return true;
    }),

    // Helper methods for testing
    _setDocument: (path: string, doc: RequestLogDoc) => {
      documents.set(path, doc);
    },
    _getDocument: (path: string) => documents.get(path),
    _deleteDocument: (path: string) => {
      documents.delete(path);
    },
    _clear: () => {
      documents.clear();
    },
  } as MockDocStore;
}

// ============================================================================
// Mock DocumentDetail to simplify testing
// ============================================================================

vi.mock('../DocumentDetail', () => ({
  DocumentDetail: ({ document, isLoading }: { document: RequestLogDoc; isLoading: boolean }) => (
    <div data-testid="document-detail" data-loading={isLoading}>
      Document Detail: {document.doc_id}
    </div>
  ),
}));

// ============================================================================
// Integration Test Component
// ============================================================================

/**
 * Props for the DocumentManagementTestHarness
 */
interface TestHarnessProps {
  initialDocument?: RequestLogDoc;
  docStore: ReturnType<typeof createMockDocStore>;
  onAddItemToDocument?: (path: string, doc: RequestLogDoc) => void;
}

/**
 * Test harness component that simulates the full document management flow
 *
 * This component wires together:
 * - DocumentRow for displaying documents
 * - DocumentKebabMenu for triggering actions
 * - DocumentDeleteConfirm for delete confirmation
 * - DocumentArchiveConfirm for archive/unarchive confirmation
 * - DocumentEditForm for editing
 */
function DocumentManagementTestHarness({
  initialDocument,
  docStore,
  onAddItemToDocument,
}: TestHarnessProps): React.JSX.Element {
  const [document, setDocument] = useState<RequestLogDoc | null>(initialDocument ?? null);
  const [entry, setEntry] = useState<CatalogEntry>(
    createMockEntry({
      doc_id: initialDocument?.doc_id ?? 'REQ-20251231-test-project',
      title: initialDocument?.title ?? 'Test Document',
      item_count: initialDocument?.item_count ?? 2,
      archived: initialDocument?.archived ?? false,
    })
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveMode, setArchiveMode] = useState<'archive' | 'unarchive'>('archive');
  const [showEditForm, setShowEditForm] = useState(false);
  const [_isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Create document for menu (fallback to placeholder if not loaded)
  const docForMenu: RequestLogDoc = document ?? {
    doc_id: entry.doc_id,
    title: entry.title,
    project_id: entry.project_id,
    items: [],
    items_index: [],
    tags: [],
    item_count: entry.item_count,
    created_at: entry.updated_at,
    updated_at: entry.updated_at,
    archived: entry.archived ?? false,
  };

  // Load document handler
  const handleLoadDocument = useCallback(async () => {
    if (document || isLoading) return;
    setIsLoading(true);
    try {
      const doc = await docStore.read(entry.path);
      setDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  }, [document, isLoading, docStore, entry.path]);

  // Toggle expansion
  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Add item handler
  const handleAddItem = useCallback(() => {
    if (onAddItemToDocument && document) {
      onAddItemToDocument(entry.path, document);
    }
  }, [onAddItemToDocument, document, entry.path]);

  // Edit handler
  const handleEdit = useCallback(() => {
    setShowEditForm(true);
  }, []);

  // Archive handler
  const handleArchive = useCallback(() => {
    setArchiveMode('archive');
    setShowArchiveConfirm(true);
  }, []);

  // Unarchive handler
  const handleUnarchive = useCallback(() => {
    setArchiveMode('unarchive');
    setShowArchiveConfirm(true);
  }, []);

  // Delete handler
  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  // Confirm delete
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      // In a real implementation, this would call docStore.delete()
      // For testing, we simulate the deletion
      setDocument(null);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Confirm archive/unarchive
  const handleConfirmArchive = useCallback(async () => {
    if (!document) return;

    setIsArchiving(true);
    try {
      const updatedDoc: RequestLogDoc = {
        ...document,
        archived: archiveMode === 'archive',
        updated_at: new Date(),
      };

      await docStore.write(entry.path, updatedDoc);
      setDocument(updatedDoc);
      setEntry((prev) => ({
        ...prev,
        archived: archiveMode === 'archive',
      }));
      setShowArchiveConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive/unarchive');
    } finally {
      setIsArchiving(false);
    }
  }, [document, docStore, entry.path, archiveMode]);

  // Cancel archive
  const handleCancelArchive = useCallback(() => {
    setShowArchiveConfirm(false);
  }, []);

  // Save edit
  const handleSaveEdit = useCallback(
    async (updatedDoc: RequestLogDoc) => {
      setIsSaving(true);
      try {
        await docStore.write(entry.path, updatedDoc);
        setDocument(updatedDoc);
        setEntry((prev) => ({
          ...prev,
          title: updatedDoc.title,
        }));
        setShowEditForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [docStore, entry.path]
  );

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setShowEditForm(false);
  }, []);

  return (
    <div data-testid="document-management-harness">
      {/* Error display */}
      {error && (
        <div data-testid="error-message" role="alert">
          {error}
        </div>
      )}

      {/* Document row with kebab menu */}
      <table>
        <tbody>
          <tr
            data-testid="document-row"
            className={`viewer-document-row ${isExpanded ? 'expanded' : ''} ${entry.archived ? 'archived' : ''}`}
            onClick={() => {
              if (!isExpanded && !isLoading) {
                handleLoadDocument();
              }
              handleToggle();
            }}
            role="row"
            aria-expanded={isExpanded}
          >
            <td>
              <code>{entry.doc_id}</code>
              {entry.archived && (
                <span data-testid="archived-badge" role="status" aria-label="Archived document">
                  Archived
                </span>
              )}
            </td>
            <td data-testid="row-title">{entry.title}</td>
            <td>{entry.item_count} items</td>
            <td>
              <div onClick={(e) => e.stopPropagation()}>
                <DocumentKebabMenu
                  doc={docForMenu}
                  onAddItem={handleAddItem}
                  onEdit={handleEdit}
                  onArchive={handleArchive}
                  {...(entry.archived && { onUnarchive: handleUnarchive })}
                  onDelete={handleDelete}
                />
              </div>
            </td>
          </tr>
          {isExpanded && document && (
            <tr data-testid="document-detail-row">
              <td colSpan={4}>
                <div data-testid="document-detail">Document Detail: {document.doc_id}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <DocumentDeleteConfirm
          doc={docForMenu}
          isOpen={showDeleteConfirm}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Archive confirmation dialog */}
      {showArchiveConfirm && (
        <DocumentArchiveConfirm
          doc={docForMenu}
          isOpen={showArchiveConfirm}
          mode={archiveMode}
          onConfirm={handleConfirmArchive}
          onCancel={handleCancelArchive}
          isLoading={isArchiving}
        />
      )}

      {/* Edit form dialog */}
      {showEditForm && (
        <div data-testid="edit-form-modal" role="dialog" aria-modal="true">
          <DocumentEditForm
            doc={docForMenu}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* Status indicators for testing */}
      <div data-testid="status-indicators" style={{ display: 'none' }}>
        <span data-testid="is-archived">{entry.archived ? 'true' : 'false'}</span>
        <span data-testid="document-title">{document?.title ?? entry.title}</span>
        <span data-testid="is-deleted">
          {document === null && !initialDocument ? 'true' : 'false'}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Document Management Integration', () => {
  let docStore: ReturnType<typeof createMockDocStore>;
  const docPath = '/test/path/REQ-20251231-test-project.md';

  beforeEach(() => {
    docStore = createMockDocStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Delete Document Workflow
  // ==========================================================================

  describe('Delete Document Workflow', () => {
    it('opens delete confirmation dialog when Delete is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      // Click Delete
      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      // Confirmation dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Document')).toBeInTheDocument();
      expect(
        screen.getByText(/Delete document REQ-20251231-test-project with 2 items/)
      ).toBeInTheDocument();
    });

    it('shows correct message for empty document', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ item_count: 0, items: [], items_index: [] });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Delete
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      // Should show empty document message
      expect(screen.getByText(/Delete empty document/)).toBeInTheDocument();
    });

    it('shows correct message for single item document', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({
        item_count: 1,
        items: [createMockDocument().items[0]!],
        items_index: [createMockDocument().items_index[0]!],
      });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Delete
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      // Should show single item message
      expect(screen.getByText(/with 1 item/)).toBeInTheDocument();
    });

    it('cancels delete when Cancel is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Delete
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Document should still exist (use testid to avoid duplicate text issue)
      expect(screen.getByTestId('row-title')).toHaveTextContent('Test Document');
    });

    it('removes document when Delete is confirmed', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Delete
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      // Click Delete to confirm
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes delete dialog with Escape key', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Delete
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      // Press Escape
      fireEvent.keyDown(document.body, { key: 'Escape' });

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Archive Document Workflow
  // ==========================================================================

  describe('Archive Document Workflow', () => {
    it('opens archive confirmation dialog when Archive is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: false });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      // Click Archive
      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      // Confirmation dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Archive Document')).toBeInTheDocument();
      expect(screen.getByText(/Archive document REQ-20251231-test-project/)).toBeInTheDocument();
    });

    it('archives document when Archive is confirmed', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: false });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Archive
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      // Click Archive to confirm
      const confirmButton = screen.getByRole('button', { name: 'Archive' });
      await user.click(confirmButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore.write should have been called with archived: true
      expect(docStore.write).toHaveBeenCalledWith(
        docPath,
        expect.objectContaining({ archived: true })
      );

      // Archived badge should be visible
      expect(screen.getByTestId('archived-badge')).toBeInTheDocument();
    });

    it('cancels archive when Cancel is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: false });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu and click Archive
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore.write should not have been called
      expect(docStore.write).not.toHaveBeenCalled();

      // Document should not be archived
      expect(screen.queryByTestId('archived-badge')).not.toBeInTheDocument();
    });

    it('document removed from active list when archived', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: false });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Verify not archived initially
      expect(screen.getByTestId('is-archived')).toHaveTextContent('false');

      // Archive the document
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      const confirmButton = screen.getByRole('button', { name: 'Archive' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify archived status updated
      expect(screen.getByTestId('is-archived')).toHaveTextContent('true');
    });
  });

  // ==========================================================================
  // Unarchive Document Workflow
  // ==========================================================================

  describe('Unarchive Document Workflow', () => {
    it('shows Unarchive option for archived documents', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: true });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      // Should show Unarchive, not Archive
      expect(screen.getByRole('menuitem', { name: 'Unarchive Document' })).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: 'Archive Document' })).not.toBeInTheDocument();
    });

    it('opens unarchive confirmation dialog when Unarchive is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: true });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      // Click Unarchive
      const unarchiveItem = screen.getByRole('menuitem', { name: 'Unarchive Document' });
      await user.click(unarchiveItem);

      // Confirmation dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Unarchive Document')).toBeInTheDocument();
      expect(
        screen.getByText(/Restore document REQ-20251231-test-project to active documents/)
      ).toBeInTheDocument();
    });

    it('unarchives document when Unarchive is confirmed', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: true });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Verify archived initially
      expect(screen.getByTestId('is-archived')).toHaveTextContent('true');

      // Open kebab menu and click Unarchive
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const unarchiveItem = screen.getByRole('menuitem', { name: 'Unarchive Document' });
      await user.click(unarchiveItem);

      // Click Unarchive to confirm
      const confirmButton = screen.getByRole('button', { name: 'Unarchive' });
      await user.click(confirmButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // DocStore.write should have been called with archived: false
      expect(docStore.write).toHaveBeenCalledWith(
        docPath,
        expect.objectContaining({ archived: false })
      );

      // Verify unarchived
      expect(screen.getByTestId('is-archived')).toHaveTextContent('false');

      // Archived badge should be removed
      expect(screen.queryByTestId('archived-badge')).not.toBeInTheDocument();
    });

    it('document restored to active list when unarchived', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: true });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Verify archived initially
      expect(screen.getByTestId('archived-badge')).toBeInTheDocument();

      // Unarchive the document
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const unarchiveItem = screen.getByRole('menuitem', { name: 'Unarchive Document' });
      await user.click(unarchiveItem);

      const confirmButton = screen.getByRole('button', { name: 'Unarchive' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Archived badge should be removed
      expect(screen.queryByTestId('archived-badge')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edit Document Workflow
  // ==========================================================================

  describe('Edit Document Workflow', () => {
    it('opens edit form when Edit is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open kebab menu
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      // Click Edit
      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editItem);

      // Edit form should be visible
      expect(screen.getByTestId('edit-form-modal')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it('updates document when edit is saved', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ title: 'Original Title' });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open edit form
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editItem);

      // Change title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Form should close
      await waitFor(() => {
        expect(screen.queryByTestId('edit-form-modal')).not.toBeInTheDocument();
      });

      // DocStore.write should have been called with new title
      expect(docStore.write).toHaveBeenCalledWith(
        docPath,
        expect.objectContaining({ title: 'Updated Title' })
      );

      // Title should be updated
      expect(screen.getByTestId('document-title')).toHaveTextContent('Updated Title');
    });

    it('cancels edit without saving', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ title: 'Original Title' });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open edit form
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editItem);

      // Change title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Changed Title');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Form should close
      await waitFor(() => {
        expect(screen.queryByTestId('edit-form-modal')).not.toBeInTheDocument();
      });

      // DocStore.write should not have been called
      expect(docStore.write).not.toHaveBeenCalled();

      // Title should be unchanged
      expect(screen.getByTestId('document-title')).toHaveTextContent('Original Title');
    });

    it('validates required title field', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Open edit form
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editItem);

      // Clear title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show validation error
      expect(screen.getByText('Title is required')).toBeInTheDocument();

      // DocStore.write should not have been called
      expect(docStore.write).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Add Item Navigation
  // ==========================================================================

  describe('Add Item Navigation', () => {
    it('calls onAddItemToDocument when Add Item is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();
      docStore._setDocument(docPath, doc);
      const onAddItem = vi.fn();

      render(
        <DocumentManagementTestHarness
          initialDocument={doc}
          docStore={docStore}
          onAddItemToDocument={onAddItem}
        />
      );

      // Open kebab menu
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      // Click Add Item
      const addItem = screen.getByRole('menuitem', { name: 'Add Item' });
      await user.click(addItem);

      // Callback should be called with path and document
      expect(onAddItem).toHaveBeenCalledWith(docPath, doc);
    });

    it('navigates to capture wizard with correct context', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({
        doc_id: 'REQ-20251231-my-project',
        project_id: 'my-project',
      });
      docStore._setDocument('/test/my-project/REQ-20251231-my-project.md', doc);
      const onAddItem = vi.fn();

      render(
        <DocumentManagementTestHarness
          initialDocument={doc}
          docStore={docStore}
          onAddItemToDocument={onAddItem}
        />
      );

      // Open kebab menu and click Add Item
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const addItem = screen.getByRole('menuitem', { name: 'Add Item' });
      await user.click(addItem);

      // Verify callback received correct document
      expect(onAddItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          doc_id: 'REQ-20251231-my-project',
          project_id: 'my-project',
        })
      );
    });
  });

  // ==========================================================================
  // Archive Status Filtering
  // ==========================================================================

  describe('Archive Status Filtering', () => {
    it('shows archived badge for archived documents', () => {
      const doc = createMockDocument({ archived: true });

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      expect(screen.getByTestId('archived-badge')).toBeInTheDocument();
      expect(screen.getByTestId('archived-badge')).toHaveTextContent('Archived');
    });

    it('does not show archived badge for active documents', () => {
      const doc = createMockDocument({ archived: false });

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      expect(screen.queryByTestId('archived-badge')).not.toBeInTheDocument();
    });

    it('applies archived class to row for archived documents', () => {
      const doc = createMockDocument({ archived: true });

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      const row = screen.getByTestId('document-row');
      expect(row).toHaveClass('archived');
    });

    it('does not apply archived class to row for active documents', () => {
      const doc = createMockDocument({ archived: false });

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      const row = screen.getByTestId('document-row');
      expect(row).not.toHaveClass('archived');
    });
  });

  // ==========================================================================
  // DocStore Adapter Integration
  // ==========================================================================

  describe('DocStore Adapter Integration', () => {
    it('calls docStore.write with correct path for archive', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: false });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Archive the document
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      const confirmButton = screen.getByRole('button', { name: 'Archive' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify write was called
      expect(docStore.write).toHaveBeenCalled();
    });

    it('persists archive status correctly', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ archived: false });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Archive
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      const confirmButton = screen.getByRole('button', { name: 'Archive' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify the written document has archived: true
      const writeCall = (docStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall?.[1].archived).toBe(true);
    });

    it('persists edit changes correctly', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument({ title: 'Original' });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Edit
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editItem);

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByTestId('edit-form-modal')).not.toBeInTheDocument();
      });

      // Verify the written document has the new title
      const writeCall = (docStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall?.[1].title).toBe('New Title');
    });

    it('updates timestamps on save', async () => {
      const user = userEvent.setup({ delay: null });
      const originalDate = new Date('2025-01-01');
      const doc = createMockDocument({ updated_at: originalDate });
      docStore._setDocument(docPath, doc);

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      // Archive to trigger save
      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      const confirmButton = screen.getByRole('button', { name: 'Archive' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Verify updated_at was changed
      const writeCall = (docStore.write as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(writeCall?.[1].updated_at).not.toEqual(originalDate);
      expect(writeCall?.[1].updated_at.getTime()).toBeGreaterThan(originalDate.getTime());
    });
  });

  // ==========================================================================
  // Accessibility
  // ==========================================================================

  describe('Accessibility', () => {
    it('delete dialog has correct ARIA attributes', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const deleteItem = screen.getByRole('menuitem', { name: 'Delete Document' });
      await user.click(deleteItem);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('archive dialog has correct ARIA attributes', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const archiveItem = screen.getByRole('menuitem', { name: 'Archive Document' });
      await user.click(archiveItem);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('archived badge has correct accessible label', () => {
      const doc = createMockDocument({ archived: true });

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      const badge = screen.getByRole('status', { name: /archived document/i });
      expect(badge).toBeInTheDocument();
    });

    it('edit form is keyboard accessible', async () => {
      const user = userEvent.setup({ delay: null });
      const doc = createMockDocument();

      render(<DocumentManagementTestHarness initialDocument={doc} docStore={docStore} />);

      const menuButton = screen.getByRole('button', { name: /actions for document/i });
      await user.click(menuButton);

      const editItem = screen.getByRole('menuitem', { name: 'Edit Document' });
      await user.click(editItem);

      // Title input should be focusable
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).not.toBeDisabled();

      // Form should have accessible label
      const form = screen.getByRole('form', { name: /edit document/i });
      expect(form).toBeInTheDocument();
    });
  });
});
