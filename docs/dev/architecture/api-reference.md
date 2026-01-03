---
title: API Reference
description: Comprehensive documentation of MeatyCapture's Port/Adapter architecture and API capabilities
audience: developers
tags: [api, architecture, ports, adapters, storage, http]
created: 2026-01-03
updated: 2026-01-03
category: Architecture
status: active
related: [ARCHITECTURE_CODE_EXAMPLES.md, ARCHITECTURE_EXPLORATION.md]
---

# API Reference

MeatyCapture uses a **Port/Adapter pattern** to provide a flexible, UI-agnostic architecture that supports both local filesystem storage and remote HTTP-based APIs. This document provides comprehensive reference for all API capabilities.

## Quick Start

### Local Mode (Default)
```typescript
import { createAdapters, createConfigStore } from '@adapters/factory';

// Uses local filesystem by default
const adapters = await createAdapters();
const projects = await adapters.projectStore.list();
const docs = await adapters.docStore.list('/path/to/docs');
```

### API Mode
```typescript
import { createAdapters } from '@adapters/factory';

// Set environment variable or config to enable API mode
process.env.MEATYCAPTURE_API_URL = 'http://localhost:3737';

const adapters = await createAdapters();
if (adapters.mode === 'api') {
  console.log('Using API mode');
}
```

---

## Architecture Overview

### Port/Adapter Pattern

MeatyCapture implements the Port/Adapter pattern to decouple business logic from storage implementation:

- **Ports** (Interfaces): Define storage contracts in `src/core/ports/`
- **Adapters** (Implementations): Implement ports in `src/adapters/`
  - Local adapters: Filesystem and JSON configuration
  - API adapters: HTTP client for remote server

```
┌─────────────────────────┐
│   Application Code      │
│   (UI, CLI, Core)       │
└────────────┬────────────┘
             │
      ┌──────▼──────┐
      │ Port Layer  │
      │ (Interfaces)│
      └──────┬──────┘
             │
      ┌──────▼──────────────┐
      │ Adapter Factory     │
      │ (Mode Detection)    │
      └──────┬──────────────┘
             │
     ┌───────┴───────┐
     │               │
  ┌──▼──┐         ┌──▼──┐
  │Local│         │ API │
  │Adpts│         │Adpts│
  └─────┘         └─────┘
```

### Mode Detection

The adapter factory automatically detects which mode to use based on configuration priority:

1. **Environment variable** (highest priority): `MEATYCAPTURE_API_URL`
2. **Config file setting**: `api_url` in persistent configuration
3. **Default**: Local filesystem adapters

```typescript
async function getApiUrl(): Promise<string | undefined> {
  // Priority 1: Environment variable takes precedence
  const envUrl = getApiUrlFromEnv();
  if (envUrl) {
    return envUrl;
  }

  // Priority 2: Check persistent config file
  try {
    const configStore = createLocalConfigStore();
    const config = await configStore.get();
    return config.api_url;
  } catch {
    return undefined; // Config file doesn't exist
  }
}
```

---

## Core Port Interfaces

### Clock Port

Time abstraction for deterministic testing and timestamp generation.

```typescript
interface Clock {
  /**
   * Returns the current date/time
   * In production: returns actual system time
   * In tests: returns controlled fixed or incrementing time
   */
  now(): Date;
}
```

**Usage:**
```typescript
import { Clock } from '@core/ports';

// Append operations use clock for consistent timestamps
const updatedDoc = await docStore.append(path, item, clock);
```

---

### ConfigStore Port

Application configuration management (always local, never uses API).

```typescript
interface ConfigStore {
  /**
   * Get the current application configuration
   * Creates default config if it doesn't exist
   */
  get(): Promise<AppConfig>;

  /**
   * Set a configuration value
   * Automatically updates updated_at timestamp
   */
  set(key: ConfigKey, value: string): Promise<AppConfig>;

  /**
   * Check if configuration file exists
   */
  exists(): Promise<boolean>;
}
```

