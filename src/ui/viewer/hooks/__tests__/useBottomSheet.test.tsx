/**
 * useBottomSheet Hook Tests
 *
 * Tests for bottom sheet state management hook including:
 * - open, close, toggle operations
 * - Escape key handling
 * - Debounce behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBottomSheet } from '../useBottomSheet';

describe('useBottomSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with isOpen false', () => {
      const { result } = renderHook(() => useBottomSheet());
      expect(result.current.isOpen).toBe(false);
    });

    it('provides open, close, and toggle methods', () => {
      const { result } = renderHook(() => useBottomSheet());
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });
  });

  describe('open', () => {
    it('sets isOpen to true', () => {
      const { result } = renderHook(() => useBottomSheet());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('is idempotent when already open', () => {
      const { result } = renderHook(() => useBottomSheet());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('close', () => {
    it('sets isOpen to false', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open first
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('is idempotent when already closed', () => {
      const { result } = renderHook(() => useBottomSheet());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('toggle', () => {
    it('opens when closed', () => {
      const { result } = renderHook(() => useBottomSheet());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('closes when open', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open first
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('alternates state with each toggle after debounce', () => {
      const { result } = renderHook(() => useBottomSheet());

      // First toggle: closed -> open
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Second toggle: open -> closed
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Third toggle: closed -> open
      act(() => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('Escape key handling', () => {
    it('closes sheet when Escape is pressed', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open the sheet
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Simulate Escape key press
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        window.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('does not respond to Escape when closed', () => {
      const { result } = renderHook(() => useBottomSheet());

      expect(result.current.isOpen).toBe(false);

      // Simulate Escape key press
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        window.dispatchEvent(event);
      });

      // Should still be closed (no error)
      expect(result.current.isOpen).toBe(false);
    });

    it('ignores other keys', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open the sheet
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Simulate Enter key press
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        window.dispatchEvent(event);
      });

      // Should still be open
      expect(result.current.isOpen).toBe(true);
    });

    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { result, unmount } = renderHook(() => useBottomSheet());

      // Open the sheet to attach listener
      act(() => {
        result.current.open();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('removes event listener when sheet closes', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { result } = renderHook(() => useBottomSheet());

      // Open the sheet
      act(() => {
        result.current.open();
      });

      // Wait for debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Close the sheet
      act(() => {
        result.current.close();
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('debounce behavior', () => {
    it('prevents rapid state changes within debounce window', () => {
      const { result } = renderHook(() => useBottomSheet());

      // First open
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Immediate close attempt (should be blocked)
      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('allows state change after debounce window expires', () => {
      const { result } = renderHook(() => useBottomSheet());

      // First open
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Advance time past debounce window
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Close should now work
      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('blocks rapid toggle calls', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Rapid toggles
      act(() => {
        result.current.toggle();
        result.current.toggle();
        result.current.toggle();
      });

      // Only first toggle should have taken effect
      expect(result.current.isOpen).toBe(true);
    });

    it('blocks toggle within 100ms window', () => {
      const { result } = renderHook(() => useBottomSheet());

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);

      // Advance only 50ms (within debounce window)
      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.toggle();
      });

      // Should still be true
      expect(result.current.isOpen).toBe(true);

      // Advance past total 100ms
      act(() => {
        vi.advanceTimersByTime(50);
      });

      act(() => {
        result.current.toggle();
      });

      // Now should toggle
      expect(result.current.isOpen).toBe(false);
    });

    it('debounces open after close', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open first
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Close
      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);

      // Immediate re-open (should be blocked)
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(false);

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now open should work
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('callback stability', () => {
    it('provides stable callbacks across renders', () => {
      const { result, rerender } = renderHook(() => useBottomSheet());

      // Store initial callback references
      const initialOpen = result.current.open;
      const initialClose = result.current.close;
      const initialToggle = result.current.toggle;

      rerender();

      // Callbacks should be stable (memoized) when state hasn't changed
      // Note: These may change on state updates due to useCallback deps
      expect(result.current.open).toBe(initialOpen);
      expect(result.current.close).toBe(initialClose);
      expect(result.current.toggle).toBe(initialToggle);
    });
  });

  describe('FAB and Apply/Clear button callbacks', () => {
    it('open callback works for FAB', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Simulate FAB click
      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('close callback works for Apply button', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open first
      act(() => {
        result.current.open();
      });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Simulate Apply button click
      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('close callback works for Clear button', () => {
      const { result } = renderHook(() => useBottomSheet());

      // Open first
      act(() => {
        result.current.open();
      });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Simulate Clear button click
      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });
});
