/**
 * Request-Log Serializer Tests
 *
 * Tests for:
 * - serialize: Convert RequestLogDoc to markdown format
 * - parse: Parse markdown back to RequestLogDoc
 * - Roundtrip: serialize -> parse produces equivalent doc
 * - aggregateTags: Unique sorted tag collection
 * - updateItemsIndex: Index entry creation
 * - Edge cases: empty items, malformed content, missing fields
 */

import { describe, it, expect } from 'vitest';
import { serialize, parse, aggregateTags, updateItemsIndex } from './index';
import { createTestDoc, createTestItem } from '../test-helpers';

describe('serialize', () => {
  it('should serialize document with valid frontmatter', () => {
    const doc = createTestDoc();
    const markdown = serialize(doc);

    expect(markdown).toContain('---');
    expect(markdown).toContain('type: request-log');
    expect(markdown).toContain(`doc_id: ${doc.doc_id}`);
    expect(markdown).toContain(`title: ${doc.title}`);
    expect(markdown).toContain(`project_id: ${doc.project_id}`);
    expect(markdown).toContain(`item_count: ${doc.item_count}`);
  });

  it('should serialize document with tags', () => {
    const doc = createTestDoc({ tags: ['api', 'enhancement', 'ux'] });
    const markdown = serialize(doc);

    expect(markdown).toContain('tags: [api, enhancement, ux]');
  });

  it('should serialize document with empty tags', () => {
    const doc = createTestDoc({ tags: [] });
    const markdown = serialize(doc);

    expect(markdown).toContain('tags: []');
  });

  it('should serialize items_index', () => {
    const doc = createTestDoc();
    const markdown = serialize(doc);

    expect(markdown).toContain('items_index:');
    expect(markdown).toContain(`  - id: ${doc.items[0]?.id}`);
    expect(markdown).toContain(`    type: ${doc.items[0]?.type}`);
    expect(markdown).toContain(`    title: ${doc.items[0]?.title}`);
  });

  it('should serialize timestamps as ISO strings', () => {
    const doc = createTestDoc();
    const markdown = serialize(doc);

    expect(markdown).toContain(`created_at: ${doc.created_at.toISOString()}`);
    expect(markdown).toContain(`updated_at: ${doc.updated_at.toISOString()}`);
  });

  it('should serialize item sections', () => {
    const doc = createTestDoc();
    const markdown = serialize(doc);

    const item = doc.items[0];
    expect(item).toBeDefined();
    if (!item) return;

    expect(markdown).toContain(`## ${item.id} - ${item.title}`);
    expect(markdown).toContain(`**Type:** ${item.type}`);
    expect(markdown).toContain(`**Domain:** ${item.domain}`);
    expect(markdown).toContain(`**Priority:** ${item.priority}`);
    expect(markdown).toContain(`**Status:** ${item.status}`);
    expect(markdown).toContain(`**Tags:** ${item.tags.join(', ')}`);
    expect(markdown).toContain(`**Context:** ${item.context}`);
    expect(markdown).toContain('### Problem/Goal');
    expect(markdown).toContain(item.notes);
  });

  it('should separate items with horizontal rules', () => {
    const doc = createTestDoc();
    const markdown = serialize(doc);

    const separatorCount = (markdown.match(/\n---\n/g) || []).length;
    // Frontmatter closing + (items - 1) separators
    expect(separatorCount).toBeGreaterThan(0);
  });

  it('should serialize document with single item', () => {
    const doc = createTestDoc({
      items: [createTestItem()],
      item_count: 1,
    });
    const markdown = serialize(doc);

    expect(markdown).toContain('item_count: 1');
    expect(markdown).toContain('## REQ-20251203-test-project-01');
  });

  it('should serialize document with no items', () => {
    const doc = createTestDoc({
      items: [],
      items_index: [],
      item_count: 0,
    });
    const markdown = serialize(doc);

    expect(markdown).toContain('item_count: 0');
    expect(markdown).toContain('items_index:');
    // Should have frontmatter but minimal body
    expect(markdown).toContain('---');
  });
});