**Configuration Keys:**
- `default_project` - Default project ID for new documents
- `api_url` - API server URL for remote mode (e.g., `http://localhost:3737`)

**Example:**
```typescript
const configStore = createConfigStore();

// Get current config
const config = await configStore.get();
console.log(config.api_url); // 'http://localhost:3737' or undefined

// Set API URL to enable API mode
await configStore.set('api_url', 'http://api.meatycapture.com');

// Check if config file exists
const exists = await configStore.exists();
```

---

### ProjectStore Port

Project entity management for organizing request-log documents.

```typescript
interface ProjectStore {
  /**
   * List all projects in the system
   */
  list(): Promise<Project[]>;

  /**
   * Get a single project by its ID
   */
  get(id: string): Promise<Project | null>;

  /**
   * Create a new project
   * Automatically generates ID, created_at, and updated_at
   */
  create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project>;

  /**
   * Update an existing project
   * Automatically updates updated_at timestamp
   */
  update(
    id: string,
    updates: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Project>;

  /**
   * Delete a project
   * Note: Does not cascade delete field options or documents
   */
  delete(id: string): Promise<void>;
}
```

**Project Model:**
```typescript
interface Project {
  id: string;                    // Slug format (e.g., 'meatycapture')
  name: string;                  // Human-readable name
  default_path: string;          // Default filesystem path for request-logs
  repo_url?: string;             // Optional repository URL for context
  enabled: boolean;              // Whether project is active
  created_at: Date;              // Creation timestamp
  updated_at: Date;              // Last modification timestamp
}
```

**Examples:**

Local filesystem:
```typescript
const localProjectStore = createLocalProjectStore();

// Create a project
const project = await localProjectStore.create({
  name: 'MeatyCapture',
  default_path: '/Users/me/.meatycapture/meatycapture',
  repo_url: 'https://github.com/miethe/meatycapture',
  enabled: true,
});
// → { id: 'meatycapture', name: 'MeatyCapture', ... }

// List all projects
const projects = await localProjectStore.list();
// → [{ id: 'meatycapture', ... }, { id: 'other-project', ... }]

// Get a specific project
const project = await localProjectStore.get('meatycapture');
// → { id: 'meatycapture', ... } or null

// Update a project
const updated = await localProjectStore.update('meatycapture', {
  enabled: false,
});

// Delete a project
await localProjectStore.delete('meatycapture');
```

HTTP API:
```typescript
const client = new HttpClient({ baseUrl: 'http://localhost:3737' });
const apiProjectStore = new ApiProjectStore(client);

// Same interface as local adapters
const projects = await apiProjectStore.list();
```

---

### FieldCatalogStore Port

Field option management with global and project-specific scoping.

```typescript
interface FieldCatalogStore {
  /**
   * Get all global field options
   * Returns only options with scope='global'
   */
  getGlobal(): Promise<FieldOption[]>;

  /**
   * Get effective field options for a specific project
   * Returns merged set: global options + project-specific options
   */
  getForProject(projectId: string): Promise<FieldOption[]>;

  /**
   * Get options for a specific field, optionally filtered by project
   */
  getByField(field: FieldName, projectId?: string): Promise<FieldOption[]>;

  /**
   * Add a new field option (global or project-scoped)
   * Automatically generates ID and created_at
   */
  addOption(option: Omit<FieldOption, 'id' | 'created_at'>): Promise<FieldOption>;

  /**
   * Remove a field option by ID
   */
  removeOption(id: string): Promise<void>;
}
```

**FieldOption Model:**
```typescript
interface FieldOption {
  id: string;           // Unique identifier
  field: FieldName;     // Field name: 'type' | 'domain' | 'context' | 'priority' | 'status' | 'tags'
  value: string;        // Option value (e.g., 'enhancement', 'bug')
  scope: FieldScope;    // 'global' or 'project'
  project_id?: string;  // Required when scope='project'
  created_at: Date;     // Creation timestamp
}
```

