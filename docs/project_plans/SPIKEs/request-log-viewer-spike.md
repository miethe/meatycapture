---
title: "SPIKE: Request Log Viewer"
description: "Research and design analysis for adding a catalog viewer UI to browse and filter existing request-log documents"
status: "active"
created: 2025-12-16
updated: 2025-12-16
owners: ["spike-writer"]
audience: [engineering, product, design]
category: "spike"
---

# SPIKE: Request Log Viewer

**SPIKE ID**: `SPIKE-2025-12-16-REQUEST-LOG-VIEWER`
**Date**: 2025-12-16
**Author**: SPIKE Writer Agent
**Related Request**: Request Log Viewer feature for MeatyCapture web and Tauri apps
**Complexity**: Medium

## Executive Summary

This SPIKE investigates adding a Request Log Viewer to MeatyCapture that allows users to browse, filter, and view their existing request-log markdown files. The viewer will integrate seamlessly with the existing capture wizard and admin interfaces using a tab-based navigation pattern. We recommend implementing a lightweight solution using shadcn/ui DataTable with TanStack Table for filtering/sorting, keeping the total bundle impact to ~40-50KB gzipped while maintaining full web/Tauri code parity and accessibility compliance.

## Research Scope & Objectives

**Primary Questions:**
1. How should we index and catalog request-log files efficiently across web and Tauri platforms?
2. What UI component architecture provides the best balance of features, performance, and maintainability?
3. How do we maintain code parity between web (browser storage) and Tauri (filesystem) implementations?
4. What filtering and navigation patterns best serve the user workflow?
5. When should we consider virtualization for large document catalogs?

**Success Criteria:**
- Clear technical direction for catalog storage and indexing
- UI component stack selection with bundle size analysis
- Code sharing strategy between web and Tauri platforms
- Performance optimization recommendations
- ADR recommendations for key architectural decisions

## Technical Analysis

### MP Layer Impact Assessment

#### UI Layer Changes

**New Components Required:**
- `ViewerContainer.tsx` - Main viewer shell with tab navigation integration
- `DocumentCatalog.tsx` - DataTable wrapper with project grouping
- `DocumentFilters.tsx` - Filter controls (type, domain, priority, status, tags)
- `DocumentRow.tsx` - Expandable row with item details
- `ItemPreview.tsx` - Item detail display component
- `CommandPalette.tsx` (optional) - Cmd+K quick navigation

**Shared Component Reuse:**
- `StepShell.tsx` - Can be adapted for consistent UI shell
- `Toast.tsx` / `useToast.tsx` - Error/success notifications
- `FormField.tsx` - Filter input controls
- `MultiSelectWithAdd.tsx` - Tag filtering (read-only mode)

**Component Library Integration:**
- shadcn/ui DataTable (~15KB) - Core table with sorting/filtering
- Radix UI primitives (~15KB) - Accessible dropdown, tabs, accordion
- cmdk (~8KB) - Command palette for quick navigation (optional Phase 2)
- TanStack Virtual (~5KB) - Lazy rendering for 500+ documents (optional)

**Total Bundle Impact:** ~40-50KB gzipped (Phase 1)

#### API Layer Changes

**No backend API changes required** - Viewer is read-only using existing DocStore.list() and DocStore.read() operations.

**Existing Port Interface Coverage:**
```typescript
interface DocStore {
  list(directory: string): Promise<DocMeta[]>;  // ✅ Already exists
  read(path: string): Promise<RequestLogDoc>;   // ✅ Already exists
  // No new methods needed
}
```

#### Database Layer Changes

**No schema changes required** - Uses existing RequestLogDoc and DocMeta models.

**Index Strategy Options:**
1. **On-Demand Scan** (Recommended for MVP)
   - Scan filesystem/IndexedDB on viewer mount
   - Filter and sort in-memory with TanStack Table
   - Simple, no additional storage needed
   - Performance: Acceptable for <1000 documents

2. **JSON Catalog Index** (Future enhancement)
   - Store catalog in `~/.meatycapture/catalog.json`
   - Update on write/append operations
   - Faster initial load, stale data risk
   - Performance: Required for 1000+ documents

**Recommendation:** Start with on-demand scan for MVP, migrate to JSON catalog if performance becomes an issue.

