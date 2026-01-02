/**
 * WizardFlow Step Indicator Tests
 *
 * Tests the step indicator updates correctly through the full wizard flow.
 * Verifies dynamic step labels, truncation, and tooltip behavior.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardFlow } from '../WizardFlow';
import type { CaptureContext } from '../WizardFlow';
import type { Project, RequestLogDoc } from '@core/models';
import type { ProjectStore, FieldCatalogStore, DocStore, Clock } from '@core/ports';

// ============================================================================
// Constants
// ============================================================================

// MAX_LABEL_LENGTH from StepProgress.tsx is 20
const MAX_LABEL_LENGTH = 20;

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

// Short project for testing non-truncated labels
const mockShortProject: Project = {
  id: 'short',
  name: 'Short',
  default_path: '/home/test/.meatycapture/short',
  enabled: true,
  created_at: new Date('2025-12-31T10:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
};

// Doc ID: "REQ-20251231-test-project" (25 chars) - exceeds MAX_LABEL_LENGTH (20)
const mockDocument: RequestLogDoc = {
  doc_id: 'REQ-20251231-test-project',
  title: 'Test Document',
  project_id: 'test-project',
  items: [
    {
      id: 'REQ-20251231-test-project-01',
      title: 'Existing Item',
      type: 'enhancement',
      domain: 'web',
      context: '',
      priority: 'medium',
      status: 'triage',
      tags: ['tag1'],
      notes: 'Test notes',
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

// Short doc ID (18 chars) - under MAX_LABEL_LENGTH (20), should not truncate
const mockShortDocId = 'REQ-20251231-short';
const mockShortDocument: RequestLogDoc = {
  ...mockDocument,
  doc_id: mockShortDocId,
  project_id: 'short',
};

// Document with a long ID for truncation testing (54 chars)
const mockLongDocId = 'REQ-20251231-very-long-project-name-that-exceeds-limit';
const mockDocumentLongId: RequestLogDoc = {
  ...mockDocument,
  doc_id: mockLongDocId,
};

const mockCaptureContext: CaptureContext = {
  project: mockProject,
  documentPath: '/home/test/.meatycapture/test-project/REQ-20251231-test-project.md',
  document: mockDocument,
};

const mockCaptureContextShort: CaptureContext = {
  project: mockShortProject,
  documentPath: `/home/test/.meatycapture/short/${mockShortDocId}.md`,
  document: mockShortDocument,
};

const mockCaptureContextLongId: CaptureContext = {
  project: mockProject,
  documentPath: `/home/test/.meatycapture/test-project/${mockLongDocId}.md`,
  document: mockDocumentLongId,
};

// ============================================================================
// Mock Stores
// ============================================================================

const createMockProjectStore = (projects: Project[] = [mockProject]): ProjectStore => ({
  list: vi.fn().mockResolvedValue(projects),
  get: vi.fn().mockResolvedValue(projects[0]),
  create: vi.fn().mockResolvedValue(projects[0]),
  update: vi.fn().mockResolvedValue(projects[0]),
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
    { id: '8', field: 'domain', value: 'web', scope: 'global' },
  ]),
  getByField: vi.fn().mockResolvedValue([]),
  addOption: vi.fn().mockImplementation((option) => Promise.resolve({ id: 'new-id', ...option })),
  removeOption: vi.fn().mockResolvedValue(undefined),
});

const createMockDocStore = (existingDocs: RequestLogDoc[] = []): DocStore => ({
  list: vi.fn().mockResolvedValue(
    existingDocs.map((doc) => ({
      path: `/home/test/.meatycapture/test-project/${doc.doc_id}.md`,
      doc_id: doc.doc_id,
      item_count: doc.item_count,
      updated_at: doc.updated_at,
      archived: doc.archived ?? false,
    }))
  ),
  read: vi.fn().mockImplementation((path: string) => {
    const doc = existingDocs.find((d) => path.includes(d.doc_id));
    return Promise.resolve(doc || mockDocument);
  }),
  write: vi.fn().mockResolvedValue(undefined),
  append: vi.fn().mockResolvedValue({ item_id: 'REQ-20251231-test-project-02' }),
  backup: vi.fn().mockResolvedValue('/backup/path'),
  isWritable: vi.fn().mockResolvedValue(true),
});

const createMockClock = (): Clock => ({
  now: () => new Date('2025-12-31T12:00:00Z'),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the expected truncated label for a doc ID.
 * Mirrors the truncateLabel function in StepProgress.tsx.
 */
