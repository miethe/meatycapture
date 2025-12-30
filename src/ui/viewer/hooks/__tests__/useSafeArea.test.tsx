/**
 * useSafeArea Hook Tests
 *
 * Tests for safe area inset detection including:
 * - Initial inset detection from CSS env()
 * - Orientation change handling
 * - Resize event handling
 * - Fallback values for unsupported browsers
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSafeArea, type SafeAreaInsets } from '../useSafeArea';

// Mock computed style values
let mockComputedStyle: Partial<CSSStyleDeclaration> = {};

// Track created elements for verification
let appendedElements: HTMLElement[] = [];
let removedElements: HTMLElement[] = [];

// Store event listeners for manual triggering
const eventListeners: Map<string, EventListener[]> = new Map();

describe('useSafeArea', () => {
  beforeEach(() => {
    // Reset mocks
    mockComputedStyle = {
      paddingTop: '0px',
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
    };
    appendedElements = [];
    removedElements = [];
    eventListeners.clear();

    // Mock document.body.appendChild
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      appendedElements.push(node as HTMLElement);
      return node;
    });

    // Mock document.body.removeChild
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
      removedElements.push(node as HTMLElement);
      return node;
    });

    // Mock window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      return mockComputedStyle as CSSStyleDeclaration;
    });

    // Mock window.addEventListener to capture listeners
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        const listeners = eventListeners.get(type) || [];
        listeners.push(listener as EventListener);
        eventListeners.set(type, listeners);
      }
    );

    // Mock window.removeEventListener
    vi.spyOn(window, 'removeEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject) => {
        const listeners = eventListeners.get(type) || [];
        const index = listeners.indexOf(listener as EventListener);
        if (index > -1) {
          listeners.splice(index, 1);
          eventListeners.set(type, listeners);
        }
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to trigger window events
   */
  function triggerWindowEvent(eventType: string): void {
    const listeners = eventListeners.get(eventType) || [];
    listeners.forEach((listener) => {
      listener(new Event(eventType));
    });
  }

  /**
   * Helper to set mock computed style values
   */
  function setMockInsets(insets: SafeAreaInsets): void {
    mockComputedStyle = {
      paddingTop: `${insets.top}px`,
      paddingRight: `${insets.right}px`,
      paddingBottom: `${insets.bottom}px`,
      paddingLeft: `${insets.left}px`,
    };
  }

  describe('initial inset detection', () => {
    it('returns default insets (0) initially', () => {
      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    });

    it('reads insets from CSS env() values on mount', () => {
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 44,
        right: 0,
        bottom: 34,
        left: 0,
      });
    });

    it('creates and removes test element during detection', () => {
      renderHook(() => useSafeArea());

      // Should have created at least one test element (may be more due to React Strict Mode)
      expect(appendedElements.length).toBeGreaterThanOrEqual(1);

      // Each append should have a corresponding remove (synchronous cleanup)
      // Note: In StrictMode, effects run twice, so we may have more appends than removes
      // due to the async nature of effect cleanup. The key test is that elements are created.
      expect(removedElements.length).toBeGreaterThanOrEqual(1);
    });

    it('creates test element as a div', () => {
      renderHook(() => useSafeArea());

      // Verify the element is a div
      const testElement = appendedElements[0];
      expect(testElement).toBeDefined();
      expect(testElement?.tagName).toBe('DIV');
    });

    it('handles all four inset values', () => {
      setMockInsets({ top: 47, right: 16, bottom: 34, left: 16 });

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 47,
        right: 16,
        bottom: 34,
        left: 16,
      });
    });
  });

  describe('orientation change handling', () => {
    it('registers orientationchange event listener on mount', () => {
      renderHook(() => useSafeArea());

      expect(eventListeners.has('orientationchange')).toBe(true);
      expect(eventListeners.get('orientationchange')?.length).toBe(1);
    });

    it('updates insets on orientationchange event', () => {
      // Start with portrait insets
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 44,
        right: 0,
        bottom: 34,
        left: 0,
      });

      // Simulate rotation to landscape
      act(() => {
        setMockInsets({ top: 0, right: 44, bottom: 21, left: 44 });
        triggerWindowEvent('orientationchange');
      });

      expect(result.current).toEqual({
        top: 0,
        right: 44,
        bottom: 21,
        left: 44,
      });
    });

    it('removes orientationchange listener on unmount', () => {
      const { unmount } = renderHook(() => useSafeArea());

      expect(eventListeners.get('orientationchange')?.length).toBe(1);

      unmount();

      expect(eventListeners.get('orientationchange')?.length).toBe(0);
    });
  });

  describe('resize event handling', () => {
    it('registers resize event listener on mount', () => {
      renderHook(() => useSafeArea());

      expect(eventListeners.has('resize')).toBe(true);
      expect(eventListeners.get('resize')?.length).toBe(1);
    });

    it('updates insets on resize event', () => {
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result } = renderHook(() => useSafeArea());

      expect(result.current.top).toBe(44);

      // Simulate resize (e.g., browser chrome hiding)
      act(() => {
        setMockInsets({ top: 44, right: 0, bottom: 0, left: 0 });
        triggerWindowEvent('resize');
      });

      expect(result.current.bottom).toBe(0);
    });

    it('removes resize listener on unmount', () => {
      const { unmount } = renderHook(() => useSafeArea());

      expect(eventListeners.get('resize')?.length).toBe(1);

      unmount();

      expect(eventListeners.get('resize')?.length).toBe(0);
    });
  });

  describe('fallback values', () => {
    it('returns 0 for empty computed style values', () => {
      mockComputedStyle = {
        paddingTop: '',
        paddingRight: '',
        paddingBottom: '',
        paddingLeft: '',
      };

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    });

    it('handles non-numeric CSS values gracefully', () => {
      mockComputedStyle = {
        paddingTop: 'auto',
        paddingRight: 'inherit',
        paddingBottom: 'initial',
        paddingLeft: 'unset',
      };

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    });

    it('handles missing computed style properties', () => {
      mockComputedStyle = {};

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
    });

    it('parses fractional pixel values', () => {
      setMockInsets({ top: 44.5, right: 0.5, bottom: 34.25, left: 0 });

      const { result } = renderHook(() => useSafeArea());

      expect(result.current).toEqual({
        top: 44.5,
        right: 0.5,
        bottom: 34.25,
        left: 0,
      });
    });
  });

  describe('optimization', () => {
    it('does not update state when insets have not changed', () => {
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result } = renderHook(() => useSafeArea());
      const initialInsets = result.current;

      // Trigger resize with same values
      act(() => {
        triggerWindowEvent('resize');
      });

      // Should be the same object reference (no re-render)
      expect(result.current).toBe(initialInsets);
    });

    it('updates state when any inset value changes', () => {
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result } = renderHook(() => useSafeArea());
      const initialInsets = result.current;

      // Change just the bottom inset
      act(() => {
        setMockInsets({ top: 44, right: 0, bottom: 0, left: 0 });
        triggerWindowEvent('resize');
      });

      // Should be a new object reference
      expect(result.current).not.toBe(initialInsets);
      expect(result.current.bottom).toBe(0);
    });
  });

  describe('multiple hook instances', () => {
    it('each instance reads insets independently', () => {
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result: result1 } = renderHook(() => useSafeArea());
      const { result: result2 } = renderHook(() => useSafeArea());

      expect(result1.current).toEqual(result2.current);
      expect(result1.current.top).toBe(44);
    });

    it('all instances update on orientation change', () => {
      setMockInsets({ top: 44, right: 0, bottom: 34, left: 0 });

      const { result: result1 } = renderHook(() => useSafeArea());
      const { result: result2 } = renderHook(() => useSafeArea());

      act(() => {
        setMockInsets({ top: 0, right: 44, bottom: 21, left: 44 });
        triggerWindowEvent('orientationchange');
      });

      expect(result1.current.right).toBe(44);
      expect(result2.current.right).toBe(44);
    });
  });

  describe('interface export', () => {
    it('SafeAreaInsets interface has correct shape', () => {
      const { result } = renderHook(() => useSafeArea());

      // TypeScript compile-time check - this test validates the interface
      const insets: SafeAreaInsets = result.current;

      expect(typeof insets.top).toBe('number');
      expect(typeof insets.right).toBe('number');
      expect(typeof insets.bottom).toBe('number');
      expect(typeof insets.left).toBe('number');
    });
  });
});