#### Infrastructure Changes

**None required** - Viewer runs entirely client-side with existing storage adapters.

### Architecture Compliance Review

**MeatyCapture Architecture Alignment:**

✅ **Port/Adapter Pattern Compliance:**
- Viewer uses DocStore port interface
- Platform-agnostic (works with browser-storage, api-client, fs-local adapters)
- No direct filesystem or IndexedDB coupling in UI layer

✅ **Headless Core Principle:**
- Filtering logic can be extracted to `@core/catalog` module
- Reusable across web, desktop, and future mobile platforms
- No React coupling in domain logic

✅ **UI Consistency:**
- Follows existing StepShell and glass/x-morphism design patterns
- Integrates with existing Toast notification system
- Matches wizard and admin accessibility standards

✅ **File-First Storage:**
- Read-only view of existing markdown documents
- No additional persistence layer required
- Preserves file-first philosophy

### Integration Points Analysis

**Existing System Integration:**

1. **App.tsx Navigation**
   ```typescript
   type View = 'wizard' | 'admin' | 'viewer'; // Add viewer

   <nav className="app-nav">
     <button onClick={() => setView('wizard')}>Capture</button>
     <button onClick={() => setView('viewer')}>Viewer</button> {/* New */}
     <button onClick={() => setView('admin')}>Admin</button>
   </nav>
   ```

2. **Store Initialization** (No changes needed)
   ```typescript
   // Viewer reuses existing stores
   <ViewerContainer
     projectStore={stores.projectStore}  // Select projects for filtering
     docStore={stores.docStore}          // List and read documents
   />
   ```

3. **Project Filtering**
   - Leverage existing ProjectStore.list() for project dropdown
   - Filter documents by project_id using DocStore.list(project.default_path)
   - Cross-platform: works with all DocStore implementations

4. **Document Detail View**
   - DocStore.read(path) returns full RequestLogDoc with items
   - Parse and display items_index for quick scanning
   - Expandable rows show full item details (notes, metadata)

**External Dependencies:**
- None - No third-party services required
- All components run client-side with existing adapters

### Alternative Approaches Considered

#### Option A: Material-UI DataGrid

**Pros:**
- Feature-rich out of the box (sorting, filtering, grouping, export)
- Strong TypeScript support
- Well-documented

**Cons:**
- Large bundle size (~150KB gzipped)
- Opinionated styling conflicts with glass/x-morphism design
- Overkill for MVP requirements
- Accessibility issues in v5

**Verdict:** ❌ Rejected - Bundle size and design mismatch

#### Option B: AG Grid Community

**Pros:**
- Enterprise-grade features (virtual scrolling, advanced filters)
- Excellent performance for large datasets
- Tree data support for grouping

**Cons:**
- Very large bundle (~200KB+ gzipped)
- Steep learning curve
- License restrictions for advanced features
- Complex customization for glass/x-morphism styling

**Verdict:** ❌ Rejected - Overkill complexity and bundle size

#### Option C: shadcn/ui DataTable + TanStack Table (Recommended)

**Pros:**
- Lightweight (~40-50KB total with Radix primitives)
- Headless architecture fits MeatyCapture's port/adapter pattern
- Full control over styling (easy glass/x-morphism integration)
- Composable - add features incrementally
- Excellent accessibility (Radix UI foundation)
- Active maintenance and TypeScript-first

**Cons:**
- More manual setup compared to batteries-included solutions
- Grouping requires custom implementation
- Export features need manual implementation (future)

**Verdict:** ✅ Recommended - Best balance of features, performance, and maintainability

#### Option D: Custom Table Component

**Pros:**
- Zero dependencies
- Full control
- Smallest possible bundle

**Cons:**
- Significant development time (2-3 days)
- Reinventing accessibility features (ARIA, keyboard nav)
- Sorting/filtering logic from scratch
- Maintenance burden for edge cases

**Verdict:** ❌ Rejected - Not cost-effective for required features

## Implementation Design

### Phase 1: Foundation Layer (Viewer Core)

**Duration:** 1.5-2 days

