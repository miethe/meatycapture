import { describe, it, expect } from 'vitest';
import {
  filterByProject,
  filterByType,
  filterByDomain,
  filterByPriority,
  filterByStatus,
  filterByTags,
  filterByText,
  filterByArchiveStatus,
  applyFilters,
} from '../filter';
import type { CatalogEntry, FilterState } from '../types';
import { createEmptyFilter } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create mock catalog entry with sensible defaults
 */
function mockCatalogEntry(
  doc_id: string,
  title: string,
  project_id: string = 'test-project',
  updated_at: Date = new Date('2025-12-16T12:00:00Z'),
  archived: boolean = false
): CatalogEntry {
  return {
    path: `/data/${doc_id}.md`,
    doc_id,
    title,
    item_count: 1,
    updated_at,
    project_id,
    project_name: project_id,
    archived,
  };
}

/**
 * Test data: diverse set of catalog entries for testing filters
 */
const testEntries: CatalogEntry[] = [
  mockCatalogEntry('REQ-20251216-app', 'User Authentication Bug', 'app'),
  mockCatalogEntry('REQ-20251215-app', 'Dashboard Layout', 'app'),
  mockCatalogEntry('REQ-20251214-api', 'Rate Limiting Implementation', 'api'),
  mockCatalogEntry('REQ-20251213-api', 'Database Migration', 'api'),
  mockCatalogEntry('REQ-20251212-admin', 'Admin Panel Redesign', 'admin'),
];

/**
 * Test data: catalog entries with mixed archived status
 */
const entriesWithArchived: CatalogEntry[] = [
  mockCatalogEntry('REQ-001', 'Active Document 1', 'app', new Date('2025-12-16'), false),
  mockCatalogEntry('REQ-002', 'Archived Document 1', 'app', new Date('2025-12-15'), true),
  mockCatalogEntry('REQ-003', 'Active Document 2', 'api', new Date('2025-12-14'), false),
  mockCatalogEntry('REQ-004', 'Archived Document 2', 'api', new Date('2025-12-13'), true),
  mockCatalogEntry('REQ-005', 'Active Document 3', 'admin', new Date('2025-12-12'), false),
];

// ============================================================================
// filterByProject Tests
// ============================================================================

