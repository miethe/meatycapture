/**
 * Request-Log Serializer Tests
 *
 * Tests for:
 * - serialize: Convert RequestLogDoc to markdown format
 * - serializeNotes: Structured notes to markdown
 * - parse: Parse markdown back to RequestLogDoc
 * - Roundtrip: serialize -> parse produces equivalent doc
 * - aggregateTags: Unique sorted tag collection
 * - updateItemsIndex: Index entry creation
 * - Edge cases: empty items, malformed content, missing fields
 */

import { describe, it, expect } from 'vitest';
import { serialize, parse, aggregateTags, updateItemsIndex } from './index';
import { createTestDoc, createTestItem, createTestNote } from '../test-helpers';
import type { Note } from '../models';
import { NOTE_TYPES } from '../models';

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
    expect(markdown).toContain(`**Subdomain:** ${item.subdomain}`);
  });

  it('should separate items with horizontal rules', () => {
    const doc = createTestDoc();
    const markdown = serialize(doc);

    const separatorCount = (markdown.match(/\n---\n/g) || []).length;
    // Frontmatter closing + (items - 1) separators
    expect(separatorCount).toBeGreaterThan(0);
  });

  it('should serialize item with modified_at field', () => {
    const modifiedDate = new Date('2025-12-03T14:30:00Z');
    const doc = createTestDoc({
      items: [
        createTestItem({
          id: 'REQ-20251203-test-01',
          modified_at: modifiedDate,
        }),
      ],
      items_index: [{ id: 'REQ-20251203-test-01', type: 'enhancement', title: 'Test Item Title' }],
      item_count: 1,
    });
    const markdown = serialize(doc);

    expect(markdown).toContain('**Modified:** 2025-12-03T14:30:00.000Z');
  });

  it('should not include Modified line when modified_at is not set', () => {
    // Use default createTestItem which does not set modified_at
    const doc = createTestDoc({
      items: [createTestItem()],
      item_count: 1,
    });
    const markdown = serialize(doc);

    expect(markdown).not.toContain('**Modified:**');
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
**Subdomain:** test

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
**Subdomain:** first

### Problem/Goal
First notes.

---

## REQ-20251203-test-02 - Second Item

**Type:** bug | **Domain:** api | **Priority:** high | **Status:** backlog
**Tags:** urgent
**Subdomain:** second

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
**Subdomain:** test, backend

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
    expect(item.domain).toStrictEqual(['web']);
    expect(item.priority).toBe('high');
    expect(item.status).toBe('backlog');
    expect(item.tags).toEqual(['urgent', 'api', 'feature']);
    expect(item.subdomain).toStrictEqual(['test', 'backend']);
    // Notes are parsed by TASK-1.5 - for now, parsed items have undefined notes
    expect(item.notes).toBeUndefined();
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

  it('should parse item with modified_at field', () => {
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

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Modified:** 2025-12-03T14:30:00.000Z
**Subdomain:** test

### Problem/Goal
Test notes.
`;

    const doc = parse(markdown);
    const item = doc.items[0];

    expect(item).toBeDefined();
    expect(item?.modified_at).toEqual(new Date('2025-12-03T14:30:00.000Z'));
  });

  it('should default modified_at to created_at when not present (backward compatibility)', () => {
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

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

### Problem/Goal
Test notes.
`;

    const doc = parse(markdown);
    const item = doc.items[0];

    expect(item).toBeDefined();
    // modified_at should default to created_at (derived from item ID: 2025-12-03)
    expect(item?.modified_at).toEqual(new Date('2025-12-03T00:00:00.000Z'));
    expect(item?.modified_at?.getTime()).toBe(item?.created_at.getTime());
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
      expect(parsedItem.domain).toStrictEqual(origItem.domain);
      expect(parsedItem.subdomain).toStrictEqual(origItem.subdomain);
      expect(parsedItem.priority).toBe(origItem.priority);
      expect(parsedItem.status).toBe(origItem.status);
      expect(parsedItem.tags).toEqual(origItem.tags);
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

  it('should preserve modified_at in roundtrip when present', () => {
    const modifiedDate = new Date('2025-12-03T14:30:00Z');
    const original = createTestDoc({
      items: [
        createTestItem({
          id: 'REQ-20251203-test-01',
          modified_at: modifiedDate,
        }),
      ],
      items_index: [{ id: 'REQ-20251203-test-01', type: 'enhancement', title: 'Test Item Title' }],
      item_count: 1,
    });
    const markdown = serialize(original);
    const parsed = parse(markdown);

    const originalItem = original.items[0];
    const parsedItem = parsed.items[0];

    expect(originalItem).toBeDefined();
    expect(parsedItem).toBeDefined();
    expect(parsedItem?.modified_at?.getTime()).toBe(originalItem?.modified_at?.getTime());
  });

  it('should handle item without modified_at in roundtrip (defaults to created_at)', () => {
    // Use default createTestItem which does not set modified_at
    const original = createTestDoc({
      items: [createTestItem()],
      item_count: 1,
    });
    const markdown = serialize(original);
    const parsed = parse(markdown);

    const parsedItem = parsed.items[0];

    expect(parsedItem).toBeDefined();
    // Without modified_at in markdown, parser defaults to created_at
    expect(parsedItem?.modified_at?.getTime()).toBe(parsedItem?.created_at.getTime());
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
        domain: ['web'],
        priority: 'high',
        tags: ['test', 'example'],
        notes: [createTestNote({ content: 'Lots of notes here' })],
      }),
    ];

    const index = updateItemsIndex(items);

    expect(index).toEqual([
      { id: 'REQ-20251203-test-01', type: 'enhancement', title: 'Test Item' },
    ]);

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

// ============================================================================
// Notes Serialization Tests
// ============================================================================

describe('serialize with notes', () => {
  it('should not add notes section for empty notes array', () => {
    const item = createTestItem({ notes: [] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).not.toContain('#### Notes');
  });

  it('should not add notes section when notes is not set', () => {
    // Create item without notes property (uses default from createTestItem which is [])
    // Then remove notes to simulate undefined
    const item = createTestItem();
    delete (item as unknown as Record<string, unknown>).notes; // Remove notes to simulate undefined
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).not.toContain('#### Notes');
  });

  it('should serialize single note correctly', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-01-01',
      type: NOTE_TYPES.General,
      content: 'Test note content',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({ notes: [note] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).toContain('#### Notes');
    expect(md).toContain('**Note 1: General**');
    expect(md).toContain('Created: 2026-01-01 10:00');
    expect(md).toContain('Test note content');
  });

  it('should show updated timestamp when different from created', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-01-01',
      type: NOTE_TYPES.BugFixAttempt,
      content: 'Updated content',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T14:00:00Z'),
    };
    const item = createTestItem({ notes: [note] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).toContain('**Note 1: Bug Fix Attempt**');
    expect(md).toContain('Created: 2026-01-01 10:00');
    expect(md).toContain('Updated: 2026-01-01 14:00');
  });

  it('should not show updated timestamp when same as created', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-01-01',
      type: NOTE_TYPES.Validation,
      content: 'Validation content',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({ notes: [note] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).toContain('Created: 2026-01-01 10:00');
    expect(md).not.toContain('Updated:');
  });

  it('should preserve markdown formatting in note content', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-01-01',
      type: NOTE_TYPES.General,
      content: 'Text with **bold** and `code` and *italic*',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({ notes: [note] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).toContain('**bold**');
    expect(md).toContain('`code`');
    expect(md).toContain('*italic*');
  });

  it('should serialize multiple notes in correct order (oldest first)', () => {
    const notes: Note[] = [
      {
        id: 'NOTE-20260101-test-01-02',
        type: NOTE_TYPES.Validation,
        content: 'Second note (later)',
        created_at: new Date('2026-01-01T14:00:00Z'),
        updated_at: new Date('2026-01-01T14:00:00Z'),
      },
      {
        id: 'NOTE-20260101-test-01-01',
        type: NOTE_TYPES.General,
        content: 'First note (earlier)',
        created_at: new Date('2026-01-01T10:00:00Z'),
        updated_at: new Date('2026-01-01T10:00:00Z'),
      },
    ];
    const item = createTestItem({ notes });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    // Notes should be sorted by created_at ascending
    const note1Pos = md.indexOf('**Note 1: General**');
    const note2Pos = md.indexOf('**Note 2: Validation**');

    expect(note1Pos).toBeLessThan(note2Pos);
    expect(md).toContain('First note (earlier)');
    expect(md).toContain('Second note (later)');
  });

  it('should serialize all note types correctly', () => {
    const notes: Note[] = [
      {
        id: 'NOTE-20260101-test-01-01',
        type: NOTE_TYPES.General,
        content: 'General content',
        created_at: new Date('2026-01-01T10:00:00Z'),
        updated_at: new Date('2026-01-01T10:00:00Z'),
      },
      {
        id: 'NOTE-20260101-test-01-02',
        type: NOTE_TYPES.BugFixAttempt,
        content: 'Bug fix content',
        created_at: new Date('2026-01-01T11:00:00Z'),
        updated_at: new Date('2026-01-01T11:00:00Z'),
      },
      {
        id: 'NOTE-20260101-test-01-03',
        type: NOTE_TYPES.Validation,
        content: 'Validation content',
        created_at: new Date('2026-01-01T12:00:00Z'),
        updated_at: new Date('2026-01-01T12:00:00Z'),
      },
      {
        id: 'NOTE-20260101-test-01-04',
        type: NOTE_TYPES.Other,
        content: 'Other content',
        created_at: new Date('2026-01-01T13:00:00Z'),
        updated_at: new Date('2026-01-01T13:00:00Z'),
      },
    ];
    const item = createTestItem({ notes });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).toContain('**Note 1: General**');
    expect(md).toContain('**Note 2: Bug Fix Attempt**');
    expect(md).toContain('**Note 3: Validation**');
    expect(md).toContain('**Note 4: Other**');
  });

  it('should serialize item with both metadata and notes', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-01-01',
      type: NOTE_TYPES.General,
      content: 'Test note content',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({
      id: 'REQ-20260101-test-01',
      title: 'Test Feature',
      type: 'enhancement',
      domain: ['web', 'api'],
      subdomain: ['frontend'],
      priority: 'high',
      status: 'in-progress',
      tags: ['ux', 'feature'],
      notes: [note],
    });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    // Verify metadata is present
    expect(md).toContain('## REQ-20260101-test-01 - Test Feature');
    expect(md).toContain('**Type:** enhancement');
    expect(md).toContain('**Domain:** web, api');
    expect(md).toContain('**Priority:** high');
    expect(md).toContain('**Status:** in-progress');
    expect(md).toContain('**Tags:** ux, feature');
    expect(md).toContain('**Subdomain:** frontend');

    // Verify notes section is present
    expect(md).toContain('#### Notes');
    expect(md).toContain('**Note 1: General**');
    expect(md).toContain('Test note content');
  });

  it('should handle notes with multiline content', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-01-01',
      type: NOTE_TYPES.General,
      content: `First paragraph here.

Second paragraph with more details.

- Bullet point 1
- Bullet point 2`,
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({ notes: [note] });
    const doc = createTestDoc({
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });
    const md = serialize(doc);

    expect(md).toContain('First paragraph here.');
    expect(md).toContain('Second paragraph with more details.');
    expect(md).toContain('- Bullet point 1');
    expect(md).toContain('- Bullet point 2');
  });
});

