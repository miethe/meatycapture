/**
 * useItemDelete Hook Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemDelete } from '../useItemDelete';
import { ToastProvider } from '@ui/shared/useToast';
import type { RequestLogItem } from '@core/models';
import type { ReactNode } from 'react';

// Wrapper with ToastProvider for all tests
const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// Mock item factory
const createMockItem = (overrides: Partial<RequestLogItem> = {}): RequestLogItem => ({
  id: 'REQ-20251231-test-01',
  title: 'Test Item Title',
  type: 'enhancement',
  domain: ['web'],
  context: ['frontend'],
  priority: 'medium',
  status: 'triage',
  tags: ['ux', 'api'],
  notes: [],
  created_at: new Date('2025-12-31T10:00:00Z'),
  ...overrides,
});

describe('useItemDelete', () => {
  const mockOnDeleteConfirmed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDeleteConfirmed.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with null itemToDelete', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.itemToDelete).toBeNull();
    });

    it('starts with dialog closed', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.isDialogOpen).toBe(false);
    });

    it('starts with isDeleting false', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.isDeleting).toBe(false);
    });

    it('dialogProps.isOpen is false initially', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.dialogProps.isOpen).toBe(false);
    });
  });

  describe('requestDelete', () => {
    it('sets itemToDelete when called', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      expect(result.current.itemToDelete).toBe(item);
    });

    it('opens the dialog', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      expect(result.current.isDialogOpen).toBe(true);
      expect(result.current.dialogProps.isOpen).toBe(true);
    });

    it('updates dialogProps.message with item ID', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem({ id: 'REQ-20251231-custom-05' });

      act(() => {
        result.current.requestDelete(item);
      });

      expect(result.current.dialogProps.message).toBe(
        'Delete item REQ-20251231-custom-05? This action cannot be undone.'
      );
    });
  });

  describe('cancelDelete', () => {
    it('clears itemToDelete', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      expect(result.current.itemToDelete).not.toBeNull();

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.itemToDelete).toBeNull();
    });

    it('closes the dialog', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.isDialogOpen).toBe(false);
    });

    it('does not call onDeleteConfirmed', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      act(() => {
        result.current.cancelDelete();
      });

      expect(mockOnDeleteConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('confirmDelete', () => {
    it('calls onDeleteConfirmed with item ID', async () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem({ id: 'REQ-20251231-delete-me' });

      act(() => {
        result.current.requestDelete(item);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockOnDeleteConfirmed).toHaveBeenCalledTimes(1);
      expect(mockOnDeleteConfirmed).toHaveBeenCalledWith('REQ-20251231-delete-me');
    });

    it('sets isDeleting to true during deletion', async () => {
      let resolveDeletion: (() => void) | undefined;
      const slowDelete = new Promise<void>((resolve) => {
        resolveDeletion = resolve;
      });
      mockOnDeleteConfirmed.mockReturnValue(slowDelete);

      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      // Start deletion - confirmDelete is async and will set isDeleting
      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.confirmDelete();
      });

      // Check isDeleting is true while in progress
      expect(result.current.isDeleting).toBe(true);
      expect(result.current.dialogProps.isLoading).toBe(true);

      // Complete the deletion
      await act(async () => {
        resolveDeletion?.();
        await deletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it('closes dialog on successful deletion', async () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(result.current.isDialogOpen).toBe(false);
      expect(result.current.itemToDelete).toBeNull();
    });

    it('keeps dialog open on failure', async () => {
      const error = new Error('Delete failed');
      mockOnDeleteConfirmed.mockRejectedValue(error);

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      // Dialog should still be open
      expect(result.current.isDialogOpen).toBe(true);
      expect(result.current.itemToDelete).toBe(item);

      consoleSpy.mockRestore();
    });

    it('logs error to console on failure', async () => {
      const error = new Error('Network error');
      mockOnDeleteConfirmed.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete item:', error);

      consoleSpy.mockRestore();
    });

    it('does nothing when itemToDelete is null', async () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockOnDeleteConfirmed).not.toHaveBeenCalled();
    });

    it('prevents multiple concurrent deletions', async () => {
      let resolveDeletion: (() => void) | undefined;
      const slowDelete = new Promise<void>((resolve) => {
        resolveDeletion = resolve;
      });
      mockOnDeleteConfirmed.mockReturnValue(slowDelete);

      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      // Start first deletion
      let firstDelete: Promise<void>;
      act(() => {
        firstDelete = result.current.confirmDelete();
      });

      expect(result.current.isDeleting).toBe(true);

      // Try to start second deletion - should be ignored (call directly without await)
      act(() => {
        result.current.confirmDelete();
      });

      // Only one call should have been made
      expect(mockOnDeleteConfirmed).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolveDeletion?.();
        await firstDelete;
      });
    });
  });

  describe('dialogProps', () => {
    it('has correct title', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.dialogProps.title).toBe('Delete Item');
    });

    it('has correct confirm label', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.dialogProps.confirmLabel).toBe('Delete');
    });

    it('has correct cancel label', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.dialogProps.cancelLabel).toBe('Cancel');
    });

    it('isDangerous is true', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.dialogProps.isDangerous).toBe(true);
    });

    it('isLoading reflects isDeleting state', async () => {
      let resolveDeletion: (() => void) | undefined;
      const slowDelete = new Promise<void>((resolve) => {
        resolveDeletion = resolve;
      });
      mockOnDeleteConfirmed.mockReturnValue(slowDelete);

      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      // Initially not loading
      expect(result.current.dialogProps.isLoading).toBe(false);

      act(() => {
        result.current.requestDelete(item);
      });

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.confirmDelete();
      });

      expect(result.current.dialogProps.isLoading).toBe(true);

      await act(async () => {
        resolveDeletion?.();
        await deletePromise;
      });

      expect(result.current.dialogProps.isLoading).toBe(false);
    });

    it('onConfirm calls confirmDelete', async () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      await act(async () => {
        // Use dialogProps.onConfirm instead of confirmDelete directly
        result.current.dialogProps.onConfirm();
      });

      expect(mockOnDeleteConfirmed).toHaveBeenCalledTimes(1);
    });

    it('onCancel calls cancelDelete', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      expect(result.current.isDialogOpen).toBe(true);

      act(() => {
        result.current.dialogProps.onCancel();
      });

      expect(result.current.isDialogOpen).toBe(false);
    });

    it('message is empty string when itemToDelete is null', () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });

      expect(result.current.dialogProps.message).toBe('');
    });
  });

  describe('cancelDelete during deletion', () => {
    it('does not cancel when isDeleting is true', async () => {
      let resolveDeletion: (() => void) | undefined;
      const slowDelete = new Promise<void>((resolve) => {
        resolveDeletion = resolve;
      });
      mockOnDeleteConfirmed.mockReturnValue(slowDelete);

      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item = createMockItem();

      act(() => {
        result.current.requestDelete(item);
      });

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.confirmDelete();
      });

      expect(result.current.isDeleting).toBe(true);

      // Try to cancel during deletion
      act(() => {
        result.current.cancelDelete();
      });

      // Should still be open and deleting
      expect(result.current.isDialogOpen).toBe(true);
      expect(result.current.itemToDelete).toBe(item);

      // Cleanup
      await act(async () => {
        resolveDeletion?.();
        await deletePromise;
      });
    });
  });

  describe('multiple items', () => {
    it('can delete different items sequentially', async () => {
      const { result } = renderHook(() => useItemDelete(mockOnDeleteConfirmed), { wrapper });
      const item1 = createMockItem({ id: 'REQ-20251231-first-01' });
      const item2 = createMockItem({ id: 'REQ-20251231-second-02' });

      // Delete first item
      act(() => {
        result.current.requestDelete(item1);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      // Delete second item
      act(() => {
        result.current.requestDelete(item2);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(mockOnDeleteConfirmed).toHaveBeenCalledTimes(2);
      expect(mockOnDeleteConfirmed).toHaveBeenNthCalledWith(1, 'REQ-20251231-first-01');
      expect(mockOnDeleteConfirmed).toHaveBeenNthCalledWith(2, 'REQ-20251231-second-02');
    });
  });
});