**Field Resolution:**

The effective field options for a project are determined by merging:
- Global options (scope='global') - available to all projects
- Project-specific options (scope='project' and matching project_id)

```typescript
// Example: Get 'type' field options for 'meatycapture' project
const types = await fieldStore.getByField('type', 'meatycapture');
// Returns: global 'type' options + 'meatycapture' project-specific options
```

**Examples:**

```typescript
const fieldStore = createFieldCatalogStore();

// Get all global options
const global = await fieldStore.getGlobal();
// → [
//     { field: 'type', value: 'enhancement', scope: 'global', ... },
//     { field: 'type', value: 'bug', scope: 'global', ... },
//     ...
//   ]

// Get effective options for a project (global + project)
const projectOptions = await fieldStore.getForProject('meatycapture');
// → [
//     { field: 'type', value: 'enhancement', scope: 'global', ... },
//     { field: 'type', value: 'bug', scope: 'global', ... },
//     { field: 'priority', value: 'urgent', scope: 'project', project_id: 'meatycapture', ... },
//   ]

// Get options for a specific field
const priorityOptions = await fieldStore.getByField('priority');
// → [{ field: 'priority', value: 'low', ... }, { field: 'priority', value: 'medium', ... }, ...]

// Get options for a field + project
const projectPriorities = await fieldStore.getByField('priority', 'meatycapture');
// → global priorities + meatycapture-specific priorities

// Add a global option
await fieldStore.addOption({
  field: 'type',
  value: 'spike',
  scope: 'global',
});

// Add a project-specific option
await fieldStore.addOption({
  field: 'priority',
  value: 'urgent',
  scope: 'project',
  project_id: 'meatycapture',
});

// Remove an option
await fieldStore.removeOption('priority-urgent-1701619200000');
```

---

### DocStore Port

Request-log document operations with automatic tag aggregation and backup management.

```typescript
interface DocStore {
  /**
   * List all request-log documents in a directory
   * Scans for markdown files with request-log frontmatter
   */
  list(directory: string): Promise<DocMeta[]>;

  /**
   * Read and parse a request-log document
   */
  read(path: string): Promise<RequestLogDoc>;

  /**
   * Write/overwrite a complete request-log document
   * Creates backup before write operation
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
   */
  append(path: string, item: ItemDraft, clock: Clock): Promise<RequestLogDoc>;

  /**
   * Create a backup copy of a file before modification
   * Backup filename: original.bak (overwrites existing .bak)
   */
  backup(path: string): Promise<string>;

  /**
   * Check if a path exists and is writable
   */
  isWritable(path: string): Promise<boolean>;
}
```

**DocMeta Model (for list operations):**
```typescript
interface DocMeta {
  path: string;        // Filesystem path to the document
  doc_id: string;      // Document ID (e.g., 'REQ-20251203-capture-app')
  title: string;       // Document title
  item_count: number;  // Total number of items
  updated_at: Date;    // Last modification timestamp
  archived: boolean;   // Whether document is archived
}
```

**RequestLogDoc Model (full document):**
```typescript
interface RequestLogDoc {
  doc_id: string;            // Document ID
  title: string;             // Document title
  project_id: string;        // Associated project ID
  items: RequestLogItem[];   // All items in document
  items_index: ItemIndexEntry[];  // Quick reference index
  tags: string[];            // Aggregated unique tags (sorted)
  item_count: number;        // Total number of items
  created_at: Date;          // Creation timestamp
  updated_at: Date;          // Last modification timestamp
  archived: boolean;         // Whether document is archived
}
```

**ItemDraft Model (for append operations):**
```typescript
interface ItemDraft {
  title: string;      // Item title/summary
  type: string;       // Item type (enhancement, bug, idea, etc.)
  domain: string[];   // Domain/area - supports multiple selections
  context: string[];  // Additional context - supports multiple selections
  priority: string;   // Priority level
  status: string;     // Current status
  tags: string[];     // Array of tag strings
  notes: string;      // Freeform notes/description
}
```

