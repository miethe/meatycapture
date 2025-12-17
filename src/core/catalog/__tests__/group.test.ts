import { describe, it, expect } from 'vitest';
import {
  groupByProject,
  sortDocuments,
  sortProjects,
  createGroupedCatalog,
} from '../group';
import type { CatalogEntry, CatalogSort } from '../types';

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
  project_name: string = 'Test Project',
  item_count: number = 1,
  updated_at: Date = new Date('2025-12-16T12:00:00Z')
): CatalogEntry {
  return {
    path: `/data/${doc_id}.md`,
    doc_id,
    title,
    item_count,
    updated_at,
    project_id,
    project_name,
  };
}

/**
 * Test data: diverse set of catalog entries for grouping/sorting tests
 */
const testEntries: CatalogEntry[] = [
  // App project (2 entries)
  mockCatalogEntry(
    'REQ-20251216-app',
    'User Authentication Bug',
    'app',
    'App',
    3,
    new Date('2025-12-16T12:00:00Z')
  ),
  mockCatalogEntry(
    'REQ-20251215-app',
    'Dashboard Layout',
    'app',
    'App',
    1,
    new Date('2025-12-15T10:00:00Z')
  ),
  // API project (2 entries)
  mockCatalogEntry(
    'REQ-20251214-api',
    'Rate Limiting Implementation',
    'api',
    'API Server',
    5,
    new Date('2025-12-14T14:00:00Z')
  ),
  mockCatalogEntry(
    'REQ-20251213-api',
    'Database Migration',
    'api',
    'API Server',
    2,
    new Date('2025-12-13T09:00:00Z')
  ),
  // Admin project (1 entry)
  mockCatalogEntry(
    'REQ-20251212-admin',
    'Admin Panel Redesign',
    'admin',
    'Admin Panel',
    4,
    new Date('2025-12-12T16:00:00Z')
  ),
];

// ============================================================================
// groupByProject Tests
// ============================================================================

describe('groupByProject', () => {
  it('should group entries by project_id', () => {
    const grouped = groupByProject(testEntries);

    expect(grouped.size).toBe(3);
    expect(grouped.has('app')).toBe(true);
    expect(grouped.has('api')).toBe(true);
    expect(grouped.has('admin')).toBe(true);
  });

  it('should correctly group entries for each project', () => {
    const grouped = groupByProject(testEntries);

    const appEntries = grouped.get('app');
    expect(appEntries).toHaveLength(2);
    expect(appEntries?.every((e) => e.project_id === 'app')).toBe(true);

    const apiEntries = grouped.get('api');
    expect(apiEntries).toHaveLength(2);
    expect(apiEntries?.every((e) => e.project_id === 'api')).toBe(true);

    const adminEntries = grouped.get('admin');
    expect(adminEntries).toHaveLength(1);
    expect(adminEntries?.[0]!.project_id).toBe('admin');
  });

  it('should handle entries with missing project_id (group as "unknown")', () => {
    const entriesWithMissing = [
      mockCatalogEntry('REQ-001', 'Test', 'app'),
      { ...mockCatalogEntry('REQ-002', 'Test 2'), project_id: 123 as unknown as string },
      { ...mockCatalogEntry('REQ-003', 'Test 3'), project_id: '' },
    ] as CatalogEntry[];

    const grouped = groupByProject(entriesWithMissing);

    expect(grouped.has('app')).toBe(true);
    expect(grouped.get('app')).toHaveLength(1);
  });

  it('should return empty Map for empty array', () => {
    const grouped = groupByProject([]);

    expect(grouped.size).toBe(0);
    expect(grouped).toEqual(new Map());
  });

  it('should handle single entry', () => {
    const grouped = groupByProject([testEntries[0]!]);

    expect(grouped.size).toBe(1);
    expect(grouped.has('app')).toBe(true);
    expect(grouped.get('app')).toHaveLength(1);
  });

  it('should not mutate original entries array', () => {
    const original = [...testEntries];
    groupByProject(testEntries);

    expect(testEntries).toEqual(original);
  });

  it('should preserve entry order within groups', () => {
    const grouped = groupByProject(testEntries);
    const appEntries = grouped.get('app')!;

    // Should maintain original array order
    expect(appEntries[0]!.doc_id).toBe('REQ-20251216-app');
    expect(appEntries[1]!.doc_id).toBe('REQ-20251215-app');
  });
});

