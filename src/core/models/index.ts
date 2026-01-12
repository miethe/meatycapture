/**
 * Domain Models
 *
 * Core domain types for MeatyCapture:
 * - AppConfig: Global application configuration
 * - Project: Project configuration with paths and metadata
 * - FieldOption: Field catalog options (global/project scoped)
 * - ItemDraft: Request log item being created
 * - RequestLogItem: Persisted item in request-log document
 * - RequestLogDoc: Complete request-log document structure
 * - Note: Structured note attached to a RequestLogItem
 */

/**
 * Application configuration entity
 * Stores global application settings
 */
export interface AppConfig {
  /** Application version (semver format) */
  version: string;
  /** Default project ID for new documents */
  default_project?: string;
  /** API server URL for remote mode (e.g., 'http://localhost:3737') */
  api_url?: string;
  /** Timestamp when config was created */
  created_at: Date;
  /** Timestamp of last modification */
  updated_at: Date;
}

/**
 * Valid configuration keys that can be set
 */
export type ConfigKey = 'default_project' | 'api_url';

/**
 * Field names that support configurable options
 * Note: 'subdomain' replaced 'context' as the categorical field;
 * 'context' is now a free-form text field (not in FieldName)
 */
export type FieldName = 'type' | 'domain' | 'subdomain' | 'priority' | 'status' | 'tags' | 'feature';

/**
 * Scope for field options - global applies to all projects,
 * project applies only to a specific project
 */
export type FieldScope = 'global' | 'project';

/**
 * Project configuration entity
 * Represents a project that can have request-log documents
 */
export interface Project {
  /** Unique identifier (slug format, e.g., 'meatycapture') */
  id: string;
  /** Human-readable project name */
  name: string;
  /** Default filesystem path for request-log files */
  default_path: string;
  /** Optional repository URL for context */
  repo_url?: string;
  /** Whether the project is active and available for selection */
  enabled: boolean;
  /** Timestamp when project was created */
  created_at: Date;
  /** Timestamp of last modification */
  updated_at: Date;
}

/**
 * Field option entity
 * Represents a configurable option for dropdown/select fields
 * Can be scoped globally or to a specific project
 */
export interface FieldOption {
  /** Unique identifier */
  id: string;
  /** Which field this option belongs to */
  field: FieldName;
  /** The option value (e.g., 'enhancement', 'bug') */
  value: string;
  /** Whether this is a global or project-specific option */
  scope: FieldScope;
  /** Required when scope is 'project' */
  project_id?: string;
  /** Timestamp when option was created */
  created_at: Date;
}

/**
 * Item draft entity
 * Represents an item being created in the wizard before persistence
 * This is the form data structure
 */
export interface ItemDraft {
  /** Item title/summary */
  title: string;
  /** Item type (enhancement, bug, idea, etc.) */
  type: string;
  /** Domain/area (web, api, mobile, etc.) - supports multiple selections */
  domain: string[];
  /** Sub-domain categories within the main domain - supports multiple selections */
  subdomain: string[];
  /** Optional free-form context/background information */
  context?: string;
  /** Priority level (low, medium, high, critical) */
  priority: string;
  /** Current status (triage, backlog, in-progress, etc.) */
  status: string;
  /** Linked features (PRD, Epic, etc.) - supports multiple selections */
  feature: string[];
  /** Array of tag strings for categorization */
  tags: string[];
  /**
   * Structured notes attached to this item.
   * @default []
   */
  notes: Note[];
}

/**
 * Request log item entity
 * Represents a persisted item within a request-log document
 * Extends ItemDraft with ID and timestamp
 */
export interface RequestLogItem {
  /** Unique item ID (e.g., 'REQ-20251203-capture-app-01') */
  id: string;
  /** Item title/summary */
  title: string;
  /** Item type (enhancement, bug, idea, etc.) */
  type: string;
  /** Domain/area (web, api, mobile, etc.) - supports multiple selections */
  domain: string[];
  /** Sub-domain categories within the main domain - supports multiple selections */
  subdomain: string[];
  /** Optional free-form context/background information */
  context?: string;
  /** Priority level (low, medium, high, critical) */
  priority: string;
  /** Current status (triage, backlog, in-progress, etc.) */
  status: string;
  /** Linked features (PRD, Epic, etc.) - supports multiple selections (optional for backward compatibility) */
  feature?: string[];
  /** Array of tag strings for categorization */
  tags: string[];
  /**
   * Structured notes attached to this item.
   * Optional for backward compatibility with existing documents that have notes: string.
   * @default []
   */
  notes?: Note[];
  /** Timestamp when item was created */
  created_at: Date;
  /** Timestamp when item was last modified (optional for backward compatibility) */
  modified_at?: Date;
}

