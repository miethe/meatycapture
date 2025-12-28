# MeatyCapture Architecture Exploration

**Date:** December 27, 2025
**Scope:** Understanding the headless core pattern, port/adapter architecture, and reusability for CLI development
**Level:** Medium Depth

---

## Executive Summary

MeatyCapture follows a **headless core + adapter** architecture that cleanly separates business logic from storage and UI implementations. The core domain logic is UI-agnostic and storage-agnostic, making it highly reusable across different platforms (web, CLI, desktop, API).

The existing CLI (`src/cli/index.ts`) already demonstrates how the headless core can be consumed without UI, providing a solid foundation for CLI feature expansion.

---

## 1. Core Domain Layer (`src/core/`)

### 1.1 Models (`src/core/models/index.ts`)

**Purpose:** Type-safe domain entities with runtime validation

**Key Entities:**

| Entity | Purpose | Fields |
|--------|---------|--------|
| `Project` | Project configuration | id, name, default_path, repo_url?, enabled, created_at, updated_at |
| `FieldOption` | Dropdown/select options | id, field, value, scope (global/project), project_id?, created_at |
| `ItemDraft` | Form input (temporary) | title, type, domain, context, priority, status, tags[], notes |
| `RequestLogItem` | Persisted item | ItemDraft + id, created_at |
| `RequestLogDoc` | Complete document | doc_id, title, project_id, items[], items_index[], tags[], item_count, created_at, updated_at |

**Key Features:**

- Type guards (e.g., `isProject()`, `isItemDraft()`) for runtime validation
- `DEFAULT_FIELD_OPTIONS` constant for built-in options (type, priority, status)
- Field aggregation metadata (items_index, tags, item_count)

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/core/models/index.ts`

### 1.2 Validation (`src/core/validation/index.ts`)

**Purpose:** ID generation, validation, and format normalization

**Key Functions:**

```typescript
// ID Generation
generateDocId(projectSlug: string, date?: Date): string
// Returns: REQ-YYYYMMDD-<project-slug>
// Example: REQ-20251203-meatycapture

generateItemId(docId: string, itemNumber: number): string
// Returns: REQ-YYYYMMDD-<project-slug>-XX (zero-padded)
// Example: REQ-20251203-meatycapture-01

// ID Parsing & Validation
parseDocId(docId: string): ParsedDocId | null
parseItemId(itemId: string): ParsedItemId | null
isValidDocId(docId: string): boolean
isValidItemId(itemId: string): boolean
getNextItemNumber(existingItems: Array<{id: string}>): number

// Text Normalization
slugify(text: string): string
// 'My Project Name' -> 'my-project-name'

sanitizePathSegment(text: string): string
// Security-hardened version of slugify
// Prevents path traversal attacks
```

**Design Patterns:**
- Null-safe parsing (returns null on invalid format)
- Date extraction from ID format (YYYYMMDD)
- Item number auto-increment logic (finds max, returns max+1)

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/core/validation/index.ts`

### 1.3 Serializer (`src/core/serializer/index.ts`)

**Purpose:** Markdown I/O with YAML frontmatter

**Format:**
```yaml
---
type: request-log
doc_id: REQ-20251203-capture-app
title: Capture App Request Log
project_id: capture-app
item_count: 2
tags: [tag1, tag2]
items_index:
  - id: REQ-20251203-capture-app-01
    type: enhancement
    title: Add dark mode toggle
created_at: 2025-12-03T10:00:00Z
updated_at: 2025-12-03T14:30:00Z
---

## REQ-20251203-capture-app-01 - Add dark mode toggle

**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** ux, enhancement
**Context:** Settings page redesign

### Problem/Goal
Users need dark mode for better readability at night.
```

**Key Functions:**

```typescript
serialize(doc: RequestLogDoc): string
// RequestLogDoc -> Markdown with YAML frontmatter

parse(content: string): RequestLogDoc
// Markdown -> RequestLogDoc
// Validates required fields, parses dates, extracts items

aggregateTags(items: RequestLogItem[]): string[]
// Collects unique tags from all items, returns sorted array

updateItemsIndex(items: RequestLogItem[]): ItemIndexEntry[]
// Creates quick-reference index for frontmatter
```

**Implementation Notes:**
- Custom YAML parser (no external deps) - supports:
  - Simple key: value pairs
  - Array notation: `[item1, item2]`
  - Nested lists (items_index)
  - Basic type inference (numbers, booleans, strings)
