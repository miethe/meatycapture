---
type: progress-tracker
prd: request-log-viewer-v1
phase: 2
phase_name: "UI Components"
status: not-started
progress: 0
total_tasks: 7
completed_tasks: 0
story_points: 13
assigned_to: ui-engineer-enhanced
dependencies: ["phase-1-complete"]
related_docs:
  - docs/project_plans/PRDs/features/request-log-viewer-v1.md
  - docs/project_plans/implementation_plans/features/request-log-viewer-v1.md
  - .claude/progress/request-log-viewer/phase-1-progress.md
created: 2025-12-16
updated: 2025-12-16
---

# Phase 2 Progress: UI Components

**Duration**: 2-2.5 days | **Story Points**: 13 | **Status**: Not Started

Implement React components for catalog display, filtering, and document detail viewing.

## Key Deliverables

- Install shadcn/ui dependencies (TanStack Table, Radix UI primitives)
- ViewerContainer orchestration component
- DocumentFilters toolbar with all filter controls
- DocumentCatalog with TanStack Table (sorting, grouping, expansion)
- DocumentDetail component with markdown rendering
- Glass/x-morphism styling matching wizard/admin aesthetic
- Loading states and error handling

## Task List

### TASK-2.1: Install and Configure shadcn/ui Dependencies
**Status**: Not Started | **Points**: 1 | **Assigned**: ui-engineer-enhanced
**Dependencies**: phase-1-complete

Install TanStack Table, Radix UI primitives, and utility libraries for viewer components.

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

**Files**:
- `package.json` (modify)
- `tsconfig.json` (modify if needed)

---

### TASK-2.2: Create ViewerContainer Component
**Status**: Not Started | **Points**: 3 | **Assigned**: ui-engineer-enhanced
**Dependencies**: TASK-2.1

Build orchestration component that manages catalog loading, filter state, and document cache.

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

**Files**:
- `src/ui/viewer/ViewerContainer.tsx` (create)
- `src/ui/viewer/types.ts` (create)

---

### TASK-2.3: Create DocumentFilters Component
**Status**: Not Started | **Points**: 5 | **Assigned**: ui-engineer-enhanced
**Dependencies**: TASK-2.2

Build filter toolbar with all filter controls using Radix UI primitives.

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

**Files**:
- `src/ui/viewer/DocumentFilters.tsx` (create)
- `src/ui/viewer/FilterDropdown.tsx` (create - reusable)
- `src/ui/viewer/FilterBadge.tsx` (create)

---

### TASK-2.4: Create DocumentCatalog Component
**Status**: Not Started | **Points**: 5 | **Assigned**: ui-engineer-enhanced
**Dependencies**: TASK-2.2

Build table component using TanStack Table with project grouping and row expansion.

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

**Files**:
- `src/ui/viewer/DocumentCatalog.tsx` (create)
- `src/ui/viewer/DocumentRow.tsx` (create)
- `src/ui/viewer/ProjectGroupRow.tsx` (create)

---

### TASK-2.5: Create DocumentDetail Component
**Status**: Not Started | **Points**: 3 | **Assigned**: ui-engineer-enhanced
**Dependencies**: TASK-2.4

Build expanded row content showing items_index and full item details with markdown rendering.

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

**Files**:
- `src/ui/viewer/DocumentDetail.tsx` (create)
- `src/ui/viewer/ItemCard.tsx` (create)
- `src/ui/viewer/MarkdownRenderer.tsx` (create - reusable)

---

### TASK-2.6: Apply Glass/X-Morphism Styling
**Status**: Not Started | **Points**: 2 | **Assigned**: ui-engineer-enhanced
**Dependencies**: TASK-2.2, TASK-2.3, TASK-2.4, TASK-2.5

Apply consistent styling to match wizard and admin aesthetic.

**Acceptance Criteria**:
- [ ] Matches existing glass/x-morphism design language
- [ ] Smooth transitions for expand/collapse (300ms ease)
- [ ] Hover states for interactive elements
- [ ] Focus indicators (2px outline with offset)
- [ ] Loading skeleton animations
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support (if existing in app)

**Files**:
- `src/ui/viewer/styles.css` (create)
- Update component files with CSS classes

---

