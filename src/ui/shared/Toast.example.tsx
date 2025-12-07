/**
 * Toast Usage Examples
 *
 * This file demonstrates how to use the toast notification system.
 * Remove or integrate into your actual components as needed.
 */
import { useToast } from './useToast';

export function ToastExamples() {
  const { addToast, clearAll } = useToast();

  const handleSuccess = () => {
    addToast({
      type: 'success',
      message: 'Item saved successfully!',
    });
  };

  const handleError = () => {
    addToast({
      type: 'error',
      message: 'Failed to save item. Please try again.',
    });
  };

  const handleWarning = () => {
    addToast({
      type: 'warning',
      message: 'This action cannot be undone.',
      duration: 7000, // Custom duration
    });
  };

  const handleInfo = () => {
    addToast({
      type: 'info',
      message: 'Press Ctrl+S to save your work.',
    });
  };

  const handleMultiple = () => {
    addToast({ type: 'info', message: 'Processing request...' });
    setTimeout(() => {
      addToast({ type: 'success', message: 'Request completed!' });
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <button onClick={handleSuccess}>Show Success Toast</button>
      <button onClick={handleError}>Show Error Toast</button>
      <button onClick={handleWarning}>Show Warning Toast</button>
      <button onClick={handleInfo}>Show Info Toast</button>
      <button onClick={handleMultiple}>Show Multiple Toasts</button>
      <button onClick={clearAll}>Clear All Toasts</button>
    </div>
  );
}

/**
 * Common Toast Patterns
 */
export class ToastHelpers {
  /**
   * Show a save success toast
   */
  static saveSuccess(addToast: ReturnType<typeof useToast>['addToast']) {
    return addToast({
      type: 'success',
      message: 'Saved successfully!',
    });
  }

  /**
   * Show a save error toast
   */
  static saveError(addToast: ReturnType<typeof useToast>['addToast'], error?: string) {
    return addToast({
      type: 'error',
      message: error || 'Failed to save. Please try again.',
      duration: 7000,
    });
  }

  /**
   * Show a validation error toast
   */
  static validationError(addToast: ReturnType<typeof useToast>['addToast'], field: string) {
    return addToast({
      type: 'error',
      message: `Invalid ${field}. Please check your input.`,
    });
  }

  /**
   * Show a network error toast
   */
  static networkError(addToast: ReturnType<typeof useToast>['addToast']) {
    return addToast({
      type: 'error',
      message: 'Network error. Please check your connection.',
      duration: 7000,
    });
  }

  /**
   * Show a copy success toast
   */
  static copySuccess(addToast: ReturnType<typeof useToast>['addToast']) {
    return addToast({
      type: 'success',
      message: 'Copied to clipboard!',
      duration: 3000,
    });
  }

  /**
   * Show a delete confirmation toast
   */
  static deleteWarning(addToast: ReturnType<typeof useToast>['addToast'], itemName: string) {
    return addToast({
      type: 'warning',
      message: `Are you sure you want to delete "${itemName}"?`,
      duration: 7000,
    });
  }

  /**
   * Show a delete success toast
   */
  static deleteSuccess(addToast: ReturnType<typeof useToast>['addToast']) {
    return addToast({
      type: 'success',
      message: 'Deleted successfully!',
    });
  }
}