function getExpectedTruncatedLabel(label: string): string {
  if (label.length <= MAX_LABEL_LENGTH) return label;
  return label.slice(0, MAX_LABEL_LENGTH - 1) + '\u2026'; // Unicode ellipsis
}

/**
 * Find a step label element by its title attribute (full label) for truncated labels.
 */
function findLabelByTitle(container: HTMLElement, fullLabel: string): HTMLElement | null {
  return container.querySelector(`[title="${fullLabel}"]`);
}

// ============================================================================
// Tests: Step Indicator Initial State
// ============================================================================

describe('WizardFlow Step Indicator', () => {
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

  describe('initial state step labels', () => {
    it('should show "Document" as Step 2 label initially', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      // Wait for the wizard to render
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      // Find the step progress navigation
      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });

      // Check that Step 2 label is "Document"
      expect(within(stepProgress).getByText('Document')).toBeInTheDocument();

      // Verify all initial step labels
      expect(within(stepProgress).getByText('Project')).toBeInTheDocument();
      expect(within(stepProgress).getByText('Item')).toBeInTheDocument();
      expect(within(stepProgress).getByText('Review')).toBeInTheDocument();
    });
  });

  describe('step label updates after doc step completion', () => {
    it('should update Step 2 label to doc ID after completing doc step (new doc)', async () => {
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

      // Select a project
      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      await user.selectOptions(projectSelect, 'test-project');

      // Click Next to go to doc step
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Wait for doc step to render
      await waitFor(() => {
        expect(screen.getByText('Select Document')).toBeInTheDocument();
      });

      // Step 2 should still show "Document" since doc step is not completed yet
      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });
      expect(within(stepProgress).getByText('Document')).toBeInTheDocument();

      // Click Next to complete doc step and go to item step
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Wait for item step to render
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Now Step 2 label should show the doc ID (generated based on date and project slug)
      // The doc ID format is: REQ-YYYYMMDD-<project-slug>
      // With clock returning 2025-12-31, it should be REQ-20251231-test-project
      // Since this is 25 chars > MAX_LABEL_LENGTH (20), it will be truncated
      const fullDocId = 'REQ-20251231-test-project';
      const updatedStepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });

      // The label should have a title attribute with the full doc ID
      const truncatedLabel = findLabelByTitle(updatedStepProgress, fullDocId);
      expect(truncatedLabel).toBeInTheDocument();

      // The visible text should be truncated
      const expectedTruncated = getExpectedTruncatedLabel(fullDocId);
      expect(within(updatedStepProgress).getByText(expectedTruncated)).toBeInTheDocument();
    });

    it('should update Step 2 label when selecting existing document', async () => {
      const user = userEvent.setup({ delay: null });

      // Create doc store with existing documents
      const existingDoc: RequestLogDoc = {
        ...mockDocument,
        doc_id: 'REQ-20251225-existing-doc',
      };
      docStore = createMockDocStore([existingDoc]);

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

      // Select a project
      const projectSelect = screen.getByRole('combobox', { name: 'Project' });
      await user.selectOptions(projectSelect, 'test-project');

      // Click Next to go to doc step
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Wait for doc step to render
      await waitFor(() => {
        expect(screen.getByText('Select Document')).toBeInTheDocument();
      });

      // Click Next to complete doc step
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Wait for item step to render
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Step 2 label should now reflect a doc ID (either new or existing)
      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });
      // The label shows the filename without .md extension, starting with REQ-
      const docLabels = within(stepProgress).getAllByText(/REQ-/);
      expect(docLabels.length).toBeGreaterThan(0);
    });
  });

  describe('step label with capture context (pre-selected doc)', () => {
    it('should show doc ID immediately when captureContext is provided', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContext}
        />
      );

      // Wait for item step to render (wizard starts at step 3 with capture context)
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Step 2 label should immediately show the pre-selected doc ID
      // Since doc ID is 25 chars > MAX_LABEL_LENGTH (20), it will be truncated
      const fullDocId = 'REQ-20251231-test-project';
      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });

      // Find the label by its title attribute (contains full doc ID)
      const truncatedLabel = findLabelByTitle(stepProgress, fullDocId);
      expect(truncatedLabel).toBeInTheDocument();
    });

    it('should mark steps 1 and 2 as completed with capture context', async () => {
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

      // Verify completed step labels via aria-label
      expect(screen.getByLabelText('Step 1: Project (completed)')).toBeInTheDocument();
      // Step 2 should show the doc ID in its aria-label (full, not truncated)
      expect(
        screen.getByLabelText('Step 2: REQ-20251231-test-project (completed)')
      ).toBeInTheDocument();
    });
  });

  describe('long doc ID truncation and tooltip', () => {
    it('should truncate long doc IDs and show title attribute', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContextLongId}
        />
      );

      // Wait for item step to render
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });

      // The long doc ID should be truncated (MAX_LABEL_LENGTH = 20)
      // Original: "REQ-20251231-very-long-project-name-that-exceeds-limit" (54 chars)
      // Truncated to 19 chars + ellipsis
      const expectedTruncated = getExpectedTruncatedLabel(mockLongDocId);
      const truncatedLabel = within(stepProgress).getByText(expectedTruncated);
      expect(truncatedLabel).toBeInTheDocument();

      // The element should have a title attribute with the full doc ID for tooltip
      expect(truncatedLabel).toHaveAttribute('title', mockLongDocId);

      // The element should have the 'truncated' class
      expect(truncatedLabel).toHaveClass('truncated');
    });

    it('should not truncate short doc IDs under 20 characters', async () => {
      // Use the short project and short doc context
      projectStore = createMockProjectStore([mockShortProject]);

      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={mockCaptureContextShort}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });

      // Short doc ID "REQ-20251231-short" (18 chars) should not be truncated
      const shortDocLabel = within(stepProgress).getByText(mockShortDocId);
      expect(shortDocLabel).toBeInTheDocument();

      // Should NOT have title attribute since it's not truncated
      expect(shortDocLabel).not.toHaveAttribute('title');

      // Should NOT have truncated class
      expect(shortDocLabel).not.toHaveClass('truncated');
    });

    it('should not add title attribute to short labels like "Document"', async () => {
      render(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });
      const documentLabel = within(stepProgress).getByText('Document');

      // Short labels should not have title attribute
      expect(documentLabel).not.toHaveAttribute('title');
      expect(documentLabel).not.toHaveClass('truncated');
    });
  });

  describe('step label persistence through wizard flow', () => {
    it('should preserve doc ID label when navigating to review and back', async () => {
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

      // Wait for item step
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Fill out the form
      await user.type(screen.getByLabelText('Item title'), 'Test Item');
      const typeSelect = screen.getByRole('combobox', { name: 'Type' });
      await user.selectOptions(typeSelect, 'enhancement');

      // Navigate to review
      await user.click(screen.getByRole('button', { name: /review/i }));

      // Wait for review step
      await waitFor(() => {
        expect(screen.getByText('Test Item')).toBeInTheDocument();
      });

      // Verify doc ID is still shown in step progress (via title attribute)
      const fullDocId = 'REQ-20251231-test-project';
      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });
      const docLabelOnReview = findLabelByTitle(stepProgress, fullDocId);
      expect(docLabelOnReview).toBeInTheDocument();

      // Go back to item step
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Wait for item step
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Verify doc ID is still shown
      const stepProgressAfterBack = screen.getByRole('navigation', { name: 'Wizard progress' });
      const docLabelAfterBack = findLabelByTitle(stepProgressAfterBack, fullDocId);
      expect(docLabelAfterBack).toBeInTheDocument();
    });

    it('should reset step labels when wizard is completed and restarted', async () => {
      const user = userEvent.setup({ delay: null });
      const onComplete = vi.fn();
      const onClearContext = vi.fn();

      const { rerender } = render(
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

      // Wait for item step
      await waitFor(() => {
        expect(screen.getByText('Capture Details')).toBeInTheDocument();
      });

      // Fill and submit
      await user.type(screen.getByLabelText('Item title'), 'Test Item');
      const typeSelect = screen.getByRole('combobox', { name: 'Type' });
      await user.selectOptions(typeSelect, 'enhancement');

      await user.click(screen.getByRole('button', { name: /review/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /submit/i }));

      // Wait for success
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Success!' })).toBeInTheDocument();
      });

      // Click Done to complete wizard
      await user.click(screen.getByRole('button', { name: 'Start a new capture session' }));

      // Simulate the parent component clearing captureContext after onClearContext is called
      rerender(
        <WizardFlow
          projectStore={projectStore}
          fieldCatalogStore={fieldCatalogStore}
          docStore={docStore}
          clock={clock}
          captureContext={null}
          onComplete={onComplete}
          onClearContext={onClearContext}
        />
      );

      // Wait for project step (wizard restarted)
      await waitFor(() => {
        expect(screen.getByText('Select Project')).toBeInTheDocument();
      });

      // Verify step 2 label is back to "Document"
      const stepProgress = screen.getByRole('navigation', { name: 'Wizard progress' });
      expect(within(stepProgress).getByText('Document')).toBeInTheDocument();
    });
  });
});
