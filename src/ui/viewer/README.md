# Request Log Viewer Module

Read-only catalog viewer for browsing, filtering, and inspecting request-log documents.

## Overview

The Viewer module provides a comprehensive UI for exploring request-log documents with powerful search, filtering, and sorting capabilities. It's designed as a read-only interface for discovering and examining existing request logs while maintaining a clean separation from the capture workflow.

**Key Characteristics**:
- Read-only access to request-log documents
- Multi-project support with project grouping
- Multi-faceted filtering across all document attributes
- Flexible sorting options
- On-demand document expansion for detailed views
- Keyboard-accessible with full ARIA support
- Glass morphism design for visual consistency

## Installation

The Viewer module is part of the `@meaty/ui` package and is installed as part of normal project setup:

```bash
pnpm install
```

## Basic Usage

### Simple Integration

```tsx
import { ViewerContainer } from '@ui/viewer';
import { createProjectStore, createDocStore } from '@adapters/fs-local';

export default function ViewerPage() {
  const projectStore = createProjectStore();
  const docStore = createDocStore();

  return (
    <ViewerContainer
      projectStore={projectStore}
      docStore={docStore}
    />
  );
}
```

### With Custom Configuration

```tsx
import { ViewerContainer } from '@ui/viewer';

export default function App() {
  return (
    <ViewerContainer
      projectStore={customProjectStore}
      docStore={customDocStore}
    />
  );
}
```

## Component Hierarchy

```
ViewerContainer (orchestration)
├── DocumentFilters (filter controls)
│   ├── FilterDropdown (multi-select)
│   └── FilterBadge (active filter chip)
├── DocumentCatalog (TanStack Table)
│   ├── ProjectGroupRow (collapsible header)
│   └── DocumentRow (expandable row)
│       └── DocumentDetail (expanded content)
│           ├── ItemCard (item display)
│           └── MarkdownRenderer (notes)
└── Loading/Error/Empty states
```

## Components

### ViewerContainer

**Purpose**: Main orchestration component for the Request Log Viewer.

**Responsibilities**:
- Load full catalog on mount from ProjectStore/DocStore
- Manage filter state with multi-faceted filtering
- Manage sort state and options
- Cache full document data on-demand for row expansion
- Provide manual refresh to re-scan filesystem
- Display loading, error, and empty states

**Props**:
```typescript
interface ViewerContainerProps {
  /** Project store for fetching project metadata */
  projectStore: ProjectStore;

  /** Document store for listing and reading documents */
  docStore: DocStore;
}
```

**State Management**:
- `catalog`: All loaded documents (CatalogEntry[])
- `filterState`: Current filter criteria (multi-faceted)
- `sort`: Current sort configuration
- `filterOptions`: Available filter values extracted from catalog
- `documentCache`: Full document data keyed by doc_id
- `loading`: Initial load or refresh state
- `error`: Error message if load fails

**Example**:
```tsx
<ViewerContainer
  projectStore={projectStore}
  docStore={docStore}
/>
```

### DocumentFilters

**Purpose**: Filter toolbar for multi-faceted filtering of documents.

**Features**:
- Project single-select dropdown
- Type/Domain/Priority/Status multi-select dropdowns
- Tags multi-select with autocomplete suggestions
- Text search input with 300ms debounce
- Clear all filters button
- Active filter badge display
- Result count summary

**Props**:
```typescript
interface DocumentFiltersProps {
  /** Current filter state */
  filterState: FilterState;

  /** Available filter options from catalog */
  filterOptions: FilterOptions;

  /** Called when a filter changes */
  onFilterChange: (key: keyof FilterState, value: FilterState[keyof FilterState]) => void;

  /** Called when user clears all filters */
  onClearFilters: () => void;

  /** Number of results matching current filters */
  resultCount: number;

  /** Total documents before filtering */
  totalCount: number;
}
```

**Keyboard Support**:
- Tab to navigate between controls
- Arrow keys within dropdowns
- Enter to select/deselect options
- Escape to close dropdowns

**Example**:
```tsx
<DocumentFilters
  filterState={filterState}
  filterOptions={filterOptions}
  onFilterChange={(key, value) => setFilterState(prev => ({...prev, [key]: value}))}
  onClearFilters={() => resetFilters()}
  resultCount={filtered.length}
  totalCount={catalog.length}
/>
```

### DocumentCatalog

**Purpose**: Main catalog table displaying documents grouped by project.