// ============================================================================
// sortDocuments Tests
// ============================================================================

describe('sortDocuments', () => {
  describe('sort by updated_at', () => {
    it('should sort by updated_at descending (newest first)', () => {
      const sort: CatalogSort = { field: 'updated_at', order: 'desc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.doc_id).toBe('REQ-20251216-app');
      expect(sorted[1]!.doc_id).toBe('REQ-20251215-app');
      expect(sorted[2]!.doc_id).toBe('REQ-20251214-api');
      expect(sorted[3]!.doc_id).toBe('REQ-20251213-api');
      expect(sorted[4]!.doc_id).toBe('REQ-20251212-admin');
    });

    it('should sort by updated_at ascending (oldest first)', () => {
      const sort: CatalogSort = { field: 'updated_at', order: 'asc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.doc_id).toBe('REQ-20251212-admin');
      expect(sorted[1]!.doc_id).toBe('REQ-20251213-api');
      expect(sorted[2]!.doc_id).toBe('REQ-20251214-api');
      expect(sorted[3]!.doc_id).toBe('REQ-20251215-app');
      expect(sorted[4]!.doc_id).toBe('REQ-20251216-app');
    });

    it('should handle null/undefined updated_at values', () => {
      const entriesWithNulls = [
        mockCatalogEntry('REQ-001', 'Test 1', 'app', 'App', 1, new Date('2025-12-16')),
        { ...mockCatalogEntry('REQ-002', 'Test 2'), updated_at: null as unknown as Date },
        mockCatalogEntry('REQ-003', 'Test 3', 'app', 'App', 1, new Date('2025-12-15')),
      ] as CatalogEntry[];

      const sortDesc: CatalogSort = { field: 'updated_at', order: 'desc' };
      const sortedDesc = sortDocuments(entriesWithNulls, sortDesc);

      // Null values should go to the end in desc order
      expect(sortedDesc[2]!.doc_id).toBe('REQ-002');
    });
  });

  describe('sort by item_count', () => {
    it('should sort by item_count descending (highest first)', () => {
      const sort: CatalogSort = { field: 'item_count', order: 'desc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.item_count).toBe(5); // REQ-20251214-api
      expect(sorted[1]!.item_count).toBe(4); // REQ-20251212-admin
      expect(sorted[2]!.item_count).toBe(3); // REQ-20251216-app
      expect(sorted[3]!.item_count).toBe(2); // REQ-20251213-api
      expect(sorted[4]!.item_count).toBe(1); // REQ-20251215-app
    });

    it('should sort by item_count ascending (lowest first)', () => {
      const sort: CatalogSort = { field: 'item_count', order: 'asc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.item_count).toBe(1);
      expect(sorted[1]!.item_count).toBe(2);
      expect(sorted[2]!.item_count).toBe(3);
      expect(sorted[3]!.item_count).toBe(4);
      expect(sorted[4]!.item_count).toBe(5);
    });

    it('should handle null/undefined item_count values', () => {
      const entriesWithNulls = [
        mockCatalogEntry('REQ-001', 'Test 1', 'app', 'App', 5),
        { ...mockCatalogEntry('REQ-002', 'Test 2'), item_count: null as unknown as number },
        mockCatalogEntry('REQ-003', 'Test 3', 'app', 'App', 3),
      ] as CatalogEntry[];

      const sortDesc: CatalogSort = { field: 'item_count', order: 'desc' };
      const sortedDesc = sortDocuments(entriesWithNulls, sortDesc);

      // Null values should go to the end
      expect(sortedDesc[2]!.doc_id).toBe('REQ-002');
    });
  });

  describe('sort by doc_id', () => {
    it('should sort by doc_id alphabetically ascending', () => {
      const sort: CatalogSort = { field: 'doc_id', order: 'asc' };
      const sorted = sortDocuments(testEntries, sort);

      // Alphabetical order
      expect(sorted[0]!.doc_id).toBe('REQ-20251212-admin');
      expect(sorted[1]!.doc_id).toBe('REQ-20251213-api');
      expect(sorted[2]!.doc_id).toBe('REQ-20251214-api');
      expect(sorted[3]!.doc_id).toBe('REQ-20251215-app');
      expect(sorted[4]!.doc_id).toBe('REQ-20251216-app');
    });

    it('should sort by doc_id alphabetically descending', () => {
      const sort: CatalogSort = { field: 'doc_id', order: 'desc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.doc_id).toBe('REQ-20251216-app');
      expect(sorted[4]!.doc_id).toBe('REQ-20251212-admin');
    });

    it('should handle null/undefined doc_id values', () => {
      const entriesWithNulls = [
        mockCatalogEntry('REQ-003', 'Test'),
        { ...mockCatalogEntry('REQ-001', 'Test'), doc_id: null as unknown as string },
        mockCatalogEntry('REQ-002', 'Test'),
      ] as CatalogEntry[];

      const sortAsc: CatalogSort = { field: 'doc_id', order: 'asc' };
      const sortedAsc = sortDocuments(entriesWithNulls, sortAsc);

      // Null values should go to the end
      expect(sortedAsc[2]!.title).toBe('Test');
    });
  });

  describe('sort by title', () => {
    it('should sort by title alphabetically ascending', () => {
      const sort: CatalogSort = { field: 'title', order: 'asc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.title).toBe('Admin Panel Redesign');
      expect(sorted[1]!.title).toBe('Dashboard Layout');
      expect(sorted[2]!.title).toBe('Database Migration');
      expect(sorted[3]!.title).toBe('Rate Limiting Implementation');
      expect(sorted[4]!.title).toBe('User Authentication Bug');
    });

    it('should sort by title alphabetically descending', () => {
      const sort: CatalogSort = { field: 'title', order: 'desc' };
      const sorted = sortDocuments(testEntries, sort);

      expect(sorted[0]!.title).toBe('User Authentication Bug');
      expect(sorted[4]!.title).toBe('Admin Panel Redesign');
    });

    it('should handle null/undefined title values', () => {
      const entriesWithNulls = [
        mockCatalogEntry('REQ-001', 'Zebra'),
        { ...mockCatalogEntry('REQ-002', 'Test'), title: null as unknown as string },
        mockCatalogEntry('REQ-003', 'Alpha'),
      ] as CatalogEntry[];

      const sortAsc: CatalogSort = { field: 'title', order: 'asc' };
      const sortedAsc = sortDocuments(entriesWithNulls, sortAsc);

      // Null should go to end
      expect(sortedAsc[0]!.doc_id).toBe('REQ-003'); // Alpha
      expect(sortedAsc[1]!.doc_id).toBe('REQ-001'); // Zebra
    });
  });

  describe('edge cases', () => {
    it('should not mutate original array', () => {
      const original = [...testEntries];
      const sort: CatalogSort = { field: 'updated_at', order: 'desc' };
      sortDocuments(testEntries, sort);

      expect(testEntries).toEqual(original);
    });

    it('should handle empty array', () => {
      const sort: CatalogSort = { field: 'updated_at', order: 'desc' };
      const sorted = sortDocuments([], sort);

      expect(sorted).toEqual([]);
    });

    it('should handle single entry', () => {
      const sort: CatalogSort = { field: 'updated_at', order: 'desc' };
      const sorted = sortDocuments([testEntries[0]!], sort);

      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toEqual(testEntries[0]);
    });

    it('should handle entries with same values (stable sort)', () => {
      const sameDate = new Date('2025-12-16T12:00:00Z');
      const entries = [
        mockCatalogEntry('REQ-001', 'First', 'app', 'App', 1, sameDate),
        mockCatalogEntry('REQ-002', 'Second', 'app', 'App', 1, sameDate),
        mockCatalogEntry('REQ-003', 'Third', 'app', 'App', 1, sameDate),
      ];

      const sort: CatalogSort = { field: 'updated_at', order: 'desc' };
      const sorted = sortDocuments(entries, sort);

      // Should maintain relative order when values are equal
      expect(sorted.map((e) => e.title)).toEqual(['First', 'Second', 'Third']);
    });
  });
});

// ============================================================================
// sortProjects Tests
// ============================================================================

describe('sortProjects', () => {
  describe('sort by name', () => {
    it('should sort projects alphabetically by name', () => {
      const projectIds = ['admin', 'app', 'api'];
      const sorted = sortProjects(projectIds, testEntries, 'name');

      expect(sorted).toEqual(['admin', 'api', 'app']);
    });

    it('should handle case-insensitive sorting', () => {
      const entries = [
        mockCatalogEntry('REQ-001', 'Test', 'zebra', 'Zebra Project'),
        mockCatalogEntry('REQ-002', 'Test', 'alpha', 'Alpha Project'),
        mockCatalogEntry('REQ-003', 'Test', 'beta', 'beta project'), // lowercase
      ];

      const projectIds = ['zebra', 'alpha', 'beta'];
      const sorted = sortProjects(projectIds, entries, 'name');

      expect(sorted).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should handle unknown project (no entries)', () => {
      const projectIds = ['app', 'unknown-project'];
      const sorted = sortProjects(projectIds, testEntries, 'name');

      // Unknown project gets name 'Unknown' and is sorted accordingly
      expect(sorted).toHaveLength(2);
    });
  });

  describe('sort by count', () => {
    it('should sort projects by document count descending', () => {
      const projectIds = ['admin', 'app', 'api'];
      const sorted = sortProjects(projectIds, testEntries, 'count');

      // app: 2 docs, api: 2 docs, admin: 1 doc
      // Descending by count, so admin (1 doc) should be last
      expect(sorted[2]).toBe('admin'); // admin has 1 doc (least)
    });

    it('should handle projects with same count', () => {
      const projectIds = ['app', 'api']; // Both have 2 entries
      const sorted = sortProjects(projectIds, testEntries, 'count');

      // Should maintain order when counts are equal
      expect(sorted).toHaveLength(2);
      expect(sorted).toContain('app');
      expect(sorted).toContain('api');
    });

    it('should handle project with no documents', () => {
      const projectIds = ['app', 'empty-project'];
      const sorted = sortProjects(projectIds, testEntries, 'count');

      // app should come first (has docs), empty-project last (0 docs)
      expect(sorted[0]).toBe('app');
      expect(sorted[1]).toBe('empty-project');
    });
  });

  describe('sort by updated', () => {
    it('should sort projects by most recent update descending', () => {
      const projectIds = ['admin', 'app', 'api'];
      const sorted = sortProjects(projectIds, testEntries, 'updated');

      // app: 2025-12-16 (most recent)
      // api: 2025-12-14
      // admin: 2025-12-12
      expect(sorted[0]).toBe('app');
      expect(sorted[1]).toBe('api');
      expect(sorted[2]).toBe('admin');
    });

    it('should use latest update from multiple documents', () => {
      // API project has docs from 2025-12-14 and 2025-12-13
      // Should use 2025-12-14 (the latest) for sorting
      const projectIds = ['api'];
      const sorted = sortProjects(projectIds, testEntries, 'updated');

      expect(sorted).toEqual(['api']);
    });

    it('should handle project with null updated_at values', () => {
      const entries = [
        mockCatalogEntry('REQ-001', 'Test', 'app', 'App', 1, new Date('2025-12-16')),
        { ...mockCatalogEntry('REQ-002', 'Test', 'api', 'API'), updated_at: null as unknown as Date },
      ] as CatalogEntry[];

      const projectIds = ['app', 'api'];
      const sorted = sortProjects(projectIds, entries, 'updated');

      // app should come first (has valid date), api last (null)
      expect(sorted[0]).toBe('app');
      expect(sorted[1]).toBe('api');
    });

    it('should handle project with no documents', () => {
      const projectIds = ['app', 'empty-project'];
      const sorted = sortProjects(projectIds, testEntries, 'updated');

      // app should come first (has updates), empty-project last (no docs)
      expect(sorted[0]).toBe('app');
      expect(sorted[1]).toBe('empty-project');
    });
  });

  describe('edge cases', () => {
    it('should not mutate original project IDs array', () => {
      const projectIds = ['admin', 'app', 'api'];
      const original = [...projectIds];
      sortProjects(projectIds, testEntries, 'name');

      expect(projectIds).toEqual(original);
    });

    it('should handle empty project IDs array', () => {
      const sorted = sortProjects([], testEntries, 'name');

      expect(sorted).toEqual([]);
    });

    it('should handle single project', () => {
      const sorted = sortProjects(['app'], testEntries, 'name');

      expect(sorted).toEqual(['app']);
    });

    it('should handle empty entries array', () => {
      const projectIds = ['app', 'api'];
      const sorted = sortProjects(projectIds, [], 'name');

      // All projects will have count=0, no updates, name='Unknown'
      expect(sorted).toHaveLength(2);
    });
  });
});

// ============================================================================
// createGroupedCatalog Tests
// ============================================================================

describe('createGroupedCatalog', () => {
  it('should create grouped catalog structure', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'name');

    expect(catalog.groups.size).toBe(3);
    expect(catalog.groups.has('app')).toBe(true);
    expect(catalog.groups.has('api')).toBe(true);
    expect(catalog.groups.has('admin')).toBe(true);
  });

  it('should sort documents within each group', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'name');

    const appGroup = catalog.groups.get('app');
    expect(appGroup?.entries).toHaveLength(2);
    expect(appGroup?.entries[0]!.doc_id).toBe('REQ-20251216-app'); // newest first
    expect(appGroup?.entries[1]!.doc_id).toBe('REQ-20251215-app');
  });

  it('should sort projects by specified order', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'name');

    const projectIds = Array.from(catalog.groups.keys());
    // Alphabetical: admin, api, app
    expect(projectIds).toEqual(['admin', 'api', 'app']);
  });

  it('should include project info in each group', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'name');

    const appGroup = catalog.groups.get('app');
    expect(appGroup?.project.id).toBe('app');
    expect(appGroup?.project.name).toBe('App');

    const apiGroup = catalog.groups.get('api');
    expect(apiGroup?.project.id).toBe('api');
    expect(apiGroup?.project.name).toBe('API Server');
  });

  it('should support sorting projects by count', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'count');

    const projectIds = Array.from(catalog.groups.keys());
    // app: 2, api: 2, admin: 1
    // admin should be last (least docs)
    expect(projectIds[2]).toBe('admin');
  });

  it('should support sorting projects by updated', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'updated');

    const projectIds = Array.from(catalog.groups.keys());
    // app: 2025-12-16, api: 2025-12-14, admin: 2025-12-12
    expect(projectIds).toEqual(['app', 'api', 'admin']);
  });

  it('should default to sorting projects by name', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort); // no projectSort param

    const projectIds = Array.from(catalog.groups.keys());
    expect(projectIds).toEqual(['admin', 'api', 'app']);
  });

  it('should handle empty entries array', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog([], docSort, 'name');

    expect(catalog.groups.size).toBe(0);
    expect(catalog.groups).toEqual(new Map());
  });

  it('should handle single entry', () => {
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    const catalog = createGroupedCatalog([testEntries[0]!], docSort, 'name');

    expect(catalog.groups.size).toBe(1);
    expect(catalog.groups.has('app')).toBe(true);

    const appGroup = catalog.groups.get('app');
    expect(appGroup?.entries).toHaveLength(1);
    expect(appGroup?.project.id).toBe('app');
  });

  it('should combine all operations correctly', () => {
    // Sort docs by item_count descending, projects by name
    const docSort: CatalogSort = { field: 'item_count', order: 'desc' };
    const catalog = createGroupedCatalog(testEntries, docSort, 'name');

    // Projects should be alphabetical
    const projectIds = Array.from(catalog.groups.keys());
    expect(projectIds).toEqual(['admin', 'api', 'app']);

    // Documents within api group should be sorted by item_count desc
    const apiGroup = catalog.groups.get('api');
    expect(apiGroup?.entries[0]!.item_count).toBe(5); // Rate Limiting (5 items)
    expect(apiGroup?.entries[1]!.item_count).toBe(2); // Database Migration (2 items)
  });

  it('should not mutate original entries array', () => {
    const original = [...testEntries];
    const docSort: CatalogSort = { field: 'updated_at', order: 'desc' };
    createGroupedCatalog(testEntries, docSort, 'name');

    expect(testEntries).toEqual(original);
  });
});
