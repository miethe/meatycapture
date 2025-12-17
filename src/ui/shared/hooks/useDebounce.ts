/**
 * useDebounce Hook
 *
 * Provides two debouncing strategies:
 * 1. useDebounce - Debounces a value change
 * 2. useDebouncedCallback - Debounces a callback function
 *
 * Use cases:
 * - Text search inputs (debounce value)
 * - API calls on user input (debounce callback)
 * - Window resize handlers (debounce callback)
 * - Scroll event handlers (debounce callback)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce a value by the specified delay
 *
 * The debounced value will only update after the value has stopped
 * changing for the specified delay period.
 *
 * Example:
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // This will only run 300ms after the user stops typing
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 * ```
 *
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout to update the debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function
 *
 * Returns a memoized callback that will only execute after the specified
 * delay has passed since the last call. Useful for event handlers that
 * shouldn't fire on every event.
 *
 * Example:
 * ```tsx
 * const handleResize = useDebouncedCallback(() => {
 *   console.log('Window resized to:', window.innerWidth);
 * }, 500);
 *
 * useEffect(() => {
 *   window.addEventListener('resize', handleResize);
 *   return () => window.removeEventListener('resize', handleResize);
 * }, [handleResize]);
 * ```
 *
 * @param callback - Callback to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}