**Features**:
- Project-based grouping with collapsible headers
- Sortable columns (doc_id, title, item_count, updated_at)
- Row expansion for document detail view
- On-demand document loading with caching
- Keyboard navigation (arrow keys, Enter, Space)
- ARIA table semantics for accessibility
- Empty state when no documents match filters

**Props**:
```typescript
interface DocumentCatalogProps {
  /** Filtered catalog entries */
  entries: CatalogEntry[];

  /** Entries grouped by project */
  groupedCatalog: GroupedCatalog;

  /** Current sort configuration */
  sort: CatalogSort;

  /** Handle sort change */
  onSortChange: (sort: CatalogSort) => void;

  /** Load full document data on demand */
  onLoadDocument: (docId: string) => Promise<RequestLogDoc>;

  /** Currently expanded row (doc_id) */
  expandedRow: string | null;

  /** Handle row expansion */
  onExpandRow: (docId: string | null) => void;

  /** Document cache for expanded rows */
  documentCache: Map<string, RequestLogDoc>;
}
```

**Keyboard Support**:
- Arrow Up/Down: Navigate between rows
- Arrow Left/Right: Collapse/expand group
- Enter/Space: Toggle row expansion
- Home/End: Jump to first/last row

**Example**:
```tsx
<DocumentCatalog
  entries={filtered}
  groupedCatalog={grouped}
  sort={sort}
  onSortChange={setSort}
  onLoadDocument={loadDoc}
  expandedRow={expandedId}
  onExpandRow={setExpandedId}
  documentCache={cache}
/>
```

### DocumentFilters Sub-components

#### FilterDropdown
**Purpose**: Multi-select dropdown with searchable options.

**Features**:
- Search/filter options by text
- Type-to-filter capability
- Keyboard navigation
- Selected count badge

#### FilterBadge
**Purpose**: Visual chip displaying active filters with clear action.

**Features**:
- Shows filter key and selected value
- Click to remove specific filter
- Clear all option

### DocumentCatalog Sub-components

#### ProjectGroupRow
**Purpose**: Collapsible project group header.

**Features**:
- Project name and document count
- Expand/collapse toggle
- Smooth animations
- Keyboard support

#### DocumentRow
**Purpose**: Individual document row in the table.

**Features**:
- Shows doc_id, title, item_count, updated_at
- Row expansion indicator
- Hover highlight
- Click to expand full details

### DocumentDetail

**Purpose**: Expanded view of a single document with all its items.

**Features**:
- Document metadata (id, title, creation/update dates, tags)
- Summary of items in document
- Full ItemCard display for each item
- Markdown rendering of item notes

**Props**:
```typescript
interface DocumentDetailProps {
  /** Full document data */
  document: RequestLogDoc;

  /** Close handler */
  onClose: () => void;
}
```

**Example**:
```tsx
<DocumentDetail
  document={fullDoc}
  onClose={() => setExpandedId(null)}
/>
```

### ItemCard

**Purpose**: Display a single request-log item with all its fields.

**Features**:
- Item title and ID
- Type, domain, priority, status badges
- Tags display
- Problem/goal section
- Solution/notes section with markdown rendering
- Metadata (created, updated dates)

**Props**:
```typescript
interface ItemCardProps {
  /** Item to display */
  item: Item;

  /** Show expanded details */
  expanded?: boolean;
}
```

### MarkdownRenderer

**Purpose**: Render markdown content safely without external libraries.

**Features**:
- Basic markdown parsing (bold, italic, code, links)
- Code block highlighting
- Lists (ordered and unordered)
- Headings
- XSS-safe URL sanitization
- Respects prefers-reduced-motion

**Props**:
```typescript
interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string;

  /** Optional CSS class for styling */
  className?: string;
}
```

**Supported Markdown**:
- `**bold**` → `<strong>bold</strong>`
- `*italic*` → `<em>italic</em>`
- `` `code` `` → `<code>code</code>`
- ` ```lang ... ``` ` → `<pre><code>...</code></pre>`
- `[link](url)` → `<a href="...">link</a>`
- `- item` → `<ul><li>item</li></ul>`
- `1. item` → `<ol><li>item</li></ol>`
- `# Heading` → `<h1>Heading</h1>`

**Example**:
```tsx
<MarkdownRenderer
  content="# Title\n\nBold **text** and *italic* content."
/>
```

## Types

All public types are re-exported from `@core/catalog` for convenience:

### FilterState
```typescript
interface FilterState {
  projectId?: string;           // Single project filter
  types?: string[];             // Type filters
  domains?: string[];           // Domain filters
  priorities?: string[];        // Priority filters
  statuses?: string[];          // Status filters
  tags?: string[];              // Tag filters (any match)
  searchText?: string;          // Full-text search
}
```

