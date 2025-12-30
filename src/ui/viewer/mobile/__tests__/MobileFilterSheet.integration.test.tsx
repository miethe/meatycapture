/**
 * MobileFilterSheet Integration Tests
 *
 * Tests the integration between MobileFilterSheet and parent filter state.
 * Verifies that filter changes properly sync with parent callbacks
 * and that the UI reflects current filter state correctly.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileFilterSheet } from '../MobileFilterSheet';
import type { FilterState, FilterOptions } from '@core/catalog';
import { createEmptyFilter, getActiveFilterCount } from '@core/catalog';

// Mock the focus utilities to prevent side effects
vi.mock('../utils/focusUtils', () => ({
  trapFocus: vi.fn(),
  lockBodyScroll: vi.fn(),
  unlockBodyScroll: vi.fn(),
}));

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

/**
 * Create mock filter options for testing
 */
function createMockFilterOptions(): FilterOptions {
  return {
    projects: [
      { id: 'capture-app', name: 'Capture App' },
      { id: 'homelab', name: 'Homelab' },
      { id: 'personal', name: 'Personal' },
    ],
    types: ['bug', 'enhancement', 'idea', 'task'],
    domains: ['api', 'web', 'mobile', 'infra'],
    priorities: ['critical', 'high', 'medium', 'low'],
    statuses: ['triage', 'backlog', 'in-progress', 'done'],
    tags: ['ux', 'performance', 'security', 'documentation'],
  };
}

/**
 * Default props for MobileFilterSheet tests
 */
function createDefaultProps(overrides?: Partial<{
  filterState: FilterState;
  filterOptions: FilterOptions;
  onFilterChange: ReturnType<typeof vi.fn>;
  onClearAll: ReturnType<typeof vi.fn>;
  onApply: ReturnType<typeof vi.fn>;
  onClose: ReturnType<typeof vi.fn>;
  activeFilterCount: number;
}>) {
  const filterState = overrides?.filterState ?? createEmptyFilter();
  return {
    isOpen: true,
    onClose: overrides?.onClose ?? vi.fn(),
    filterState,
    filterOptions: overrides?.filterOptions ?? createMockFilterOptions(),
    onFilterChange: overrides?.onFilterChange ?? vi.fn(),
    onClearAll: overrides?.onClearAll ?? vi.fn(),
    onApply: overrides?.onApply ?? vi.fn(),
    activeFilterCount: overrides?.activeFilterCount ?? getActiveFilterCount(filterState),
  };
}

