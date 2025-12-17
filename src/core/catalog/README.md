# Catalog Module

Headless catalog utilities for the Request Log Viewer feature.

## Overview

This module provides pure TypeScript functions for:
- Filtering catalog documents by multiple criteria
- Grouping and sorting documents by project
- Aggregating documents from all projects

All functions are UI-agnostic, immutable, and have no side effects (except logging in utils). Perfect for building request-log browsing and discovery features.

## Quick Start

```typescript
import {
  listAllDocuments,
  applyFilters,
  createGroupedCatalog,
  createEmptyFilter,
  type CatalogEntry,
  type FilterState,
} from '@core/catalog';

// Load all documents across all enabled projects
const entries = await listAllDocuments(projectStore, docStore);

// Create and apply filters
const filter: FilterState = {
  ...createEmptyFilter(),
  project_id: 'my-project',
  text: 'search term',
};
const filtered = applyFilters(entries, filter);

// Build grouped catalog for display (sorted by most recent first)
const catalog = createGroupedCatalog(
  filtered,
  { field: 'updated_at', order: 'desc' },
  'name' // sort projects alphabetically
);

// Render grouped structure
for (const [projectId, { project, entries }] of catalog.groups) {
  console.log(`Project: ${project.name}`);
  for (const entry of entries) {
    console.log(`  - ${entry.title}`);
  }
}
```

## Core Types

### FilterState

Multi-faceted filter state for catalog browsing:

```typescript
interface FilterState {
  project_id?: string;        // Single project (undefined = all)
  types: string[];            // OR logic: match any type
  domains: string[];          // OR logic: match any domain
  priorities: string[];       // OR logic: match any priority
  statuses: string[];         // OR logic: match any status
  tags: string[];             // AND logic: must have ALL tags
  text: string;               // Case-insensitive search on title/doc_id
}
```

**Filter Logic**:
- **Single-select**: `project_id` (undefined = no filter applied)
- **Multi-select OR**: `types`, `domains`, `priorities`, `statuses` (match any)
- **Multi-select AND**: `tags` (document must have all - intersection logic)
- **Text search**: Case-insensitive match on `title` or `doc_id`

Example:
```typescript
// Filter to capture-app project, search for "auth", must have both "api" AND "bug" tags
const filter: FilterState = {
  project_id: 'capture-app',
  types: [],
  domains: [],
  priorities: [],
  statuses: [],
  tags: ['api', 'bug'],        // Document must have BOTH tags
  text: 'auth'
};
```

### CatalogEntry

A single request-log document with project context:

```typescript
interface CatalogEntry {
  path: string;               // Filesystem path
  doc_id: string;             // Document ID (e.g., 'REQ-20251203-capture-app')
  title: string;              // Document title
  item_count: number;         // Total items in document
  updated_at: Date;           // Last modification timestamp
  project_id: string;         // Associated project ID
  project_name: string;       // Human-readable project name
}
```

### GroupedCatalog

Hierarchical structure for project-organized views:

```typescript
interface GroupedCatalog {
  groups: Map<string, {
    project: ProjectInfo;     // Project metadata
    entries: CatalogEntry[];  // Documents in this project
  }>;
}
```

Iterate through grouped catalog:
```typescript
for (const [projectId, { project, entries }] of catalog.groups) {
  console.log(`Project: ${project.name} (${entries.length} documents)`);
  entries.forEach(entry => {
    console.log(`  - ${entry.doc_id}: ${entry.title}`);
  });
}
```

### FilterOptions

Available filter values extracted from catalog data:

```typescript
interface FilterOptions {
  projects: ProjectInfo[];    // Available projects
  types: string[];            // Available item types
  domains: string[];          // Available domains
  priorities: string[];       // Available priorities
  statuses: string[];         // Available statuses
  tags: string[];             // Available tags
}
```

**Note**: Currently only `projects` is populated. Other fields will be populated in future phases when extending DocMeta to include aggregated metadata.

## API Reference

### Utility Functions

#### `listAllDocuments(projectStore, docStore)`

Scan all enabled projects and aggregate their documents into a unified catalog.

**Signature**:
```typescript
async function listAllDocuments(
  projectStore: ProjectStore,
  docStore: DocStore
): Promise<CatalogEntry[]>
```

**Behavior**:
1. Fetches all projects from ProjectStore
2. Filters to only enabled projects (skips disabled ones)
3. Scans each project's `default_path` directory for documents
4. Enriches each DocMeta with project context
5. Sorts by `updated_at` descending (most recent first)
6. Returns all aggregated entries

