/**
 * Gesture Utilities for Mobile Viewer
 *
 * Pure utility functions for touch event handling and drag-to-dismiss gestures.
 * These functions are designed to be composable and testable, with no side effects.
 *
 * Use cases:
 * - Drag-to-dismiss bottom sheets
 * - Swipe gestures for navigation
 * - Touch-based UI interactions
 */

/**
 * Default maximum drag distance in pixels.
 * Used when clamping drag values to prevent excessive transforms.
 */
export const DEFAULT_MAX_DRAG_DISTANCE = 400;

/**
 * Calculate the vertical distance dragged between two Y coordinates.
 *
 * Returns a positive value for downward drags (endY > startY)
 * and a negative value for upward drags (endY < startY).
 *
 * @param startY - The starting Y coordinate (touch start)
 * @param endY - The ending Y coordinate (current touch position)
 * @returns The vertical distance dragged in pixels
 *
 * @example
 * ```ts
 * // Downward drag of 100px
 * calculateDragDistance(50, 150); // returns 100
 *
 * // Upward drag of 50px
 * calculateDragDistance(150, 100); // returns -50
 * ```
 */
export function calculateDragDistance(startY: number, endY: number): number {
  return endY - startY;
}

/**
 * Determine if a drag distance exceeds the threshold for dismissal.
 *
 * @param distance - The current drag distance in pixels
 * @param threshold - The minimum distance required for dismissal
 * @returns true if distance exceeds threshold, false otherwise
 *
 * @example
 * ```ts
 * shouldDismiss(150, 100); // returns true
 * shouldDismiss(50, 100);  // returns false
 * shouldDismiss(100, 100); // returns false (must exceed, not equal)
 * ```
 */
export function shouldDismiss(distance: number, threshold: number): boolean {
  return distance > threshold;
}

/**
 * Generate a CSS transform string for vertical translation.
 *
 * The distance is clamped between 0 and maxDistance to prevent
 * the element from being dragged too far or in the wrong direction.
 *
 * @param distance - The drag distance in pixels
 * @param maxDistance - Maximum allowed distance (default: DEFAULT_MAX_DRAG_DISTANCE)
 * @returns CSS transform string like `translateY(100px)`
 *
 * @example
 * ```ts
 * calculateTransform(50);     // returns 'translateY(50px)'
 * calculateTransform(-20);    // returns 'translateY(0px)' (clamped to 0)
 * calculateTransform(500);    // returns 'translateY(400px)' (clamped to max)
 * calculateTransform(100, 200); // returns 'translateY(100px)'
 * ```
 */
export function calculateTransform(
  distance: number,
  maxDistance: number = DEFAULT_MAX_DRAG_DISTANCE
): string {
  const clampedDistance = clampDragDistance(distance, maxDistance);
  return `translateY(${clampedDistance}px)`;
}

/**
 * Calculate swipe velocity in pixels per millisecond.
 *
 * Velocity is useful for determining if a fast swipe should trigger
 * an action even if the distance threshold wasn't met.
 *
 * Handles edge cases:
 * - Returns 0 if time is 0 or negative (prevents division by zero)
 * - Returns absolute value (velocity is always positive)
 *
 * @param distance - The distance traveled in pixels
 * @param timeMs - The time elapsed in milliseconds
 * @returns Swipe velocity in pixels per millisecond (always positive)
 *
 * @example
 * ```ts
 * getSwipeVelocity(100, 200);  // returns 0.5 (100px / 200ms)
 * getSwipeVelocity(-100, 200); // returns 0.5 (absolute value)
 * getSwipeVelocity(50, 0);     // returns 0 (prevents division by zero)
 * getSwipeVelocity(50, -100);  // returns 0 (invalid time)
 * ```
 */
export function getSwipeVelocity(distance: number, timeMs: number): number {
  // Prevent division by zero and handle invalid time values
  if (timeMs <= 0) {
    return 0;
  }

  return Math.abs(distance) / timeMs;
}

/**
 * Clamp a drag distance between 0 and a maximum value.
 *
 * This ensures the drag cannot go negative (wrong direction)
 * or exceed the maximum allowed distance.
 *
 * @param distance - The raw drag distance in pixels
 * @param maxDistance - The maximum allowed distance
 * @returns Clamped distance between 0 and maxDistance
 *
 * @example
 * ```ts
 * clampDragDistance(50, 100);   // returns 50
 * clampDragDistance(-20, 100);  // returns 0
 * clampDragDistance(150, 100);  // returns 100
 * clampDragDistance(0, 100);    // returns 0
 * ```
 */
export function clampDragDistance(distance: number, maxDistance: number): number {
  return Math.max(0, Math.min(distance, maxDistance));
}
