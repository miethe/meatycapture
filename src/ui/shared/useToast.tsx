/**
 * Toast Hook & Context
 *
 * Provides toast notification functionality throughout the app.
 * Usage: const { addToast } = useToast();
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ToastData, ToastType } from './Toast';

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (options: {
    type: ToastType;
    message: string;
    duration?: number;
  }) => string;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let toastIdCounter = 0;

/**
 * Generate unique toast ID
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${toastIdCounter++}`;
}

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast Provider Component
 * Wrap your app with this to enable toast notifications
 */
export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (options: { type: ToastType; message: string; duration?: number }): string => {
      const id = generateToastId();
      const newToast: ToastData = {
        id,
        type: options.type,
        message: options.message,
        duration: options.duration ?? 5000,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value: ToastContextValue = {
    toasts,
    addToast,
    dismissToast,
    clearAll,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/**
 * Hook to access toast functionality
 *
 * @example
 * const { addToast } = useToast();
 * addToast({ type: 'success', message: 'Saved successfully!' });
 * addToast({ type: 'error', message: 'Failed to save', duration: 7000 });
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
