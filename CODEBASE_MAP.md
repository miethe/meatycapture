# MeatyCapture Codebase Map

Complete reference guide to all source files, their purposes, and relationships.

---

## Core Domain Layer (`src/core/`)

### Models and Types
**`src/core/models/index.ts` (262 lines)**
- Domain entity definitions: `Project`, `FieldOption`, `ItemDraft`, `RequestLogItem`, `RequestLogDoc`
- Type guards: `isProject()`, `isFieldOption()`, `isItemDraft()`, etc.
- Constants: `DEFAULT_FIELD_OPTIONS` (type, priority, status)
- **Used by:** All other layers (models are the lingua franca)
- **No I/O:** Pure type definitions

### Validation & ID Generation
**`src/core/validation/index.ts` (433 lines)**
- ID generation: `generateDocId()`, `generateItemId()`
- ID parsing: `parseDocId()`, `parseItemId()`
- ID validation: `isValidDocId()`, `isValidItemId()`
- Text normalization: `slugify()`, `sanitizePathSegment()`, `generateDefaultProjectPath()`
- Item number calculation: `getNextItemNumber()`
- **Used by:** CLI, UI (wizard), adapters
- **Key functions:** ~15 exported, all pure (no I/O)

### Serialization
**`src/core/serializer/index.ts` (497 lines)**
- `serialize(doc): string` → RequestLogDoc to markdown with YAML frontmatter
- `parse(content): RequestLogDoc` → markdown back to RequestLogDoc
- `aggregateTags(items): string[]` → unique sorted tags from all items
- `updateItemsIndex(items): ItemIndexEntry[]` → create quick-reference index
- **Parsing internals:**
  - Custom YAML parser (no external deps)
  - Item section extraction via regex
  - Date deserialization from ISO 8601 and YYYYMMDD formats
- **Used by:** adapters (fs-local), CLI, UI
- **No I/O:** All functions pure

### Ports (Storage Interfaces)
**`src/core/ports/index.ts` (208 lines)**
- `Clock` interface: `now(): Date`
- `ProjectStore` interface: list, get, create, update, delete
- `FieldCatalogStore` interface: getGlobal, getForProject, getByField, addOption, removeOption
- `DocStore` interface: list, read, write, append, backup, isWritable
- `DocMeta` type: lightweight document metadata for listing
- **Purpose:** Repository pattern - abstract storage from business logic
- **Used by:** Adapters implement these, UI/CLI use them

### Catalog (Filtering & Grouping)
**`src/core/catalog/` (4 files)**

**`types.ts`**
- `FilterState`: type, domain, priority, status, tags[], text
- `CatalogEntry`: document + project metadata
- `SortField`: updated_at | created_at | title | item_count
- `GroupedCatalog`: documents organized by project

**`filter.ts`**
- `filterByProject()`, `filterByType()`, `filterByDomain()`, `filterByPriority()`, `filterByStatus()`, `filterByTags()`, `filterByText()`
- `applyFilters()`: chain multiple filters

**`group.ts`**
- `groupByProject()`: organize entries by project
- `sortDocuments()`: sort by field and order
- `createGroupedCatalog()`: one-shot grouping + sorting

**`utils.ts`**
- `listAllDocuments()`: scan all projects for request-logs
- `extractFilterOptions()`: analyze documents for available options
- `enrichWithProjectInfo()`: add project metadata to entries

**Used by:** Viewer UI, potential CLI query commands

### Logging
**`src/core/logging/index.ts` (252 lines)**
- `Logger` class: debug(), info(), warn(), error()
- `LogLevel` enum: DEBUG, INFO, WARN, ERROR
- Configuration: `minLevel`, `prettyPrint`
- `logger` singleton: exported configured instance
- `createLogger()`: factory for custom instances
- **No external deps:** Uses console methods only
- **Browser-compatible:** Works in Node and browser
- **Used by:** Core modules (serializer, adapters)

