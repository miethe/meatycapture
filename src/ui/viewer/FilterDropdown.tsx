/**
 * FilterDropdown Component
 *
 * Multi-select dropdown with checkboxes using Radix UI primitives.
 * Displays a list of options with checkboxes for multiple selection.
 * Shows selected count badge when selections are made.
 */

import React, { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import './viewer.css';

export interface FilterDropdownProps {
  /** Label for the dropdown button */
  label: string;
  /** Available options to select from */
  options: string[];
  /** Currently selected values */
  selected: string[];
  /** Called when selection changes */
  onChange: (selected: string[]) => void;
  /** Placeholder text when no selections */
  placeholder?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Optional icon to display before the label */
  icon?: ReactNode;
}

/**
 * FilterDropdown
 *
 * Multi-select dropdown for filter controls.
 * Uses checkboxes to allow multiple selections with OR logic.
 * Shows count badge when items are selected.
 *
 * Features:
 * - Click outside to close
 * - Keyboard navigation (Tab, Enter, Space, Escape)
 * - Checkbox selection state
 * - Selected count badge
 * - ARIA labels and roles
 *
 * @param props - FilterDropdownProps
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  icon,
}: FilterDropdownProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const toggleOption = useCallback(
    (option: string) => {
      if (selected.includes(option)) {
        onChange(selected.filter((v) => v !== option));
      } else {
        onChange([...selected, option]);
      }
    },
    [selected, onChange]
  );

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }, [disabled, isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const getButtonText = (): string => {
    if (selected.length === 0) {
      return placeholder;
    }
    if (selected.length === 1) {
      return selected[0] || placeholder;
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="filter-dropdown-container" ref={containerRef}>
      <button
        type="button"
        className="filter-dropdown-trigger input-base select-base"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${label} filter`}
      >
        {icon && <span className="filter-icon" aria-hidden="true">{icon}</span>}
        <span className="filter-dropdown-label">{label}:</span>
        <span className="filter-dropdown-text">{getButtonText()}</span>
        {selected.length > 0 && <span className="filter-dropdown-badge">{selected.length}</span>}
      </button>

      {isOpen && (
        <div className="filter-dropdown-menu" role="listbox" aria-label={`${label} options`}>
          {options.length === 0 ? (
            <div className="filter-dropdown-empty">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <div
                  key={option}
                  className={`filter-dropdown-option ${isSelected ? 'selected' : ''}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleOption(option)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleOption(option);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`${option}${isSelected ? ', selected' : ''}`}
                >
                  <div className={`filter-dropdown-checkbox ${isSelected ? 'checked' : ''}`} aria-hidden="true">
                    {isSelected && '✓'}
                  </div>
                  <span>{option}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
