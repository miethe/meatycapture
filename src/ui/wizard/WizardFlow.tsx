/**
 * WizardFlow Component
 *
 * Main orchestrator for the capture wizard flow.
 * Manages state machine and coordinates all wizard steps:
 * 1. Project Selection
 * 2. Document Selection
 * 3. Item Details Form
 * 4. Review & Submit
 *
 * Supports batching mode: After first submit, user can add multiple items
 * to the same document without re-selecting project/doc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Project, ItemDraft, RequestLogDoc, FieldOption, FieldName } from '@core/models';
import type { ProjectStore, FieldCatalogStore, DocStore, Clock } from '@core/ports';
import { generateDocId, slugify } from '@core/validation';
import { ProjectStep } from './ProjectStep';
import { DocStep } from './DocStep';
import { ItemStep } from './ItemStep';
import { ReviewStep } from './ReviewStep';
import { StepProgress } from '../shared/StepProgress';
import './wizard.css';

/**
 * Wizard step state machine
 * project -> doc -> item -> review -> (success state shown in ReviewStep)
 */
type WizardStep = 'project' | 'doc' | 'item' | 'review';

/**
 * Step labels for progress indicator
 */
const STEP_LABELS = ['Project', 'Document', 'Item', 'Review'];

/**
 * Map step name to index
 */
const STEP_INDEX_MAP: Record<WizardStep, number> = {
  project: 0,
  doc: 1,
  item: 2,
  review: 3,
};

interface WizardFlowProps {
  /** Project store for CRUD operations */
  projectStore: ProjectStore;
  /** Field catalog store for dropdown options */
  fieldCatalogStore: FieldCatalogStore;
  /** Document store for request-log operations */
  docStore: DocStore;
  /** Clock for timestamp generation */
  clock: Clock;
  /** Called when wizard completes and user clicks Done */
  onComplete?: () => void;
}

/**
 * Default empty item draft state
 */
const EMPTY_DRAFT: ItemDraft = {
  title: '',
  type: '',
  domain: '',
  context: '',
  priority: 'medium',
  status: 'triage',
  tags: [],
  notes: '',
};

