import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAllDocuments, enrichWithProjectInfo, extractFilterOptions } from '../utils';
import type { ProjectStore, DocStore, DocMeta } from '@core/ports';
import type { Project } from '@core/models';
import type { CatalogEntry } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create mock Project with sensible defaults
 */
function mockProject(
  id: string,
  name: string,
  default_path: string = `/data/${id}`,
  enabled: boolean = true
): Project {
  return {
    id,
    name,
    default_path,
    enabled,
    repo_url: undefined,
    created_at: new Date('2025-12-01T00:00:00Z'),
    updated_at: new Date('2025-12-16T00:00:00Z'),
  };
}

/**
 * Create mock DocMeta with sensible defaults
 */
function mockDocMeta(
  doc_id: string,
  title: string,
  updated_at: Date = new Date('2025-12-16T12:00:00Z'),
  item_count: number = 1
): DocMeta {
  return {
    path: `/data/${doc_id}.md`,
    doc_id,
    title,
    item_count,
    updated_at,
  };
}

/**
 * Create mock CatalogEntry with sensible defaults
 */
function mockCatalogEntry(
  doc_id: string,
  title: string,
  project_id: string,
  project_name: string,
  updated_at: Date = new Date('2025-12-16T12:00:00Z')
): CatalogEntry {
  return {
    path: `/data/${doc_id}.md`,
    doc_id,
    title,
    item_count: 1,
    updated_at,
    project_id,
    project_name,
  };
}

// ============================================================================
// Mock Store Implementations
// ============================================================================

/**
 * Create mock ProjectStore for testing
 */