**Deliverables:**
1. **Catalog Data Layer** (`@core/catalog/index.ts`)
   ```typescript
   // Headless catalog logic (platform-agnostic)
   export interface CatalogFilters {
     projectId?: string;
     type?: string[];
     domain?: string[];
     priority?: string[];
     status?: string[];
     tags?: string[];
     searchText?: string;
   }

   export function filterDocuments(
     docs: DocMeta[],
     filters: CatalogFilters
   ): DocMeta[];

   export function groupByProject(
     docs: DocMeta[],
     projects: Project[]
   ): Map<string, DocMeta[]>;
   ```

2. **DocStore Integration**
   - Implement `listAllDocuments()` utility to scan all project paths
   - Handle errors gracefully (missing directories, corrupted files)
   - Test with browser-storage, api-client, and fs-local adapters

3. **Data Models** (Extend existing)
   ```typescript
   // No new models needed - reuse existing
   // DocMeta already has: path, doc_id, title, item_count, updated_at
   // RequestLogDoc already has: items, items_index, tags, etc.
   ```

4. **Unit Tests**
   - Test filtering logic with various filter combinations
   - Test project grouping with edge cases (no project, multiple projects)
   - Test search text matching (title, tags, doc_id)

### Phase 2: UI Components

**Duration:** 2-2.5 days

**Deliverables:**

1. **shadcn/ui Setup**
   ```bash
   # Install dependencies
   pnpm add @tanstack/react-table
   pnpm add @radix-ui/react-dropdown-menu
   pnpm add @radix-ui/react-select
   pnpm add class-variance-authority clsx tailwind-merge

   # Add shadcn/ui table component
   npx shadcn-ui@latest add table
   npx shadcn-ui@latest add dropdown-menu
   npx shadcn-ui@latest add select
   ```

2. **ViewerContainer Component**
   ```typescript
   interface ViewerContainerProps {
     projectStore: ProjectStore;
     docStore: DocStore;
   }

   export function ViewerContainer({ projectStore, docStore }: ViewerContainerProps) {
     const [projects, setProjects] = useState<Project[]>([]);
     const [documents, setDocuments] = useState<DocMeta[]>([]);
     const [filters, setFilters] = useState<CatalogFilters>({});
     const [loading, setLoading] = useState(true);

     // Load projects and documents on mount
     // Apply filters and grouping
     // Pass to DocumentCatalog
   }
   ```

3. **DocumentCatalog Component**
   ```typescript
   interface DocumentCatalogProps {
     documents: DocMeta[];
     projects: Project[];
     onDocumentSelect: (doc: DocMeta) => void;
     onFilterChange: (filters: CatalogFilters) => void;
   }

   export function DocumentCatalog({
     documents,
     projects,
     onDocumentSelect,
     onFilterChange
   }: DocumentCatalogProps) {
     // TanStack Table setup with grouping by project
     // Column definitions: Project, Title, Type, Domain, Priority, Status, Tags, Items, Updated
     // Row expansion for item details
   }
   ```

4. **DocumentFilters Component**
   ```typescript
   interface DocumentFiltersProps {
     availableProjects: Project[];
     availableTypes: string[];
     availableDomains: string[];
     filters: CatalogFilters;
     onChange: (filters: CatalogFilters) => void;
   }

   export function DocumentFilters({
     availableProjects,
     availableTypes,
     availableDomains,
     filters,
     onChange
   }: DocumentFiltersProps) {
     // Project dropdown
     // Type multi-select
     // Domain multi-select
     // Priority multi-select
     // Status multi-select
     // Tag search input with suggestions
     // Text search input (doc_id, title)
     // Clear filters button
   }
   ```

5. **ItemPreview Component**
   ```typescript
   interface ItemPreviewProps {
     item: RequestLogItem;
     compact?: boolean;
   }

   export function ItemPreview({ item, compact }: ItemPreviewProps) {
     // Display item metadata (type, domain, priority, status, tags)
     // Show truncated or full notes based on compact flag
     // Click to expand/collapse
     // Copy item ID to clipboard
   }
   ```

6. **Glass/X-Morphism Styling**
   - Match existing wizard and admin aesthetic
   - Subtle blur backgrounds, soft shadows
   - Smooth transitions for row expansion
   - Focus states and hover effects

### Phase 3: Navigation Integration

**Duration:** 0.5-1 day

**Deliverables:**

