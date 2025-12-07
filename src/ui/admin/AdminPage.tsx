/**
 * AdminPage Component
 *
 * Main admin container for managing field options.
 * Provides scope selection (global vs project) and tabbed navigation
 * between different field groups.
 */

import React, { useState, useCallback } from 'react';
import type { Project } from '@core/models';
import './admin.css';

interface AdminPageProps {
  /** All available projects */
  projects: Project[];
  /** Current scope: 'global' or project ID */
  selectedScope: 'global' | string;
  /** Called when scope changes */
  onScopeChange: (scope: 'global' | string) => void;
  /** Content area for active tab */
  children: React.ReactNode;
}

type ScopeMode = 'global' | 'project';

export function AdminPage({
  projects,
  selectedScope,
  onScopeChange,
  children,
}: AdminPageProps): React.JSX.Element {
  const [scopeMode, setScopeMode] = useState<ScopeMode>(
    selectedScope === 'global' ? 'global' : 'project'
  );

  const handleScopeModeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newMode = event.target.value as ScopeMode;
      setScopeMode(newMode);

      if (newMode === 'global') {
        onScopeChange('global');
      } else {
        // Switch to first enabled project or stay on current if project mode
        const currentIsProject = selectedScope !== 'global';
        if (currentIsProject) {
          onScopeChange(selectedScope);
        } else {
          const firstProject = projects.find((p) => p.enabled);
          if (firstProject) {
            onScopeChange(firstProject.id);
          }
        }
      }
    },
    [selectedScope, onScopeChange, projects]
  );

  const handleProjectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onScopeChange(event.target.value);
    },
    [onScopeChange]
  );

  const enabledProjects = projects.filter((p) => p.enabled);
  const selectedProject =
    selectedScope !== 'global' ? projects.find((p) => p.id === selectedScope) : null;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-title">Field Options Manager</h1>
        <p className="admin-subtitle">
          Manage dropdown options for types, domains, contexts, priorities, statuses, and tags
        </p>
      </header>

      <div className="admin-scope-selector glass">
        <div className="scope-mode-selector">
          <label htmlFor="scope-mode" className="scope-label">
            Scope:
          </label>
          <select
            id="scope-mode"
            className="input-base select-base"
            value={scopeMode}
            onChange={handleScopeModeChange}
            aria-label="Select scope mode"
          >
            <option value="global">Global</option>
            <option value="project">Project-specific</option>
          </select>
        </div>

        {scopeMode === 'project' && (
          <div className="project-selector">
            <label htmlFor="project-select" className="scope-label">
              Project:
            </label>
            <select
              id="project-select"
              className="input-base select-base"
              value={selectedScope !== 'global' ? selectedScope : ''}
              onChange={handleProjectChange}
              disabled={enabledProjects.length === 0}
              aria-label="Select project"
            >
              {enabledProjects.length === 0 ? (
                <option value="">No projects available</option>
              ) : (
                enabledProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {scopeMode === 'project' && selectedProject && (
          <div className="scope-info">
            <span className="scope-info-label">Path:</span>
            <code className="scope-info-value">{selectedProject.default_path}</code>
          </div>
        )}
      </div>

      <div className="admin-content">{children}</div>
    </div>
  );
}

export default AdminPage;
