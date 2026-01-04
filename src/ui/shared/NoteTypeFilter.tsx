/**
 * NoteTypeFilter Component
 *
 * Multi-select dropdown filter for selecting which note types to display.
 * Features accessible keyboard navigation and glass morphism styling.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NoteType, NOTE_TYPE_OPTIONS, NOTE_TYPE_LABELS } from '@core/models';
import './NoteTypeFilter.css';

export interface NoteTypeFilterProps {
  /** Currently selected types (empty array means all types) */
  value: NoteType[];
  /** Called when selection changes */
  onChange: (types: NoteType[]) => void;
}

/**
 * Get the button display label based on selected types.
 * @param selected - Array of selected note types
 * @returns Human-readable label for the filter button
 */
function getButtonLabel(selected: NoteType[]): string {
  if (selected.length === 0 || selected.length === NOTE_TYPE_OPTIONS.length) {
    return 'All Types';
  }
  if (selected.length === 1 && selected[0]) {
    return NOTE_TYPE_LABELS[selected[0]];
  }
  return `${selected.length} types`;
}

/**
 * Checkmark icon for selected options
 */
function CheckIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 8 6 11 13 4" />
    </svg>
  );
}

/**
 * Chevron icon for dropdown indicator
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
      className={`note-type-filter__chevron ${isOpen ? 'note-type-filter__chevron--open' : ''}`}
    >
      <path d="M6 9L1 4h10z" />
    </svg>
  );
}

/**
 * NoteTypeFilter - Multi-select dropdown for note type filtering
 */
export function NoteTypeFilter({ value, onChange }: NoteTypeFilterProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // "All Types" option + individual type options
  const allOptionsCount = NOTE_TYPE_OPTIONS.length + 1;

  // Check if all types are selected (or none, which means all)
  const isAllSelected = value.length === 0 || value.length === NOTE_TYPE_OPTIONS.length;

  // Check if a specific type is selected
  const isTypeSelected = useCallback(
    (type: NoteType): boolean => {
      if (value.length === 0) return true; // Empty = all selected
      return value.includes(type);
    },
    [value]
  );

  // Reset option refs when component updates
  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, allOptionsCount);
  }, [allOptionsCount]);

  // Focus management when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
      requestAnimationFrame(() => {
        optionRefs.current[0]?.focus();
      });
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Click-away listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle dropdown
  const handleTriggerClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Handle "All Types" toggle
  const handleAllTypesClick = useCallback(() => {
    // Toggle to empty array (show all) or select all types
    if (isAllSelected) {
      // If currently all, clicking does nothing (stays all)
      // But we clear the array to represent "all"
      onChange([]);
    } else {
      // If some selected, clicking "All" clears selection (shows all)
      onChange([]);
    }
  }, [isAllSelected, onChange]);

  // Handle individual type toggle
  const handleTypeToggle = useCallback(
    (type: NoteType) => {
      const currentSelected = value.length === 0 ? [...NOTE_TYPE_OPTIONS] : [...value];

      if (currentSelected.includes(type)) {
        // Remove type
        const newSelection = currentSelected.filter((t) => t !== type);
        // If removing leaves empty or all, normalize to empty
        if (newSelection.length === 0) {
          onChange([]);
        } else {
          onChange(newSelection);
        }
      } else {
        // Add type
        const newSelection = [...currentSelected, type];
        // If adding completes all types, normalize to empty
        if (newSelection.length === NOTE_TYPE_OPTIONS.length) {
          onChange([]);
        } else {
          onChange(newSelection);
        }
      }
    },
    [value, onChange]
  );

  // Handle option click (index 0 = All Types, 1+ = individual types)
  const handleOptionClick = useCallback(
    (index: number) => {
      if (index === 0) {
        handleAllTypesClick();
      } else {
        const type = NOTE_TYPE_OPTIONS[index - 1];
        if (type) {
          handleTypeToggle(type);
        }
      }
      // Keep dropdown open for multi-select
    },
    [handleAllTypesClick, handleTypeToggle]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
          if (event.target === triggerRef.current) {
            event.preventDefault();
            setIsOpen(true);
          }
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const nextIndex = focusedIndex < allOptionsCount - 1 ? focusedIndex + 1 : 0;
          setFocusedIndex(nextIndex);
          optionRefs.current[nextIndex]?.focus();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : allOptionsCount - 1;
          setFocusedIndex(prevIndex);
          optionRefs.current[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          event.preventDefault();
          setFocusedIndex(0);
          optionRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          event.preventDefault();
          const lastIndex = allOptionsCount - 1;
          setFocusedIndex(lastIndex);
          optionRefs.current[lastIndex]?.focus();
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allOptionsCount) {
            handleOptionClick(focusedIndex);
          }
          break;
        }
        case 'Escape': {
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        }
        case 'Tab': {
          // Close dropdown on Tab
          setIsOpen(false);
          break;
        }
      }
    },
    [isOpen, focusedIndex, allOptionsCount, handleOptionClick]
  );

  return (
    <div
      ref={containerRef}
      className="note-type-filter"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className="note-type-filter__button"
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by note type"
      >
        <span className="note-type-filter__button-text">{getButtonLabel(value)}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          ref={listboxRef}
          className="note-type-filter__dropdown"
          role="listbox"
          aria-label="Note type filter options"
          aria-multiselectable="true"
        >
          {/* All Types Option */}
          <button
            ref={(el) => {
              optionRefs.current[0] = el;
            }}
            type="button"
            role="option"
            className={`note-type-filter__option ${focusedIndex === 0 ? 'note-type-filter__option--focused' : ''}`}
            onClick={() => handleOptionClick(0)}
            aria-selected={isAllSelected}
            tabIndex={focusedIndex === 0 ? 0 : -1}
          >
            <span
              className={`note-type-filter__checkbox ${isAllSelected ? 'note-type-filter__checkbox--checked' : ''}`}
              aria-hidden="true"
            >
              {isAllSelected && <CheckIcon />}
            </span>
            <span className="note-type-filter__label">All Types</span>
          </button>

          {/* Individual Type Options */}
          {NOTE_TYPE_OPTIONS.map((type, index) => {
            const optionIndex = index + 1;
            const isSelected = isTypeSelected(type);
            const isFocused = focusedIndex === optionIndex;

            return (
              <button
                key={type}
                ref={(el) => {
                  optionRefs.current[optionIndex] = el;
                }}
                type="button"
                role="option"
                className={`note-type-filter__option ${isFocused ? 'note-type-filter__option--focused' : ''}`}
                onClick={() => handleOptionClick(optionIndex)}
                aria-selected={isSelected}
                tabIndex={isFocused ? 0 : -1}
              >
                <span
                  className={`note-type-filter__checkbox ${isSelected ? 'note-type-filter__checkbox--checked' : ''}`}
                  aria-hidden="true"
                >
                  {isSelected && <CheckIcon />}
                </span>
                <span className="note-type-filter__label">{NOTE_TYPE_LABELS[type]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NoteTypeFilter;