**Error Handling**: Never throws. If a project directory is inaccessible, logs warning and continues with other projects. Returns empty array only if ProjectStore.list() fails.

**Example**:
```typescript
const entries = await listAllDocuments(projectStore, docStore);
// Returns: [
//   { doc_id: 'REQ-20251216-app', project_id: 'app', ... },
//   { doc_id: 'REQ-20251215-api', project_id: 'api', ... }
// ]
```

#### `extractFilterOptions(entries, projects)`

Build available filter values for populating filter UI dropdowns.

**Signature**:
```typescript
function extractFilterOptions(
  entries: CatalogEntry[],
  projects: Project[]
): FilterOptions
```

**Current Behavior**: Populates only `projects` array from the projects parameter (sorted by name). Other fields return empty arrays due to metadata limitations.

**Future Enhancement**: Will populate `types`, `domains`, `priorities`, `statuses`, `tags` when DocMeta includes aggregated item metadata.

**Example**:
```typescript
const options = extractFilterOptions(entries, projects);
// {
//   projects: [{ id: 'app', name: 'App' }, ...],
//   types: [],
//   domains: [],
//   ...
// }
```

#### `enrichWithProjectInfo(docMetas, project)`

Convert DocMeta array to CatalogEntry array by adding project context.

**Signature**:
```typescript
function enrichWithProjectInfo(
  docMetas: DocMeta[],
  project: Project
): CatalogEntry[]
```

**Example**:
```typescript
const entries = enrichWithProjectInfo(docMetas, project);
// Adds: project_id, project_name to each docMeta
```

### Filter Functions

All filter functions are pure, immutable, and composable.

#### `filterByProject(entries, projectId)`

Single-select project filter.

```typescript
function filterByProject(
  entries: CatalogEntry[],
  projectId?: string
): CatalogEntry[]
```

- `projectId` undefined → returns all entries (no filter)
- `projectId` 'capture-app' → returns only entries from that project

**Example**:
```typescript
const filtered = filterByProject(entries, 'capture-app');
// Returns only documents from 'capture-app' project
```

#### `filterByType(entries, types)`, `filterByDomain()`, `filterByPriority()`, `filterByStatus()`

Multi-select OR logic filters (currently pass-through due to metadata limitations).

```typescript
function filterByType(entries: CatalogEntry[], types: string[]): CatalogEntry[]
```

**Status**: Currently return all entries (no-op filters) because `CatalogEntry` doesn't include item-level metadata. To enable these filters:
1. Extend DocMeta with item type/domain/priority/status summary, OR
2. Load full RequestLogDoc for each entry

**Future Behavior**: Will return only entries containing at least one item matching any of the specified values.

#### `filterByTags(entries, tags)`

Multi-select AND logic filter (currently pass-through due to metadata limitations).

```typescript
function filterByTags(entries: CatalogEntry[], tags: string[]): CatalogEntry[]
```

**Status**: Currently returns all entries because tags are in full RequestLogDoc, not in DocMeta. To enable:
1. Extend DocMeta with aggregated `tags: string[]`, OR
2. Load full RequestLogDoc for each entry

**Future Behavior**: Will return only entries containing ALL specified tags (intersection logic).

Example (future):
```typescript
// With metadata available:
filterByTags(entries, ['api', 'bug']);
// Returns only documents with BOTH 'api' AND 'bug' tags
```

#### `filterByText(entries, text)`

Case-insensitive search on title and doc_id fields.

```typescript
function filterByText(entries: CatalogEntry[], text: string): CatalogEntry[]
```

**Logic**: Match if search text appears in EITHER `title` OR `doc_id`

**Example**:
```typescript
filterByText(entries, 'auth');
// Returns entries matching 'auth' in title or doc_id

filterByText(entries, 'REQ-2025');
// Returns entries with 'REQ-2025' in doc_id
```

#### `applyFilters(entries, filter)`

Apply all filters in optimized sequence using AND logic.

```typescript
function applyFilters(entries: CatalogEntry[], filter: FilterState): CatalogEntry[]
```

**Application Order** (optimized for performance):
1. Project filter (typically most selective)
2. Text search (works on metadata, fast)
3. Type/domain/priority/status/tags (currently pass-through)

**Short-Circuit Optimization**: If any filter produces empty result, subsequent filters are skipped.