function createMockProjectStore(projects: Project[]): ProjectStore {
  return {
    list: vi.fn().mockResolvedValue(projects),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

/**
 * Create mock DocStore for testing
 * By default returns empty array for all paths (can be overridden per test)
 */
function createMockDocStore(
  listBehavior: (path: string) => Promise<DocMeta[]> = async () => []
): DocStore {
  return {
    list: vi.fn().mockImplementation(listBehavior),
    read: vi.fn(),
    write: vi.fn(),
    append: vi.fn(),
  };
}

// ============================================================================
// listAllDocuments Tests
// ============================================================================

describe('listAllDocuments', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods to verify logging behavior
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should aggregate documents from all enabled projects', async () => {
    const projects = [
      mockProject('app', 'App', '/data/app', true),
      mockProject('api', 'API Server', '/data/api', true),
    ];

    const docStore = createMockDocStore(async (path: string) => {
      if (path === '/data/app') {
        return [
          mockDocMeta('REQ-20251216-app', 'App Doc 1', new Date('2025-12-16')),
          mockDocMeta('REQ-20251215-app', 'App Doc 2', new Date('2025-12-15')),
        ];
      }
      if (path === '/data/api') {
        return [mockDocMeta('REQ-20251214-api', 'API Doc 1', new Date('2025-12-14'))];
      }
      return [];
    });

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toHaveLength(3);
    expect(result[0].doc_id).toBe('REQ-20251216-app'); // Most recent first
    expect(result[1].doc_id).toBe('REQ-20251215-app');
    expect(result[2].doc_id).toBe('REQ-20251214-api');
  });

  it('should filter out disabled projects', async () => {
    const projects = [
      mockProject('app', 'App', '/data/app', true),
      mockProject('disabled', 'Disabled Project', '/data/disabled', false),
    ];

    const docStore = createMockDocStore(async (path: string) => {
      if (path === '/data/app') {
        return [mockDocMeta('REQ-001', 'Test')];
      }
      if (path === '/data/disabled') {
        return [mockDocMeta('REQ-002', 'Should not appear')];
      }
      return [];
    });

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toHaveLength(1);
    expect(result[0].doc_id).toBe('REQ-001');
    expect(docStore.list).toHaveBeenCalledTimes(1);
    expect(docStore.list).toHaveBeenCalledWith('/data/app');
  });

  it('should enrich DocMeta with project_id and project_name', async () => {
    const projects = [mockProject('app', 'My App', '/data/app', true)];

    const docStore = createMockDocStore(async () => [
      mockDocMeta('REQ-001', 'Test Doc'),
    ]);

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('app');
    expect(result[0].project_name).toBe('My App');
  });

  it('should sort results by updated_at descending (most recent first)', async () => {
    const projects = [mockProject('app', 'App', '/data/app', true)];

    const docStore = createMockDocStore(async () => [
      mockDocMeta('REQ-001', 'Old Doc', new Date('2025-12-10')),
      mockDocMeta('REQ-002', 'New Doc', new Date('2025-12-16')),
      mockDocMeta('REQ-003', 'Mid Doc', new Date('2025-12-13')),
    ]);

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    expect(result[0].doc_id).toBe('REQ-002'); // newest
    expect(result[1].doc_id).toBe('REQ-003');
    expect(result[2].doc_id).toBe('REQ-001'); // oldest
  });

  it('should handle project with no documents', async () => {
    const projects = [
      mockProject('app', 'App', '/data/app', true),
      mockProject('empty', 'Empty Project', '/data/empty', true),
    ];

    const docStore = createMockDocStore(async (path: string) => {
      if (path === '/data/app') {
        return [mockDocMeta('REQ-001', 'Test')];
      }
      return []; // empty project
    });

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('app');
  });

  it('should handle docStore.list() error for a project gracefully', async () => {
    const projects = [
      mockProject('app', 'App', '/data/app', true),
      mockProject('broken', 'Broken Project', '/data/broken', true),
    ];

    const docStore = createMockDocStore(async (path: string) => {
      if (path === '/data/app') {
        return [mockDocMeta('REQ-001', 'Test')];
      }
      if (path === '/data/broken') {
        throw new Error('Permission denied');
      }
      return [];
    });

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    // Should skip broken project and continue with others
    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('app');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Project 'broken'"),
      'Permission denied'
    );
  });

  it('should return empty array when projectStore.list() fails', async () => {
    const projectStore = {
      list: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const docStore = createMockDocStore();

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Fatal error fetching projects'),
      'Database connection failed'
    );
  });

  it('should return empty array when no enabled projects exist', async () => {
    const projects = [
      mockProject('disabled1', 'Disabled 1', '/data/disabled1', false),
      mockProject('disabled2', 'Disabled 2', '/data/disabled2', false),
    ];

    const projectStore = createMockProjectStore(projects);
    const docStore = createMockDocStore();

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No enabled projects found')
    );
  });

  it('should return empty array when project list is empty', async () => {
    const projectStore = createMockProjectStore([]);
    const docStore = createMockDocStore();

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No enabled projects found')
    );
  });

  it('should log info for each scanned project', async () => {
    const projects = [
      mockProject('app', 'App', '/data/app', true),
      mockProject('api', 'API', '/data/api', true),
    ];

    const docStore = createMockDocStore(async (path: string) => {
      if (path === '/data/app') {
        return [mockDocMeta('REQ-001', 'Test')];
      }
      if (path === '/data/api') {
        return [mockDocMeta('REQ-002', 'Test'), mockDocMeta('REQ-003', 'Test')];
      }
      return [];
    });

    const projectStore = createMockProjectStore(projects);

    await listAllDocuments(projectStore, docStore);

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Project 'app': found 1 document")
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Project 'api': found 2 document")
    );
  });

  it('should log summary with success/fail counts', async () => {
    const projects = [
      mockProject('app', 'App', '/data/app', true),
      mockProject('broken', 'Broken', '/data/broken', true),
    ];

    const docStore = createMockDocStore(async (path: string) => {
      if (path === '/data/app') {
        return [mockDocMeta('REQ-001', 'Test')];
      }
      throw new Error('Failed');
    });

    const projectStore = createMockProjectStore(projects);

    await listAllDocuments(projectStore, docStore);

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('1 document(s) from 1 project(s) (1 failed)')
    );
  });

  it('should handle Error objects and non-Error values', async () => {
    const projects = [mockProject('broken', 'Broken', '/data/broken', true)];

    const docStore = createMockDocStore(async () => {
      throw 'String error'; // Non-Error thrown
    });

    const projectStore = createMockProjectStore(projects);

    const result = await listAllDocuments(projectStore, docStore);

    expect(result).toEqual([]);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Project 'broken'"),
      'String error'
    );
  });
});

// ============================================================================
// enrichWithProjectInfo Tests
// ============================================================================