- Item parsing via regex (extracts metadata from markdown structure)
- Date handling: ISO 8601 for storage, YYYYMMDD extraction from IDs

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/core/serializer/index.ts`

### 1.4 Ports (Interfaces) (`src/core/ports/index.ts`)

**Purpose:** Define storage contracts (repository pattern)

**Key Interfaces:**

#### Clock Port
```typescript
interface Clock {
  now(): Date  // Enables deterministic testing
}
```

#### ProjectStore Port
```typescript
interface ProjectStore {
  list(): Promise<Project[]>
  get(id: string): Promise<Project | null>
  create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project>
  update(id: string, updates: Partial<...>): Promise<Project>
  delete(id: string): Promise<void>
}
```

#### FieldCatalogStore Port
```typescript
interface FieldCatalogStore {
  getGlobal(): Promise<FieldOption[]>
  getForProject(projectId: string): Promise<FieldOption[]>  // global + project-specific
  getByField(field: FieldName, projectId?: string): Promise<FieldOption[]>
  addOption(option: Omit<FieldOption, 'id' | 'created_at'>): Promise<FieldOption>
  removeOption(id: string): Promise<void>
}
```

#### DocStore Port
```typescript
interface DocStore {
  list(directory: string): Promise<DocMeta[]>
  read(path: string): Promise<RequestLogDoc>
  write(path: string, doc: RequestLogDoc): Promise<void>
  append(path: string, item: ItemDraft, clock: Clock): Promise<RequestLogDoc>
  backup(path: string): Promise<string>
  isWritable(path: string): Promise<boolean>
}
```

**Key Design:**
- All I/O is async (Promise-based)
- Timestamp generation delegated to Clock (enables testing)
- Tag aggregation + item index updates happen in append()
- Backup creation automatic before writes
- Optional path writability check before operations

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/core/ports/index.ts`

### 1.5 Catalog Module (`src/core/catalog/`)

**Purpose:** Filtering, sorting, and grouping documents for viewer

**Key Types:**
- `FilterState`: type, domain, priority, status, tags[], text
- `CatalogEntry`: Document + project metadata
- `SortField`: 'updated_at' | 'created_at' | 'title' | 'item_count'
- `GroupedCatalog`: Documents grouped by project

**Functions:**
- `applyFilters()`: Chain multiple filter functions
- `filterByProject()`, `filterByType()`, `filterByDomain()`, `filterByPriority()`, `filterByStatus()`, `filterByTags()`, `filterByText()`
- `groupByProject()`: Group catalog entries by project
- `listAllDocuments()`: Scan all projects for documents
- `extractFilterOptions()`: Analyze documents to determine available filter options

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/core/catalog/`

### 1.6 Logging Module (`src/core/logging/`)

**Purpose:** Structured, dependency-free logging

**Features:**
- Four levels: DEBUG, INFO, WARN, ERROR
- JSON-serializable log entries (timestamp, level, message, context)
- Configurable via environment variables (LOG_LEVEL, VITE_LOG_LEVEL)
- Zero external dependencies
- Browser-compatible (console methods)

**Usage:**
```typescript
import { logger } from '@core/logging';
logger.info('Document written', { path: '/path/to/doc.md', size: 1024 });
logger.error('Write failed', { error: err.message });
```

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/core/logging/index.ts`

---

## 2. Adapter Layer (`src/adapters/`)

### 2.1 File System Adapter (`fs-local/`)

**Implements:** `DocStore` port for local filesystem

**Key Implementation:**
- Reads/writes markdown files with full serialization
- Path expansion: `~` → user home or `$MEATYCAPTURE_DATA_DIR`
- Directory listing with filtering (only `.md` files)
- Metadata extraction from parsed documents
- Automatic backup creation (`.bak` files)

**Usage:**
```typescript
import { createFsDocStore } from '@adapters/fs-local';
const docStore = createFsDocStore();
const docs = await docStore.list('/path/to/docs');
const doc = await docStore.read('/path/to/doc.md');
```

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/fs-local/index.ts`

### 2.2 Config Adapter (`config-local/`)

**Implements:** `ProjectStore` and `FieldCatalogStore` ports

**Storage:**
- `~/.meatycapture/projects.json`: Project registry
- `~/.meatycapture/fields.json`: Global + project-scoped field options
- Environment variable override: `MEATYCAPTURE_CONFIG_DIR`

**Key Logic:**
- Auto-generates project IDs via slugify
- Manages timestamps (created_at, updated_at)
- Field option resolution: global + project-specific additions
- Directory creation on first access

**Usage:**
```typescript
import { createProjectStore, createFieldCatalogStore } from '@adapters/config-local';
const projectStore = createProjectStore();
const fieldStore = createFieldCatalogStore();
```

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/config-local/index.ts`