/**
 * Item index entry
 * Quick reference entry in frontmatter for fast lookup
 */
export interface ItemIndexEntry {
  /** Item ID reference */
  id: string;
  /** Item type for filtering */
  type: string;
  /** Item title for display */
  title: string;
}

/**
 * Request log document entity
 * Represents a complete request-log markdown document
 * Contains multiple items and aggregated metadata
 */
export interface RequestLogDoc {
  /** Document ID (e.g., 'REQ-20251203-capture-app') */
  doc_id: string;
  /** Document title */
  title: string;
  /** Associated project ID */
  project_id: string;
  /** All items in the document */
  items: RequestLogItem[];
  /** Quick reference index for frontmatter */
  items_index: ItemIndexEntry[];
  /** Aggregated unique tags from all items (sorted) */
  tags: string[];
  /** Total number of items in document */
  item_count: number;
  /** Timestamp when document was created */
  created_at: Date;
  /** Timestamp of last modification */
  updated_at: Date;
  /** Whether the document is archived (hidden from active view) */
  archived: boolean;
}

/**
 * Default field option values
 * These are the built-in global options available for each field
 */
export const DEFAULT_FIELD_OPTIONS = {
  type: ['enhancement', 'bug', 'idea', 'task', 'question'],
  priority: ['low', 'medium', 'high', 'critical'],
  status: ['triage', 'backlog', 'planned', 'in-progress', 'done', 'wontfix'],
} as const;

// ============================================================================
// NoteType: Structured Notes Feature
// ============================================================================

/**
 * Valid note types for categorizing observations.
 * Using const object pattern (not TypeScript enum) for tree-shaking.
 */
export const NOTE_TYPES = {
  General: 'General',
  BugFixAttempt: 'Bug Fix Attempt',
  Validation: 'Validation',
  Other: 'Other',
} as const;

/** Type union of all valid note types */
export type NoteType = (typeof NOTE_TYPES)[keyof typeof NOTE_TYPES];

/**
 * Type guard to check if a value is a valid NoteType.
 * @param value - Value to check
 * @returns True if value is a valid NoteType
 */
export function isNoteType(value: unknown): value is NoteType {
  return Object.values(NOTE_TYPES).includes(value as NoteType);
}

/**
 * Human-readable labels for each note type.
 * Used for dropdown display and card badges.
 */
export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  [NOTE_TYPES.General]: 'General',
  [NOTE_TYPES.BugFixAttempt]: 'Bug Fix Attempt',
  [NOTE_TYPES.Validation]: 'Validation',
  [NOTE_TYPES.Other]: 'Other',
};

/**
 * CSS color classes for each note type badge.
 * Matches glass/x-morphism design system.
 */
export const NOTE_TYPE_COLORS: Record<NoteType, string> = {
  [NOTE_TYPES.General]: 'note-type-general',
  [NOTE_TYPES.BugFixAttempt]: 'note-type-bugfix',
  [NOTE_TYPES.Validation]: 'note-type-validation',
  [NOTE_TYPES.Other]: 'note-type-other',
};

/**
 * Note types in display order for dropdowns.
 */
export const NOTE_TYPE_OPTIONS: readonly NoteType[] = [
  NOTE_TYPES.General,
  NOTE_TYPES.BugFixAttempt,
  NOTE_TYPES.Validation,
  NOTE_TYPES.Other,
] as const;

// ============================================================================
// Note: Structured Notes Entity
// ============================================================================

/**
 * Maximum allowed length for note content in characters.
 * Prevents excessive storage and ensures reasonable UI display.
 */
export const NOTE_MAX_CONTENT_LENGTH = 10000;

/**
 * Structured note attached to a RequestLogItem.
 * Notes allow adding typed observations (General, Bug Fix Attempt, Validation, Other)
 * with markdown content and timestamps for tracking.
 */
export interface Note {
  /** Unique note ID (e.g., 'NOTE-20260101-meatycapture-01-01') */
  id: string;
  /** Type of note - categorizes the observation */
  type: NoteType;
  /** Note content in markdown format (max 10,000 characters) */
  content: string;
  /** When the note was created */
  created_at: Date;
  /** When the note was last updated (same as created_at if never edited) */
  updated_at: Date;
}

