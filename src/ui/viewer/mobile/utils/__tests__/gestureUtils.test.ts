import { describe, it, expect } from 'vitest';
import {
  calculateDragDistance,
  shouldDismiss,
  calculateTransform,
  getSwipeVelocity,
  clampDragDistance,
  DEFAULT_MAX_DRAG_DISTANCE,
} from '../gestureUtils';

// ============================================================================
// calculateDragDistance Tests
// ============================================================================

describe('calculateDragDistance', () => {
  it('should return positive value for downward drag', () => {
    expect(calculateDragDistance(50, 150)).toBe(100);
  });

  it('should return negative value for upward drag', () => {
    expect(calculateDragDistance(150, 50)).toBe(-100);
  });

  it('should return zero when start and end are the same', () => {
    expect(calculateDragDistance(100, 100)).toBe(0);
  });

  it('should handle zero coordinates', () => {
    expect(calculateDragDistance(0, 100)).toBe(100);
    expect(calculateDragDistance(100, 0)).toBe(-100);
    expect(calculateDragDistance(0, 0)).toBe(0);
  });

  it('should handle negative coordinates', () => {
    expect(calculateDragDistance(-50, 50)).toBe(100);
    expect(calculateDragDistance(50, -50)).toBe(-100);
    expect(calculateDragDistance(-100, -50)).toBe(50);
  });

  it('should handle decimal values', () => {
    expect(calculateDragDistance(10.5, 20.5)).toBe(10);
    expect(calculateDragDistance(10.3, 20.8)).toBeCloseTo(10.5);
  });

  it('should handle very large values', () => {
    expect(calculateDragDistance(0, 10000)).toBe(10000);
    expect(calculateDragDistance(10000, 0)).toBe(-10000);
  });
});

// ============================================================================
// shouldDismiss Tests
// ============================================================================

describe('shouldDismiss', () => {
  it('should return true when distance exceeds threshold', () => {
    expect(shouldDismiss(150, 100)).toBe(true);
  });

  it('should return false when distance is below threshold', () => {
    expect(shouldDismiss(50, 100)).toBe(false);
  });

  it('should return false when distance equals threshold (must exceed)', () => {
    expect(shouldDismiss(100, 100)).toBe(false);
  });

  it('should return false for zero distance', () => {
    expect(shouldDismiss(0, 100)).toBe(false);
  });

  it('should return false for negative distance', () => {
    expect(shouldDismiss(-50, 100)).toBe(false);
  });

  it('should handle zero threshold', () => {
    expect(shouldDismiss(1, 0)).toBe(true);
    expect(shouldDismiss(0, 0)).toBe(false);
    expect(shouldDismiss(-1, 0)).toBe(false);
  });

  it('should handle decimal values', () => {
    expect(shouldDismiss(100.5, 100)).toBe(true);
    expect(shouldDismiss(99.9, 100)).toBe(false);
  });

  it('should handle very small threshold', () => {
    expect(shouldDismiss(0.001, 0)).toBe(true);
    expect(shouldDismiss(0.001, 0.002)).toBe(false);
  });
});

// ============================================================================
// calculateTransform Tests
// ============================================================================

describe('calculateTransform', () => {
  it('should return correct transform string for positive distance', () => {
    expect(calculateTransform(50)).toBe('translateY(50px)');
  });

  it('should clamp negative distance to 0', () => {
    expect(calculateTransform(-20)).toBe('translateY(0px)');
  });

  it('should clamp distance exceeding default max', () => {
    expect(calculateTransform(500)).toBe(
      `translateY(${DEFAULT_MAX_DRAG_DISTANCE}px)`
    );
  });

  it('should use custom maxDistance when provided', () => {
    expect(calculateTransform(150, 100)).toBe('translateY(100px)');
    expect(calculateTransform(50, 100)).toBe('translateY(50px)');
  });

  it('should handle zero distance', () => {
    expect(calculateTransform(0)).toBe('translateY(0px)');
  });

  it('should handle distance at max boundary', () => {
    expect(calculateTransform(DEFAULT_MAX_DRAG_DISTANCE)).toBe(
      `translateY(${DEFAULT_MAX_DRAG_DISTANCE}px)`
    );
  });

  it('should handle decimal distances', () => {
    expect(calculateTransform(50.5, 100)).toBe('translateY(50.5px)');
  });

  it('should handle very small maxDistance', () => {
    expect(calculateTransform(10, 5)).toBe('translateY(5px)');
    expect(calculateTransform(3, 5)).toBe('translateY(3px)');
  });

  it('should handle zero maxDistance', () => {
    expect(calculateTransform(100, 0)).toBe('translateY(0px)');
  });
});

// ============================================================================
// getSwipeVelocity Tests
// ============================================================================

