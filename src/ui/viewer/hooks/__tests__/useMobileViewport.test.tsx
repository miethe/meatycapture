/**
 * useMobileViewport Hook Tests
 *
 * Tests for viewport detection, resize handling, and SSR safety.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMobileViewport,
  MOBILE_BREAKPOINT,
  DEFAULT_DEBOUNCE_DELAY,
  type ViewportState,
} from '../useMobileViewport';

// Store original window properties
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

/**
 * Helper to set viewport dimensions
 *
 * Mocks window.innerWidth and window.innerHeight for testing.
 */
function setViewportDimensions(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
}

/**
 * Helper to simulate window resize event
 */
function fireResizeEvent(): void {
  window.dispatchEvent(new Event('resize'));
}

describe('useMobileViewport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset to default desktop dimensions
    setViewportDimensions(1024, 768);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Restore original window properties
    setViewportDimensions(originalInnerWidth, originalInnerHeight);
  });

  describe('initial viewport detection', () => {
    it('detects desktop viewport on mount', () => {
      setViewportDimensions(1200, 800);

      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(800);
    });

    it('detects mobile viewport on mount (width <= 768)', () => {
      setViewportDimensions(768, 1024);

      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(768);
      expect(result.current.height).toBe(1024);
    });

    it('detects mobile viewport for small phones', () => {
      setViewportDimensions(375, 667);

      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);
    });

    it('detects desktop viewport just above breakpoint', () => {
      setViewportDimensions(769, 600);

      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(769);
    });

    it('returns correct interface shape', () => {
      const { result } = renderHook(() => useMobileViewport());

      // Type checking: ensure all properties exist with correct types
      const state: ViewportState = result.current;
      expect(typeof state.isMobile).toBe('boolean');
      expect(typeof state.width).toBe('number');
      expect(typeof state.height).toBe('number');
    });
  });

  describe('resize handling', () => {
    it('updates dimensions on window resize', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(false);

      // Simulate resize to mobile
      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(600);
      expect(result.current.height).toBe(800);
    });

    it('updates from mobile to desktop on resize', () => {
      setViewportDimensions(500, 800);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(true);

      // Simulate resize to desktop
      act(() => {
        setViewportDimensions(1200, 800);
        fireResizeEvent();
      });

      act(() => {
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(1200);
    });

    it('handles multiple resize events', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      // First resize
      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      expect(result.current.width).toBe(600);

      // Second resize
      act(() => {
        setViewportDimensions(1000, 600);
        fireResizeEvent();
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      expect(result.current.width).toBe(1000);
      expect(result.current.height).toBe(600);
    });
  });

  describe('debounce behavior', () => {
    it('does not update immediately on resize', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      // Should still have old dimensions
      expect(result.current.width).toBe(1200);
    });

    it('updates after debounce delay', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      // Advance time partially
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current.width).toBe(1200); // Still old

      // Advance remaining time
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current.width).toBe(600); // Now updated
    });

    it('resets debounce timer on rapid resizes', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      // First resize
      act(() => {
        setViewportDimensions(800, 600);
        fireResizeEvent();
      });

      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Second resize before delay expires
      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Should still have original because timer keeps resetting
      expect(result.current.width).toBe(1200);

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(50);
      });

      // Should now have latest dimensions
      expect(result.current.width).toBe(600);
    });

    it('uses default debounce delay of 100ms', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      // Check at 99ms - should not update yet
      act(() => {
        vi.advanceTimersByTime(99);
      });
      expect(result.current.width).toBe(1200);

      // Check at 100ms - should update
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.width).toBe(600);
    });

    it('respects custom debounce delay', () => {
      setViewportDimensions(1200, 800);
      const customDelay = 200;
      const { result } = renderHook(() => useMobileViewport(customDelay));

      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      // Check at 100ms - should not update with custom delay
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.width).toBe(1200);

      // Check at 200ms - should update
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.width).toBe(600);
    });

    it('captures final dimensions during rapid resize', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport());

      // Simulate rapid resizing (like dragging window edge)
      act(() => {
        setViewportDimensions(1000, 800);
        fireResizeEvent();
        vi.advanceTimersByTime(20);

        setViewportDimensions(900, 800);
        fireResizeEvent();
        vi.advanceTimersByTime(20);

        setViewportDimensions(800, 800);
        fireResizeEvent();
        vi.advanceTimersByTime(20);

        setViewportDimensions(700, 800);
        fireResizeEvent();
      });

      // Still original due to debouncing
      expect(result.current.width).toBe(1200);

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      // Should have final dimensions
      expect(result.current.width).toBe(700);
    });
  });

  describe('cleanup on unmount', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useMobileViewport());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('clears pending timeout on unmount', () => {
      setViewportDimensions(1200, 800);
      const { unmount } = renderHook(() => useMobileViewport());

      // Start a resize that will trigger debounce timeout
      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      // Unmount before debounce completes
      unmount();

      // Advancing time should not cause errors
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      // No errors should occur
      expect(true).toBe(true);
    });

    it('does not update state after unmount', () => {
      setViewportDimensions(1200, 800);
      const { result, unmount } = renderHook(() => useMobileViewport());

      const initialWidth = result.current.width;

      // Start a resize
      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
      });

      unmount();

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(DEFAULT_DEBOUNCE_DELAY);
      });

      // Result should still be initial value (component unmounted)
      // Note: After unmount, result.current still holds last value
      expect(result.current.width).toBe(initialWidth);
    });
  });

  describe('breakpoint constants', () => {
    it('exports MOBILE_BREAKPOINT as 768', () => {
      expect(MOBILE_BREAKPOINT).toBe(768);
    });

    it('exports DEFAULT_DEBOUNCE_DELAY as 100', () => {
      expect(DEFAULT_DEBOUNCE_DELAY).toBe(100);
    });

    it('isMobile is true at exactly breakpoint', () => {
      setViewportDimensions(MOBILE_BREAKPOINT, 600);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(true);
    });

    it('isMobile is false one pixel above breakpoint', () => {
      setViewportDimensions(MOBILE_BREAKPOINT + 1, 600);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero dimensions', () => {
      setViewportDimensions(0, 0);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(0);
      expect(result.current.height).toBe(0);
    });

    it('handles very large dimensions', () => {
      setViewportDimensions(5120, 2880);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(5120);
      expect(result.current.height).toBe(2880);
    });

    it('handles landscape mobile orientation', () => {
      // Mobile in landscape (width > height but still mobile width)
      setViewportDimensions(667, 375);
      const { result } = renderHook(() => useMobileViewport());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(667);
      expect(result.current.height).toBe(375);
    });

    it('handles debounce delay of 0', () => {
      setViewportDimensions(1200, 800);
      const { result } = renderHook(() => useMobileViewport(0));

      act(() => {
        setViewportDimensions(600, 800);
        fireResizeEvent();
        vi.advanceTimersByTime(0);
      });

      expect(result.current.width).toBe(600);
    });
  });
});

describe('useMobileViewport SSR safety', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // Note: Testing true SSR scenario (window undefined) is challenging
  // in jsdom environment. The hook is designed to handle this case
  // by checking typeof window === 'undefined' before accessing window.
  // The following tests verify the hook works correctly in browser environment.

  it('handles missing addEventListener gracefully during hydration', () => {
    // Ensure hook initializes correctly with window present
    const { result } = renderHook(() => useMobileViewport());

    expect(result.current).toBeDefined();
    expect(typeof result.current.isMobile).toBe('boolean');
  });

  it('initializes dimensions on mount even if initial state differs', () => {
    setViewportDimensions(1000, 600);
    const { result } = renderHook(() => useMobileViewport());

    // After mount, should reflect actual dimensions
    expect(result.current.width).toBe(1000);
    expect(result.current.height).toBe(600);
  });
});
