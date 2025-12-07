/**
 * Storage Port Interfaces
 *
 * Port/Adapter pattern for storage abstraction:
 * - Clock: Time abstraction for deterministic testing
 * - ProjectStore: Project CRUD operations
 * - FieldCatalogStore: Field option catalog management (global + project-scoped)
 * - DocStore: Request-log document read/write/append operations
 *
 * Implementations live in adapters/ (fs-local, config-local)
 */

import type { Project, FieldOption, FieldName, ItemDraft, RequestLogDoc } from '@core/models';

/**
 * Clock abstraction for time-dependent operations
 * Enables deterministic testing by injecting controlled time values
 */
export interface Clock {
  /**
   * Returns the current date/time
   * In production: returns actual system time
   * In tests: returns controlled fixed or incrementing time
   */
  now(): Date;
}

/**
 * Project store interface
 * Manages project entities and their lifecycle
 */
export interface ProjectStore {
  /**
   * List all projects in the system
   * @returns Array of all projects (enabled and disabled)
   */
  list(): Promise<Project[]>;

  /**
   * Get a single project by its ID
   * @param id - Project identifier (slug format)
   * @returns Project if found, null otherwise
   */
  get(id: string): Promise<Project | null>;

  /**
   * Create a new project
   * Automatically generates ID, created_at, and updated_at
   * @param project - Project data without generated fields
   * @returns Newly created project with all fields populated
   */
  create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project>;

  /**
   * Update an existing project
   * Automatically updates updated_at timestamp
   * @param id - Project identifier
   * @param updates - Partial project data to merge
   * @returns Updated project
   * @throws Error if project not found
   */
  update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Project>;

  /**
   * Delete a project
   * Note: Does not cascade delete field options or documents
   * @param id - Project identifier
   * @throws Error if project not found
   */
  delete(id: string): Promise<void>;
}

/**
 * Field catalog store interface
 * Manages field options with global and project-specific scoping
 * Resolution: effective options = global + project-specific additions
 */
export interface FieldCatalogStore {
  /**
   * Get all global field options
   * Returns only options with scope='global'
   * @returns Array of global field options across all fields
   */
  getGlobal(): Promise<FieldOption[]>;

  /**
   * Get effective field options for a specific project
   * Returns merged set: global options + project-specific options
   * @param projectId - Project identifier
   * @returns Array of all applicable field options for the project
   */
  getForProject(projectId: string): Promise<FieldOption[]>;

  /**
   * Get options for a specific field, optionally filtered by project
   * @param field - Field name (type, domain, context, priority, status, tags)
   * @param projectId - Optional project ID for project-specific filtering
   * @returns Array of field options for the specified field
   */
  getByField(field: FieldName, projectId?: string): Promise<FieldOption[]>;

  /**
   * Add a new field option (global or project-scoped)
   * Automatically generates ID and created_at
   * @param option - Field option data without generated fields
   * @returns Newly created field option with all fields populated
   * @throws Error if project_id required but missing (when scope='project')
   */
  addOption(option: Omit<FieldOption, 'id' | 'created_at'>): Promise<FieldOption>;

  /**
   * Remove a field option by ID
   * @param id - Field option identifier
   * @throws Error if option not found
   */
  removeOption(id: string): Promise<void>;
}

/**
 * Document metadata for listing operations
 * Lightweight representation without full item details
 */
export interface DocMeta {
  /** Filesystem path to the document */
  path: string;
  /** Document identifier (e.g., 'REQ-20251203-capture-app') */
  doc_id: string;
  /** Document title */
  title: string;
  /** Total number of items in the document */
  item_count: number;
  /** Timestamp of last modification */
  updated_at: Date;
}

/**
 * Request-log document store interface
 * Handles request-log markdown file operations with automatic tag aggregation
 * and index management
 */
export interface DocStore {
  /**
   * List all request-log documents in a directory
   * Scans for markdown files with request-log frontmatter
   * @param directory - Directory path to scan
   * @returns Array of document metadata (sorted by updated_at desc)
   */
  list(directory: string): Promise<DocMeta[]>;

  /**
   * Read and parse a request-log document
   * @param path - File path to the document
   * @returns Parsed document with all items
   * @throws Error if file not found or parse failure
   */
  read(path: string): Promise<RequestLogDoc>;

  /**
   * Write/overwrite a complete request-log document
   * Creates backup before write operation
   * Serializes to markdown format with frontmatter and items
   * @param path - File path for the document
   * @param doc - Complete document to write
   * @throws Error if write fails or path not writable
   */
  write(path: string, doc: RequestLogDoc): Promise<void>;

  /**
   * Append a new item to an existing document
   * Automatically:
   * - Generates item ID with incremented counter
   * - Updates item_count
   * - Aggregates tags (unique sorted merge)
   * - Updates items_index
   * - Sets updated_at timestamp
   * - Creates backup before modification
   * @param path - File path to the document
   * @param item - Item draft to append
   * @param clock - Clock for timestamp generation
   * @returns Updated document after append
   * @throws Error if document not found or append fails
   */
  append(path: string, item: ItemDraft, clock: Clock): Promise<RequestLogDoc>;

  /**
   * Create a backup copy of a file before modification
   * Backup filename: original.bak (overwrites existing .bak)
   * @param path - File path to backup
   * @returns Path to the backup file
   * @throws Error if backup creation fails
   */
  backup(path: string): Promise<string>;

  /**
   * Check if a path exists and is writable
   * Validates:
   * - Directory exists (for new files)
   * - File is writable (for existing files)
   * - No permission issues
   * @param path - File path to check
   * @returns true if path is writable, false otherwise
   */
  isWritable(path: string): Promise<boolean>;
}