// ============================================================================
// Notes Parsing Tests
// ============================================================================

describe('parse with notes', () => {
  it('should return undefined notes for document without notes section', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes).toBeUndefined();
  });

  it('should parse single note correctly', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

Test note content.

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes).toHaveLength(1);
    expect(doc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
    expect(doc.items[0]?.notes?.[0]?.content).toBe('Test note content.');
  });

  it('should parse multiple notes in order', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

First note content.

**Note 2: Bug Fix Attempt** (Created: 2026-01-01 11:00)

Second note content.

**Note 3: Validation** (Created: 2026-01-01 12:00)

Third note content.

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes).toHaveLength(3);
    expect(doc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
    expect(doc.items[0]?.notes?.[1]?.type).toBe(NOTE_TYPES.BugFixAttempt);
    expect(doc.items[0]?.notes?.[2]?.type).toBe(NOTE_TYPES.Validation);
  });

  it('should handle note with updated timestamp', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00, Updated: 2026-01-01 14:00)

Updated note content.

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes?.[0]?.created_at).toEqual(new Date('2026-01-01T10:00:00Z'));
    expect(doc.items[0]?.notes?.[0]?.updated_at).toEqual(new Date('2026-01-01T14:00:00Z'));
    expect(doc.items[0]?.notes?.[0]?.updated_at?.getTime()).toBeGreaterThan(
      doc.items[0]?.notes?.[0]?.created_at?.getTime() || 0
    );
  });

  it('should preserve markdown in note content', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

Content with **bold** and \`code\` formatting.

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes?.[0]?.content).toContain('**bold**');
    expect(doc.items[0]?.notes?.[0]?.content).toContain('`code`');
  });

  it('should generate correct note IDs based on item ID and note number', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-meatycapture
title: Test
project_id: meatycapture
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-meatycapture-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

Note content.

`;

    const doc = parse(md);
    // Note ID should be: NOTE-YYYYMMDD-<project-slug>-<item-num>-<note-num>
    expect(doc.items[0]?.notes?.[0]?.id).toBe('NOTE-20260101-meatycapture-01-01');
  });

  it('should handle all note types', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

General note.

**Note 2: Bug Fix Attempt** (Created: 2026-01-01 10:15)

Bug fix note.

**Note 3: Validation** (Created: 2026-01-01 10:30)

Validation note.

**Note 4: Other** (Created: 2026-01-01 10:45)

Other note.

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes).toHaveLength(4);
    expect(doc.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
    expect(doc.items[0]?.notes?.[1]?.type).toBe(NOTE_TYPES.BugFixAttempt);
    expect(doc.items[0]?.notes?.[2]?.type).toBe(NOTE_TYPES.Validation);
    expect(doc.items[0]?.notes?.[3]?.type).toBe(NOTE_TYPES.Other);
  });

  it('should handle multiline note content', () => {
    const md = `---
type: request-log
doc_id: REQ-20260101-test
title: Test
project_id: test
item_count: 1
tags: []
items_index:
created_at: 2026-01-01T10:00:00.000Z
updated_at: 2026-01-01T10:00:00.000Z
---

## REQ-20260101-test-01 - Test Item

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** test
**Subdomain:** test

#### Notes

**Note 1: General** (Created: 2026-01-01 10:00)

First paragraph.

Second paragraph.

- List item 1
- List item 2

`;

    const doc = parse(md);
    expect(doc.items[0]?.notes?.[0]?.content).toContain('First paragraph.');
    expect(doc.items[0]?.notes?.[0]?.content).toContain('Second paragraph.');
    expect(doc.items[0]?.notes?.[0]?.content).toContain('- List item 1');
  });
});

