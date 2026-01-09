/**
 * ItemCountIndicator Component Tests
 *
 * Tests for the item count indicator with status breakdown tooltip.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemCountIndicator } from '../ItemCountIndicator';
import { createTestItem } from '@core/test-helpers';
import type { RequestLogItem } from '@core/models';

describe('ItemCountIndicator', () => {
  describe('rendering', () => {
    it('renders correct total count for single item', () => {
      const items: RequestLogItem[] = [createTestItem({ status: 'triage' })];

      render(<ItemCountIndicator items={items} />);

      expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    it('renders correct total count for multiple items', () => {
      const items: RequestLogItem[] = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'in-progress' }),
        createTestItem({ status: 'backlog' }),
        createTestItem({ status: 'triage' }),
      ];

      render(<ItemCountIndicator items={items} />);

      expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    it('handles empty items array', () => {
      render(<ItemCountIndicator items={[]} />);

      expect(screen.getByText('0 items')).toBeInTheDocument();
    });

    it('applies default sm size class', () => {
      const items: RequestLogItem[] = [createTestItem({ status: 'triage' })];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('1 item');
      expect(indicator).toHaveClass('item-count-indicator');
      expect(indicator).not.toHaveClass('item-count-indicator--md');
    });

    it('applies md size class when specified', () => {
      const items: RequestLogItem[] = [createTestItem({ status: 'triage' })];

      render(<ItemCountIndicator items={items} size="md" />);

      const indicator = screen.getByText('1 item');
      expect(indicator).toHaveClass('item-count-indicator');
      expect(indicator).toHaveClass('item-count-indicator--md');
    });
  });

  describe('tooltip', () => {
    it('shows status breakdown on hover', async () => {
      const user = userEvent.setup({ delay: null });

      const items: RequestLogItem[] = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'in-progress' }),
        createTestItem({ status: 'backlog' }),
        createTestItem({ status: 'backlog' }),
      ];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('5 items');
      await user.hover(indicator);

      await waitFor(
        () => {
          // Tooltip should show status breakdown in order: done, in-progress, backlog
          expect(screen.getByRole('tooltip')).toHaveTextContent(
            '2 done, 1 in-progress, 2 backlog'
          );
        },
        { timeout: 500 }
      );
    });

    it('shows tooltip with single status', async () => {
      const user = userEvent.setup({ delay: null });

      const items: RequestLogItem[] = [
        createTestItem({ status: 'triage' }),
        createTestItem({ status: 'triage' }),
        createTestItem({ status: 'triage' }),
      ];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('3 items');
      await user.hover(indicator);

      await waitFor(
        () => {
          expect(screen.getByRole('tooltip')).toHaveTextContent('3 triage');
        },
        { timeout: 500 }
      );
    });

    it('shows "No items" in tooltip for empty array', async () => {
      const user = userEvent.setup({ delay: null });

      render(<ItemCountIndicator items={[]} />);

      const indicator = screen.getByText('0 items');
      await user.hover(indicator);

      await waitFor(
        () => {
          expect(screen.getByRole('tooltip')).toHaveTextContent('No items');
        },
        { timeout: 500 }
      );
    });

    it('shows all statuses in correct order', async () => {
      const user = userEvent.setup({ delay: null });

      // Create one item of each status
      const items: RequestLogItem[] = [
        createTestItem({ status: 'triage' }),
        createTestItem({ status: 'backlog' }),
        createTestItem({ status: 'planned' }),
        createTestItem({ status: 'in-progress' }),
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'wontfix' }),
      ];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('6 items');
      await user.hover(indicator);

      await waitFor(
        () => {
          // Should show in order: done, in-progress, planned, backlog, triage, wontfix
          expect(screen.getByRole('tooltip')).toHaveTextContent(
            '1 done, 1 in-progress, 1 planned, 1 backlog, 1 triage, 1 wontfix'
          );
        },
        { timeout: 500 }
      );
    });
  });

  describe('accessibility', () => {
    it('has aria-label describing the count and breakdown', () => {
      const items: RequestLogItem[] = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'in-progress' }),
      ];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('2 items');
      expect(indicator).toHaveAttribute(
        'aria-label',
        '2 items: 1 done, 1 in-progress'
      );
    });

    it('has correct aria-label for single item', () => {
      const items: RequestLogItem[] = [createTestItem({ status: 'backlog' })];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('1 item');
      expect(indicator).toHaveAttribute('aria-label', '1 item: 1 backlog');
    });

    it('has correct aria-label for empty items', () => {
      render(<ItemCountIndicator items={[]} />);

      const indicator = screen.getByText('0 items');
      expect(indicator).toHaveAttribute('aria-label', '0 items: No items');
    });
  });

  describe('memoization', () => {
    it('memoizes aggregation calculation', () => {
      const items: RequestLogItem[] = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'triage' }),
      ];

      const { rerender } = render(<ItemCountIndicator items={items} />);

      // Re-render with same items reference should not recalculate
      rerender(<ItemCountIndicator items={items} />);

      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('recalculates when items change', () => {
      const initialItems: RequestLogItem[] = [createTestItem({ status: 'done' })];

      const { rerender } = render(<ItemCountIndicator items={initialItems} />);
      expect(screen.getByText('1 item')).toBeInTheDocument();

      // Re-render with new items array
      const newItems: RequestLogItem[] = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'in-progress' }),
        createTestItem({ status: 'backlog' }),
      ];

      rerender(<ItemCountIndicator items={newItems} />);
      expect(screen.getByText('3 items')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles items with unknown status values', async () => {
      const user = userEvent.setup({ delay: null });

      const items: RequestLogItem[] = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'custom-status' as string }),
      ];

      render(<ItemCountIndicator items={items} />);

      const indicator = screen.getByText('2 items');
      await user.hover(indicator);

      await waitFor(
        () => {
          // Custom status should appear after known statuses
          expect(screen.getByRole('tooltip')).toHaveTextContent('1 done, 1 custom-status');
        },
        { timeout: 500 }
      );
    });

    it('handles large item counts', () => {
      // Create 100 items
      const items: RequestLogItem[] = Array.from({ length: 100 }, (_, i) =>
        createTestItem({ id: `item-${i}`, status: i % 2 === 0 ? 'done' : 'triage' })
      );

      render(<ItemCountIndicator items={items} />);

      expect(screen.getByText('100 items')).toBeInTheDocument();
    });
  });
});
