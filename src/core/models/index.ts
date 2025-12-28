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
 */
export type FieldName = 'type' | 'domain' | 'context' | 'priority' | 'status' | 'tags';

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
  /** Domain/area (web, api, mobile, etc.) */
  domain: string;
  /** Additional context information */
  context: string;
  /** Priority level (low, medium, high, critical) */
  priority: string;
  /** Current status (triage, backlog, in-progress, etc.) */
  status: string;
  /** Array of tag strings for categorization */
  tags: string[];
  /** Freeform notes/description with problem/goal details */
  notes: string;
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
  /** Domain/area (web, api, mobile, etc.) */
  domain: string;
  /** Additional context information */
  context: string;
  /** Priority level (low, medium, high, critical) */
  priority: string;
  /** Current status (triage, backlog, in-progress, etc.) */
  status: string;
  /** Array of tag strings for categorization */
  tags: string[];
  /** Freeform notes/description with problem/goal details */
  notes: string;
  /** Timestamp when item was created */
  created_at: Date;
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
  const validFields: FieldName[] = ['type', 'domain', 'context', 'priority', 'status', 'tags'];
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
 * Type guard to check if an object is a valid ItemDraft
 */
export function isItemDraft(obj: unknown): obj is ItemDraft {
  if (!obj || typeof obj !== 'object') return false;
  const i = obj as Partial<ItemDraft>;
  return (
    typeof i.title === 'string' &&
    typeof i.type === 'string' &&
    typeof i.domain === 'string' &&
    typeof i.context === 'string' &&
    typeof i.priority === 'string' &&
    typeof i.status === 'string' &&
    Array.isArray(i.tags) &&
    i.tags.every((t) => typeof t === 'string') &&
    typeof i.notes === 'string'
  );
}

/**
 * Type guard to check if an object is a valid RequestLogItem
 */
export function isRequestLogItem(obj: unknown): obj is RequestLogItem {
  if (!obj || typeof obj !== 'object') return false;
  const i = obj as Partial<RequestLogItem>;
  return (
    typeof i.id === 'string' &&
    typeof i.title === 'string' &&
    typeof i.type === 'string' &&
    typeof i.domain === 'string' &&
    typeof i.context === 'string' &&
    typeof i.priority === 'string' &&
    typeof i.status === 'string' &&
    Array.isArray(i.tags) &&
    i.tags.every((t) => typeof t === 'string') &&
    typeof i.notes === 'string' &&
    i.created_at instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid RequestLogDoc
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
    d.updated_at instanceof Date
  );
}
