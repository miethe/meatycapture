/**
 * DropdownWithAdd Component
 *
 * A select dropdown with an inline "+ Add new..." option.
 * When selected, shows a mini-form to add a new option.
 * Enhanced with tooltip and helper text support.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Tooltip } from './Tooltip';
import './shared.css';

interface DropdownOption {
  id: string;
  label: string;
}

interface DropdownWithAddProps {
  /** Array of available options */
  options: DropdownOption[];
  /** Currently selected value ID */
  value: string | null;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Called when user adds a new option - returns the new option's ID */
  onAddNew: (value: string) => Promise<void>;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Field label */
  label: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Optional error message */
  error?: string;
  /** Helper text explaining the field's purpose */
  helperText?: string;
  /** Tooltip content for contextual help */
  tooltip?: string;
}

const ADD_NEW_ID = '__add_new__';

export function DropdownWithAdd({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = 'Select an option...',
  label,
  disabled = false,
  required = false,
  error,
  helperText,
  tooltip,
}: DropdownWithAddProps): React.JSX.Element {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = event.target.value;

      if (selectedValue === ADD_NEW_ID) {
        setIsAdding(true);
      } else {
        onChange(selectedValue);
      }
    },
    [onChange]
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
      // Keep the form open on error so user can retry
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

  return (
    <div className="field-container">
      {/* Label with optional tooltip */}
      <div className="form-field-label-row">
        <label className={`field-label ${required ? 'required' : ''}`} htmlFor={`dropdown-${label}`}>
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
        <div className="form-field-helper" id={`dropdown-${label}-helper`}>
          {helperText}
        </div>
      )}

      <div className="dropdown-container">
        <select
          id={`dropdown-${label}`}
          className={`input-base select-base ${error ? 'error' : ''}`}
          value={isAdding ? ADD_NEW_ID : value || ''}
          onChange={handleSelectChange}
          disabled={disabled || isAdding}
          required={required}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `dropdown-${label}-error` : undefined}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
          <option value={ADD_NEW_ID}>+ Add new...</option>
        </select>

        {isAdding && (
          <div className="dropdown-inline-form" role="form" aria-label="Add new option">
            <input
              ref={inputRef}
              type="text"
              className="input-base"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Enter new value..."
              disabled={isLoading}
              aria-label="New option value"
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

      {error && (
        <div className="error-message" id={`dropdown-${label}-error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default DropdownWithAdd;