1. **App.tsx Updates**
   - Add 'viewer' to View type union
   - Add Viewer button to navigation
   - Conditional rendering for ViewerContainer
   - Persist last viewed tab in localStorage

2. **Routing Logic** (Optional for Phase 2)
   ```typescript
   // Deep linking to specific documents
   // URL pattern: #/viewer?doc=REQ-20251216-project
   // Supports sharing and bookmarking
   ```

3. **Keyboard Shortcuts**
   - `Cmd/Ctrl + 1` - Switch to Capture
   - `Cmd/Ctrl + 2` - Switch to Viewer
   - `Cmd/Ctrl + 3` - Switch to Admin
   - `Cmd/Ctrl + K` - Open command palette (Phase 2)

### Phase 4: Performance Optimization

**Duration:** 0.5-1 day

**Deliverables:**

1. **Client-Side Caching**
   ```typescript
   // Cache loaded documents in memory
   const documentCache = new Map<string, RequestLogDoc>();

   async function getDocument(path: string, docStore: DocStore): Promise<RequestLogDoc> {
     if (documentCache.has(path)) {
       return documentCache.get(path)!;
     }
     const doc = await docStore.read(path);
     documentCache.set(path, doc);
     return doc;
   }
   ```

2. **Progressive Loading**
   - Load DocMeta first (fast, small payloads)
   - Load full RequestLogDoc only on row expansion
   - Show loading skeletons during data fetch

3. **Virtualization** (Optional - only if >500 documents)
   ```bash
   pnpm add @tanstack/react-virtual
   ```
   - TanStack Virtual for efficient rendering
   - Lazy load rows as user scrolls
   - Reduces initial render time and memory usage

4. **Debounced Search**
   - Debounce text search input (300ms)
   - Prevent excessive re-filtering during typing

### Phase 5: Testing & Observability

**Duration:** 1 day

**Deliverables:**

1. **Unit Tests**
   - Catalog filtering logic (all filter combinations)
   - Project grouping (edge cases)
   - Search text matching (case-insensitive, partial matches)

2. **Component Tests**
   - DocumentCatalog rendering with mock data
   - DocumentFilters interaction (select, clear)
   - ItemPreview expansion/collapse
   - Keyboard navigation (arrow keys, Enter, Escape)

3. **Integration Tests**
   - ViewerContainer with all three DocStore adapters
   - Filter → Catalog update flow
   - Project selection → Document filtering
   - Row expansion → Document loading

4. **Accessibility Tests**
   - WCAG 2.1 AA compliance validation
   - Screen reader testing (table navigation)
   - Keyboard-only navigation testing
   - Focus management (filters, table rows, expansion)

5. **Performance Tests**
   - Catalog load time with 100, 500, 1000 documents
   - Filter application performance
   - Memory usage monitoring
   - Bundle size verification (<50KB target)

6. **Observability**
   - No additional logging needed (reuse existing logger)
   - Track catalog load errors in console
   - User feedback via Toast for failed document reads

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| **Bundle size creep** | Medium | Medium | Use bundle analyzer, enforce <50KB limit, lazy load TanStack Virtual only when needed |
| **Web/Tauri parity breaks** | High | Low | Share all UI code, only adapter layer differs, comprehensive testing across platforms |
| **Performance with 1000+ docs** | High | Medium | Implement virtualization threshold (500 docs), add JSON catalog index in Phase 2 |
| **Stale catalog data** | Low | Medium | On-demand scan ensures freshness, add manual refresh button, future: file watching |
| **Corrupted markdown parsing** | Medium | Low | Graceful error handling in DocStore.read(), skip invalid docs, show warning toast |
| **Accessibility regressions** | Medium | Low | Use Radix UI primitives (accessible by default), test with screen readers, keyboard nav tests |
| **Complex grouping logic** | Medium | Medium | Start with simple project grouping, TanStack Table supports nested grouping if needed |
| **Filter UI complexity** | Medium | Medium | Prioritize common filters (project, type, status), defer advanced filters to Phase 2 |

## Success Criteria

- [ ] **Functional Requirements**
  - [ ] View all request-log documents across all projects
  - [ ] Filter by project, type, domain, priority, status, tags
  - [ ] Search by text (title, doc_id)
  - [ ] Group documents by project with collapsible sections
  - [ ] Expand rows to view item details
  - [ ] Click items to copy ID to clipboard
  - [ ] Refresh catalog on demand

