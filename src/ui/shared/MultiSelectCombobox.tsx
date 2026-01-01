/**
 * MultiSelectCombobox Component
 *
 * A reusable combobox for multi-select fields (Domain, Context, Tags).
 * Shows selected values as badges above the input field.
 * Supports filtering, keyboard navigation, and inline entry of new values.
 * Enhanced with accessibility features (WCAG 2.1 AA).
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Tooltip } from './Tooltip';
import './shared.css';

interface MultiSelectComboboxProps {
  /** Array of available options */
  options: string[];
  /** Currently selected values */
  selected: string[];
  /** Called when option selected */
  onSelect: (value: string) => void;
  /** Called when badge removed */
  onRemove: (value: string) => void;
  /** Called when new value added (inline entry) */
  onAdd: (value: string) => void;
  /** Input placeholder */
  placeholder?: string;
  /** Field label */
  label: string;
  /** Optional error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Tooltip content */
  tooltip?: string;
  /** Whether field is disabled */
  disabled?: boolean;
}

/**
 * MultiSelectCombobox - Accessible multi-select input with badges
 */
export function MultiSelectCombobox({
  options,
  selected,
  onSelect,
  onRemove,
  onAdd,
  placeholder = 'Type to search...',
  label,
  error,
  helperText,
  tooltip,
  disabled = false,
}: MultiSelectComboboxProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Generate unique IDs for accessibility
  const inputId = `multiselect-combobox-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const listboxId = `${inputId}-listbox`;
  const helperId = `${inputId}-helper`;
  const liveRegionId = `${inputId}-live`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear recently added highlight after animation
  useEffect(() => {
    if (recentlyAdded) {
      const timeout = setTimeout(() => setRecentlyAdded(null), 1500);
      return () => clearTimeout(timeout);
    }
  }, [recentlyAdded]);

  // Filter options based on search query and exclude already selected
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const unselected = options.filter((opt) => !selected.includes(opt));

    if (!query) {
      return unselected;
    }
    return unselected.filter((opt) => opt.toLowerCase().includes(query));
  }, [options, selected, searchQuery]);

  // Check if search query exactly matches an existing option (case-insensitive)
  const exactMatch = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true; // Empty query counts as match (don't show add option)
    return options.some((opt) => opt.toLowerCase() === query);
  }, [options, searchQuery]);

  // Check if search query matches an already selected option
  const isAlreadySelected = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return selected.some((opt) => opt.toLowerCase() === query);
  }, [selected, searchQuery]);

  // Calculate if "Add" option should be shown
  const showAddOption = searchQuery.trim() && !exactMatch && !isAlreadySelected;

  // Total navigable items (filtered options + add option if shown)
  const totalNavigableItems = filteredOptions.length + (showAddOption ? 1 : 0);

  // Handle input change - filter options
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  // Handle input focus - show dropdown
  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
    }
  }, [disabled]);

  // Handle selecting an option
  const handleSelectOption = useCallback(
    (option: string) => {
      if (disabled) return;

      onSelect(option);
      setSearchQuery('');
      setActiveIndex(-1);
      setIsOpen(true); // Keep open for multiple selections
      inputRef.current?.focus();
    },
    [onSelect, disabled]
  );

  // Handle removing a badge
  const handleRemoveBadge = useCallback(
    (value: string) => {
      if (disabled) return;

      onRemove(value);
      inputRef.current?.focus();
    },
    [onRemove, disabled]
  );

  // Handle adding a new value
  const handleAddNew = useCallback(() => {
    if (disabled) return;

    const newValue = searchQuery.trim();
    if (!newValue || exactMatch || isAlreadySelected) return;

    onAdd(newValue);
    setRecentlyAdded(newValue);
    setSearchQuery('');
    setActiveIndex(-1);
    setIsOpen(true); // Keep open after creation
    inputRef.current?.focus();
  }, [searchQuery, exactMatch, isAlreadySelected, onAdd, disabled]);

  // Handle keyboard navigation
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else if (totalNavigableItems > 0) {
            setActiveIndex((prev) => (prev < totalNavigableItems - 1 ? prev + 1 : 0));
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (isOpen && totalNavigableItems > 0) {
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalNavigableItems - 1));
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
            // Select filtered option
            const selectedOption = filteredOptions[activeIndex];
            if (selectedOption !== undefined) {
              handleSelectOption(selectedOption);
            }
          } else if (activeIndex === filteredOptions.length && showAddOption) {
            // Select "Add new" option
            handleAddNew();
          } else if (showAddOption) {
            // No active selection but add option available
            handleAddNew();
          }
          break;

        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          setActiveIndex(-1);
          break;

        case 'Backspace':
          if (!searchQuery && selected.length > 0) {
            event.preventDefault();
            // Remove last selected item
            const lastItem = selected[selected.length - 1];
            if (lastItem !== undefined) {
              onRemove(lastItem);
            }
          }
          break;

        case 'Tab':
          // Close dropdown on tab but don't prevent default
          setIsOpen(false);
          setSearchQuery('');
          setActiveIndex(-1);
          break;
      }
    },
    [
      disabled,
      isOpen,
      totalNavigableItems,
      activeIndex,
      filteredOptions,
      showAddOption,
      handleSelectOption,
      handleAddNew,
      searchQuery,
      selected,
      onRemove,
    ]
  );

  // Scroll active option into view
  useEffect(() => {
    if (activeIndex >= 0 && listboxRef.current) {
      const activeElement = listboxRef.current.children[activeIndex] as HTMLElement;
      // Guard for environments where scrollIntoView is not available (e.g., jsdom)
      if (activeElement && typeof activeElement.scrollIntoView === 'function') {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  // Get the active descendant ID for accessibility
  const getActiveDescendantId = () => {
    if (activeIndex < 0 || !isOpen) return undefined;
    if (activeIndex < filteredOptions.length) {
      return `${listboxId}-option-${activeIndex}`;
    }
    if (showAddOption && activeIndex === filteredOptions.length) {
      return `${listboxId}-add`;
    }
    return undefined;
  };

  // Announcement text for screen readers
  const getAnnouncementText = () => {
    if (!isOpen) return '';
    const optionCount = filteredOptions.length;
    const addText = showAddOption ? ' (1 new option available)' : '';
    return `${optionCount} ${optionCount === 1 ? 'option' : 'options'} available${addText}`;
  };

  return (
    <div className="field-container">
      {/* Label with optional tooltip */}
      <div className="form-field-label-row">
        <label className="field-label" htmlFor={inputId}>
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
        <div className="form-field-helper" id={helperId}>
          {helperText}
        </div>
      )}

      <div className="tags-input-container" ref={containerRef}>
        {/* Selected values as badges */}
        {selected.length > 0 && (
          <div className="tags-badges" role="list" aria-label={`Selected ${label.toLowerCase()}`}>
            {selected.map((value) => (
              <div
                key={value}
                className={`tag-badge ${recentlyAdded === value ? 'tag-badge-new' : ''}`}
                role="listitem"
              >
                <span aria-label={`Selected: ${value}`}>{value}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveBadge(value)}
                  aria-label={`Remove ${value}`}
                  title={`Remove ${value}`}
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Combobox input with dropdown */}
        <div className="tags-input-wrapper">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className={`input-base tags-search-input ${error ? 'error' : ''}`}
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={getActiveDescendantId()}
            aria-autocomplete="list"
            aria-describedby={helperText && !error ? helperId : undefined}
            aria-invalid={!!error}
            autoComplete="off"
          />

          {/* Live region for screen reader announcements */}
          <div
            id={liveRegionId}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {getAnnouncementText()}
          </div>

          {/* Dropdown listbox */}
          {isOpen && (filteredOptions.length > 0 || showAddOption) && (
            <ul
              ref={listboxRef}
              id={listboxId}
              className="tags-popover-content"
              role="listbox"
              aria-label={`${label} options`}
            >
              {/* Filtered options */}
              {filteredOptions.map((option, index) => (
                <li
                  key={option}
                  id={`${listboxId}-option-${index}`}
                  className={`tags-popover-option ${activeIndex === index ? 'tags-popover-option-active' : ''}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onClick={() => handleSelectOption(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span>{option}</span>
                </li>
              ))}

              {/* "Add new" option */}
              {showAddOption && (
                <li
                  id={`${listboxId}-add`}
                  className={`tags-popover-create ${activeIndex === filteredOptions.length ? 'tags-popover-option-active' : ''}`}
                  role="option"
                  aria-selected={activeIndex === filteredOptions.length}
                  onClick={handleAddNew}
                  onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                >
                  Add "{searchQuery.trim()}"
                </li>
              )}
            </ul>
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

export default MultiSelectCombobox;
