/**
 * MultiSelectWithAdd Component
 *
 * Multi-select component for tags with Add+ capability.
 * Shows selected values as removable chips and provides suggestions dropdown.
 * Enhanced with tooltip and helper text support.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Tooltip } from './Tooltip';
import './shared.css';

interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectWithAddProps {
  /** Array of available options */
  options: MultiSelectOption[];
  /** Currently selected value IDs */
  values: string[];
  /** Called when selection changes */
  onChange: (values: string[]) => void;
  /** Called when user adds a new option */
  onAddNew: (value: string) => Promise<void>;
  /** Placeholder text when no options shown */
  placeholder?: string;
  /** Field label */
  label: string;
  /** Optional error message */
  error?: string;
  /** Helper text explaining the field's purpose */
  helperText?: string;
  /** Tooltip content for contextual help */
  tooltip?: string;
}

export function MultiSelectWithAdd({
  options,
  values,
  onChange,
  onAddNew,
  placeholder = 'Select tags...',
  label,
  error,
  helperText,
  tooltip,
}: MultiSelectWithAddProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setNewValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const toggleOption = useCallback(
    (optionId: string) => {
      if (values.includes(optionId)) {
        onChange(values.filter((id) => id !== optionId));
      } else {
        onChange([...values, optionId]);
      }
    },
    [values, onChange]
  );

  const removeValue = useCallback(
    (valueId: string) => {
      onChange(values.filter((id) => id !== valueId));
    },
    [values, onChange]
  );

  const handleConfirmAdd = useCallback(async () => {
    if (!newValue.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onAddNew(newValue.trim());
      setNewValue('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add new option:', error);
    } finally {
      setIsLoading(false);
    }
  }, [newValue, onAddNew]);

  const handleCancelAdd = useCallback(() => {
    setNewValue('');
    setIsAdding(false);
  }, []);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleConfirmAdd();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancelAdd();
      }
    },
    [handleConfirmAdd, handleCancelAdd]
  );

  const selectedOptions = options.filter((opt) => values.includes(opt.id));

  return (
    <div className="field-container">
      {/* Label with optional tooltip */}
      <div className="form-field-label-row">
        <label className="field-label" htmlFor={`multiselect-${label}`}>
          {label}
        </label>
        {tooltip && (
          <Tooltip content={tooltip} position="right">
            <button
              type="button"
              className="tooltip-trigger"
              aria-label={`Help for ${label}`}
              tabIndex={0}
            >
              ?
            </button>
          </Tooltip>
        )}
      </div>

      {/* Helper text */}
      {helperText && !error && (
        <div className="form-field-helper" id={`multiselect-${label}-helper`}>
          {helperText}
        </div>
      )}

      <div className="multiselect-container" ref={containerRef}>
        {/* Selected chips */}
        {selectedOptions.length > 0 && (
          <div className="multiselect-chips" role="list" aria-label="Selected tags">
            {selectedOptions.map((option) => (
              <div key={option.id} className="chip" role="listitem">
                <span aria-label={`Selected: ${option.label}`}>{option.label}</span>
                <button
                  type="button"
                  onClick={() => removeValue(option.id)}
                  aria-label={`Remove ${option.label}`}
                  title={`Remove ${option.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropdown trigger */}
        <div className="multiselect-dropdown">
          <button
            id={`multiselect-${label}`}
            type="button"
            className="input-base select-base"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-label={label}
            style={{ width: '100%', textAlign: 'left' }}
          >
            {selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selected`}
          </button>

          {/* Options dropdown */}
          {isOpen && (
            <div className="multiselect-options" role="listbox" aria-label={`${label} options`}>
              {/* Existing options */}
              {options.map((option) => {
                const isSelected = values.includes(option.id);
                return (
                  <div
                    key={option.id}
                    className={`multiselect-option ${isSelected ? 'selected' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleOption(option.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleOption(option.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${option.label}${isSelected ? ', selected' : ''}`}
                  >
                    <div className={`multiselect-checkbox ${isSelected ? 'checked' : ''}`} aria-hidden="true">
                      {isSelected && '✓'}
                    </div>
                    <span>{option.label}</span>
                  </div>
                );
              })}

              {/* Add new option */}
              {!isAdding ? (
                <div
                  className="multiselect-option"
                  role="option"
                  onClick={() => setIsAdding(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsAdding(true);
                    }
                  }}
                  tabIndex={0}
                  style={{ fontStyle: 'italic' }}
                >
                  + Add new...
                </div>
              ) : (
                <div
                  className="dropdown-inline-form"
                  role="form"
                  aria-label="Add new option"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    className="input-base"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Enter new tag..."
                    disabled={isLoading}
                    aria-label="New tag value"
                  />
                  <button
                    type="button"
                    className="button small primary"
                    onClick={handleConfirmAdd}
                    disabled={!newValue.trim() || isLoading}
                    aria-label="Confirm add"
                  >
                    {isLoading ? <span className="spinner" /> : 'Add'}
                  </button>
                  <button
                    type="button"
                    className="button small secondary"
                    onClick={handleCancelAdd}
                    disabled={isLoading}
                    aria-label="Cancel add"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default MultiSelectWithAdd;