**Examples:**

```typescript
const docStore = createFsDocStore();

// List all documents in a directory
const docs = await docStore.list('/path/to/docs');
// → [
//     { doc_id: 'REQ-20251203-project', title: 'Requests', item_count: 5, ... },
//     { doc_id: 'REQ-20251204-project', title: 'Requests', item_count: 2, ... },
//   ]

// Read a document
const doc = await docStore.read('/path/to/docs/REQ-20251203-project.md');
// → {
//     doc_id: 'REQ-20251203-project',
//     title: 'Requests',
//     items: [{ id: 'REQ-20251203-project-01', title: 'Fix auth', ... }, ...],
//     tags: ['auth', 'security'],
//     ...
//   }

// Append an item to a document
const clock = { now: () => new Date() };
const updated = await docStore.append('/path/to/docs/REQ-20251203-project.md', {
  title: 'New Feature Request',
  type: 'enhancement',
  domain: ['web', 'api'],
  context: ['ux'],
  priority: 'medium',
  status: 'triage',
  tags: ['feature', 'enhancement'],
  notes: 'User requested ability to export data',
}, clock);
// Server automatically:
// - Generates item ID (REQ-20251203-project-06)
// - Increments item_count
// - Merges tags (unique, sorted)
// - Updates items_index
// - Sets updated_at

// Write a complete document
await docStore.write('/path/to/docs/REQ-20251203-project.md', {
  doc_id: 'REQ-20251203-project',
  title: 'Requests',
  project_id: 'meatycapture',
  items: [...],
  items_index: [...],
  tags: ['auth', 'security', 'feature'],
  item_count: 3,
  created_at: new Date(),
  updated_at: new Date(),
  archived: false,
});

// Create a backup
const backupPath = await docStore.backup('/path/to/docs/REQ-20251203-project.md');
// → '/path/to/docs/REQ-20251203-project.md.bak'

// Check if path is writable
const isWritable = await docStore.isWritable('/path/to/docs/REQ-20251203-project.md');
// → true or false
```

---

## HTTP API Reference

When using API mode, the HTTP adapters communicate with a MeatyCapture API server using RESTful endpoints.

### Configuration

```typescript
const client = new HttpClient({
  baseUrl: 'http://localhost:3737',    // API server URL
  authToken: 'my-bearer-token',         // Optional authentication token
  timeout: 30000,                        // Request timeout (ms)
  retries: 3,                            // Number of retry attempts
});
```

**Environment Variables:**
- `MEATYCAPTURE_API_URL` - Base URL for API (overrides config file)
- `MEATYCAPTURE_AUTH_TOKEN` - Bearer token for authentication

### Endpoints

#### Project Endpoints

**GET /api/projects**
- List all projects
- Returns: Array of Project objects
- No query parameters required

```typescript
const projects = await client.get<Project[]>('/api/projects');
```

**GET /api/projects/:id**
- Get a single project by ID
- Returns: Project object or 404 NotFoundError
- Path parameters: `id` (project slug)

```typescript
const project = await client.get<Project>('/api/projects/meatycapture');
```

**POST /api/projects**
- Create a new project
- Server generates: id (from name), created_at, updated_at
- Body: Omit<Project, 'id' | 'created_at' | 'updated_at'>
- Returns: Created Project object with all fields

```typescript
const newProject = await client.post<Project>('/api/projects', undefined, {
  name: 'My Project',
  default_path: '/path/to/docs',
  repo_url: 'https://github.com/user/repo',
  enabled: true,
});
```

**PATCH /api/projects/:id**
- Update an existing project
- Server updates: updated_at
- Path parameters: `id` (project slug)
- Body: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>
- Returns: Updated Project object

```typescript
const updated = await client.patch<Project>('/api/projects/my-project', undefined, {
  enabled: false,
  default_path: '/new/path',
});
```

