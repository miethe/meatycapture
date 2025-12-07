/**
 * FieldGroupTab Component
 *
 * Tab content for managing options within a single field group.
 * Shows global options (greyed in project view) and project-specific options.
 * Provides add/remove functionality with scope-aware controls.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { FieldName, FieldOption } from '@core/models';
import './admin.css';

interface FieldGroupTabProps {
  /** Field name (type, domain, context, priority, status, tags) */
  field: FieldName;
  /** Options for the current scope */
  options: FieldOption[];
  /** Global options (shown greyed in project view) */
  globalOptions?: FieldOption[];
  /** Current scope: 'global' or project ID */
  scope: 'global' | string;
  /** Called when user adds a new option */
  onAddOption: (value: string) => Promise<void>;
  /** Called when user removes an option */
  onRemoveOption: (id: string) => Promise<void>;
  /** Called when user enables a global option for project */
  onEnableForProject?: (globalOptionId: string) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

export function FieldGroupTab({
  field,
  options,
  globalOptions = [],
  scope,
  onAddOption,
  onRemoveOption,
  onEnableForProject,
  isLoading = false,
}: FieldGroupTabProps): React.JSX.Element {
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addingOptionId, setAddingOptionId] = useState<string | null>(null);
  const [removingOptionId, setRemovingOptionId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isProjectScope = scope !== 'global';

  // Focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddOption = useCallback(async () => {
    if (!newValue.trim()) {
      return;
    }

    setAddingOptionId('new');
    try {
      await onAddOption(newValue.trim());
      setNewValue('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add option:', error);
      // Keep form open on error
    } finally {
      setAddingOptionId(null);
    }
  }, [newValue, onAddOption]);

  const handleRemoveOption = useCallback(
    async (id: string) => {
      setRemovingOptionId(id);
      try {
        await onRemoveOption(id);
      } catch (error) {
        console.error('Failed to remove option:', error);
      } finally {
        setRemovingOptionId(null);
      }
    },
    [onRemoveOption]
  );

  const handleEnableForProject = useCallback(
    async (globalOptionId: string) => {
      if (!onEnableForProject) return;

      setAddingOptionId(globalOptionId);
      try {
        await onEnableForProject(globalOptionId);
      } catch (error) {
        console.error('Failed to enable option for project:', error);
      } finally {
        setAddingOptionId(null);
      }
    },
    [onEnableForProject]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAddOption();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setNewValue('');
        setIsAdding(false);
      }
    },
    [handleAddOption]
  );

  // Filter out global options that are already enabled for this project
  const projectOptionValues = new Set(options.map((o) => o.value.toLowerCase()));
  const availableGlobalOptions = isProjectScope
    ? globalOptions.filter((go) => !projectOptionValues.has(go.value.toLowerCase()))
    : [];

  const hasOptions = options.length > 0 || availableGlobalOptions.length > 0;

  return (
    <div className="field-group-tab">
      <div className="field-group-header">
        <h2 className="field-group-title">
          {field.charAt(0).toUpperCase() + field.slice(1)} Options
        </h2>
        <p className="field-group-description">
          {isProjectScope
            ? `Manage ${field} options for this project. Global options can be enabled for the project.`
            : `Manage global ${field} options available to all projects.`}
        </p>
      </div>

      <div className="field-options-list">
        {!hasOptions && (
          <div className="empty-state">
            <p>No options defined yet. Add your first option below.</p>
          </div>
        )}

        {/* Project-specific options */}
        {options.map((option) => (
          <div
            key={option.id}
            className={`option-card glass ${option.scope === 'global' ? 'global-option' : ''}`}
          >
            <div className="option-content">
              <span className="option-value">{option.value}</span>
              {option.scope === 'global' && (
                <span className="option-badge" aria-label="Global option">
                  Global
                </span>
              )}
            </div>
            <div className="option-actions">
              {option.scope !== 'global' && (
                <button
                  type="button"
                  className="button small secondary"
                  onClick={() => handleRemoveOption(option.id)}
                  disabled={removingOptionId === option.id || isLoading}
                  aria-label={`Remove ${option.value}`}
                >
                  {removingOptionId === option.id ? (
                    <span className="spinner" />
                  ) : (
                    <span aria-hidden="true">×</span>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Available global options in project view */}
        {isProjectScope &&
          availableGlobalOptions.map((option) => (
            <div key={option.id} className="option-card glass global-option greyed">
              <div className="option-content">
                <span className="option-value">{option.value}</span>
                <span className="option-badge" aria-label="Global option">
                  Global
                </span>
              </div>
              <div className="option-actions">
                {onEnableForProject && (
                  <button
                    type="button"
                    className="button small primary"
                    onClick={() => handleEnableForProject(option.id)}
                    disabled={addingOptionId === option.id || isLoading}
                    aria-label={`Enable ${option.value} for project`}
                  >
                    {addingOptionId === option.id ? (
                      <span className="spinner" />
                    ) : (
                      'Enable for project'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Add new option form */}
      <div className="add-option-section">
        {!isAdding ? (
          <button
            type="button"
            className="button primary"
            onClick={() => setIsAdding(true)}
            disabled={isLoading}
            aria-label={`Add new ${field} option`}
          >
            + Add new {field} option
          </button>
        ) : (
          <div className="add-option-form glass">
            <input
              ref={inputRef}
              type="text"
              className="input-base"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter new ${field} value...`}
              disabled={addingOptionId === 'new'}
              aria-label={`New ${field} option value`}
            />
            <button
              type="button"
              className="button small primary"
              onClick={handleAddOption}
              disabled={!newValue.trim() || addingOptionId === 'new'}
              aria-label="Confirm add"
            >
              {addingOptionId === 'new' ? <span className="spinner" /> : 'Add'}
            </button>
            <button
              type="button"
              className="button small secondary"
              onClick={() => {
                setNewValue('');
                setIsAdding(false);
              }}
              disabled={addingOptionId === 'new'}
              aria-label="Cancel add"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FieldGroupTab;
