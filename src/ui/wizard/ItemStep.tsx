/**
 * ItemStep Component
 *
 * Main capture form step for entering request item details.
 * Third step in the wizard flow (Project -> Doc -> Item -> Review).
 * Enhanced with real-time validation and contextual help tooltips.
 * Includes structured notes support with add/edit/delete capabilities.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StepShell } from '../shared/StepShell';
import { DropdownWithAdd } from '../shared/DropdownWithAdd';
import { MultiSelectWithAdd } from '../shared/MultiSelectWithAdd';
import { MultiSelectCombobox } from '../shared/MultiSelectCombobox';
import { FormField, type ValidationState } from '../shared/FormField';
import { NoteModal } from '../shared/NoteModal';
import { NotesList } from '../shared/NotesList';
import { generateUUID } from '../shared/browserCompat';
import type { ItemDraft, FieldOption, FieldName, Note, NoteType } from '../../core/models';
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

  /** When true, the back button is hidden (used in batching mode or pre-selection) */
  lockNavigation?: boolean;
}

export function ItemStep({
  draft,
  onDraftChange,
  fieldOptions,
  onAddFieldOption,
  onBack,
  onNext,
  isLoading = false,
  lockNavigation = false,
}: ItemStepProps): React.JSX.Element {
  // Track validation states for fields
  const [titleValidation, setTitleValidation] = useState<ValidationState>('idle');

  // Notes modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

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
  const subdomainOptions = useMemo(
    () => convertOptions(fieldOptions.subdomain),
    [fieldOptions.subdomain, convertOptions]
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
  const featureOptions = useMemo(
    () => convertOptions(fieldOptions.feature),
    [fieldOptions.feature, convertOptions]
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

  // Domain multi-select handlers
  const handleDomainSelect = useCallback(
    (value: string) => {
      if (!draft.domain.includes(value)) {
        onDraftChange({ ...draft, domain: [...draft.domain, value] });
      }
    },
    [draft, onDraftChange]
  );

  const handleDomainRemove = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, domain: draft.domain.filter((d) => d !== value) });
    },
    [draft, onDraftChange]
  );

  const handleDomainAdd = useCallback(
    async (value: string) => {
      await onAddFieldOption('domain', value);
      onDraftChange({ ...draft, domain: [...draft.domain, value] });
    },
    [draft, onDraftChange, onAddFieldOption]
  );

  // Subdomain multi-select handlers
  const handleSubdomainSelect = useCallback(
    (value: string) => {
      if (!draft.subdomain.includes(value)) {
        onDraftChange({ ...draft, subdomain: [...draft.subdomain, value] });
      }
    },
    [draft, onDraftChange]
  );

  const handleSubdomainRemove = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, subdomain: draft.subdomain.filter((s) => s !== value) });
    },
    [draft, onDraftChange]
  );

  const handleSubdomainAdd = useCallback(
    async (value: string) => {
      await onAddFieldOption('subdomain', value);
      onDraftChange({ ...draft, subdomain: [...draft.subdomain, value] });
    },
    [draft, onDraftChange, onAddFieldOption]
  );

  // Feature multi-select handlers
  const handleFeatureSelect = useCallback(
    (value: string) => {
      if (!draft.feature.includes(value)) {
        onDraftChange({ ...draft, feature: [...draft.feature, value] });
      }
    },
    [draft, onDraftChange]
  );

  const handleFeatureRemove = useCallback(
    (value: string) => {
      onDraftChange({ ...draft, feature: draft.feature.filter((f) => f !== value) });
    },
    [draft, onDraftChange]
  );

  const handleFeatureAdd = useCallback(
    async (value: string) => {
      await onAddFieldOption('feature', value);
      onDraftChange({ ...draft, feature: [...draft.feature, value] });
    },
    [draft, onDraftChange, onAddFieldOption]
  );

  // Context text input handler (free-form)
  const handleContextChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onDraftChange({ ...draft, context: event.target.value });
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

  // Notes handlers
  const handleOpenAddNote = useCallback(() => {
    setEditingNote(undefined);
    setIsNoteModalOpen(true);
  }, []);

  const handleOpenEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  }, []);

  const handleCloseNoteModal = useCallback(() => {
    setIsNoteModalOpen(false);
    setEditingNote(undefined);
  }, []);

  const handleSaveNote = useCallback(
    (noteData: Omit<Note, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      const now = new Date();

      if (noteData.id) {
        // Edit existing note
        const updatedNotes = draft.notes.map((n) =>
          n.id === noteData.id
            ? {
                ...n,
                type: noteData.type,
                content: noteData.content,
                updated_at: now,
              }
            : n
        );
        onDraftChange({ ...draft, notes: updatedNotes });
      } else {
        // Add new note with temporary ID
        const newNote: Note = {
          id: generateUUID(),
          type: noteData.type as NoteType,
          content: noteData.content,
          created_at: now,
          updated_at: now,
        };
        onDraftChange({ ...draft, notes: [...draft.notes, newNote] });
      }

      handleCloseNoteModal();
    },
    [draft, onDraftChange, handleCloseNoteModal]
  );

  const handleDeleteNote = useCallback(
    (note: Note) => {
      const updatedNotes = draft.notes.filter((n) => n.id !== note.id);
      onDraftChange({ ...draft, notes: updatedNotes });
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
      showBack={!lockNavigation}
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

          {/* Domain - Optional (multi-select) */}
          <MultiSelectCombobox
            options={domainOptions.map((o) => o.label)}
            selected={draft.domain}
            onSelect={handleDomainSelect}
            onRemove={handleDomainRemove}
            onAdd={handleDomainAdd}
            placeholder="Select domains..."
            label="Domain"
            helperText="Which area of the product?"
            tooltip="The functional area or module this request applies to (web, mobile, api, etc.)"
          />

          {/* Subdomain - Optional (multi-select) */}
          <MultiSelectCombobox
            options={subdomainOptions.map((o) => o.label)}
            selected={draft.subdomain}
            onSelect={handleSubdomainSelect}
            onRemove={handleSubdomainRemove}
            onAdd={handleSubdomainAdd}
            placeholder="Select subdomain..."
            label="Subdomain"
            helperText="Sub-category within the domain"
            tooltip="Specific subdomain or subcategory for this request"
          />

          {/* Context - Optional (free-form text) */}
          <FormField
            label="Context"
            id="item-context"
            helperText="Optional background or context"
            tooltip="Additional background information or context for this request"
          >
            <input
              id="item-context"
              type="text"
              className="input-base"
              value={draft.context || ''}
              onChange={handleContextChange}
              placeholder="Optional background/context for this item..."
              aria-label="Item context"
            />
          </FormField>

          {/* Feature - Optional (multi-select) */}
          <MultiSelectCombobox
            options={featureOptions.map((o) => o.label)}
            selected={draft.feature}
            onSelect={handleFeatureSelect}
            onRemove={handleFeatureRemove}
            onAdd={handleFeatureAdd}
            placeholder="Link to features..."
            label="Feature"
            helperText="Linked features (PRD, Epic, etc.)"
            tooltip="Link this item to one or more features, PRDs, or epics for tracking"
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

        {/* Structured Notes */}
        <div className="item-notes-section">
          <NotesList
            notes={draft.notes}
            onAddNote={handleOpenAddNote}
            onEditNote={handleOpenEditNote}
            onDeleteNote={handleDeleteNote}
          />
        </div>
      </form>

      {/* Note Modal */}
      <NoteModal
        isOpen={isNoteModalOpen}
        {...(editingNote ? { initialNote: editingNote } : {})}
        onSave={handleSaveNote}
        onCancel={handleCloseNoteModal}
      />
    </StepShell>
  );
}

export default ItemStep;