**DELETE /api/projects/:id**
- Delete a project
- Path parameters: `id` (project slug)
- Returns: void (204 No Content)
- Note: Does not cascade delete field options or documents

```typescript
await client.delete<void>('/api/projects/old-project');
```

#### Field Catalog Endpoints

**GET /api/fields/global**
- Get all global field options
- Returns: Array of FieldOption objects with scope='global'

```typescript
const globalOptions = await client.get<FieldOption[]>('/api/fields/global');
```

**GET /api/fields/project/:projectId**
- Get effective field options for a project
- Returns: Array of FieldOption objects (global + project-specific)
- Path parameters: `projectId` (project slug)

```typescript
const projectOptions = await client.get<FieldOption[]>('/api/fields/project/meatycapture');
```

**GET /api/fields/by-field/:field**
- Get options for a specific field
- Query parameters:
  - `project_id` (optional) - If provided, returns global + project-specific options
- Path parameters: `field` ('type', 'domain', 'context', 'priority', 'status', 'tags')
- Returns: Array of FieldOption objects for the specified field

```typescript
// Get global 'type' options
const types = await client.get<FieldOption[]>('/api/fields/by-field/type');

// Get 'priority' options for a specific project
const priorities = await client.get<FieldOption[]>('/api/fields/by-field/priority', {
  project_id: 'my-project',
});
```

**POST /api/fields**
- Add a new field option
- Server generates: id, created_at
- Body: Omit<FieldOption, 'id' | 'created_at'>
- Returns: Created FieldOption object with all fields

```typescript
// Add global option
const globalType = await client.post<FieldOption>('/api/fields', undefined, {
  field: 'type',
  value: 'spike',
  scope: 'global',
});

// Add project-specific option
const projectPriority = await client.post<FieldOption>('/api/fields', undefined, {
  field: 'priority',
  value: 'urgent',
  scope: 'project',
  project_id: 'my-project',
});
```

**DELETE /api/fields/:id**
- Remove a field option
- Path parameters: `id` (field option ID)
- Returns: void (204 No Content)

```typescript
await client.delete<void>('/api/fields/priority-urgent-1701619200000');
```

#### Document Endpoints

**GET /api/docs**
- List all request-log documents in a directory
- Query parameters:
  - `directory` (required) - Directory path to scan
- Returns: Array of DocMeta objects (sorted by updated_at desc)
- Errors:
  - 400 ValidationError - Invalid directory parameter
  - 500 StorageError - Server fails to read directory

```typescript
const docs = await client.get<DocMeta[]>('/api/docs', {
  directory: '/path/to/docs',
});
```

**GET /api/docs/:docId**
- Read and parse a request-log document
- Query parameters:
  - `path` (required) - File path to the document
- Path parameters: `docId` (document ID)
- Returns: RequestLogDoc object
- Errors:
  - 400 ValidationError - Invalid path parameter
  - 404 NotFoundError - Document not found
  - 500 StorageError - Server fails to read or parse

```typescript
const doc = await client.get<RequestLogDoc>('/api/docs/REQ-20251203-project', {
  path: '/path/to/REQ-20251203-project.md',
});
```

**POST /api/docs/:docId**
- Write/overwrite a complete request-log document
- Server creates backup before write
- Query parameters:
  - `path` (required) - File path for the document
- Path parameters: `docId` (document ID)
- Body: Complete RequestLogDoc object
- Returns: { success: boolean; doc_id: string; path: string }
- Errors:
  - 400 ValidationError - Invalid path or doc
  - 403 PermissionDeniedError - Path not writable
  - 500 StorageError - Server fails to write

```typescript
await client.post<{ success: boolean; doc_id: string; path: string }>(
  '/api/docs/REQ-20251203-project',
  { path: '/path/to/REQ-20251203-project.md' },
  {
    doc_id: 'REQ-20251203-project',
    title: 'Requests',
    project_id: 'meatycapture',
    items: [...],
    items_index: [...],
    tags: ['auth', 'security'],
    item_count: 3,
    created_at: new Date(),
    updated_at: new Date(),
    archived: false,
  }
);
```

