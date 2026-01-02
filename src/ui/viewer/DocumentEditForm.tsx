/**
 * DocumentEditForm Component
 *
 * Form component for editing document-level fields (title and description).
 * Uses glass morphism styling consistent with ItemEditForm.
 *
 * Features:
 * - Controlled form state
 * - Title validation (required field)
 * - Description textarea for document notes
 * - Glass morphism styling
 * - Full accessibility support
 * - Works inside modal context
 */

import React, { useState, useCallback, useId } from 'react';
import type { RequestLogDoc } from '@core/models';
import '../shared/shared.css';
import './DocumentEditForm.css';

/**
 * Props for the DocumentEditForm component
 */
export interface DocumentEditFormProps {
  /** Document being edited */
  doc: RequestLogDoc;
  /** Called when form is saved */
  onSave: (updatedDoc: RequestLogDoc) => void;
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
}

/**
 * DocumentEditForm Component
 *
 * Renders a form for editing document-level fields.
 * Currently supports title (required) and description (optional).
 *
 * Note: The description field is stored as a custom property.
 * When the core model is updated to include a description field,
 * this component can be updated to use it directly.
 */
export function DocumentEditForm({
  doc,
  onSave,
  onCancel,
  isSaving = false,
}: DocumentEditFormProps): React.JSX.Element {
  // Generate unique IDs for accessibility
  const formId = useId();

  // Form state - initialize from doc prop
  // Note: description is stored as an extended property until model is updated
  const [title, setTitle] = useState(doc.title);
  const [description, setDescription] = useState(
    (doc as RequestLogDoc & { description?: string }).description || ''
  );

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({});

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      // Destructure to exclude any existing description from the spread
      const {
        description: _existingDescription,
        ...docWithoutDescription
      } = doc as RequestLogDoc & { description?: string };

      // Create updated document with new timestamp
      const updatedDoc: RequestLogDoc & { description?: string } = {
        ...docWithoutDescription,
        title: title.trim(),
        updated_at: new Date(),
      };

      // Only include description if it has content
      if (description.trim()) {
        updatedDoc.description = description.trim();
      }

      onSave(updatedDoc);
    },
    [doc, title, description, validateForm, onSave]
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
   * Handle description change
   */
  const handleDescriptionChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
  }, []);

  return (
    <form
      id={`${formId}-doc-edit-form`}
      className="document-edit-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Edit document form"
    >
      {/* Title Field */}
      <div className="field-container">
        <div className="form-field-label-row">
          <label className="field-label required" htmlFor={`${formId}-title`}>
            Title
          </label>
        </div>
        <div className="form-field-helper" id={`${formId}-title-helper`}>
          The document title displayed in the catalog
        </div>
        <input
          id={`${formId}-title`}
          type="text"
          className={`input-base ${errors.title ? 'error' : ''}`}
          value={title}
          onChange={handleTitleChange}
          placeholder="Enter document title..."
          disabled={isSaving}
          required
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={
            errors.title
              ? `${formId}-title-error ${formId}-title-helper`
              : `${formId}-title-helper`
          }
        />
        {errors.title && (
          <div className="error-message" id={`${formId}-title-error`} role="alert">
            {errors.title}
          </div>
        )}
      </div>

      {/* Description Field */}
      <div className="field-container">
        <div className="form-field-label-row">
          <label className="field-label" htmlFor={`${formId}-description`}>
            Description
          </label>
        </div>
        <div className="form-field-helper" id={`${formId}-description-helper`}>
          Optional notes or description for this document
        </div>
        <textarea
          id={`${formId}-description`}
          className="input-base document-edit-description"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Enter document description or notes..."
          disabled={isSaving}
          rows={4}
          aria-describedby={`${formId}-description-helper`}
        />
      </div>

      {/* Form Actions */}
      <div className="document-edit-form-actions">
        <button
          type="button"
          className="button secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
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

export default DocumentEditForm;