### Test Helpers
**`src/core/test-helpers.ts`**
- Utilities for testing (temp directories, fixtures, etc.)
- Used by test files throughout

---

## Adapter Layer (`src/adapters/`)

### File System Adapter
**`src/adapters/fs-local/index.ts` (150+ lines)**
- `FsDocStore` class: implements `DocStore` interface
- **Operations:**
  - `list(directory)`: scan for .md files, extract metadata, sort by updated_at desc
  - `read(path)`: read file → parse → RequestLogDoc
  - `write(path, doc)`: serialize → backup → write
  - `append(path, item, clock)`: read → generate item ID → aggregate tags → write
  - `backup(path)`: create .bak file
  - `isWritable(path)`: check directory/file permissions
- **Path handling:**
  - `expandPath()`: tilde expansion (~ → home or $MEATYCAPTURE_DATA_DIR)
  - `getBaseDir()`: resolve config directory
- **Used by:** CLI, UI (Tauri and web modes)

**`platform-factory.ts` & Tests**
- Platform-specific initialization
- Tauri vs Node.js implementations

### Config Adapter
**`src/adapters/config-local/index.ts` (150+ lines)**
- `LocalProjectStore` class: implements `ProjectStore`
  - Stores projects in `~/.meatycapture/projects.json`
  - Auto-generates IDs via slugify
  - Manages timestamps
- `LocalFieldCatalogStore` class: implements `FieldCatalogStore`
  - Stores options in `~/.meatycapture/fields.json`
  - Merges global + project-scoped options on retrieval
- **Directory initialization:** `ensureConfigDir()` creates `~/.meatycapture/` on first access
- **Used by:** CLI, UI

**`platform-factory.ts` & Tests**
- Platform-specific initialization

### Clock Adapter
**`src/adapters/clock/index.ts`**
- `realClock`: returns actual system time
- **Used by:** CLI, UI, tests (via injection)
- **Pattern:** Replace with mock in tests for deterministic behavior

### Optional Adapters (Not currently used by CLI)

**`browser-storage/`**
- `IdbDocStore`: IndexedDB implementation of `DocStore`
- `LsConfigStores`: localStorage implementation for projects/fields
- Used in web browser mode

**`api-client/`**
- HTTP client implementations of all ports
- Used when connecting to backend API
- Includes authentication middleware

---

## UI Layer (`src/ui/`)

### Wizard (Capture Flow)
**`src/ui/wizard/WizardFlow.tsx`**
- Main orchestrator for multi-step form
- State machine: project → doc → item → review
- Props: projectStore, fieldCatalogStore, docStore, clock, onComplete callback
- Batching: can add multiple items without re-selecting project/doc

**`src/ui/wizard/ProjectStep.tsx`**
- Select existing or create new project
- Uses ProjectStore to list/create

**`src/ui/wizard/DocStep.tsx`**
- Create new or append to existing document
- Uses DocStore to list existing docs

**`src/ui/wizard/ItemStep.tsx`**
- Form for item details (title, type, domain, context, priority, status, tags, notes)
- Dynamic dropdowns from FieldCatalogStore
- Validation before submission

**`src/ui/wizard/ReviewStep.tsx`**
- Display item summary
- Submit to store
- Show success + option to add more items

### Shared Components
**`src/ui/shared/`**

**DropdownWithAdd.tsx**
- Single-select dropdown with inline "Add New" dialog
- Props: options[], onChange, onAdd
- Reusable for type, domain, priority, status fields

**MultiSelectWithAdd.tsx**
- Tags input with suggestions and "Add New"
- Supports tag removal and ordering

**PathField.tsx**
- Text input for file paths
- Validation against writability

**FormField.tsx**
- Wrapper for form inputs with labels and error display
- Consistent styling and accessibility

**Toast.tsx & useToast.tsx**
- Notification system for success/error messages
- Toast management hook