- [ ] **Performance Requirements**
  - [ ] Catalog loads in <1s for 100 documents
  - [ ] Catalog loads in <3s for 500 documents
  - [ ] Filter application <100ms for 500 documents
  - [ ] Bundle size <50KB gzipped

- [ ] **Security Requirements**
  - [ ] Read-only view (no write operations)
  - [ ] No XSS vulnerabilities in markdown rendering
  - [ ] Validate doc_id format before read operations

- [ ] **Accessibility Requirements**
  - [ ] WCAG 2.1 AA compliance (Level AA)
  - [ ] Keyboard-only navigation support
  - [ ] Screen reader compatibility (tested with VoiceOver/NVDA)
  - [ ] Focus management (filters → table → expanded rows)
  - [ ] ARIA labels on all interactive elements

- [ ] **Code Quality Requirements**
  - [ ] >80% unit test coverage for catalog logic
  - [ ] Component tests for all viewer UI components
  - [ ] Integration tests with all three DocStore adapters
  - [ ] TypeScript strict mode compliance
  - [ ] ESLint and Prettier passing

## Effort Estimation

### Development Time

**Phase 1: Foundation Layer** - 1.5-2 days
- Catalog filtering logic: 0.5 day
- DocStore integration utilities: 0.5 day
- Unit tests: 0.5-1 day

**Phase 2: UI Components** - 2-2.5 days
- shadcn/ui setup and table component: 0.5 day
- ViewerContainer implementation: 0.5 day
- DocumentCatalog with TanStack Table: 1 day
- DocumentFilters implementation: 0.5 day
- ItemPreview component: 0.25 day
- Glass/x-morphism styling: 0.25-0.5 day

**Phase 3: Navigation Integration** - 0.5-1 day
- App.tsx updates: 0.25 day
- Keyboard shortcuts: 0.25 day
- Testing across platforms: 0.25-0.5 day

**Phase 4: Performance Optimization** - 0.5-1 day
- Caching layer: 0.25 day
- Progressive loading: 0.25 day
- Performance testing: 0.25-0.5 day

**Phase 5: Testing & Observability** - 1 day
- Unit tests: 0.25 day
- Component tests: 0.25 day
- Integration tests: 0.25 day
- Accessibility tests: 0.25 day

### Testing Time

- Unit tests: Included in development phases
- Integration tests: 0.5 day (comprehensive adapter testing)
- E2E tests: 0.25 day (critical user paths)
- Accessibility audit: 0.25 day (manual testing with assistive tech)

**Total Testing Allocation:** 1 day (included in Phase 5)

### Documentation Time

- Component Storybook examples: 0.5 day
- User guide (viewing, filtering): 0.25 day
- Developer documentation (extending filters): 0.25 day

**Total Documentation Time:** 1 day

### Total Estimated Effort

**MVP (Phases 1-3):** 4.5-5.5 days
**With Performance & Testing (Phases 1-5):** 6-7.5 days
**With Documentation:** 7-8.5 days

**Confidence Level:** High (80%)
- Well-defined scope
- Existing patterns to follow (wizard, admin)
- Mature libraries (TanStack Table, Radix UI)
- Clear integration points

## Dependencies & Prerequisites

### Internal Dependencies

1. **Existing MeatyCapture Components**
   - `@core/ports` - DocStore, ProjectStore interfaces (✅ Stable)
   - `@core/models` - RequestLogDoc, DocMeta, Project (✅ Stable)
   - `@core/serializer` - parse() function (✅ Stable)
   - `@adapters/browser-storage` - IDB DocStore implementation (✅ Stable)
   - `@adapters/api-client` - HTTP DocStore implementation (✅ Stable)
   - `@adapters/fs-local` - Filesystem DocStore implementation (⚠️ Tauri only)
   - `@ui/shared` - Toast, FormField components (✅ Stable)

2. **App Navigation Updates**
   - `App.tsx` - Add viewer tab (⚠️ Blocking)
   - Navigation state management (⚠️ Blocking)

### External Dependencies

