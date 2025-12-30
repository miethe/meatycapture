/**
 * useReducedMotion Hook
 *
 * Detects user's prefers-reduced-motion accessibility setting.
 * Returns reactive boolean that updates when system preference changes.
 *
 * Use cases:
 * - Disable animations for users who prefer reduced motion
 * - Replace complex animations with simpler alternatives
 * - Skip transition effects while maintaining functionality
 *
 * Accessibility:
 * - Respects WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions)
 * - Supports users with vestibular motion disorders
 * - Detects system-level preference automatically
 *
 * SSR Safety:
 * - Returns false if window is unavailable (SSR/Node environments)
 * - No hydration mismatch issues
 *
 * Example:
 * ```tsx
 * function AnimatedComponent() {
 *   const { prefersReducedMotion } = useReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={{ opacity: 1 }}
 *       transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */

import { useState, useEffect } from 'react';

/**
 * ReducedMotionResult
 *
 * Return type for useReducedMotion hook.
 */
export interface ReducedMotionResult {
  /**
   * Whether the user prefers reduced motion.
   *
   * true: User has enabled "Reduce Motion" in system settings
   * false: User has not enabled reduced motion preference
   */
  prefersReducedMotion: boolean;
}

/**
 * Media query string for prefers-reduced-motion
 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Check if we're in a browser environment with matchMedia support
 *
 * @returns true if window and matchMedia are available
 */
function canUseMatchMedia(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  );
}

/**
 * Get current reduced motion preference
 *
 * @returns Current preference value, false if unavailable
 */
function getReducedMotionPreference(): boolean {
  if (!canUseMatchMedia()) {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * useReducedMotion Hook
 *
 * Detects and tracks the user's prefers-reduced-motion accessibility setting.
 * Automatically updates when the system preference changes.
 *
 * Implementation:
 * - Uses matchMedia API for preference detection
 * - Subscribes to change events for reactive updates
 * - Properly cleans up event listener on unmount
 * - SSR-safe with false default
 *
 * @returns ReducedMotionResult with prefersReducedMotion boolean
 */
export function useReducedMotion(): ReducedMotionResult {
  // Initialize with current preference (false if SSR)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    getReducedMotionPreference
  );

  useEffect(() => {
    // Skip if matchMedia is not available (SSR or unsupported browser)
    if (!canUseMatchMedia()) {
      return;
    }

    // Create media query list
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    // Handler for preference changes
    const handleChange = (event: MediaQueryListEvent): void => {
      setPrefersReducedMotion(event.matches);
    };

    // Subscribe to changes
    // Use addEventListener for modern browsers (preferred)
    // Fall back to addListener for older browsers (Safari < 14)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy API for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Sync initial state in case it changed between render and effect
    setPrefersReducedMotion(mediaQuery.matches);

    // Cleanup listener on unmount
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Legacy API for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return {
    prefersReducedMotion,
  };
}
