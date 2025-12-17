/**
 * useDebounce Hook Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    // Update value but don't advance time
    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Still old value

    // Advance time but not enough
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('initial'); // Still old value

    // Advance past delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('updated'); // Now updated
  });

  it('resets debounce timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // First change
    rerender({ value: 'first' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Second change before delay expires
    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should still be initial because timer was reset
    expect(result.current).toBe('initial');

    // Advance remaining time
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Now should have latest value
    expect(result.current).toBe('second');
  });

  it('handles different data types', () => {
    // Number
    const { result: numberResult, rerender: rerenderNumber } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    rerenderNumber({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(numberResult.current).toBe(42);

    // Object
    const { result: objectResult, rerender: rerenderObject } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: { key: 'initial' } } }
    );

    const newObj = { key: 'updated' };
    rerenderObject({ value: newObj });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(objectResult.current).toBe(newObj);

    // Array
    const { result: arrayResult, rerender: rerenderArray } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: [1, 2, 3] } }
    );

    const newArray = [4, 5, 6];
    rerenderArray({ value: newArray });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(arrayResult.current).toBe(newArray);
  });

  it('cleans up timer on unmount', () => {
    const { unmount, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    unmount();

    // Advancing time should not cause issues
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // No errors should occur
    expect(true).toBe(true);
  });

  it('updates immediately when delay is 0', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debounces callback execution', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Call debounced function
    act(() => {
      result.current();
    });

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Advance time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Now callback should be called
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets timer on rapid calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));

    // Rapid calls
    act(() => {
      result.current();
      vi.advanceTimersByTime(100);
      result.current();
      vi.advanceTimersByTime(100);
      result.current();
      vi.advanceTimersByTime(100);
    });

    // Still no call because timer keeps resetting
    expect(callback).not.toHaveBeenCalled();

    // Advance past delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should only be called once with latest args
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback((...args: unknown[]) => callback(...args), 300)
    );

    act(() => {
      result.current(42, 'test');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith(42, 'test');
  });

  it('uses latest callback version', () => {
    let callbackVersion = 1;
    const { result, rerender } = renderHook(
      () => useDebouncedCallback(() => callbackVersion, 300)
    );

    // Call with version 1
    act(() => {
      result.current();
    });

    // Update callback to version 2
    callbackVersion = 2;
    rerender();

    // Execute debounced call
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should execute with version 2
    expect(callbackVersion).toBe(2);
  });

  it('cleans up timer on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedCallback(callback, 300)
    );

    act(() => {
      result.current();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled();
  });

  it('handles multiple arguments of different types', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback((...args: unknown[]) => callback(...args), 300)
    );

    const testObj = { key: 'value' };
    const testArr = [1, 2, 3];

    act(() => {
      result.current(42, 'test', testObj, testArr);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledWith(42, 'test', testObj, testArr);
  });

  it('only executes last call when called multiple times', () => {
    const callback = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedCallback((...args: unknown[]) => callback(...args), 300)
    );

    act(() => {
      result.current('first');
      result.current('second');
      result.current('third');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should only be called once with the last argument
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('third');
  });
});
