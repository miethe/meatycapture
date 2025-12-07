/**
 * useFocusTrap Hook
 *
 * Manages focus trapping within modal dialogs for accessibility:
 * - Traps focus within the modal when open
 * - Focuses the first focusable element when modal opens
 * - Returns focus to the trigger element when modal closes
 * - Handles Tab/Shift+Tab cycling within modal boundaries
 *
 * Usage:
 * ```tsx
 * const modalRef = useFocusTrap<HTMLDivElement>(isOpen, triggerRef);
 * return isOpen ? <div ref={modalRef}>...</div> : null;
 * ```
 */

import React, { useEffect, useRef } from 'react';

/**
 * Query selector for focusable elements within a container
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    // Filter out invisible elements
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Hook for managing focus trap within a modal dialog
 *
 * @param isOpen - Whether the modal is currently open
 * @param triggerRef - Ref to the element that triggered the modal (to restore focus on close)
 * @returns Ref to attach to the modal container element
 */
export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  triggerRef?: React.RefObject<HTMLElement>
): React.RefObject<T> {
  const containerRef = useRef<T>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Save the currently focused element (before modal opens)
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the modal
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        const firstElement = focusableElements[0];
        if (firstElement) {
          firstElement.focus();
        }
      }, 10);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Return focus to trigger element when modal closes
      const elementToFocus = triggerRef?.current || previousActiveElementRef.current;
      if (elementToFocus && elementToFocus.focus) {
        elementToFocus.focus();
      }
      previousActiveElementRef.current = null;
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    /**
     * Handle tab key to trap focus within modal
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement;

      // Shift+Tab on first element: move to last element
      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element: move to first element
      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    };

    // Attach event listener to the document
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, triggerRef]);

  return containerRef;
}

export default useFocusTrap;