**Example**:
```typescript
const filter: FilterState = {
  project_id: 'capture-app',
  types: [],
  domains: [],
  priorities: [],
  statuses: [],
  tags: ['api'],
  text: 'auth'
};

const filtered = applyFilters(entries, filter);
// Efficiently filters by project + text search
// Type/tag filters are pass-through until metadata available
```

### Grouping & Sorting Functions

#### `groupByProject(entries)`

Group catalog entries by project ID.

```typescript
function groupByProject(entries: CatalogEntry[]): Map<string, CatalogEntry[]>
```

**Example**:
```typescript
const grouped = groupByProject(entries);
// Map {
//   'capture-app' => [entry1, entry3],
//   'api-server' => [entry2]
// }
```

#### `sortDocuments(entries, sort)`

Sort entries by specified field and order.

```typescript
function sortDocuments(
  entries: CatalogEntry[],
  sort: CatalogSort
): CatalogEntry[]
```

**Sortable Fields**:
- `updated_at` - Date (descending = newest first)
- `item_count` - Number (descending = highest first)
- `doc_id` - String (alphabetical)
- `title` - String (alphabetical)

**Example**:
```typescript
// Most recent documents first
const sorted = sortDocuments(entries, { field: 'updated_at', order: 'desc' });

// By title alphabetically
const byTitle = sortDocuments(entries, { field: 'title', order: 'asc' });

// By item count (highest first)
const byCount = sortDocuments(entries, { field: 'item_count', order: 'desc' });
```

#### `sortProjects(projectIds, entries, sortBy)`

Sort project IDs for display order.

```typescript
function sortProjects(
  projectIds: string[],
  entries: CatalogEntry[],
  sortBy: 'name' | 'count' | 'updated'
): string[]
```

**Sorting Modes**:
- `'name'` - Alphabetically by project name (case-insensitive)
- `'count'` - By number of documents (descending - most first)
- `'updated'` - By most recent document update (descending - newest first)

**Example**:
```typescript
// Sort projects alphabetically
const sorted = sortProjects(projectIds, entries, 'name');
// => ['api', 'capture-app', 'utils']

// Sort by document count
const byCount = sortProjects(projectIds, entries, 'count');
// => ['capture-app', 'api', 'utils'] if capture-app has most docs
```

#### `createGroupedCatalog(entries, docSort, projectSort)`

Build complete grouped and sorted catalog structure.

```typescript
function createGroupedCatalog(
  entries: CatalogEntry[],
  docSort: CatalogSort,
  projectSort?: 'name' | 'count' | 'updated'
): GroupedCatalog
```

**Process**:
1. Groups entries by project
2. Sorts documents within each group
3. Sorts projects themselves
4. Returns hierarchical structure ready for rendering

**Example**:
```typescript
const catalog = createGroupedCatalog(
  entries,
  { field: 'updated_at', order: 'desc' },  // Recent documents first
  'count'                                    // Projects by document count
);

// Iterate grouped structure
for (const [projectId, { project, entries }] of catalog.groups) {
  console.log(`${project.name} (${entries.length} docs)`);
  entries.forEach(e => console.log(`  - ${e.title}`));
}
```

### Factory Functions

#### `createEmptyFilter()`

Create a filter state with all facets cleared.

```typescript
function createEmptyFilter(): FilterState
```

Returns:
```typescript
{
  project_id: undefined,
  types: [],
  domains: [],
  priorities: [],
  statuses: [],
  tags: [],
  text: ''
}
```

#### `createDefaultSort()`

Create default sort configuration (most recent first).

```typescript
function createDefaultSort(): CatalogSort
```

Returns: `{ field: 'updated_at', order: 'desc' }`

#### `createEmptyFilterOptions()`

Create empty filter options structure.

```typescript
function createEmptyFilterOptions(): FilterOptions
```

All arrays empty - useful for initialization before populating from data.

#### `createEmptyGroupedCatalog()`

Create empty grouped catalog structure.

```typescript
function createEmptyGroupedCatalog(): GroupedCatalog
```

Returns: `{ groups: new Map() }`

#### `createCatalogEntry(docMeta, projectId, projectName)`

Create CatalogEntry from DocMeta and project info.

```typescript
function createCatalogEntry(
  docMeta: DocMeta,
  projectId: string,
  projectName: string
): CatalogEntry
```

## Type Guards