describe('enrichWithProjectInfo', () => {
  it('should add project_id and project_name to DocMeta', () => {
    const docMetas: DocMeta[] = [
      mockDocMeta('REQ-001', 'Test Doc 1'),
      mockDocMeta('REQ-002', 'Test Doc 2'),
    ];

    const project = mockProject('app', 'My App');

    const result = enrichWithProjectInfo(docMetas, project);

    expect(result).toHaveLength(2);
    expect(result[0].project_id).toBe('app');
    expect(result[0].project_name).toBe('My App');
    expect(result[1].project_id).toBe('app');
    expect(result[1].project_name).toBe('My App');
  });

  it('should preserve all DocMeta fields', () => {
    const docMetas: DocMeta[] = [
      mockDocMeta('REQ-001', 'Test', new Date('2025-12-16'), 5),
    ];

    const project = mockProject('app', 'App');

    const result = enrichWithProjectInfo(docMetas, project);

    expect(result[0].path).toBe('/data/REQ-001.md');
    expect(result[0].doc_id).toBe('REQ-001');
    expect(result[0].title).toBe('Test');
    expect(result[0].item_count).toBe(5);
    expect(result[0].updated_at).toEqual(new Date('2025-12-16'));
  });

  it('should handle empty array', () => {
    const project = mockProject('app', 'App');

    const result = enrichWithProjectInfo([], project);

    expect(result).toEqual([]);
  });

  it('should not mutate original DocMeta array', () => {
    const docMetas: DocMeta[] = [mockDocMeta('REQ-001', 'Test')];
    const original = [...docMetas];
    const project = mockProject('app', 'App');

    enrichWithProjectInfo(docMetas, project);

    expect(docMetas).toEqual(original);
  });

  it('should create new CatalogEntry objects (not mutate DocMeta)', () => {
    const docMetas: DocMeta[] = [mockDocMeta('REQ-001', 'Test')];
    const project = mockProject('app', 'App');

    const result = enrichWithProjectInfo(docMetas, project);

    // Result should have extra fields
    expect(result[0]).toHaveProperty('project_id');
    expect(result[0]).toHaveProperty('project_name');

    // Original should not
    expect(docMetas[0]).not.toHaveProperty('project_id');
    expect(docMetas[0]).not.toHaveProperty('project_name');
  });

  it('should handle single DocMeta', () => {
    const docMetas: DocMeta[] = [mockDocMeta('REQ-001', 'Test')];
    const project = mockProject('app', 'App');

    const result = enrichWithProjectInfo(docMetas, project);

    expect(result).toHaveLength(1);
    expect(result[0].project_id).toBe('app');
  });
});

// ============================================================================
// extractFilterOptions Tests
// ============================================================================

describe('extractFilterOptions', () => {
  it('should populate projects from Project[]', () => {
    const projects = [
      mockProject('app', 'My App'),
      mockProject('api', 'API Server'),
      mockProject('admin', 'Admin Panel'),
    ];

    const entries: CatalogEntry[] = [];

    const options = extractFilterOptions(entries, projects);

    expect(options.projects).toHaveLength(3);
    expect(options.projects[0]).toEqual({ id: 'admin', name: 'Admin Panel' });
    expect(options.projects[1]).toEqual({ id: 'api', name: 'API Server' });
    expect(options.projects[2]).toEqual({ id: 'app', name: 'My App' });
  });

  it('should sort projects by name alphabetically', () => {
    const projects = [
      mockProject('zebra', 'Zebra Project'),
      mockProject('alpha', 'Alpha Project'),
      mockProject('beta', 'Beta Project'),
    ];

    const entries: CatalogEntry[] = [];

    const options = extractFilterOptions(entries, projects);

    expect(options.projects.map((p) => p.name)).toEqual([
      'Alpha Project',
      'Beta Project',
      'Zebra Project',
    ]);
  });

  it('should return empty arrays for type/domain/priority/status/tags', () => {
    const projects = [mockProject('app', 'App')];
    const entries: CatalogEntry[] = [
      mockCatalogEntry('REQ-001', 'Test', 'app', 'App'),
    ];

    const options = extractFilterOptions(entries, projects);

    expect(options.types).toEqual([]);
    expect(options.domains).toEqual([]);
    expect(options.priorities).toEqual([]);
    expect(options.statuses).toEqual([]);
    expect(options.tags).toEqual([]);
  });

  it('should handle empty projects array', () => {
    const entries: CatalogEntry[] = [];

    const options = extractFilterOptions(entries, []);

    expect(options.projects).toEqual([]);
  });

  it('should handle empty entries array', () => {
    const projects = [mockProject('app', 'App')];

    const options = extractFilterOptions([], projects);

    expect(options.projects).toHaveLength(1);
    expect(options.projects[0]).toEqual({ id: 'app', name: 'App' });
  });

  it('should extract only id and name from projects', () => {
    const projects = [
      mockProject('app', 'My App', '/data/app', true),
    ];

    const entries: CatalogEntry[] = [];

    const options = extractFilterOptions(entries, projects);

    const projectOption = options.projects[0];
    expect(projectOption).toEqual({ id: 'app', name: 'My App' });
    expect(projectOption).not.toHaveProperty('default_path');
    expect(projectOption).not.toHaveProperty('enabled');
  });

  it('should not mutate original projects array', () => {
    const projects = [
      mockProject('zebra', 'Zebra'),
      mockProject('alpha', 'Alpha'),
    ];
    const original = [...projects];

    const entries: CatalogEntry[] = [];

    extractFilterOptions(entries, projects);

    expect(projects).toEqual(original);
  });

  it('should handle case-insensitive name sorting', () => {
    const projects = [
      mockProject('a', 'zebra project'), // lowercase
      mockProject('b', 'Alpha Project'), // mixed case
      mockProject('c', 'BETA PROJECT'), // uppercase
    ];

    const entries: CatalogEntry[] = [];

    const options = extractFilterOptions(entries, projects);

    expect(options.projects.map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
});