### 2.3 Clock Adapter (`clock/`)

**Implements:** `Clock` port

**Provides:**
- `realClock`: Returns actual system time (used in production/CLI)
- Can be replaced with mock clock in tests for deterministic timestamps

**Code Location:** `src/adapters/clock/index.ts`

### 2.4 Alternate Adapters (Browser/API)

**Browser Storage:**
- `browser-storage/`: IndexedDB for documents, localStorage for config

**API Client:**
- `api-client/`: HTTP-based implementations for server mode

These are optional—the core works with any implementation of the ports.

---

## 3. Dependency Injection & Platform Detection

### 3.1 Platform Detection (`src/platform/`)

**Purpose:** Detect runtime environment and provide platform-specific capabilities

**Functions:**
```typescript
isTauri(): boolean  // Check if running in Tauri desktop
getPlatform(): 'tauri-desktop' | 'web-browser'
getPlatformCapabilities(): {
  hasFileSystemAccess: boolean
  hasNativeFilePicker: boolean
  hasNativeNotifications: boolean
}
detectAdapterMode(): 'api' | 'local' | 'browser'
```

**Used by:**
- UI layer to select appropriate adapters
- CLI to force use of filesystem adapters

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/platform/index.ts`

---

## 4. UI Layer (`src/ui/`)

### 4.1 Wizard Flow

**Purpose:** Multi-step capture form with state management

**Steps:**
1. **ProjectStep**: Select existing or create new project
2. **DocStep**: Create new or append to existing document
3. **ItemStep**: Form for item details (type, domain, priority, status, tags, notes)
4. **ReviewStep**: Confirm and submit; option to add more items

**Key Props:**
```typescript
interface WizardFlowProps {
  projectStore: ProjectStore
  fieldCatalogStore: FieldCatalogStore
  docStore: DocStore
  clock: Clock
  onComplete?: () => void
}
```

**Design:**
- Receives dependency-injected stores and clock
- All business logic delegated to stores/core
- Components receive data, emit events
- Batching support: after submission, can add more items without re-selecting project/doc

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/ui/wizard/`

### 4.2 Shared Components

**Components:**
- `DropdownWithAdd`: Select field with inline "Add New" dialog
- `MultiSelectWithAdd`: Tags input with suggestions and "Add New"
- `PathField`: Text input with validation
- `FormField`: Generic form field wrapper
- `Toast`: Notification system
- `Tooltip`: Hover information
- `StepShell`: Wizard step container with animations

**Design Pattern:**
- All receive filtered dropdown options from stores
- No hardcoded business logic in components

**Code Location:** `/Users/miethe/dev/homelab/development/meatycapture/src/ui/shared/`

### 4.3 Viewer Components

**Purpose:** Read-only catalog browser with filtering

**Components:**
- `DocumentCatalog`: Main viewer with filter/sort UI
- `DocumentDetail`: Full document view
- `FilterDropdown`: Multi-select filters
- `DocumentRow`: Individual document entry
- `ItemCard`: Individual item display

**Reuses:** Catalog module for filtering/grouping

---

## 5. Existing CLI Implementation (`src/cli/index.ts`)

### 5.1 Architecture

The CLI already demonstrates headless core usage without UI:

**Commands:**
1. **create**: Create new document from JSON input
2. **append**: Add items to existing document
3. **list**: List documents in a directory

**Flow:**
```
JSON Input → Validation → Core Functions → DocStore → Markdown File
```

### 5.2 Key Patterns

**Factory Functions:**
```typescript
const projectStore = createProjectStore()
const docStore = createFsDocStore()
const clock = realClock
```

**Validation:**
- Type guards: `isValidCliInput()`, `isValidItemDraft()`
- Error messages with expected format examples

**Document Creation:**
```typescript
const docId = generateDocId(project, date)
const items = input.items.map((draft, index) => ({
  ...draft,
  id: `${docId}-${String(index + 1).padStart(2, '0')}`,
  created_at: now
}))
const doc = {
  doc_id: docId,
  title, project_id, items,
  items_index: updateItemsIndex(items),
  tags: aggregateTags(items),
  item_count: items.length,
  created_at: now,
  updated_at: now
}
await docStore.write(outputPath, doc)
```

