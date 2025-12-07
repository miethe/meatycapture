/**
 * StepShell Component
 *
 * Container wrapper for wizard steps with consistent layout.
 * Provides header, content area, and action buttons with animations.
 */

import React from 'react';
import './shared.css';

interface StepShellProps {
  /** Step title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Step content */
  children: React.ReactNode;
  /** Current step number (1-indexed) */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Called when Next button is clicked */
  onNext?: () => void;
  /** Called when Back button is clicked */
  onBack?: () => void;
  /** Label for Next button */
  nextLabel?: string;
  /** Label for Back button */
  backLabel?: string;
  /** Whether Next button is disabled */
  nextDisabled?: boolean;
  /** Whether to show Back button */
  showBack?: boolean;
}

export function StepShell({
  title,
  subtitle,
  children,
  stepNumber,
  totalSteps,
  onNext,
  onBack,
  nextLabel = 'Next',
  backLabel = 'Back',
  nextDisabled = false,
  showBack = true,
}: StepShellProps): React.JSX.Element {
  return (
    <div className="step-shell" role="region" aria-label={`Step ${stepNumber} of ${totalSteps}`}>
      {/* Header */}
      <div className="step-header">
        <div className="step-progress" aria-live="polite">
          Step {stepNumber} of {totalSteps}
        </div>
        <h1 className="step-title">{title}</h1>
        {subtitle && <p className="step-subtitle">{subtitle}</p>}
      </div>

      {/* Content */}
      <div className="step-content glass">{children}</div>

      {/* Actions */}
      <div className="step-actions">
        <div>
          {showBack && stepNumber > 1 && (
            <button
              type="button"
              className="button secondary"
              onClick={onBack}
              aria-label={backLabel}
            >
              {backLabel}
            </button>
          )}
        </div>
        <div>
          {onNext && (
            <button
              type="button"
              className="button primary"
              onClick={onNext}
              disabled={nextDisabled}
              aria-label={nextLabel}
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StepShell;
