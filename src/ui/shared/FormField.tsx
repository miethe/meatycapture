/**
 * FormField Component
 *
 * Wrapper component for form inputs with integrated label, validation,
 * error display, and contextual tooltip help.
 */

import React from 'react';
import { Tooltip } from './Tooltip';
import './FormField.css';

export type ValidationState = 'idle' | 'validating' | 'valid' | 'error';

interface FormFieldProps {
  /** Field label */
  label: string;
  /** Field ID (for label htmlFor and input id) */
  id: string;
  /** Whether field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Validation state for visual feedback */
  validationState?: ValidationState;
  /** Helper text explaining the field's purpose */
  helperText?: string;
  /** Tooltip content for contextual help */
  tooltip?: string;
  /** Input element to render */
  children: React.ReactNode;
  /** Additional CSS class names */
  className?: string;
}

export function FormField({
  label,
  id,
  required = false,
  error,
  validationState = 'idle',
  helperText,
  tooltip,
  children,
  className = '',
}: FormFieldProps): React.JSX.Element {
  // Determine if we should show validation icon
  const showValidationIcon = validationState === 'valid' || validationState === 'error';

  return (
    <div className={`form-field ${className}`}>
      {/* Label with optional tooltip */}
      <div className="form-field-label-row">
        <label
          className={`field-label ${required ? 'required' : ''}`}
          htmlFor={id}
        >
          {label}
        </label>
        {tooltip && (
          <Tooltip content={tooltip} position="right">
            <button
              type="button"
              className="tooltip-trigger"
              aria-label={`Help for ${label}`}
              tabIndex={0}
            >
              ?
            </button>
          </Tooltip>
        )}
      </div>

      {/* Helper text */}
      {helperText && !error && (
        <div className="form-field-helper" id={`${id}-helper`}>
          {helperText}
        </div>
      )}

      {/* Input wrapper with validation state */}
      <div
        className={`form-field-input-wrapper ${validationState !== 'idle' ? `validation-${validationState}` : ''}`}
      >
        {children}

        {/* Validation icon */}
        {showValidationIcon && (
          <div className="validation-icon" aria-hidden="true">
            {validationState === 'valid' && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8" r="7" fill="var(--color-success)" fillOpacity="0.2" />
                <path
                  d="M5 8L7 10L11 6"
                  stroke="var(--color-success)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {validationState === 'error' && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="8" cy="8" r="7" fill="var(--color-error)" fillOpacity="0.2" />
                <path
                  d="M6 6L10 10M10 6L6 10"
                  stroke="var(--color-error)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        )}

        {/* Validating spinner */}
        {validationState === 'validating' && (
          <div className="validation-spinner">
            <span className="spinner" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message" id={`${id}-error`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default FormField;
