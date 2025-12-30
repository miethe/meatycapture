/**
 * useBottomSheet Hook
 *
 * Manages bottom sheet modal state for mobile filter interactions.
 * Provides debounced open/close/toggle methods and keyboard Escape support.
 *
 * Features:
 * - Boolean `isOpen` state for sheet visibility
 * - Debounced state changes (100ms minimum between toggles)
 * - Escape key listener for closing the sheet
 * - Stable callback references via useCallback
 *
 * Usage:
 * ```typescript
 * const sheet = useBottomSheet();
 *
 * // FAB click handler
 * <button onClick={sheet.open}>Filters</button>
 *
 * // Bottom sheet component
 * {sheet.isOpen && (
 *   <BottomSheet onClose={sheet.close}>
 *     <FilterPanel onApply={sheet.close} onClear={sheet.close} />
 *   </BottomSheet>
 * )}
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Debounce delay in milliseconds
 *
 * Minimum time between state changes to prevent
 * rapid open/close cycles from user interactions.
 */
const DEBOUNCE_DELAY_MS = 100;

/**
 * UseBottomSheetResult
 *
 * Return type for useBottomSheet hook.
 * Provides state and methods for controlling bottom sheet visibility.
 */
export interface UseBottomSheetResult {
  /**
   * Whether the bottom sheet is currently open
   */
  isOpen: boolean;

  /**
   * Open the bottom sheet
   *
   * Debounced to prevent rapid state changes.
   * No-op if already open or within debounce window.
   */
  open: () => void;

  /**
   * Close the bottom sheet
   *
   * Debounced to prevent rapid state changes.
   * No-op if already closed or within debounce window.
   */
  close: () => void;

  /**
   * Toggle the bottom sheet open/closed state
   *
   * Debounced to prevent rapid state changes.
   * No-op if within debounce window.
   */
  toggle: () => void;
}

/**
 * useBottomSheet Hook
 *
 * Manages bottom sheet modal state with debouncing and keyboard support.
 *
 * State Management:
 * - Uses boolean `isOpen` state for visibility
 * - Tracks last state change timestamp for debouncing
 * - Cleans up keyboard listener on unmount
 *
 * Debouncing:
 * - 100ms minimum between state changes
 * - Prevents rapid toggling from double-clicks or touch events
 * - Each method checks debounce before changing state
 *
 * Keyboard:
 * - Listens for Escape key when sheet is open
 * - Automatically closes sheet on Escape press
 * - Listener added/removed based on isOpen state
 *
 * @returns UseBottomSheetResult with state and control methods
 */
export function useBottomSheet(): UseBottomSheetResult {
  // Sheet visibility state
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Track last state change for debouncing
  const lastChangeRef = useRef<number>(0);

  /**
   * Check if enough time has passed since last state change
   *
   * @returns true if state change is allowed (past debounce window)
   */
  const canChangeState = useCallback((): boolean => {
    const now = Date.now();
    return now - lastChangeRef.current >= DEBOUNCE_DELAY_MS;
  }, []);

  /**
   * Record state change timestamp
   *
   * Called after each successful state change to update debounce tracking.
   */
  const recordChange = useCallback((): void => {
    lastChangeRef.current = Date.now();
  }, []);

  /**
   * Open the bottom sheet
   *
   * Debounced and idempotent - no effect if already open
   * or within debounce window.
   */
  const open = useCallback((): void => {
    if (!canChangeState()) return;
    if (isOpen) return;

    recordChange();
    setIsOpen(true);
  }, [canChangeState, isOpen, recordChange]);

  /**
   * Close the bottom sheet
   *
   * Debounced and idempotent - no effect if already closed
   * or within debounce window.
   */
  const close = useCallback((): void => {
    if (!canChangeState()) return;
    if (!isOpen) return;

    recordChange();
    setIsOpen(false);
  }, [canChangeState, isOpen, recordChange]);

  /**
   * Toggle the bottom sheet open/closed
   *
   * Debounced - no effect within debounce window.
   */
  const toggle = useCallback((): void => {
    if (!canChangeState()) return;

    recordChange();
    setIsOpen((prev) => !prev);
  }, [canChangeState, recordChange]);

  /**
   * Keyboard Escape handler
   *
   * Closes sheet when Escape key is pressed.
   * Only active when sheet is open.
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default useBottomSheet;