/**
 * Type guard to check if an object is a valid Note.
 * Validates all required fields and their types.
 * @param obj - Object to validate
 * @returns True if obj is a valid Note
 */
export function isNote(obj: unknown): obj is Note {
  if (!obj || typeof obj !== 'object') return false;
  const n = obj as Partial<Note>;
  return (
    typeof n.id === 'string' &&
    typeof n.type === 'string' &&
    isNoteType(n.type) &&
    typeof n.content === 'string' &&
    n.content.length <= NOTE_MAX_CONTENT_LENGTH &&
    n.created_at instanceof Date &&
    n.updated_at instanceof Date
  );
}

/**
 * Validates a Note object and returns an array of error messages.
 * Returns empty array if the note is valid.
 * @param note - Note object to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateNote(note: Note): string[] {
  const errors: string[] = [];

  if (!note.id || typeof note.id !== 'string') {
    errors.push('Note ID is required and must be a string');
  } else if (note.id.trim().length === 0) {
    errors.push('Note ID cannot be empty');
  }

  if (!note.type || typeof note.type !== 'string') {
    errors.push('Note type is required and must be a string');
  } else if (!isNoteType(note.type)) {
    errors.push(`Invalid note type: ${note.type}. Must be one of: ${NOTE_TYPE_OPTIONS.join(', ')}`);
  }

  if (typeof note.content !== 'string') {
    errors.push('Note content must be a string');
  } else if (note.content.length > NOTE_MAX_CONTENT_LENGTH) {
    errors.push(
      `Note content exceeds maximum length of ${NOTE_MAX_CONTENT_LENGTH} characters (current: ${note.content.length})`
    );
  }

  if (!(note.created_at instanceof Date)) {
    errors.push('Note created_at must be a valid Date');
  } else if (isNaN(note.created_at.getTime())) {
    errors.push('Note created_at is an invalid Date');
  }

  if (!(note.updated_at instanceof Date)) {
    errors.push('Note updated_at must be a valid Date');
  } else if (isNaN(note.updated_at.getTime())) {
    errors.push('Note updated_at is an invalid Date');
  }

  return errors;
}

// ============================================================================
// Legacy Notes Conversion
// ============================================================================

/**
 * Formats a date as YYYYMMDD string for ID generation.
 * @param date - Date to format
 * @returns Formatted date string (e.g., '20260103')
 */
function formatDateForId(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Extracts the item number from an item ID.
 * @param itemId - Item ID in format REQ-YYYYMMDD-slug-XX
 * @returns Two-digit item number string (e.g., '01'), or '01' if parsing fails
 */
function extractItemNumber(itemId: string): string {
  // Match the last two digits after final hyphen
  const match = itemId.match(/-(\d{2})$/);
  return match && match[1] ? match[1] : '01';
}

/**
 * Converts old-format notes (string) to new format (Note[]).
 * Used during parsing of legacy documents that have notes as a plain string.
 *
 * @param notesString - Old string notes field
 * @param itemId - Parent item ID for generating note IDs
 * @param projectSlug - Project slug for note ID generation
 * @returns Note array (empty if notesString is empty/undefined)
 *
 * @example
 * ```typescript
 * const notes = convertLegacyNotes(
 *   'Legacy content here',
 *   'REQ-20260101-test-01',
 *   'test'
 * );
 * // Returns: [{
 * //   id: 'NOTE-20260103-test-01-01',
 * //   type: 'General',
 * //   content: 'Legacy content here',
 * //   created_at: <now>,
 * //   updated_at: <now>
 * // }]
 * ```
 */
export function convertLegacyNotes(
  notesString: string | undefined,
  itemId: string,
  projectSlug: string
): Note[] {
  if (!notesString || notesString.trim() === '') {
    return [];
  }

  // Create single "General" note with legacy content
  const now = new Date();
  const itemNumber = extractItemNumber(itemId);

  return [
    {
      id: `NOTE-${formatDateForId(now)}-${projectSlug}-${itemNumber}-01`,
      type: NOTE_TYPES.General,
      content: notesString.trim(),
      created_at: now,
      updated_at: now,
    },
  ];
}

/**
 * Type guard to check if an object is a valid Project
 */
export function isProject(obj: unknown): obj is Project {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Partial<Project>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.default_path === 'string' &&
    typeof p.enabled === 'boolean' &&
    p.created_at instanceof Date &&
    p.updated_at instanceof Date &&
    (p.repo_url === undefined || typeof p.repo_url === 'string')
  );
}