1. **npm Packages**
   - `@tanstack/react-table` ^8.11.0 (~10KB)
   - `@radix-ui/react-dropdown-menu` ^2.0.0 (~8KB)
   - `@radix-ui/react-select` ^2.0.0 (~7KB)
   - `class-variance-authority` ^0.7.0 (~2KB)
   - `clsx` ^2.0.0 (~1KB)
   - `tailwind-merge` ^2.0.0 (~3KB)

2. **Development Dependencies**
   - `@testing-library/react` (✅ Already installed)
   - `@testing-library/user-event` (✅ Already installed)
   - `vitest` (✅ Already installed)

### Infrastructure Requirements

**None** - Viewer runs entirely client-side with existing infrastructure.

### Team Skill Requirements

1. **React Expertise**
   - Hooks (useState, useEffect, useMemo, useCallback)
   - Component composition patterns
   - Performance optimization (memoization)

2. **TypeScript**
   - Advanced types (generics, union types)
   - Type inference and narrowing
   - Interface composition

3. **TanStack Table**
   - Column definitions
   - Filtering and sorting APIs
   - Row expansion and grouping

4. **Accessibility**
   - ARIA attributes and roles
   - Keyboard event handling
   - Focus management

**Required Training:** None - existing team skills sufficient

## Recommendations

### Immediate Actions

1. **Create ADR for Catalog Storage Strategy** (Owner: Lead Architect)
   - Decision: On-demand scan vs JSON catalog index
   - Timeline: Before Phase 1 implementation
   - Rationale: Establishes performance baseline and migration path

2. **Create ADR for UI Component Library Selection** (Owner: Frontend Lead)
   - Decision: shadcn/ui + TanStack Table vs alternatives
   - Timeline: Before Phase 2 implementation
   - Rationale: Bundle size, accessibility, and maintainability requirements

3. **Prototype TanStack Table Integration** (Owner: UI Engineer)
   - Build minimal proof-of-concept with project grouping
   - Validate bundle size impact (<50KB target)
   - Timeline: 0.5 day before Phase 2
   - Rationale: Validate technical approach and identify blockers

4. **Update Project Roadmap** (Owner: Product Owner)
   - Add viewer feature to release plan (target: 0.2 or 0.3)
   - Prioritize against admin field manager and desktop packaging
   - Timeline: Next sprint planning
   - Rationale: Align stakeholder expectations and resource allocation

### Architecture Decision Records Needed

#### ADR-001: Catalog Storage Strategy

**Decision Topic:** On-demand filesystem scan vs JSON catalog index

**Context:**
- MVP needs fast initial load (<1s for 100 docs)
- Future growth may require optimization (1000+ docs)
- Web and Tauri have different storage characteristics

**Options:**
1. **On-Demand Scan** - Scan DocStore.list() on viewer mount
2. **JSON Catalog Index** - Maintain `catalog.json` updated on write/append
3. **Hybrid** - Start with on-demand, migrate to index at 500 doc threshold

**Recommendation:** Option 3 (Hybrid) - Start simple, optimize when needed

**ADR Needed:** Before Phase 1 implementation

---

#### ADR-002: UI Component Library Selection

**Decision Topic:** shadcn/ui + TanStack Table vs Material-UI vs AG Grid

**Context:**
- Bundle size budget: <50KB gzipped
- Glass/x-morphism design requires custom styling
- Accessibility (WCAG 2.1 AA) is mandatory
- Need filtering, sorting, grouping, row expansion

**Options:**
1. **shadcn/ui + TanStack Table** - Lightweight, headless, composable
2. **Material-UI DataGrid** - Feature-rich, large bundle, opinionated
3. **AG Grid Community** - Enterprise features, very large bundle
4. **Custom Table** - Zero dependencies, high development cost

**Recommendation:** Option 1 (shadcn/ui + TanStack Table) - Best balance

**ADR Needed:** Before Phase 2 implementation

---

#### ADR-003: Web/Tauri Code Sharing Strategy

**Decision Topic:** Shared UI layer vs platform-specific implementations

**Context:**
- MeatyCapture runs on web (browser storage) and desktop (Tauri filesystem)
- DocStore adapter pattern already provides platform abstraction
- UI code should be 100% shared for maintainability