describe('MobileFilterSheet Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filter State Synchronization', () => {
    it('displays current project filter value from filterState', () => {
      const filterState = {
        ...createEmptyFilter(),
        project_id: 'capture-app',
      };
      const props = createDefaultProps({ filterState });

      render(<MobileFilterSheet {...props} />);

      const projectSelect = screen.getByLabelText('Project') as HTMLSelectElement;
      expect(projectSelect.value).toBe('capture-app');
    });

    it('displays checked types from filterState', () => {
      const filterState = {
        ...createEmptyFilter(),
        types: ['bug', 'enhancement'],
      };
      const props = createDefaultProps({ filterState });

      render(<MobileFilterSheet {...props} />);

      const typesGroup = screen.getByRole('group', { name: 'Type filters' });
      const bugCheckbox = within(typesGroup).getByRole('checkbox', { name: /bug/i });
      const enhancementCheckbox = within(typesGroup).getByRole('checkbox', { name: /enhancement/i });
      const ideaCheckbox = within(typesGroup).getByRole('checkbox', { name: /idea/i });

      expect(bugCheckbox).toBeChecked();
      expect(enhancementCheckbox).toBeChecked();
      expect(ideaCheckbox).not.toBeChecked();
    });

    it('displays checked domains from filterState', () => {
      const filterState = {
        ...createEmptyFilter(),
        domains: ['web', 'mobile'],
      };
      const props = createDefaultProps({ filterState });

      render(<MobileFilterSheet {...props} />);

      const domainsGroup = screen.getByRole('group', { name: 'Domain filters' });
      const webCheckbox = within(domainsGroup).getByRole('checkbox', { name: /web/i });
      const mobileCheckbox = within(domainsGroup).getByRole('checkbox', { name: /mobile/i });
      const apiCheckbox = within(domainsGroup).getByRole('checkbox', { name: /api/i });

      expect(webCheckbox).toBeChecked();
      expect(mobileCheckbox).toBeChecked();
      expect(apiCheckbox).not.toBeChecked();
    });

    it('displays current text search value from filterState', () => {
      const filterState = {
        ...createEmptyFilter(),
        text: 'test search',
      };
      const props = createDefaultProps({ filterState });

      render(<MobileFilterSheet {...props} />);

      const searchInput = screen.getByLabelText('Search text filter') as HTMLInputElement;
      expect(searchInput.value).toBe('test search');
    });
  });

  describe('Filter Change Callbacks', () => {
    it('calls onFilterChange with project_id when project selected', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const projectSelect = screen.getByLabelText('Project');
      fireEvent.change(projectSelect, { target: { value: 'capture-app' } });

      expect(onFilterChange).toHaveBeenCalledWith('project_id', 'capture-app');
    });

    it('calls onFilterChange with undefined when All Projects selected', async () => {
      const filterState = {
        ...createEmptyFilter(),
        project_id: 'capture-app',
      };
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ filterState, onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const projectSelect = screen.getByLabelText('Project');
      fireEvent.change(projectSelect, { target: { value: '__all__' } });

      expect(onFilterChange).toHaveBeenCalledWith('project_id', undefined);
    });

    it('adds type to array when checkbox checked', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const typesGroup = screen.getByRole('group', { name: 'Type filters' });
      const bugCheckbox = within(typesGroup).getByRole('checkbox', { name: /bug/i });

      fireEvent.click(bugCheckbox);

      expect(onFilterChange).toHaveBeenCalledWith('types', ['bug']);
    });

    it('removes type from array when checkbox unchecked', async () => {
      const filterState = {
        ...createEmptyFilter(),
        types: ['bug', 'enhancement'],
      };
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ filterState, onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const typesGroup = screen.getByRole('group', { name: 'Type filters' });
      const bugCheckbox = within(typesGroup).getByRole('checkbox', { name: /bug/i });

      fireEvent.click(bugCheckbox);

      expect(onFilterChange).toHaveBeenCalledWith('types', ['enhancement']);
    });

    it('calls onFilterChange for domain multi-select', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const domainsGroup = screen.getByRole('group', { name: 'Domain filters' });
      const webCheckbox = within(domainsGroup).getByRole('checkbox', { name: /web/i });

      fireEvent.click(webCheckbox);

      expect(onFilterChange).toHaveBeenCalledWith('domains', ['web']);
    });

    it('calls onFilterChange for priority multi-select', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const prioritiesGroup = screen.getByRole('group', { name: 'Priority filters' });
      const highCheckbox = within(prioritiesGroup).getByRole('checkbox', { name: /high/i });

      fireEvent.click(highCheckbox);

      expect(onFilterChange).toHaveBeenCalledWith('priorities', ['high']);
    });

    it('calls onFilterChange for status multi-select', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const statusesGroup = screen.getByRole('group', { name: 'Status filters' });
      const triageCheckbox = within(statusesGroup).getByRole('checkbox', { name: /triage/i });

      fireEvent.click(triageCheckbox);

      expect(onFilterChange).toHaveBeenCalledWith('statuses', ['triage']);
    });

    it('calls onFilterChange for tags multi-select', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const tagsGroup = screen.getByRole('group', { name: 'Tag filters' });
      const uxCheckbox = within(tagsGroup).getByRole('checkbox', { name: /ux/i });

      fireEvent.click(uxCheckbox);

      expect(onFilterChange).toHaveBeenCalledWith('tags', ['ux']);
    });

    it('calls onFilterChange for text search input', async () => {
      const onFilterChange = vi.fn();
      const props = createDefaultProps({ onFilterChange });

      render(<MobileFilterSheet {...props} />);

      const searchInput = screen.getByLabelText('Search text filter');

      // Simulate a direct change event with full value
      fireEvent.change(searchInput, { target: { value: 'test search' } });

      expect(onFilterChange).toHaveBeenCalledWith('text', 'test search');
    });
  });

  describe('Action Buttons', () => {
    it('calls onClearAll when Clear All button clicked', async () => {
      const onClearAll = vi.fn();
      const props = createDefaultProps({ onClearAll });

      render(<MobileFilterSheet {...props} />);

      const clearButton = screen.getByRole('button', { name: 'Clear all filters' });
      fireEvent.click(clearButton);

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });

    it('calls onApply when Apply Filters button clicked', async () => {
      const onApply = vi.fn();
      const props = createDefaultProps({ onApply });

      render(<MobileFilterSheet {...props} />);

      const applyButton = screen.getByRole('button', { name: /apply/i });
      fireEvent.click(applyButton);

      expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('displays active filter count in Apply button badge', () => {
      const filterState = {
        ...createEmptyFilter(),
        project_id: 'capture-app',
        types: ['bug', 'enhancement'],
        text: 'search',
      };
      const props = createDefaultProps({
        filterState,
        activeFilterCount: getActiveFilterCount(filterState), // 4 = 1 project + 2 types + 1 text
      });

      render(<MobileFilterSheet {...props} />);

      const badge = screen.getByText('4');
      expect(badge).toBeInTheDocument();
    });

    it('does not display badge when no active filters', () => {
      const props = createDefaultProps({ activeFilterCount: 0 });

      render(<MobileFilterSheet {...props} />);

      // Apply button should not have a badge
      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton.querySelector('.mobile-filter-sheet__badge')).toBeNull();
    });
  });

  describe('Sheet Visibility', () => {
    it('renders content when isOpen is true', () => {
      const props = createDefaultProps();

      render(<MobileFilterSheet {...props} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('returns null when isOpen is false', () => {
      const props = { ...createDefaultProps(), isOpen: false };

      const { container } = render(<MobileFilterSheet {...props} />);

      expect(container).toBeEmptyDOMElement();
    });

    it('calls onClose when scrim clicked', async () => {
      const onClose = vi.fn();
      const props = createDefaultProps({ onClose });

      render(<MobileFilterSheet {...props} />);

      const scrim = document.querySelector('.mobile-scrim');
      expect(scrim).toBeInTheDocument();
      fireEvent.click(scrim!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog role and aria attributes', () => {
      const props = createDefaultProps();

      render(<MobileFilterSheet {...props} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'filter-sheet-title');
    });

    it('has accessible labels for filter groups', () => {
      const props = createDefaultProps();

      render(<MobileFilterSheet {...props} />);

      expect(screen.getByRole('group', { name: 'Type filters' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Domain filters' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Priority filters' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Status filters' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Tag filters' })).toBeInTheDocument();
    });

    it('apply button has accessible label with filter count', () => {
      const filterState = {
        ...createEmptyFilter(),
        types: ['bug', 'enhancement'],
      };
      const props = createDefaultProps({
        filterState,
        activeFilterCount: 2,
      });

      render(<MobileFilterSheet {...props} />);

      const applyButton = screen.getByRole('button', { name: 'Apply 2 active filters' });
      expect(applyButton).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty message when no types available', () => {
      const filterOptions = {
        ...createMockFilterOptions(),
        types: [],
      };
      const props = createDefaultProps({ filterOptions });

      render(<MobileFilterSheet {...props} />);

      expect(screen.getByText('No types available')).toBeInTheDocument();
    });

    it('shows empty message when no tags available', () => {
      const filterOptions = {
        ...createMockFilterOptions(),
        tags: [],
      };
      const props = createDefaultProps({ filterOptions });

      render(<MobileFilterSheet {...props} />);

      expect(screen.getByText('No tags available')).toBeInTheDocument();
    });
  });
});

describe('getActiveFilterCount', () => {
  it('returns 0 for empty filter', () => {
    const filter = createEmptyFilter();
    expect(getActiveFilterCount(filter)).toBe(0);
  });

  it('counts project_id as 1', () => {
    const filter = {
      ...createEmptyFilter(),
      project_id: 'test-project',
    };
    expect(getActiveFilterCount(filter)).toBe(1);
  });

  it('counts each selected type', () => {
    const filter = {
      ...createEmptyFilter(),
      types: ['bug', 'enhancement', 'idea'],
    };
    expect(getActiveFilterCount(filter)).toBe(3);
  });

  it('counts text search as 1', () => {
    const filter = {
      ...createEmptyFilter(),
      text: 'search term',
    };
    expect(getActiveFilterCount(filter)).toBe(1);
  });

  it('does not count whitespace-only text', () => {
    const filter = {
      ...createEmptyFilter(),
      text: '   ',
    };
    expect(getActiveFilterCount(filter)).toBe(0);
  });

  it('counts all filter types correctly', () => {
    const filter: FilterState = {
      project_id: 'test',
      types: ['bug', 'enhancement'],
      domains: ['web'],
      priorities: ['high', 'critical'],
      statuses: ['triage'],
      tags: ['ux', 'api'],
      text: 'search',
    };
    // 1 project + 2 types + 1 domain + 2 priorities + 1 status + 2 tags + 1 text = 10
    expect(getActiveFilterCount(filter)).toBe(10);
  });
});
