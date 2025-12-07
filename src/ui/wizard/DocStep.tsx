/**
 * DocStep Component
 *
 * Second step of the capture wizard for selecting or creating a request-log document.
 * Allows user to either create a new document or add items to an existing one.
 */

import React, { useState } from 'react';
import type { RequestLogDoc } from '@core/models';
import { StepShell } from '../shared/StepShell';
import { PathField } from '../shared/PathField';
import '../shared/shared.css';
import './wizard.css';
import '../../index.css';

interface DocStepProps {
  /** Default path from selected project */
  projectPath: string;
  /** List of existing request-log docs */
  existingDocs: RequestLogDoc[];
  /** null = new doc, string = existing doc path */
  selectedDocPath: string | null;
  /** Called when doc selection changes */
  onSelectDoc: (path: string | null) => void;
  /** Called when custom path is provided */
  onPathOverride: (path: string) => void;
  /** Current doc path (auto-generated or overridden) */
  docPath: string;
  /** Called when Back button is clicked */
  onBack: () => void;
  /** Called when Next button is clicked */
  onNext: () => void;
  /** Loading state while fetching docs */
  isLoading?: boolean;
}

type DocMode = 'new' | 'existing';

export function DocStep({
  projectPath,
  existingDocs,
  selectedDocPath,
  onSelectDoc,
  onPathOverride,
  docPath,
  onBack,
  onNext,
  isLoading = false,
}: DocStepProps): React.JSX.Element {
  const [mode, setMode] = useState<DocMode>(selectedDocPath ? 'existing' : 'new');
  const [showPathOverride, setShowPathOverride] = useState(false);

  const handleModeChange = (newMode: DocMode) => {
    setMode(newMode);
    if (newMode === 'new') {
      onSelectDoc(null);
      setShowPathOverride(false);
    } else {
      // Clear selection when switching to existing mode
      onSelectDoc(null);
    }
  };

  const handleDocSelect = (doc: RequestLogDoc) => {
    const docFilePath = `${projectPath}/${doc.doc_id}.md`;
    onSelectDoc(docFilePath);
  };

  const handlePathOverrideToggle = () => {
    setShowPathOverride(!showPathOverride);
  };

  const isNextDisabled =
    isLoading || (mode === 'new' && !docPath) || (mode === 'existing' && !selectedDocPath);

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <StepShell
      title="Select Document"
      subtitle="Create a new request log or add to an existing one"
      stepNumber={2}
      totalSteps={4}
      onBack={onBack}
      onNext={onNext}
      nextDisabled={isNextDisabled}
      showBack={true}
    >
      {isLoading ? (
        <div className="doc-step-loading">
          <span className="spinner" />
          <span className="loading-text">Loading documents...</span>
        </div>
      ) : (
        <>
          {/* Mode Selection */}
          <fieldset className="doc-mode-selection" role="radiogroup" aria-label="Document mode">
            <legend className="sr-only">Select document mode</legend>
            <label htmlFor="doc-mode-new" className="doc-mode-option">
              <input
                id="doc-mode-new"
                type="radio"
                name="doc-mode"
                value="new"
                checked={mode === 'new'}
                onChange={() => handleModeChange('new')}
                aria-label="Create new document"
              />
              <span className="doc-mode-label">Create new document</span>
            </label>

            <label htmlFor="doc-mode-existing" className="doc-mode-option">
              <input
                id="doc-mode-existing"
                type="radio"
                name="doc-mode"
                value="existing"
                checked={mode === 'existing'}
                onChange={() => handleModeChange('existing')}
                aria-label="Add to existing document"
              />
              <span className="doc-mode-label">Add to existing document</span>
            </label>
          </fieldset>

          {/* New Document Mode */}
          {mode === 'new' && (
            <div className="doc-new-section">
              <div className="doc-path-display">
                <label className="field-label">Document path</label>
                <div className="auto-generated-path">
                  <code>{docPath}</code>
                </div>
                <div className="path-info">Auto-generated based on current date and project</div>
              </div>

              <div className="path-override-toggle">
                <label htmlFor="path-override-checkbox">
                  <input
                    id="path-override-checkbox"
                    type="checkbox"
                    checked={showPathOverride}
                    onChange={handlePathOverrideToggle}
                    aria-label="Override automatic path"
                  />
                  <span className="toggle-label">Override path</span>
                </label>
              </div>

              {showPathOverride && (
                <PathField
                  label="Custom path"
                  value={docPath}
                  onChange={onPathOverride}
                  placeholder="/path/to/custom-doc.md"
                  required={false}
                />
              )}
            </div>
          )}

          {/* Existing Document Mode */}
          {mode === 'existing' && (
            <div className="doc-existing-section">
              {existingDocs.length === 0 ? (
                <div className="doc-empty-state">
                  <p className="empty-state-message">
                    No existing request-log documents found in this project.
                  </p>
                  <p className="empty-state-hint">
                    Switch to "Create new document" to get started.
                  </p>
                </div>
              ) : (
                <div className="doc-list">
                  {existingDocs.map((doc) => {
                    const docFilePath = `${projectPath}/${doc.doc_id}.md`;
                    const isSelected = selectedDocPath === docFilePath;

                    return (
                      <button
                        key={doc.doc_id}
                        type="button"
                        className={`doc-list-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleDocSelect(doc)}
                        aria-label={`Select document ${doc.doc_id}`}
                        aria-pressed={isSelected}
                      >
                        <div className="doc-item-header">
                          <span className="doc-item-id">{doc.doc_id}</span>
                          {isSelected && (
                            <span className="doc-item-badge" aria-label="Selected">
                              Selected
                            </span>
                          )}
                        </div>
                        <h3 className="doc-item-title">{doc.title}</h3>
                        <div className="doc-item-meta">
                          <span className="doc-item-count">
                            {doc.item_count} {doc.item_count === 1 ? 'item' : 'items'}
                          </span>
                          <span className="doc-item-separator">•</span>
                          <span className="doc-item-date">
                            Updated {formatDate(doc.updated_at)}
                          </span>
                        </div>
                        {doc.tags.length > 0 && (
                          <div className="doc-item-tags">
                            {doc.tags.slice(0, 5).map((tag) => (
                              <span key={tag} className="chip">
                                {tag}
                              </span>
                            ))}
                            {doc.tags.length > 5 && (
                              <span className="tag-overflow">+{doc.tags.length - 5} more</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </StepShell>
  );
}

export default DocStep;
