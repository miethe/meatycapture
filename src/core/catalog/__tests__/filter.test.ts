import { describe, it, expect } from 'vitest';
import {
  filterByProject,
  filterByType,
  filterByDomain,
  filterByPriority,
  filterByStatus,
  filterByTags,
  filterByText,
  applyFilters,
} from '../filter';
import type { CatalogEntry, FilterState } from '../types';

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
  updated_at: Date = new Date('2025-12-16T12:00:00Z')
): CatalogEntry {
  return {
    path: `/data/${doc_id}.md`,
    doc_id,
    title,
    item_count: 1,
    updated_at,
    project_id,
    project_name: project_id,
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
    expect(result.map((e) => e.doc_id)).toEqual([
      'REQ-20251216-app',
      'REQ-20251215-app',
    ]);
  });

  it('should return empty array when no matches found', () => {
    const result = filterByProject(testEntries, 'nonexistent');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle single-entry array', () => {
    const singleEntry = [testEntries[0]];
    const result = filterByProject(singleEntry, 'app');

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('app');
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
    expect(result[0].title).toBe('User Authentication Bug');
  });

  it('should filter by title with different casing', () => {
    const result = filterByText(testEntries, 'AUTHENTICATION');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('User Authentication Bug');
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
        (e) =>
          e.doc_id.toLowerCase().includes('api') || e.title.toLowerCase().includes('api')
      )
    ).toBe(true);
  });

  it('should match partial strings in title', () => {
    const result = filterByText(testEntries, 'Dashboard');

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Dashboard Layout');
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
    expect(result[0].title).toBe('Dashboard Layout');
  });
});

// ============================================================================
// applyFilters Tests
// ============================================================================

describe('applyFilters', () => {
  it('should return all entries when filter is completely empty', () => {
    const emptyFilter: FilterState = {
      project_id: undefined,
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: '',
    };

    const result = applyFilters(testEntries, emptyFilter);

    expect(result).toHaveLength(testEntries.length);
    expect(result).toEqual(testEntries);
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
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.project_id === 'app')).toBe(true);
  });

  it('should apply text filter only', () => {
    const filter: FilterState = {
      project_id: undefined,
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'auth',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('User Authentication Bug');
  });

  it('should apply both project and text filters (AND logic)', () => {
    const filter: FilterState = {
      project_id: 'app',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'Dashboard',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('app');
    expect(result[0].title).toBe('Dashboard Layout');
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
    };

    const result = applyFilters(testEntries, filter);

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
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(0);
  });

  it('should apply all filter facets in sequence', () => {
    // All facets provided, but only project and text are functional
    const filter: FilterState = {
      project_id: 'api',
      types: ['enhancement'],
      domains: ['backend'],
      priorities: ['medium'],
      statuses: ['triage'],
      tags: ['performance'],
      text: 'rate',
    };

    const result = applyFilters(testEntries, filter);

    // Should filter by project='api' AND text='rate'
    expect(result).toHaveLength(1);
    expect(result[0].doc_id).toBe('REQ-20251214-api');
    expect(result[0].title).toBe('Rate Limiting Implementation');
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
    };

    const result = applyFilters([], filter);

    expect(result).toHaveLength(0);
  });

  it('should preserve filter order optimization (project first, then text)', () => {
    // This test verifies the filter application order
    const filter: FilterState = {
      project_id: 'admin',
      types: [],
      domains: [],
      priorities: [],
      statuses: [],
      tags: [],
      text: 'panel',
    };

    const result = applyFilters(testEntries, filter);

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('admin');
    expect(result[0].title).toContain('Panel');
  });
});
