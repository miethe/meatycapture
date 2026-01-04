/**
 * useItemEdit Hook Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useItemEdit } from '../useItemEdit';
import { ToastProvider } from '@ui/shared/useToast';
import type { RequestLogItem } from '@core/models';
import type { ReactNode } from 'react';

// Wrapper with ToastProvider for all tests
const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// Default field options for tests
const mockFieldOptions = {
  type: ['enhancement', 'bug', 'idea'],
  domain: ['web', 'api', 'mobile'],
  context: ['frontend', 'backend'],
  priority: ['low', 'medium', 'high'],
  status: ['triage', 'in-progress', 'done'],
  tags: ['ux', 'api', 'performance'],
};

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

describe('useItemEdit', () => {
  const mockOnItemUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnItemUpdated.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with null itemToEdit', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });

      expect(result.current.itemToEdit).toBeNull();
    });

    it('starts with modal closed', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });

      expect(result.current.isModalOpen).toBe(false);
    });

    it('starts with isSaving false', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('modalProps.isOpen is false initially', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });

      expect(result.current.modalProps.isOpen).toBe(false);
    });

    it('formProps is null initially', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });

      expect(result.current.formProps).toBeNull();
    });
  });

  describe('requestEdit', () => {
    it('sets itemToEdit when called', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.itemToEdit).toBe(item);
    });

    it('opens the modal', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.modalProps.isOpen).toBe(true);
    });

    it('updates modalProps.title with item title', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem({ title: 'My Custom Title' });

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.modalProps.title).toBe('Edit: My Custom Title');
    });

    it('populates formProps with item data', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.formProps).not.toBeNull();
      expect(result.current.formProps?.item).toBe(item);
      expect(result.current.formProps?.isSaving).toBe(false);
    });
  });

  describe('cancelEdit', () => {
    it('clears itemToEdit', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.itemToEdit).not.toBeNull();

      act(() => {
        result.current.cancelEdit();
      });

      expect(result.current.itemToEdit).toBeNull();
    });

    it('closes the modal', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      act(() => {
        result.current.cancelEdit();
      });

      expect(result.current.isModalOpen).toBe(false);
    });

    it('sets formProps back to null', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.formProps).not.toBeNull();

      act(() => {
        result.current.cancelEdit();
      });

      expect(result.current.formProps).toBeNull();
    });

    it('does not call onItemUpdated', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      act(() => {
        result.current.cancelEdit();
      });

      expect(mockOnItemUpdated).not.toHaveBeenCalled();
    });
  });

  describe('saveItem', () => {
    it('calls onItemUpdated with updated item', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();
      const updatedItem = { ...item, title: 'Updated Title' };

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(updatedItem);
      });

      expect(mockOnItemUpdated).toHaveBeenCalledTimes(1);
      expect(mockOnItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: item.id,
          title: 'Updated Title',
        })
      );
    });

    it('sets modified_at to current timestamp', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      expect(mockOnItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          modified_at: new Date('2026-01-01T12:00:00Z'),
        })
      );
    });

    it('sets isSaving to true during save', async () => {
      let resolveSave: (() => void) | undefined;
      const slowSave = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockOnItemUpdated.mockReturnValue(slowSave);

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveItem(item);
      });

      // Check isSaving is true while in progress
      expect(result.current.isSaving).toBe(true);
      expect(result.current.formProps?.isSaving).toBe(true);
      expect(result.current.modalProps.isSaving).toBe(true);

      // Complete the save
      await act(async () => {
        resolveSave?.();
        await savePromise;
      });

      expect(result.current.isSaving).toBe(false);
    });

    it('closes modal on successful save', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.itemToEdit).toBeNull();
    });

    it('keeps modal open on failure', async () => {
      const error = new Error('Save failed');
      mockOnItemUpdated.mockRejectedValue(error);

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      // Modal should still be open
      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.itemToEdit).toBe(item);

      consoleSpy.mockRestore();
    });

    it('resets isSaving to false on failure', async () => {
      const error = new Error('Save failed');
      mockOnItemUpdated.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      expect(result.current.isSaving).toBe(false);

      consoleSpy.mockRestore();
    });

    it('logs error to console on failure', async () => {
      const error = new Error('Network error');
      mockOnItemUpdated.mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to update item:', error);

      consoleSpy.mockRestore();
    });

    it('prevents multiple concurrent saves', async () => {
      let resolveSave: (() => void) | undefined;
      const slowSave = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockOnItemUpdated.mockReturnValue(slowSave);

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      // Start first save
      let firstSave: Promise<void>;
      act(() => {
        firstSave = result.current.saveItem(item);
      });

      expect(result.current.isSaving).toBe(true);

      // Try to start second save - should be ignored
      act(() => {
        result.current.saveItem({ ...item, title: 'Second Save' });
      });

      // Only one call should have been made
      expect(mockOnItemUpdated).toHaveBeenCalledTimes(1);

      // Cleanup
      await act(async () => {
        resolveSave?.();
        await firstSave;
      });
    });
  });

  describe('formProps.onSave', () => {
    it('triggers saveItem when called', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();
      const updatedItem = { ...item, title: 'Form Updated Title' };

      act(() => {
        result.current.requestEdit(item);
      });

      // Use formProps.onSave (simulates form submission)
      await act(async () => {
        result.current.formProps?.onSave(updatedItem);
      });

      expect(mockOnItemUpdated).toHaveBeenCalledTimes(1);
      expect(mockOnItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Form Updated Title',
        })
      );
    });

    it('closes modal on success via formProps.onSave', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        result.current.formProps?.onSave(item);
      });

      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe('formProps.onCancel', () => {
    it('calls cancelEdit when called', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.formProps?.onCancel();
      });

      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe('modalProps', () => {
    it('has correct default title when no item', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });

      expect(result.current.modalProps.title).toBe('Edit Item');
    });

    it('onClose calls cancelEdit', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.modalProps.onClose();
      });

      expect(result.current.isModalOpen).toBe(false);
    });

    it('saveDisabled is true (form has its own save button)', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      expect(result.current.modalProps.saveDisabled).toBe(true);
    });

    it('isSaving reflects saving state', async () => {
      let resolveSave: (() => void) | undefined;
      const slowSave = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockOnItemUpdated.mockReturnValue(slowSave);

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      // Initially not saving
      expect(result.current.modalProps.isSaving).toBe(false);

      act(() => {
        result.current.requestEdit(item);
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveItem(item);
      });

      expect(result.current.modalProps.isSaving).toBe(true);

      await act(async () => {
        resolveSave?.();
        await savePromise;
      });

      expect(result.current.modalProps.isSaving).toBe(false);
    });
  });

  describe('cancelEdit during save', () => {
    it('does not cancel when isSaving is true', async () => {
      let resolveSave: (() => void) | undefined;
      const slowSave = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockOnItemUpdated.mockReturnValue(slowSave);

      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();

      act(() => {
        result.current.requestEdit(item);
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveItem(item);
      });

      expect(result.current.isSaving).toBe(true);

      // Try to cancel during save
      act(() => {
        result.current.cancelEdit();
      });

      // Should still be open and saving
      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.itemToEdit).toBe(item);

      // Cleanup
      await act(async () => {
        resolveSave?.();
        await savePromise;
      });
    });
  });

  describe('multiple items', () => {
    it('can edit different items sequentially', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item1 = createMockItem({ id: 'REQ-20251231-first-01', title: 'First' });
      const item2 = createMockItem({ id: 'REQ-20251231-second-02', title: 'Second' });

      // Edit first item
      act(() => {
        result.current.requestEdit(item1);
      });

      await act(async () => {
        await result.current.saveItem(item1);
      });

      // Edit second item
      act(() => {
        result.current.requestEdit(item2);
      });

      await act(async () => {
        await result.current.saveItem(item2);
      });

      expect(mockOnItemUpdated).toHaveBeenCalledTimes(2);
      expect(mockOnItemUpdated).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: 'REQ-20251231-first-01' })
      );
      expect(mockOnItemUpdated).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: 'REQ-20251231-second-02' })
      );
    });

    it('updates title when switching items', () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item1 = createMockItem({ title: 'First Item' });
      const item2 = createMockItem({ title: 'Second Item' });

      act(() => {
        result.current.requestEdit(item1);
      });

      expect(result.current.modalProps.title).toBe('Edit: First Item');

      act(() => {
        result.current.cancelEdit();
      });

      act(() => {
        result.current.requestEdit(item2);
      });

      expect(result.current.modalProps.title).toBe('Edit: Second Item');
    });
  });

  describe('modified_at timestamp', () => {
    it('overwrites existing modified_at with current time', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem({
        modified_at: new Date('2025-01-01T00:00:00Z'), // Old timestamp
      });

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      // Should have current time, not the old one
      expect(mockOnItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          modified_at: new Date('2026-01-01T12:00:00Z'),
        })
      );
    });

    it('adds modified_at when not present', async () => {
      const { result } = renderHook(() => useItemEdit(mockOnItemUpdated, mockFieldOptions), {
        wrapper,
      });
      const item = createMockItem();
      // Ensure no modified_at
      delete (item as Partial<RequestLogItem>).modified_at;

      act(() => {
        result.current.requestEdit(item);
      });

      await act(async () => {
        await result.current.saveItem(item);
      });

      expect(mockOnItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          modified_at: new Date('2026-01-01T12:00:00Z'),
        })
      );
    });
  });
});
