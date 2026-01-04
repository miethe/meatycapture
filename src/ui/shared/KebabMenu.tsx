/**
 * KebabMenu Component
 *
 * Generic dropdown menu triggered by a kebab (3-dot) icon button.
 * Supports custom triggers, keyboard navigation, and dangerous item styling.
 * Glass morphism aesthetic with accessible focus management.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import './KebabMenu.css';

export interface KebabMenuItem {
  /** Display label for the menu item */
  label: string;
  /** Optional icon to display left of label */
  icon?: React.ReactNode;
  /** Called when item is selected */
  onClick: () => void;
  /** If true, item styled with danger colors (red) */
  isDangerous?: boolean;
}

export interface KebabMenuProps {
  /** Array of menu items */
  items: KebabMenuItem[];
  /** Optional custom trigger element (defaults to 3-dot kebab icon) */
  trigger?: React.ReactNode;
  /** Accessible label for the trigger button */
  ariaLabel?: string;
}

/**
 * Default kebab icon (three vertical dots)
 */
function KebabIcon(): React.JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}

/**
 * KebabMenu with keyboard navigation and click-away handling
 */
export function KebabMenu({
  items,
  trigger,
  ariaLabel = 'Menu',
}: KebabMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset item refs when items change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setFocusedIndex(0);
      // Small delay to ensure menu is rendered
      requestAnimationFrame(() => {
        itemRefs.current[0]?.focus();
      });
    } else if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen, items.length]);

  // Click-away listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Use mousedown to close before click propagates
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Toggle menu open/closed
  const handleTriggerClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Handle item selection
  const handleItemClick = useCallback((item: KebabMenuItem) => {
    item.onClick();
    setIsOpen(false);
    // Return focus to trigger after selection
    triggerRef.current?.focus();
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        // Open on ArrowDown or Enter when trigger is focused
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
          const nextIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
          setFocusedIndex(nextIndex);
          itemRefs.current[nextIndex]?.focus();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
          setFocusedIndex(prevIndex);
          itemRefs.current[prevIndex]?.focus();
          break;
        }
        case 'Home': {
          event.preventDefault();
          setFocusedIndex(0);
          itemRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          event.preventDefault();
          const lastIndex = items.length - 1;
          setFocusedIndex(lastIndex);
          itemRefs.current[lastIndex]?.focus();
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          const selectedItem = items[focusedIndex];
          if (focusedIndex >= 0 && focusedIndex < items.length && selectedItem) {
            handleItemClick(selectedItem);
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
          // Close menu on Tab and allow natural tab behavior
          setIsOpen(false);
          break;
        }
      }
    },
    [isOpen, focusedIndex, items, handleItemClick]
  );

  return (
    <div ref={containerRef} className="kebab-menu-container" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="kebab-menu-trigger"
        onClick={handleTriggerClick}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        {trigger || <KebabIcon />}
      </button>

      {isOpen && (
        <div ref={menuRef} className="kebab-menu-panel" role="menu" aria-label={ariaLabel}>
          {items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role="menuitem"
              className={`kebab-menu-item ${item.isDangerous ? 'kebab-menu-item-dangerous' : ''} ${focusedIndex === index ? 'kebab-menu-item-focused' : ''}`}
              onClick={() => handleItemClick(item)}
              tabIndex={focusedIndex === index ? 0 : -1}
            >
              {item.icon && (
                <span className="kebab-menu-item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="kebab-menu-item-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default KebabMenu;