describe('getSwipeVelocity', () => {
  it('should calculate correct velocity', () => {
    expect(getSwipeVelocity(100, 200)).toBe(0.5);
  });

  it('should return absolute velocity for negative distance', () => {
    expect(getSwipeVelocity(-100, 200)).toBe(0.5);
  });

  it('should return 0 for zero time (prevents division by zero)', () => {
    expect(getSwipeVelocity(100, 0)).toBe(0);
  });

  it('should return 0 for negative time (invalid input)', () => {
    expect(getSwipeVelocity(100, -50)).toBe(0);
  });

  it('should return 0 for zero distance', () => {
    expect(getSwipeVelocity(0, 100)).toBe(0);
  });

  it('should handle decimal values', () => {
    expect(getSwipeVelocity(50, 100)).toBe(0.5);
    expect(getSwipeVelocity(33, 100)).toBe(0.33);
  });

  it('should handle very fast swipes', () => {
    expect(getSwipeVelocity(500, 100)).toBe(5);
  });

  it('should handle very slow swipes', () => {
    expect(getSwipeVelocity(10, 10000)).toBe(0.001);
  });

  it('should handle 1ms time accurately', () => {
    expect(getSwipeVelocity(5, 1)).toBe(5);
  });

  it('should always return non-negative value', () => {
    expect(getSwipeVelocity(-500, 100)).toBeGreaterThanOrEqual(0);
    expect(getSwipeVelocity(500, 100)).toBeGreaterThanOrEqual(0);
    expect(getSwipeVelocity(0, 0)).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// clampDragDistance Tests
// ============================================================================

describe('clampDragDistance', () => {
  it('should return distance when within bounds', () => {
    expect(clampDragDistance(50, 100)).toBe(50);
  });

  it('should clamp negative distance to 0', () => {
    expect(clampDragDistance(-20, 100)).toBe(0);
  });

  it('should clamp distance exceeding max to maxDistance', () => {
    expect(clampDragDistance(150, 100)).toBe(100);
  });

  it('should return 0 for zero distance', () => {
    expect(clampDragDistance(0, 100)).toBe(0);
  });

  it('should return maxDistance when distance equals maxDistance', () => {
    expect(clampDragDistance(100, 100)).toBe(100);
  });

  it('should handle zero maxDistance', () => {
    expect(clampDragDistance(50, 0)).toBe(0);
    expect(clampDragDistance(0, 0)).toBe(0);
    expect(clampDragDistance(-10, 0)).toBe(0);
  });

  it('should handle decimal values', () => {
    expect(clampDragDistance(50.5, 100)).toBe(50.5);
    expect(clampDragDistance(100.5, 100)).toBe(100);
    expect(clampDragDistance(-0.5, 100)).toBe(0);
  });

  it('should handle very large distances', () => {
    expect(clampDragDistance(10000, 100)).toBe(100);
    expect(clampDragDistance(-10000, 100)).toBe(0);
  });

  it('should handle very small positive distances', () => {
    expect(clampDragDistance(0.001, 100)).toBe(0.001);
    expect(clampDragDistance(0.001, 0.0001)).toBe(0.0001);
  });

  it('should not modify distance already at boundaries', () => {
    expect(clampDragDistance(0, 100)).toBe(0);
    expect(clampDragDistance(100, 100)).toBe(100);
  });
});

// ============================================================================
// DEFAULT_MAX_DRAG_DISTANCE Constant Tests
// ============================================================================

describe('DEFAULT_MAX_DRAG_DISTANCE', () => {
  it('should be a positive number', () => {
    expect(DEFAULT_MAX_DRAG_DISTANCE).toBeGreaterThan(0);
  });

  it('should be 400 pixels', () => {
    expect(DEFAULT_MAX_DRAG_DISTANCE).toBe(400);
  });

  it('should be used as default in calculateTransform', () => {
    // Verify it's actually used as the default
    const overMaxDistance = DEFAULT_MAX_DRAG_DISTANCE + 100;
    expect(calculateTransform(overMaxDistance)).toBe(
      `translateY(${DEFAULT_MAX_DRAG_DISTANCE}px)`
    );
  });
});

// ============================================================================
// Integration Tests - Function Composition
// ============================================================================

describe('gesture utils integration', () => {
  it('should work together for a complete drag-to-dismiss flow', () => {
    const startY = 100;
    const currentY = 300;
    const dismissThreshold = 150;
    const startTime = 0;
    const currentTime = 200; // 200ms elapsed

    // Calculate distance
    const distance = calculateDragDistance(startY, currentY);
    expect(distance).toBe(200);

    // Check if should dismiss
    const shouldDismissResult = shouldDismiss(distance, dismissThreshold);
    expect(shouldDismissResult).toBe(true);

    // Get transform for animation
    const transform = calculateTransform(distance);
    expect(transform).toBe('translateY(200px)');

    // Calculate velocity
    const velocity = getSwipeVelocity(distance, currentTime - startTime);
    expect(velocity).toBe(1); // 200px / 200ms = 1px/ms
  });

  it('should handle a drag that does not meet threshold', () => {
    const startY = 100;
    const currentY = 150;
    const dismissThreshold = 100;

    const distance = calculateDragDistance(startY, currentY);
    expect(distance).toBe(50);

    const shouldDismissResult = shouldDismiss(distance, dismissThreshold);
    expect(shouldDismissResult).toBe(false);

    const transform = calculateTransform(distance);
    expect(transform).toBe('translateY(50px)');
  });

  it('should handle velocity-based dismiss (fast but short swipe)', () => {
    const startY = 100;
    const currentY = 150;
    const dismissThreshold = 100;
    const elapsedTime = 50; // 50ms (fast swipe)
    const velocityThreshold = 0.8; // px/ms

    const distance = calculateDragDistance(startY, currentY);
    expect(distance).toBe(50); // Below dismiss threshold

    const shouldDismissByDistance = shouldDismiss(distance, dismissThreshold);
    expect(shouldDismissByDistance).toBe(false);

    const velocity = getSwipeVelocity(distance, elapsedTime);
    expect(velocity).toBe(1); // 50px / 50ms = 1px/ms

    // Velocity exceeds threshold, so dismiss anyway
    const shouldDismissByVelocity = velocity > velocityThreshold;
    expect(shouldDismissByVelocity).toBe(true);
  });

  it('should properly clamp during animation', () => {
    const maxDistance = 200;

    // Simulate overshoot during elastic animation
    const overshootDistance = 250;
    const clampedDistance = clampDragDistance(overshootDistance, maxDistance);
    expect(clampedDistance).toBe(200);

    const transform = calculateTransform(overshootDistance, maxDistance);
    expect(transform).toBe('translateY(200px)');
  });
});
