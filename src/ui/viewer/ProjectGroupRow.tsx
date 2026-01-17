/**
 * ProjectGroupRow Component
 *
 * Collapsible header row for project groups in the catalog table.
 * Displays project name, document count, and progress indicator with expand/collapse control.
 *
 * Features:
 * - Collapsible project section
 * - Document count badge
 * - Progress indicator showing done/total items
 * - Chevron indicator for expand/collapse state
 * - Keyboard accessible (Enter to toggle)
 * - Glass/x-morphism styling for visual hierarchy
 */

import React from 'react';
import type { ProjectInfo } from '@core/catalog';
import type { RequestLogDoc } from '@core/models';
import { ProjectProgressIndicator } from './components';

export interface ProjectGroupRowProps {
  /** Project metadata */
  project: ProjectInfo;

  /** Number of documents in this project */
  documentCount: number;

  /** Array of loaded documents for progress calculation */
  documents: RequestLogDoc[];

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
 * Memoized to prevent unnecessary re-renders when parent state changes
 * but this component's props remain the same.
 *
 * @param props - ProjectGroupRowProps
 * @returns ProjectGroupRow component
 */
export const ProjectGroupRow = React.memo(function ProjectGroupRow({
  project,
  documentCount,
  documents,
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
      <td colSpan={8} className="viewer-project-header" role="cell">
        <div className="project-header-content">
          {/* Left side: Chevron and Project Name */}
          <div className="project-header-left">
            {/* Chevron Icon */}
            <span className="project-chevron" aria-hidden="true">
              {isExpanded ? '▼' : '▶'}
            </span>

            {/* Project Name */}
            <h3 className="project-name">{project.name}</h3>
          </div>

          {/* Right side: Indicators */}
          <div className="project-header-indicators">
            {/* Document Count Badge */}
            <span className="project-count-badge" aria-label={`${documentCount} documents`}>
              {documentCount}
            </span>

            {/* Project Progress Indicator */}
            {documents.length > 0 && <ProjectProgressIndicator documents={documents} />}
          </div>
        </div>
      </td>
    </tr>
  );
});

export default ProjectGroupRow;
