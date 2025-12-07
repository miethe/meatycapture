/**
 * StepProgress Component
 *
 * Visual progress indicator for multi-step wizard flows.
 * Shows step dots/circles with labels, connecting lines, and completion status.
 */

import React from 'react';
import './stepProgress.css';

interface StepProgressProps {
  /** Step labels (e.g., ["Project", "Document", "Item", "Review"]) */
  steps: string[];
  /** Current step index (0-based) */
  currentStep: number;
  /** Array of completed step indices (0-based) */
  completedSteps?: number[];
}

export function StepProgress({
  steps,
  currentStep,
  completedSteps = [],
}: StepProgressProps): React.JSX.Element {
  return (
    <div className="step-progress-container" role="navigation" aria-label="Wizard progress">
      <div className="step-progress-track">
        {steps.map((label, index) => {
          const isActive = index === currentStep;
          const isCompleted = completedSteps.includes(index);
          const isPast = index < currentStep;
          const isFuture = index > currentStep;

          return (
            <React.Fragment key={label}>
              {/* Connecting Line (before each step except the first) */}
              {index > 0 && (
                <div
                  className={`step-progress-line ${
                    isPast || isCompleted ? 'completed' : ''
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step Circle */}
              <div className="step-progress-item">
                <div
                  className={`step-progress-dot ${
                    isActive ? 'active' : ''
                  } ${isCompleted ? 'completed' : ''} ${
                    isFuture ? 'future' : ''
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${index + 1}: ${label}${
                    isCompleted ? ' (completed)' : ''
                  }${isActive ? ' (current)' : ''}`}
                >
                  {isCompleted && !isActive ? (
                    // Checkmark for completed steps
                    <svg
                      className="step-progress-checkmark"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M13.5 4L6 11.5L2.5 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    // Step number for current and future steps
                    <span className="step-progress-number" aria-hidden="true">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <div
                  className={`step-progress-label ${
                    isActive ? 'active' : ''
                  } ${isFuture ? 'future' : ''}`}
                >
                  {label}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default StepProgress;
