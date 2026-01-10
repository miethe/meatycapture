import type { Note, NoteType } from '@core/models';
import { NOTE_TYPES, isNoteType } from '@core/models';

export interface NormalizeNotesOptions {
  now: Date;
  projectSlug?: string;
  itemNumber?: string;
}

function coerceDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeNoteType(value: unknown): NoteType {
  if (typeof value !== 'string') {
    return NOTE_TYPES.General;
  }
  if (isNoteType(value)) {
    return value;
  }
  const normalizedInput = value.toLowerCase().replace(/\s+/g, '');
  for (const [key, label] of Object.entries(NOTE_TYPES)) {
    if (
      key.toLowerCase() === normalizedInput ||
      label.toLowerCase().replace(/\s+/g, '') === normalizedInput
    ) {
      return label as NoteType;
    }
  }
  return NOTE_TYPES.General;
}

function buildNoteId(
  createdAt: Date,
  options: NormalizeNotesOptions,
  index: number,
  existingId?: string
): string {
  if (existingId && existingId.trim()) {
    return existingId;
  }
  const noteNum = String(index + 1).padStart(2, '0');
  if (options.projectSlug && options.itemNumber) {
    const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
    const itemNumber = options.itemNumber.padStart(2, '0');
    return `NOTE-${dateStr}-${options.projectSlug}-${itemNumber}-${noteNum}`;
  }
  return `NOTE-${createdAt.getTime()}-${noteNum}`;
}

export function normalizeDraftNotes(notes: unknown, options: NormalizeNotesOptions): Note[] {
  if (!Array.isArray(notes) || notes.length === 0) {
    return [];
  }

  return notes.map((note, index) => {
    if (typeof note === 'string') {
      const created_at = options.now;
      return {
        id: buildNoteId(created_at, options, index),
        type: NOTE_TYPES.General,
        content: note,
        created_at,
        updated_at: created_at,
      };
    }

    if (!note || typeof note !== 'object') {
      const created_at = options.now;
      return {
        id: buildNoteId(created_at, options, index),
        type: NOTE_TYPES.General,
        content: '',
        created_at,
        updated_at: created_at,
      };
    }

    const raw = note as Partial<Note> & {
      content?: unknown;
      type?: unknown;
      id?: unknown;
      created_at?: unknown;
      updated_at?: unknown;
    };
    const created_at = coerceDate(raw.created_at, options.now);
    const updated_at = coerceDate(raw.updated_at, created_at);
    const content = typeof raw.content === 'string' ? raw.content : '';
    const type = normalizeNoteType(raw.type);
    const id = buildNoteId(
      created_at,
      options,
      index,
      typeof raw.id === 'string' ? raw.id : undefined
    );

    return {
      id,
      type,
      content,
      created_at,
      updated_at,
    };
  });
}
