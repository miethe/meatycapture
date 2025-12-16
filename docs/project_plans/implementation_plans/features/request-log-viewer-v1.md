# Implementation Plan: Request Log Viewer (v1)

**Complexity**: Medium (M) | **Track**: Standard
**Estimated Effort**: 37 Story Points | **Timeline**: 2-3 Weeks
**Feature Owner**: Frontend Team | **Status**: Planning
**PRD Reference**: [Request Log Viewer PRD](../../PRDs/features/request-log-viewer-v1.md)

---

## Executive Summary

Add a read-only catalog viewer to MeatyCapture that enables users to browse, filter, and read existing request-log markdown documents across all projects. The viewer provides project-grouped catalog display, multi-criteria filtering (type, domain, priority, status, tags, text search), document detail expansion with markdown rendering, and full keyboard navigation support.

### Key Objectives

1. **Catalog Foundation**: Headless filtering/grouping logic in @core/catalog module
2. **UI Components**: TanStack Table-based catalog with shadcn/ui primitives
3. **Navigation Integration**: Add Viewer tab to main app navigation
4. **Performance**: Client-side caching and optimized rendering for 500+ documents
5. **Accessibility**: WCAG 2.1 AA compliance with full keyboard navigation

### Architecture Pattern

```
App.tsx (Tab Navigation: Capture | Viewer | Admin)
    ↓
ViewerContainer
    ↓ Loads: ProjectStore.list() → DocStore.list(path) for each project
    ↓ State: FilterState, CatalogCache Map<path, RequestLogDoc>
    ↓
├── DocumentFilters (Project, Type, Domain, Priority, Status, Tags, Text Search)
├── DocumentCatalog (TanStack Table with project grouping)
│   ├── ProjectGroupRow (Collapsible header)
│   ├── DocumentRow (Metadata: doc_id, title, item_count, updated_at, tags)
│   └── DocumentDetail (Expandable: items_index + full items with markdown)
└── Toast (Error/success notifications)
```

### Success Criteria

- [ ] Catalog loads and displays all documents grouped by project
- [ ] All filters work correctly (project, type, domain, priority, status, tags, text search)
- [ ] Document detail view expands with full item content and markdown rendering
- [ ] Filter operations complete in <100ms for 500 documents
- [ ] Document detail loads in <500ms
- [ ] Zero axe-core accessibility violations
- [ ] Full keyboard navigation support
- [ ] 100% code parity between web and Tauri platforms
- [ ] Bundle size impact <50KB gzipped
- [ ] Unit test coverage >80% for catalog logic

---

## Implementation Phases

### Phase 1: Foundation Layer (Catalog Core)
**Duration**: 1.5-2 days | **Story Points**: 8

Build headless catalog module with filtering, grouping, and DocStore integration utilities.

**Key Deliverables**:
- Core catalog types (FilterState, CatalogEntry, GroupedCatalog)
- Document filtering logic (project, type, domain, priority, status, tags, text)
- Project grouping and sorting utilities
- listAllDocuments() utility for multi-project scanning
- Unit tests for all filter combinations

**Dependencies**: None (uses existing DocStore/ProjectStore interfaces)

**Validation**: All filter functions work correctly, tests achieve >80% coverage

---

### Phase 2: UI Components (Viewer Interface)
**Duration**: 2-2.5 days | **Story Points**: 13

Implement React components for catalog display, filtering, and document detail viewing.

**Key Deliverables**:
- Install shadcn/ui dependencies (TanStack Table, Radix UI primitives)
- ViewerContainer orchestration component
- DocumentFilters toolbar with all filter controls
- DocumentCatalog with TanStack Table (sorting, grouping, expansion)
- DocumentDetail component with markdown rendering
- Glass/x-morphism styling matching wizard/admin aesthetic
- Loading states and error handling

**Dependencies**: Phase 1 (catalog core logic)

**Validation**: All components render correctly, filters update catalog display

---

### Phase 3: Navigation Integration (App-Level)
**Duration**: 0.5-1 day | **Story Points**: 4

Integrate Viewer tab into main application navigation.

**Key Deliverables**:
- Update App.tsx with 'viewer' tab option
- Add Viewer navigation button
- Keyboard shortcuts (Cmd/Ctrl + 1/2/3 for Capture/Viewer/Admin)
- Cross-platform testing (web + Tauri)
- Route state management

**Dependencies**: Phase 2 (viewer UI components)

**Validation**: Viewer tab accessible from navigation, keyboard shortcuts work

---

### Phase 4: Performance Optimization
**Duration**: 0.5-1 day | **Story Points**: 6

Optimize catalog loading, filtering, and document detail rendering for performance.

**Key Deliverables**:
- Client-side document cache (Map<path, RequestLogDoc>)
- Progressive loading (DocMeta first, full doc on demand)
- Debounced text search (300ms)
- Memoized filter functions
- Performance benchmarks (100/500/1000 documents)

