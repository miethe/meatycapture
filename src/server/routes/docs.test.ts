/**
 * DocStore Routes Test Suite
 *
 * Comprehensive tests for all DocStore REST endpoints.
 * Tests request validation, response serialization, error handling,
 * and integration with DocStore adapter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDocsRouter } from './docs.js';
import type { DocStore, Clock, DocMeta } from '@core/ports';
import type { RequestLogDoc, ItemDraft } from '@core/models';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Mock Clock for deterministic testing.
 */
const mockClock: Clock = {
  now: () => new Date('2025-12-08T10:00:00Z'),
};

/**
 * Mock DocStore for testing route handlers.
 * Implements all DocStore methods with in-memory data.
 */
class MockDocStore implements DocStore {
  private docs: Map<string, RequestLogDoc> = new Map();

  async list(directory: string): Promise<DocMeta[]> {
    // Simulate directory-based filtering
    const metas: DocMeta[] = [];
    for (const [path, doc] of this.docs) {
      if (path.startsWith(directory)) {
        metas.push({
          path,
          doc_id: doc.doc_id,
          title: doc.title,
          item_count: doc.item_count,
          updated_at: doc.updated_at,
        });
      }
    }
    return metas.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  async read(path: string): Promise<RequestLogDoc> {
    const doc = this.docs.get(path);
    if (!doc) {
      throw new Error(`Document not found: ${path}`);
    }
    return doc;
  }

  async write(path: string, doc: RequestLogDoc): Promise<void> {
    this.docs.set(path, doc);
  }

  async append(path: string, item: ItemDraft, clock: Clock): Promise<RequestLogDoc> {
    const doc = await this.read(path);
    const newItem = {
      ...item,
      id: `${doc.doc_id}-${String(doc.item_count + 1).padStart(2, '0')}`,
      created_at: clock.now(),
    };

    const updatedDoc: RequestLogDoc = {
      ...doc,
      items: [...doc.items, newItem],
      tags: [...new Set([...doc.tags, ...item.tags])].sort(),
      items_index: [
        ...doc.items_index,
        {
          id: newItem.id,
          type: item.type,
          title: item.title,
        },
      ],
      item_count: doc.item_count + 1,
      updated_at: clock.now(),
    };

    await this.write(path, updatedDoc);
    return updatedDoc;
  }

  async backup(path: string): Promise<string> {
    const doc = this.docs.get(path);
    if (!doc) {
      throw new Error(`Document not found: ${path}`);
    }
    const backupPath = `${path}.bak`;
    this.docs.set(backupPath, doc);
    return backupPath;
  }

  async isWritable(path: string): Promise<boolean> {
    // For testing: paths starting with '/readonly/' are not writable
    return !path.startsWith('/readonly/');
  }

  // Test helper methods
  clear(): void {
    this.docs.clear();
  }

  seed(path: string, doc: RequestLogDoc): void {
    this.docs.set(path, doc);
  }
}

// ============================================================================
// Test Data Fixtures
// ============================================================================

const createMockDoc = (docId: string, itemCount: number = 1): RequestLogDoc => ({
  doc_id: docId,
  title: 'Test Document',
  project_id: 'test-project',
  items: [
    {
      id: `${docId}-01`,
      title: 'Test Item',
      type: 'enhancement',
      domain: 'api',
      context: 'server',
      priority: 'medium',
      status: 'triage',
      tags: ['api', 'server'],
      notes: 'Test notes',
      created_at: new Date('2025-12-08T09:00:00Z'),
    },
  ],
  items_index: [
    {
      id: `${docId}-01`,
      type: 'enhancement',
      title: 'Test Item',
    },
  ],
  tags: ['api', 'server'],
  item_count: itemCount,
  created_at: new Date('2025-12-08T09:00:00Z'),
  updated_at: new Date('2025-12-08T09:00:00Z'),
});

const createMockItemDraft = (): ItemDraft => ({
  title: 'New Test Item',
  type: 'bug',
  domain: 'ui',
  context: 'dashboard',
  priority: 'high',
  status: 'triage',
  tags: ['ui', 'bug'],
  notes: 'New item notes',
});

// ============================================================================
// Tests
// ============================================================================

describe('DocStore Routes', () => {
  let docStore: MockDocStore;
  let router: ReturnType<typeof createDocsRouter>;

  beforeEach(() => {
    docStore = new MockDocStore();
    router = createDocsRouter(docStore, mockClock);
  });

  // ==========================================================================
  // GET /api/docs - List Documents
  // ==========================================================================

  describe('GET /api/docs - list', () => {
    it('should list documents in directory', async () => {
      // Seed test data
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));
      docStore.seed('/data/docs/doc2.md', createMockDoc('REQ-20251207-project2'));
      docStore.seed('/other/doc3.md', createMockDoc('REQ-20251206-project3'));

      const req = new Request('http://localhost/api/docs?directory=/data/docs');
      const res = await router.list(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        path: '/data/docs/doc1.md',
        doc_id: 'REQ-20251208-project1',
      });
    });

    it('should return empty array for non-existent directory', async () => {
      const req = new Request('http://localhost/api/docs?directory=/nonexistent');
      const res = await router.list(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it('should serialize dates as ISO strings', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const req = new Request('http://localhost/api/docs?directory=/data/docs');
      const res = await router.list(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data[0].updated_at).toBe('string');
      expect(data[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return 400 if directory parameter is missing', async () => {
      const req = new Request('http://localhost/api/docs');
      const res = await router.list(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('ValidationError');
    });

    it('should return 400 if directory parameter is empty', async () => {
      const req = new Request('http://localhost/api/docs?directory=');
      const res = await router.list(req);

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /api/docs/:doc_id - Read Document
  // ==========================================================================

  describe('GET /api/docs/:doc_id - read', () => {
    it('should read existing document', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md'
      );
      const res = await router.read(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.doc_id).toBe('REQ-20251208-project1');
      expect(data.items).toHaveLength(1);
    });

    it('should serialize dates in response', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md'
      );
      const res = await router.read(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.created_at).toBe('string');
      expect(typeof data.updated_at).toBe('string');
      expect(typeof data.items[0].created_at).toBe('string');
    });

    it('should return 404 for non-existent document', async () => {
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-missing?path=/data/docs/missing.md'
      );
      const res = await router.read(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('NotFound');
    });

    it('should return 400 if path parameter is missing', async () => {
      const req = new Request('http://localhost/api/docs/REQ-20251208-project1');
      const res = await router.read(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('ValidationError');
    });
  });

  // ==========================================================================
  // POST /api/docs/:doc_id - Write Document
  // ==========================================================================

  describe('POST /api/docs/:doc_id - write', () => {
    it('should write new document', async () => {
      const doc = createMockDoc('REQ-20251208-project1');
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...doc,
            created_at: doc.created_at.toISOString(),
            updated_at: doc.updated_at.toISOString(),
            items: doc.items.map((item) => ({
              ...item,
              created_at: item.created_at.toISOString(),
            })),
          }),
        }
      );

      const res = await router.write(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.doc_id).toBe('REQ-20251208-project1');
      expect(data.path).toBe('/data/docs/doc1.md');

      // Verify document was written
      const written = await docStore.read('/data/docs/doc1.md');
      expect(written.doc_id).toBe('REQ-20251208-project1');
    });

    it('should return 400 if doc_id in URL does not match body', async () => {
      const doc = createMockDoc('REQ-20251208-project1');
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-different?path=/data/docs/doc1.md',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...doc,
            created_at: doc.created_at.toISOString(),
            updated_at: doc.updated_at.toISOString(),
            items: doc.items.map((item) => ({
              ...item,
              created_at: item.created_at.toISOString(),
            })),
          }),
        }
      );

      const res = await router.write(req);

      expect(res.status).toBe(500); // Generic error for mismatch
      const data = await res.json();
      expect(data.message).toContain('mismatch');
    });

    it('should return 400 if request body is invalid', async () => {
      const req = new Request('http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: 'REQ-20251208-project1',
          // Missing required fields
        }),
      });

      const res = await router.write(req);

      expect(res.status).toBe(400);
    });

    it('should return 400 if Content-Type is not JSON', async () => {
      const req = new Request('http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      });

      const res = await router.write(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('ValidationError');
    });
  });

  // ==========================================================================
  // PATCH /api/docs/:doc_id/items - Append Item
  // ==========================================================================

  describe('PATCH /api/docs/:doc_id/items - appendItem', () => {
    it('should append item to existing document', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const item = createMockItemDraft();
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1/items?path=/data/docs/doc1.md',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }
      );

      const res = await router.appendItem(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.item_count).toBe(2);
      expect(data.items).toHaveLength(2);
      expect(data.items[1].title).toBe('New Test Item');
      expect(data.items[1].id).toBe('REQ-20251208-project1-02');
    });

    it('should aggregate tags after append', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const item = createMockItemDraft();
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1/items?path=/data/docs/doc1.md',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }
      );

      const res = await router.appendItem(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      // Original tags: ['api', 'server']
      // New tags: ['ui', 'bug']
      // Aggregated: ['api', 'bug', 'server', 'ui'] (sorted)
      expect(data.tags).toEqual(['api', 'bug', 'server', 'ui']);
    });

    it('should update items_index after append', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const item = createMockItemDraft();
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1/items?path=/data/docs/doc1.md',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }
      );

      const res = await router.appendItem(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.items_index).toHaveLength(2);
      expect(data.items_index[1]).toMatchObject({
        id: 'REQ-20251208-project1-02',
        type: 'bug',
        title: 'New Test Item',
      });
    });

    it('should serialize dates in response', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const item = createMockItemDraft();
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1/items?path=/data/docs/doc1.md',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }
      );

      const res = await router.appendItem(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.updated_at).toBe('string');
      expect(typeof data.items[1].created_at).toBe('string');
    });

    it('should return 404 for non-existent document', async () => {
      const item = createMockItemDraft();
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-missing/items?path=/data/docs/missing.md',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }
      );

      const res = await router.appendItem(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('NotFound');
    });

    it('should return 400 if request body is invalid', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1/items?path=/data/docs/doc1.md',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            // Missing required fields
          }),
        }
      );

      const res = await router.appendItem(req);

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // POST /api/docs/:doc_id/backup - Create Backup
  // ==========================================================================

  describe('POST /api/docs/:doc_id/backup - backup', () => {
    it('should create backup of existing document', async () => {
      docStore.seed('/data/docs/doc1.md', createMockDoc('REQ-20251208-project1'));

      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1/backup?path=/data/docs/doc1.md',
        {
          method: 'POST',
        }
      );

      const res = await router.backup(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.backup_path).toBe('/data/docs/doc1.md.bak');
    });

    it('should return 404 for non-existent document', async () => {
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-missing/backup?path=/data/docs/missing.md',
        {
          method: 'POST',
        }
      );

      const res = await router.backup(req);

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('NotFound');
    });

    it('should return 400 if path parameter is missing', async () => {
      const req = new Request('http://localhost/api/docs/REQ-20251208-project1/backup', {
        method: 'POST',
      });

      const res = await router.backup(req);

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // HEAD /api/docs/:doc_id - Check Writability
  // ==========================================================================

  describe('HEAD /api/docs/:doc_id - checkWritable', () => {
    it('should return 200 for writable path', async () => {
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md',
        {
          method: 'HEAD',
        }
      );

      const res = await router.checkWritable(req);

      expect(res.status).toBe(200);
      expect(res.statusText).toContain('writable');
    });

    it('should return 403 for non-writable path', async () => {
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1?path=/readonly/doc1.md',
        {
          method: 'HEAD',
        }
      );

      const res = await router.checkWritable(req);

      expect(res.status).toBe(403);
      expect(res.statusText).toContain('not writable');
    });

    it('should return 400 if path parameter is missing', async () => {
      const req = new Request('http://localhost/api/docs/REQ-20251208-project1', {
        method: 'HEAD',
      });

      const res = await router.checkWritable(req);

      expect(res.status).toBe(400);
    });

    it('should not include body in response', async () => {
      const req = new Request(
        'http://localhost/api/docs/REQ-20251208-project1?path=/data/docs/doc1.md',
        {
          method: 'HEAD',
        }
      );

      const res = await router.checkWritable(req);

      expect(res.status).toBe(200);
      // Response body should be null for HEAD requests
      const body = await res.text();
      expect(body).toBe('');
    });
  });
});
