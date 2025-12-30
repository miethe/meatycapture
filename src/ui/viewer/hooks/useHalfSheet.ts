/**
 * useHalfSheet Hook
 *
 * Manages state for a mobile detail half-sheet that expands from 50vh to 100vh.
 * Provides keyboard and touch gesture support for opening, closing, and expanding.
 *
 * Features:
 * - isOpen/isExpanded state management
 * - Height transition from 50vh to 100vh (state only, animation in CSS)
 * - Keyboard Escape closes sheet
 * - Touch gesture support (state management only)
 * - Debounces rapid state changes (100ms)
 *
 * Usage:
 * ```tsx
 * const { isOpen, isExpanded, open, close, expand, collapse } = useHalfSheet();
 *
 * return (
 *   <div
 *     className={cn(
 *       'half-sheet',
 *       isOpen && 'half-sheet--open',
 *       isExpanded && 'half-sheet--expanded'
 *     )}
 *   >
 *     <button onClick={expand}>Expand</button>
 *     <button onClick={close}>Close</button>
 *   </div>
 * );
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Configuration options for useHalfSheet hook
 */
export interface UseHalfSheetOptions {
  /**
   * Initial open state
   * @default false
   */
  initialOpen?: boolean;

  /**
   * Initial expanded state (only applies when open)
   * @default false
   */
  initialExpanded?: boolean;

  /**
   * Enable keyboard Escape to close sheet
   * @default true
   */
  enableEscapeKey?: boolean;

  /**
   * Debounce delay for rapid state changes in milliseconds
   * @default 100
   */
  debounceMs?: number;

  /**
   * Callback fired when sheet opens
   */
  onOpen?: () => void;

  /**
   * Callback fired when sheet closes
   */
  onClose?: () => void;

  /**
   * Callback fired when sheet expands to full height
   */
  onExpand?: () => void;

  /**
   * Callback fired when sheet collapses to half height
   */
  onCollapse?: () => void;
}

/**
 * Return type for useHalfSheet hook
 */
export interface UseHalfSheetResult {
  /**
   * Whether the sheet is currently open (visible)
   */
  isOpen: boolean;

  /**
   * Whether the sheet is expanded to full height (100vh)
   * Only meaningful when isOpen is true
   */
  isExpanded: boolean;

  /**
   * Open the sheet at half height (50vh)
   * No-op if already open
   */
  open: () => void;

  /**
   * Close the sheet completely
   * Resets expanded state to false
   */
  close: () => void;

  /**
   * Expand sheet to full height (100vh)
   * No-op if sheet is not open
   */
  expand: () => void;

  /**
   * Collapse sheet back to half height (50vh)
   * No-op if sheet is not open
   */
  collapse: () => void;

  /**
   * Toggle between expanded and collapsed states
   * No-op if sheet is not open
   */
  toggle: () => void;
}

/**
 * useHalfSheet Hook
 *
 * Manages state for a mobile detail half-sheet with height transitions.
 * Handles keyboard events and provides debounced state changes.
 *
 * State Flow:
 * - Closed (isOpen: false, isExpanded: false)
 * - Open at half height (isOpen: true, isExpanded: false)
 * - Open at full height (isOpen: true, isExpanded: true)
 *
 * Transitions:
 * - open(): Closed -> Open (half)
 * - close(): Open (any) -> Closed
 * - expand(): Open (half) -> Open (full)
 * - collapse(): Open (full) -> Open (half)
 * - toggle(): Open (half) <-> Open (full)
 *
 * @param options - Configuration options
 * @returns UseHalfSheetResult with state and controls
 */
export function useHalfSheet(options: UseHalfSheetOptions = {}): UseHalfSheetResult {
  const {
    initialOpen = false,
    initialExpanded = false,
    enableEscapeKey = true,
    debounceMs = 100,
    onOpen,
    onClose,
    onExpand,
    onCollapse,
  } = options;

  // State
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Debounce tracking
  const lastStateChangeRef = useRef<number>(0);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check if a state change should be allowed based on debounce
   * Returns true if enough time has passed since last change
   */
  const shouldAllowStateChange = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastChange = now - lastStateChangeRef.current;
    return timeSinceLastChange >= debounceMs;
  }, [debounceMs]);

  /**
   * Record a state change timestamp
   */
  const recordStateChange = useCallback((): void => {
    lastStateChangeRef.current = Date.now();
  }, []);

  /**
   * Execute a state change with debounce protection
   * If called too rapidly, schedules the change for later
   */
  const debouncedStateChange = useCallback(
    (action: () => void): void => {
      // Clear any pending timeout
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }

      if (shouldAllowStateChange()) {
        recordStateChange();
        action();
      } else {
        // Schedule for later
        const remainingDelay = debounceMs - (Date.now() - lastStateChangeRef.current);
        pendingTimeoutRef.current = setTimeout(() => {
          recordStateChange();
          action();
          pendingTimeoutRef.current = null;
        }, remainingDelay);
      }
    },
    [shouldAllowStateChange, recordStateChange, debounceMs]
  );

  /**
   * Open the sheet at half height
   */
  const open = useCallback((): void => {
    debouncedStateChange(() => {
      if (!isOpen) {
        setIsOpen(true);
        onOpen?.();
      }
    });
  }, [debouncedStateChange, isOpen, onOpen]);

  /**
   * Close the sheet completely
   */
  const close = useCallback((): void => {
    debouncedStateChange(() => {
      if (isOpen) {
        setIsOpen(false);
        setIsExpanded(false);
        onClose?.();
      }
    });
  }, [debouncedStateChange, isOpen, onClose]);

  /**
   * Expand sheet to full height
   */
  const expand = useCallback((): void => {
    debouncedStateChange(() => {
      if (isOpen && !isExpanded) {
        setIsExpanded(true);
        onExpand?.();
      }
    });
  }, [debouncedStateChange, isOpen, isExpanded, onExpand]);

  /**
   * Collapse sheet to half height
   */
  const collapse = useCallback((): void => {
    debouncedStateChange(() => {
      if (isOpen && isExpanded) {
        setIsExpanded(false);
        onCollapse?.();
      }
    });
  }, [debouncedStateChange, isOpen, isExpanded, onCollapse]);

  /**
   * Toggle between expanded and collapsed states
   */
  const toggle = useCallback((): void => {
    if (!isOpen) return;

    if (isExpanded) {
      collapse();
    } else {
      expand();
    }
  }, [isOpen, isExpanded, expand, collapse]);

  /**
   * Handle Escape key to close sheet
   */
  useEffect(() => {
    if (!enableEscapeKey || !isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableEscapeKey, isOpen, close]);

  /**
   * Cleanup pending timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    isExpanded,
    open,
    close,
    expand,
    collapse,
    toggle,
  };
}

export default useHalfSheet;
