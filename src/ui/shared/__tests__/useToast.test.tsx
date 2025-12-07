/**
 * useToast Hook Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../useToast';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws error when used outside ToastProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');

    console.error = originalError;
  });

  it('starts with empty toasts array', () => {
    const { result } = renderHook(() => useToast(), { wrapper });
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast with default duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({
        type: 'success',
        message: 'Test toast',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'success',
      message: 'Test toast',
      duration: 5000,
    });
    expect(result.current.toasts[0]?.id).toBeDefined();
  });

  it('adds a toast with custom duration', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({
        type: 'error',
        message: 'Error toast',
        duration: 7000,
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: 'error',
      message: 'Error toast',
      duration: 7000,
    });
  });

  it('returns unique ID for each toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id1: string = '';
    let id2: string = '';

    act(() => {
      id1 = result.current.addToast({
        type: 'info',
        message: 'First toast',
      });
      id2 = result.current.addToast({
        type: 'info',
        message: 'Second toast',
      });
    });

    expect(id1).not.toEqual(id2);
    expect(result.current.toasts).toHaveLength(2);
  });

  it('adds multiple toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({ type: 'success', message: 'First' });
      result.current.addToast({ type: 'error', message: 'Second' });
      result.current.addToast({ type: 'warning', message: 'Third' });
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0]?.message).toBe('First');
    expect(result.current.toasts[1]?.message).toBe('Second');
    expect(result.current.toasts[2]?.message).toBe('Third');
  });

  it('dismisses a specific toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id1: string = '';
    let id2: string = '';
    let id3: string = '';

    act(() => {
      id1 = result.current.addToast({ type: 'info', message: 'Toast 1' });
      id2 = result.current.addToast({ type: 'info', message: 'Toast 2' });
      id3 = result.current.addToast({ type: 'info', message: 'Toast 3' });
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.dismissToast(id2);
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts.find((t) => t.id === id1)).toBeDefined();
    expect(result.current.toasts.find((t) => t.id === id2)).toBeUndefined();
    expect(result.current.toasts.find((t) => t.id === id3)).toBeDefined();
  });

  it('clears all toasts', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({ type: 'info', message: 'Toast 1' });
      result.current.addToast({ type: 'info', message: 'Toast 2' });
      result.current.addToast({ type: 'info', message: 'Toast 3' });
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('supports all toast types', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({ type: 'success', message: 'Success' });
      result.current.addToast({ type: 'error', message: 'Error' });
      result.current.addToast({ type: 'warning', message: 'Warning' });
      result.current.addToast({ type: 'info', message: 'Info' });
    });

    expect(result.current.toasts).toHaveLength(4);
    expect(result.current.toasts[0]?.type).toBe('success');
    expect(result.current.toasts[1]?.type).toBe('error');
    expect(result.current.toasts[2]?.type).toBe('warning');
    expect(result.current.toasts[3]?.type).toBe('info');
  });

  it('maintains toast order (FIFO)', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast({ type: 'info', message: 'First' });
      result.current.addToast({ type: 'info', message: 'Second' });
      result.current.addToast({ type: 'info', message: 'Third' });
    });

    expect(result.current.toasts[0]?.message).toBe('First');
    expect(result.current.toasts[1]?.message).toBe('Second');
    expect(result.current.toasts[2]?.message).toBe('Third');
  });

  it('does not affect other toasts when dismissing one', () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    let id2: string = '';

    act(() => {
      result.current.addToast({ type: 'success', message: 'Keep me' });
      id2 = result.current.addToast({ type: 'error', message: 'Remove me' });
    });

    const toast1Before = result.current.toasts[0];

    act(() => {
      result.current.dismissToast(id2);
    });

    const toast1After = result.current.toasts[0];
    expect(toast1Before).toBe(toast1After); // Same reference
    expect(result.current.toasts).toHaveLength(1);
  });
});