describe('parse', () => {
  it('should parse valid markdown document', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test-project
title: Test Document
project_id: test-project
item_count: 1
tags: [test, example]
items_index:
  - id: REQ-20251203-test-project-01
    type: enhancement
    title: Test Item
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---

## REQ-20251203-test-project-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test, example
**Context:** Test context

### Problem/Goal
Test notes describing the problem.
`;

    const doc = parse(markdown);

    expect(doc.doc_id).toBe('REQ-20251203-test-project');
    expect(doc.title).toBe('Test Document');
    expect(doc.project_id).toBe('test-project');
    expect(doc.item_count).toBe(1);
    expect(doc.tags).toEqual(['test', 'example']);
    expect(doc.items.length).toBe(1);
  });

  it('should parse frontmatter fields correctly', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test Title
project_id: test
item_count: 0
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T11:00:00.000Z
---

`;

    const doc = parse(markdown);

    expect(doc.doc_id).toBe('REQ-20251203-test');
    expect(doc.title).toBe('Test Title');
    expect(doc.project_id).toBe('test');
    expect(doc.item_count).toBe(0);
    expect(doc.tags).toEqual([]);
    expect(doc.items_index).toEqual([]);
    expect(doc.created_at).toEqual(new Date('2025-12-03T10:00:00.000Z'));
    expect(doc.updated_at).toEqual(new Date('2025-12-03T11:00:00.000Z'));
  });

  it('should parse multiple items', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
item_count: 2
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---

## REQ-20251203-test-01 - First Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Context:** First context

### Problem/Goal
First notes.

---

## REQ-20251203-test-02 - Second Item

**Type:** bug | **Domain:** api | **Priority:** high | **Status:** backlog
**Tags:** urgent
**Context:** Second context

### Problem/Goal
Second notes.
`;

    const doc = parse(markdown);

    expect(doc.items.length).toBe(2);
    expect(doc.items[0]?.id).toBe('REQ-20251203-test-01');
    expect(doc.items[0]?.title).toBe('First Item');
    expect(doc.items[1]?.id).toBe('REQ-20251203-test-02');
    expect(doc.items[1]?.title).toBe('Second Item');
  });

  it('should parse item metadata correctly', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---

## REQ-20251203-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** high | **Status:** backlog
**Tags:** urgent, api, feature
**Context:** Test context here

### Problem/Goal
Detailed notes go here.
Multiple lines supported.
`;

    const doc = parse(markdown);
    const item = doc.items[0];

    expect(item).toBeDefined();
    if (!item) return;

    expect(item.id).toBe('REQ-20251203-test-01');
    expect(item.title).toBe('Test Item');
    expect(item.type).toBe('enhancement');
    expect(item.domain).toBe('web');
    expect(item.priority).toBe('high');
    expect(item.status).toBe('backlog');
    expect(item.tags).toEqual(['urgent', 'api', 'feature']);
    expect(item.context).toBe('Test context here');
    expect(item.notes).toContain('Detailed notes go here');
    expect(item.notes).toContain('Multiple lines supported');
  });

  it('should throw error for missing frontmatter', () => {
    const markdown = `## REQ-20251203-test-01 - Test Item`;

    expect(() => parse(markdown)).toThrow('missing or malformed YAML frontmatter');
  });

  it('should throw error for missing doc_id', () => {
    const markdown = `---
type: request-log
title: Test
project_id: test
item_count: 0
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Missing or invalid required field: doc_id');
  });

  it('should throw error for missing title', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
project_id: test
item_count: 0
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Missing or invalid required field: title');
  });

  it('should throw error for missing project_id', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
item_count: 0
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Missing or invalid required field: project_id');
  });

  it('should throw error for missing item_count', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Missing or invalid required field: item_count');
  });

  it('should throw error for invalid tags type', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
item_count: 0
tags: not-an-array
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Invalid field type: tags must be an array');
  });

  it('should throw error for missing created_at', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
item_count: 0
tags: []
items_index:
updated_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Missing or invalid required field: created_at');
  });

  it('should throw error for missing updated_at', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
item_count: 0
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
---
`;

    expect(() => parse(markdown)).toThrow('Missing or invalid required field: updated_at');
  });

  it('should handle empty items gracefully', () => {
    const markdown = `---
type: request-log
doc_id: REQ-20251203-test
title: Test
project_id: test
item_count: 0
tags: []
items_index:
created_at: 2025-12-03T10:00:00.000Z
updated_at: 2025-12-03T10:00:00.000Z
---

`;

    const doc = parse(markdown);
    expect(doc.items).toEqual([]);
  });
});

describe('serialize/parse roundtrip', () => {
  it('should produce equivalent document after roundtrip', () => {
    const original = createTestDoc();
    const markdown = serialize(original);
    const parsed = parse(markdown);

    expect(parsed.doc_id).toBe(original.doc_id);
    expect(parsed.title).toBe(original.title);
    expect(parsed.project_id).toBe(original.project_id);
    expect(parsed.item_count).toBe(original.item_count);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.items.length).toBe(original.items.length);

    // Compare items
    for (let i = 0; i < original.items.length; i++) {
      const origItem = original.items[i];
      const parsedItem = parsed.items[i];
      expect(origItem).toBeDefined();
      expect(parsedItem).toBeDefined();
      if (!origItem || !parsedItem) continue;

      expect(parsedItem.id).toBe(origItem.id);
      expect(parsedItem.title).toBe(origItem.title);
      expect(parsedItem.type).toBe(origItem.type);
      expect(parsedItem.domain).toBe(origItem.domain);
      expect(parsedItem.context).toBe(origItem.context);
      expect(parsedItem.priority).toBe(origItem.priority);
      expect(parsedItem.status).toBe(origItem.status);
      expect(parsedItem.tags).toEqual(origItem.tags);
      // Notes may have trailing separators stripped or added during roundtrip
      expect(parsedItem.notes.trim()).toBe(origItem.notes.trim());
    }
  });

  it('should handle document with no items in roundtrip', () => {
    const original = createTestDoc({
      items: [],
      items_index: [],
      item_count: 0,
      tags: [],
    });
    const markdown = serialize(original);
    const parsed = parse(markdown);

    expect(parsed.doc_id).toBe(original.doc_id);
    expect(parsed.items).toEqual([]);
    expect(parsed.item_count).toBe(0);
  });

  it('should preserve timestamps in roundtrip', () => {
    const original = createTestDoc();
    const markdown = serialize(original);
    const parsed = parse(markdown);

    expect(parsed.created_at.getTime()).toBe(original.created_at.getTime());
    expect(parsed.updated_at.getTime()).toBe(original.updated_at.getTime());
  });
});