### 5.3 Path Resolution

**Smart defaults:**
1. Project's configured `default_path`
2. Environment variable `MEATYCAPTURE_DEFAULT_PROJECT_PATH`
3. Fallback: `~/.meatycapture/docs/<project-id>/`

---

## 6. TypeScript Configuration

**Config:** `tsconfig.json`

**Key Settings:**
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Path aliases for clean imports:
  ```typescript
  @core/* → ./src/core/*
  @adapters/* → ./src/adapters/*
  @ui/* → ./src/ui/*
  @platform → ./src/platform/index.ts
  @server/* → ./src/server/*
  ```

---

## 7. Package.json & Build System

**Key Scripts:**
```bash
pnpm dev          # Vite dev server (UI)
pnpm build        # tsc + vite build
pnpm build:cli    # CLI build via build-cli.js
pnpm test         # Vitest runner
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm typecheck    # tsc --noEmit

pnpm server:dev   # Bun dev server
pnpm tauri:dev    # Tauri desktop dev
```

**Dependencies:**
- React 18 + React DOM
- Radix UI (unstyled primitives)
- TanStack Table (data table)
- Tauri (desktop shell)
- Commander.js (CLI parsing)

**Dev Dependencies:**
- Vite 6 (bundler)
- Vitest 2 (test runner)
- TypeScript 5.7
- ESLint + Prettier

---

## 8. Data Flow Patterns

### 8.1 Create Document Flow

```
CLI Input (JSON)
  ↓
readCliInput() - Validate JSON structure
  ↓
generateDocId() - Create doc_id from project+date
  ↓
Items Array → generateItemId() for each
  ↓
Build RequestLogDoc {
  - aggregate tags
  - create items_index
  - set item_count
  - set timestamps
}
  ↓
serialize() → Markdown
  ↓
docStore.write() → Filesystem
  ↓
console output (success/error)
```

### 8.2 Append Document Flow

```
Existing Doc (file on disk)
  ↓
docStore.read() → RequestLogDoc
  ↓
docStore.append(doc, item) → Automatically:
  - getNextItemNumber() from existing items
  - generateItemId() for new item
  - aggregateTags() - merge all tags
  - updateItemsIndex() - refresh index
  - update item_count, updated_at
  ↓
serialize() → Markdown
  ↓
backup() → filename.bak
  ↓
write() → file
  ↓
Return updated RequestLogDoc
```

### 8.3 List Documents Flow

```
Project Directory
  ↓
docStore.list(path)
  ↓
fs.readdir() → filter *.md files
  ↓
parse() each file → extract DocMeta
  ↓
Sort by updated_at (descending)
  ↓
Return DocMeta[] (path, doc_id, title, item_count, updated_at)
```

---

## 9. Key Architectural Principles

### 9.1 Separation of Concerns

| Layer | Responsibility |
|-------|-----------------|
| Core | Domain logic, validation, serialization (no I/O) |
| Adapters | Storage implementation (filesystem, config files, APIs) |
| UI | Presentation and user interaction |
| Platform | Runtime detection and capability flags |

### 9.2 Dependency Injection

- Stores and clock injected into components
- Tests can provide mock implementations
- CLI bypasses UI, uses same stores directly

### 9.3 Zero External Dependencies in Core

- No npm packages in core domain
- Serializer implements custom YAML parser
- Logging uses console methods only
- Enables use in restricted environments

### 9.4 Type Safety

- Runtime type guards for all domain entities
- Validation at boundaries (CLI input, file parsing)
- Path aliases for clear import organization
- Strict TypeScript mode enforced

### 9.5 Error Handling

- Errors propagate to UI/CLI for user feedback
- Backup creation before destructive operations
- Path writability checks before writes
- Detailed error messages with format hints

---

## 10. Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `MEATYCAPTURE_CONFIG_DIR` | Config directory | `~/.meatycapture` |
| `MEATYCAPTURE_DEFAULT_PROJECT_PATH` | Project docs path | `~/.meatycapture/docs/<project>` |
| `MEATYCAPTURE_DATA_DIR` | Server data directory | User home |
| `LOG_LEVEL` | Logging level | `info` |
| `VITE_LOG_LEVEL` | Browser logging level | `info` |
| `NODE_ENV` | Environment | (not set) |

---

## 11. Testing Strategy