export function WizardFlow({
  projectStore,
  fieldCatalogStore,
  docStore,
  clock,
  onComplete, // Currently unused - ReviewStep handles "Done" via window.location.reload()
}: WizardFlowProps): React.JSX.Element {
  // Prevent unused warning - onComplete is part of public API for future extensibility
  void onComplete;
  // ============================================================================
  // State Management
  // ============================================================================

  // Current step in the wizard flow
  const [currentStep, setCurrentStep] = useState<WizardStep>('project');

  // Track completed steps for progress indicator
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Project step state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Doc step state
  const [existingDocs, setExistingDocs] = useState<RequestLogDoc[]>([]);
  const [selectedDocPath, setSelectedDocPath] = useState<string | null>(null);
  const [docPath, setDocPath] = useState<string>('');
  const [isNewDoc, setIsNewDoc] = useState<boolean>(true);

  // Item step state
  const [draft, setDraft] = useState<ItemDraft>(EMPTY_DRAFT);
  const [fieldOptions, setFieldOptions] = useState<Record<FieldName, FieldOption[]>>({
    type: [],
    domain: [],
    context: [],
    priority: [],
    status: [],
    tags: [],
  });

  // Loading & submission state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Batching mode: Lock project/doc after first successful submit
  const [batchingMode, setBatchingMode] = useState<boolean>(false);

  // ============================================================================
  // Effects - Data Loading
  // ============================================================================

  /**
   * Load projects on mount
   */
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoading(true);
        const projectList = await projectStore.list();
        setProjects(projectList);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [projectStore]);

  /**
   * Load existing docs when project is selected
   */
  useEffect(() => {
    if (!selectedProject) return;

    const loadDocs = async () => {
      try {
        setIsLoading(true);
        const docMetaList = await docStore.list(selectedProject.default_path);

        // Load full docs from metadata
        const fullDocs = await Promise.all(docMetaList.map((meta) => docStore.read(meta.path)));

        setExistingDocs(fullDocs);
      } catch (err) {
        console.error('Failed to load documents:', err);
        // Non-fatal: user can still create new docs
        setExistingDocs([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocs();
  }, [selectedProject, docStore]);

  /**
   * Load field options when entering item step
   */
  useEffect(() => {
    if (currentStep !== 'item' || !selectedProject) return;

    const loadFieldOptions = async () => {
      try {
        setIsLoading(true);
        const options = await fieldCatalogStore.getForProject(selectedProject.id);

        // Group options by field
        const grouped: Record<FieldName, FieldOption[]> = {
          type: [],
          domain: [],
          context: [],
          priority: [],
          status: [],
          tags: [],
        };

        for (const option of options) {
          grouped[option.field].push(option);
        }

        setFieldOptions(grouped);
      } catch (err) {
        console.error('Failed to load field options:', err);
        setError(err instanceof Error ? err.message : 'Failed to load field options');
      } finally {
        setIsLoading(false);
      }
    };

    loadFieldOptions();
  }, [currentStep, selectedProject, fieldCatalogStore]);

  // ============================================================================
  // Step 1: Project Selection Handlers
  // ============================================================================

  const handleSelectProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      setSelectedProject(project);

      // Auto-generate default doc path
      const slug = slugify(project.name);
      const defaultDocId = generateDocId(slug, clock.now());
      const defaultPath = `${project.default_path}/${defaultDocId}.md`;
      setDocPath(defaultPath);
    },
    [projects, clock]
  );

  const handleCreateProject = useCallback(
    async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const newProject = await projectStore.create(projectData);
        setProjects((prev) => [...prev, newProject]);
        return newProject;
      } catch (err) {
        console.error('Failed to create project:', err);
        throw err;
      }
    },
    [projectStore]
  );

  const handleProjectNext = useCallback(() => {
    // Mark project step as completed
    setCompletedSteps((prev) => {
      const projectIndex = STEP_INDEX_MAP.project;
      if (!prev.includes(projectIndex)) {
        return [...prev, projectIndex];
      }
      return prev;
    });
    setCurrentStep('doc');
  }, []);

  // ============================================================================
  // Step 2: Document Selection Handlers
  // ============================================================================

  const handleSelectDoc = useCallback((path: string | null) => {
    setSelectedDocPath(path);
    setIsNewDoc(path === null);

    // If existing doc is selected, update docPath
    if (path) {
      setDocPath(path);
    }
  }, []);

  const handlePathOverride = useCallback((path: string) => {
    setDocPath(path);
  }, []);

  const handleDocBack = useCallback(() => {
    // Don't allow going back in batching mode
    if (batchingMode) return;
    setCurrentStep('project');
  }, [batchingMode]);

  const handleDocNext = useCallback(() => {
    // Mark doc step as completed
    setCompletedSteps((prev) => {
      const docIndex = STEP_INDEX_MAP.doc;
      if (!prev.includes(docIndex)) {
        return [...prev, docIndex];
      }
      return prev;
    });
    setCurrentStep('item');
  }, []);

  // ============================================================================
  // Step 3: Item Details Handlers
  // ============================================================================

  const handleDraftChange = useCallback((newDraft: ItemDraft) => {
    setDraft(newDraft);
  }, []);

  const handleAddFieldOption = useCallback(
    async (field: FieldName, value: string) => {
      if (!selectedProject) return;

      try {
        // Add option with project scope
        const newOption = await fieldCatalogStore.addOption({
          field,
          value,
          scope: 'project',
          project_id: selectedProject.id,
        });

        // Update local state
        setFieldOptions((prev) => ({
          ...prev,
          [field]: [...prev[field], newOption],
        }));
      } catch (err) {
        console.error(`Failed to add field option for ${field}:`, err);
        throw err;
      }
    },
    [selectedProject, fieldCatalogStore]
  );

  const handleItemBack = useCallback(() => {
    // Don't allow going back in batching mode
    if (batchingMode) return;
    setCurrentStep('doc');
  }, [batchingMode]);

  const handleItemNext = useCallback(() => {
    // Mark item step as completed
    setCompletedSteps((prev) => {
      const itemIndex = STEP_INDEX_MAP.item;
      if (!prev.includes(itemIndex)) {
        return [...prev, itemIndex];
      }
      return prev;
    });
    setCurrentStep('review');
  }, []);

  // ============================================================================
  // Step 4: Review & Submit Handlers
  // ============================================================================

  const handleReviewBack = useCallback(() => {
    setCurrentStep('item');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedProject) {
      setError('No project selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (isNewDoc) {
        // Create new document with first item
        const slug = slugify(selectedProject.name);
        const docId = generateDocId(slug, clock.now());

        const newDoc: RequestLogDoc = {
          doc_id: docId,
          title: draft.title,
          project_id: selectedProject.id,
          items: [
            {
              id: `${docId}-01`,
              title: draft.title,
              type: draft.type,
              domain: draft.domain,
              context: draft.context,
              priority: draft.priority,
              status: draft.status,
              tags: draft.tags,
              notes: draft.notes,
              created_at: clock.now(),
            },
          ],
          items_index: [
            {
              id: `${docId}-01`,
              type: draft.type,
              title: draft.title,
            },
          ],
          tags: [...draft.tags].sort(),
          item_count: 1,
          created_at: clock.now(),
          updated_at: clock.now(),
        };

        await docStore.write(docPath, newDoc);
      } else {
        // Append to existing document
        await docStore.append(docPath, draft, clock);
      }

      // Success!
      setSubmitSuccess(true);
      setBatchingMode(true);
    } catch (err) {
      console.error('Failed to submit request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProject, isNewDoc, docPath, draft, clock, docStore]);

  const handleAddAnother = useCallback(() => {
    // Reset only the item draft, keep project and doc locked
    setDraft(EMPTY_DRAFT);
    setSubmitSuccess(false);
    setIsNewDoc(false); // All subsequent items append to existing doc
    // Remove review from completed steps since we're going back to item
    setCompletedSteps((prev) => prev.filter((idx) => idx !== STEP_INDEX_MAP.review));
    setCurrentStep('item');
  }, []);

  // handleDone is implicitly called via ReviewStep's "Done" button
  // which triggers window.location.reload() directly in ReviewStep

  // ============================================================================
  // Render Current Step
  // ============================================================================

  if (error) {
    return (
      <div className="wizard-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button type="button" className="button primary" onClick={() => setError(null)}>
          Dismiss
        </button>
      </div>
    );
  }

  const currentStepIndex = STEP_INDEX_MAP[currentStep];

  switch (currentStep) {
    case 'project':
      return (
        <>
          <StepProgress
            steps={STEP_LABELS}
            currentStep={currentStepIndex}
            completedSteps={completedSteps}
          />
          <ProjectStep
            projects={projects}
            selectedProjectId={selectedProject?.id || null}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onNext={handleProjectNext}
            isLoading={isLoading}
          />
        </>
      );

    case 'doc':
      return (
        <>
          <StepProgress
            steps={STEP_LABELS}
            currentStep={currentStepIndex}
            completedSteps={completedSteps}
          />
          <DocStep
            projectPath={selectedProject?.default_path || ''}
            existingDocs={existingDocs}
            selectedDocPath={selectedDocPath}
            onSelectDoc={handleSelectDoc}
            onPathOverride={handlePathOverride}
            docPath={docPath}
            onBack={handleDocBack}
            onNext={handleDocNext}
            isLoading={isLoading}
          />
        </>
      );

    case 'item':
      return (
        <>
          <StepProgress
            steps={STEP_LABELS}
            currentStep={currentStepIndex}
            completedSteps={completedSteps}
          />
          <ItemStep
            draft={draft}
            onDraftChange={handleDraftChange}
            fieldOptions={fieldOptions}
            onAddFieldOption={handleAddFieldOption}
            onBack={handleItemBack}
            onNext={handleItemNext}
            isLoading={isLoading}
          />
        </>
      );

    case 'review': {
      if (!selectedProject) {
        // Safety check - should never happen, but TypeScript needs it
        // Reset to project step and return loading placeholder
        setTimeout(() => setCurrentStep('project'), 0);
        return (
          <div className="wizard-error">
            <p>Loading...</p>
          </div>
        );
      }

      return (
        <>
          <StepProgress
            steps={STEP_LABELS}
            currentStep={currentStepIndex}
            completedSteps={completedSteps}
          />
          <ReviewStep
            project={selectedProject}
            docPath={docPath}
            isNewDoc={isNewDoc}
            draft={draft}
            onBack={handleReviewBack}
            onSubmit={handleSubmit}
            onAddAnother={handleAddAnother}
            isSubmitting={isSubmitting}
            submitSuccess={submitSuccess}
          />
        </>
      );
    }

    default: {
      return (
        <div className="wizard-error">
          <h2>Unknown Step</h2>
          <p>An unexpected error occurred</p>
        </div>
      );
    }
  }
}

export default WizardFlow;
