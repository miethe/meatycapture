/**
 * ItemEditForm Component
 *
 * Form component for editing all RequestLogItem fields.
 * Uses shared form components for consistent styling and behavior.
 *
 * Features:
 * - Controlled form state
 * - Validation with error display
 * - Glass morphism styling
 * - Full accessibility support
 * - Works inside modal context
 */

import React, { useState, useCallback, useMemo, useId } from 'react';
import type { RequestLogItem, Note } from '@core/models';
import { DropdownWithAdd } from '../shared/DropdownWithAdd';
import { MultiSelectCombobox } from '../shared/MultiSelectCombobox';
import { MultiSelectWithAdd } from '../shared/MultiSelectWithAdd';
import '../shared/shared.css';
import './ItemEditForm.css';

/**
 * Props for the ItemEditForm component
 */
export interface ItemEditFormProps {
  /** Item being edited */
  item: RequestLogItem;
  /** Available field options for dropdowns */
  fieldOptions: {
    type: string[];
    domain: string[];
    subdomain: string[];
    priority: string[];
    status: string[];
    tags: string[];
  };
  /** Called when form is saved */
  onSave: (updatedItem: RequestLogItem) => void;
  /** Called when form is cancelled */
  onCancel: () => void;
  /** Whether form is currently saving */
  isSaving?: boolean;
}

/**
 * Form validation errors
 */
interface FormErrors {
  title?: string;
  type?: string;
}

/**
 * Convert string array to DropdownOption array
 */
function toDropdownOptions(values: string[]): { id: string; label: string }[] {
  return values.map((value) => ({ id: value, label: value }));
}

/**
 * ItemEditForm Component
 *
 * Renders a form for editing request log items with all fields.
 * Provides validation, error handling, and accessible form controls.
 */