**Supported Test Types:**
- Unit tests for core modules (validation, serializer, models)
- Integration tests for adapters (filesystem, config)
- Component tests for UI
- Snapshot tests for serialized markdown output
- Accessibility tests for UI components

**Test Helpers:**
- Mock clock for deterministic timestamps
- Temp directories for file I/O tests
- Test fixtures with sample projects/documents

**Code Location:** `src/**/__tests__/` and `*.test.ts` files throughout

---

## 12. Reusability Patterns for CLI Features

### 12.1 How CLI Reuses Core

1. **Direct Import:** CLI imports from `@core/*` and `@adapters/*`
2. **No UI Dependencies:** CLI doesn't import from `@ui/*`
3. **Dependency Injection:** Manually creates stores instead of React Context
4. **Validation:** Uses same type guards as UI
5. **Error Handling:** Catches and formats errors for terminal output

### 12.2 Extending CLI

To add new CLI features:

1. **Create New Command Function**
   ```typescript
   async function myNewCommand(arg: string, options: {}): Promise<void>
   ```

2. **Use Core Domain**
   ```typescript
   const projectStore = createProjectStore()
   const docStore = createFsDocStore()
   // Use validation, serialization, models directly
   ```

3. **Add to Program**
   ```typescript
   program
     .command('my-command')
     .argument('<arg>')
     .action(myNewCommand)
   ```

4. **Output Results**
   - Use `console.log()` for success
   - Use `console.error()` for failures
   - Exit with appropriate code

---

## 13. File Structure Summary

```
src/
├── core/
│   ├── models/           # Domain entities + type guards
│   ├── validation/       # ID generation, validation, normalization
│   ├── serializer/       # Markdown ↔ RequestLogDoc
│   ├── ports/            # Storage interfaces (repository pattern)
│   ├── catalog/          # Filtering, sorting, grouping for viewer
│   └── logging/          # Structured logging
│
├── adapters/
│   ├── fs-local/         # DocStore implementation (filesystem)
│   ├── config-local/     # ProjectStore + FieldCatalogStore (JSON files)
│   ├── clock/            # Clock implementation
│   ├── browser-storage/  # Optional: IndexedDB + localStorage
│   └── api-client/       # Optional: HTTP client implementations
│
├── ui/
│   ├── wizard/           # Multi-step capture flow
│   ├── viewer/           # Read-only catalog browser
│   ├── admin/            # Field management interface
│   └── shared/           # Reusable components
│
├── platform/             # Runtime detection + capabilities
├── cli/                  # Headless CLI interface
├── server/               # Optional: Express server
├── App.tsx               # React app entry
├── main.tsx              # Browser entry
├── tauri.d.ts            # Tauri type declarations
└── ...
```

---

## 14. Recommended Architecture for CLI Expansion

**Principle:** Keep CLI features aligned with the headless core pattern

**For New Features:**

1. **Add to Core First**
   - New domain logic in `@core/` modules
   - New storage methods in ports

2. **Implement in Adapters**
   - Filesystem operations in `fs-local/`
   - Config operations in `config-local/`

3. **Expose via CLI**
   - New command in `src/cli/index.ts`
   - Reuse existing imports and patterns

4. **Optional: Add UI**
   - New components in `@ui/` can consume same stores
   - Components receive business logic via props

---

## Key Takeaways for CLI Planning

1. **Headless Core is Ready:** All domain logic exists in `@core/*` with zero UI dependencies
2. **Adapters are Flexible:** Can use filesystem, API, or browser storage seamlessly
3. **Type Safety Throughout:** Runtime type guards ensure data integrity
4. **Error Handling:** Validation at boundaries with detailed error messages
5. **Existing CLI:** Provides proven patterns for command structure and error handling
6. **Extensible Design:** New features add to core, then wire into CLI—no rework needed

---

## Configuration Files Reference

| File | Purpose | Location |
|------|---------|----------|
| `projects.json` | Project registry | `~/.meatycapture/projects.json` |
| `fields.json` | Field option catalog | `~/.meatycapture/fields.json` |
| Request-log docs | Markdown with YAML frontmatter | User-configured paths |

---

## Next Steps for CLI Feature Design

1. Identify new CLI commands needed
2. Determine what core domain logic needs to be added
3. Implement logic in `@core/*` modules
4. Add adapter methods if needed
5. Wire into CLI with appropriate error handling and output formatting
6. Write tests using existing test patterns