**Options:**
1. **Fully Shared UI** - Same components, different DocStore adapters
2. **Platform-Specific UI** - Separate viewer implementations
3. **Shared Core, Platform Features** - Shared base, platform enhancements

**Recommendation:** Option 1 (Fully Shared UI) - Aligns with port/adapter pattern

**ADR Needed:** Before Phase 1 implementation (informational - reinforces existing pattern)

---

#### ADR-004: Command Palette Integration (Optional)

**Decision Topic:** Add cmdk for Cmd+K navigation or defer to Phase 2

**Context:**
- Command palette improves UX for power users
- Adds ~8KB to bundle
- Requires additional keyboard shortcut handling

**Options:**
1. **Include in MVP** - Add cmdk in Phase 2
2. **Defer to Phase 2** - Focus on core viewer functionality first
3. **Skip Entirely** - Keep UI simple

**Recommendation:** Option 2 (Defer to Phase 2) - Validate viewer value first

**ADR Needed:** After MVP feedback (before Phase 2 enhancements)

### Follow-up Research Questions

1. **File Watching for Real-Time Updates**
   - Question: Should viewer auto-refresh when documents change on disk?
   - Research Needed: Tauri file watching APIs, performance impact, UX patterns
   - Timeline: After MVP, before 1.0 release
   - Rationale: Enhances UX but adds complexity (especially for web platform)

2. **Document Export/Sharing Features**
   - Question: Should users be able to export filtered views (CSV, JSON, PDF)?
   - Research Needed: Export library options, bundle size impact, user demand
   - Timeline: Post-MVP feedback cycle
   - Rationale: Defer until we validate core viewer usage patterns

3. **Advanced Filtering (Saved Filters, Filter Presets)**
   - Question: Do users need to save filter combinations for reuse?
   - Research Needed: Filter preset UI patterns, storage strategy (localStorage vs config)
   - Timeline: Post-MVP feedback cycle
   - Rationale: May be low-value complexity without user validation

4. **Document Editing from Viewer**
   - Question: Should viewer support inline editing or navigate to capture wizard?
   - Research Needed: Edit UI patterns, conflict resolution, undo/redo requirements
   - Timeline: Post-1.0 (significant scope expansion)
   - Rationale: Introduces write operations and state management complexity

5. **Multi-Project Dashboard View**
   - Question: Should viewer support aggregated views across all projects?
   - Research Needed: Dashboard UI patterns, performance with many projects, grouping strategies
   - Timeline: Post-MVP feedback cycle
   - Rationale: May be useful for cross-project insights but increases complexity

## Appendices

### A. Expert Consultation Summary

**Domain Experts Consulted:**
- **MeatyCapture Architect** - Validated port/adapter integration, confirmed DocStore API sufficiency
- **UI/UX Designer** - Recommended glass/x-morphism styling consistency, tab navigation pattern
- **Frontend Architect** - Advised on TanStack Table patterns, bundle size optimization, React performance
- **Accessibility Specialist** - Confirmed Radix UI accessibility compliance, keyboard navigation requirements

**Key Insights:**
1. Existing DocStore API is sufficient - no port interface changes needed
2. Tab navigation integrates cleanly with existing wizard/admin pattern
3. TanStack Table provides necessary features without bundle bloat
4. Radix UI primitives ensure accessibility baseline (WCAG 2.1 AA)
5. Web/Tauri code parity maintained through adapter layer only

### B. Code Examples/Prototypes

#### Catalog Filtering Logic (Headless Core)

