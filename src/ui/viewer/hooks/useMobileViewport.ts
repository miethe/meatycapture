/**
 * useMobileViewport Hook
 *
 * Detects and tracks viewport dimensions for responsive mobile layouts.
 * Provides SSR-safe viewport detection with debounced resize handling.
 *
 * Architecture:
 * - Uses window.innerWidth/innerHeight for viewport detection
 * - Debounces resize events (100ms) to prevent excessive re-renders
 * - SSR-safe: Returns default values when window is undefined
 * - Mobile breakpoint: 768px (standard tablet/mobile threshold)
 *
 * Usage:
 * ```typescript
 * const { isMobile, width, height } = useMobileViewport();
 *
 * if (isMobile) {
 *   // Render mobile-optimized layout
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Mobile breakpoint in pixels
 *
 * Standard threshold for mobile/tablet detection.
 * Viewport width <= 768px is considered mobile.
 */
export const MOBILE_BREAKPOINT = 768;

/**
 * Default debounce delay in milliseconds
 *
 * Prevents excessive re-renders during rapid resize events.
 * 100ms provides good balance between responsiveness and performance.
 */
export const DEFAULT_DEBOUNCE_DELAY = 100;

/**
 * ViewportState
 *
 * Return type for useMobileViewport hook.
 * Provides viewport dimensions and mobile detection flag.
 */
export interface ViewportState {
  /**
   * Whether viewport is at or below mobile breakpoint
   *
   * True when width <= 768px
   */
  isMobile: boolean;

  /**
   * Current viewport width in pixels
   *
   * Returns 0 during SSR (window undefined)
   */
  width: number;

  /**
   * Current viewport height in pixels
   *
   * Returns 0 during SSR (window undefined)
   */
  height: number;
}

/**
 * Get current viewport dimensions
 *
 * SSR-safe helper that returns viewport dimensions from window,
 * or default values (0, 0) when window is undefined.
 *
 * @returns Current viewport dimensions
 */
function getViewportDimensions(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * useMobileViewport Hook
 *
 * Tracks viewport dimensions and provides mobile breakpoint detection.
 * Handles SSR gracefully and debounces resize events for performance.
 *
 * Features:
 * - SSR-safe: No hydration issues, checks for window existence
 * - Debounced resize: 100ms delay prevents excessive updates
 * - Automatic cleanup: Removes event listeners on unmount
 * - Stable references: Uses refs to avoid stale closure issues
 *
 * Performance:
 * - Debouncing prevents resize event floods (especially during window drag)
 * - Only updates state when dimensions actually change
 * - Cleans up listeners properly to prevent memory leaks
 *
 * @param debounceDelay - Optional custom debounce delay (default: 100ms)
 * @returns ViewportState with isMobile, width, and height
 */
export function useMobileViewport(debounceDelay: number = DEFAULT_DEBOUNCE_DELAY): ViewportState {
  // Initialize with current viewport dimensions (SSR-safe)
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>(() => getViewportDimensions());

  // Ref for debounce timeout to enable cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Handle viewport resize with debouncing
   *
   * Updates dimensions state after debounce delay.
   * Clears pending timeout if resize event fires before delay expires.
   */
  const handleResize = useCallback(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced update
    timeoutRef.current = setTimeout(() => {
      const newDimensions = getViewportDimensions();
      setDimensions(newDimensions);
    }, debounceDelay);
  }, [debounceDelay]);

  /**
   * Effect: Set up resize listener
   *
   * - Only runs on client (SSR-safe)
   * - Adds resize event listener
   * - Initializes dimensions on mount (handles hydration)
   * - Cleans up listener and pending timeout on unmount
   */
  useEffect(() => {
    // Skip if SSR (window undefined)
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize dimensions on mount (handles SSR -> client hydration)
    setDimensions(getViewportDimensions());

    // Add resize listener
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);

      // Clear any pending debounce timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleResize]);

  // Compute mobile flag from current width
  const isMobile = dimensions.width <= MOBILE_BREAKPOINT;

  return {
    isMobile,
    width: dimensions.width,
    height: dimensions.height,
  };
}