**PATCH /api/docs/:docId/items**
- Append a new item to an existing document
- Server automatically:
  - Generates item ID with incremented counter
  - Updates item_count and items_index
  - Aggregates tags (unique sorted merge)
  - Sets updated_at timestamp
  - Creates backup before modification
- Query parameters:
  - `path` (required) - File path to the document
- Path parameters: `docId` (document ID)
- Body: ItemDraft object
- Returns: Updated RequestLogDoc object
- Note: Clock parameter NOT sent; server uses its own clock for timestamp consistency
- Errors:
  - 400 ValidationError - Invalid path or item
  - 404 NotFoundError - Document not found
  - 500 StorageError - Server fails to append or write

```typescript
const updated = await client.patch<RequestLogDoc>(
  '/api/docs/REQ-20251203-project/items',
  { path: '/path/to/REQ-20251203-project.md' },
  {
    title: 'New Feature Request',
    type: 'enhancement',
    domain: ['web', 'api'],
    context: ['ux'],
    priority: 'medium',
    status: 'triage',
    tags: ['feature', 'enhancement'],
    notes: 'User requested ability to export data',
  }
);
// Server automatically generates item ID and updates metadata
```

**POST /api/docs/:docId/backup**
- Create a backup copy of a file
- Backup filename: `{original}.bak` (overwrites existing .bak)
- Query parameters:
  - `path` (required) - File path to backup
- Path parameters: `docId` (document ID)
- Returns: { success: boolean; backup_path: string }
- Errors:
  - 400 ValidationError - Invalid path
  - 404 NotFoundError - Document not found
  - 500 StorageError - Server fails to create backup

```typescript
const result = await client.post<{ success: boolean; backup_path: string }>(
  '/api/docs/REQ-20251203-project/backup',
  { path: '/path/to/REQ-20251203-project.md' }
);
// → { success: true, backup_path: '/path/to/REQ-20251203-project.md.bak' }
```

**HEAD /api/docs/:docId**
- Check if a path exists and is writable
- Query parameters:
  - `path` (required) - File path to check
- Path parameters: `docId` (document ID)
- Returns: true (200 OK) or false (403 Forbidden)
- Errors:
  - 400 ValidationError - Invalid path
  - Other errors thrown as ApiError

```typescript
const isWritable = await client.head('/api/docs/REQ-20251203-project', {
  path: '/path/to/REQ-20251203-project.md',
});
```

---

## Error Handling

### Error Hierarchy

All API errors extend from `ApiError` and are mapped from HTTP status codes:

```typescript
class ApiError extends Error {
  status?: number;
  code?: string;
  cause?: Error;
}

class NetworkError extends ApiError       // Network failures, timeouts
class ValidationError extends ApiError    // 400 Bad Request
class AuthenticationError extends ApiError // 401 Unauthorized
class PermissionDeniedError extends ApiError // 403 Forbidden
class NotFoundError extends ApiError      // 404 Not Found
class ConflictError extends ApiError      // 409 Conflict
class StorageError extends ApiError       // 500+ Server errors
class TimeoutError extends ApiError       // Request timeout
```

### Error Handling Examples

```typescript
import {
  ApiError,
  NetworkError,
  ValidationError,
  NotFoundError,
  PermissionDeniedError,
} from '@adapters/api-client/types';

try {
  const doc = await docStore.read('/path/to/doc.md');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Document not found');
  } else if (error instanceof ValidationError) {
    console.error('Invalid path parameter');
  } else if (error instanceof NetworkError) {
    console.error('Network connection failed');
  } else if (error instanceof PermissionDeniedError) {
    console.error('Path is not writable');
  } else if (error instanceof ApiError) {
    console.error(`API error: ${error.message} (${error.status})`);
  }
}
```

