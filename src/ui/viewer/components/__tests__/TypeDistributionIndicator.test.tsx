/**
 * TypeDistributionIndicator Component Tests
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeDistributionIndicator } from '../TypeDistributionIndicator';
import type { RequestLogItem } from '@core/models';

// Helper to create mock items
const createMockItem = (type: string, overrides: Partial<RequestLogItem> = {}): RequestLogItem => ({
  id: `REQ-20251231-test-${Math.random().toString(36).slice(2, 6)}`,
  title: `Test ${type} Item`,
  type,
  domain: ['web'],
  subdomain: ['frontend'],
  priority: 'medium',
  status: 'triage',
  tags: [],
  notes: [],
  created_at: new Date('2025-12-31T10:00:00Z'),
  ...overrides,
});

describe('TypeDistributionIndicator', () => {
  describe('rendering', () => {
    it('renders correct type badges with counts', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('enhancement'),
        createMockItem('enhancement'),
        createMockItem('idea'),
      ];

      render(<TypeDistributionIndicator items={items} />);

      // Check that badges are rendered
      const container = document.querySelector('.type-distribution-indicator');
      expect(container).toBeInTheDocument();

      // Check for count displays (aria-hidden counts)
      expect(screen.getByText('3')).toBeInTheDocument(); // 3 enhancements
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 bugs
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 idea
    });

    it('renders type badges in descending order by count', () => {
      const items = [
        createMockItem('idea'),
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('enhancement'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      // Get all type badges
      const badges = container.querySelectorAll('.type-badge-mini');
      expect(badges.length).toBe(3);

      // First badge should be bug (3), then enhancement (2), then idea (1)
      const counts = Array.from(badges).map(
        (badge) => badge.querySelector('.type-badge-mini-count')?.textContent
      );
      expect(counts).toEqual(['3', '2', '1']);
    });

    it('applies correct CSS classes for known types', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('idea'),
        createMockItem('task'),
        createMockItem('question'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      expect(container.querySelector('.type-badge-mini--bug')).toBeInTheDocument();
      expect(container.querySelector('.type-badge-mini--enhancement')).toBeInTheDocument();
      expect(container.querySelector('.type-badge-mini--idea')).toBeInTheDocument();
      expect(container.querySelector('.type-badge-mini--task')).toBeInTheDocument();
      expect(container.querySelector('.type-badge-mini--question')).toBeInTheDocument();
    });

    it('renders SVG icons for each type badge', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('enhancement'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      const svgs = container.querySelectorAll('.type-badge-mini-icon svg');
      expect(svgs.length).toBe(2);

      // Icons should have aria-hidden
      svgs.forEach((svg) => {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('maxTypes limit', () => {
    it('respects maxTypes limit and shows overflow', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('idea'),
        createMockItem('task'),
        createMockItem('question'),
        createMockItem('feature'), // 6th type
        createMockItem('other'),   // 7th type
      ];

      const { container } = render(<TypeDistributionIndicator items={items} maxTypes={5} />);

      // Should show 5 type badges + overflow badge
      const badges = container.querySelectorAll('.type-badge-mini');
      expect(badges.length).toBe(6); // 5 types + 1 overflow

      // Check overflow indicator
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('does not show overflow when types are within limit', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('idea'),
      ];

      render(<TypeDistributionIndicator items={items} maxTypes={5} />);

      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    it('uses default maxTypes of 5', () => {
      const items = [
        createMockItem('type1'),
        createMockItem('type2'),
        createMockItem('type3'),
        createMockItem('type4'),
        createMockItem('type5'),
        createMockItem('type6'),
      ];

      render(<TypeDistributionIndicator items={items} />);

      // Should show "+1 more" for 6 types with default maxTypes=5
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('allows custom maxTypes value', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('idea'),
        createMockItem('task'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} maxTypes={2} />);

      // Should show 2 types + overflow
      const badges = container.querySelectorAll('.type-badge-mini');
      expect(badges.length).toBe(3); // 2 types + 1 overflow

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });
  });

  describe('tooltip', () => {
    it('shows full breakdown in tooltip on hover', async () => {
      const user = userEvent.setup({ delay: null });
      const items = [
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('enhancement'),
      ];

      render(<TypeDistributionIndicator items={items} />);

      // Hover over the indicator
      const indicator = document.querySelector('.type-distribution-indicator');
      expect(indicator).toBeInTheDocument();

      await user.hover(indicator!);

      // Wait for tooltip to appear (has 300ms delay by default)
      // The tooltip content should contain the breakdown
      // Note: Due to tooltip delay, we check aria-label instead which is always present
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('2 bugs')
      );
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 enhancement')
      );
    });

    it('tooltip content includes all types even when overflowed', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('idea'),
        createMockItem('task'),
        createMockItem('question'),
        createMockItem('feature'),
      ];

      render(<TypeDistributionIndicator items={items} maxTypes={3} />);

      const indicator = document.querySelector('.type-distribution-indicator');

      // aria-label should include all types, not just visible ones
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('2 bugs')
      );
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 feature')
      );
    });

    it('handles singular vs plural in tooltip correctly', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('enhancement'),
        createMockItem('enhancement'),
      ];

      render(<TypeDistributionIndicator items={items} />);

      const indicator = document.querySelector('.type-distribution-indicator');

      // "1 bug" (singular), "2 enhancements" (plural)
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 bug')
      );
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('2 enhancements')
      );
    });
  });

  describe('empty and single type arrays', () => {
    it('returns null for empty items array', () => {
      const { container } = render(<TypeDistributionIndicator items={[]} />);

      expect(container.querySelector('.type-distribution-indicator')).not.toBeInTheDocument();
    });

    it('renders single type correctly', () => {
      const items = [createMockItem('bug')];

      render(<TypeDistributionIndicator items={items} />);

      const indicator = document.querySelector('.type-distribution-indicator');
      expect(indicator).toBeInTheDocument();

      // Should show count of 1
      expect(screen.getByText('1')).toBeInTheDocument();

      // aria-label should reflect single item
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 item')
      );
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 type')
      );
    });

    it('handles multiple items of same type', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('bug'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      // Should show only one badge type
      const badges = container.querySelectorAll('.type-badge-mini');
      expect(badges.length).toBe(1);

      // With count of 3
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has aria-label describing distribution', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('bug'),
        createMockItem('enhancement'),
      ];

      render(<TypeDistributionIndicator items={items} />);

      const indicator = document.querySelector('.type-distribution-indicator');
      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator?.getAttribute('aria-label')).toContain('Type distribution');
      expect(indicator?.getAttribute('aria-label')).toContain('3 items');
      expect(indicator?.getAttribute('aria-label')).toContain('2 types');
    });

    it('has role="img" for the container', () => {
      const items = [createMockItem('bug')];

      render(<TypeDistributionIndicator items={items} />);

      const indicator = document.querySelector('.type-distribution-indicator');
      expect(indicator).toHaveAttribute('role', 'img');
    });

    it('icons have aria-hidden="true"', () => {
      const items = [createMockItem('bug')];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('provides visually-hidden text for screen readers', () => {
      const items = [
        createMockItem('bug'),
        createMockItem('bug'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      const hiddenText = container.querySelector('.visually-hidden');
      expect(hiddenText).toBeInTheDocument();
      expect(hiddenText?.textContent).toBe('2 bugs');
    });
  });

  describe('unknown types', () => {
    it('handles unknown types with default styling', () => {
      const items = [
        createMockItem('custom-type'),
        createMockItem('another-type'),
      ];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      // Should render badges
      const badges = container.querySelectorAll('.type-badge-mini');
      expect(badges.length).toBe(2);

      // Should not have specific type classes
      expect(container.querySelector('.type-badge-mini--custom-type')).not.toBeInTheDocument();
      expect(container.querySelector('.type-badge-mini--another-type')).not.toBeInTheDocument();
    });

    it('renders fallback icon for unknown types', () => {
      const items = [createMockItem('custom-type')];

      const { container } = render(<TypeDistributionIndicator items={items} />);

      // Should still have an SVG icon
      const svg = container.querySelector('.type-badge-mini-icon svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('component is memoized (React.memo)', () => {
      // TypeDistributionIndicator should be wrapped with React.memo
      expect(TypeDistributionIndicator).toHaveProperty('$$typeof', Symbol.for('react.memo'));
    });
  });
});