**Tooltip.tsx**
- Hover information display

**StepShell.tsx**
- Container for wizard steps
- Animations between steps

**StepProgress.tsx**
- Visual progress indicator (breadcrumb-style)

**Hooks:**
- `useDebounce.ts`: debounce text input
- `useFocusTrap.ts`: trap focus within modal
- `useKeyboardShortcuts.ts`: keyboard navigation
- `useNavigationShortcuts.ts`: navigate between wizard steps

### Viewer (Read-only Catalog)
**`src/ui/viewer/ViewerContainer.tsx`**
- Main container for read-only document browser
- Integrates filters, sorting, and document list

**DocumentCatalog.tsx**
- Grid/list of documents with filtering UI
- Integrates DocumentFilters + DocumentDetail

**DocumentFilters.tsx**
- Multi-select filter panel
- Dropdowns for project, type, domain, priority, status, tags
- Text search

**DocumentRow.tsx**
- Individual document entry display
- Shows doc_id, title, item count, last updated

**DocumentDetail.tsx**
- Full document view
- Lists all items with metadata

**ItemCard.tsx**
- Individual item display with all metadata

**MarkdownRenderer.tsx**
- Renders markdown content (item notes)

**hooks/useDocumentCache.ts**
- Caches loaded documents to avoid re-fetching

### Admin (Field Management)
**`src/ui/admin/AdminPage.tsx`**
- Field management interface
- Manage global and project-specific field options

**AdminContainer.tsx**
- Container for admin page

**FieldGroupTab.tsx**
- Tab for managing options for a specific field

---

## CLI (`src/cli/`)

### Entry Point
**`src/cli/index.ts` (403 lines)**
- Commander.js setup
- **Commands:**
  1. `create <json-file>`: Create new document
  2. `append <doc-path> <json-file>`: Append items
  3. `list [project]`: List documents
- **Input validation:** `isValidCliInput()`, `isValidItemDraft()`
- **Input reading:** `readCliInput()` with error handling
- **Path resolution:** `getProjectDocPath()` with smart defaults
- **Stores:** Created fresh per command (no singleton)
- **Exit codes:** 0 success, 1 error

**`logging-stub.ts`**
- Placeholder or stub for CLI-specific logging

---

## Platform Detection (`src/platform/`)

**`index.ts`**
- `isTauri()`: detect Tauri desktop environment
- `getPlatform()`: return 'tauri-desktop' or 'web-browser'
- `getPlatformCapabilities()`: feature flags
  - hasFileSystemAccess
  - hasNativeFilePicker
  - hasNativeNotifications

**`api-detection.ts`**
- `detectAdapterMode()`: 'api' | 'local' | 'browser'
- `pingApiHealth()`: check backend availability
- Caching for detection results

---

## Server (`src/server/`) - Optional

**`index.ts`**
- Express server setup
- Routes for projects, fields, documents, items

**`routes/`**
- `projects.ts`: GET/POST/PUT/DELETE projects
- `fields.ts`: GET/POST/DELETE field options
- `docs.ts`: GET/POST documents and items

**`schemas/`**
- Zod validation schemas for request bodies
- Mirrors core domain models

**`middleware/`**
- `auth.ts`: JWT verification
- `cors.ts`: CORS configuration
- `error-handler.ts`: error formatting
- `validation.ts`: request validation

---

## Build & Config

**`package.json`**
- Dependencies: React, Radix UI, Tauri, Commander
- Scripts: dev, build, build:cli, test, lint, format, typecheck
- CLI entry: `"bin": { "meatycapture": "./dist/cli/index.js" }`

