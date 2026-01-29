/**
 * Path Resolver Tests
 *
 * Tests for CLI path resolution including:
 * - Absolute path passthrough
 * - REQ pattern detection and resolution
 * - Extension normalization (.md handling)
 * - Project-aware path resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  resolveDocPath,
  getProjectDocPath,
  normalizeExtension,
  extractProjectSlug,
} from './path-resolver';

// Mock the adapters factory
vi.mock('@adapters/factory', () => ({
  createAdapters: vi.fn(),
}));

import { createAdapters } from '@adapters/factory';

const mockCreateAdapters = vi.mocked(createAdapters);

describe('normalizeExtension', () => {
  it('should add .md extension if missing', () => {
    expect(normalizeExtension('REQ-20251215-project')).toBe('REQ-20251215-project.md');
  });

  it('should preserve existing .md extension', () => {
    expect(normalizeExtension('REQ-20251215-project.md')).toBe('REQ-20251215-project.md');
  });

  it('should handle uppercase .MD extension', () => {
    expect(normalizeExtension('doc.MD')).toBe('doc.MD');
  });

  it('should handle mixed case extension', () => {
    expect(normalizeExtension('doc.Md')).toBe('doc.Md');
  });

  it('should add extension to relative paths', () => {
    expect(normalizeExtension('./docs/file')).toBe('./docs/file.md');
  });

  it('should handle paths with dots in directory names', () => {
    expect(normalizeExtension('./v1.0/docs/file')).toBe('./v1.0/docs/file.md');
  });

  it('should not double-add extension', () => {
    expect(normalizeExtension('file.md')).toBe('file.md');
  });
});

describe('extractProjectSlug', () => {
  it('should extract slug from document pattern', () => {
    expect(extractProjectSlug('REQ-20251215-meatycapture.md')).toBe('meatycapture');
  });

  it('should extract slug from item pattern', () => {
    expect(extractProjectSlug('REQ-20251215-my-project-01.md')).toBe('my-project');
  });

  it('should extract slug with numbers', () => {
    expect(extractProjectSlug('REQ-20251215-project123.md')).toBe('project123');
  });

  it('should extract slug from double-digit item number', () => {
    expect(extractProjectSlug('REQ-20251215-capture-app-99.md')).toBe('capture-app');
  });

  it('should return null for non-REQ pattern', () => {
    expect(extractProjectSlug('random-file.md')).toBeNull();
  });

  it('should return null for missing .md extension', () => {
    expect(extractProjectSlug('REQ-20251215-project')).toBeNull();
  });

  it('should return null for wrong prefix', () => {
    expect(extractProjectSlug('TASK-20251215-project.md')).toBeNull();
  });

  it('should return null for invalid date format', () => {
    expect(extractProjectSlug('REQ-2025-project.md')).toBeNull();
  });

  it('should return null for empty slug', () => {
    expect(extractProjectSlug('REQ-20251215-.md')).toBeNull();
  });
});

describe('getProjectDocPath', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return project default_path when project exists', async () => {
    mockCreateAdapters.mockResolvedValue({
      projectStore: {
        get: vi.fn().mockResolvedValue({
          id: 'meatycapture',
          default_path: '/custom/path/meatycapture',
        }),
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      fieldStore: {} as never,
      docStore: {} as never,
      mode: 'local',
    });

    const result = await getProjectDocPath('meatycapture');
    expect(result).toBe('/custom/path/meatycapture');
  });

  it('should use env variable when project not found', async () => {
    mockCreateAdapters.mockResolvedValue({
      projectStore: {
        get: vi.fn().mockResolvedValue(null),
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      fieldStore: {} as never,
      docStore: {} as never,
      mode: 'local',
    });

    process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'] = '/env/docs';

    const result = await getProjectDocPath('unknown-project');
    expect(result).toBe(join('/env/docs', 'unknown-project'));
  });

  it('should use default path when no project and no env var', async () => {
    mockCreateAdapters.mockResolvedValue({
      projectStore: {
        get: vi.fn().mockResolvedValue(null),
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      fieldStore: {} as never,
      docStore: {} as never,
      mode: 'local',
    });

    delete process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];

    const result = await getProjectDocPath('unknown-project');
    expect(result).toBe(join(homedir(), '.meatycapture', 'docs', 'unknown-project'));
  });
});

describe('resolveDocPath', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];

    // Default mock: no project found
    mockCreateAdapters.mockResolvedValue({
      projectStore: {
        get: vi.fn().mockResolvedValue(null),
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      fieldStore: {} as never,
      docStore: {} as never,
      mode: 'local',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('absolute path handling', () => {
    it('should return absolute paths unchanged', async () => {
      const absPath = '/absolute/path/to/doc.md';
      const result = await resolveDocPath(absPath);
      expect(result).toBe(absPath);
    });

    it('should preserve absolute paths without .md extension', async () => {
      const absPath = '/absolute/path/to/doc';
      const result = await resolveDocPath(absPath);
      // Absolute paths are returned as-is, no extension normalization
      expect(result).toBe(absPath);
    });
  });

  describe('REQ pattern with .md extension', () => {
    it('should resolve document pattern to project path', async () => {
      const result = await resolveDocPath('REQ-20251215-meatycapture.md');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'meatycapture', 'REQ-20251215-meatycapture.md')
      );
    });

    it('should resolve item pattern to project path', async () => {
      const result = await resolveDocPath('REQ-20251215-my-project-01.md');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'my-project', 'REQ-20251215-my-project-01.md')
      );
    });

    it('should use configured project path when available', async () => {
      mockCreateAdapters.mockResolvedValue({
        projectStore: {
          get: vi.fn().mockResolvedValue({
            id: 'meatycapture',
            default_path: '/configured/project/docs',
          }),
          list: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        fieldStore: {} as never,
        docStore: {} as never,
        mode: 'local',
      });

      const result = await resolveDocPath('REQ-20251215-meatycapture.md');
      expect(result).toBe('/configured/project/docs/REQ-20251215-meatycapture.md');
    });
  });

  describe('REQ pattern without .md extension', () => {
    it('should normalize and resolve document pattern', async () => {
      const result = await resolveDocPath('REQ-20251215-meatycapture');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'meatycapture', 'REQ-20251215-meatycapture.md')
      );
    });

    it('should normalize and resolve item pattern', async () => {
      const result = await resolveDocPath('REQ-20251215-project-05');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'project', 'REQ-20251215-project-05.md')
      );
    });

    it('should normalize and resolve with configured project path', async () => {
      mockCreateAdapters.mockResolvedValue({
        projectStore: {
          get: vi.fn().mockResolvedValue({
            id: 'capture-app',
            default_path: '/projects/capture',
          }),
          list: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        fieldStore: {} as never,
        docStore: {} as never,
        mode: 'local',
      });

      const result = await resolveDocPath('REQ-20251215-capture-app-99');
      expect(result).toBe('/projects/capture/REQ-20251215-capture-app-99.md');
    });
  });

  describe('relative path without REQ pattern', () => {
    it('should resolve relative path against CWD', async () => {
      const result = await resolveDocPath('./docs/my-file.md');
      expect(result).toBe(resolve('./docs/my-file.md'));
    });

    it('should add .md extension and resolve relative path', async () => {
      const result = await resolveDocPath('./docs/my-file');
      expect(result).toBe(resolve('./docs/my-file.md'));
    });

    it('should resolve filename without path', async () => {
      const result = await resolveDocPath('document.md');
      expect(result).toBe(resolve('document.md'));
    });
  });

  describe('item-level REQ patterns', () => {
    it('should resolve single-digit item number', async () => {
      const result = await resolveDocPath('REQ-20251215-project-01.md');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'project', 'REQ-20251215-project-01.md')
      );
    });

    it('should resolve double-digit item number', async () => {
      const result = await resolveDocPath('REQ-20251215-project-99.md');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'project', 'REQ-20251215-project-99.md')
      );
    });

    it('should resolve hyphenated project slug with item number', async () => {
      const result = await resolveDocPath('REQ-20251215-my-cool-app-42.md');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'my-cool-app', 'REQ-20251215-my-cool-app-42.md')
      );
    });

    it('should resolve item pattern without .md extension', async () => {
      const result = await resolveDocPath('REQ-20251215-app-01');
      expect(result).toBe(
        join(homedir(), '.meatycapture', 'docs', 'app', 'REQ-20251215-app-01.md')
      );
    });
  });
});
