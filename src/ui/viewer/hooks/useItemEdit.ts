/**
 * useItemEdit Hook
 *
 * Manages item edit state and modal flow for the Request Log Viewer.
 * Connects ItemCard Edit button to ItemEditForm via EditModal,
 * providing a complete edit workflow with state management.
 *
 * The hook handles two different usage patterns:
 *
 * 1. **Form-driven save (recommended)**: The ItemEditForm has its own Save button.
 *    When the form submits, it calls onSave with the updated item. The hook then
 *    calls onItemUpdated, shows toast feedback, and closes the modal.
 *
 * 2. **Modal-driven save**: For simple forms without their own buttons, the modal's
 *    Save button triggers saveItem directly.
 *
 * Usage:
 * ```tsx
 * const { requestEdit, modalProps, formProps } = useItemEdit(
 *   async (item) => { await updateItem(item); },
 *   fieldOptions
 * );
 *
 * // On item card
 * <ItemCard onEdit={requestEdit} />
 *
 * // Render edit modal with form (form has its own Save/Cancel buttons)
 * <EditModal {...modalProps}>
 *   {formProps && <ItemEditForm {...formProps} fieldOptions={fieldOptions} />}
 * </EditModal>
 * ```
 */

import { useState, useCallback, useMemo } from 'react';
import type { RequestLogItem } from '@core/models';
import type { ItemEditFormProps } from '../ItemEditForm';
import { useToast } from '@ui/shared/useToast';

/**
 * Props for EditModal that the hook provides
 */
export interface ItemEditModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Modal title */
  title: string;
  /** Called when modal closes */
  onClose: () => void;
  /** Called when save clicked (for modal-driven saves) */
  onSave: () => void;
  /** Loading state for save button */
  isSaving: boolean;
  /** Disable save button */
  saveDisabled: boolean;
}

/**
 * Props for ItemEditForm that the hook provides
 */
export interface ItemEditFormHookProps {
  /** Item being edited */
  item: RequestLogItem;
  /** Called when form is saved with updated item */
  onSave: (item: RequestLogItem) => void;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Whether form is currently saving */
  isSaving: boolean;
}

/**
 * Return type for useItemEdit hook
 */
export interface UseItemEditResult {
  /** Item currently being edited (or null) */
  itemToEdit: RequestLogItem | null;
  /** Whether edit modal is open */
  isModalOpen: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Call to initiate edit (opens modal) */
  requestEdit: (item: RequestLogItem) => void;
  /** Call to save the edited item */
  saveItem: (updatedItem: RequestLogItem) => Promise<void>;
  /** Call to cancel edit */
  cancelEdit: () => void;
  /** Props for EditModal */
  modalProps: ItemEditModalProps;
  /** Props for ItemEditForm (null when no item is being edited) */
  formProps: ItemEditFormHookProps | null;
}

/**
 * Hook for managing item edit modal flow
 *
 * @param onItemUpdated - Async callback called when item is saved (receives updated item with new modified_at)
 * @param _fieldOptions - Field options for the form (unused, for API consistency)
 * @returns Edit state and modal/form props
 */
export function useItemEdit(
  onItemUpdated: (item: RequestLogItem) => Promise<void>,
  _fieldOptions: ItemEditFormProps['fieldOptions']
): UseItemEditResult {
  const [itemToEdit, setItemToEdit] = useState<RequestLogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  /**
   * Whether the edit modal is open
   */
  const isModalOpen = itemToEdit !== null;

  /**
   * Request edit of an item - opens the modal
   */
  const requestEdit = useCallback((item: RequestLogItem) => {
    setItemToEdit(item);
  }, []);

  /**
   * Cancel edit - closes modal without saving
   */
  const cancelEdit = useCallback(() => {
    if (!isSaving) {
      setItemToEdit(null);
    }
  }, [isSaving]);

  /**
   * Save the edited item
   * Ensures modified_at is set to current time and calls onItemUpdated callback
   */
  const saveItem = useCallback(
    async (updatedItem: RequestLogItem) => {
      if (isSaving) return;

      setIsSaving(true);

      try {
        // Ensure modified_at is set to current time
        const itemWithTimestamp: RequestLogItem = {
          ...updatedItem,
          modified_at: new Date(),
        };

        await onItemUpdated(itemWithTimestamp);

        // Success - close modal and show toast
        setItemToEdit(null);
        addToast({
          type: 'success',
          message: 'Item updated',
        });
      } catch (error) {
        // Error - keep modal open and show error toast
        console.error('Failed to update item:', error);
        addToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to update item',
          duration: 7000,
        });
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, onItemUpdated, addToast]
  );

  /**
   * Handle form save - called when ItemEditForm submits
   * This triggers the actual save operation
   */
  const handleFormSave = useCallback(
    (updatedItem: RequestLogItem) => {
      saveItem(updatedItem);
    },
    [saveItem]
  );

  /**
   * Handle modal save button click
   * This is a no-op when using ItemEditForm (which has its own Save button)
   * but needed for the EditModal API compatibility
   */
  const handleModalSave = useCallback(() => {
    // When using ItemEditForm, the form's Save button triggers handleFormSave
    // This is here for modal API compatibility but doesn't do anything
    // because the form handles the submit flow
  }, []);

  /**
   * Pre-configured modal props for EditModal component
   */
  const modalProps: ItemEditModalProps = useMemo(
    () => ({
      isOpen: isModalOpen,
      title: itemToEdit ? `Edit: ${itemToEdit.title}` : 'Edit Item',
      onClose: cancelEdit,
      onSave: handleModalSave,
      isSaving,
      // When using ItemEditForm, the modal's save button is not the primary action
      // The form has its own Save button, so we disable the modal's save button
      saveDisabled: true,
    }),
    [isModalOpen, itemToEdit, cancelEdit, handleModalSave, isSaving]
  );

  /**
   * Pre-configured form props for ItemEditForm component
   * Returns null when no item is being edited
   */
  const formProps: ItemEditFormHookProps | null = useMemo(() => {
    if (!itemToEdit) return null;

    return {
      item: itemToEdit,
      onSave: handleFormSave,
      onCancel: cancelEdit,
      isSaving,
    };
  }, [itemToEdit, handleFormSave, cancelEdit, isSaving]);

  return {
    itemToEdit,
    isModalOpen,
    isSaving,
    requestEdit,
    saveItem,
    cancelEdit,
    modalProps,
    formProps,
  };
}

export default useItemEdit;