export function ItemEditForm({
  item,
  fieldOptions,
  onSave,
  onCancel,
  isSaving = false,
}: ItemEditFormProps): React.JSX.Element {
  // Generate unique IDs for accessibility
  const formId = useId();

  // Form state - initialize from item prop
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState(item.type);
  const [domain, setDomain] = useState<string[]>(item.domain || []);
  const [subdomain, setSubdomain] = useState<string[]>(item.subdomain || []);
  const [context, setContext] = useState<string>(item.context || '');
  const [priority, setPriority] = useState(item.priority);
  const [status, setStatus] = useState(item.status);
  const [tags, setTags] = useState<string[]>(item.tags);
  // Notes are now Note[] - keep them unchanged for MVP (full notes UI in Phase 3)
  const [notes] = useState<Note[]>(item.notes || []);

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Track local field options for add-new functionality
  const [localDomainOptions, setLocalDomainOptions] = useState<string[]>(fieldOptions.domain);
  const [localSubdomainOptions, setLocalSubdomainOptions] = useState<string[]>(fieldOptions.subdomain);
  const [localTagOptions, setLocalTagOptions] = useState<string[]>(fieldOptions.tags);

  // Convert field options to dropdown format
  const typeOptions = useMemo(() => toDropdownOptions(fieldOptions.type), [fieldOptions.type]);
  const priorityOptions = useMemo(
    () => toDropdownOptions(fieldOptions.priority),
    [fieldOptions.priority]
  );
  const statusOptions = useMemo(
    () => toDropdownOptions(fieldOptions.status),
    [fieldOptions.status]
  );
  const tagMultiOptions = useMemo(
    () => localTagOptions.map((t) => ({ id: t, label: t })),
    [localTagOptions]
  );

  /**
   * Validate form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Title is required
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Type is required
    if (!type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, type]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      // Create updated item with new timestamp
      const updatedItem: RequestLogItem = {
        ...item,
        title: title.trim(),
        type,
        domain: domain,
        subdomain: subdomain,
        ...(context ? { context } : {}),
        priority,
        status,
        tags,
        notes,
        modified_at: new Date(),
      };

      onSave(updatedItem);
    },
    [item, title, type, domain, subdomain, context, priority, status, tags, notes, validateForm, onSave]
  );

  /**
   * Handle title change
   */
  const handleTitleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
    // Clear error when user starts typing
    setErrors((prev) => {
      const { title: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Handle type change
   */
  const handleTypeChange = useCallback((value: string) => {
    setType(value);
    // Clear error when user selects
    setErrors((prev) => {
      const { type: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Handle adding new type option
   */
  const handleAddType = useCallback(async (value: string) => {
    // For now, just select it - the parent can persist if needed
    setType(value);
    setErrors((prev) => {
      const { type: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Handle priority change
   */
  const handlePriorityChange = useCallback((value: string) => {
    setPriority(value);
  }, []);

  /**
   * Handle adding new priority option
   */
  const handleAddPriority = useCallback(async (_value: string) => {
    // Priority typically uses fixed options, but support add for flexibility
    // Parent would need to persist this
  }, []);

  /**
   * Handle status change
   */
  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
  }, []);

  /**
   * Handle adding new status option
   */
  const handleAddStatus = useCallback(async (_value: string) => {
    // Status typically uses fixed options, but support add for flexibility
    // Parent would need to persist this
  }, []);

  /**
   * Handle domain selection
   */
  const handleDomainSelect = useCallback((value: string) => {
    setDomain([value]); // Single selection for domain
  }, []);

  /**
   * Handle domain removal
   */
  const handleDomainRemove = useCallback(() => {
    setDomain([]);
  }, []);

  /**
   * Handle adding new domain
   */
  const handleDomainAdd = useCallback((value: string) => {
    setLocalDomainOptions((prev) => [...prev, value]);
    setDomain([value]);
  }, []);

  /**
   * Handle subdomain selection
   */
  const handleSubdomainSelect = useCallback((value: string) => {
    setSubdomain([value]); // Single selection for subdomain
  }, []);

  /**
   * Handle subdomain removal
   */
  const handleSubdomainRemove = useCallback(() => {
    setSubdomain([]);
  }, []);

  /**
   * Handle adding new subdomain
   */
  const handleSubdomainAdd = useCallback((value: string) => {
    setLocalSubdomainOptions((prev) => [...prev, value]);
    setSubdomain([value]);
  }, []);

  /**
   * Handle context text change (free-form)
   */
  const handleContextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setContext(event.target.value);
  }, []);

  /**
   * Handle tags change
   */
  const handleTagsChange = useCallback((newTags: string[]) => {
    setTags(newTags);
  }, []);

  /**
   * Handle adding new tag
   */
  const handleAddTag = useCallback(async (value: string) => {
    setLocalTagOptions((prev) => [...prev, value]);
    setTags((prev) => [...prev, value]);
  }, []);

  // Notes editing is disabled for MVP - full UI comes in Phase 3
  // Notes are preserved as-is when saving

  return (
    <form
      id={`${formId}-edit-form`}
      className="item-edit-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Edit item form"
    >
      {/* Title Field */}
      <div className="field-container">
        <div className="form-field-label-row">
          <label className="field-label required" htmlFor={`${formId}-title`}>
            Title
          </label>
        </div>
        <input
          id={`${formId}-title`}
          type="text"
          className={`input-base ${errors.title ? 'error' : ''}`}
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter item title..."
          disabled={isSaving}
          required
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? `${formId}-title-error` : undefined}
        />
        {errors.title && (
          <div className="error-message" id={`${formId}-title-error`} role="alert">
            {errors.title}
          </div>
        )}
      </div>

      {/* Type Field */}
      <DropdownWithAdd
        label="Type"
        options={typeOptions}
        value={type}
        onChange={handleTypeChange}
        onAddNew={handleAddType}
        placeholder="Select type..."
        required
        {...(errors.type ? { error: errors.type } : {})}
        disabled={isSaving}
        helperText="The category of this item (e.g., bug, enhancement)"
      />

      {/* Domain Field */}
      <MultiSelectCombobox
        label="Domain"
        options={localDomainOptions}
        selected={domain}
        onSelect={handleDomainSelect}
        onRemove={handleDomainRemove}
        onAdd={handleDomainAdd}
        placeholder="Select or type domain..."
        helperText="The area or module this item affects"
        disabled={isSaving}
      />

      {/* Subdomain Field */}
      <MultiSelectCombobox
        label="Subdomain"
        options={localSubdomainOptions}
        selected={subdomain}
        onSelect={handleSubdomainSelect}
        onRemove={handleSubdomainRemove}
        onAdd={handleSubdomainAdd}
        placeholder="Select or type subdomain..."
        helperText="Sub-category within the domain"
        disabled={isSaving}
      />

      {/* Context Field - Free-form text */}
      <div className="field-container">
        <div className="form-field-label-row">
          <label className="field-label" htmlFor={`${formId}-context`}>
            Context
          </label>
        </div>
        <input
          id={`${formId}-context`}
          type="text"
          className="input-base"
          value={context}
          onChange={handleContextChange}
          placeholder="Optional background/context for this item..."
          disabled={isSaving}
          aria-label="Item context"
        />
        <div className="form-field-helper">Additional context or background information</div>
      </div>

      {/* Priority Field */}
      <DropdownWithAdd
        label="Priority"
        options={priorityOptions}
        value={priority}
        onChange={handlePriorityChange}
        onAddNew={handleAddPriority}
        placeholder="Select priority..."
        disabled={isSaving}
        helperText="Urgency level of this item"
      />

      {/* Status Field */}
      <DropdownWithAdd
        label="Status"
        options={statusOptions}
        value={status}
        onChange={handleStatusChange}
        onAddNew={handleAddStatus}
        placeholder="Select status..."
        disabled={isSaving}
        helperText="Current state of this item"
      />

      {/* Tags Field */}
      <MultiSelectWithAdd
        label="Tags"
        options={tagMultiOptions}
        values={tags}
        onChange={handleTagsChange}
        onAddNew={handleAddTag}
        placeholder="Add tags..."
        helperText="Keywords for categorization and search"
      />

      {/* Notes Field - Read-only display for MVP (editing comes in Phase 3) */}
      {notes.length > 0 && (
        <div className="field-container">
          <div className="form-field-label-row">
            <label className="field-label" htmlFor={`${formId}-notes`}>
              Notes ({notes.length})
            </label>
          </div>
          <div className="form-field-helper" id={`${formId}-notes-helper`}>
            Notes editing will be available in a future update
          </div>
          <div
            id={`${formId}-notes`}
            className="input-base item-edit-notes"
            style={{ minHeight: '100px', whiteSpace: 'pre-wrap', opacity: 0.7 }}
            aria-describedby={`${formId}-notes-helper`}
          >
            {notes.map((n) => n.content).join('\n\n---\n\n')}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="item-edit-form-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
        <button
          type="submit"
          className={`button primary ${isSaving ? 'loading' : ''}`}
          disabled={isSaving}
          aria-busy={isSaving}
        >
          {isSaving ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span className="sr-only">Saving...</span>
              <span aria-hidden="true">Saving...</span>
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}

export default ItemEditForm;