**Dependencies**: Phase 2 (viewer UI components)

**Validation**: Performance targets met (<100ms filter, <500ms document load)

---

### Phase 5: Testing & Quality Assurance
**Duration**: 1 day | **Story Points**: 6

Comprehensive testing across unit, component, integration, accessibility, and performance dimensions.

**Key Deliverables**:
- Unit tests for catalog filtering logic (included in Phase 1)
- Component tests for all viewer UI components
- Integration tests with all DocStore adapters (browser-storage, api-client, fs-local)
- Accessibility tests (axe-core, keyboard nav, screen reader)
- Performance benchmarks and bundle size analysis
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Tauri platform testing (Windows, macOS, Linux)

**Dependencies**: Phases 1-4 (all implementation complete)

**Validation**: All tests pass, zero accessibility violations, performance targets met

---

## Task Breakdown

### PHASE 1: Foundation Layer (Catalog Core)

#### TASK-VWR-001: Define Catalog Types and Interfaces
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create TypeScript types and interfaces for catalog filtering, grouping, and state management.

**Acceptance Criteria**:
- [ ] FilterState interface with all filter criteria (project, type, domain, priority, status, tags, text)
- [ ] CatalogEntry extends DocMeta with project reference
- [ ] GroupedCatalog type for project-grouped display
- [ ] FilterOptions type for available filter values
- [ ] Type guards and validation functions
- [ ] JSDoc documentation for all types

**Estimate**: 2 points

**Files**:
- `src/core/catalog/types.ts` (create)

---

#### TASK-VWR-002: Implement Document Filtering Logic
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create pure functions for filtering catalog documents based on multiple criteria.

**Acceptance Criteria**:
- [ ] filterByProject() - single project filter
- [ ] filterByType() - multi-select type filter (OR logic within array)
- [ ] filterByDomain() - multi-select domain filter
- [ ] filterByPriority() - multi-select priority filter
- [ ] filterByStatus() - multi-select status filter
- [ ] filterByTags() - multi-select tag filter (intersection logic)
- [ ] filterByText() - case-insensitive search on title/doc_id
- [ ] applyFilters() - composite filter function (AND logic between criteria)
- [ ] All functions return new arrays (immutable)

**Estimate**: 3 points

**Files**:
- `src/core/catalog/filter.ts` (create)

---

#### TASK-VWR-003: Implement Project Grouping and Sorting
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create functions for grouping documents by project and sorting within groups.

**Acceptance Criteria**:
- [ ] groupByProject() - returns Map<project_id, CatalogEntry[]>
- [ ] sortDocuments() - sort by date (desc), item_count, or doc_id
- [ ] sortProjects() - sort project groups by name or document count
- [ ] createGroupedCatalog() - combines grouping and sorting
- [ ] Handles missing/null project references gracefully

**Estimate**: 2 points

**Files**:
- `src/core/catalog/group.ts` (create)

---

#### TASK-VWR-004: Implement listAllDocuments Utility
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create utility function to scan all projects and aggregate DocMeta[] results.

**Acceptance Criteria**:
- [ ] Accepts ProjectStore and DocStore instances
- [ ] Calls ProjectStore.list() to get all projects
- [ ] For each enabled project, calls DocStore.list(default_path)
- [ ] Enriches DocMeta with project_id reference
- [ ] Returns aggregated CatalogEntry[]
- [ ] Handles filesystem errors gracefully (skip + log)
- [ ] Filters out disabled projects
- [ ] Sorts results by updated_at descending

**Estimate**: 2 points

**Files**:
- `src/core/catalog/utils.ts` (create)

---

#### TASK-VWR-005: Write Unit Tests for Catalog Module
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Comprehensive unit tests for all catalog filtering and grouping logic.

**Acceptance Criteria**:
- [ ] Tests for all individual filter functions
- [ ] Tests for composite filter combinations
- [ ] Tests for grouping and sorting functions
- [ ] Tests for listAllDocuments with mocked stores
- [ ] Edge cases: empty catalogs, no matches, invalid data
- [ ] Performance tests for large catalogs (500+ documents)
- [ ] Test coverage >80%

**Estimate**: 3 points

**Files**:
- `src/core/catalog/__tests__/filter.test.ts` (create)
- `src/core/catalog/__tests__/group.test.ts` (create)
- `src/core/catalog/__tests__/utils.test.ts` (create)

---

#### TASK-VWR-006: Create Catalog Module Index
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create barrel export for catalog module with clean public API.

**Acceptance Criteria**:
- [ ] Exports all types from types.ts
- [ ] Exports all filter functions from filter.ts
- [ ] Exports all grouping functions from group.ts
- [ ] Exports utility functions from utils.ts
- [ ] JSDoc module documentation
- [ ] README.md in catalog/ explaining usage

**Estimate**: 1 point

**Files**:
- `src/core/catalog/index.ts` (create)
- `src/core/catalog/README.md` (create)