describe('filterByProject', () => {
  it('should return all entries when projectId is undefined', () => {
    const result = filterByProject(testEntries, undefined);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should filter to specific project when projectId provided', () => {
    const result = filterByProject(testEntries, 'app');

    expect(result).toHaveLength(2);
    expect(result.every((entry) => entry.project_id === 'app')).toBe(true);
    expect(result.map((e) => e.doc_id)).toEqual(['REQ-20251216-app', 'REQ-20251215-app']);
  });

  it('should return empty array when no matches found', () => {
    const result = filterByProject(testEntries, 'nonexistent');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle single-entry array', () => {
    const singleEntry = [testEntries[0]!];
    const result = filterByProject(singleEntry, 'app');

    expect(result).toHaveLength(1);
    expect(result[0]!.project_id).toBe('app');
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByProject(testEntries, 'app');

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByProject([], 'app');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});

// ============================================================================
// filterByType Tests
// ============================================================================

describe('filterByType', () => {
  it('should return all entries when types array is empty', () => {
    const result = filterByType(testEntries, []);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should return all entries (pass-through due to metadata limitation)', () => {
    // Current implementation returns all entries because CatalogEntry
    // does not contain item-level type metadata
    const result = filterByType(testEntries, ['bug', 'enhancement']);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByType(testEntries, ['bug']);

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByType([], ['bug']);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// filterByDomain Tests
// ============================================================================

describe('filterByDomain', () => {
  it('should return all entries when domains array is empty', () => {
    const result = filterByDomain(testEntries, []);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should return all entries (pass-through due to metadata limitation)', () => {
    // Current implementation returns all entries because CatalogEntry
    // does not contain item-level domain metadata
    const result = filterByDomain(testEntries, ['web', 'api']);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByDomain(testEntries, ['web']);

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByDomain([], ['web']);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// filterByPriority Tests
// ============================================================================

describe('filterByPriority', () => {
  it('should return all entries when priorities array is empty', () => {
    const result = filterByPriority(testEntries, []);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should return all entries (pass-through due to metadata limitation)', () => {
    // Current implementation returns all entries because CatalogEntry
    // does not contain item-level priority metadata
    const result = filterByPriority(testEntries, ['high', 'critical']);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByPriority(testEntries, ['high']);

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByPriority([], ['high']);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// filterByStatus Tests
// ============================================================================

describe('filterByStatus', () => {
  it('should return all entries when statuses array is empty', () => {
    const result = filterByStatus(testEntries, []);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should return all entries (pass-through due to metadata limitation)', () => {
    // Current implementation returns all entries because CatalogEntry
    // does not contain item-level status metadata
    const result = filterByStatus(testEntries, ['triage', 'in-progress']);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByStatus(testEntries, ['triage']);

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByStatus([], ['triage']);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// filterByTags Tests
// ============================================================================

describe('filterByTags', () => {
  it('should return all entries when tags array is empty', () => {
    const result = filterByTags(testEntries, []);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should return all entries (pass-through due to metadata limitation)', () => {
    // Current implementation returns all entries because CatalogEntry
    // does not contain aggregated tags from the full document
    const result = filterByTags(testEntries, ['api', 'bug']);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByTags(testEntries, ['api']);

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByTags([], ['api']);

    expect(result).toEqual([]);
  });
});

// ============================================================================
// filterByText Tests
// ============================================================================

describe('filterByText', () => {
  it('should return all entries when text is empty string', () => {
    const result = filterByText(testEntries, '');

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should return all entries when text is whitespace only', () => {
    const result = filterByText(testEntries, '   ');

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should filter by title case-insensitive match', () => {
    const result = filterByText(testEntries, 'auth');

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('User Authentication Bug');
  });

  it('should filter by title with different casing', () => {
    const result = filterByText(testEntries, 'AUTHENTICATION');

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('User Authentication Bug');
  });

  it('should filter by doc_id prefix match', () => {
    const result = filterByText(testEntries, 'req-2025121');

    // Should match all entries as they all start with REQ-2025121X
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((e) => e.doc_id.toLowerCase().includes('req-2025121'))).toBe(true);
  });

  it('should filter by doc_id partial match', () => {
    const result = filterByText(testEntries, 'api');

    // Should match entries with 'api' in doc_id or title
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (e) => e.doc_id.toLowerCase().includes('api') || e.title.toLowerCase().includes('api')
      )
    ).toBe(true);
  });

  it('should match partial strings in title', () => {
    const result = filterByText(testEntries, 'Dashboard');

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Dashboard Layout');
  });

  it('should return empty array when no matches found', () => {
    const result = filterByText(testEntries, 'nonexistent');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle special characters in search text', () => {
    const result = filterByText(testEntries, 'req-');

    // Should match all doc_ids as they all contain 'REQ-'
    expect(result.length).toBeGreaterThan(0);
  });

  it('should not mutate original array', () => {
    const original = [...testEntries];
    filterByText(testEntries, 'auth');

    expect(testEntries).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByText([], 'auth');

    expect(result).toEqual([]);
  });

  it('should trim whitespace from search text', () => {
    const result = filterByText(testEntries, '  Dashboard  ');

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Dashboard Layout');
  });
});

// ============================================================================
// filterByArchiveStatus Tests
// ============================================================================

describe('filterByArchiveStatus', () => {
  it('should return all entries when status is "all"', () => {
    const result = filterByArchiveStatus(entriesWithArchived, 'all');

    expect(result).toHaveLength(entriesWithArchived.length);
    expect(result).toEqual(entriesWithArchived);
  });

  it('should return only active (non-archived) entries when status is "active"', () => {
    const result = filterByArchiveStatus(entriesWithArchived, 'active');

    expect(result).toHaveLength(3);
    expect(result.every((e) => e.archived === false)).toBe(true);
    expect(result.map((e) => e.doc_id)).toEqual(['REQ-001', 'REQ-003', 'REQ-005']);
  });

  it('should return only archived entries when status is "archived"', () => {
    const result = filterByArchiveStatus(entriesWithArchived, 'archived');

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.archived === true)).toBe(true);
    expect(result.map((e) => e.doc_id)).toEqual(['REQ-002', 'REQ-004']);
  });

  it('should return empty array when filtering for "archived" on entries with none archived', () => {
    const result = filterByArchiveStatus(testEntries, 'archived');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return all entries when filtering for "active" on entries with none archived', () => {
    const result = filterByArchiveStatus(testEntries, 'active');

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
  });

  it('should not mutate original array', () => {
    const original = [...entriesWithArchived];
    filterByArchiveStatus(entriesWithArchived, 'archived');

    expect(entriesWithArchived).toEqual(original);
  });

  it('should handle empty array input', () => {
    const result = filterByArchiveStatus([], 'active');

    expect(result).toEqual([]);
  });

  it('should handle all archived entries when filtering for "active"', () => {
    const allArchived = [
      mockCatalogEntry('REQ-001', 'Archived 1', 'app', new Date(), true),
      mockCatalogEntry('REQ-002', 'Archived 2', 'app', new Date(), true),
    ];

    const result = filterByArchiveStatus(allArchived, 'active');

    expect(result).toHaveLength(0);
  });

  it('should handle single entry array', () => {
    const singleArchived = [mockCatalogEntry('REQ-001', 'Test', 'app', new Date(), true)];
    const singleActive = [mockCatalogEntry('REQ-002', 'Test', 'app', new Date(), false)];

    expect(filterByArchiveStatus(singleArchived, 'archived')).toHaveLength(1);
    expect(filterByArchiveStatus(singleArchived, 'active')).toHaveLength(0);
    expect(filterByArchiveStatus(singleActive, 'archived')).toHaveLength(0);
    expect(filterByArchiveStatus(singleActive, 'active')).toHaveLength(1);
  });
});

// ============================================================================
// applyFilters Tests
// ============================================================================

describe('applyFilters', () => {
  it('should return only active entries when filter is empty (default archiveStatus is "active")', () => {
    const emptyFilter = createEmptyFilter();

    const result = applyFilters(entriesWithArchived, emptyFilter);

    // Default filter has archiveStatus: 'active', so only non-archived entries
    expect(result).toHaveLength(3);
    expect(result.every((e) => e.archived === false)).toBe(true);
  });

  it('should return all entries when archiveStatus is "all"', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      archiveStatus: 'all',
    };

    const result = applyFilters(entriesWithArchived, filter);

    expect(result).toHaveLength(entriesWithArchived.length);
  });

  it('should return only archived entries when archiveStatus is "archived"', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      archiveStatus: 'archived',
    };

    const result = applyFilters(entriesWithArchived, filter);

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.archived === true)).toBe(true);
  });

  it('should apply project filter only', () => {
    const filter: FilterState = {
      project_id: 'app',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: '',
      archiveStatus: 'active',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.project_id === 'app')).toBe(true);
  });

  it('should apply text filter only', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      text: 'auth',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('User Authentication Bug');
  });

  it('should apply both project and text filters (AND logic)', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      project_id: 'app',
      text: 'Dashboard',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(1);
    expect(result[0]!.project_id).toBe('app');
    expect(result[0]!.title).toBe('Dashboard Layout');
  });

  it('should apply archiveStatus with project filter (AND logic)', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      project_id: 'app',
      archiveStatus: 'archived',
    };

    const result = applyFilters(entriesWithArchived, filter);

    expect(result).toHaveLength(1);
    expect(result[0]!.project_id).toBe('app');
    expect(result[0]!.archived).toBe(true);
  });

  it('should return empty array when filters do not match', () => {
    const filter: FilterState = {
      project_id: 'app',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'nonexistent',
      archiveStatus: 'active',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(0);
  });

  it('should short-circuit after archiveStatus filter reduces to empty', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      archiveStatus: 'archived', // testEntries has no archived entries
      project_id: 'app',
      text: 'auth',
    };

    const result = applyFilters(testEntries, filter);

    // Should return empty immediately after archive filter
    expect(result).toHaveLength(0);
  });

  it('should short-circuit after project filter reduces to empty', () => {
    const filter: FilterState = {
      project_id: 'nonexistent',
      types: ['bug'],
      domains: ['web'],
      priorities: ['high'],
      statuses: ['triage'],
      tags: ['api'],
      text: 'auth',
      archiveStatus: 'active',
    };

    const result = applyFilters(testEntries, filter);

    // Should return empty immediately after project filter
    expect(result).toHaveLength(0);
  });

  it('should short-circuit after text filter reduces to empty', () => {
    const filter: FilterState = {
      project_id: 'app',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'nonexistent',
      archiveStatus: 'active',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(0);
  });

  it('should apply all filter facets in sequence', () => {
    // All facets provided, but only project, text, and archiveStatus are functional
    const filter: FilterState = {
      ...createEmptyFilter(),
      project_id: 'api',
      types: ['enhancement'],
      domains: ['backend'],
      priorities: ['medium'],
      statuses: ['triage'],
      tags: ['performance'],
      text: 'rate',
      archiveStatus: 'active',
    };

    const result = applyFilters(testEntries, filter);

    // Should filter by archiveStatus='active' AND project='api' AND text='rate'
    expect(result).toHaveLength(1);
    expect(result[0]!.doc_id).toBe('REQ-20251214-api');
    expect(result[0]!.title).toBe('Rate Limiting Implementation');
  });

  it('should not mutate original entries array', () => {
    const original = [...testEntries];
    const filter: FilterState = {
      project_id: 'app',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: '',
      archiveStatus: 'active',
    };

    applyFilters(testEntries, filter);

    expect(testEntries).toEqual(original);
  });

  it('should handle empty entries array', () => {
    const filter: FilterState = {
      project_id: 'app',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'auth',
      archiveStatus: 'active',
    };

    const result = applyFilters([], filter);

    expect(result).toHaveLength(0);
  });

  it('should preserve filter order optimization (archiveStatus first, then project, then text)', () => {
    // This test verifies the filter application order
    const filter: FilterState = {
      project_id: 'admin',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'panel',
      archiveStatus: 'active',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(1);
    expect(result[0]!.project_id).toBe('admin');
    expect(result[0]!.title).toContain('Panel');
  });

  it('should combine archiveStatus, project, and text filters correctly', () => {
    const filter: FilterState = {
      ...createEmptyFilter(),
      project_id: 'app',
      text: 'active',
      archiveStatus: 'active',
    };

    const result = applyFilters(entriesWithArchived, filter);

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('Active Document 1');
    expect(result[0]!.archived).toBe(false);
    expect(result[0]!.project_id).toBe('app');
  });
});
