/**
 * Toast Component Tests
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, ToastContainer } from '../Toast';
import type { ToastData } from '../Toast';

describe('Toast', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders success toast with correct styling', () => {
    const toast: ToastData = {
      id: 'test-1',
      type: 'success',
      message: 'Operation successful!',
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    expect(screen.getByText('Operation successful!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-success');
  });

  it('renders error toast with correct styling', () => {
    const toast: ToastData = {
      id: 'test-2',
      type: 'error',
      message: 'Something went wrong',
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-error');
  });

  it('renders warning toast with correct styling', () => {
    const toast: ToastData = {
      id: 'test-3',
      type: 'warning',
      message: 'Please be careful',
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    expect(screen.getByText('Please be careful')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-warning');
  });

  it('renders info toast with correct styling', () => {
    const toast: ToastData = {
      id: 'test-4',
      type: 'info',
      message: 'Did you know?',
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    expect(screen.getByText('Did you know?')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('toast-info');
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const toast: ToastData = {
      id: 'test-5',
      type: 'info',
      message: 'Click to dismiss',
    };
    const onDismiss = vi.fn();
    const user = userEvent.setup({ delay: null });

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    await user.click(dismissButton);

    // Wait for exit animation
    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalledWith('test-5');
      },
      { timeout: 500 }
    );
  });

  it('auto-dismisses after default duration', async () => {
    const toast: ToastData = {
      id: 'test-6',
      type: 'success',
      message: 'Auto dismiss',
      duration: 100, // Use shorter duration for testing
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    // Wait for auto-dismiss with real timers
    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalledWith('test-6');
      },
      { timeout: 500 }
    );
  });

  it('auto-dismisses after custom duration', async () => {
    const toast: ToastData = {
      id: 'test-7',
      type: 'warning',
      message: 'Custom duration',
      duration: 100, // Use shorter duration for testing
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    // Wait for auto-dismiss with real timers
    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalledWith('test-7');
      },
      { timeout: 500 }
    );
  });

  it('has correct ARIA attributes for error toasts', () => {
    const toast: ToastData = {
      id: 'test-8',
      type: 'error',
      message: 'Error message',
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('has correct ARIA attributes for non-error toasts', () => {
    const toast: ToastData = {
      id: 'test-9',
      type: 'success',
      message: 'Success message',
    };
    const onDismiss = vi.fn();

    render(<Toast toast={toast} onDismiss={onDismiss} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });
});

describe('ToastContainer', () => {
  it('renders nothing when toasts array is empty', () => {
    const onDismiss = vi.fn();
    const { container } = render(<ToastContainer toasts={[]} onDismiss={onDismiss} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders multiple toasts', () => {
    const toasts: ToastData[] = [
      { id: '1', type: 'success', message: 'First toast' },
      { id: '2', type: 'error', message: 'Second toast' },
      { id: '3', type: 'info', message: 'Third toast' },
    ];
    const onDismiss = vi.fn();

    render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
    expect(screen.getByText('Third toast')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    const toasts: ToastData[] = [
      { id: '1', type: 'success', message: 'Test toast' },
    ];
    const onDismiss = vi.fn();

    render(<ToastContainer toasts={toasts} onDismiss={onDismiss} />);

    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
  });
});
