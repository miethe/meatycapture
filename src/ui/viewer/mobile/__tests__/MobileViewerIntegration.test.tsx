/**
 * MobileViewerIntegration Tests
 *
 * Integration tests for the mobile viewer component flows.
 * Tests the complete flow from viewport detection through filter/detail
 * sheet interactions, including gestures and state synchronization.
 *
 * Test Coverage:
 * 1. Mobile card list renders when viewport <768px
 * 2. FAB tap opens filter sheet
 * 3. Apply filters updates card list
 * 4. Card tap opens detail sheet
 * 5. Detail sheet expand animation works
 * 6. Gesture dismiss works (simulated touch events)
 * 7. Filter state syncs mobile<->desktop
 */

import React, { useState, useCallback } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileViewerContainer } from '../MobileViewerContainer';
import type {
  CatalogEntry,
  GroupedCatalog,
  FilterState,
  FilterOptions,
  CatalogSort,
} from '@core/catalog';
import {
  createEmptyFilter,
  createDefaultSort,
  createEmptyGroupedCatalog,
  getActiveFilterCount,
} from '@core/catalog';

// ============================================================================
// Mocks
// ============================================================================

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock focus utilities to prevent side effects
vi.mock('../utils/focusUtils', () => ({
  trapFocus: vi.fn(),
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
}));

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Store original window properties for cleanup
 */
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

/**
 * Set viewport dimensions for testing responsive behavior
 *
 * @param width - Viewport width in pixels
 * @param height - Viewport height in pixels
 */
function setViewportDimensions(width: number, height: number): void {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
}

/**
 * Restore original viewport dimensions
 */
function restoreViewportDimensions(): void {
  setViewportDimensions(originalInnerWidth, originalInnerHeight);
}

/**
 * Create a mock CatalogEntry for testing
 *
 * @param overrides - Optional property overrides
 * @returns Mock CatalogEntry
 */
function createMockEntry(overrides?: Partial<CatalogEntry>): CatalogEntry {
  return {
    doc_id: 'REQ-20251230-test',
    title: 'Test Document',
    path: '/test/path/doc.md',
    project_id: 'test-project',
    project_name: 'Test Project',
    item_count: 5,
    updated_at: new Date('2025-12-30'),
    archived: false,
    ...overrides,
  };
}

/**
 * Create multiple mock entries with different properties
 *
 * @returns Array of mock CatalogEntry objects
 */
function createMockEntries(): CatalogEntry[] {
  return [
    createMockEntry({
      doc_id: 'REQ-20251230-project-a-01',
      title: 'First Document',
      project_id: 'project-a',
      project_name: 'Project Alpha',
      item_count: 3,
    }),
    createMockEntry({
      doc_id: 'REQ-20251229-project-b-02',
      title: 'Second Document',
      project_id: 'project-b',
      project_name: 'Project Beta',
      item_count: 7,
      updated_at: new Date('2025-12-29'),
    }),
    createMockEntry({
      doc_id: 'REQ-20251228-project-c-01',
      title: 'Third Document',
      project_id: 'project-c',
      project_name: 'Project Gamma',
      item_count: 2,
      updated_at: new Date('2025-12-28'),
    }),
  ];
}

/**
 * Create mock filter options for testing
 *
 * @returns Mock FilterOptions
 */
function createMockFilterOptions(): FilterOptions {
  return {
    projects: [
      { id: 'project-a', name: 'Project Alpha' },
      { id: 'project-b', name: 'Project Beta' },
      { id: 'project-c', name: 'Project Gamma' },
    ],
    types: ['bug', 'enhancement', 'idea'],
    domains: ['api', 'web', 'mobile'],
    subdomains: ['auth', 'ui'],
    features: ['login', 'dashboard'],
    priorities: ['high', 'medium', 'low'],
    statuses: ['triage', 'backlog', 'in-progress', 'done'],
    tags: ['ux', 'performance', 'security'],
  };
}

/**
 * Create mock grouped catalog from entries
 *
 * @param entries - Catalog entries to group
 * @returns GroupedCatalog structure
 */
function createMockGroupedCatalog(entries: CatalogEntry[]): GroupedCatalog {
  const groups = new Map<
    string,
    { project: { id: string; name: string }; entries: CatalogEntry[] }
  >();

  for (const entry of entries) {
    const existing = groups.get(entry.project_id);
    if (existing) {
      existing.entries.push(entry);
    } else {
      groups.set(entry.project_id, {
        project: { id: entry.project_id, name: entry.project_name },
        entries: [entry],
      });
    }
  }

  return { groups };
}

/**
 * Props interface for the test wrapper component
 */
