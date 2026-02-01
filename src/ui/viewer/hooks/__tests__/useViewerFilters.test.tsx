/**
 * useViewerFilters Hook Tests
 *
 * Tests for the viewer filters hook that manages filter state
 * for the Request Log Viewer. Covers state management, active count
 * calculation, and sessionStorage persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewerFilters } from '../useViewerFilters';
import type { FilterState, FilterOptions } from '@core/catalog';
import { createEmptyFilter, createEmptyFilterOptions } from '@core/catalog';

/**
 * Mock sessionStorage implementation
 */
function createMockSessionStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
}

describe('useViewerFilters', () => {
  let mockSessionStorage: Storage;
  let originalSessionStorage: Storage;

  beforeEach(() => {
    // Setup mock sessionStorage
    originalSessionStorage = window.sessionStorage;
    mockSessionStorage = createMockSessionStorage();
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns empty filter state by default', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState).toEqual(createEmptyFilter());
    });

    it('returns empty filter options by default', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterOptions).toEqual(createEmptyFilterOptions());
    });

    it('returns zero activeCount for empty filters', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.activeCount).toBe(0);
    });

    it('restores filter state from sessionStorage', () => {
      const savedState: FilterState = {
        project_id: 'test-project',
        types: ['bug'],
        domains: ['api'],
        subdomains: [],
        features: [],
        priorities: [],
        statuses: [],
        tags: [],
        text: '',
        archiveStatus: 'active',
      };
      mockSessionStorage.setItem('meatycapture-viewer-filters', JSON.stringify(savedState));

      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState.project_id).toBe('test-project');
      expect(result.current.filterState.types).toEqual(['bug']);
      expect(result.current.filterState.domains).toEqual(['api']);
    });

    it('uses empty filter if sessionStorage contains invalid data', () => {
      mockSessionStorage.setItem('meatycapture-viewer-filters', '{"invalid": "data"}');

      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState).toEqual(createEmptyFilter());
    });

    it('uses empty filter if sessionStorage contains malformed JSON', () => {
      mockSessionStorage.setItem('meatycapture-viewer-filters', 'not json');

      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState).toEqual(createEmptyFilter());
    });
  });

  describe('setFilter', () => {
    it('updates project_id filter', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('project_id', 'my-project');
      });

      expect(result.current.filterState.project_id).toBe('my-project');
    });

    it('updates types filter array', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('types', ['bug', 'enhancement']);
      });

      expect(result.current.filterState.types).toEqual(['bug', 'enhancement']);
    });

    it('updates domains filter array', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('domains', ['api', 'web']);
      });

      expect(result.current.filterState.domains).toEqual(['api', 'web']);
    });

    it('updates priorities filter array', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('priorities', ['high', 'critical']);
      });

      expect(result.current.filterState.priorities).toEqual(['high', 'critical']);
    });

    it('updates statuses filter array', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('statuses', ['open', 'in-progress']);
      });

      expect(result.current.filterState.statuses).toEqual(['open', 'in-progress']);
    });

    it('updates tags filter array', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('tags', ['ux', 'api']);
      });

      expect(result.current.filterState.tags).toEqual(['ux', 'api']);
    });

    it('updates text filter', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('text', 'search query');
      });

      expect(result.current.filterState.text).toBe('search query');
    });

    it('updates archiveStatus filter', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('archiveStatus', 'archived');
      });

      expect(result.current.filterState.archiveStatus).toBe('archived');
    });

    it('preserves other filters when updating one', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('types', ['bug']);
      });

      act(() => {
        result.current.setFilter('domains', ['api']);
      });

      expect(result.current.filterState.types).toEqual(['bug']);
      expect(result.current.filterState.domains).toEqual(['api']);
    });

    it('can clear project_id by setting undefined', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('project_id', 'test');
      });

      expect(result.current.filterState.project_id).toBe('test');

      act(() => {
        result.current.setFilter('project_id', undefined);
      });

      expect(result.current.filterState.project_id).toBeUndefined();
    });

    it('persists filter state to sessionStorage', async () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('types', ['bug']);
      });

      // Wait for effect to run
      await vi.waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalled();
      });

      const stored = mockSessionStorage.getItem('meatycapture-viewer-filters');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.types).toEqual(['bug']);
    });
  });

  describe('clearAll', () => {
    it('resets all filters to empty state', () => {
      const { result } = renderHook(() => useViewerFilters());

      // Set multiple filters
      act(() => {
        result.current.setFilter('project_id', 'test');
        result.current.setFilter('types', ['bug']);
        result.current.setFilter('domains', ['api']);
        result.current.setFilter('text', 'search');
        result.current.setFilter('archiveStatus', 'archived');
      });

      expect(result.current.activeCount).toBeGreaterThan(0);

      // Clear all
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.filterState).toEqual(createEmptyFilter());
      expect(result.current.activeCount).toBe(0);
    });

    it('clears project_id', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('project_id', 'test');
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.filterState.project_id).toBeUndefined();
    });

    it('resets archiveStatus to active', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('archiveStatus', 'archived');
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.filterState.archiveStatus).toBe('active');
    });
  });

  describe('activeCount', () => {
    it('counts project_id as 1 when defined', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('project_id', 'test');
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts types array as 1 when non-empty', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('types', ['bug', 'enhancement', 'idea']);
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts domains array as 1 when non-empty', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('domains', ['api']);
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts priorities array as 1 when non-empty', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('priorities', ['high']);
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts statuses array as 1 when non-empty', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('statuses', ['open']);
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts tags array as 1 when non-empty', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('tags', ['ux', 'api']);
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts text as 1 when non-empty', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('text', 'search');
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('counts archiveStatus as 1 when not "active"', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('archiveStatus', 'archived');
      });

      expect(result.current.activeCount).toBe(1);
    });

    it('does not count archiveStatus when "active" (default)', () => {
      const { result } = renderHook(() => useViewerFilters());

      // Default archiveStatus is 'active'
      expect(result.current.activeCount).toBe(0);
    });

    it('does not count whitespace-only text', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('text', '   ');
      });

      expect(result.current.activeCount).toBe(0);
    });

    it('accumulates counts for multiple active filters', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('project_id', 'test');
        result.current.setFilter('types', ['bug']);
        result.current.setFilter('domains', ['api']);
        result.current.setFilter('text', 'search');
      });

      expect(result.current.activeCount).toBe(4);
    });

    it('returns maximum 8 when all filters are active', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('project_id', 'test');
        result.current.setFilter('types', ['bug']);
        result.current.setFilter('domains', ['api']);
        result.current.setFilter('priorities', ['high']);
        result.current.setFilter('statuses', ['open']);
        result.current.setFilter('tags', ['ux']);
        result.current.setFilter('text', 'search');
        result.current.setFilter('archiveStatus', 'archived');
      });

      expect(result.current.activeCount).toBe(8);
    });

    it('does not count empty arrays', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('types', []);
      });

      expect(result.current.activeCount).toBe(0);
    });
  });

  describe('filterOptions', () => {
    it('returns empty options by default', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterOptions.projects).toEqual([]);
      expect(result.current.filterOptions.types).toEqual([]);
      expect(result.current.filterOptions.domains).toEqual([]);
      expect(result.current.filterOptions.priorities).toEqual([]);
      expect(result.current.filterOptions.statuses).toEqual([]);
      expect(result.current.filterOptions.tags).toEqual([]);
    });

    it('updates options via setFilterOptions', () => {
      const { result } = renderHook(() => useViewerFilters());

      const newOptions: FilterOptions = {
        projects: [{ id: 'proj-1', name: 'Project One' }],
        types: ['bug', 'enhancement'],
        domains: ['api', 'web'],
        subdomains: ['auth', 'ui'],
        features: ['login', 'dashboard'],
        priorities: ['high', 'medium', 'low'],
        statuses: ['open', 'closed'],
        tags: ['ux', 'performance'],
      };

      act(() => {
        result.current.setFilterOptions(newOptions);
      });

      expect(result.current.filterOptions).toEqual(newOptions);
    });

    it('allows replacing options', () => {
      const { result } = renderHook(() => useViewerFilters());

      const firstOptions: FilterOptions = {
        projects: [{ id: 'a', name: 'A' }],
        types: ['bug'],
        domains: [],
        subdomains: [],
        features: [],
        priorities: [],
        statuses: [],
        tags: [],
      };

      const secondOptions: FilterOptions = {
        projects: [{ id: 'b', name: 'B' }],
        types: ['enhancement'],
        domains: ['api'],
        subdomains: [],
        features: [],
        priorities: ['high'],
        statuses: [],
        tags: [],
      };

      act(() => {
        result.current.setFilterOptions(firstOptions);
      });

      expect(result.current.filterOptions.projects[0]?.id).toBe('a');

      act(() => {
        result.current.setFilterOptions(secondOptions);
      });

      expect(result.current.filterOptions.projects[0]?.id).toBe('b');
      expect(result.current.filterOptions.types).toEqual(['enhancement']);
    });
  });

  describe('callback stability', () => {
    it('setFilter has stable reference', () => {
      const { result, rerender } = renderHook(() => useViewerFilters());

      const firstSetFilter = result.current.setFilter;
      rerender();
      const secondSetFilter = result.current.setFilter;

      expect(firstSetFilter).toBe(secondSetFilter);
    });

    it('clearAll has stable reference', () => {
      const { result, rerender } = renderHook(() => useViewerFilters());

      const firstClearAll = result.current.clearAll;
      rerender();
      const secondClearAll = result.current.clearAll;

      expect(firstClearAll).toBe(secondClearAll);
    });

    it('setFilterOptions has stable reference', () => {
      const { result, rerender } = renderHook(() => useViewerFilters());

      const firstSetFilterOptions = result.current.setFilterOptions;
      rerender();
      const secondSetFilterOptions = result.current.setFilterOptions;

      expect(firstSetFilterOptions).toBe(secondSetFilterOptions);
    });
  });

  describe('immutability', () => {
    it('returns new filterState object on update', () => {
      const { result } = renderHook(() => useViewerFilters());

      const firstState = result.current.filterState;

      act(() => {
        result.current.setFilter('types', ['bug']);
      });

      const secondState = result.current.filterState;

      expect(firstState).not.toBe(secondState);
    });

    it('does not mutate original filterState', () => {
      const { result } = renderHook(() => useViewerFilters());

      act(() => {
        result.current.setFilter('types', ['bug']);
      });

      const stateAfterSet = result.current.filterState;
      const originalTypes = [...stateAfterSet.types];

      act(() => {
        result.current.setFilter('types', ['enhancement']);
      });

      expect(originalTypes).toEqual(['bug']);
    });
  });

  describe('sessionStorage unavailable', () => {
    it('works when sessionStorage is undefined', () => {
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState).toEqual(createEmptyFilter());

      act(() => {
        result.current.setFilter('types', ['bug']);
      });

      expect(result.current.filterState.types).toEqual(['bug']);
    });

    it('works when sessionStorage throws', () => {
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error('Storage error');
        }),
        setItem: vi.fn(() => {
          throw new Error('Storage error');
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(window, 'sessionStorage', {
        value: throwingStorage,
        writable: true,
      });

      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState).toEqual(createEmptyFilter());

      // Should not throw
      act(() => {
        result.current.setFilter('types', ['bug']);
      });

      expect(result.current.filterState.types).toEqual(['bug']);
    });
  });

  describe('return type', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current).toHaveProperty('filterState');
      expect(result.current).toHaveProperty('setFilter');
      expect(result.current).toHaveProperty('clearAll');
      expect(result.current).toHaveProperty('activeCount');
      expect(result.current).toHaveProperty('filterOptions');
      expect(result.current).toHaveProperty('setFilterOptions');
    });

    it('filterState is a FilterState object', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterState).toHaveProperty('types');
      expect(result.current.filterState).toHaveProperty('domains');
      expect(result.current.filterState).toHaveProperty('priorities');
      expect(result.current.filterState).toHaveProperty('statuses');
      expect(result.current.filterState).toHaveProperty('tags');
      expect(result.current.filterState).toHaveProperty('text');
      expect(result.current.filterState).toHaveProperty('archiveStatus');
    });

    it('setFilter is a function', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(typeof result.current.setFilter).toBe('function');
    });

    it('clearAll is a function', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(typeof result.current.clearAll).toBe('function');
    });

    it('activeCount is a number', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(typeof result.current.activeCount).toBe('number');
    });

    it('filterOptions is a FilterOptions object', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(result.current.filterOptions).toHaveProperty('projects');
      expect(result.current.filterOptions).toHaveProperty('types');
      expect(result.current.filterOptions).toHaveProperty('domains');
      expect(result.current.filterOptions).toHaveProperty('priorities');
      expect(result.current.filterOptions).toHaveProperty('statuses');
      expect(result.current.filterOptions).toHaveProperty('tags');
    });

    it('setFilterOptions is a function', () => {
      const { result } = renderHook(() => useViewerFilters());

      expect(typeof result.current.setFilterOptions).toBe('function');
    });
  });
});
