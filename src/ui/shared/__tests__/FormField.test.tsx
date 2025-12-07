/**
 * FormField Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '../FormField';

describe('FormField', () => {
  it('renders label and input', () => {
    render(
      <FormField label="Test Field" id="test-field">
        <input id="test-field" type="text" />
      </FormField>
    );

    expect(screen.getByText('Test Field')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(
      <FormField label="Test Field" id="test-field" required>
        <input id="test-field" type="text" />
      </FormField>
    );

    const label = screen.getByText('Test Field');
    expect(label).toHaveClass('required');
  });

  it('displays helper text when provided', () => {
    render(
      <FormField label="Test Field" id="test-field" helperText="This is helpful">
        <input id="test-field" type="text" />
      </FormField>
    );

    expect(screen.getByText('This is helpful')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(
      <FormField label="Test Field" id="test-field" error="This is an error">
        <input id="test-field" type="text" />
      </FormField>
    );

    expect(screen.getByText('This is an error')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This is an error');
  });

  it('hides helper text when error is shown', () => {
    render(
      <FormField
        label="Test Field"
        id="test-field"
        helperText="This is helpful"
        error="This is an error"
      >
        <input id="test-field" type="text" />
      </FormField>
    );

    expect(screen.queryByText('This is helpful')).not.toBeInTheDocument();
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('renders tooltip trigger when tooltip is provided', () => {
    render(
      <FormField label="Test Field" id="test-field" tooltip="Helpful tooltip">
        <input id="test-field" type="text" />
      </FormField>
    );

    const tooltipTrigger = screen.getByLabelText('Help for Test Field');
    expect(tooltipTrigger).toBeInTheDocument();
    expect(tooltipTrigger).toHaveTextContent('?');
  });

  it('does not render tooltip trigger when tooltip is not provided', () => {
    render(
      <FormField label="Test Field" id="test-field">
        <input id="test-field" type="text" />
      </FormField>
    );

    expect(screen.queryByLabelText('Help for Test Field')).not.toBeInTheDocument();
  });

  it('applies validation state classes', () => {
    const { rerender } = render(
      <FormField label="Test Field" id="test-field" validationState="valid">
        <input id="test-field" type="text" />
      </FormField>
    );

    let wrapper = screen.getByRole('textbox').parentElement;
    expect(wrapper).toHaveClass('validation-valid');

    rerender(
      <FormField label="Test Field" id="test-field" validationState="error">
        <input id="test-field" type="text" />
      </FormField>
    );

    wrapper = screen.getByRole('textbox').parentElement;
    expect(wrapper).toHaveClass('validation-error');

    rerender(
      <FormField label="Test Field" id="test-field" validationState="validating">
        <input id="test-field" type="text" />
      </FormField>
    );

    wrapper = screen.getByRole('textbox').parentElement;
    expect(wrapper).toHaveClass('validation-validating');
  });

  it('shows validation spinner when validating', () => {
    render(
      <FormField label="Test Field" id="test-field" validationState="validating">
        <input id="test-field" type="text" />
      </FormField>
    );

    const spinner = document.querySelector('.validation-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('shows validation icon when valid or error', () => {
    const { rerender } = render(
      <FormField label="Test Field" id="test-field" validationState="valid">
        <input id="test-field" type="text" />
      </FormField>
    );

    let icon = document.querySelector('.validation-icon');
    expect(icon).toBeInTheDocument();

    rerender(
      <FormField label="Test Field" id="test-field" validationState="error">
        <input id="test-field" type="text" />
      </FormField>
    );

    icon = document.querySelector('.validation-icon');
    expect(icon).toBeInTheDocument();
  });

  it('does not show validation icon when idle', () => {
    render(
      <FormField label="Test Field" id="test-field" validationState="idle">
        <input id="test-field" type="text" />
      </FormField>
    );

    const icon = document.querySelector('.validation-icon');
    expect(icon).not.toBeInTheDocument();
  });
});
