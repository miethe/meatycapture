/**
 * StatusIndicator Component Tests
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusIndicator } from '../StatusIndicator';

describe('StatusIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders a status indicator element', () => {
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toBeInTheDocument();
    });

    it('renders with role="img" for accessibility', () => {
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByRole('img', { name: /done/i });
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('status color classes', () => {
    it('applies status-indicator--triage class for triage status', () => {
      render(<StatusIndicator status="triage" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-indicator--triage');
    });

    it('applies status-indicator--backlog class for backlog status', () => {
      render(<StatusIndicator status="backlog" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-indicator--backlog');
    });

    it('applies status-indicator--planned class for planned status', () => {
      render(<StatusIndicator status="planned" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-indicator--planned');
    });

    it('applies status-indicator--in-progress class for in-progress status', () => {
      render(<StatusIndicator status="in-progress" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-indicator--in-progress');
    });

    it('applies status-indicator--done class for done status', () => {
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-indicator--done');
    });

    it('applies status-indicator--wontfix class for wontfix status', () => {
      render(<StatusIndicator status="wontfix" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-indicator--wontfix');
    });

    it('handles case-insensitive status values', () => {
      render(<StatusIndicator status="DONE" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator--done');
    });

    it('applies only base class for unknown status', () => {
      render(<StatusIndicator status="unknown-status" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).not.toHaveClass('status-indicator--unknown-status');
    });
  });

  describe('size variants', () => {
    it('renders small size by default (no --lg class)', () => {
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).not.toHaveClass('status-indicator--lg');
    });

    it('renders small size when size="sm"', () => {
      render(<StatusIndicator status="done" size="sm" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).not.toHaveClass('status-indicator--lg');
    });

    it('applies --lg class when size="md"', () => {
      render(<StatusIndicator status="done" size="md" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveClass('status-indicator--lg');
    });
  });

  describe('tooltip', () => {
    it('shows tooltip by default', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');
      await user.hover(indicator);

      // Advance timer past tooltip delay (300ms default)
      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByRole('tooltip')).toHaveTextContent('Done');
      });
    });

    it('shows "In Progress" tooltip for in-progress status', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StatusIndicator status="in-progress" />);

      const indicator = screen.getByTestId('status-indicator');
      await user.hover(indicator);

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('In Progress');
      });
    });

    it('shows "Won\'t Fix" tooltip for wontfix status', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StatusIndicator status="wontfix" />);

      const indicator = screen.getByTestId('status-indicator');
      await user.hover(indicator);

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent("Won't Fix");
      });
    });

    it('shows capitalized tooltip for other statuses', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StatusIndicator status="triage" />);

      const indicator = screen.getByTestId('status-indicator');
      await user.hover(indicator);

      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent('Triage');
      });
    });

    it('does not show tooltip when showTooltip=false', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StatusIndicator status="done" showTooltip={false} />);

      const indicator = screen.getByTestId('status-indicator');
      await user.hover(indicator);

      vi.advanceTimersByTime(350);

      // Tooltip should not appear
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');

      // Hover to show tooltip
      await user.hover(indicator);
      vi.advanceTimersByTime(350);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      // Unhover to hide tooltip
      await user.unhover(indicator);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('has aria-label with status name', () => {
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'Status: Done');
    });

    it('has aria-label "In Progress" for in-progress status', () => {
      render(<StatusIndicator status="in-progress" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'Status: In Progress');
    });

    it('has aria-label "Won\'t Fix" for wontfix status', () => {
      render(<StatusIndicator status="wontfix" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveAttribute('aria-label', "Status: Won't Fix");
    });

    it('has aria-label with capitalized status for standard statuses', () => {
      render(<StatusIndicator status="backlog" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'Status: Backlog');
    });

    it('has aria-label for unknown status values', () => {
      render(<StatusIndicator status="custom-status" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'Status: Custom Status');
    });

    it('renders as a span element', () => {
      render(<StatusIndicator status="done" />);

      const indicator = screen.getByTestId('status-indicator');
      expect(indicator.tagName.toLowerCase()).toBe('span');
    });
  });

  describe('memoization', () => {
    it('renders the same output for same props', () => {
      const { rerender } = render(<StatusIndicator status="done" size="sm" showTooltip={true} />);

      const indicator1 = screen.getByTestId('status-indicator');
      const className1 = indicator1.className;

      rerender(<StatusIndicator status="done" size="sm" showTooltip={true} />);

      const indicator2 = screen.getByTestId('status-indicator');
      expect(indicator2.className).toBe(className1);
    });

    it('updates when props change', () => {
      const { rerender } = render(<StatusIndicator status="done" size="sm" />);

      const indicator1 = screen.getByTestId('status-indicator');
      expect(indicator1).toHaveClass('status-indicator--done');
      expect(indicator1).not.toHaveClass('status-indicator--lg');

      rerender(<StatusIndicator status="planned" size="md" />);

      const indicator2 = screen.getByTestId('status-indicator');
      expect(indicator2).toHaveClass('status-indicator--planned');
      expect(indicator2).toHaveClass('status-indicator--lg');
    });
  });
});
