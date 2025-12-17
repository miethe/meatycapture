/**
 * useNavigationShortcuts Hook
 *
 * Provides global keyboard navigation shortcuts for app views:
 * - Cmd/Ctrl + 1: Navigate to Capture (wizard)
 * - Cmd/Ctrl + 2: Navigate to Viewer
 * - Cmd/Ctrl + 3: Navigate to Admin
 *
 * Cross-platform support:
 * - macOS: Uses Cmd (metaKey)
 * - Windows/Linux: Uses Ctrl (ctrlKey)
 *
 * Automatically disabled when user is typing in input fields.
 */

import { useEffect } from 'react';

type View = 'wizard' | 'viewer' | 'admin';

interface UseNavigationShortcutsOptions {
  /** Handler called when navigation shortcut is triggered */
  onNavigate: (view: View) => void;
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
 * Hook for managing global keyboard navigation shortcuts
 *
 * @example
 * ```tsx
 * function App() {
 *   const [view, setView] = useState<View>('wizard');
 *
 *   useNavigationShortcuts({
 *     onNavigate: setView,
 *     enabled: true
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useNavigationShortcuts(options: UseNavigationShortcutsOptions): void {
  const { onNavigate, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when user is typing in form elements
      if (isInputElement(e.target)) {
        return;
      }

      // Check for Cmd (macOS) or Ctrl (Windows/Linux) modifier
      const hasModifier = e.metaKey || e.ctrlKey;
      if (!hasModifier) return;

      // Map number keys to views
      let targetView: View | null = null;

      switch (e.key) {
        case '1':
          targetView = 'wizard';
          break;
        case '2':
          targetView = 'viewer';
          break;
        case '3':
          targetView = 'admin';
          break;
        default:
          return;
      }

      // If we matched a navigation shortcut, prevent default and navigate
      if (targetView) {
        e.preventDefault();
        onNavigate(targetView);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onNavigate]);
}

export default useNavigationShortcuts;
