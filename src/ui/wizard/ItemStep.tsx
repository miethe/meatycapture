/**
 * ItemStep Component
 *
 * Main capture form step for entering request item details.
 * Third step in the wizard flow (Project -> Doc -> Item -> Review).
 * Enhanced with real-time validation and contextual help tooltips.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StepShell } from '../shared/StepShell';
import { DropdownWithAdd } from '../shared/DropdownWithAdd';
import { MultiSelectWithAdd } from '../shared/MultiSelectWithAdd';
import { FormField, type ValidationState } from '../shared/FormField';
import type { ItemDraft, FieldOption, FieldName } from '../../core/models';
import './ItemStep.css';

interface ItemStepProps {
  /** Form values */
  draft: ItemDraft;
  /** Called when draft changes */
  onDraftChange: (draft: ItemDraft) => void;

  /** Field options for dropdowns */
  fieldOptions: Record<FieldName, FieldOption[]>;
  /** Called when user adds a new field option */
  onAddFieldOption: (field: FieldName, value: string) => Promise<void>;

  /** Navigation */
  onBack: () => void;
  onNext: () => void;
  isLoading?: boolean;
}

export function ItemStep({
  draft,
  onDraftChange,
  fieldOptions,
  onAddFieldOption,
  onBack,
  onNext,
  isLoading = false,
}: ItemStepProps): React.JSX.Element {
  // Track validation states for fields
  const [titleValidation, setTitleValidation] = useState<ValidationState>('idle');

  // Convert FieldOption[] to dropdown format
  const convertOptions = useCallback((options: FieldOption[]) => {
    return options.map((opt) => ({
      id: opt.value,
      label: opt.value,
    }));
  }, []);

  // Memoize converted options
  const typeOptions = useMemo(
    () => convertOptions(fieldOptions.type),
    [fieldOptions.type, convertOptions]
  );
  const domainOptions = useMemo(
    () => convertOptions(fieldOptions.domain),
    [fieldOptions.domain, convertOptions]
  );
  const contextOptions = useMemo(
    () => convertOptions(fieldOptions.context),
    [fieldOptions.context, convertOptions]
  );
  const priorityOptions = useMemo(
    () => convertOptions(fieldOptions.priority),
    [fieldOptions.priority, convertOptions]
  );
  const statusOptions = useMemo(
    () => convertOptions(fieldOptions.status),
    [fieldOptions.status, convertOptions]
  );
  const tagOptions = useMemo(
    () => convertOptions(fieldOptions.tags),
    [fieldOptions.tags, convertOptions]
  );

  // Field change handlers with validation
  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      onDraftChange({ ...draft, title: value });

      // Real-time validation
      if (value.trim()) {
        setTitleValidation('valid');
      } else {
        setTitleValidation('idle');
      }
    },
    [draft, onDraftChange]
  );

  const handleTitleBlur = useCallback(() => {
    if (!draft.title.trim()) {
      setTitleValidation('error');
    }
  }, [draft.title]);

  const handleTypeChange = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, type: value });
    },
    [draft, onDraftChange]
  );

  const handleDomainChange = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, domain: value });
    },
    [draft, onDraftChange]
  );

  const handleContextChange = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, context: value });
    },
    [draft, onDraftChange]
  );

  const handlePriorityChange = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, priority: value });
    },
    [draft, onDraftChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, status: value });
    },
    [draft, onDraftChange]
  );

  const handleTagsChange = useCallback(
    (values: string[]) => {
      onDraftChange({ ...draft, tags: values });
    },
    [draft, onDraftChange]
  );

  const handleNotesChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDraftChange({ ...draft, notes: event.target.value });
    },
    [draft, onDraftChange]
  );

  // Add field option handlers
  const handleAddType = useCallback(
    async (value: string) => {
      await onAddFieldOption('type', value);
      onDraftChange({ ...draft, type: value });
    },
    [draft, onAddFieldOption, onDraftChange]
  );

  const handleAddDomain = useCallback(
    async (value: string) => {
      await onAddFieldOption('domain', value);
      onDraftChange({ ...draft, domain: value });
    },
    [draft, onAddFieldOption, onDraftChange]
  );

  const handleAddContext = useCallback(
    async (value: string) => {
      await onAddFieldOption('context', value);
      onDraftChange({ ...draft, context: value });
    },
    [draft, onAddFieldOption, onDraftChange]
  );

  const handleAddPriority = useCallback(
    async (value: string) => {
      await onAddFieldOption('priority', value);
      onDraftChange({ ...draft, priority: value });
    },
    [draft, onAddFieldOption, onDraftChange]
  );

  const handleAddStatus = useCallback(
    async (value: string) => {
      await onAddFieldOption('status', value);
      onDraftChange({ ...draft, status: value });
    },
    [draft, onAddFieldOption, onDraftChange]
  );

  const handleAddTag = useCallback(
    async (value: string) => {
      await onAddFieldOption('tags', value);
      onDraftChange({ ...draft, tags: [...draft.tags, value] });
    },
    [draft, onAddFieldOption, onDraftChange]
  );

  // Validation - required fields with error messages
  const titleError = useMemo(() => {
    if (titleValidation === 'error' && !draft.title.trim()) {
      return 'Title is required';
    }
  }, [titleValidation, draft.title]);

  const isNextDisabled = useMemo(() => {
    return !draft.title.trim() || !draft.type || !draft.priority || !draft.status || isLoading;
  }, [draft.title, draft.type, draft.priority, draft.status, isLoading]);

  return (
    <StepShell
      stepNumber={3}
      totalSteps={4}
      title="Capture Details"
      subtitle="Fill in the request information"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={isNextDisabled}
      nextLabel="Review"
    >
      <form className="item-form" aria-label="Item details form">
        {/* Title - Required */}
        <FormField
          label="Title"
          id="item-title"
          required
          {...(titleError ? { error: titleError } : {})}
          validationState={titleValidation}
          helperText="Brief summary of the request"
          tooltip="A concise title that describes what you're requesting"
        >
          <input
            id="item-title"
            type="text"
            className="input-base"
            value={draft.title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            placeholder="Brief description of the request"
            required
            aria-label="Item title"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'item-title-error' : 'item-title-helper'}
          />
        </FormField>

        {/* Two-column layout for dropdowns */}
        <div className="item-form-grid">
          {/* Type - Required */}
          <DropdownWithAdd
            label="Type"
            options={typeOptions}
            value={draft.type || null}
            onChange={handleTypeChange}
            onAddNew={handleAddType}
            placeholder="Select type..."
            helperText="What kind of request is this?"
            tooltip="Choose the category that best describes this request (enhancement, bug, feature, etc.)"
            required
          />

          {/* Domain - Optional */}
          <DropdownWithAdd
            label="Domain"
            options={domainOptions}
            value={draft.domain || null}
            onChange={handleDomainChange}
            onAddNew={handleAddDomain}
            placeholder="Select domain..."
            helperText="Which area of the product?"
            tooltip="The functional area or module this request applies to (web, mobile, api, etc.)"
          />

          {/* Context - Optional */}
          <DropdownWithAdd
            label="Context"
            options={contextOptions}
            value={draft.context || null}
            onChange={handleContextChange}
            onAddNew={handleAddContext}
            placeholder="Select context..."
            helperText="Additional context or category"
            tooltip="Specific context or subcategory for this request"
          />

          {/* Priority - Required */}
          <DropdownWithAdd
            label="Priority"
            options={priorityOptions}
            value={draft.priority || null}
            onChange={handlePriorityChange}
            onAddNew={handleAddPriority}
            placeholder="Select priority..."
            helperText="How urgent is this?"
            tooltip="Set the priority level: high (urgent), medium (normal), or low (can wait)"
            required
          />

          {/* Status - Required */}
          <DropdownWithAdd
            label="Status"
            options={statusOptions}
            value={draft.status || null}
            onChange={handleStatusChange}
            onAddNew={handleAddStatus}
            placeholder="Select status..."
            helperText="Current state of the request"
            tooltip="Workflow status: triage (new), backlog (accepted), in-progress, done, etc."
            required
          />
        </div>

        {/* Tags - Full width */}
        <MultiSelectWithAdd
          label="Tags"
          options={tagOptions}
          values={draft.tags}
          onChange={handleTagsChange}
          onAddNew={handleAddTag}
          placeholder="Select tags..."
          helperText="Keywords for categorization"
          tooltip="Add relevant tags to help organize and filter requests (ux, api, security, etc.)"
        />

        {/* Notes - Full width textarea */}
        <FormField
          label="Notes"
          id="item-notes"
          helperText="Describe the problem, goal, or provide additional context"
          tooltip="Detailed description of the request - explain what needs to be done and why"
        >
          <textarea
            id="item-notes"
            className="input-base item-notes-textarea"
            value={draft.notes}
            onChange={handleNotesChange}
            placeholder="Problem/goal description, context, or additional details"
            rows={6}
            aria-label="Item notes"
            aria-describedby="item-notes-helper"
          />
        </FormField>
      </form>
    </StepShell>
  );
}

export default ItemStep;