---

### PHASE 2: UI Components (Viewer Interface)

#### TASK-VWR-007: Install and Configure shadcn/ui Dependencies
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Install TanStack Table, Radix UI primitives, and utility libraries for viewer components.

**Acceptance Criteria**:
- [ ] Install @tanstack/react-table ^8.11.0
- [ ] Install @radix-ui/react-dropdown-menu ^2.0.0
- [ ] Install @radix-ui/react-select ^2.0.0
- [ ] Install @radix-ui/react-accordion ^1.1.0
- [ ] Install class-variance-authority ^0.7.0
- [ ] Install clsx ^2.0.0
- [ ] Install tailwind-merge ^2.0.0
- [ ] Configure TypeScript paths for @ui/viewer
- [ ] Verify bundle size impact <50KB

**Estimate**: 1 point

**Files**:
- `package.json` (modify)
- `tsconfig.json` (modify if needed)

---

#### TASK-VWR-008: Create ViewerContainer Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build orchestration component that manages catalog loading, filter state, and document cache.

**Acceptance Criteria**:
- [ ] Loads projects via ProjectStore.list()
- [ ] Calls listAllDocuments() utility to build catalog
- [ ] Manages FilterState in React state
- [ ] Manages document cache Map<path, RequestLogDoc>
- [ ] Provides filter handlers to DocumentFilters
- [ ] Provides catalog data to DocumentCatalog
- [ ] Shows loading skeleton during initial load
- [ ] Shows error toast on load failure
- [ ] Manual refresh button to re-scan filesystem
- [ ] Empty state when no documents exist

**Estimate**: 3 points

**Files**:
- `src/ui/viewer/ViewerContainer.tsx` (create)
- `src/ui/viewer/types.ts` (create)

---

#### TASK-VWR-009: Create DocumentFilters Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build filter toolbar with all filter controls using Radix UI primitives.

**Acceptance Criteria**:
- [ ] Project dropdown (single-select, shows all projects)
- [ ] Type multi-select dropdown
- [ ] Domain multi-select dropdown
- [ ] Priority multi-select dropdown
- [ ] Status multi-select dropdown
- [ ] Tags multi-select with autocomplete
- [ ] Text search input with debounce (300ms)
- [ ] Clear filters button
- [ ] Active filter badges/pills
- [ ] Responsive layout (mobile-friendly)
- [ ] Keyboard navigation support
- [ ] ARIA labels and roles

**Estimate**: 5 points

**Files**:
- `src/ui/viewer/DocumentFilters.tsx` (create)
- `src/ui/viewer/FilterDropdown.tsx` (create - reusable)
- `src/ui/viewer/FilterBadge.tsx` (create)

---

#### TASK-VWR-010: Create DocumentCatalog Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build table component using TanStack Table with project grouping and row expansion.

**Acceptance Criteria**:
- [ ] Uses TanStack Table for data management
- [ ] Column definitions: doc_id, title, item_count, updated_at, tags
- [ ] Project grouping with collapsible headers
- [ ] Row expansion for document detail
- [ ] Sorting by date (default desc), item_count, doc_id
- [ ] Loading states for expanded rows
- [ ] Empty state message when filters return no results
- [ ] Keyboard navigation (arrow keys, enter for expand)
- [ ] ARIA table semantics
- [ ] Glass/x-morphism styling

**Estimate**: 5 points

**Files**:
- `src/ui/viewer/DocumentCatalog.tsx` (create)
- `src/ui/viewer/DocumentRow.tsx` (create)
- `src/ui/viewer/ProjectGroupRow.tsx` (create)

---

#### TASK-VWR-011: Create DocumentDetail Component
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Build expanded row content showing items_index and full item details with markdown rendering.

**Acceptance Criteria**:
- [ ] Displays items_index summary (id, type, title)
- [ ] Displays full item details (all fields + notes)
- [ ] Markdown rendering for item notes
- [ ] Copy item ID to clipboard button
- [ ] Item filtering by type within document (optional)
- [ ] Syntax highlighting for code blocks in notes
- [ ] Loading state while fetching full document
- [ ] Error handling for corrupted documents
- [ ] Keyboard accessible (tab through items)
- [ ] ARIA live region for clipboard feedback

**Estimate**: 3 points

**Files**:
- `src/ui/viewer/DocumentDetail.tsx` (create)
- `src/ui/viewer/ItemCard.tsx` (create)
- `src/ui/viewer/MarkdownRenderer.tsx` (create - reusable)

---

#### TASK-VWR-012: Apply Glass/X-Morphism Styling
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Apply consistent styling to match wizard and admin aesthetic.

**Acceptance Criteria**:
- [ ] Matches existing glass/x-morphism design language
- [ ] Smooth transitions for expand/collapse (300ms ease)
- [ ] Hover states for interactive elements
- [ ] Focus indicators (2px outline with offset)
- [ ] Loading skeleton animations
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support (if existing in app)

