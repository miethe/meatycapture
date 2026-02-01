/**
 * TagCloudFilter Component
 *
 * Tag cloud filter with clickable tag badges in a flex-wrap container.
 * Displays all available tags as selectable badges with visual feedback
 * for selected state. Selected tags appear as removable badges above the trigger.
 * Uses createPortal for proper dropdown positioning above all content.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Cross2Icon } from '@radix-ui/react-icons';
import './viewer.css';

/** Menu position for fixed positioning */
interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export interface TagCloudFilterProps {
  /** All available tags */
  tags: string[];
  /** Currently selected tags */
  selected: string[];
  /** Called when selection changes */
  onChange: (selected: string[]) => void;
}

/**
 * TagCloudFilter
 *
 * Tag cloud filter component for the Request Log Viewer.
 * Displays tags as clickable badges in a flex-wrap layout.
 *
 * Features:
 * - Click outside to close
 * - Keyboard navigation (Escape to close)
 * - Toggle selection on click
 * - Selected tags shown as removable badges
 * - Portal rendering for proper z-index layering
 * - ARIA labels and roles for accessibility
 *
 * @param props - TagCloudFilterProps
 */
export function TagCloudFilter({
  tags,
  selected,
  onChange,
}: TagCloudFilterProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = triggerRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);

      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Toggle tag selection
  const toggleTag = useCallback(
    (tag: string) => {
      if (selected.includes(tag)) {
        onChange(selected.filter((t) => t !== tag));
      } else {
        onChange([...selected, tag]);
      }
    },
    [selected, onChange]
  );

  // Remove tag from selection
  const removeTag = useCallback(
    (tag: string) => {
      onChange(selected.filter((t) => t !== tag));
    },
    [selected, onChange]
  );

  // Open/close dropdown and calculate position
  const handleToggle = useCallback(() => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 300), // Wider for tag cloud
      });
    }
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Handle keyboard activation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  return (
    <div className="tag-cloud-filter">
      {/* Selected tags as removable badges */}
      {selected.length > 0 && (
        <div className="tag-cloud-selected" role="list" aria-label="Selected tags">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              className="tag-cloud-badge selected"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              <span>{tag}</span>
              <Cross2Icon />
            </button>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        className="tag-cloud-trigger input-base"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Tags filter"
      >
        <span className="filter-icon" aria-hidden="true">
          #
        </span>
        <span>Tags</span>
        {selected.length > 0 && (
          <span className="filter-dropdown-badge">{selected.length}</span>
        )}
      </button>

      {/* Tag cloud dropdown via portal */}
      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="tag-cloud-menu"
            role="listbox"
            aria-label="Available tags"
            aria-multiselectable="true"
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.width,
            }}
          >
            {tags.length === 0 ? (
              <div className="tag-cloud-empty">No tags available</div>
            ) : (
              <div className="tag-cloud-container">
                {tags.map((tag) => {
                  const isSelected = selected.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-cloud-badge ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export default TagCloudFilter;
