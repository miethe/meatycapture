/**
 * Indicator Aggregation Utilities
 *
 * Utility functions for aggregating item status/type counts and note type counts
 * from RequestLogDoc for the Viewer Indicators feature.
 *
 * These utilities enable visual progress indicators in document rows and
 * project-level progress tracking.
 */

import type { RequestLogItem, RequestLogDoc, Note, NoteType } from '@core/models';

/**
 * Aggregates status counts from an array of RequestLogItems.
 *
 * @param items - Array of request log items to aggregate
 * @returns Record mapping status values to their counts
 *
 * @example
 * ```typescript
 * const items = [
 *   { status: 'triage', ... },
 *   { status: 'done', ... },
 *   { status: 'triage', ... },
 * ];
 * aggregateStatusCounts(items);
 * // Returns: { triage: 2, done: 1 }
 * ```
 */
export function aggregateStatusCounts(items: RequestLogItem[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const status = item.status;
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return counts;
}

/**
 * Aggregates type counts from an array of RequestLogItems.
 *
 * @param items - Array of request log items to aggregate
 * @returns Record mapping type values to their counts
 *
 * @example
 * ```typescript
 * const items = [
 *   { type: 'enhancement', ... },
 *   { type: 'bug', ... },
 *   { type: 'enhancement', ... },
 * ];
 * aggregateTypeCounts(items);
 * // Returns: { enhancement: 2, bug: 1 }
 * ```
 */
export function aggregateTypeCounts(items: RequestLogItem[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const type = item.type;
    counts[type] = (counts[type] ?? 0) + 1;
  }

  return counts;
}

/**
 * Aggregates note type counts from an array of Notes.
 *
 * @param notes - Array of notes to aggregate
 * @returns Record mapping note type values to their counts
 *
 * @example
 * ```typescript
 * const notes = [
 *   { type: 'General', ... },
 *   { type: 'Bug Fix Attempt', ... },
 *   { type: 'General', ... },
 * ];
 * aggregateNoteTypeCounts(notes);
 * // Returns: { 'General': 2, 'Bug Fix Attempt': 1 }
 * ```
 */
export function aggregateNoteTypeCounts(notes: Note[]): Record<NoteType, number> {
  const counts: Record<string, number> = {};

  for (const note of notes) {
    const type = note.type;
    counts[type] = (counts[type] ?? 0) + 1;
  }

  return counts as Record<NoteType, number>;
}

/**
 * Progress calculation result for a project.
 */
export interface ProjectProgress {
  /** Number of items with 'done' status */
  done: number;
  /** Total number of items across all documents */
  total: number;
  /** Breakdown of counts by status value */
  statusBreakdown: Record<string, number>;
}

/**
 * Calculates overall progress across multiple documents for a project.
 *
 * Aggregates item counts from all documents, providing:
 * - Count of completed (done) items
 * - Total item count
 * - Full status breakdown for detailed indicators
 *
 * @param documents - Array of RequestLogDoc documents to aggregate
 * @returns ProjectProgress with done count, total count, and status breakdown
 *
 * @example
 * ```typescript
 * const documents = [
 *   { items: [{ status: 'done' }, { status: 'triage' }], ... },
 *   { items: [{ status: 'in-progress' }, { status: 'done' }], ... },
 * ];
 * calculateProjectProgress(documents);
 * // Returns: {
 * //   done: 2,
 * //   total: 4,
 * //   statusBreakdown: { done: 2, triage: 1, 'in-progress': 1 }
 * // }
 * ```
 */
export function calculateProjectProgress(documents: RequestLogDoc[]): ProjectProgress {
  // Collect all items from all documents
  const allItems: RequestLogItem[] = [];

  for (const doc of documents) {
    allItems.push(...doc.items);
  }

  // Aggregate status counts across all items
  const statusBreakdown = aggregateStatusCounts(allItems);

  return {
    done: statusBreakdown['done'] ?? 0,
    total: allItems.length,
    statusBreakdown,
  };
}

/**
 * Aggregates all notes from items in a document.
 *
 * Helper function to collect notes from all items in a RequestLogDoc
 * for note-level aggregation.
 *
 * @param doc - RequestLogDoc to extract notes from
 * @returns Array of all notes from all items in the document
 *
 * @example
 * ```typescript
 * const doc = {
 *   items: [
 *     { notes: [note1, note2] },
 *     { notes: [note3] },
 *   ],
 *   ...
 * };
 * collectDocumentNotes(doc);
 * // Returns: [note1, note2, note3]
 * ```
 */
export function collectDocumentNotes(doc: RequestLogDoc): Note[] {
  const allNotes: Note[] = [];

  for (const item of doc.items) {
    if (item.notes && Array.isArray(item.notes)) {
      allNotes.push(...item.notes);
    }
  }

  return allNotes;
}

/**
 * Aggregates note type counts for an entire document.
 *
 * Convenience function that combines collectDocumentNotes and
 * aggregateNoteTypeCounts for document-level note statistics.
 *
 * @param doc - RequestLogDoc to aggregate note types from
 * @returns Record mapping note type values to their counts
 *
 * @example
 * ```typescript
 * const doc = {
 *   items: [
 *     { notes: [{ type: 'General' }, { type: 'Validation' }] },
 *     { notes: [{ type: 'General' }] },
 *   ],
 *   ...
 * };
 * aggregateDocumentNoteTypeCounts(doc);
 * // Returns: { 'General': 2, 'Validation': 1 }
 * ```
 */
export function aggregateDocumentNoteTypeCounts(doc: RequestLogDoc): Record<NoteType, number> {
  const notes = collectDocumentNotes(doc);
  return aggregateNoteTypeCounts(notes);
}
