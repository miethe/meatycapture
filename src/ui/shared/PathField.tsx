/**
 * PathField Component
 *
 * Text input for file paths with validation support.
 * Uses monospace font and provides optional validation on blur.
 */

import React, { useState, useCallback } from 'react';
import './shared.css';

interface PathFieldProps {
  /** Current path value */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Field label */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Optional validation function - returns true if valid */
  onValidate?: (path: string) => Promise<boolean>;
  /** Error message to display */
  error?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
}

export function PathField({
  value,
  onChange,
  label,
  placeholder = '/path/to/directory',
  onValidate,
  error: externalError,
  required = false,
  disabled = false,
}: PathFieldProps): React.JSX.Element {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();

  const handleBlur = useCallback(async () => {
    if (!onValidate || !value) {
      setValidationError(undefined);
      return;
    }

    setIsValidating(true);
    setValidationError(undefined);

    try {
      const isValid = await onValidate(value);
      if (!isValid) {
        setValidationError('Path is not valid or not writable');
      }
    } catch (error) {
      setValidationError('Failed to validate path');
      console.error('Path validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [value, onValidate]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
      // Clear validation error when user starts typing
      if (validationError) {
        setValidationError(undefined);
      }
    },
    [onChange, validationError]
  );

  // Use external error if provided, otherwise use validation error
  const displayError = externalError || validationError;

  return (
    <div className="field-container">
      <label className={`field-label ${required ? 'required' : ''}`} htmlFor={`path-${label}`}>
        {label}
      </label>

      <div className="path-field-wrapper">
        <div className="path-field-input" style={{ flex: 1 }}>
          <input
            id={`path-${label}`}
            type="text"
            className={`input-base ${displayError ? 'error' : ''}`}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled || isValidating}
            required={required}
            aria-label={label}
            aria-invalid={!!displayError}
            aria-describedby={displayError ? `path-${label}-error` : undefined}
            style={{
              fontFamily: "'SF Mono', 'Monaco', 'Consolas', monospace",
              fontSize: '0.875rem',
            }}
          />
          {isValidating && (
            <div
              style={{
                marginTop: 'var(--spacing-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
              }}
            >
              <span className="spinner" />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                Validating path...
              </span>
            </div>
          )}
        </div>

        {/* Browse button placeholder - for future file picker integration */}
        <button
          type="button"
          className="button secondary browse-button"
          disabled={disabled || isValidating}
          aria-label="Browse for directory"
          title="Browse functionality coming soon"
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          Browse
        </button>
      </div>

      {displayError && (
        <div className="error-message" id={`path-${label}-error`} role="alert">
          {displayError}
        </div>
      )}
    </div>
  );
}

export default PathField;