### Retry Logic

The HttpClient implements automatic retry logic:

- **Retries:** Up to 3 attempts by default (configurable)
- **Retry Conditions:**
  - Network failures (fetch throws)
  - 5xx server errors (500, 502, 503, 504)
- **No Retry:** 4xx client errors (validation, auth, not found, etc.)
- **Backoff:** Exponential backoff (1s, 2s, 4s)
- **Timeout:** 30 seconds by default (configurable)

```typescript
const client = new HttpClient({
  baseUrl: 'http://localhost:3737',
  timeout: 60000,  // 60 second timeout
  retries: 5,      // 5 retry attempts
});
```

---

## Adapter Factory

The `createAdapters()` function is the primary entry point for getting storage adapters:

```typescript
import { createAdapters, createConfigStore } from '@adapters/factory';

// Get adapters based on current configuration
const adapters = await createAdapters();
console.log(adapters.mode); // 'api' or 'local'

// Use the adapters
const projects = await adapters.projectStore.list();
const fields = await adapters.fieldStore.getGlobal();
const docs = await adapters.docStore.list('/path/to/docs');
```

**Adapter Collection:**
```typescript
interface Adapters {
  projectStore: ProjectStore;     // Project storage (API or local)
  fieldStore: FieldCatalogStore;  // Field catalog (API or local)
  docStore: DocStore;             // Document storage (API or local)
  mode: 'api' | 'local';          // Active adapter mode
}
```

### Mode Detection Flow

```
┌─────────────────────────────────┐
│ Check MEATYCAPTURE_API_URL env  │
│ (Priority 1: highest)           │
└─────────┬───────────────────────┘
          │
      Yes │ Use API Mode
          │
      No  │
          ▼
┌─────────────────────────────────┐
│ Check config file api_url       │
│ (Priority 2)                    │
└─────────┬───────────────────────┘
          │
      Yes │ Use API Mode
          │
      No  │
          ▼
┌─────────────────────────────────┐
│ Use Local Adapters              │
│ (Priority 3: default)           │
└─────────────────────────────────┘
```

---

## Configuration Store

The `ConfigStore` is always local (never uses API) because it stores the `api_url` configuration itself:

```typescript
import { createConfigStore } from '@adapters/factory';

const configStore = createConfigStore();

// Get current configuration
const config = await configStore.get();

// Set configuration value
await configStore.set('api_url', 'http://localhost:3737');

// Check if config exists
const exists = await configStore.exists();
```

**Default Config Location:** `~/.meatycapture/config.json`

**Config Structure:**
```json
{
  "version": "1.0.0",
  "default_project": "meatycapture",
  "api_url": "http://localhost:3737",
  "created_at": "2025-12-03T10:00:00Z",
  "updated_at": "2025-12-03T11:00:00Z"
}
```

---

## Data Models

### AppConfig

```typescript
interface AppConfig {
  version: string;           // Semver format
  default_project?: string;  // Default project ID for new documents
  api_url?: string;          // API server URL for remote mode
  created_at: Date;          // Creation timestamp
  updated_at: Date;          // Last modification timestamp
}
```

### Project

```typescript
interface Project {
  id: string;                // Slug format (e.g., 'meatycapture')
  name: string;              // Human-readable name
  default_path: string;      // Default filesystem path
  repo_url?: string;         // Optional repository URL
  enabled: boolean;          // Whether project is active
  created_at: Date;          // Creation timestamp
  updated_at: Date;          // Last modification timestamp
}
```

### FieldOption

```typescript
interface FieldOption {
  id: string;                // Unique identifier
  field: FieldName;          // 'type' | 'domain' | 'context' | 'priority' | 'status' | 'tags'
  value: string;             // Option value
  scope: FieldScope;         // 'global' | 'project'
  project_id?: string;       // Required when scope='project'
  created_at: Date;          // Creation timestamp
}

type FieldName = 'type' | 'domain' | 'context' | 'priority' | 'status' | 'tags';
type FieldScope = 'global' | 'project';
```