All type guards are available for runtime validation:

- `isFilterEmpty(filter)` - Check if filter has no criteria applied
- `isCatalogEntry(obj)` - Validate CatalogEntry structure
- `isFilterState(obj)` - Validate FilterState structure
- `isSortField(value)` - Check if value is valid sort field
- `isSortOrder(value)` - Check if value is 'asc' or 'desc'
- `isCatalogSort(obj)` - Validate CatalogSort configuration

## Architecture Notes

### Pure Functions

All functions are pure (no side effects except logging):
- Immutable operations (return new arrays, never mutate input)
- Composable filters that can be applied in sequence
- Deterministic results with consistent sorting

### Performance Target

- Handle 500+ documents in <100ms
- Efficient filtering with early short-circuit
- Optimized sort order to reduce computation

### Metadata Limitations

CatalogEntry contains only document-level metadata from DocMeta:
- ✓ Can filter by: project, text search
- ✗ Cannot filter by: type, domain, priority, status, tags

These require either:
1. **Extend DocMeta** with aggregated item metadata (types, domains, etc.), OR
2. **Load full RequestLogDoc** for complete item-level data

Current workaround: Filter by project/text first, then load full docs for detailed filtering.

### Integration Points

- **ProjectStore**: Used to list enabled projects in `listAllDocuments()`
- **DocStore**: Used to scan project directories for documents
- **Project Model**: Used to associate documents with project context
- **DocMeta**: Base metadata for CatalogEntry enrichment

### Error Handling Philosophy

- **Never throw exceptions** - always return valid results
- **Log warnings** for non-critical failures (inaccessible directories)
- **Continue processing** if one project fails
- **Return empty results** only for fatal errors (ProjectStore failure)

## Future Enhancements

### Phase 2: Extended Metadata

Extend DocMeta to include:
```typescript
interface DocMeta {
  // ... existing fields
  tags: string[];                    // Aggregated tags
  types: string[];                   // Item types present
  domains: string[];                 // Domains present
  priorities: string[];              // Priorities present
  statuses: string[];                // Statuses present
}
```

Then filter functions become fully functional.

### Phase 3: Full-Document Filtering

Load full RequestLogDoc for selected entries to enable:
- Advanced filtering on item-level properties
- Full-text search within item content
- Complex filtering combinations

## Examples

### Basic Catalog View

```typescript
// Load all documents
const entries = await listAllDocuments(projectStore, docStore);

// Create grouped catalog sorted by project name, recent docs first
const catalog = createGroupedCatalog(
  entries,
  { field: 'updated_at', order: 'desc' },
  'name'
);

// Render in UI
renderCatalog(catalog);
```

### Filtered Search

```typescript
// User searches for "authentication" in "api-server" project
const filter: FilterState = {
  project_id: 'api-server',
  types: [],
  domains: [],
  priorities: [],
  statuses: [],
  tags: [],
  text: 'authentication'
};

const filtered = applyFilters(entries, filter);
const catalog = createGroupedCatalog(filtered, createDefaultSort());
```

### Tag-Based Discovery (Future)

```typescript
// Find all "api" + "security" documents (when metadata available)
const filter: FilterState = {
  ...createEmptyFilter(),
  tags: ['api', 'security'],  // AND logic
};

const filtered = applyFilters(entries, filter);
```

### Dynamic Sorting

```typescript
// User chooses to sort by most-documented projects first
const sorted = createGroupedCatalog(
  entries,
  { field: 'updated_at', order: 'desc' },
  'count'  // Projects with most documents first
);
```

## Testing

Key areas for test coverage:

- **Filter Logic**: Each filter function with various inputs (empty, single, multiple values)
- **Sorting**: All sortable fields in both directions, null handling
- **Grouping**: Multiple projects, mixed data, edge cases
- **Composition**: applyFilters with complex FilterState combinations
- **Type Guards**: Valid and invalid inputs for all types
- **Factories**: Verify default values and structure

Example test structure:
```typescript
describe('Catalog Module', () => {
  describe('filterByProject', () => {
    it('returns all entries when projectId is undefined');
    it('returns only matching project entries');
    it('returns empty array when no matches');
  });

  describe('applyFilters', () => {
    it('applies filters in sequence');
    it('short-circuits on empty result');
  });

  describe('createGroupedCatalog', () => {
    it('groups by project');
    it('sorts documents within groups');
    it('sorts projects by name/count/updated');
  });
});
```
