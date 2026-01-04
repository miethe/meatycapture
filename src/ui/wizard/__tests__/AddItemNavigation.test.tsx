/**
 * Add Item Navigation Flow Tests
 *
 * Tests the navigation from DocumentKebabMenu "Add Item" action to the capture wizard.
 * Verifies that the wizard opens at Step 3 with pre-selected project and document.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardFlow } from '../WizardFlow';
import type { CaptureContext } from '../WizardFlow';
import type { Project, RequestLogDoc } from '@core/models';
import type { ProjectStore, FieldCatalogStore, DocStore, Clock } from '@core/ports';

// ============================================================================
// Mock Data
// ============================================================================

const mockProject: Project = {
  id: 'test-project',
  name: 'Test Project',
  default_path: '/home/test/.meatycapture/test-project',
  enabled: true,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
};

const mockDocument: RequestLogDoc = {
  doc_id: 'REQ-20251231-test-project',
  title: 'Test Document',
  project_id: 'test-project',
  items: [
    {
      id: 'REQ-20251231-test-project-01',
      title: 'Existing Item',
      type: 'enhancement',
      domain: ['web'],
      context: [''],
      priority: 'medium',
      status: 'triage',
      tags: ['tag1'],
      notes: [],
      created_at: new Date('2025-12-31T10:00:00Z'),
    },
  ],
  items_index: [
    { id: 'REQ-20251231-test-project-01', type: 'enhancement', title: 'Existing Item' },
  ],
  tags: ['tag1'],
  item_count: 1,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
  archived: false,
};

const mockCaptureContext: CaptureContext = {
  project: mockProject,
  documentPath: '/home/test/.meatycapture/test-project/REQ-20251231-test-project.md',
  document: mockDocument,
};

// ============================================================================
// Mock Stores
// ============================================================================

const createMockProjectStore = (): ProjectStore => ({
  list: vi.fn().mockResolvedValue([mockProject]),
  get: vi.fn().mockResolvedValue(mockProject),
  create: vi.fn().mockResolvedValue(mockProject),
  update: vi.fn().mockResolvedValue(mockProject),
  delete: vi.fn().mockResolvedValue(undefined),
});

const createMockFieldCatalogStore = (): FieldCatalogStore => ({
  getGlobal: vi.fn().mockResolvedValue([]),
  getForProject: vi.fn().mockResolvedValue([
    { id: '1', field: 'type', value: 'enhancement', scope: 'global' },
    { id: '2', field: 'type', value: 'bug', scope: 'global' },
    { id: '3', field: 'priority', value: 'high', scope: 'global' },
    { id: '4', field: 'priority', value: 'medium', scope: 'global' },
    { id: '5', field: 'priority', value: 'low', scope: 'global' },
    { id: '6', field: 'status', value: 'triage', scope: 'global' },
    { id: '7', field: 'status', value: 'in-progress', scope: 'global' },
  ]),
  getByField: vi.fn().mockResolvedValue([]),
  addOption: vi.fn().mockImplementation((option) => Promise.resolve({ id: 'new-id', ...option })),
  removeOption: vi.fn().mockResolvedValue(undefined),
});

const createMockDocStore = (): DocStore => ({
  list: vi.fn().mockResolvedValue([]),
  read: vi.fn().mockResolvedValue(mockDocument),
  write: vi.fn().mockResolvedValue(undefined),
  append: vi.fn().mockResolvedValue({ item_id: 'REQ-20251231-test-project-02' }),
  backup: vi.fn().mockResolvedValue('/backup/path'),
  isWritable: vi.fn().mockResolvedValue(true),
});

const createMockClock = (): Clock => ({
  now: () => new Date('2025-12-31T12:00:00Z'),
});

// ============================================================================
// Tests
// ============================================================================

describe('Add Item Navigation Flow', () => {
  let projectStore: ProjectStore;
  let fieldCatalogStore: FieldCatalogStore;
  let docStore: DocStore;
  let clock: Clock;

  beforeEach(() => {
    projectStore = createMockProjectStore();
    fieldCatalogStore = createMockFieldCatalogStore();
    docStore = createMockDocStore();
    clock = createMockClock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('CaptureContext initialization', () => {
    it('should start at Step 3 (Item Details) when captureContext is provided', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      // Should be on Step 3 - look for the Item Details form
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Should show the item form
      expect(screen.getByLabelText('Item title')).toBeInTheDocument();
    });

    it('should show pre-selection summary with project and document info', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Should show project name
      expect(screen.getByText(mockProject.name)).toBeInTheDocument();

      // Should show document ID
      expect(screen.getByText('REQ-20251231-test-project')).toBeInTheDocument();
    });

    it('should mark steps 1 and 2 as completed in progress indicator', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Step progress should show completed states for steps 1 and 2
      // Look for the completed step dots via aria-label
      // Note: Step 2 now shows the doc ID instead of "Document" when a capture context is provided
      const projectStepDot = screen.getByLabelText('Step 1: Project (completed)');
      const documentStepDot = screen.getByLabelText(
        `Step 2: ${mockDocument.doc_id} (completed)`
      );

      expect(projectStepDot).toHaveClass('completed');
      expect(documentStepDot).toHaveClass('completed');
    });

    it('should hide back button when in batching mode from captureContext', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Back button should not be present
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });
  });

  describe('form submission with captureContext', () => {
    it('should append to existing document when submitted', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Fill out the form
      await user.type(screen.getByLabelText('Item title'), 'New Item Title');

      // Select type using the select element
      const typeSelect = screen.getByRole('combobox', { name: 'Type' });
      await user.selectOptions(typeSelect, 'enhancement');

      // Select priority
      const prioritySelect = screen.getByRole('combobox', { name: 'Priority' });
      await user.selectOptions(prioritySelect, 'medium');

      // Select status
      const statusSelect = screen.getByRole('combobox', { name: 'Status' });
      await user.selectOptions(statusSelect, 'triage');

      // Click Review button
      await user.click(screen.getByRole('button', { name: /review/i }));

      // Should be on review step
      await waitFor(() => {
        expect(screen.getByText('New Item Title')).toBeInTheDocument();
      });

      // Submit the item
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Should call docStore.append (not write) since we're appending to existing doc
      await waitFor(() => {
        expect(docStore.append).toHaveBeenCalled();
      });

      // docStore.write should not be called (we're appending, not creating)
      expect(docStore.write).not.toHaveBeenCalled();
    });
  });

  describe('wizard completion with captureContext', () => {
    it('should call onComplete and onClearContext when Done is clicked', async () => {
      const onComplete = vi.fn();
      const onClearContext = vi.fn();
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
          onComplete={onComplete}
          onClearContext={onClearContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Fill minimal form
      await user.type(screen.getByLabelText('Item title'), 'Test Title');

      const typeSelect = screen.getByRole('combobox', { name: 'Type' });
      await user.selectOptions(typeSelect, 'bug');

      const prioritySelect = screen.getByRole('combobox', { name: 'Priority' });
      await user.selectOptions(prioritySelect, 'high');

      const statusSelect = screen.getByRole('combobox', { name: 'Status' });
      await user.selectOptions(statusSelect, 'triage');

      // Go to review
      await user.click(screen.getByRole('button', { name: /review/i }));

      // Submit
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Wait for success state - look for the "Success!" heading specifically
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
      });

      // Click Done using the aria-label
      await user.click(screen.getByRole('button', { name: 'Start a new capture session' }));

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onClearContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('without captureContext', () => {
    it('should start at Step 1 (Project) normally', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      // Should show project selection step
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      // Should not show pre-selection summary
      expect(screen.queryByText('Adding item to:')).not.toBeInTheDocument();
    });

    it('should show back button on Step 3 when navigating without captureContext', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      // Wait for project list to load
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      // Wait for project option to be loaded
      await waitFor(() => {
        const projectSelect = screen.getByRole('combobox', { name: 'Project' });
        expect(projectSelect).toBeInTheDocument();
      });

      // Select a project
      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      await user.selectOptions(projectSelect, 'test-project');

      // Click Next
      await user.click(screen.getByRole('button', { name: /next/i }));

      // On Doc step - select new doc and click Next
      await waitFor(() => {
        expect(screen.getByText('Select Document')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      // On Item step - back button should be visible
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('captureContext changes', () => {
    it('should reset wizard when captureContext changes', async () => {
      const { rerender } = render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={null}
        />
      );

      // Start at Step 1
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      // Provide capture context
      rerender(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      // Should now be at Step 3
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Should show pre-selection summary
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });
});