**Estimate**: 2 points

**Files**:
- `src/ui/viewer/styles.css` (create)
- Update component files with CSS classes

---

#### TASK-VWR-013: Create Viewer Index and Exports
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Create barrel export for viewer module and ensure clean component API.

**Acceptance Criteria**:
- [ ] Exports ViewerContainer as default
- [ ] Exports sub-components for testing
- [ ] Exports types for external use
- [ ] JSDoc documentation for public API
- [ ] README.md explaining component hierarchy

**Estimate**: 1 point

**Files**:
- `src/ui/viewer/index.ts` (create)
- `src/ui/viewer/README.md` (create)

---

### PHASE 3: Navigation Integration (App-Level)

#### TASK-VWR-014: Update App.tsx with Viewer Tab
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Add 'viewer' to View type union and update navigation state management.

**Acceptance Criteria**:
- [ ] Update View type: 'capture' | 'viewer' | 'admin'
- [ ] Add viewer case to view rendering logic
- [ ] Import and render ViewerContainer
- [ ] Preserve existing capture and admin views
- [ ] Handle view state transitions
- [ ] Default view remains 'capture'

**Estimate**: 1 point

**Files**:
- `src/App.tsx` (modify)

---

#### TASK-VWR-015: Add Viewer Navigation Button
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Add Viewer button to main navigation bar.

**Acceptance Criteria**:
- [ ] Navigation button for Viewer tab
- [ ] Active state styling when viewer selected
- [ ] Matches existing button styling (Capture, Admin)
- [ ] Responsive layout (mobile menu if applicable)
- [ ] ARIA label: "Navigate to Viewer"
- [ ] Focus indicator on keyboard navigation

**Estimate**: 1 point

**Files**:
- `src/App.tsx` (modify)
- Navigation component files (if separate)

---

#### TASK-VWR-016: Implement Keyboard Shortcuts
**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Add keyboard shortcuts for tab navigation (Cmd/Ctrl + 1/2/3).

**Acceptance Criteria**:
- [ ] Cmd/Ctrl + 1: Navigate to Capture
- [ ] Cmd/Ctrl + 2: Navigate to Viewer
- [ ] Cmd/Ctrl + 3: Navigate to Admin
- [ ] Works on macOS (Cmd) and Windows/Linux (Ctrl)
- [ ] Prevents default browser shortcuts
- [ ] Shows keyboard hints in UI (optional tooltip)
- [ ] Cleanup event listeners on unmount

**Estimate**: 2 points

**Files**:
- `src/ui/shared/useKeyboardShortcuts.ts` (create hook)
- `src/App.tsx` (modify - use hook)

---

#### TASK-VWR-017: Cross-Platform Testing (Web + Tauri)
**Assigned**: task-completion-validator (Sonnet)

**Description**: Verify viewer works correctly on both web and Tauri platforms.

**Acceptance Criteria**:
- [ ] Web app: browser-storage adapter integration tested
- [ ] Web app: api-client adapter integration tested
- [ ] Tauri app: fs-local adapter integration tested (Windows, macOS, Linux)
- [ ] Document listing works on all platforms
- [ ] Document detail loading works on all platforms
- [ ] Filters work identically across platforms
- [ ] No platform-specific bugs or regressions

**Estimate**: 2 points

**Files**:
- Test plan document
- Bug reports (if any)

---

### PHASE 4: Performance Optimization

#### TASK-VWR-018: Implement Client-Side Document Cache
**Assigned**: react-performance-optimizer (Sonnet)

**Description**: Add Map-based caching for loaded documents to avoid redundant reads.

**Acceptance Criteria**:
- [ ] Map<path, RequestLogDoc> in ViewerContainer state
- [ ] Check cache before calling DocStore.read()
- [ ] Update cache on successful read
- [ ] Invalidate cache on manual refresh
- [ ] Cache persists during filter operations
- [ ] Memory-efficient (no cache size limits for MVP)

**Estimate**: 2 points

**Files**:
- `src/ui/viewer/ViewerContainer.tsx` (modify)
- `src/ui/viewer/hooks/useDocumentCache.ts` (create hook)

---

#### TASK-VWR-019: Implement Progressive Loading
**Assigned**: react-performance-optimizer (Sonnet)

**Description**: Load DocMeta first for catalog display, full documents only on row expansion.

**Acceptance Criteria**:
- [ ] Initial load calls listAllDocuments() (DocMeta only)
- [ ] Row expansion triggers DocStore.read() for full document
- [ ] Loading indicator shows during full document fetch
- [ ] Catalog remains interactive during detail loading
- [ ] Error handling for failed document reads

**Estimate**: 2 points

**Files**:
- `src/ui/viewer/ViewerContainer.tsx` (modify)
- `src/ui/viewer/DocumentCatalog.tsx` (modify)

---

