/**
 * ProjectProgressIndicator Component Tests
 *
 * Tests for the project progress indicator component including:
 * - Progress calculation
 * - Progress bar width
 * - Tooltip content
 * - Empty state handling
 * - Accessibility attributes
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectProgressIndicator } from '../ProjectProgressIndicator';
import type { RequestLogDoc, RequestLogItem } from '@core/models';

// Helper to create a mock item with a specific status
const createMockItem = (
  id: string,
  status: string,
  overrides: Partial<RequestLogItem> = {}
): RequestLogItem => ({
  id,
  title: `Test Item ${id}`,
  type: 'enhancement',
  domain: ['web'],
  subdomain: ['ui'],
  priority: 'medium',
  status,
  tags: [],
  notes: [],
  created_at: new Date('2025-12-31T10:00:00Z'),
  ...overrides,
});

// Helper to create a mock document with items
const createMockDocument = (
  docId: string,
  items: RequestLogItem[],
  overrides: Partial<RequestLogDoc> = {}
): RequestLogDoc => ({
  doc_id: docId,
  title: `Test Document ${docId}`,
  project_id: 'test-project',
  items,
  items_index: items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
  })),
  tags: [],
  item_count: items.length,
  created_at: new Date('2025-12-31T09:00:00Z'),
  updated_at: new Date('2025-12-31T10:00:00Z'),
  archived: false,
  ...overrides,
});

describe('ProjectProgressIndicator', () => {
  describe('progress calculation', () => {
    it('calculates correct done/total ratio from single document', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
        createMockItem('ITEM-03', 'in-progress'),
        createMockItem('ITEM-04', 'triage'),
        createMockItem('ITEM-05', 'backlog'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      // Should show 2/5 done
      expect(screen.getByText('2/5 done')).toBeInTheDocument();
    });

    it('aggregates progress across multiple documents', () => {
      const doc1Items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
      ];
      const doc2Items = [
        createMockItem('ITEM-03', 'done'),
        createMockItem('ITEM-04', 'in-progress'),
        createMockItem('ITEM-05', 'triage'),
      ];
      const documents = [
        createMockDocument('DOC-01', doc1Items),
        createMockDocument('DOC-02', doc2Items),
      ];

      render(<ProjectProgressIndicator documents={documents} />);

      // Should show 3/5 done (3 done across both docs, 5 total)
      expect(screen.getByText('3/5 done')).toBeInTheDocument();
    });

    it('handles 100% completion correctly', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
        createMockItem('ITEM-03', 'done'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      expect(screen.getByText('3/3 done')).toBeInTheDocument();
      expect(container.querySelector('.project-progress--complete')).toBeInTheDocument();
    });

    it('handles 0% completion correctly', () => {
      const items = [
        createMockItem('ITEM-01', 'triage'),
        createMockItem('ITEM-02', 'backlog'),
        createMockItem('ITEM-03', 'in-progress'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      expect(screen.getByText('0/3 done')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('sets progress bar width to match percentage', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'triage'),
        createMockItem('ITEM-03', 'triage'),
        createMockItem('ITEM-04', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      const progressFill = container.querySelector('.project-progress-fill');
      expect(progressFill).toBeInTheDocument();
      // 1/4 = 25%
      expect(progressFill).toHaveStyle({ width: '25%' });
    });

    it('sets progress bar to 100% when all items done', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      const progressFill = container.querySelector('.project-progress-fill');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('sets progress bar to 0% when no items done', () => {
      const items = [
        createMockItem('ITEM-01', 'triage'),
        createMockItem('ITEM-02', 'backlog'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      const progressFill = container.querySelector('.project-progress-fill');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });
  });

  describe('tooltip', () => {
    it('shows status breakdown in tooltip on hover', async () => {
      const user = userEvent.setup({ delay: null });
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
        createMockItem('ITEM-03', 'in-progress'),
        createMockItem('ITEM-04', 'triage'),
        createMockItem('ITEM-05', 'backlog'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      const indicator = screen.getByText('2/5 done').parentElement;
      await user.hover(indicator!);

      // Wait for tooltip to appear (200ms delay in component)
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Tooltip should show status breakdown
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('2 done');
      expect(tooltip).toHaveTextContent('1 in-progress');
      expect(tooltip).toHaveTextContent('1 triage');
      expect(tooltip).toHaveTextContent('1 backlog');
    });

    it('shows all status counts grouped', async () => {
      const user = userEvent.setup({ delay: null });
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'planned'),
        createMockItem('ITEM-03', 'planned'),
        createMockItem('ITEM-04', 'planned'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      const indicator = screen.getByText('1/4 done').parentElement;
      await user.hover(indicator!);

      await new Promise((resolve) => setTimeout(resolve, 250));

      const tooltip = screen.getByRole('tooltip');
      // planned should be listed first (highest count)
      expect(tooltip).toHaveTextContent('3 planned');
      expect(tooltip).toHaveTextContent('1 done');
    });
  });

  describe('empty state', () => {
    it('shows "No items" when documents array is empty', () => {
      render(<ProjectProgressIndicator documents={[]} />);

      expect(screen.getByText('No items')).toBeInTheDocument();
    });

    it('shows "No items" when all documents have no items', () => {
      const documents = [
        createMockDocument('DOC-01', []),
        createMockDocument('DOC-02', []),
      ];

      render(<ProjectProgressIndicator documents={documents} />);

      expect(screen.getByText('No items')).toBeInTheDocument();
    });

    it('applies empty state class', () => {
      const { container } = render(<ProjectProgressIndicator documents={[]} />);

      expect(container.querySelector('.project-progress--empty')).toBeInTheDocument();
    });

    it('does not render progress bar in empty state', () => {
      const { container } = render(<ProjectProgressIndicator documents={[]} />);

      expect(container.querySelector('.project-progress-bar')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct aria-valuenow for progress bar', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
        createMockItem('ITEM-03', 'done'),
        createMockItem('ITEM-04', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      const progressBar = screen.getByRole('progressbar');
      // 3/4 = 75%
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('has aria-valuemin of 0', () => {
      const items = [createMockItem('ITEM-01', 'done')];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    });

    it('has aria-valuemax of 100', () => {
      const items = [createMockItem('ITEM-01', 'done')];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('has descriptive aria-label', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      const indicator = container.querySelector('.project-progress-indicator');
      expect(indicator).toHaveAttribute(
        'aria-label',
        '1 of 2 items done, 50% complete'
      );
    });

    it('has descriptive aria-label for empty state', () => {
      const { container } = render(<ProjectProgressIndicator documents={[]} />);

      const indicator = container.querySelector('.project-progress-indicator');
      expect(indicator).toHaveAttribute('aria-label', 'No items in project');
    });

    it('progress bar has aria-label with percentage', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
        createMockItem('ITEM-03', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      render(<ProjectProgressIndicator documents={documents} />);

      const progressBar = screen.getByRole('progressbar');
      // 2/3 = 67%
      expect(progressBar).toHaveAttribute('aria-label', 'Progress: 67%');
    });
  });

  describe('color variants', () => {
    it('applies high progress class when >= 75%', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
        createMockItem('ITEM-03', 'done'),
        createMockItem('ITEM-04', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      // 3/4 = 75%
      expect(container.querySelector('.project-progress--high')).toBeInTheDocument();
    });

    it('applies medium progress class when >= 40% and < 75%', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      // 1/2 = 50%
      expect(container.querySelector('.project-progress--medium')).toBeInTheDocument();
    });

    it('applies low progress class when < 40%', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'triage'),
        createMockItem('ITEM-03', 'triage'),
        createMockItem('ITEM-04', 'triage'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      // 1/4 = 25%
      expect(container.querySelector('.project-progress--low')).toBeInTheDocument();
    });

    it('applies complete class for 100% progress', () => {
      const items = [
        createMockItem('ITEM-01', 'done'),
        createMockItem('ITEM-02', 'done'),
      ];
      const documents = [createMockDocument('DOC-01', items)];

      const { container } = render(<ProjectProgressIndicator documents={documents} />);

      expect(container.querySelector('.project-progress--complete')).toBeInTheDocument();
      expect(container.querySelector('.project-progress--high')).toBeInTheDocument();
    });
  });

  describe('memoization', () => {
    it('is wrapped with React.memo', () => {
      // React.memo components have a $$typeof property indicating they are memo components
      // The component should be a function (memoized HOC)
      expect(typeof ProjectProgressIndicator).toBe('object');
      // Access internal React property for testing - memo components are objects with $$typeof
      const componentAsAny = ProjectProgressIndicator as { $$typeof?: symbol };
      expect(componentAsAny.$$typeof?.toString()).toContain('memo');
    });
  });
});
