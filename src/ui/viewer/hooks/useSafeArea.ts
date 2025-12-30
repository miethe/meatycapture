/**
 * useSafeArea Hook
 *
 * Reads device safe area insets (notches, navigation bars, etc.) using
 * CSS `env(safe-area-inset-*)` values. Provides reactive updates on
 * orientation change and window resize.
 *
 * Safe area insets are defined by:
 * - iOS notches and home indicators
 * - Android navigation bars and display cutouts
 * - Desktop browser chrome (typically 0)
 *
 * Usage:
 * ```typescript
 * const { top, right, bottom, left } = useSafeArea();
 *
 * // Apply as padding
 * <div style={{ paddingTop: top, paddingBottom: bottom }}>
 *   Content safe from notches
 * </div>
 * ```
 *
 * Note: Requires `viewport-fit=cover` in viewport meta tag:
 * ```html
 * <meta name="viewport" content="viewport-fit=cover">
 * ```
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * SafeAreaInsets
 *
 * Device safe area inset values in pixels.
 * All values default to 0 on unsupported browsers.
 */
export interface SafeAreaInsets {
  /** Top inset in pixels (e.g., iOS notch) */
  top: number;
  /** Right inset in pixels (e.g., landscape notch) */
  right: number;
  /** Bottom inset in pixels (e.g., iOS home indicator) */
  bottom: number;
  /** Left inset in pixels (e.g., landscape notch) */
  left: number;
}

/**
 * Default insets when env() is not supported
 */
const DEFAULT_INSETS: SafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

/**
 * CSS env() variable names for safe area insets
 */
const INSET_PROPERTIES = {
  top: 'safe-area-inset-top',
  right: 'safe-area-inset-right',
  bottom: 'safe-area-inset-bottom',
  left: 'safe-area-inset-left',
} as const;

/**
 * Parse pixel value from CSS computed style string
 *
 * @param value - CSS value string (e.g., "44px", "0px", "")
 * @returns Numeric pixel value or 0 if invalid
 */
function parsePixelValue(value: string): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Read safe area insets from a test element
 *
 * Creates a hidden element with padding set to env() values,
 * then reads the computed styles to get actual pixel values.
 *
 * @returns SafeAreaInsets with current inset values
 */
function readSafeAreaInsets(): SafeAreaInsets {
  // Skip if running in non-browser environment (SSR)
  if (typeof document === 'undefined') {
    return DEFAULT_INSETS;
  }

  // Create hidden test element
  const testElement = document.createElement('div');

  // Apply safe area insets as padding using CSS env()
  testElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    visibility: hidden;
    pointer-events: none;
    padding-top: env(${INSET_PROPERTIES.top}, 0px);
    padding-right: env(${INSET_PROPERTIES.right}, 0px);
    padding-bottom: env(${INSET_PROPERTIES.bottom}, 0px);
    padding-left: env(${INSET_PROPERTIES.left}, 0px);
  `;

  // Append to document to get computed styles
  document.body.appendChild(testElement);

  // Read computed styles
  const computedStyle = window.getComputedStyle(testElement);

  const insets: SafeAreaInsets = {
    top: parsePixelValue(computedStyle.paddingTop),
    right: parsePixelValue(computedStyle.paddingRight),
    bottom: parsePixelValue(computedStyle.paddingBottom),
    left: parsePixelValue(computedStyle.paddingLeft),
  };

  // Clean up test element
  document.body.removeChild(testElement);

  return insets;
}

/**
 * useSafeArea Hook
 *
 * Returns device safe area insets in pixels, updating reactively on
 * orientation change and window resize.
 *
 * Implementation:
 * - Creates hidden test element with env() padding values
 * - Reads computed styles to get actual pixel values
 * - Listens for resize and orientationchange events
 * - Falls back to 0 on unsupported browsers
 *
 * Performance:
 * - Uses useCallback for stable event handler reference
 * - Cleans up event listeners on unmount
 * - Only re-renders when inset values actually change
 *
 * @returns SafeAreaInsets with current inset values
 */
export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(DEFAULT_INSETS);

  /**
   * Update insets from current device state
   *
   * Reads safe area insets and updates state only if values changed.
   * Uses shallow comparison to prevent unnecessary re-renders.
   */
  const updateInsets = useCallback(() => {
    const newInsets = readSafeAreaInsets();

    setInsets((prev) => {
      // Only update if values changed
      if (
        prev.top === newInsets.top &&
        prev.right === newInsets.right &&
        prev.bottom === newInsets.bottom &&
        prev.left === newInsets.left
      ) {
        return prev;
      }
      return newInsets;
    });
  }, []);

  useEffect(() => {
    // Skip if running in non-browser environment (SSR)
    if (typeof window === 'undefined') {
      return;
    }

    // Initial read
    updateInsets();

    // Listen for resize events (handles orientation change on many devices)
    window.addEventListener('resize', updateInsets);

    // Listen for explicit orientation changes (iOS Safari, some Android)
    window.addEventListener('orientationchange', updateInsets);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, [updateInsets]);

  return insets;
}
