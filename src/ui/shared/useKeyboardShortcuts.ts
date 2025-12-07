/**
 * useKeyboardShortcuts Hook
 *
 * Provides keyboard navigation and shortcuts for wizard flows:
 * - Cmd/Ctrl + Enter: Submit or advance to next step
 * - Escape: Go back or cancel
 * - Arrow keys: Optional step navigation
 *
 * Automatically disabled when user is typing in input fields.
 */

import { useEffect } from 'react';

interface ShortcutOptions {
  /** Handler for submitting or advancing to next step */
  onNext?: () => void;
  /** Handler for going back a step or cancelling */
  onBack?: () => void;
  /** Handler for final submission (overrides onNext when both present) */
  onSubmit?: () => void;
  /** Handler for escape key (overrides onBack when both present) */
  onEscape?: () => void;
  /** Enable or disable shortcuts (default: true) */
  enabled?: boolean;
}

/**
 * Check if the event target is an input element where we should allow typing
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  const isContentEditable = target.contentEditable === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
}

/**
 * Hook for managing keyboard shortcuts in wizard flows
 */
export function useKeyboardShortcuts(options: ShortcutOptions): void {
  const { onNext, onBack, onSubmit, onEscape, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when user is typing
      if (isInputElement(e.target)) {
        // Allow Cmd/Ctrl+Enter in textareas for submission
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key === 'Enter' &&
          e.target instanceof HTMLTextAreaElement
        ) {
          e.preventDefault();
          if (onSubmit) {
            onSubmit();
          } else if (onNext) {
            onNext();
          }
        }
        return;
      }

      // Cmd/Ctrl + Enter = submit or next
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (onSubmit) {
          onSubmit();
        } else if (onNext) {
          onNext();
        }
        return;
      }

      // Escape = back or cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onEscape) {
          onEscape();
        } else if (onBack) {
          onBack();
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onNext, onBack, onSubmit, onEscape]);
}

export default useKeyboardShortcuts;