interface TestWrapperProps {
  initialFilterState?: FilterState;
  initialEntries?: CatalogEntry[];
  onFilterStateChange?: (filterState: FilterState) => void;
}

/**
 * Test wrapper component that manages filter state
 *
 * Provides a controlled environment for testing the MobileViewerContainer
 * with realistic state management.
 */
function TestWrapper({
  initialFilterState,
  initialEntries,
  onFilterStateChange,
}: TestWrapperProps): React.JSX.Element {
  const [filterState, setFilterState] = useState<FilterState>(
    initialFilterState ?? createEmptyFilter()
  );
  const [entries] = useState<CatalogEntry[]>(initialEntries ?? createMockEntries());
  const [sort, setSort] = useState<CatalogSort>(createDefaultSort());
  const [loading] = useState(false);

  const filterOptions = createMockFilterOptions();
  const groupedCatalog = createMockGroupedCatalog(entries);
  const activeFilterCount = getActiveFilterCount(filterState);

  const handleFilterChange = useCallback(
    (key: keyof FilterState, value: unknown) => {
      setFilterState((prev) => {
        const newState = { ...prev, [key]: value } as FilterState;
        onFilterStateChange?.(newState);
        return newState;
      });
    },
    [onFilterStateChange]
  );

  const handleClearFilters = useCallback(() => {
    const newState = createEmptyFilter();
    setFilterState(newState);
    onFilterStateChange?.(newState);
  }, [onFilterStateChange]);

  const handleSortChange = useCallback((newSort: CatalogSort) => {
    setSort(newSort);
  }, []);

  const handleRefresh = useCallback(() => {
    // No-op for testing
  }, []);

  const handleLoadDocument = useCallback(async (_path: string) => {
    return null;
  }, []);

  return (
    <MobileViewerContainer
      entries={entries}
      groupedCatalog={groupedCatalog}
      filterState={filterState}
      filterOptions={filterOptions}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      activeFilterCount={activeFilterCount}
      onLoadDocument={handleLoadDocument}
      sort={sort}
      onSortChange={handleSortChange}
      onRefresh={handleRefresh}
      loading={loading}
    />
  );
}

/**
 * Simulate a touch gesture sequence
 *
 * @param element - Element to perform gesture on
 * @param startY - Starting Y coordinate
 * @param endY - Ending Y coordinate
 * @param options - Additional options
 */
function simulateTouchGesture(
  element: Element,
  startY: number,
  endY: number,
  options: { steps?: number } = {}
): void {
  const { steps = 5 } = options;
  const deltaY = (endY - startY) / steps;

  // Touch start
  fireEvent.touchStart(element, {
    touches: [{ clientX: 100, clientY: startY, identifier: 0 }],
  });

  // Touch move in steps
  for (let i = 1; i <= steps; i++) {
    const currentY = startY + deltaY * i;
    fireEvent.touchMove(element, {
      touches: [{ clientX: 100, clientY: currentY, identifier: 0 }],
    });
  }

  // Touch end
  fireEvent.touchEnd(element, {
    changedTouches: [{ clientX: 100, clientY: endY, identifier: 0 }],
  });
}

// ============================================================================
// Test Suites
// ============================================================================

