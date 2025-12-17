/**
 * ProjectGroupRow Component
 *
 * Collapsible header row for project groups in the catalog table.
 * Displays project name and document count with expand/collapse control.
 *
 * Features:
 * - Collapsible project section
 * - Document count badge
 * - Chevron indicator for expand/collapse state
 * - Keyboard accessible (Enter to toggle)
 * - Glass/x-morphism styling for visual hierarchy
 */

import React from 'react';
import type { ProjectInfo } from '@core/catalog';

export interface ProjectGroupRowProps {
  /** Project metadata */
  project: ProjectInfo;

  /** Number of documents in this project */
  documentCount: number;

  /** Whether this project group is expanded */
  isExpanded: boolean;

  /** Toggle expansion state */
  onToggle: () => void;
}

/**
 * ProjectGroupRow Component
 *
 * Header row for a project group in the catalog.
 * Allows collapsing/expanding the project's documents.
 *
 * @param props - ProjectGroupRowProps
 * @returns ProjectGroupRow component
 */
export function ProjectGroupRow({
  project,
  documentCount,
  isExpanded,
  onToggle,
}: ProjectGroupRowProps): React.JSX.Element {
  /**
   * Handle keyboard navigation
   * Enter/Space toggles expansion
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <tr
      className="viewer-project-group"
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="row"
      aria-expanded={isExpanded}
      aria-label={`Project ${project.name} with ${documentCount} document${documentCount !== 1 ? 's' : ''}`}
    >
      <td colSpan={6} className="viewer-project-header" role="cell">
        <div className="project-header-content">
          {/* Chevron Icon */}
          <span className="project-chevron" aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </span>

          {/* Project Name */}
          <h3 className="project-name">{project.name}</h3>

          {/* Document Count Badge */}
          <span className="project-count-badge" aria-label={`${documentCount} documents`}>
            {documentCount}
          </span>
        </div>
      </td>
    </tr>
  );
}

export default ProjectGroupRow;