### ItemDraft

```typescript
interface ItemDraft {
  title: string;             // Item title/summary
  type: string;              // Item type
  domain: string[];          // Domain/area - multiple selections
  context: string[];         // Additional context - multiple selections
  priority: string;          // Priority level
  status: string;            // Current status
  tags: string[];            // Array of tag strings
  notes: string;             // Freeform notes
}
```

### RequestLogItem

```typescript
interface RequestLogItem {
  id: string;                // Item ID (e.g., 'REQ-20251203-project-01')
  title: string;
  type: string;
  domain: string[];
  context: string[];
  priority: string;
  status: string;
  tags: string[];
  notes: string;
  created_at: Date;
  modified_at?: Date;        // Optional for backward compatibility
}
```

### RequestLogDoc

```typescript
interface RequestLogDoc {
  doc_id: string;            // Document ID
  title: string;
  project_id: string;
  items: RequestLogItem[];
  items_index: ItemIndexEntry[];
  tags: string[];            // Aggregated unique tags (sorted)
  item_count: number;
  created_at: Date;
  updated_at: Date;
  archived: boolean;
}

interface ItemIndexEntry {
  id: string;
  type: string;
  title: string;
}
```

### DocMeta

```typescript
interface DocMeta {
  path: string;
  doc_id: string;
  title: string;
  item_count: number;
  updated_at: Date;
  archived: boolean;
}
```

---

## Default Field Options

Global field options available to all projects:

```typescript
const DEFAULT_FIELD_OPTIONS = {
  type: ['enhancement', 'bug', 'idea', 'task', 'question'],
  priority: ['low', 'medium', 'high', 'critical'],
  status: ['triage', 'backlog', 'planned', 'in-progress', 'done', 'wontfix'],
};
```

**Other fields** (`domain`, `context`, `tags`) can have custom options added:
- Either globally (via `scope: 'global'`)
- Or per-project (via `scope: 'project'` with `project_id`)

---

## Future Considerations

### Item-Level Operations (Not Yet Implemented)

The current API supports document-level operations. Future versions may add:

- **GET /api/docs/:docId/items/:itemId** - Get a specific item
- **PATCH /api/docs/:docId/items/:itemId** - Update a specific item
- **DELETE /api/docs/:docId/items/:itemId** - Delete a specific item

These would enable:
- Updating single items without reading/writing entire documents
- Deleting specific items from documents
- More granular change tracking and conflict resolution

### Streaming Operations

Large documents may benefit from:
- Streaming list responses (pagination)
- Streaming document reads (chunked)
- Progressive item append with streaming responses

### Caching Layer

Performance optimizations for repeated queries:
- Client-side caching of field options
- ETag-based cache invalidation
- Cache TTL configuration

### Concurrent Edit Resolution

Current MVP uses "last-write wins". Future versions may support:
- Conflict detection (compare timestamps/hashes)
- Merge strategies (combine changes from parallel edits)
- Operation-based conflict resolution (CRDTs)

---

## Migration Path: Local to API

To migrate from local to API mode:

```typescript
// 1. Start local
const adapters = await createAdapters();
// adapters.mode === 'local'

// 2. Configure API URL
const configStore = createConfigStore();
await configStore.set('api_url', 'http://api.meatycapture.com');

// 3. On next createAdapters() call, uses API
const adapters = await createAdapters();
// adapters.mode === 'api'
```

Or use environment variable for temporary override:

```bash
MEATYCAPTURE_API_URL=http://localhost:3737 npm run dev
```

---

## See Also

- [Architecture Exploration](ARCHITECTURE_EXPLORATION.md) - Deep dive into design decisions
- [Architecture Code Examples](ARCHITECTURE_CODE_EXAMPLES.md) - Practical implementation examples
- [CLI Design Patterns](CLI_DESIGN_PATTERNS.md) - CLI-specific patterns
