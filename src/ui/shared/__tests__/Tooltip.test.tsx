/**
 * Tooltip Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('shows tooltip on hover after delay', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <Tooltip content="Help text" delay={100}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');

    // Tooltip should not be visible initially
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();

    // Hover over the button
    await user.hover(button);

    // Wait for tooltip to appear after delay
    await waitFor(() => {
      expect(screen.getByText('Help text')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('hides tooltip on mouse leave', async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <Tooltip content="Help text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByText('Hover me');

    // Hover to show tooltip
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText('Help text')).toBeInTheDocument();
    });

    // Unhover to hide tooltip
    await user.unhover(button);

    await waitFor(() => {
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    });
  });

  it('shows tooltip on focus', async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Help text">
        <button>Focus me</button>
      </Tooltip>
    );

    // Focus the button
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Help text')).toBeInTheDocument();
    });
  });

  it('hides tooltip on blur', async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Help text" delay={0}>
        <button>Focus me</button>
      </Tooltip>
    );

    // Focus the button
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Help text')).toBeInTheDocument();
    });

    // Blur by tabbing away
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    });
  });

  it('renders with different positions', () => {
    const positions = ['top', 'bottom', 'left', 'right'] as const;

    positions.forEach((position) => {
      const { unmount } = render(
        <Tooltip content="Help text" position={position} delay={0}>
          <button>Test</button>
        </Tooltip>
      );

      // Just verify it renders without errors
      expect(screen.getByText('Test')).toBeInTheDocument();
      unmount();
    });
  });
});
