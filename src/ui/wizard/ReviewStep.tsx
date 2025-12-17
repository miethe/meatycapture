/**
 * ReviewStep Component
 *
 * Final review and submit step of the capture wizard.
 * Displays a summary of all captured data and handles submission.
 * Fourth step in the wizard flow (Project -> Doc -> Item -> Review).
 */

import React from 'react';
import { StepShell } from '../shared/StepShell';
import type { Project, ItemDraft } from '../../core/models';
import './wizard.css';

interface ReviewStepProps {
  /** Selected project */
  project: Project;
  /** Document path (full path to file) */
  docPath: string;
  /** Whether creating a new document */
  isNewDoc: boolean;
  /** Item draft to review */
  draft: ItemDraft;
  /** Called when user clicks Back button */
  onBack: () => void;
  /** Called when user submits the form */
  onSubmit: () => Promise<void>;
  /** Called when user clicks Add Another after successful submit */
  onAddAnother: () => void;
  /** Called when user clicks Done to complete the wizard */
  onComplete: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Whether submission was successful */
  submitSuccess?: boolean;
}

export function ReviewStep({
  project,
  docPath,
  isNewDoc,
  draft,
  onBack,
  onSubmit,
  onAddAnother,
  onComplete,
  isSubmitting = false,
  submitSuccess = false,
}: ReviewStepProps): React.JSX.Element {
  // Handle submit button click
  const handleSubmit = async () => {
    await onSubmit();
  };

  // Success state - show completion message and options
  if (submitSuccess) {
    return (
      <StepShell
        stepNumber={4}
        totalSteps={4}
        title="Success!"
        subtitle="Your request has been saved"
        showBack={false}
      >
        <div className="review-success" role="status" aria-live="polite">
          <div className="success-icon" role="img" aria-label="Success checkmark">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="var(--color-success)"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M20 32L28 40L44 24"
                stroke="var(--color-success)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="success-message">Your request has been successfully saved to:</p>
          <div className="success-path" aria-label={`Saved to ${docPath}`}>
            <code>{docPath}</code>
          </div>
          <div className="success-actions">
            <button
              type="button"
              className="button primary"
              onClick={onAddAnother}
              aria-label="Add another item to this document"
            >
              Add Another Item
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={onComplete}
              aria-label="Start a new capture session"
            >
              Done
            </button>
          </div>
        </div>
      </StepShell>
    );
  }

  // Review state - show summary and submit button
  return (
    <StepShell
      stepNumber={4}
      totalSteps={4}
      title="Review & Submit"
      subtitle="Confirm your request before saving"
      onBack={onBack}
      showBack={!isSubmitting}
    >
      <div className="review-container">
        {/* Project & Document Info */}
        <section className="review-section">
          <h3 className="review-section-title">Project & Document</h3>
          <div className="review-card">
            <div className="review-field">
              <span className="review-label">Project:</span>
              <span className="review-value">{project.name}</span>
            </div>
            <div className="review-field">
              <span className="review-label">Path:</span>
              <span className="review-value review-code">{project.default_path}</span>
            </div>
            <div className="review-field">
              <span className="review-label">Document:</span>
              <div className="review-value-with-badge">
                <span className="review-code">{docPath}</span>
                <span className={`review-badge ${isNewDoc ? 'new' : 'existing'}`}>
                  {isNewDoc ? 'New' : 'Existing'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Item Details */}
        <section className="review-section">
          <h3 className="review-section-title">Request Details</h3>
          <div className="review-card">
            <div className="review-field full-width">
              <h4 className="review-item-title">{draft.title}</h4>
            </div>

            <div className="review-metadata">
              <div className="review-metadata-item">
                <span className="review-label">Type:</span>
                <span className="review-value review-badge-inline type">{draft.type}</span>
              </div>
              {draft.domain && (
                <div className="review-metadata-item">
                  <span className="review-label">Domain:</span>
                  <span className="review-value review-badge-inline domain">{draft.domain}</span>
                </div>
              )}
              {draft.context && (
                <div className="review-metadata-item">
                  <span className="review-label">Context:</span>
                  <span className="review-value review-badge-inline context">{draft.context}</span>
                </div>
              )}
              <div className="review-metadata-item">
                <span className="review-label">Priority:</span>
                <span className="review-value review-badge-inline priority">{draft.priority}</span>
              </div>
              <div className="review-metadata-item">
                <span className="review-label">Status:</span>
                <span className="review-value review-badge-inline status">{draft.status}</span>
              </div>
            </div>

            {/* Tags */}
            {draft.tags.length > 0 && (
              <div className="review-field full-width">
                <span className="review-label">Tags:</span>
                <div className="review-tags">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {draft.notes && (
              <div className="review-field full-width">
                <span className="review-label">Notes:</span>
                <div className="review-notes">{draft.notes}</div>
              </div>
            )}
          </div>
        </section>

        {/* Submit Button */}
        <div className="review-submit">
          <button
            type="button"
            className="button primary submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-label="Submit request"
          >
            {isSubmitting && <span className="spinner" />}
            {isSubmitting ? 'Saving...' : 'Submit Request'}
          </button>
        </div>
      </div>
    </StepShell>
  );
}

export default ReviewStep;