### TASK-2.7: Create Viewer Index and Exports
**Status**: Not Started | **Points**: 1 | **Assigned**: ui-engineer-enhanced
**Dependencies**: TASK-2.2, TASK-2.3, TASK-2.4, TASK-2.5

Create barrel export for viewer module and ensure clean component API.

**Acceptance Criteria**:
- [ ] Exports ViewerContainer as default
- [ ] Exports sub-components for testing
- [ ] Exports types for external use
- [ ] JSDoc documentation for public API
- [ ] README.md explaining component hierarchy

**Files**:
- `src/ui/viewer/index.ts` (create)
- `src/ui/viewer/README.md` (create)

---

## Parallelization Strategy

**Batch 1** (after TASK-2.1 complete):
- TASK-2.2 (ViewerContainer) - Foundation component

**Batch 2** (after TASK-2.2 complete):
- TASK-2.3 (DocumentFilters) - Independent from catalog
- TASK-2.4 (DocumentCatalog) - Independent from filters

**Batch 3** (after TASK-2.4 complete):
- TASK-2.5 (DocumentDetail) - Requires catalog component

**Batch 4** (after all components complete):
- TASK-2.6 (Styling) - Apply to all components
- TASK-2.7 (Index) - Final exports

## Completion Criteria

- [ ] All 7 tasks completed
- [ ] All components render without errors
- [ ] Filter controls update state correctly
- [ ] Table displays catalog data with grouping
- [ ] Document detail expands with full content
- [ ] Glass/x-morphism styling applied
- [ ] No console errors or warnings

## Orchestration Quick Reference

### Start Phase 2 (after Phase 1 complete)
```javascript
// Task 2.1 - Setup Dependencies
Task('ui-engineer-enhanced', 'Install and configure shadcn/ui dependencies per TASK-2.1 in .claude/progress/request-log-viewer/phase-2-progress.md. Install TanStack Table, Radix UI primitives, utility libraries. Verify bundle <50KB.', {}, 'high');
```

### After TASK-2.1 Complete
```javascript
// Task 2.2 - Container Foundation
Task('ui-engineer-enhanced', 'Create ViewerContainer component per TASK-2.2. Orchestrate catalog loading, filter state, document cache. Handle loading/error/empty states with manual refresh. Target: src/ui/viewer/ViewerContainer.tsx', {}, 'high');
```

### After TASK-2.2 Complete (Parallel Execution)
```javascript
// Batch 2 - Filters and Catalog (2 tasks in parallel)
Task('ui-engineer-enhanced', 'Create DocumentFilters component per TASK-2.3. Build filter toolbar with all controls (project, type, domain, priority, status, tags, text search). Use Radix UI primitives, full keyboard nav. Target: src/ui/viewer/DocumentFilters.tsx', {}, 'high');

Task('ui-engineer-enhanced', 'Create DocumentCatalog component per TASK-2.4. Build TanStack Table with project grouping, row expansion, sorting. Full keyboard nav and ARIA semantics. Targets: src/ui/viewer/DocumentCatalog.tsx, DocumentRow.tsx, ProjectGroupRow.tsx', {}, 'high');
```

### After TASK-2.4 Complete
```javascript
// Task 2.5 - Document Detail
Task('ui-engineer-enhanced', 'Create DocumentDetail component per TASK-2.5. Display items_index and full items with markdown rendering. Include clipboard copy, syntax highlighting. Target: src/ui/viewer/DocumentDetail.tsx', {}, 'high');
```

### After All Components Complete (Parallel Execution)
```javascript
// Batch 4 - Styling and Exports
Task('ui-engineer-enhanced', 'Apply glass/x-morphism styling per TASK-2.6. Match wizard/admin aesthetic, smooth transitions, WCAG AA contrast, responsive design. Target: src/ui/viewer/styles.css + component updates', {}, 'high');

Task('ui-engineer-enhanced', 'Create viewer module exports per TASK-2.7. Barrel export ViewerContainer, sub-components, types. Add README with component hierarchy. Targets: src/ui/viewer/index.ts, README.md', {}, 'medium');
```

## Notes

- All tasks assigned to ui-engineer-enhanced (Sonnet model)
- Depends on Phase 1 completion (catalog core logic)
- TanStack Table and Radix UI provide accessibility out-of-box
- Focus on component composition and clean props API
- Reuse existing Toast and FormField components from @ui/shared
- Bundle size target: <50KB gzipped total impact
