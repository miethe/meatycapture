/**
 * Indicator Aggregation Utilities Tests
 *
 * Comprehensive unit tests for status/type/note aggregation utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateStatusCounts,
  aggregateTypeCounts,
  aggregateNoteTypeCounts,
  calculateProjectProgress,
  collectDocumentNotes,
  aggregateDocumentNoteTypeCounts,
} from '../indicators';
import { createTestItem, createTestDoc, createTestNote } from '@core/test-helpers';
import { NOTE_TYPES } from '@core/models';
import type { RequestLogItem, Note, RequestLogDoc } from '@core/models';

describe('aggregateStatusCounts', () => {
  it('returns empty object for empty array', () => {
    const result = aggregateStatusCounts([]);
    expect(result).toEqual({});
  });

  it('counts single status correctly', () => {
    const items: RequestLogItem[] = [
      createTestItem({ status: 'triage' }),
      createTestItem({ status: 'triage' }),
      createTestItem({ status: 'triage' }),
    ];

    const result = aggregateStatusCounts(items);
    expect(result).toEqual({ triage: 3 });
  });

  it('counts multiple statuses correctly', () => {
    const items: RequestLogItem[] = [
      createTestItem({ status: 'triage' }),
      createTestItem({ status: 'done' }),
      createTestItem({ status: 'triage' }),
      createTestItem({ status: 'in-progress' }),
      createTestItem({ status: 'done' }),
    ];

    const result = aggregateStatusCounts(items);
    expect(result).toEqual({
      triage: 2,
      done: 2,
      'in-progress': 1,
    });
  });

  it('handles all valid status values', () => {
    const statuses = ['triage', 'backlog', 'planned', 'in-progress', 'done', 'wontfix'];
    const items: RequestLogItem[] = statuses.map((status) => createTestItem({ status }));

    const result = aggregateStatusCounts(items);

    for (const status of statuses) {
      expect(result[status]).toBe(1);
    }
  });

  it('handles items with single item', () => {
    const items: RequestLogItem[] = [createTestItem({ status: 'backlog' })];

    const result = aggregateStatusCounts(items);
    expect(result).toEqual({ backlog: 1 });
  });
});

describe('aggregateTypeCounts', () => {
  it('returns empty object for empty array', () => {
    const result = aggregateTypeCounts([]);
    expect(result).toEqual({});
  });

  it('counts single type correctly', () => {
    const items: RequestLogItem[] = [
      createTestItem({ type: 'bug' }),
      createTestItem({ type: 'bug' }),
    ];

    const result = aggregateTypeCounts(items);
    expect(result).toEqual({ bug: 2 });
  });

  it('counts multiple types correctly', () => {
    const items: RequestLogItem[] = [
      createTestItem({ type: 'enhancement' }),
      createTestItem({ type: 'bug' }),
      createTestItem({ type: 'enhancement' }),
      createTestItem({ type: 'idea' }),
      createTestItem({ type: 'task' }),
      createTestItem({ type: 'bug' }),
    ];

    const result = aggregateTypeCounts(items);
    expect(result).toEqual({
      enhancement: 2,
      bug: 2,
      idea: 1,
      task: 1,
    });
  });

  it('handles all valid type values', () => {
    const types = ['enhancement', 'bug', 'idea', 'task', 'question'];
    const items: RequestLogItem[] = types.map((type) => createTestItem({ type }));

    const result = aggregateTypeCounts(items);

    for (const type of types) {
      expect(result[type]).toBe(1);
    }
  });

  it('handles items with single item', () => {
    const items: RequestLogItem[] = [createTestItem({ type: 'question' })];

    const result = aggregateTypeCounts(items);
    expect(result).toEqual({ question: 1 });
  });
});

describe('aggregateNoteTypeCounts', () => {
  it('returns empty object for empty array', () => {
    const result = aggregateNoteTypeCounts([]);
    expect(result).toEqual({});
  });

  it('counts single note type correctly', () => {
    const notes: Note[] = [
      createTestNote({ type: NOTE_TYPES.General }),
      createTestNote({ type: NOTE_TYPES.General }),
    ];

    const result = aggregateNoteTypeCounts(notes);
    expect(result).toEqual({ [NOTE_TYPES.General]: 2 });
  });

  it('counts multiple note types correctly', () => {
    const notes: Note[] = [
      createTestNote({ type: NOTE_TYPES.General }),
      createTestNote({ type: NOTE_TYPES.BugFixAttempt }),
      createTestNote({ type: NOTE_TYPES.General }),
      createTestNote({ type: NOTE_TYPES.Validation }),
      createTestNote({ type: NOTE_TYPES.BugFixAttempt }),
      createTestNote({ type: NOTE_TYPES.Other }),
    ];

    const result = aggregateNoteTypeCounts(notes);
    expect(result).toEqual({
      [NOTE_TYPES.General]: 2,
      [NOTE_TYPES.BugFixAttempt]: 2,
      [NOTE_TYPES.Validation]: 1,
      [NOTE_TYPES.Other]: 1,
    });
  });

  it('handles all valid note type values', () => {
    const noteTypes = [
      NOTE_TYPES.General,
      NOTE_TYPES.BugFixAttempt,
      NOTE_TYPES.Validation,
      NOTE_TYPES.Other,
    ];
    const notes: Note[] = noteTypes.map((type) => createTestNote({ type }));

    const result = aggregateNoteTypeCounts(notes);

    for (const type of noteTypes) {
      expect(result[type]).toBe(1);
    }
  });

  it('handles notes with single note', () => {
    const notes: Note[] = [createTestNote({ type: NOTE_TYPES.Validation })];

    const result = aggregateNoteTypeCounts(notes);
    expect(result).toEqual({ [NOTE_TYPES.Validation]: 1 });
  });
});

describe('calculateProjectProgress', () => {
  it('returns zeros for empty documents array', () => {
    const result = calculateProjectProgress([]);

    expect(result).toEqual({
      done: 0,
      total: 0,
      statusBreakdown: {},
    });
  });

  it('returns zeros for documents with no items', () => {
    const docs: RequestLogDoc[] = [
      createTestDoc({ items: [], item_count: 0 }),
      createTestDoc({ items: [], item_count: 0 }),
    ];

    const result = calculateProjectProgress(docs);

    expect(result).toEqual({
      done: 0,
      total: 0,
      statusBreakdown: {},
    });
  });

  it('calculates progress from single document', () => {
    const doc = createTestDoc({
      items: [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'triage' }),
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'in-progress' }),
      ],
    });

    const result = calculateProjectProgress([doc]);

    expect(result).toEqual({
      done: 2,
      total: 4,
      statusBreakdown: {
        done: 2,
        triage: 1,
        'in-progress': 1,
      },
    });
  });

  it('calculates progress from multiple documents', () => {
    const doc1 = createTestDoc({
      items: [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'triage' }),
      ],
    });

    const doc2 = createTestDoc({
      items: [
        createTestItem({ status: 'in-progress' }),
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'done' }),
      ],
    });

    const doc3 = createTestDoc({
      items: [createTestItem({ status: 'backlog' })],
    });

    const result = calculateProjectProgress([doc1, doc2, doc3]);

    expect(result).toEqual({
      done: 3,
      total: 6,
      statusBreakdown: {
        done: 3,
        triage: 1,
        'in-progress': 1,
        backlog: 1,
      },
    });
  });

  it('handles documents with only done items', () => {
    const doc = createTestDoc({
      items: [
        createTestItem({ status: 'done' }),
        createTestItem({ status: 'done' }),
      ],
    });

    const result = calculateProjectProgress([doc]);

    expect(result).toEqual({
      done: 2,
      total: 2,
      statusBreakdown: {
        done: 2,
      },
    });
  });

  it('handles documents with no done items', () => {
    const doc = createTestDoc({
      items: [
        createTestItem({ status: 'triage' }),
        createTestItem({ status: 'in-progress' }),
        createTestItem({ status: 'backlog' }),
      ],
    });

    const result = calculateProjectProgress([doc]);

    expect(result).toEqual({
      done: 0,
      total: 3,
      statusBreakdown: {
        triage: 1,
        'in-progress': 1,
        backlog: 1,
      },
    });
  });

  it('handles single document with single item', () => {
    const doc = createTestDoc({
      items: [createTestItem({ status: 'planned' })],
    });

    const result = calculateProjectProgress([doc]);

    expect(result).toEqual({
      done: 0,
      total: 1,
      statusBreakdown: {
        planned: 1,
      },
    });
  });
});

describe('collectDocumentNotes', () => {
  it('returns empty array for document with no items', () => {
    const doc = createTestDoc({ items: [] });

    const result = collectDocumentNotes(doc);
    expect(result).toEqual([]);
  });

  it('returns empty array for items with no notes', () => {
    const doc = createTestDoc({
      items: [createTestItem({ notes: [] }), createTestItem({ notes: [] })],
    });

    const result = collectDocumentNotes(doc);
    expect(result).toEqual([]);
  });

  it('returns empty array for items with undefined notes', () => {
    // Create items then manually remove notes property to simulate undefined notes
    const item1 = createTestItem();
    const item2 = createTestItem();
    delete (item1 as { notes?: unknown }).notes;
    delete (item2 as { notes?: unknown }).notes;

    const doc = createTestDoc({
      items: [item1, item2],
    });

    const result = collectDocumentNotes(doc);
    expect(result).toEqual([]);
  });

  it('collects notes from single item', () => {
    const note1 = createTestNote({ id: 'note-1' });
    const note2 = createTestNote({ id: 'note-2' });

    const doc = createTestDoc({
      items: [createTestItem({ notes: [note1, note2] })],
    });

    const result = collectDocumentNotes(doc);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(note1);
    expect(result).toContainEqual(note2);
  });

  it('collects notes from multiple items', () => {
    const note1 = createTestNote({ id: 'note-1' });
    const note2 = createTestNote({ id: 'note-2' });
    const note3 = createTestNote({ id: 'note-3' });

    const doc = createTestDoc({
      items: [
        createTestItem({ notes: [note1] }),
        createTestItem({ notes: [note2, note3] }),
        createTestItem({ notes: [] }),
      ],
    });

    const result = collectDocumentNotes(doc);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual(note1);
    expect(result).toContainEqual(note2);
    expect(result).toContainEqual(note3);
  });

  it('handles mix of items with and without notes', () => {
    const note1 = createTestNote({ id: 'note-1' });

    // Create items without notes property to simulate undefined
    const itemWithUndefined1 = createTestItem();
    const itemWithUndefined2 = createTestItem();
    delete (itemWithUndefined1 as { notes?: unknown }).notes;
    delete (itemWithUndefined2 as { notes?: unknown }).notes;

    const doc = createTestDoc({
      items: [
        itemWithUndefined1,
        createTestItem({ notes: [note1] }),
        createTestItem({ notes: [] }),
        itemWithUndefined2,
      ],
    });

    const result = collectDocumentNotes(doc);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(note1);
  });
});

describe('aggregateDocumentNoteTypeCounts', () => {
  it('returns empty object for document with no items', () => {
    const doc = createTestDoc({ items: [] });

    const result = aggregateDocumentNoteTypeCounts(doc);
    expect(result).toEqual({});
  });

  it('returns empty object for items with no notes', () => {
    const doc = createTestDoc({
      items: [createTestItem({ notes: [] }), createTestItem({ notes: [] })],
    });

    const result = aggregateDocumentNoteTypeCounts(doc);
    expect(result).toEqual({});
  });

  it('aggregates note types from single item', () => {
    const doc = createTestDoc({
      items: [
        createTestItem({
          notes: [
            createTestNote({ type: NOTE_TYPES.General }),
            createTestNote({ type: NOTE_TYPES.General }),
            createTestNote({ type: NOTE_TYPES.Validation }),
          ],
        }),
      ],
    });

    const result = aggregateDocumentNoteTypeCounts(doc);
    expect(result).toEqual({
      [NOTE_TYPES.General]: 2,
      [NOTE_TYPES.Validation]: 1,
    });
  });

  it('aggregates note types from multiple items', () => {
    const doc = createTestDoc({
      items: [
        createTestItem({
          notes: [
            createTestNote({ type: NOTE_TYPES.General }),
            createTestNote({ type: NOTE_TYPES.BugFixAttempt }),
          ],
        }),
        createTestItem({
          notes: [
            createTestNote({ type: NOTE_TYPES.General }),
            createTestNote({ type: NOTE_TYPES.Other }),
          ],
        }),
        createTestItem({
          notes: [createTestNote({ type: NOTE_TYPES.Validation })],
        }),
      ],
    });

    const result = aggregateDocumentNoteTypeCounts(doc);
    expect(result).toEqual({
      [NOTE_TYPES.General]: 2,
      [NOTE_TYPES.BugFixAttempt]: 1,
      [NOTE_TYPES.Validation]: 1,
      [NOTE_TYPES.Other]: 1,
    });
  });

  it('handles items with empty notes arrays', () => {
    const doc = createTestDoc({
      items: [
        createTestItem({ notes: [] }),
        createTestItem({
          notes: [createTestNote({ type: NOTE_TYPES.General })],
        }),
        createTestItem({ notes: [] }),
      ],
    });

    const result = aggregateDocumentNoteTypeCounts(doc);
    expect(result).toEqual({
      [NOTE_TYPES.General]: 1,
    });
  });

  it('handles items with undefined notes', () => {
    // Create item without notes property to simulate undefined
    const itemWithUndefined = createTestItem();
    delete (itemWithUndefined as { notes?: unknown }).notes;

    const doc = createTestDoc({
      items: [
        itemWithUndefined,
        createTestItem({
          notes: [createTestNote({ type: NOTE_TYPES.BugFixAttempt })],
        }),
      ],
    });

    const result = aggregateDocumentNoteTypeCounts(doc);
    expect(result).toEqual({
      [NOTE_TYPES.BugFixAttempt]: 1,
    });
  });
});
