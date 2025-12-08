/**
 * ApiDocStore Integration Tests
 *
 * Tests the HTTP-based DocStore adapter implementation.
 * Uses mocked HttpClient to verify correct endpoint calls and response handling.
 *
 * Coverage:
 * - All DocStore interface methods
 * - Correct HTTP method and endpoint usage
 * - Query parameter passing
 * - Request body serialization
 * - Response deserialization
 * - Error handling (via HttpClient)
 * - Clock parameter handling (not sent to server)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiDocStore } from './api-doc-store.js';
import { HttpClient } from './http-client.js';
import type { DocMeta, Clock } from '@core/ports';
import type { RequestLogDoc, ItemDraft, RequestLogItem } from '@core/models';

describe('ApiDocStore', () => {
  let mockClient: HttpClient;
  let store: ApiDocStore;

  // Mock clock for testing
  const mockClock: Clock = {
    now: () => new Date('2025-12-08T10:00:00Z'),
  };

  beforeEach(() => {
    // Create mock HttpClient with vi.fn() for all methods
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      head: vi.fn(),
    } as unknown as HttpClient;

    store = new ApiDocStore(mockClient);
  });

  describe('list()', () => {
    it('should call GET /api/docs with directory query parameter', async () => {
      const mockDocs: DocMeta[] = [
        {
          path: '/path/to/docs/REQ-20251208-project.md',
          doc_id: 'REQ-20251208-project',
          title: 'Project Requests',
          item_count: 5,
          updated_at: new Date('2025-12-08T09:00:00Z'),
        },
        {
          path: '/path/to/docs/REQ-20251207-other.md',
          doc_id: 'REQ-20251207-other',
          title: 'Other Requests',
          item_count: 3,
          updated_at: new Date('2025-12-07T15:30:00Z'),
        },
      ];

      vi.mocked(mockClient.get).mockResolvedValue(mockDocs);

      const result = await store.list('/path/to/docs');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs', {
        directory: '/path/to/docs',
      });
      expect(result).toEqual(mockDocs);
      expect(result).toHaveLength(2);
      expect(result[0]!.doc_id).toBe('REQ-20251208-project');
    });

    it('should handle empty directory results', async () => {
      vi.mocked(mockClient.get).mockResolvedValue([]);

      const result = await store.list('/empty/path');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs', {
        directory: '/empty/path',
      });
      expect(result).toEqual([]);
    });
  });

  describe('read()', () => {
    it('should call GET /api/docs/:doc_id with path query parameter', async () => {
      const mockDoc: RequestLogDoc = {
        doc_id: 'REQ-20251208-project',
        title: 'Project Requests',
        project_id: 'project',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockDoc);

      const result = await store.read('/path/to/docs/REQ-20251208-project.md');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs/REQ-20251208-project', {
        path: '/path/to/docs/REQ-20251208-project.md',
      });
      expect(result).toEqual(mockDoc);
      expect(result.doc_id).toBe('REQ-20251208-project');
    });

    it('should extract doc_id from file path', async () => {
      const mockDoc: RequestLogDoc = {
        doc_id: 'REQ-20251207-another',
        title: 'Another Doc',
        project_id: 'another',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-07T08:00:00Z'),
        updated_at: new Date('2025-12-07T09:00:00Z'),
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockDoc);

      await store.read('/different/path/REQ-20251207-another.md');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs/REQ-20251207-another', {
        path: '/different/path/REQ-20251207-another.md',
      });
    });

    it('should handle paths without .md extension', async () => {
      const mockDoc: RequestLogDoc = {
        doc_id: 'some-file',
        title: 'Some File',
        project_id: 'project',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockDoc);

      await store.read('/path/to/some-file');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs/some-file', {
        path: '/path/to/some-file',
      });
    });
  });

  describe('write()', () => {
    it('should call POST /api/docs/:doc_id with path query and doc body', async () => {
      const mockDoc: RequestLogDoc = {
        doc_id: 'REQ-20251208-project',
        title: 'Project Requests',
        project_id: 'project',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      };

      vi.mocked(mockClient.post).mockResolvedValue({
        success: true,
        doc_id: 'REQ-20251208-project',
        path: '/path/to/docs/REQ-20251208-project.md',
      });

      await store.write('/path/to/docs/REQ-20251208-project.md', mockDoc);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/docs/REQ-20251208-project',
        { path: '/path/to/docs/REQ-20251208-project.md' },
        mockDoc
      );
    });

    it('should send complete document with items', async () => {
      const item: RequestLogItem = {
        id: 'REQ-20251208-project-01',
        title: 'Test Item',
        type: 'enhancement',
        domain: 'api',
        context: 'backend',
        priority: 'medium',
        status: 'triage',
        tags: ['api', 'backend'],
        notes: 'Test notes',
        created_at: new Date('2025-12-08T09:00:00Z'),
      };

      const mockDoc: RequestLogDoc = {
        doc_id: 'REQ-20251208-project',
        title: 'Project Requests',
        project_id: 'project',
        items: [item],
        items_index: [
          {
            id: 'REQ-20251208-project-01',
            type: 'enhancement',
            title: 'Test Item',
          },
        ],
        tags: ['api', 'backend'],
        item_count: 1,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      };

      vi.mocked(mockClient.post).mockResolvedValue({
        success: true,
        doc_id: 'REQ-20251208-project',
        path: '/path/to/docs/REQ-20251208-project.md',
      });

      await store.write('/path/to/docs/REQ-20251208-project.md', mockDoc);

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/docs/REQ-20251208-project',
        { path: '/path/to/docs/REQ-20251208-project.md' },
        mockDoc
      );

      const sentDoc = vi.mocked(mockClient.post).mock.calls[0]![2] as RequestLogDoc;
      expect(sentDoc.items).toHaveLength(1);
      expect(sentDoc.items[0]!.title).toBe('Test Item');
      expect(sentDoc.item_count).toBe(1);
    });
  });

  describe('append()', () => {
    it('should call PATCH /api/docs/:doc_id/items with path query and item body', async () => {
      const itemDraft: ItemDraft = {
        title: 'New Item',
        type: 'bug',
        domain: 'web',
        context: 'frontend',
        priority: 'high',
        status: 'triage',
        tags: ['web', 'ui'],
        notes: 'Found a bug in the UI',
      };

      const updatedDoc: RequestLogDoc = {
        doc_id: 'REQ-20251208-project',
        title: 'Project Requests',
        project_id: 'project',
        items: [
          {
            id: 'REQ-20251208-project-01',
            ...itemDraft,
            created_at: new Date('2025-12-08T09:00:00Z'),
          },
        ],
        items_index: [
          {
            id: 'REQ-20251208-project-01',
            type: 'bug',
            title: 'New Item',
          },
        ],
        tags: ['web', 'ui'],
        item_count: 1,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      };

      vi.mocked(mockClient.patch).mockResolvedValue(updatedDoc);

      const result = await store.append(
        '/path/to/docs/REQ-20251208-project.md',
        itemDraft,
        mockClock
      );

      expect(mockClient.patch).toHaveBeenCalledWith(
        '/api/docs/REQ-20251208-project/items',
        { path: '/path/to/docs/REQ-20251208-project.md' },
        itemDraft
      );
      expect(result).toEqual(updatedDoc);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.title).toBe('New Item');
      expect(result.item_count).toBe(1);
    });

    it('should NOT send clock parameter to server', async () => {
      const itemDraft: ItemDraft = {
        title: 'Clock Test Item',
        type: 'enhancement',
        domain: 'api',
        context: 'backend',
        priority: 'low',
        status: 'triage',
        tags: [],
        notes: 'Testing clock handling',
      };

      const updatedDoc: RequestLogDoc = {
        doc_id: 'REQ-20251208-project',
        title: 'Project Requests',
        project_id: 'project',
        items: [
          {
            id: 'REQ-20251208-project-01',
            ...itemDraft,
            created_at: new Date('2025-12-08T09:00:00Z'),
          },
        ],
        items_index: [
          {
            id: 'REQ-20251208-project-01',
            type: 'enhancement',
            title: 'Clock Test Item',
          },
        ],
        tags: [],
        item_count: 1,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      };

      vi.mocked(mockClient.patch).mockResolvedValue(updatedDoc);

      await store.append('/path/to/docs/REQ-20251208-project.md', itemDraft, mockClock);

      // Verify that ONLY item is sent, not clock
      const patchCall = vi.mocked(mockClient.patch).mock.calls[0]!;
      expect(patchCall[2]!).toEqual(itemDraft);
      expect(patchCall[2]!).not.toHaveProperty('clock');
    });
  });

  describe('backup()', () => {
    it('should call POST /api/docs/:doc_id/backup with path query parameter', async () => {
      vi.mocked(mockClient.post).mockResolvedValue({
        success: true,
        backup_path: '/path/to/docs/REQ-20251208-project.md.bak',
      });

      const result = await store.backup('/path/to/docs/REQ-20251208-project.md');

      expect(mockClient.post).toHaveBeenCalledWith(
        '/api/docs/REQ-20251208-project/backup',
        { path: '/path/to/docs/REQ-20251208-project.md' }
      );
      expect(result).toBe('/path/to/docs/REQ-20251208-project.md.bak');
    });

    it('should return backup path from server response', async () => {
      vi.mocked(mockClient.post).mockResolvedValue({
        success: true,
        backup_path: '/custom/backup/path.bak',
      });

      const result = await store.backup('/path/to/original.md');

      expect(result).toBe('/custom/backup/path.bak');
    });
  });

  describe('isWritable()', () => {
    it('should call HEAD /api/docs/:doc_id with path query parameter', async () => {
      vi.mocked(mockClient.head).mockResolvedValue(true);

      const result = await store.isWritable('/path/to/docs/REQ-20251208-project.md');

      expect(mockClient.head).toHaveBeenCalledWith('/api/docs/REQ-20251208-project', {
        path: '/path/to/docs/REQ-20251208-project.md',
      });
      expect(result).toBe(true);
    });

    it('should return true when path is writable', async () => {
      vi.mocked(mockClient.head).mockResolvedValue(true);

      const result = await store.isWritable('/writable/path/doc.md');

      expect(result).toBe(true);
    });

    it('should return false when path is not writable', async () => {
      vi.mocked(mockClient.head).mockResolvedValue(false);

      const result = await store.isWritable('/readonly/path/doc.md');

      expect(result).toBe(false);
    });
  });

  describe('doc_id extraction', () => {
    it('should extract doc_id from standard request-log filename', async () => {
      vi.mocked(mockClient.get).mockResolvedValue({
        doc_id: 'REQ-20251208-myproject',
        title: 'My Project',
        project_id: 'myproject',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      });

      await store.read('/path/to/REQ-20251208-myproject.md');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs/REQ-20251208-myproject', {
        path: '/path/to/REQ-20251208-myproject.md',
      });
    });

    it('should handle paths with multiple directories', async () => {
      vi.mocked(mockClient.get).mockResolvedValue({
        doc_id: 'REQ-20251207-test',
        title: 'Test',
        project_id: 'test',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-07T08:00:00Z'),
        updated_at: new Date('2025-12-07T09:00:00Z'),
      });

      await store.read('/deeply/nested/path/to/docs/REQ-20251207-test.md');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs/REQ-20251207-test', {
        path: '/deeply/nested/path/to/docs/REQ-20251207-test.md',
      });
    });

    it('should use "doc" placeholder for invalid paths', async () => {
      vi.mocked(mockClient.get).mockResolvedValue({
        doc_id: 'doc',
        title: 'Document',
        project_id: 'project',
        items: [],
        items_index: [],
        tags: [],
        item_count: 0,
        created_at: new Date('2025-12-08T08:00:00Z'),
        updated_at: new Date('2025-12-08T09:00:00Z'),
      });

      await store.read('/path/to/');

      expect(mockClient.get).toHaveBeenCalledWith('/api/docs/doc', {
        path: '/path/to/',
      });
    });
  });
});
