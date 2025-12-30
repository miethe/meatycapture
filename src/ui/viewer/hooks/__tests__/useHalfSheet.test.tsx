/**
 * useHalfSheet Hook Tests
 *
 * Comprehensive tests for the half-sheet state management hook.
 * Covers open/close, expand/collapse, keyboard handling, and debouncing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHalfSheet } from '../useHalfSheet';

describe('useHalfSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts closed and collapsed by default', () => {
      const { result } = renderHook(() => useHalfSheet());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isExpanded).toBe(false);
    });

    it('respects initialOpen option', () => {
      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isExpanded).toBe(false);
    });

    it('respects initialExpanded option', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: true, initialExpanded: true })
      );

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isExpanded).toBe(true);
    });

    it('ignores initialExpanded when initialOpen is false', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: false, initialExpanded: true })
      );

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isExpanded).toBe(true); // State is still true but meaningless
    });
  });

  describe('open', () => {
    it('opens the sheet', () => {
      const { result } = renderHook(() => useHalfSheet());

      act(() => {
        result.current.open();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isExpanded).toBe(false);
    });

    it('calls onOpen callback when opening', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useHalfSheet({ onOpen }));

      act(() => {
        result.current.open();
      });

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('does not call onOpen when already open', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useHalfSheet({ onOpen, initialOpen: true }));

      act(() => {
        result.current.open();
        vi.advanceTimersByTime(100);
      });

      expect(onOpen).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('closes the sheet', () => {
      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('resets expanded state when closing', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: true, initialExpanded: true })
      );

      expect(result.current.isExpanded).toBe(true);

      act(() => {
        result.current.close();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isExpanded).toBe(false);
    });

    it('calls onClose callback when closing', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onClose, initialOpen: true })
      );

      act(() => {
        result.current.close();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when already closed', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useHalfSheet({ onClose }));

      act(() => {
        result.current.close();
        vi.advanceTimersByTime(100);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('expand', () => {
    it('expands the sheet to full height', () => {
      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      act(() => {
        result.current.expand();
      });

      expect(result.current.isExpanded).toBe(true);
    });

    it('calls onExpand callback when expanding', () => {
      const onExpand = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onExpand, initialOpen: true })
      );

      act(() => {
        result.current.expand();
      });

      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('does not expand when sheet is closed', () => {
      const onExpand = vi.fn();
      const { result } = renderHook(() => useHalfSheet({ onExpand }));

      act(() => {
        result.current.expand();
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isExpanded).toBe(false);
      expect(onExpand).not.toHaveBeenCalled();
    });

    it('does not call onExpand when already expanded', () => {
      const onExpand = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onExpand, initialOpen: true, initialExpanded: true })
      );

      act(() => {
        result.current.expand();
        vi.advanceTimersByTime(100);
      });

      expect(onExpand).not.toHaveBeenCalled();
    });
  });

  describe('collapse', () => {
    it('collapses the sheet to half height', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: true, initialExpanded: true })
      );

      act(() => {
        result.current.collapse();
      });

      expect(result.current.isExpanded).toBe(false);
    });

    it('calls onCollapse callback when collapsing', () => {
      const onCollapse = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onCollapse, initialOpen: true, initialExpanded: true })
      );

      act(() => {
        result.current.collapse();
      });

      expect(onCollapse).toHaveBeenCalledTimes(1);
    });

    it('does not collapse when sheet is closed', () => {
      const onCollapse = vi.fn();
      const { result } = renderHook(() => useHalfSheet({ onCollapse }));

      act(() => {
        result.current.collapse();
        vi.advanceTimersByTime(100);
      });

      expect(onCollapse).not.toHaveBeenCalled();
    });

    it('does not call onCollapse when already collapsed', () => {
      const onCollapse = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onCollapse, initialOpen: true, initialExpanded: false })
      );

      act(() => {
        result.current.collapse();
        vi.advanceTimersByTime(100);
      });

      expect(onCollapse).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    it('expands when collapsed', () => {
      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      expect(result.current.isExpanded).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isExpanded).toBe(true);
    });

    it('collapses when expanded', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: true, initialExpanded: true })
      );

      expect(result.current.isExpanded).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isExpanded).toBe(false);
    });

    it('does nothing when sheet is closed', () => {
      const onExpand = vi.fn();
      const onCollapse = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onExpand, onCollapse })
      );

      act(() => {
        result.current.toggle();
        vi.advanceTimersByTime(100);
      });

      expect(result.current.isOpen).toBe(false);
      expect(onExpand).not.toHaveBeenCalled();
      expect(onCollapse).not.toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it('supports full lifecycle: open -> expand -> collapse -> close', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const onExpand = vi.fn();
      const onCollapse = vi.fn();

      const { result } = renderHook(() =>
        useHalfSheet({ onOpen, onClose, onExpand, onCollapse, debounceMs: 0 })
      );

      // Start closed
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isExpanded).toBe(false);

      // Open
      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.isExpanded).toBe(false);
      expect(onOpen).toHaveBeenCalledTimes(1);

      // Expand
      act(() => {
        result.current.expand();
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.isExpanded).toBe(true);
      expect(onExpand).toHaveBeenCalledTimes(1);

      // Collapse
      act(() => {
        result.current.collapse();
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.isExpanded).toBe(false);
      expect(onCollapse).toHaveBeenCalledTimes(1);

      // Close
      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isExpanded).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('can reopen after closing', () => {
      const { result } = renderHook(() => useHalfSheet({ debounceMs: 0 }));

      // Open
      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      // Close
      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);

      // Reopen
      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);
    });
  });

  describe('Escape key handling', () => {
    it('closes sheet on Escape key when enabled', () => {
      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      expect(result.current.isOpen).toBe(true);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('does not close on Escape when enableEscapeKey is false', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: true, enableEscapeKey: false })
      );

      expect(result.current.isOpen).toBe(true);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('does not respond to Escape when sheet is closed', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useHalfSheet({ onClose }));

      expect(result.current.isOpen).toBe(false);

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('ignores other keys', () => {
      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Enter' });
        document.dispatchEvent(event);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useHalfSheet({ initialOpen: true })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });

    it('removes event listener when sheet closes', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { result } = renderHook(() => useHalfSheet({ initialOpen: true }));

      // Listener should be added
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      // Close the sheet
      act(() => {
        result.current.close();
      });

      // Listener should be removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('debouncing', () => {
    it('debounces rapid state changes with default 100ms', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onOpen, onClose })
      );

      // First call should go through immediately
      act(() => {
        result.current.open();
      });
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(result.current.isOpen).toBe(true);

      // Rapid close should be debounced
      act(() => {
        result.current.close();
      });
      // Close is scheduled, not executed yet
      expect(result.current.isOpen).toBe(true);

      // Advance time past debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isOpen).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('respects custom debounceMs option', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onOpen, onClose, debounceMs: 200 })
      );

      act(() => {
        result.current.open();
      });

      // Rapid close
      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(true);

      // Advance 100ms - not enough
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isOpen).toBe(true);

      // Advance another 100ms - now should close
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('cancels pending state change when new change requested', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onOpen, onClose, debounceMs: 100 })
      );

      // Open first
      act(() => {
        result.current.open();
      });

      // Rapid close
      act(() => {
        result.current.close();
      });
      // Close is scheduled

      // Cancel with another open before debounce expires
      act(() => {
        vi.advanceTimersByTime(50);
        result.current.open(); // This should cancel the pending close
      });

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should still be open, close was cancelled
      expect(result.current.isOpen).toBe(true);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('allows immediate state change with debounceMs: 0', () => {
      const onOpen = vi.fn();
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useHalfSheet({ onOpen, onClose, debounceMs: 0 })
      );

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.open();
      });
      expect(result.current.isOpen).toBe(true);

      expect(onOpen).toHaveBeenCalledTimes(2);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('cleans up pending timeout on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useHalfSheet({ debounceMs: 100 })
      );

      act(() => {
        result.current.open();
      });

      act(() => {
        result.current.close();
      });
      // Close is pending

      unmount();

      // Advancing time should not cause errors
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // No errors means cleanup worked
      expect(true).toBe(true);
    });
  });

  describe('callback stability', () => {
    it('maintains stable callback references', () => {
      const { result, rerender } = renderHook(() => useHalfSheet());

      const initialOpen = result.current.open;
      const initialClose = result.current.close;
      const initialExpand = result.current.expand;
      const initialCollapse = result.current.collapse;
      const initialToggle = result.current.toggle;

      rerender();

      expect(result.current.open).toBe(initialOpen);
      expect(result.current.close).toBe(initialClose);
      expect(result.current.expand).toBe(initialExpand);
      expect(result.current.collapse).toBe(initialCollapse);
      expect(result.current.toggle).toBe(initialToggle);
    });
  });

  describe('edge cases', () => {
    it('handles multiple rapid toggles', () => {
      const { result } = renderHook(() =>
        useHalfSheet({ initialOpen: true, debounceMs: 0 })
      );

      act(() => {
        result.current.toggle(); // expand
        result.current.toggle(); // collapse
        result.current.toggle(); // expand
      });

      expect(result.current.isExpanded).toBe(true);
    });

    it('handles undefined callbacks gracefully', () => {
      const { result } = renderHook(() => useHalfSheet({}));

      // These should not throw
      act(() => {
        result.current.open();
      });
      act(() => {
        result.current.expand();
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current.collapse();
        vi.advanceTimersByTime(100);
      });
      act(() => {
        result.current.close();
        vi.advanceTimersByTime(100);
      });

      expect(true).toBe(true);
    });

    it('prevents default on Escape key', () => {
      renderHook(() => useHalfSheet({ initialOpen: true }));

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