#### TASK-VWR-020: Implement Debounced Text Search
**Assigned**: react-performance-optimizer (Sonnet)

**Description**: Add 300ms debounce to text search input to reduce filter operations.

**Acceptance Criteria**:
- [ ] Search input debounced using custom hook or library
- [ ] Debounce delay: 300ms
- [ ] Shows loading indicator during debounce
- [ ] Cancels pending filter on new input
- [ ] Cleanup timers on component unmount

**Estimate**: 1 point

**Files**:
- `src/ui/viewer/DocumentFilters.tsx` (modify)
- `src/ui/shared/hooks/useDebounce.ts` (create hook)

---

#### TASK-VWR-021: Memoize Filter Functions
**Assigned**: react-performance-optimizer (Sonnet)

**Description**: Use React.useMemo to prevent unnecessary filter recalculations.

**Acceptance Criteria**:
- [ ] Memoize filtered catalog based on FilterState
- [ ] Memoize grouped catalog based on filtered results
- [ ] Memoize filter options (available types, tags, etc.)
- [ ] Dependency arrays correctly track state changes
- [ ] No unnecessary re-renders of child components

**Estimate**: 1 point

**Files**:
- `src/ui/viewer/ViewerContainer.tsx` (modify)
- `src/ui/viewer/DocumentCatalog.tsx` (modify)

---

#### TASK-VWR-022: Performance Benchmarking
**Assigned**: task-completion-validator (Sonnet)

**Description**: Measure and validate performance targets for catalog operations.

**Acceptance Criteria**:
- [ ] Benchmark catalog load time (100, 500, 1000 documents)
- [ ] Benchmark filter operation latency (all filter types)
- [ ] Benchmark document detail load time
- [ ] Benchmark text search with debounce
- [ ] Targets: catalog <3s for 500 docs, filter <100ms, detail <500ms
- [ ] Document results in performance report
- [ ] Identify bottlenecks for future optimization

**Estimate**: 2 points

**Files**:
- `docs/performance/viewer-benchmarks.md` (create)
- Test scripts for benchmark execution

---

### PHASE 5: Testing & Quality Assurance

#### TASK-VWR-023: Component Tests for Viewer UI
**Assigned**: task-completion-validator (Sonnet)

**Description**: Write component tests for all viewer UI components using Testing Library.

**Acceptance Criteria**:
- [ ] ViewerContainer: loading, error, empty states
- [ ] DocumentFilters: all filter controls render and update state
- [ ] DocumentCatalog: table renders, sorting works, grouping works
- [ ] DocumentDetail: expansion works, markdown renders, clipboard works
- [ ] Mocked DocStore and ProjectStore for tests
- [ ] User interaction tests (click, type, keyboard nav)
- [ ] Test coverage >70% for UI components

**Estimate**: 3 points

**Files**:
- `src/ui/viewer/__tests__/ViewerContainer.test.tsx` (create)
- `src/ui/viewer/__tests__/DocumentFilters.test.tsx` (create)
- `src/ui/viewer/__tests__/DocumentCatalog.test.tsx` (create)
- `src/ui/viewer/__tests__/DocumentDetail.test.tsx` (create)

---

#### TASK-VWR-024: Integration Tests with All Adapters
**Assigned**: task-completion-validator (Sonnet)

**Description**: Integration tests verifying viewer works with all DocStore adapter implementations.

**Acceptance Criteria**:
- [ ] Test with browser-storage adapter (IndexedDB)
- [ ] Test with api-client adapter (mocked HTTP)
- [ ] Test with fs-local adapter (temp filesystem)
- [ ] Verify listAllDocuments() works with each adapter
- [ ] Verify document detail loading works with each adapter
- [ ] Error handling for adapter-specific failures
- [ ] Test with empty projects, missing files, corrupted data

**Estimate**: 3 points

**Files**:
- `src/ui/viewer/__tests__/integration/adapters.test.tsx` (create)
- Test fixture data for different scenarios

---

#### TASK-VWR-025: Accessibility Testing
**Assigned**: task-completion-validator (Sonnet)

**Description**: Comprehensive accessibility testing to ensure WCAG 2.1 AA compliance.

**Acceptance Criteria**:
- [ ] Run axe-core automated tests (zero violations)
- [ ] Keyboard navigation testing (all interactive elements reachable)
- [ ] Screen reader testing (VoiceOver or NVDA)
- [ ] Focus management testing (filters → table → detail)
- [ ] Color contrast validation (4.5:1 minimum)
- [ ] ARIA labels and roles verified
- [ ] Test with real assistive technologies
- [ ] Document accessibility test results

**Estimate**: 2 points

**Files**:
- `src/ui/viewer/__tests__/a11y.test.tsx` (create)
- `docs/accessibility/viewer-a11y-report.md` (create)

---

#### TASK-VWR-026: Cross-Browser Testing
**Assigned**: task-completion-validator (Sonnet)