### CatalogEntry
```typescript
interface CatalogEntry {
  doc_id: string;
  project_id: string;
  project_name: string;
  title: string;
  item_count: number;
  tags: string[];
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}
```

### FilterOptions
```typescript
interface FilterOptions {
  projects: Array<{ id: string; name: string }>;
  types: string[];
  domains: string[];
  priorities: string[];
  statuses: string[];
  tags: string[];
}
```

### CatalogSort
```typescript
interface CatalogSort {
  column: 'doc_id' | 'title' | 'item_count' | 'updated_at';
  direction: 'asc' | 'desc';
}
```

### GroupedCatalog
```typescript
type GroupedCatalog = Map<string, {
  projectId: string;
  projectName: string;
  entries: CatalogEntry[];
}>;
```

### ViewerState
```typescript
interface ViewerState {
  catalog: CatalogEntry[];
  filterState: FilterState;
  sort: CatalogSort;
  filterOptions: FilterOptions;
  loading: boolean;
  error: string | null;
}
```

## Styling

The Viewer module uses glass morphism design patterns defined in `viewer.css`:

### CSS Classes

**Container**:
- `.viewer-container` - Main container
- `.viewer-header` - Header section
- `.viewer-content` - Content area
- `.viewer-footer` - Footer area

**Filters**:
- `.filter-toolbar` - Filter controls container
- `.filter-group` - Individual filter control
- `.filter-badges` - Active filters display

**Table**:
- `.catalog-table` - Main table
- `.table-header` - Header row
- `.table-row` - Data row
- `.table-row.expanded` - Expanded row state

**Details**:
- `.document-detail` - Expanded document view
- `.document-metadata` - Metadata section
- `.items-list` - Items container
- `.item-card` - Individual item

**Components**:
- `.dropdown-trigger` - Dropdown button
- `.dropdown-content` - Dropdown menu
- `.badge` - Filter badge chip
- `.badge-close` - Badge close button

### Design Tokens

The module respects project design tokens:
- **Colors**: Glass backgrounds with 60% opacity, borders with rgba()
- **Transitions**: 300ms smooth transitions
- **Typography**: System font stack
- **Spacing**: 8px base unit
- **Shadows**: Subtle shadows on cards and dropdowns

## Accessibility

The Viewer module is built with full accessibility support:

### ARIA Attributes
- `role="table"` on catalog table
- `role="rowgroup"` on project groups
- `role="row"` on document rows
- `aria-expanded` on expandable rows
- `aria-label` on buttons and controls
- `aria-live="polite"` on filter results
- `aria-sort="ascending|descending"` on sortable columns

### Keyboard Navigation
- **Tab**: Navigate through controls
- **Arrow Keys**: Navigate table rows and dropdown options
- **Enter/Space**: Activate buttons and toggle expansion
- **Escape**: Close dropdowns and dialogs

### Screen Reader Support
- Semantic HTML with proper headings
- Descriptive labels for all inputs
- Live region updates for filter results
- Table structure for catalog data

### Visual Accessibility
- WCAG AA color contrast (4.5:1 for text)
- Focus indicators on all interactive elements
- Respects `prefers-reduced-motion` preference
- Clear visual feedback for interactions

### Testing Accessibility
```bash
# Run accessibility tests
pnpm test:a11y viewer

# Manual keyboard testing
pnpm dev  # Then navigate with keyboard only
```

## Performance

### Optimization Strategies
- **Lazy Loading**: Documents loaded on-demand on row expansion
- **Memoization**: useMemo for filtered and grouped catalog
- **Debouncing**: 300ms debounce on text search
- **Caching**: Document cache prevents re-fetching
- **Virtual Scrolling**: Large datasets handled efficiently

### Performance Monitoring
```tsx
// Monitor catalog load time
const startTime = performance.now();
const catalog = await listAllDocuments(projectStore, docStore);
console.log(`Catalog loaded in ${performance.now() - startTime}ms`);

// Monitor filter performance
const filterStart = performance.now();
const filtered = applyFilters(catalog, filterState);
console.log(`Filtered in ${performance.now() - filterStart}ms`);
```

## Error Handling

### Error Scenarios

**Catalog Load Failure**
```tsx
// ViewerContainer handles gracefully
{error && (
  <div className="error-message">
    <p>Failed to load documents: {error}</p>
    <button onClick={refresh}>Retry</button>
  </div>
)}
```