/**
 * Type guard to check if an object is a valid FieldOption
 */
export function isFieldOption(obj: unknown): obj is FieldOption {
  if (!obj || typeof obj !== 'object') return false;
  const f = obj as Partial<FieldOption>;
  const validFields: FieldName[] = ['type', 'domain', 'subdomain', 'priority', 'status', 'tags', 'feature'];
  const validScopes: FieldScope[] = ['global', 'project'];
  return (
    typeof f.id === 'string' &&
    typeof f.field === 'string' &&
    validFields.includes(f.field as FieldName) &&
    typeof f.value === 'string' &&
    typeof f.scope === 'string' &&
    validScopes.includes(f.scope as FieldScope) &&
    f.created_at instanceof Date &&
    (f.scope !== 'project' || typeof f.project_id === 'string')
  );
}

/**
 * Type guard to check if an object is a valid ItemDraft.
 * Notes must be an array of valid Note objects.
 * context is optional free-form string; subdomain is required array.
 */
export function isItemDraft(obj: unknown): obj is ItemDraft {
  if (!obj || typeof obj !== 'object') return false;
  const i = obj as Partial<ItemDraft>;
  return (
    typeof i.title === 'string' &&
    typeof i.type === 'string' &&
    Array.isArray(i.domain) &&
    i.domain.every((d) => typeof d === 'string') &&
    Array.isArray(i.subdomain) &&
    i.subdomain.every((s) => typeof s === 'string') &&
    (i.context === undefined || typeof i.context === 'string') &&
    typeof i.priority === 'string' &&
    typeof i.status === 'string' &&
    Array.isArray(i.feature) &&
    i.feature.every((f) => typeof f === 'string') &&
    Array.isArray(i.tags) &&
    i.tags.every((t) => typeof t === 'string') &&
    Array.isArray(i.notes) &&
    i.notes.every((n) => isNote(n))
  );
}

/**
 * Type guard to check if an object is a valid RequestLogItem.
 * Notes can be undefined (backward compat) or an array of valid Note objects.
 * modified_at is optional for backward compatibility (existing docs may not have it).
 * context is optional free-form string; subdomain is required array.
 */
export function isRequestLogItem(obj: unknown): obj is RequestLogItem {
  if (!obj || typeof obj !== 'object') return false;
  const i = obj as Partial<RequestLogItem>;

  // Validate notes: undefined is allowed (backward compat), or must be array of Notes
  const notesValid =
    i.notes === undefined || (Array.isArray(i.notes) && i.notes.every((n) => isNote(n)));

  // Validate feature: undefined is allowed (backward compat), or must be array of strings
  const featureValid =
    i.feature === undefined || (Array.isArray(i.feature) && i.feature.every((f) => typeof f === 'string'));

  return (
    typeof i.id === 'string' &&
    typeof i.title === 'string' &&
    typeof i.type === 'string' &&
    Array.isArray(i.domain) &&
    i.domain.every((d) => typeof d === 'string') &&
    Array.isArray(i.subdomain) &&
    i.subdomain.every((s) => typeof s === 'string') &&
    (i.context === undefined || typeof i.context === 'string') &&
    typeof i.priority === 'string' &&
    typeof i.status === 'string' &&
    featureValid &&
    Array.isArray(i.tags) &&
    i.tags.every((t) => typeof t === 'string') &&
    notesValid &&
    i.created_at instanceof Date &&
    (i.modified_at === undefined || i.modified_at instanceof Date)
  );
}

/**
 * Type guard to check if an object is a valid RequestLogDoc
 * Note: `archived` is optional for backward compatibility (defaults to false)
 */
export function isRequestLogDoc(obj: unknown): obj is RequestLogDoc {
  if (!obj || typeof obj !== 'object') return false;
  const d = obj as Partial<RequestLogDoc>;
  return (
    typeof d.doc_id === 'string' &&
    typeof d.title === 'string' &&
    typeof d.project_id === 'string' &&
    Array.isArray(d.items) &&
    d.items.every(isRequestLogItem) &&
    Array.isArray(d.items_index) &&
    Array.isArray(d.tags) &&
    d.tags.every((t) => typeof t === 'string') &&
    typeof d.item_count === 'number' &&
    d.created_at instanceof Date &&
    d.updated_at instanceof Date &&
    (d.archived === undefined || typeof d.archived === 'boolean')
  );
}