**Description**: Test viewer functionality across major browsers.

**Acceptance Criteria**:
- [ ] Chrome 90+ (latest stable)
- [ ] Firefox 88+ (latest stable)
- [ ] Safari 14+ (macOS)
- [ ] Edge 90+ (Windows)
- [ ] Verify all features work identically
- [ ] Check for browser-specific bugs
- [ ] Verify performance is acceptable on all browsers
- [ ] Document any browser-specific quirks

**Estimate**: 1 point

**Files**:
- `docs/testing/browser-compatibility-report.md` (create)

---

#### TASK-VWR-027: Bundle Size Analysis
**Assigned**: task-completion-validator (Sonnet)

**Description**: Verify bundle size impact meets <50KB gzipped target.

**Acceptance Criteria**:
- [ ] Run bundle analyzer before and after viewer implementation
- [ ] Measure viewer component bundle size
- [ ] Measure shadcn/ui dependency impact
- [ ] Verify total impact <50KB gzipped
- [ ] Identify any unexpectedly large dependencies
- [ ] Document bundle analysis results
- [ ] Suggest optimizations if target not met

**Estimate**: 1 point

**Files**:
- `docs/performance/bundle-analysis.md` (create)

---

## Task Summary

### Complexity Assessment

**Project Complexity**: Medium (M)
- **Total Tasks**: 27
- **Total Story Points**: 37
- **Estimated Timeline**: 2-3 weeks (assuming 5-7 points/day velocity)
- **Track**: Standard (Haiku + Sonnet agents)

### Effort Distribution by Phase

| Phase | Tasks | Story Points | Duration |
|-------|-------|--------------|----------|
| Phase 1: Foundation Layer | 6 | 8 | 1.5-2 days |
| Phase 2: UI Components | 7 | 13 | 2-2.5 days |
| Phase 3: Navigation Integration | 4 | 4 | 0.5-1 day |
| Phase 4: Performance Optimization | 5 | 6 | 0.5-1 day |
| Phase 5: Testing & QA | 5 | 6 | 1 day |
| **Total** | **27** | **37** | **6-7.5 days** |

### Agent Assignment Summary

| Agent | Model | Tasks | Story Points |
|-------|-------|-------|--------------|
| backend-typescript-architect | Sonnet | 6 | 13 |
| ui-engineer-enhanced | Sonnet | 10 | 21 |
| react-performance-optimizer | Sonnet | 5 | 8 |
| task-completion-validator | Sonnet | 6 | 9 |

---

## Dependencies & Prerequisites

### External Dependencies

**NPM Packages** (all included in ~40-50KB bundle):
- @tanstack/react-table ^8.11.0
- @radix-ui/react-dropdown-menu ^2.0.0
- @radix-ui/react-select ^2.0.0
- @radix-ui/react-accordion ^1.1.0
- class-variance-authority ^0.7.0
- clsx ^2.0.0
- tailwind-merge ^2.0.0

### Internal Dependencies

**Stable (no changes required)**:
- @core/ports (DocStore, ProjectStore interfaces)
- @core/models (RequestLogDoc, DocMeta, Project)
- @core/serializer (parse() function for markdown)
- @adapters/browser-storage (IDB DocStore implementation)
- @adapters/api-client (HTTP DocStore implementation)
- @adapters/fs-local (Filesystem DocStore implementation)
- @ui/shared (Toast, FormField components)

**Requires modification**:
- App.tsx (add viewer tab navigation)

### Blocking Dependencies

- None (all dependencies are stable existing interfaces)

---

## Risk Assessment & Mitigation

### High Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance degradation with 1000+ docs | High | Medium | Implement virtualization if benchmarks show issues; add catalog indexing in Phase 2 if needed |
| Web/Tauri code parity breaks | High | Low | Share all UI code in ui/ layer; comprehensive cross-platform testing |
| TanStack Table complexity | Medium | Medium | Start with simple table, add features incrementally; fallback to custom table if needed |

### Medium Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Bundle size exceeds 50KB | Medium | Low | Use bundle analyzer; tree-shake unused Radix components; code split if necessary |
| Accessibility regressions | Medium | Low | Use Radix UI primitives (accessible by default); test with screen readers; keyboard nav tests |
| Stale catalog data | Low | Medium | Add manual refresh button; document on-demand scan behavior; future: file watching |

### Low Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Corrupted markdown parsing | Medium | Low | Graceful error handling in DocStore.read(); skip invalid docs with warning toast |
| Filter UI complexity | Medium | Low | Prioritize common filters; use collapsible panel; defer advanced filters |
| Text search performance | Low | Low | Debounce 300ms; filter in-memory; consider Web Worker if >1000 docs |

---

## Quality Gates

### Phase Completion Criteria

Each phase must meet these criteria before moving to next phase:

**Phase 1 - Foundation**:
- [ ] All catalog types defined with JSDoc
- [ ] All filter functions implemented and tested
- [ ] Unit test coverage >80%
- [ ] No TypeScript errors
- [ ] Performance tests pass for 500 documents

**Phase 2 - UI Components**:
- [ ] All components render without errors
- [ ] Filter controls update state correctly
- [ ] Table displays catalog data with grouping
- [ ] Document detail expands with full content
- [ ] Glass/x-morphism styling applied
- [ ] No console errors or warnings

**Phase 3 - Navigation**:
- [ ] Viewer tab accessible from main navigation
- [ ] Keyboard shortcuts work correctly
- [ ] No regressions in existing Capture/Admin tabs
- [ ] Cross-platform testing passes

**Phase 4 - Performance**:
- [ ] Catalog load <3s for 500 documents
- [ ] Filter operations <100ms
- [ ] Document detail load <500ms
- [ ] Text search debounced 300ms
- [ ] Bundle size <50KB gzipped

**Phase 5 - Testing**:
- [ ] All component tests pass
- [ ] Integration tests pass with all adapters
- [ ] Zero axe-core violations
- [ ] Full keyboard navigation works
- [ ] Cross-browser testing complete
- [ ] Performance benchmarks documented

---

## Documentation Deliverables

### Required Documentation

1. **User Guide** (`docs/user-guide/viewer.md`)
   - How to use the Viewer tab
   - Filter usage and examples
   - Keyboard shortcuts reference
   - Troubleshooting common issues

2. **Developer Guide** (`src/core/catalog/README.md`)
   - Catalog module architecture
   - Filter function API reference
   - Extending filters guide
   - Performance considerations

3. **Component Documentation** (`src/ui/viewer/README.md`)
   - Component hierarchy diagram
   - Props API for each component
   - Styling customization guide
   - Testing patterns

4. **ADR: Catalog Storage Strategy** (`docs/adr/catalog-storage-strategy.md`)
   - Why on-demand scan vs JSON index
   - Performance trade-offs
   - Future migration path

5. **ADR: UI Component Library Selection** (`docs/adr/ui-library-shadcn-tanstack.md`)
   - Why shadcn/ui + TanStack Table
   - Alternatives considered
   - Bundle size analysis

6. **Performance Report** (`docs/performance/viewer-benchmarks.md`)
   - Benchmark methodology
   - Results for 100/500/1000 documents
   - Bottleneck analysis
   - Future optimization opportunities

7. **Accessibility Report** (`docs/accessibility/viewer-a11y-report.md`)
   - WCAG 2.1 AA compliance checklist
   - Screen reader testing notes
   - Keyboard navigation patterns
   - Known limitations

8. **CHANGELOG Entry**
   - Feature announcement
   - Breaking changes (none expected)
   - Migration guide (none required)

---

## Acceptance Criteria (Definition of Done)

### Functional Acceptance

- [ ] All functional requirements from PRD implemented (FR-1 through FR-18)
- [ ] User can view catalog grouped by project
- [ ] All filter types work correctly (project, type, domain, priority, status, tags, text)
- [ ] Document detail view loads on row expansion
- [ ] Copy item ID to clipboard works
- [ ] Manual refresh re-scans filesystem
- [ ] Clear filters resets to default state
- [ ] Empty state shown when no documents exist
- [ ] Error handling for missing/corrupted files

### Technical Acceptance

- [ ] Follows MeatyCapture port/adapter architecture
- [ ] Uses existing DocStore/ProjectStore interfaces (no port changes)
- [ ] Headless catalog logic in @core/catalog module
- [ ] All UI components in @ui/viewer directory
- [ ] 100% code parity between web and Tauri platforms
- [ ] Bundle size <50KB gzipped verified with analyzer
- [ ] TanStack Table for sorting/filtering/grouping
- [ ] Radix UI primitives for accessible components
- [ ] Glass/x-morphism styling matches wizard/admin

### Quality Acceptance

- [ ] Unit tests >80% coverage for catalog filtering logic
- [ ] Component tests for all viewer UI components
- [ ] Integration tests with all three DocStore adapters
- [ ] Performance benchmarks met (catalog <3s, filter <100ms, detail <500ms)
- [ ] Accessibility WCAG 2.1 AA compliance verified with axe-core
- [ ] Keyboard navigation fully functional (manual testing)
- [ ] Screen reader compatibility tested (VoiceOver or NVDA)
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari, Edge)
- [ ] Tauri platform testing complete (Windows, macOS, Linux)

### Documentation Acceptance

- [ ] User guide for Viewer tab
- [ ] Developer documentation for catalog module
- [ ] Component documentation for all viewer components
- [ ] ADR for catalog storage strategy
- [ ] ADR for UI component library selection
- [ ] Performance benchmark report
- [ ] Accessibility testing report
- [ ] CHANGELOG.md updated with feature announcement

---

## Implementation Sequence

### Week 1: Foundation + Core UI

