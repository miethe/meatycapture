/**
 * ProjectStep Component
 *
 * First step of the capture wizard - select or create a project.
 * Uses DropdownWithAdd for project selection and modal for project creation.
 */

import React, { useState, useCallback } from 'react';
import type { Project } from '../../core/models';
import { generateDefaultProjectPath } from '../../core/validation';
import { DropdownWithAdd } from '../shared/DropdownWithAdd';
import { StepShell } from '../shared/StepShell';
import { PathField } from '../shared/PathField';
import { useFocusTrap } from '../shared/useFocusTrap';
import './wizard.css';

interface ProjectStepProps {
  /** List of available projects */
  projects: Project[];
  /** Currently selected project ID */
  selectedProjectId: string | null;
  /** Called when user selects a project */
  onSelectProject: (projectId: string) => void;
  /** Called when user creates a new project */
  onCreateProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project>;
  /** Called when user clicks Next button */
  onNext: () => void;
  /** Whether a background operation is in progress */
  isLoading?: boolean;
}

interface NewProjectForm {
  name: string;
  default_path: string;
  repo_url: string;
  enabled: boolean;
}

const DEFAULT_FORM_STATE: NewProjectForm = {
  name: '',
  default_path: '',
  repo_url: '',
  enabled: true,
};

export function ProjectStep({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onNext,
  isLoading = false,
}: ProjectStepProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<NewProjectForm>(DEFAULT_FORM_STATE);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewProjectForm, string>>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const modalRef = useFocusTrap<HTMLDivElement>(isModalOpen);

  // Convert projects to dropdown options
  const projectOptions = projects
    .filter((p) => p.enabled)
    .map((p) => ({
      id: p.id,
      label: p.name,
    }));

  // Handle opening the "Add new" modal
  const handleAddNew = useCallback(async (name: string) => {
    const pathPattern = import.meta.env.MEATYCAPTURE_DEFAULT_PROJECT_PATH || '~/projects/{name}';
    const defaultPath = generateDefaultProjectPath(pathPattern, name);

    setIsModalOpen(true);
    setFormData({
      ...DEFAULT_FORM_STATE,
      name: name,
      default_path: defaultPath,
    });
    setFormErrors({});
    setCreateError(null);
  }, []);

  // Validate form data
  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof NewProjectForm, string>> = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    }

    if (!formData.default_path.trim()) {
      errors.default_path = 'Default path is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleCreateProject = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'> = {
        name: formData.name.trim(),
        default_path: formData.default_path.trim(),
        enabled: formData.enabled,
      };

      // Only add repo_url if it's not empty
      const repoUrl = formData.repo_url.trim();
      if (repoUrl) {
        projectData.repo_url = repoUrl;
      }

      const newProject = await onCreateProject(projectData);

      // Auto-select the newly created project
      onSelectProject(newProject.id);

      // Close modal and reset form
      setIsModalOpen(false);
      setFormData(DEFAULT_FORM_STATE);
      setFormErrors({});
    } catch (error) {
      console.error('Failed to create project:', error);
      setCreateError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  }, [formData, validateForm, onCreateProject, onSelectProject]);

  // Handle modal cancel
  const handleCancelCreate = useCallback(() => {
    setIsModalOpen(false);
    setFormData(DEFAULT_FORM_STATE);
    setFormErrors({});
    setCreateError(null);
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback(
    (field: keyof NewProjectForm) => (value: string | boolean) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Clear error for this field when user starts typing
      if (formErrors[field]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [formErrors]
  );

  // Handle keyboard shortcuts in modal
  const handleModalKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) {
        handleCancelCreate();
      } else if (event.key === 'Enter' && event.metaKey && !isCreating) {
        handleCreateProject();
      }
    },
    [isCreating, handleCancelCreate, handleCreateProject]
  );

  return (
    <>
      <StepShell
        title="Select Project"
        subtitle="Choose an existing project or create a new one"
        stepNumber={1}
        totalSteps={4}
        onNext={onNext}
        nextDisabled={!selectedProjectId || isLoading}
        showBack={false}
      >
        <DropdownWithAdd
          label="Project"
          options={projectOptions}
          value={selectedProjectId}
          onChange={onSelectProject}
          onAddNew={handleAddNew}
          placeholder="Select a project..."
          required
        />
      </StepShell>

      {/* Add New Project Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={!isCreating ? handleCancelCreate : undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            ref={modalRef}
            className="modal-content glass"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
          >
            <div className="modal-header">
              <h2 id="modal-title" className="modal-title">
                Create New Project
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={handleCancelCreate}
                disabled={isCreating}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {/* Project Name */}
              <div className="field-container">
                <label className="field-label required" htmlFor="project-name">
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  className={`input-base ${formErrors.name ? 'error' : ''}`}
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name')(e.target.value)}
                  placeholder="My Awesome Project"
                  disabled={isCreating}
                  required
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'project-name-error' : undefined}
                  autoFocus
                />
                {formErrors.name && (
                  <div className="error-message" id="project-name-error" role="alert">
                    {formErrors.name}
                  </div>
                )}
              </div>

              {/* Default Path */}
              <PathField
                label="Default Path"
                value={formData.default_path}
                onChange={(value) => handleFieldChange('default_path')(value)}
                placeholder="~/projects/my-project"
                {...(formErrors.default_path ? { error: formErrors.default_path } : {})}
                required
                disabled={isCreating}
              />

              {/* Repository URL (optional) */}
              <div className="field-container">
                <label className="field-label" htmlFor="repo-url">
                  Repository URL (optional)
                </label>
                <input
                  id="repo-url"
                  type="url"
                  className="input-base"
                  value={formData.repo_url}
                  onChange={(e) => handleFieldChange('repo_url')(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  disabled={isCreating}
                />
              </div>

              {/* Enabled Checkbox */}
              <div className="field-container">
                <label htmlFor="project-enabled" className="checkbox-label">
                  <input
                    id="project-enabled"
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => handleFieldChange('enabled')(e.target.checked)}
                    disabled={isCreating}
                    aria-label="Enable project"
                  />
                  <span>Enable project</span>
                </label>
              </div>

              {/* Error Message */}
              {createError && (
                <div className="error-message" role="alert">
                  {createError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={handleCancelCreate}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                onClick={handleCreateProject}
                disabled={isCreating || !formData.name.trim() || !formData.default_path.trim()}
              >
                {isCreating ? <span className="spinner" /> : null}
                {isCreating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectStep;
