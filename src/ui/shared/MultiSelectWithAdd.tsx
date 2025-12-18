/**
 * MultiSelectWithAdd Component (Tags Input)
 *
 * Modern tags input component with inline search/filter.
 * Shows selected tags as removable badges above the input.
 * Provides filtered suggestions dropdown with "Create new" option.
 * Enhanced with tooltip and helper text support.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  placeholder = 'Add tags...',
  label,
  error,
  helperText,
  tooltip,
}: MultiSelectWithAddProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search query and exclude already selected
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return options.filter((opt) => !values.includes(opt.id));
    }
    return options.filter(
      (opt) => !values.includes(opt.id) && opt.label.toLowerCase().includes(query)
    );
  }, [options, values, searchQuery]);

  // Check if search query exactly matches an existing option
  const exactMatch = useMemo(() => {
    const query = searchQuery.trim();
    return options.some((opt) => opt.label.toLowerCase() === query.toLowerCase());
  }, [options, searchQuery]);

  // Get selected option objects
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => values.includes(opt.id));
  }, [options, values]);

  // Handle input change - filter options
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setIsOpen(true);
  }, []);

  // Handle input focus - show dropdown
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Handle selecting an option
  const handleSelectOption = useCallback(
    (optionId: string) => {
      onChange([...values, optionId]);
      setSearchQuery('');
      setIsOpen(true); // Keep open for multiple selections
      inputRef.current?.focus();
    },
    [values, onChange]
  );

  // Handle removing a tag
  const handleRemoveTag = useCallback(
    (valueId: string) => {
      onChange(values.filter((id) => id !== valueId));
      inputRef.current?.focus();
    },
    [values, onChange]
  );

  // Handle creating a new tag
  const handleCreateTag = useCallback(async () => {
    const newValue = searchQuery.trim();
    if (!newValue || exactMatch) {
      return;
    }

    setIsCreating(true);
    try {
      await onAddNew(newValue);
      setSearchQuery('');
      setIsOpen(true); // Keep open after creation
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add new tag:', error);
    } finally {
      setIsCreating(false);
    }
  }, [searchQuery, exactMatch, onAddNew]);

  // Handle keyboard navigation
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && searchQuery.trim() && !exactMatch) {
        event.preventDefault();
        handleCreateTag();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
      } else if (event.key === 'Backspace' && !searchQuery && values.length > 0) {
        // Remove last tag on backspace when input is empty
        event.preventDefault();
        onChange(values.slice(0, -1));
      }
    },
    [searchQuery, exactMatch, values, onChange, handleCreateTag]
  );

  return (
    <div className="field-container">
      {/* Label with optional tooltip */}
      <div className="form-field-label-row">
        <label className="field-label" htmlFor={`tags-input-${label}`}>
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
        <div className="form-field-helper" id={`tags-input-${label}-helper`}>
          {helperText}
        </div>
      )}

      <div className="tags-input-container" ref={containerRef}>
        {/* Selected tags as badges */}
        {selectedOptions.length > 0 && (
          <div className="tags-badges" role="list" aria-label="Selected tags">
            {selectedOptions.map((option) => (
              <div key={option.id} className="tag-badge" role="listitem">
                <span aria-label={`Selected: ${option.label}`}>{option.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(option.id)}
                  aria-label={`Remove ${option.label}`}
                  title={`Remove ${option.label}`}
                  disabled={isCreating}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input with dropdown */}
        <div className="tags-input-wrapper">
          <input
            ref={inputRef}
            id={`tags-input-${label}`}
            type="text"
            className="input-base tags-search-input"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={isCreating}
            aria-label={label}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-describedby={helperText ? `tags-input-${label}-helper` : undefined}
            autoComplete="off"
          />

          {/* Dropdown content */}
          {isOpen && (filteredOptions.length > 0 || (searchQuery.trim() && !exactMatch)) && (
            <div
              className="tags-popover-content"
              role="listbox"
              aria-label={`${label} suggestions`}
            >
              {/* Filtered options */}
              {filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className="tags-popover-option"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelectOption(option.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectOption(option.id);
                    }
                  }}
                  tabIndex={0}
                >
                  <span>{option.label}</span>
                </div>
              ))}

              {/* Create new option if query doesn't match */}
              {searchQuery.trim() && !exactMatch && (
                <button
                  type="button"
                  className="tags-popover-create"
                  onClick={handleCreateTag}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                  disabled={isCreating}
                  aria-label={`Create new tag: ${searchQuery.trim()}`}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner" /> Creating...
                    </>
                  ) : (
                    <>Create "{searchQuery.trim()}"</>
                  )}
                </button>
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