**Document Load Failure**
```tsx
// DocumentCatalog handles on expansion
try {
  const doc = await onLoadDocument(docId);
} catch (err) {
  // Show inline error in row
  // Retry button available
}
```

**Filter Query Errors**
- Invalid filter combinations ignored silently
- Returns all documents if filter fails
- Error logged to console for debugging

## Integration with Core Modules

### @core/catalog
- `listAllDocuments()` - Load all documents from stores
- `extractFilterOptions()` - Extract available filter values
- `applyFilters()` - Apply filter criteria to catalog
- `createGroupedCatalog()` - Group documents by project

### @core/ports
- `ProjectStore` - Fetch project metadata
- `DocStore` - List and read documents

### @core/models
- `RequestLogDoc` - Full document structure
- `Item` - Individual request-log item

## Usage Examples

### Basic Viewer
```tsx
import { ViewerContainer } from '@ui/viewer';
import { createProjectStore, createDocStore } from '@adapters/fs-local';

function App() {
  return (
    <ViewerContainer
      projectStore={createProjectStore()}
      docStore={createDocStore()}
    />
  );
}
```

### Advanced: Custom Error Boundary
```tsx
import { ViewerContainer } from '@ui/viewer';
import { ErrorBoundary } from '@shared/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallback={<div>Viewer failed to load</div>}>
      <ViewerContainer
        projectStore={projectStore}
        docStore={docStore}
      />
    </ErrorBoundary>
  );
}
```

### Testing Components
```tsx
import { render, screen } from '@testing-library/react';
import { DocumentFilters } from '@ui/viewer';

test('filters change on selection', () => {
  const handleChange = jest.fn();
  render(
    <DocumentFilters
      filterState={{ projectId: undefined, types: [] }}
      filterOptions={{ projects: [], types: ['bug', 'feature'] }}
      onFilterChange={handleChange}
      onClearFilters={() => {}}
      resultCount={10}
      totalCount={20}
    />
  );

  const typeDropdown = screen.getByRole('button', { name: /type/i });
  fireEvent.click(typeDropdown);
  fireEvent.click(screen.getByRole('option', { name: 'bug' }));

  expect(handleChange).toHaveBeenCalledWith('types', ['bug']);
});
```

## Best Practices

### When Using ViewerContainer
1. **Error Handling**: Wrap in ErrorBoundary for graceful failures
2. **Loading State**: Viewer handles loading UI internally
3. **Store Configuration**: Ensure stores are properly initialized before passing
4. **Responsive Layout**: Viewer adapts to container width

### When Testing Components
1. **Mock Stores**: Use factory functions to create mock stores
2. **Async Operations**: Handle async document loads with waitFor
3. **Accessibility**: Test keyboard navigation in addition to clicking
4. **Snapshot Testing**: Use for component output validation

### When Extending
1. **Sub-components**: Safe to use for advanced layouts
2. **Custom Styling**: Extend CSS classes without modifying module styles
3. **Filter Logic**: Integrate custom filter types via FilterDropdown extension
4. **Markdown Rendering**: Extend MarkdownRenderer for custom syntax

## Common Issues and Solutions

**Issue**: Catalog takes long time to load

**Solution**:
- Check DocStore implementation for performance issues
- Verify file system doesn't have too many large documents
- Use manual refresh strategically

**Issue**: Filters not updating displayed results

**Solution**:
- Verify filterState is properly passed to DocumentCatalog
- Check that applyFilters is called with updated filterState
- Ensure cache invalidation on filter change

**Issue**: Keyboard navigation not working

**Solution**:
- Ensure focus is on the table/controls
- Check browser for accessibility issues
- Verify event handlers are properly attached

**Issue**: Markdown rendering shows raw content

**Solution**:
- Check content format (should be valid markdown)
- Verify MarkdownRenderer is used for note content
- Check CSS for overflow settings

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- No IE11 support (uses modern ES2020 features)

## Contributing

When contributing to the Viewer module:

1. **Component Changes**: Update corresponding README section
2. **Type Changes**: Update types documentation
3. **New Features**: Add examples and accessibility notes
4. **Style Changes**: Document CSS classes affected
5. **Tests**: Add tests for new functionality

## Related Documentation

- [Core Catalog Module](/docs/architecture/catalog.md)
- [Capture Module](/src/ui/capture/README.md)
- [Component Testing Guide](/docs/testing/component-testing.md)
- [Accessibility Guidelines](/docs/accessibility.md)