```typescript
// @core/catalog/index.ts
import type { DocMeta, Project } from '@core/models';

export interface CatalogFilters {
  projectId?: string;
  type?: string[];
  domain?: string[];
  priority?: string[];
  status?: string[];
  tags?: string[];
  searchText?: string;
}

/**
 * Filter documents based on multiple criteria
 * All filters are AND conditions (must match all)
 * Array filters are OR within array (match any)
 */
export function filterDocuments(
  docs: DocMeta[],
  filters: CatalogFilters
): DocMeta[] {
  return docs.filter((doc) => {
    // Project filter
    if (filters.projectId && doc.project_id !== filters.projectId) {
      return false;
    }

    // Text search (case-insensitive, matches title or doc_id)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const matchesTitle = doc.title.toLowerCase().includes(searchLower);
      const matchesDocId = doc.doc_id.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesDocId) {
        return false;
      }
    }

    // Type filter (matches items_index types)
    if (filters.type && filters.type.length > 0) {
      // Need to check if any item in the doc matches the type
      // This requires loading full doc or enriching DocMeta
      // For MVP: defer to TanStack Table client-side filtering
    }

    // Tag filter (matches doc-level tags)
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((tag) =>
        doc.tags?.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Group documents by project for hierarchical display
 */
export function groupByProject(
  docs: DocMeta[],
  projects: Project[]
): Map<string, { project: Project; docs: DocMeta[] }> {
  const groups = new Map<string, { project: Project; docs: DocMeta[] }>();

  // Initialize groups for all projects
  for (const project of projects) {
    groups.set(project.id, { project, docs: [] });
  }

  // Assign documents to project groups
  for (const doc of docs) {
    const group = groups.get(doc.project_id);
    if (group) {
      group.docs.push(doc);
    }
  }

  // Remove empty groups
  for (const [projectId, group] of groups.entries()) {
    if (group.docs.length === 0) {
      groups.delete(projectId);
    }
  }

  return groups;
}
```

#### DocumentCatalog Component (TanStack Table)

```typescript
// @ui/viewer/DocumentCatalog.tsx
import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import type { DocMeta } from '@core/models';

interface DocumentCatalogProps {
  documents: DocMeta[];
  onDocumentSelect: (doc: DocMeta) => void;
}

export function DocumentCatalog({
  documents,
  onDocumentSelect
}: DocumentCatalogProps) {
  const [expanded, setExpanded] = useState({});

  const columns: ColumnDef<DocMeta>[] = [
    {
      accessorKey: 'project_id',
      header: 'Project',
      enableGrouping: true,
    },
    {
      accessorKey: 'doc_id',
      header: 'Document ID',
      cell: ({ getValue }) => (
        <code className="text-sm font-mono">{getValue() as string}</code>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'item_count',
      header: 'Items',
      cell: ({ getValue }) => (
        <span className="badge">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ getValue }) => {
        const date = getValue() as Date;
        return <time>{date.toLocaleDateString()}</time>;
      },
    },
  ];

  const table = useReactTable({
    data: documents,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="document-catalog">
      <table className="catalog-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onDocumentSelect(row.original)}
              className="catalog-row"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### C. Reference Materials

**MeatyCapture Documentation:**
- [PRD: MeatyCapture](/Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/initialization/prd.md) - Product requirements and scope
- [Implementation Plan](/Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/initialization/implementation-plan.md) - Architecture and phasing
- [Design Spec](/Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/initialization/design-spec.md) - Data models and UX flows
- [DocStore Port Interface](/Users/miethe/dev/homelab/development/meatycapture/src/core/ports/index.ts) - Storage abstraction
- [RequestLogDoc Model](/Users/miethe/dev/homelab/development/meatycapture/src/core/models/index.ts) - Domain entities

**External Libraries:**
- [TanStack Table Documentation](https://tanstack.com/table/latest) - Headless table library
- [Radix UI Documentation](https://www.radix-ui.com/primitives/docs/overview/introduction) - Accessible UI primitives
- [shadcn/ui Components](https://ui.shadcn.com/docs/components/data-table) - Pre-built component examples
- [cmdk Documentation](https://cmdk.pablopunk.com/) - Command palette pattern

**Design Patterns:**
- [Port/Adapter Pattern](https://en.wikipedia.org/wiki/Hexagonal_architecture_(software)) - Architectural foundation
- [Headless UI Components](https://www.patterns.dev/posts/headless-ui) - Component composition
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards

**Competitive Analysis:**
- GitHub Issues Viewer - Filtering and grouping patterns
- Linear Issue List - Command palette integration
- Notion Database Views - Multi-dimensional filtering
- Jira Issue Navigator - Advanced search and saved filters

---

**Next Steps:**
1. Review SPIKE findings with product and engineering teams
2. Create ADRs for key architectural decisions (catalog storage, UI library)
3. Update project roadmap with viewer feature priority
4. Assign implementation team and kick off Phase 1

**Questions/Feedback:** Contact SPIKE Writer Agent or Lead Architect