**`tsconfig.json`**
- Target: ES2022
- Strict mode enabled
- Path aliases: @core/*, @adapters/*, @ui/*, @platform, @server/*

**`vite.config.ts`**
- Build configuration for React app
- Dev server setup

**`vitest.config.ts`**
- Test runner configuration
- Coverage reporting

**`build-cli.js`**
- Custom build script for CLI bundle

---

## Type Definitions

**`src/types/tauri-stubs.d.ts`**
- Type declarations for Tauri APIs (when not available)

**`src/types/bun.d.ts`**
- Type declarations for Bun runtime (if used)

**`src/tauri.d.ts`**
- Generated Tauri type definitions

**`src/vite-env.d.ts`**
- Vite environment variables and import types

---

## Entry Points

**Web/React (`src/main.tsx`)**
- React app bootstrap
- Mounts App component to DOM

**React App (`src/App.tsx`)**
- Top-level routing: Wizard vs Viewer vs Admin
- Store initialization and dependency injection
- Platform detection for adapter selection

**CLI (`src/cli/index.ts`)**
- Commander program setup
- Command handlers
- Process exit

---

## Testing Infrastructure

**Test Files Pattern:** `**/*.test.ts` or `**/__tests__/*`

**`src/test/setup.ts`**
- Global test configuration
- DOM shims, fetch mocks, etc.

**Test Coverage:**
- Core modules: unit tests for validation, serialization, models
- Adapters: integration tests with real filesystem and JSON files
- UI components: component tests with React Testing Library
- Snapshots: markdown output format validation

---

## Documentation

**Configuration Files:**
- `CLAUDE.md`: Project directives and architecture overview
- `ARCHITECTURE_EXPLORATION.md`: Detailed architecture analysis (THIS PROJECT)
- `ARCHITECTURE_CODE_EXAMPLES.md`: Code patterns and examples (THIS PROJECT)
- `CLI_DESIGN_PATTERNS.md`: CLI extension guidelines (THIS PROJECT)
- `CODEBASE_MAP.md`: This file

**Project Documentation:**
- `docs/project_plans/initialization/prd.md`: Product requirements
- `docs/project_plans/initialization/implementation-plan.md`: Implementation strategy
- `docs/project_plans/initialization/design-spec.md`: Design specifications

---

## Configuration Storage

**`~/.meatycapture/projects.json`**
```json
{
  "projects": [
    {
      "id": "my-project",
      "name": "My Project",
      "default_path": "~/projects/my-project",
      "repo_url": "https://github.com/user/repo",
      "enabled": true,
      "created_at": "2025-12-27T...",
      "updated_at": "2025-12-27T..."
    }
  ]
}
```

**`~/.meatycapture/fields.json`**
```json
{
  "options": [
    {
      "id": "opt1",
      "field": "type",
      "value": "enhancement",
      "scope": "global",
      "created_at": "2025-12-27T..."
    },
    {
      "id": "opt2",
      "field": "domain",
      "value": "mobile",
      "scope": "project",
      "project_id": "my-project",
      "created_at": "2025-12-27T..."
    }
  ]
}
```

**Request-Log Documents**
```
~/projects/my-project/REQ-20251227-my-project.md
```
Format: Markdown with YAML frontmatter (see serializer documentation)

---

## Key Relationships

```
┌─────────────────────────────────────────────────────────────┐
│ CLI (src/cli/index.ts)                                      │
│ ├─ imports from @core/* (models, validation, serializer)    │
│ ├─ creates instances of adapters (fs-local, config-local)   │
│ └─ outputs to console                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ UI (src/ui/)                                                │
│ ├─ WizardFlow receives stores + clock (dependency injection)│
│ ├─ components import @core/models for types                 │
│ ├─ uses FieldCatalogStore for dropdown options              │
│ ├─ calls DocStore to write documents                        │
│ └─ Viewer uses catalog module for filtering                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Core Domain (@core/)                                        │
│ ├─ models: types only (no I/O)                              │
│ ├─ validation: pure functions (no I/O)                      │
│ ├─ serializer: pure conversion (no I/O)                     │
│ ├─ ports: storage interfaces                                │
│ └─ catalog: filtering/grouping (no I/O)                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Adapters (@adapters/)                                       │
│ ├─ fs-local: implements DocStore (filesystem I/O)           │
│ ├─ config-local: implements ProjectStore + FieldCatalogStore│
│ ├─ clock: implements Clock                                  │
│ └─ (optional) api-client, browser-storage                   │
└─────────────────────────────────────────────────────────────┘
```

---

## File Size Reference

| Layer | Module | Files | LOC |
|-------|--------|-------|-----|
| Core | Models | 1 | 262 |
| Core | Validation | 1 | 433 |
| Core | Serializer | 1 | 497 |
| Core | Ports | 1 | 208 |
| Core | Catalog | 4 | ~400 |
| Core | Logging | 1 | 252 |
| Adapters | fs-local | 3 | ~200 |
| Adapters | config-local | 3 | ~200 |
| Adapters | clock | 1 | ~20 |
| UI | Wizard | 5 | ~500 |
| UI | Shared | 12 | ~800 |
| UI | Viewer | 9 | ~600 |
| UI | Admin | 3 | ~200 |
| CLI | | 1 | 403 |
| **Total** | | **~50** | **~5000** |

---

## Import Patterns

### From CLI
```typescript
import { generateDocId, generateItemId } from '@core/validation';
import { serialize, parse, aggregateTags, updateItemsIndex } from '@core/serializer';
import type { RequestLogDoc, ItemDraft } from '@core/models';
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';
import { realClock } from '@adapters/clock';
import { Command } from 'commander';
```

### From UI Components
```typescript
import type { ProjectStore, DocStore, FieldCatalogStore, Clock } from '@core/ports';
import type { Project, ItemDraft, RequestLogDoc, FieldOption, FieldName } from '@core/models';
import { generateDocId, slugify } from '@core/validation';
import { aggregateTags, updateItemsIndex } from '@core/serializer';
import { applyFilters, groupByProject } from '@core/catalog';
import { logger } from '@core/logging';
```

---

## Development Quick Reference

**Start dev server:**
```bash
pnpm dev
```

**Build all:**
```bash
pnpm build
```

**Build CLI only:**
```bash
pnpm build:cli
```

**Run tests:**
```bash
pnpm test
pnpm test:coverage
```

**Type check:**
```bash
pnpm typecheck
```

**Lint & format:**
```bash
pnpm lint
pnpm format
```

**CLI commands:**
```bash
meatycapture create input.json
meatycapture append /path/to/doc.md input.json
meatycapture list [project]
```

---

## Configuration Environment Variables

| Variable | Purpose | CLI | UI | Server |
|----------|---------|-----|----|----|
| `MEATYCAPTURE_CONFIG_DIR` | Config dir (default ~/.meatycapture) | ✓ | ✓ | ✓ |
| `MEATYCAPTURE_DEFAULT_PROJECT_PATH` | Project docs dir | ✓ |  |  |
| `MEATYCAPTURE_DATA_DIR` | Data directory (server mode) | ✓ | ✓ | ✓ |
| `LOG_LEVEL` | Logging level (Node.js) | ✓ | ✓ | ✓ |
| `VITE_LOG_LEVEL` | Logging level (browser) |  | ✓ |  |
| `NODE_ENV` | Environment (production/development) | ✓ | ✓ | ✓ |

---

## Next Steps for Using This Map

1. **New CLI Feature?** → See `CLI_DESIGN_PATTERNS.md`
2. **Understand Architecture?** → See `ARCHITECTURE_EXPLORATION.md`
3. **Code Examples?** → See `ARCHITECTURE_CODE_EXAMPLES.md`
4. **Find a Function?** → Use grep or search for filename + function name
5. **Add Tests?** → Look at `**/*.test.ts` files for patterns
6. **Extend UI?** → Check `src/ui/shared/` for component reuse patterns

This codebase is designed for **extensibility**: add new features to core, wire into adapters, expose via CLI or UI.