describe('MobileViewerIntegration', () => {
  beforeEach(() => {
    // Set mobile viewport dimensions
    setViewportDimensions(375, 812); // iPhone X dimensions
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreViewportDimensions();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  describe('1. Mobile card list renders when viewport <768px', () => {
    it('renders MobileViewerContainer with card list at mobile viewport', () => {
      setViewportDimensions(375, 812);

      render(<TestWrapper />);

      // Verify container renders
      expect(screen.getByTestId('mobile-viewer-container')).toBeInTheDocument();

      // Verify cards are rendered for each entry (3 document cards)
      const docList = screen.getByRole('list', { name: /document list/i });
      const cards = within(docList).getAllByRole('button');
      expect(cards).toHaveLength(3);
    });

    it('renders document cards with correct information', () => {
      setViewportDimensions(768, 1024); // Exactly at breakpoint

      render(<TestWrapper />);

      // Find the first card by its content
      const firstCard = screen.getByRole('button', { name: /first document/i });
      expect(firstCard).toBeInTheDocument();

      // Verify card content
      expect(screen.getByText('First Document')).toBeInTheDocument();
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    it('displays correct item counts on cards', () => {
      render(<TestWrapper />);

      // Check item counts are displayed
      expect(screen.getByText('3 items')).toBeInTheDocument();
      expect(screen.getByText('7 items')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    it('shows empty state when no entries match', () => {
      render(<TestWrapper initialEntries={[]} />);

      expect(screen.getByRole('status', { name: /no documents/i })).toBeInTheDocument();
      expect(screen.getByText('No documents yet')).toBeInTheDocument();
    });
  });

  describe('2. FAB tap opens filter sheet', () => {
    it('renders FAB button with filter icon', () => {
      render(<TestWrapper />);

      const fab = screen.getByTestId('mobile-filter-fab');
      expect(fab).toBeInTheDocument();
      expect(fab).toHaveAttribute('aria-label', 'Open filters');
    });

    it('opens filter sheet when FAB is clicked', async () => {
      render(<TestWrapper />);

      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      // Filter sheet should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('displays filter badge when filters are active', () => {
      const filterState: FilterState = {
        ...createEmptyFilter(),
        types: ['bug', 'enhancement'],
      };

      render(<TestWrapper initialFilterState={filterState} />);

      const fab = screen.getByTestId('mobile-filter-fab');
      expect(fab).toHaveAttribute('aria-label', 'Open filters, 2 active');

      // Badge should be visible
      const badge = fab.querySelector('.mobile-filter-fab__badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('2');
    });

    it('hides FAB when filter sheet is open', async () => {
      render(<TestWrapper />);

      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(fab).toHaveClass('mobile-filter-fab--hidden');
      });
    });
  });

  describe('3. Apply filters updates card list', () => {
    it('filters are applied when checkboxes are clicked', async () => {
      const onFilterStateChange = vi.fn();

      render(<TestWrapper onFilterStateChange={onFilterStateChange} />);

      // Open filter sheet
      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click on a type filter
      const typesGroup = screen.getByRole('group', { name: 'Type filters' });
      const bugCheckbox = within(typesGroup).getByRole('checkbox', { name: /bug/i });
      fireEvent.click(bugCheckbox);

      // Filter state should be updated
      expect(onFilterStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['bug'],
        })
      );
    });

    it('closing filter sheet with Apply button works', async () => {
      render(<TestWrapper />);

      // Open filter sheet
      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Wait for debounce period to pass (useBottomSheet has 100ms debounce)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Click Apply button
      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      // Filter sheet should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('Clear All button resets all filters', async () => {
      const filterState: FilterState = {
        ...createEmptyFilter(),
        project_id: 'project-a',
        types: ['bug'],
        tags: ['ux'],
      };
      const onFilterStateChange = vi.fn();

      render(
        <TestWrapper initialFilterState={filterState} onFilterStateChange={onFilterStateChange} />
      );

      // Open filter sheet
      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Clear All button
      const clearButton = screen.getByRole('button', { name: 'Clear all filters' });
      fireEvent.click(clearButton);

      // Filter state should be cleared
      expect(onFilterStateChange).toHaveBeenCalledWith(createEmptyFilter());
    });

    it('project selection updates filter state', async () => {
      const onFilterStateChange = vi.fn();

      render(<TestWrapper onFilterStateChange={onFilterStateChange} />);

      // Open filter sheet
      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select a project
      const projectSelect = screen.getByLabelText('Project');
      fireEvent.change(projectSelect, { target: { value: 'project-a' } });

      expect(onFilterStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-a',
        })
      );
    });
  });

  describe('4. Card tap opens detail sheet', () => {
    it('tapping a card opens the detail sheet', async () => {
      render(<TestWrapper />);

      // Find and click a card
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      // Detail sheet should open
      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });
    });

    it('detail sheet displays correct document information', async () => {
      render(<TestWrapper />);

      // Click a card
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Verify document info is displayed
      expect(screen.getByTestId('mobile-detail-title')).toHaveTextContent('First Document');
      expect(screen.getByTestId('mobile-detail-doc-id')).toHaveTextContent(
        'REQ-20251230-project-a-01'
      );
      expect(screen.getByTestId('mobile-detail-item-count')).toHaveTextContent('3');
      expect(screen.getByTestId('mobile-detail-project')).toHaveTextContent('Project Alpha');
    });

    it('detail sheet has correct ARIA attributes', async () => {
      render(<TestWrapper />);

      // Click a card
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        const dialog = screen.getByTestId('mobile-detail-sheet');
        expect(dialog).toHaveAttribute('role', 'dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAttribute('aria-labelledby', 'detail-sheet-title');
      });
    });

    it('clicking another card updates detail sheet content', async () => {
      render(<TestWrapper />);

      // Click first card
      const firstCard = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(firstCard);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-title')).toHaveTextContent('First Document');
      });

      // Close detail sheet first
      const closeButton = screen.getByTestId('mobile-detail-close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
      });

      // Click second card
      const secondCard = screen.getByRole('button', { name: /second document/i });
      fireEvent.click(secondCard);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-title')).toHaveTextContent('Second Document');
      });
    });
  });

  describe('5. Detail sheet expand animation works', () => {
    it('clicking Expand button expands sheet to full height', async () => {
      render(<TestWrapper />);

      // Open detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Click expand button
      const expandButton = screen.getByTestId('mobile-detail-expand');
      fireEvent.click(expandButton);

      // Sheet should have expanded class
      await waitFor(() => {
        const sheet = screen.getByTestId('mobile-detail-sheet');
        expect(sheet).toHaveClass('mobile-detail-sheet--expanded');
        expect(sheet).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('expanded sheet shows Collapse button instead of Expand', async () => {
      render(<TestWrapper />);

      // Open and expand detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      const expandButton = screen.getByTestId('mobile-detail-expand');
      fireEvent.click(expandButton);

      // Collapse button should be visible, Expand should not
      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-collapse')).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-detail-expand')).not.toBeInTheDocument();
      });
    });

    it('clicking Collapse button returns sheet to half height', async () => {
      render(<TestWrapper />);

      // Open and expand detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      const expandButton = screen.getByTestId('mobile-detail-expand');
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-collapse')).toBeInTheDocument();
      });

      // Click collapse button
      const collapseButton = screen.getByTestId('mobile-detail-collapse');
      fireEvent.click(collapseButton);

      // Sheet should not have expanded class
      await waitFor(() => {
        const sheet = screen.getByTestId('mobile-detail-sheet');
        expect(sheet).not.toHaveClass('mobile-detail-sheet--expanded');
        expect(sheet).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('View Full Document button expands sheet', async () => {
      render(<TestWrapper />);

      // Open detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Click View Full Document button
      const viewFullButton = screen.getByTestId('mobile-detail-view-full');
      fireEvent.click(viewFullButton);

      // Sheet should be expanded
      await waitFor(() => {
        const sheet = screen.getByTestId('mobile-detail-sheet');
        expect(sheet).toHaveClass('mobile-detail-sheet--expanded');
      });
    });
  });

  describe('6. Gesture dismiss works (simulated touch events)', () => {
    it('dragging down on handle dismisses half-height sheet', async () => {
      render(<TestWrapper />);

      // Open detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Simulate drag down gesture on handle (>50px threshold)
      const handle = screen.getByTestId('mobile-detail-handle');
      simulateTouchGesture(handle, 100, 200);

      // Sheet should be dismissed
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
      });
    });

    it('dragging down on expanded sheet collapses it first', async () => {
      render(<TestWrapper />);

      // Open and expand detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      const expandButton = screen.getByTestId('mobile-detail-expand');
      fireEvent.click(expandButton);

      await waitFor(() => {
        const sheet = screen.getByTestId('mobile-detail-sheet');
        expect(sheet).toHaveClass('mobile-detail-sheet--expanded');
      });

      // Simulate drag down gesture on handle
      const handle = screen.getByTestId('mobile-detail-handle');
      simulateTouchGesture(handle, 100, 200);

      // Sheet should collapse but stay open
      await waitFor(() => {
        const updatedSheet = screen.getByTestId('mobile-detail-sheet');
        expect(updatedSheet).not.toHaveClass('mobile-detail-sheet--expanded');
        expect(updatedSheet).toBeInTheDocument();
      });
    });

    it('small drag distance does not dismiss sheet', async () => {
      render(<TestWrapper />);

      // Open detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Simulate small drag (less than 50px threshold)
      const handle = screen.getByTestId('mobile-detail-handle');
      simulateTouchGesture(handle, 100, 130);

      // Sheet should still be visible
      expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
    });

    it('clicking scrim dismisses detail sheet', async () => {
      render(<TestWrapper />);

      // Open detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Click scrim
      const scrim = screen.getByTestId('mobile-detail-scrim');
      fireEvent.click(scrim);

      // Sheet should be dismissed
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
      });
    });

    it('pressing Escape key dismisses detail sheet', async () => {
      render(<TestWrapper />);

      // Open detail sheet
      const card = screen.getByRole('button', { name: /first document/i });
      fireEvent.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Sheet should be dismissed
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-detail-sheet')).not.toBeInTheDocument();
      });
    });
  });

  describe('7. Filter state syncs mobile<->desktop', () => {
    it('filter state changes propagate to parent callback', async () => {
      const onFilterStateChange = vi.fn();

      render(<TestWrapper onFilterStateChange={onFilterStateChange} />);

      // Open filter sheet
      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Make multiple filter changes
      const typesGroup = screen.getByRole('group', { name: 'Type filters' });
      const bugCheckbox = within(typesGroup).getByRole('checkbox', { name: /bug/i });
      fireEvent.click(bugCheckbox);

      expect(onFilterStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['bug'],
        })
      );

      // Clear and check another filter
      onFilterStateChange.mockClear();

      const domainsGroup = screen.getByRole('group', { name: 'Domain filters' });
      const webCheckbox = within(domainsGroup).getByRole('checkbox', { name: /web/i });
      fireEvent.click(webCheckbox);

      expect(onFilterStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['bug'],
          domains: ['web'],
        })
      );
    });

    it('external filter state changes are reflected in UI', () => {
      // Render with filters already active (simulating state from desktop)
      const filterState: FilterState = {
        ...createEmptyFilter(),
        types: ['bug'],
      };

      render(<TestWrapper initialFilterState={filterState} />);

      // FAB should show active filter count
      const fab = screen.getByTestId('mobile-filter-fab');
      expect(fab).toHaveAttribute('aria-label', 'Open filters, 1 active');

      // Badge should show count
      const badge = fab.querySelector('.mobile-filter-fab__badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('1');
    });

    it('search text filter is reflected in header', () => {
      const filterState: FilterState = {
        ...createEmptyFilter(),
        text: 'search query',
      };

      render(<TestWrapper initialFilterState={filterState} />);

      // Search input in header should have the value
      const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
      expect(searchInput.value).toBe('search query');
    });

    it('FAB badge updates when filters change', async () => {
      const onFilterStateChange = vi.fn();

      render(<TestWrapper onFilterStateChange={onFilterStateChange} />);

      const fab = screen.getByTestId('mobile-filter-fab');

      // Initially no badge
      expect(fab.querySelector('.mobile-filter-fab__badge')).not.toBeInTheDocument();

      // Open filter sheet and add a filter
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const typesGroup = screen.getByRole('group', { name: 'Type filters' });
      const bugCheckbox = within(typesGroup).getByRole('checkbox', { name: /bug/i });
      fireEvent.click(bugCheckbox);

      // Badge should now appear on FAB (even though it's hidden while sheet is open)
      await waitFor(() => {
        const badge = fab.querySelector('.mobile-filter-fab__badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('1');
      });
    });
  });

  describe('Loading and Empty States', () => {
    it('displays loading skeleton while loading', () => {
      render(
        <MobileViewerContainer
          entries={[]}
          groupedCatalog={createEmptyGroupedCatalog()}
          filterState={createEmptyFilter()}
          filterOptions={createMockFilterOptions()}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
          activeFilterCount={0}
          onLoadDocument={vi.fn().mockResolvedValue(null)}
          sort={createDefaultSort()}
          onSortChange={vi.fn()}
          onRefresh={vi.fn()}
          loading={true}
        />
      );

      expect(screen.getByRole('status', { name: 'Loading documents' })).toBeInTheDocument();
    });

    it('displays empty state with clear filters button when filters active', () => {
      const filterState: FilterState = {
        ...createEmptyFilter(),
        types: ['bug'],
      };

      render(
        <MobileViewerContainer
          entries={[]}
          groupedCatalog={createEmptyGroupedCatalog()}
          filterState={filterState}
          filterOptions={createMockFilterOptions()}
          onFilterChange={vi.fn()}
          onClearFilters={vi.fn()}
          activeFilterCount={1}
          onLoadDocument={vi.fn().mockResolvedValue(null)}
          sort={createDefaultSort()}
          onSortChange={vi.fn()}
          onRefresh={vi.fn()}
          loading={false}
        />
      );

      expect(screen.getByText('No matching documents')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('cards are keyboard accessible', async () => {
      render(<TestWrapper />);

      const card = screen.getByRole('button', { name: /first document/i });
      card.focus();

      // Press Enter to select
      fireEvent.keyDown(card, { key: 'Enter' });

      // Detail sheet should open
      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });
    });

    it('Space key also activates cards', async () => {
      render(<TestWrapper />);

      const card = screen.getByRole('button', { name: /first document/i });
      card.focus();

      // Press Space to select
      fireEvent.keyDown(card, { key: ' ' });

      // Detail sheet should open
      await waitFor(() => {
        expect(screen.getByTestId('mobile-detail-sheet')).toBeInTheDocument();
      });
    });

    it('filter sheet can be closed with Escape key', async () => {
      render(<TestWrapper />);

      // Open filter sheet
      const fab = screen.getByTestId('mobile-filter-fab');
      fireEvent.click(fab);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Wait for debounce period to pass (useBottomSheet has 100ms debounce)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      // Filter sheet should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
