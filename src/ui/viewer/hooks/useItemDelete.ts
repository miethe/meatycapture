/**
 * useItemDelete Hook
 *
 * Manages item deletion state and confirmation dialog flow.
 * Provides a complete delete workflow with confirmation, loading states,
 * and toast feedback integration.
 *
 * Usage:
 * ```tsx
 * const { requestDelete, dialogProps } = useItemDelete(async (id) => {
 *   await deleteItem(id);
 * });
 *
 * // On item card
 * <ItemCard onDelete={requestDelete} />
 *
 * // Render confirmation dialog
 * <ConfirmationDialog {...dialogProps} />
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import type { RequestLogItem } from '@core/models';
import type { ConfirmationDialogProps } from '@ui/shared/ConfirmationDialog';
import { useToast } from '@ui/shared/useToast';

/**
 * Return type for useItemDelete hook
 */
export interface UseItemDeleteResult {
  /** Item currently being deleted (or null) */
  itemToDelete: RequestLogItem | null;
  /** Whether delete dialog is open */
  isDialogOpen: boolean;
  /** Whether deletion is in progress */
  isDeleting: boolean;
  /** Call to initiate delete (shows dialog) */
  requestDelete: (item: RequestLogItem) => void;
  /** Call to confirm deletion */
  confirmDelete: () => Promise<void>;
  /** Call to cancel deletion */
  cancelDelete: () => void;
  /** The dialog props ready to spread to ConfirmationDialog */
  dialogProps: ConfirmationDialogProps;
}

/**
 * Hook for managing item delete confirmation flow
 *
 * @param onDeleteConfirmed - Async callback called when deletion is confirmed
 * @returns Delete state and dialog props
 */
export function useItemDelete(
  onDeleteConfirmed: (itemId: string) => Promise<void>
): UseItemDeleteResult {
  const [itemToDelete, setItemToDelete] = useState<RequestLogItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToast();

  /**
   * Whether the confirmation dialog is open
   */
  const isDialogOpen = itemToDelete !== null;

  /**
   * Request deletion of an item - opens confirmation dialog
   */
  const requestDelete = useCallback((item: RequestLogItem) => {
    setItemToDelete(item);
  }, []);

  /**
   * Cancel deletion - closes dialog
   */
  const cancelDelete = useCallback(() => {
    if (!isDeleting) {
      setItemToDelete(null);
    }
  }, [isDeleting]);

  /**
   * Confirm deletion - executes the delete operation
   */
  const confirmDelete = useCallback(async () => {
    if (!itemToDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      await onDeleteConfirmed(itemToDelete.id);

      // Success - close dialog and show toast
      setItemToDelete(null);
      addToast({
        type: 'success',
        message: 'Item deleted',
      });
    } catch (error) {
      // Error - keep dialog open and show error toast
      console.error('Failed to delete item:', error);
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete item',
        duration: 7000,
      });
    } finally {
      setIsDeleting(false);
    }
  }, [itemToDelete, isDeleting, onDeleteConfirmed, addToast]);

  /**
   * Pre-configured dialog props for ConfirmationDialog component
   */
  const dialogProps: ConfirmationDialogProps = useMemo(
    () => ({
      isOpen: isDialogOpen,
      title: 'Delete Item',
      message: itemToDelete ? `Delete item ${itemToDelete.id}? This action cannot be undone.` : '',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: confirmDelete,
      onCancel: cancelDelete,
      isDangerous: true,
      isLoading: isDeleting,
    }),
    [isDialogOpen, itemToDelete, confirmDelete, cancelDelete, isDeleting]
  );

  return {
    itemToDelete,
    isDialogOpen,
    isDeleting,
    requestDelete,
    confirmDelete,
    cancelDelete,
    dialogProps,
  };
}

export default useItemDelete;