**Days 1-2**: Phase 1 - Foundation Layer
- backend-typescript-architect implements catalog core
- Focus: Types, filtering, grouping, unit tests

**Days 3-5**: Phase 2 - UI Components
- ui-engineer-enhanced implements viewer UI
- Focus: ViewerContainer, DocumentFilters, DocumentCatalog, DocumentDetail

### Week 2: Integration + Optimization

**Day 6**: Phase 3 - Navigation Integration
- ui-engineer-enhanced integrates viewer into App.tsx
- Focus: Tab navigation, keyboard shortcuts

**Day 7**: Phase 4 - Performance Optimization
- react-performance-optimizer adds caching and optimizations
- Focus: Document cache, progressive loading, debounce

**Days 8-9**: Phase 5 - Testing & QA
- task-completion-validator runs comprehensive testing
- Focus: Component tests, integration tests, accessibility, performance

**Day 10**: Buffer + Documentation
- Finalize documentation
- Address any bugs found during testing
- Prepare for release

---

## Open Questions & Decisions

### Resolved Decisions

1. **Project grouping mechanism**: Use TanStack Table grouping feature (native support)
2. **Filter persistence**: No localStorage persistence for MVP (reset on tab open)
3. **Inline editing**: No - maintain read-only viewer, use Capture wizard for edits
4. **Export features**: Deferred to Phase 2
5. **Command palette**: Deferred to Phase 2 (cmdk library)

### Outstanding Questions

- [ ] **Q1**: Should DocMeta include aggregated item types for client-side filtering without loading full doc?
  - **Impact**: Avoids loading full doc for type filtering, but requires DocStore.list() enhancement
  - **Recommendation**: Out of scope for MVP - add in Phase 2 if performance issues arise

- [ ] **Q2**: Should we add TanStack Virtual for >500 documents?
  - **Impact**: Better performance for large catalogs, but adds complexity and bundle size
  - **Recommendation**: Benchmark first, add only if performance targets not met

- [ ] **Q3**: Should expanded document state persist when filtering?
  - **Impact**: Better UX if user expands doc, then filters - stays expanded if still visible
  - **Recommendation**: Yes - track expanded paths in Set<path>, preserve during filter updates

- [ ] **Q4**: Should we add file watching for auto-refresh?
  - **Impact**: Better UX for multi-user scenarios, but complex Tauri integration
  - **Recommendation**: Deferred to Phase 2 - manual refresh sufficient for MVP

---

## Appendices

### A. Related Documents

- [Request Log Viewer PRD](../../PRDs/features/request-log-viewer-v1.md)
- [Request Log Viewer SPIKE](../../SPIKEs/request-log-viewer-spike.md)
- [MeatyCapture PRD](../../initialization/prd.md)
- [Design Spec](../../initialization/design-spec.md)
- [DocStore Port Interface](../../../../src/core/ports/index.ts)
- [Core Models](../../../../src/core/models/index.ts)

### B. Symbol References

**Core Symbols**:
- DocStore, ProjectStore, FieldCatalogStore (ports)
- RequestLogDoc, DocMeta, Project, ItemDraft (models)
- FilterState, CatalogEntry, GroupedCatalog (catalog types)

**Adapter Symbols**:
- FsDocStore, BrowserDocStore, ApiDocStore
- LocalProjectStore, BrowserProjectStore, ApiProjectStore

**UI Symbols**:
- ViewerContainer, DocumentFilters, DocumentCatalog, DocumentDetail
- StepShell, Toast, FormField (reused from existing)

### C. Prior Art & Inspiration

**Inspiration Sources**:
- **GitHub Issues Viewer**: Simple filtering, grouping by label/milestone
- **Linear Issue List**: Fast client-side filtering, keyboard shortcuts
- **Notion Database Views**: Multi-dimensional filtering, saved presets
- **VS Code File Explorer**: Tree grouping, keyboard navigation

**Key Lessons Applied**:
1. Keep catalog view lightweight (GitHub simplicity)
2. Prioritize client-side performance (Linear speed)
3. Clear filter controls over complex query builders (Notion usability)
4. Avoid feature bloat (Jira anti-pattern)

### D. Future Enhancements (Phase 2+)

**Potential Phase 2 Features**:
- Saved filter presets
- Command palette (Cmd+K) with fuzzy search
- Export to CSV/JSON/PDF
- Advanced date range filtering
- Real-time file watching for auto-refresh
- TanStack Virtual for 1000+ documents
- Batch operations (mark multiple docs for action)

**Long-Term Vision**:
- Multi-project dashboard with aggregated metrics
- Document version history
- Collaborative editing with conflict resolution
- AI-powered search and recommendations

---

**File Path**: `/Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/implementation_plans/features/request-log-viewer-v1.md`

**Created**: 2025-12-16
**Status**: Ready for Implementation
**Next Steps**: Begin Phase 1 - Foundation Layer implementation
