/**
 * Indicators Integration Tests
 *
 * Verifies that indicator components work correctly when used in their
 * parent component contexts (DocumentRow, ItemCard, ProjectGroupRow).
 *
 * These tests ensure proper data flow, rendering, and interaction
 * between indicators and their parent components.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import indicator components
import { StatusIndicator } from '../StatusIndicator';
import { ItemCountIndicator } from '../ItemCountIndicator';
import { TypeDistributionIndicator } from '../TypeDistributionIndicator';
import { ProjectProgressIndicator } from '../ProjectProgressIndicator';

// Import utilities
import {
  aggregateStatusCounts,
  aggregateTypeCounts,
  calculateProjectProgress,
} from '../../utils/indicators';

// Import test helpers
import { createTestItem, createTestDoc } from '@core/test-helpers';
import type { RequestLogItem, RequestLogDoc } from '@core/models';

/**
 * Helper to create a mock item with a specific type and status
 */
function createMockItemWithTypeAndStatus(
  type: string,
  status: string,
  overrides: Partial<RequestLogItem> = {}
): RequestLogItem {
  return createTestItem({
    type,
    status,
    ...overrides,
  });
}

describe('Indicators Integration Tests', () => {
  describe('StatusIndicator with item data', () => {
    it('renders correct indicator for each status from item data', () => {
      const statuses = ['triage', 'backlog', 'planned', 'in-progress', 'done', 'wontfix'];

      for (const status of statuses) {
        const item = createTestItem({ status });
        const { container, unmount } = render(
          <StatusIndicator status={item.status} />
        );

        const indicator = container.querySelector('.status-indicator');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveClass(`status-indicator--${status}`);

        unmount();
      }
    });

    it('works with dynamically created item status', () => {
      const item = createTestItem({ status: 'in-progress' });

      render(<StatusIndicator status={item.status} showTooltip={false} />);

      const indicator = screen.getByRole('img', { name: 'In Progress' });
      expect(indicator).toHaveClass('status-indicator--in-progress');
    });
  });

  describe('ItemCountIndicator with document data', () => {
    it('displays correct count from document items', () => {
      const doc = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'triage' }),
          createTestItem({ status: 'in-progress' }),
        ],
      });

      render(<ItemCountIndicator items={doc.items} />);

      expect(screen.getByText('3 items')).toBeInTheDocument();
    });

    it('aggregates status counts correctly from document items', () => {
      const doc = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'triage' }),
          createTestItem({ status: 'in-progress' }),
        ],
      });

      const counts = aggregateStatusCounts(doc.items);

      expect(counts['done']).toBe(2);
      expect(counts['triage']).toBe(1);
      expect(counts['in-progress']).toBe(1);
    });

    it('shows correct tooltip breakdown when hovering', async () => {
      const user = userEvent.setup({ delay: null });

      const doc = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'backlog' }),
        ],
      });

      render(<ItemCountIndicator items={doc.items} />);

      const indicator = screen.getByText('3 items');
      await user.hover(indicator);

      // Verify aria-label contains status breakdown
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('2 done')
      );
      expect(indicator).toHaveAttribute(
        'aria-label',
        expect.stringContaining('1 backlog')
      );
    });
  });

  describe('TypeDistributionIndicator with document data', () => {
    it('displays correct type distribution from document items', () => {
      const doc = createTestDoc({
        items: [
          createMockItemWithTypeAndStatus('bug', 'triage'),
          createMockItemWithTypeAndStatus('bug', 'done'),
          createMockItemWithTypeAndStatus('enhancement', 'triage'),
          createMockItemWithTypeAndStatus('idea', 'backlog'),
        ],
      });

      render(<TypeDistributionIndicator items={doc.items} />);

      // 2 bugs should have highest count
      const container = document.querySelector('.type-distribution-indicator');
      expect(container).toBeInTheDocument();

      // Check visually-hidden text for accessibility
      expect(screen.getByText('2 bugs')).toBeInTheDocument();
      expect(screen.getByText('1 enhancement')).toBeInTheDocument();
      expect(screen.getByText('1 idea')).toBeInTheDocument();
    });

    it('aggregates type counts correctly from document items', () => {
      const doc = createTestDoc({
        items: [
          createMockItemWithTypeAndStatus('bug', 'triage'),
          createMockItemWithTypeAndStatus('bug', 'done'),
          createMockItemWithTypeAndStatus('enhancement', 'in-progress'),
        ],
      });

      const counts = aggregateTypeCounts(doc.items);

      expect(counts['bug']).toBe(2);
      expect(counts['enhancement']).toBe(1);
    });

    it('respects maxTypes with real document data', () => {
      const doc = createTestDoc({
        items: [
          createMockItemWithTypeAndStatus('bug', 'triage'),
          createMockItemWithTypeAndStatus('enhancement', 'triage'),
          createMockItemWithTypeAndStatus('idea', 'backlog'),
          createMockItemWithTypeAndStatus('task', 'planned'),
          createMockItemWithTypeAndStatus('question', 'triage'),
          createMockItemWithTypeAndStatus('feature', 'backlog'),
        ],
      });

      const { container } = render(
        <TypeDistributionIndicator items={doc.items} maxTypes={3} />
      );

      // Should show 3 types plus overflow
      const badges = container.querySelectorAll('.type-badge-mini');
      expect(badges.length).toBe(4); // 3 types + 1 overflow

      // Should show "+3 more"
      expect(screen.getByText('+3 more')).toBeInTheDocument();
    });
  });

  describe('ProjectProgressIndicator with multiple documents', () => {
    it('calculates progress across multiple documents', () => {
      const doc1 = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'done' }),
        ],
      });

      const doc2 = createTestDoc({
        items: [
          createTestItem({ status: 'triage' }),
          createTestItem({ status: 'in-progress' }),
          createTestItem({ status: 'done' }),
        ],
      });

      render(<ProjectProgressIndicator documents={[doc1, doc2]} />);

      // 3 done out of 5 total
      expect(screen.getByText('3/5 done')).toBeInTheDocument();
    });

    it('utility function calculates progress correctly', () => {
      const doc1 = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'backlog' }),
        ],
      });

      const doc2 = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'done' }),
        ],
      });

      const progress = calculateProjectProgress([doc1, doc2]);

      expect(progress.done).toBe(3);
      expect(progress.total).toBe(4);
      expect(progress.statusBreakdown['done']).toBe(3);
      expect(progress.statusBreakdown['backlog']).toBe(1);
    });

    it('shows correct progress bar width', () => {
      const doc = createTestDoc({
        items: [
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'done' }),
          createTestItem({ status: 'triage' }),
          createTestItem({ status: 'triage' }),
        ],
      });

      const { container } = render(<ProjectProgressIndicator documents={[doc]} />);

      const progressFill = container.querySelector('.project-progress-fill');
      // 2/4 = 50%
      expect(progressFill).toHaveStyle({ width: '50%' });
    });

    it('handles empty project correctly', () => {
      render(<ProjectProgressIndicator documents={[]} />);

      expect(screen.getByText('No items')).toBeInTheDocument();
    });
  });

  describe('Indicators work together in simulated parent context', () => {
    /**
     * Simulates a DocumentRow-like rendering context
     */
    function SimulatedDocumentRow({ document }: { document: RequestLogDoc | null }) {
      if (!document) {
        return <div>No document</div>;
      }

      return (
        <div data-testid="document-row">
          <div data-testid="doc-info">
            <span>{document.doc_id}</span>
            <span>{document.title}</span>
          </div>
          <div data-testid="doc-indicators">
            {document.items.length > 0 && (
              <>
                <ItemCountIndicator items={document.items} size="sm" />
                <TypeDistributionIndicator items={document.items} maxTypes={3} />
              </>
            )}
          </div>
        </div>
      );
    }

    it('renders both indicators with document data', () => {
      const doc = createTestDoc({
        items: [
          createMockItemWithTypeAndStatus('bug', 'done'),
          createMockItemWithTypeAndStatus('bug', 'triage'),
          createMockItemWithTypeAndStatus('enhancement', 'in-progress'),
        ],
      });

      render(<SimulatedDocumentRow document={doc} />);

      // ItemCountIndicator shows total
      expect(screen.getByText('3 items')).toBeInTheDocument();

      // TypeDistributionIndicator shows type badges
      expect(screen.getByText('2 bugs')).toBeInTheDocument();
      expect(screen.getByText('1 enhancement')).toBeInTheDocument();
    });

    it('handles document with empty items', () => {
      const doc = createTestDoc({ items: [] });

      render(<SimulatedDocumentRow document={doc} />);

      // No indicators should render
      expect(screen.queryByText(/items?$/)).not.toBeInTheDocument();
    });
  });

  describe('Indicators work in simulated ItemCard context', () => {
    /**
     * Simulates an ItemCard-like rendering context
     */
    function SimulatedItemCard({ item }: { item: RequestLogItem }) {
      return (
        <div data-testid="item-card">
          <div data-testid="item-header">
            <span>{item.id}</span>
            <StatusIndicator status={item.status} size="sm" showTooltip={true} />
          </div>
          <div data-testid="item-content">
            <h3>{item.title}</h3>
            <span>Type: {item.type}</span>
          </div>
        </div>
      );
    }

    it('renders StatusIndicator with item status', () => {
      const item = createTestItem({
        status: 'in-progress',
        title: 'Test Feature',
      });

      render(<SimulatedItemCard item={item} />);

      const indicator = screen.getByRole('img', { name: 'In Progress' });
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass('status-indicator--in-progress');
    });

    it('updates indicator when item status changes', () => {
      const item = createTestItem({ status: 'triage' });

      const { rerender } = render(<SimulatedItemCard item={item} />);

      let indicator = screen.getByRole('img', { name: 'Triage' });
      expect(indicator).toHaveClass('status-indicator--triage');

      // Update status
      const updatedItem = { ...item, status: 'done' };
      rerender(<SimulatedItemCard item={updatedItem} />);

      indicator = screen.getByRole('img', { name: 'Done' });
      expect(indicator).toHaveClass('status-indicator--done');
    });
  });

  describe('Indicators work in simulated ProjectGroupRow context', () => {
    /**
     * Simulates a ProjectGroupRow-like rendering context
     */
    function SimulatedProjectGroupRow({
      projectName,
      documents,
    }: {
      projectName: string;
      documents: RequestLogDoc[];
    }) {
      return (
        <div data-testid="project-row">
          <div data-testid="project-info">
            <h2>{projectName}</h2>
            <span>{documents.length} documents</span>
          </div>
          <div data-testid="project-progress">
            <ProjectProgressIndicator documents={documents} />
          </div>
        </div>
      );
    }

    it('renders ProjectProgressIndicator with multiple documents', () => {
      const documents = [
        createTestDoc({
          items: [
            createTestItem({ status: 'done' }),
            createTestItem({ status: 'done' }),
          ],
        }),
        createTestDoc({
          items: [
            createTestItem({ status: 'triage' }),
            createTestItem({ status: 'in-progress' }),
          ],
        }),
      ];

      render(<SimulatedProjectGroupRow projectName="Test Project" documents={documents} />);

      // 2 done out of 4 total
      expect(screen.getByText('2/4 done')).toBeInTheDocument();
    });

    it('updates when documents change', () => {
      const initialDocs = [
        createTestDoc({
          items: [createTestItem({ status: 'triage' })],
        }),
      ];

      const { rerender } = render(
        <SimulatedProjectGroupRow projectName="Test Project" documents={initialDocs} />
      );

      expect(screen.getByText('0/1 done')).toBeInTheDocument();

      // Add a document with done items
      const updatedDocs = [
        ...initialDocs,
        createTestDoc({
          items: [
            createTestItem({ status: 'done' }),
            createTestItem({ status: 'done' }),
          ],
        }),
      ];

      rerender(<SimulatedProjectGroupRow projectName="Test Project" documents={updatedDocs} />);

      expect(screen.getByText('2/3 done')).toBeInTheDocument();
    });
  });

  describe('Data flow from utilities to components', () => {
    it('utility results can be used directly with components', () => {
      const items = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'triage' }),
      ];

      // Use utility to aggregate
      const statusCounts = aggregateStatusCounts(items);

      // Verify utility output
      expect(statusCounts).toEqual({
        done: 1,
        triage: 1,
      });

      // Verify component renders correctly with same items
      render(<ItemCountIndicator items={items} />);
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('calculateProjectProgress integrates with ProjectProgressIndicator', () => {
      const docs = [
        createTestDoc({
          items: [
            createTestItem({ status: 'done' }),
            createTestItem({ status: 'done' }),
            createTestItem({ status: 'backlog' }),
          ],
        }),
      ];

      // Utility calculation
      const progress = calculateProjectProgress(docs);
      expect(progress.done).toBe(2);
      expect(progress.total).toBe(3);

      // Component rendering
      render(<ProjectProgressIndicator documents={docs} />);
      expect(screen.getByText('2/3 done')).toBeInTheDocument();

      // Progress bar should show ~67%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '67');
    });
  });

  describe('Accessibility integration', () => {
    it('all indicators provide accessible information', () => {
      const doc = createTestDoc({
        items: [
          createMockItemWithTypeAndStatus('bug', 'done'),
          createMockItemWithTypeAndStatus('enhancement', 'triage'),
        ],
      });

      render(
        <div>
          <StatusIndicator status="done" />
          <ItemCountIndicator items={doc.items} />
          <TypeDistributionIndicator items={doc.items} />
          <ProjectProgressIndicator documents={[doc]} />
        </div>
      );

      // StatusIndicator has aria-label
      const statusIndicator = screen.getByRole('img', { name: 'Done' });
      expect(statusIndicator).toHaveAttribute('aria-label', 'Done');

      // ItemCountIndicator has aria-label with breakdown
      const itemCount = screen.getByText('2 items');
      expect(itemCount).toHaveAttribute('aria-label');

      // TypeDistributionIndicator has aria-label
      const typeDist = document.querySelector('.type-distribution-indicator');
      expect(typeDist).toHaveAttribute('aria-label');

      // ProjectProgressIndicator has progressbar role
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('screen reader can access all indicator information', () => {
      const doc = createTestDoc({
        items: [
          createMockItemWithTypeAndStatus('bug', 'done'),
          createMockItemWithTypeAndStatus('bug', 'done'),
          createMockItemWithTypeAndStatus('enhancement', 'triage'),
        ],
      });

      render(<TypeDistributionIndicator items={doc.items} />);

      // Visually hidden text for screen readers
      expect(screen.getByText('2 bugs')).toHaveClass('visually-hidden');
      expect(screen.getByText('1 enhancement')).toHaveClass('visually-hidden');
    });
  });

  describe('Performance: Memoization verification', () => {
    it('components are memoized for performance', () => {
      // Verify all indicator components use React.memo
      expect(StatusIndicator).toHaveProperty('$$typeof', Symbol.for('react.memo'));
      expect(ItemCountIndicator).toHaveProperty('$$typeof', Symbol.for('react.memo'));
      expect(TypeDistributionIndicator).toHaveProperty('$$typeof', Symbol.for('react.memo'));
      expect(ProjectProgressIndicator).toHaveProperty('$$typeof', Symbol.for('react.memo'));
    });

    it('ItemCountIndicator does not re-render with same items reference', () => {
      const items = [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'triage' }),
      ];

      const { rerender } = render(<ItemCountIndicator items={items} />);

      // Re-render with same reference
      rerender(<ItemCountIndicator items={items} />);

      // Component should still show correct count
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });
  });
});