describe('aggregateTags', () => {
  it('should return unique sorted tags from items', () => {
    const items = [
      createTestItem({ tags: ['ux', 'api', 'enhancement'] }),
      createTestItem({ tags: ['api', 'bug', 'urgent'] }),
      createTestItem({ tags: ['ux', 'feature'] }),
    ];

    const tags = aggregateTags(items);

    expect(tags).toEqual(['api', 'bug', 'enhancement', 'feature', 'urgent', 'ux']);
  });

  it('should return empty array for items with no tags', () => {
    const items = [createTestItem({ tags: [] }), createTestItem({ tags: [] })];

    const tags = aggregateTags(items);

    expect(tags).toEqual([]);
  });

  it('should deduplicate tags', () => {
    const items = [
      createTestItem({ tags: ['test', 'example'] }),
      createTestItem({ tags: ['test', 'example'] }),
      createTestItem({ tags: ['test', 'example'] }),
    ];

    const tags = aggregateTags(items);

    expect(tags).toEqual(['example', 'test']);
  });

  it('should sort tags alphabetically', () => {
    const items = [createTestItem({ tags: ['zebra', 'apple', 'banana', 'cherry'] })];

    const tags = aggregateTags(items);

    expect(tags).toEqual(['apple', 'banana', 'cherry', 'zebra']);
  });

  it('should handle single item with multiple tags', () => {
    const items = [createTestItem({ tags: ['tag3', 'tag1', 'tag2'] })];

    const tags = aggregateTags(items);

    expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should return empty array for empty items', () => {
    const tags = aggregateTags([]);

    expect(tags).toEqual([]);
  });

  it('should handle items with overlapping and unique tags', () => {
    const items = [
      createTestItem({ tags: ['common', 'unique1'] }),
      createTestItem({ tags: ['common', 'unique2'] }),
      createTestItem({ tags: ['common', 'unique3'] }),
    ];

    const tags = aggregateTags(items);

    expect(tags).toEqual(['common', 'unique1', 'unique2', 'unique3']);
  });
});

describe('updateItemsIndex', () => {
  it('should create index entries from items', () => {
    const items = [
      createTestItem({
        id: 'REQ-20251203-test-01',
        type: 'enhancement',
        title: 'First Item',
      }),
      createTestItem({
        id: 'REQ-20251203-test-02',
        type: 'bug',
        title: 'Second Item',
      }),
    ];

    const index = updateItemsIndex(items);

    expect(index).toEqual([
      { id: 'REQ-20251203-test-01', type: 'enhancement', title: 'First Item' },
      { id: 'REQ-20251203-test-02', type: 'bug', title: 'Second Item' },
    ]);
  });

  it('should return empty array for no items', () => {
    const index = updateItemsIndex([]);

    expect(index).toEqual([]);
  });

  it('should extract only id, type, and title', () => {
    const items = [
      createTestItem({
        id: 'REQ-20251203-test-01',
        type: 'enhancement',
        title: 'Test Item',
        domain: 'web',
        priority: 'high',
        tags: ['test', 'example'],
        notes: 'Lots of notes here',
      }),
    ];

    const index = updateItemsIndex(items);

    expect(index).toEqual([{ id: 'REQ-20251203-test-01', type: 'enhancement', title: 'Test Item' }]);

    // Verify no extra fields
    expect(Object.keys(index[0] || {})).toEqual(['id', 'type', 'title']);
  });

  it('should handle single item', () => {
    const items = [
      createTestItem({
        id: 'REQ-20251203-test-01',
        type: 'task',
        title: 'Single Item',
      }),
    ];

    const index = updateItemsIndex(items);

    expect(index).toEqual([{ id: 'REQ-20251203-test-01', type: 'task', title: 'Single Item' }]);
  });

  it('should preserve order of items', () => {
    const items = [
      createTestItem({ id: 'REQ-20251203-test-03', title: 'Third' }),
      createTestItem({ id: 'REQ-20251203-test-01', title: 'First' }),
      createTestItem({ id: 'REQ-20251203-test-02', title: 'Second' }),
    ];

    const index = updateItemsIndex(items);

    expect(index[0]?.title).toBe('Third');
    expect(index[1]?.title).toBe('First');
    expect(index[2]?.title).toBe('Second');
  });
});