// ============================================================================
// Notes Roundtrip Tests
// ============================================================================

describe('notes roundtrip', () => {
  it('should round-trip notes correctly', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-project-01-01',
      type: NOTE_TYPES.Validation,
      content: 'Test with **markdown**',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({
      id: 'REQ-20260101-test-project-01',
      notes: [note],
    });
    const doc = createTestDoc({
      doc_id: 'REQ-20260101-test-project',
      project_id: 'test-project',
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    const md = serialize(doc);
    const parsed = parse(md);

    expect(parsed.items[0]?.notes).toHaveLength(1);
    expect(parsed.items[0]?.notes?.[0]?.type).toBe(note.type);
    expect(parsed.items[0]?.notes?.[0]?.content).toBe(note.content);
    expect(parsed.items[0]?.notes?.[0]?.created_at.getTime()).toBe(note.created_at.getTime());
  });

  it('should round-trip multiple notes correctly', () => {
    const notes: Note[] = [
      {
        id: 'NOTE-20260101-test-project-01-01',
        type: NOTE_TYPES.General,
        content: 'First note',
        created_at: new Date('2026-01-01T10:00:00Z'),
        updated_at: new Date('2026-01-01T10:00:00Z'),
      },
      {
        id: 'NOTE-20260101-test-project-01-02',
        type: NOTE_TYPES.BugFixAttempt,
        content: 'Second note with **formatting**',
        created_at: new Date('2026-01-01T11:00:00Z'),
        updated_at: new Date('2026-01-01T12:00:00Z'),
      },
    ];
    const item = createTestItem({
      id: 'REQ-20260101-test-project-01',
      notes,
    });
    const doc = createTestDoc({
      doc_id: 'REQ-20260101-test-project',
      project_id: 'test-project',
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    const md = serialize(doc);
    const parsed = parse(md);

    expect(parsed.items[0]?.notes).toHaveLength(2);
    expect(parsed.items[0]?.notes?.[0]?.type).toBe(NOTE_TYPES.General);
    expect(parsed.items[0]?.notes?.[0]?.content).toBe('First note');
    expect(parsed.items[0]?.notes?.[1]?.type).toBe(NOTE_TYPES.BugFixAttempt);
    expect(parsed.items[0]?.notes?.[1]?.content).toBe('Second note with **formatting**');
  });

  it('should round-trip item with no notes correctly', () => {
    const item = createTestItem({
      id: 'REQ-20260101-test-project-01',
    });
    // Remove notes to simulate undefined (exactOptionalPropertyTypes)
    delete (item as unknown as Record<string, unknown>).notes;
    const doc = createTestDoc({
      doc_id: 'REQ-20260101-test-project',
      project_id: 'test-project',
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    const md = serialize(doc);
    const parsed = parse(md);

    // Items without notes section should parse to undefined
    expect(parsed.items[0]?.notes).toBeUndefined();
  });

  it('should round-trip note with updated timestamp', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-project-01-01',
      type: NOTE_TYPES.General,
      content: 'Updated content',
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T14:30:00Z'),
    };
    const item = createTestItem({
      id: 'REQ-20260101-test-project-01',
      notes: [note],
    });
    const doc = createTestDoc({
      doc_id: 'REQ-20260101-test-project',
      project_id: 'test-project',
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    const md = serialize(doc);
    const parsed = parse(md);

    expect(parsed.items[0]?.notes?.[0]?.created_at.getTime()).toBe(note.created_at.getTime());
    expect(parsed.items[0]?.notes?.[0]?.updated_at.getTime()).toBe(note.updated_at.getTime());
  });

  it('should round-trip multiline note content correctly', () => {
    const note: Note = {
      id: 'NOTE-20260101-test-project-01-01',
      type: NOTE_TYPES.General,
      content: `First paragraph.

Second paragraph with details.

- Bullet 1
- Bullet 2`,
      created_at: new Date('2026-01-01T10:00:00Z'),
      updated_at: new Date('2026-01-01T10:00:00Z'),
    };
    const item = createTestItem({
      id: 'REQ-20260101-test-project-01',
      notes: [note],
    });
    const doc = createTestDoc({
      doc_id: 'REQ-20260101-test-project',
      project_id: 'test-project',
      items: [item],
      items_index: [{ id: item.id, type: item.type, title: item.title }],
      item_count: 1,
    });

    const md = serialize(doc);
    const parsed = parse(md);

    expect(parsed.items[0]?.notes?.[0]?.content).toContain('First paragraph.');
    expect(parsed.items[0]?.notes?.[0]?.content).toContain('Second paragraph with details.');
    expect(parsed.items[0]?.notes?.[0]?.content).toContain('- Bullet 1');
  });
});
