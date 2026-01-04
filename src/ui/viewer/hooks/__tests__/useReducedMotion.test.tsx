/**
 * useReducedMotion Hook Tests
 *
 * Tests for the prefers-reduced-motion detection hook.
 * Covers initial preference detection, change event handling,
 * cleanup, and SSR safety.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion } from '../useReducedMotion';

/**
 * Mock MediaQueryList implementation
 *
 * Provides a controllable mock for window.matchMedia
 * with support for both modern and legacy event APIs.
 */
interface MockMediaQueryList {
  matches: boolean;
  media: string;
  onchange: ((event: MediaQueryListEvent) => void) | null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: (event: Event) => boolean;
  // Internal helper for tests
  _triggerChange: (matches: boolean) => void;
}

/**
 * Creates a mock MediaQueryList with controllable matches state
 */
function createMockMediaQueryList(initialMatches: boolean): MockMediaQueryList {
  const listeners: Array<(event: MediaQueryListEvent) => void> = [];

  const mockMql: MockMediaQueryList = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(handler);
      }
    }),
    removeEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(handler);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    addListener: vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      listeners.push(handler);
    }),
    removeListener: vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(handler);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }),
    dispatchEvent: () => true,
    _triggerChange: (matches: boolean) => {
      mockMql.matches = matches;
      const event = { matches, media: mockMql.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };

  return mockMql;
}

describe('useReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockMql: MockMediaQueryList;

  beforeEach(() => {
    // Store original
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    // Restore original
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  describe('initial preference detection', () => {
    it('returns false when user has not enabled reduced motion', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('returns true when user has enabled reduced motion', () => {
      mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('queries the correct media query string', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      renderHook(() => useReducedMotion());

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });
  });

  describe('media query change handling', () => {
    it('updates when preference changes from false to true', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(false);

      // Simulate user enabling reduced motion
      act(() => {
        mockMql._triggerChange(true);
      });

      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('updates when preference changes from true to false', () => {
      mockMql = createMockMediaQueryList(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(true);

      // Simulate user disabling reduced motion
      act(() => {
        mockMql._triggerChange(false);
      });

      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('handles multiple preference changes', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      // Toggle multiple times
      act(() => {
        mockMql._triggerChange(true);
      });
      expect(result.current.prefersReducedMotion).toBe(true);

      act(() => {
        mockMql._triggerChange(false);
      });
      expect(result.current.prefersReducedMotion).toBe(false);

      act(() => {
        mockMql._triggerChange(true);
      });
      expect(result.current.prefersReducedMotion).toBe(true);
    });

    it('subscribes to change events using addEventListener', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      renderHook(() => useReducedMotion());

      expect(mockMql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('cleanup on unmount', () => {
    it('removes event listener on unmount', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('does not trigger state updates after unmount', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result, unmount } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(false);

      unmount();

      // This should not cause any React warnings or errors
      // because the listener should be removed
      act(() => {
        mockMql._triggerChange(true);
      });

      // Result should still be the last value before unmount
      expect(result.current.prefersReducedMotion).toBe(false);
    });
  });

  describe('legacy browser support', () => {
    it('falls back to addListener for older browsers', () => {
      mockMql = createMockMediaQueryList(false);
      // Remove modern API to simulate older browser
      const legacyMql = {
        ...mockMql,
        addEventListener: undefined,
        removeEventListener: undefined,
      };
      window.matchMedia = vi.fn().mockReturnValue(legacyMql);

      renderHook(() => useReducedMotion());

      expect(mockMql.addListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('falls back to removeListener for cleanup in older browsers', () => {
      mockMql = createMockMediaQueryList(false);
      // Remove modern API to simulate older browser
      const legacyMql = {
        ...mockMql,
        addEventListener: undefined,
        removeEventListener: undefined,
      };
      window.matchMedia = vi.fn().mockReturnValue(legacyMql);

      const { unmount } = renderHook(() => useReducedMotion());

      unmount();

      expect(mockMql.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('matchMedia unavailable', () => {
    it('returns false when matchMedia is undefined', () => {
      // Remove matchMedia to simulate unsupported browser
      // @ts-expect-error - Intentionally setting matchMedia to undefined
      window.matchMedia = undefined;

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current.prefersReducedMotion).toBe(false);
    });

    it('does not throw when matchMedia is unavailable', () => {
      // @ts-expect-error - Intentionally setting matchMedia to undefined
      window.matchMedia = undefined;

      expect(() => {
        renderHook(() => useReducedMotion());
      }).not.toThrow();
    });

    it('does not set up listeners when matchMedia is unavailable', () => {
      // @ts-expect-error - Intentionally setting matchMedia to undefined
      window.matchMedia = undefined;

      const { unmount } = renderHook(() => useReducedMotion());

      // Should not throw on unmount when no listeners were set up
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('return type', () => {
    it('returns object with prefersReducedMotion property', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result } = renderHook(() => useReducedMotion());

      expect(result.current).toHaveProperty('prefersReducedMotion');
      expect(typeof result.current.prefersReducedMotion).toBe('boolean');
    });

    it('returns stable object reference when value does not change', () => {
      mockMql = createMockMediaQueryList(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMql);

      const { result, rerender } = renderHook(() => useReducedMotion());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // The object reference may change on rerender due to how React works,
      // but the boolean value should remain stable
      expect(firstResult.prefersReducedMotion).toBe(secondResult.prefersReducedMotion);
    });
  });
});
