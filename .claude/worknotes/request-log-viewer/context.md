# Request Log Viewer: Implementation Context

**Feature**: Request Log Viewer v1
**PRD**: docs/project_plans/PRDs/features/request-log-viewer-v1.md
**Implementation Plan**: docs/project_plans/implementation_plans/features/request-log-viewer-v1.md
**Status**: Planning Complete, Ready for Implementation
**Created**: 2025-12-16
**Last Updated**: 2025-12-16

---

## Overview

Add a read-only catalog viewer to MeatyCapture that enables users to browse, filter, and read existing request-log markdown documents across all projects. The viewer provides project-grouped catalog display, multi-criteria filtering (type, domain, priority, status, tags, text search), document detail expansion with markdown rendering, and full keyboard navigation support.

---

## Architecture Decisions

### 1. Headless Core Architecture

**Decision**: Implement catalog logic in `@core/catalog` module (headless, UI-agnostic)

**Rationale**:
- Maintains MeatyCapture's port/adapter pattern
- Enables 100% code parity between web and Tauri platforms
- Catalog filtering/grouping logic is pure business logic (no UI coupling)
- Facilitates testing without UI dependencies
- Future-proof for CLI or API consumers

**Pattern**:
```
UI Layer (React) → Core Layer (Catalog Module) → Ports (DocStore, ProjectStore) → Adapters (Platform-specific)
```

### 2. Progressive Loading Strategy

**Decision**: Load DocMeta for catalog display, full documents only on row expansion

**Rationale**:
- Initial catalog load only needs metadata (doc_id, title, item_count, tags, updated_at)
- DocStore.list() returns DocMeta[] efficiently without parsing full markdown
- Full document parsing (items, notes, markdown) deferred until user expands row
- Reduces initial load time and memory footprint
- Catalog remains interactive during detail loading

**Implementation**:
- ViewerContainer calls `listAllDocuments()` utility → scans all projects → returns CatalogEntry[]
- DocumentCatalog renders table from CatalogEntry[] (metadata only)
- DocumentDetail calls `DocStore.read()` on row expansion → parses full RequestLogDoc

### 3. Client-Side Filtering (No Backend)

**Decision**: All filtering happens in-browser using pure functions

**Rationale**:
- No backend API exists for catalog queries (MVP is file-first)
- Browser can handle 500+ documents efficiently (<100ms filter target)
- Simpler architecture (no server-side indexing or query language)
- Works identically across all storage modes (browser-storage, api-client, fs-local)
- Phase 2 can add JSON catalog index if performance degrades >1000 docs

**Filter Logic**:
- applyFilters() composes all filter functions (project, type, domain, priority, status, tags, text)
- AND logic between filter criteria, OR logic within multi-select arrays
- Text search is case-insensitive, searches title and doc_id fields
- Filters return new arrays (immutable, predictable)

### 4. TanStack Table + Radix UI Component Stack

**Decision**: Use TanStack Table (headless) with Radix UI primitives, styled via shadcn/ui patterns

**Rationale**:
- Lightweight bundle impact (~40-50KB vs 150KB+ for Material-UI)
- TanStack Table provides headless sorting, grouping, expansion (fits port/adapter pattern)
- Radix UI primitives are accessible by default (WCAG 2.1 AA compliance out-of-box)
- Full styling control for glass/x-morphism aesthetic
- Composable components (add features incrementally)
- TypeScript-first with excellent type inference

**Alternatives Rejected**:
- Material-UI DataGrid: Too large, opinionated styling conflicts
- AG Grid: Enterprise overkill, very large bundle (200KB+)
- Custom table: High development cost, reinventing accessibility

### 5. Map-Based Document Cache

**Decision**: Cache loaded documents in `Map<path, RequestLogDoc>` in ViewerContainer state

**Rationale**:
- Avoids redundant DocStore.read() calls when user re-expands same document
- Cache persists during filter operations (no re-fetch when changing filters)
- Invalidated on manual refresh (user-triggered re-scan)
- Memory-efficient for MVP (<1000 documents assumption)
- No cache size limits or eviction policy needed for Phase 1
- Future: Add LRU eviction if memory usage becomes issue

---

## Key Patterns to Follow

### 1. Port/Adapter Pattern (Existing)

**Pattern**: UI depends on port interfaces, not adapter implementations

**Viewer Integration**:
- ViewerContainer accepts `DocStore` and `ProjectStore` via props (injected by platform factory)
- No direct imports of adapter implementations (browser-storage, api-client, fs-local)
- All file I/O goes through port operations: `list()`, `read()`
- Works identically across web (IndexedDB), server (HTTP), and Tauri (filesystem)

**Files**:
- `src/core/ports/index.ts` - Port interfaces (stable, no changes)
- `src/adapters/*` - Adapter implementations (stable, no changes)

### 2. Glass/X-Morphism Styling (Existing)

**Pattern**: Semi-transparent layers with backdrop-blur, smooth transitions, subtle shadows

**Viewer Styling Requirements**:
- Match wizard and admin aesthetic (consistency across all tabs)
- 300ms ease transitions for expand/collapse animations
- 2px outline with offset for focus indicators
- Loading skeleton animations (pulse effect)
- WCAG AA color contrast (4.5:1 minimum)
- Responsive design (mobile, tablet, desktop breakpoints)

**Reference**:
- Existing wizard components: `src/ui/wizard/StepShell.tsx`
- Admin components: `src/ui/admin/*`

### 3. Shared Component Reuse (Existing)

**Pattern**: Use existing @ui/shared components instead of rebuilding

**Viewer Reuse Opportunities**:
- Toast component for error/success notifications
- FormField component if needed for filter inputs
- Existing CSS utilities (glass effects, transitions)

**Files**:
- `src/ui/shared/Toast.tsx`
- `src/ui/shared/FormField.tsx`
- `src/ui/shared/styles.css`

### 4. Accessibility-First Development (Requirement)

**Pattern**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support

**Viewer Accessibility**:
- Use Radix UI primitives (accessible by default with ARIA roles/labels)
- Keyboard navigation: Tab/Shift+Tab (filters → table), Arrow keys (table rows), Enter (expand/collapse), Escape (close/clear)
- Focus management: trap focus in expanded rows, return focus on collapse
- ARIA live regions for filter updates and clipboard feedback
- Semantic HTML: <table>, <th>, <td> for catalog data
- Screen reader testing with VoiceOver (macOS) or NVDA (Windows)

**Testing**:
- axe-core automated testing (zero violations)
- Manual keyboard navigation testing
- Manual screen reader testing

---

## SPIKE Findings Summary

**SPIKE Document**: docs/project_plans/SPIKEs/request-log-viewer-spike.md

### Key Findings

1. **Existing DocStore Interface Sufficient**
   - `list(path)` returns DocMeta[] with all needed catalog metadata
   - `read(path)` loads full document for detail view
   - No port interface changes required

2. **Performance Acceptable for 500 Documents**
   - Browser can filter 500 documents in <50ms (well under 100ms target)
   - IndexedDB reads are fast (<50ms per document)
   - Filesystem reads acceptable (<200ms per document)
   - TanStack Virtual NOT needed for MVP (deferred to Phase 2 if >1000 docs)

3. **Radix UI Accessibility Validated**
   - All primitives have ARIA roles/labels out-of-box
   - Keyboard navigation built-in (no custom implementation needed)
   - Focus management handled by library
   - Color contrast must be validated in custom styling (responsibility remains with us)

4. **Bundle Size Impact Acceptable**
   - TanStack Table: ~10KB gzipped
   - Radix UI primitives: ~25KB gzipped (Dropdown, Select, Accordion)
   - Utilities (CVA, clsx, tailwind-merge): ~6KB gzipped
   - **Total**: ~41KB gzipped (within 50KB budget)

5. **Cross-Platform Code Parity Feasible**
   - All UI code can live in `@ui/viewer` (shared 100%)
   - Only adapter layer differs (browser-storage vs api-client vs fs-local)
   - No Tauri-specific UI components needed
   - Platform factory injects correct adapter instance

---

## Implementation Phases Summary

### Phase 1: Foundation Layer (1.5-2 days, 8 points)
**Agent**: backend-typescript-architect
- Create `@core/catalog` module with types, filtering, grouping, utilities
- Comprehensive unit tests (>80% coverage)
- **Key Deliverable**: Headless catalog logic ready for UI consumption

### Phase 2: UI Components (2-2.5 days, 13 points)
**Agent**: ui-engineer-enhanced
- Install shadcn/ui dependencies
- Create ViewerContainer, DocumentFilters, DocumentCatalog, DocumentDetail
- Apply glass/x-morphism styling
- **Key Deliverable**: Functional viewer UI components

### Phase 3: Navigation Integration (0.5-1 day, 4 points)
**Agent**: ui-engineer-enhanced
- Update App.tsx with 'viewer' tab
- Add navigation button and keyboard shortcuts
- Cross-platform testing (web + Tauri)
- **Key Deliverable**: Viewer accessible from main navigation

### Phase 4: Performance Optimization (0.5-1 day, 6 points)
**Agent**: react-performance-optimizer
- Client-side document cache
- Progressive loading (DocMeta first, full doc on demand)
- Debounced text search (300ms)
- Memoized filter functions
- **Key Deliverable**: Performance targets met (<3s catalog, <100ms filter, <500ms detail)

### Phase 5: Testing & QA (1 day, 6 points)
**Agent**: task-completion-validator
- Component tests for all UI components
- Integration tests with all adapters
- Accessibility testing (axe-core, keyboard nav, screen reader)
- Cross-browser testing
- Bundle size analysis
- **Key Deliverable**: Production-ready, fully tested viewer

**Total**: 6-7.5 days, 37 story points

---

## Critical Path

1. Phase 1 MUST complete before Phase 2 (UI depends on catalog logic)
2. Phase 2 MUST complete before Phase 3 (navigation depends on ViewerContainer)
3. Phase 3 MUST complete before Phase 4 (optimization requires integrated viewer)
4. Phase 4 MUST complete before Phase 5 (testing validates optimized implementation)

**Parallelization Opportunities**:
- Phase 1: Tasks 1.2, 1.3, 1.4 can run in parallel after 1.1
- Phase 2: Tasks 2.3, 2.4 can run in parallel after 2.2
- Phase 4: All optimization tasks (4.1-4.4) can run in parallel
- Phase 5: All testing tasks (5.1-5.5) can run in parallel

---

## Session Handoff Notes

### For Backend Agent (Phase 1)

**Context**:
- You are building headless catalog logic (no UI)
- All filtering/grouping functions should be pure (immutable)
- Focus on type safety and performance (<100ms filter target)
- DocStore and ProjectStore interfaces are stable (no changes)

**Key Files**:
- `src/core/catalog/types.ts` - FilterState, CatalogEntry, GroupedCatalog
- `src/core/catalog/filter.ts` - All filter functions
- `src/core/catalog/group.ts` - Grouping and sorting functions
- `src/core/catalog/utils.ts` - listAllDocuments utility
- `src/core/catalog/__tests__/*` - Comprehensive unit tests

**Success Criteria**:
- All tests pass (>80% coverage)
- No TypeScript errors
- Performance tests validate <100ms filter for 500 docs

---

### For UI Agent (Phases 2-3)

**Context**:
- You are building React components using catalog logic from Phase 1
- Use TanStack Table (headless) + Radix UI primitives
- Match existing glass/x-morphism aesthetic (wizard/admin)
- Full keyboard navigation required
- Focus on accessibility (ARIA labels, roles, semantic HTML)

**Key Files**:
- `src/ui/viewer/ViewerContainer.tsx` - Orchestration component
- `src/ui/viewer/DocumentFilters.tsx` - Filter toolbar
- `src/ui/viewer/DocumentCatalog.tsx` - TanStack Table
- `src/ui/viewer/DocumentDetail.tsx` - Expanded row content
- `src/App.tsx` - Navigation integration

**Reference**:
- Wizard styling: `src/ui/wizard/StepShell.tsx`
- Shared components: `src/ui/shared/*`

**Success Criteria**:
- All components render without errors
- Filters update catalog correctly
- Document detail expands with markdown rendering
- Keyboard navigation works (Tab, Arrow keys, Enter, Escape)
- Matches wizard/admin aesthetic

---

### For Performance Agent (Phase 4)

**Context**:
- You are optimizing an already-functional viewer
- Focus on real-world performance, not synthetic benchmarks
- Use React.useMemo for expensive computations
- Debounce text search to reduce filter operations
- Cache loaded documents to avoid redundant reads

**Key Files**:
- `src/ui/viewer/ViewerContainer.tsx` - Cache, memoization
- `src/ui/viewer/DocumentCatalog.tsx` - Progressive loading
- `src/ui/viewer/hooks/useDocumentCache.ts` - Cache hook
- `src/ui/shared/hooks/useDebounce.ts` - Debounce hook

**Performance Targets**:
- Catalog load: <3s for 500 documents
- Filter operations: <100ms
- Document detail load: <500ms
- Text search debounce: 300ms
- Bundle size: <50KB gzipped

**Success Criteria**:
- All performance targets met
- Benchmarks documented in docs/performance/viewer-benchmarks.md

---

### For Validation Agent (Phase 5)

**Context**:
- You are validating a complete, optimized viewer implementation
- Focus on comprehensive testing across all dimensions
- Accessibility is critical (zero violations)
- Test with all DocStore adapters (browser-storage, api-client, fs-local)
- Document all findings for future reference

**Key Files**:
- `src/ui/viewer/__tests__/*` - Component and integration tests
- `docs/accessibility/viewer-a11y-report.md` - A11y test results
- `docs/testing/browser-compatibility-report.md` - Cross-browser results
- `docs/performance/bundle-analysis.md` - Bundle size analysis

**Testing Dimensions**:
- Component tests (>70% UI coverage)
- Integration tests (all adapters)
- Accessibility (axe-core, keyboard, screen reader)
- Cross-browser (Chrome, Firefox, Safari, Edge)
- Bundle size (<50KB verified)

**Success Criteria**:
- All tests pass
- Zero axe-core violations
- Full keyboard navigation works
- Cross-browser compatibility verified
- Bundle size within budget
- All documentation artifacts created

---

## Known Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Performance >1000 docs | Add TanStack Virtual in Phase 2 if benchmarks fail |
| Bundle size exceeds 50KB | Tree-shake unused Radix components, code split if needed |
| Web/Tauri parity breaks | Share all UI in @ui/viewer, comprehensive cross-platform testing |
| Accessibility regressions | Use Radix UI (accessible by default), test with screen readers |
| Stale catalog data | Manual refresh button, document on-demand scan behavior |
| Corrupted markdown | Graceful error handling, skip invalid docs with warning toast |

---

## Related Documents

- **PRD**: docs/project_plans/PRDs/features/request-log-viewer-v1.md
- **Implementation Plan**: docs/project_plans/implementation_plans/features/request-log-viewer-v1.md
- **SPIKE**: docs/project_plans/SPIKEs/request-log-viewer-spike.md
- **Progress Tracking**: .claude/progress/request-log-viewer/phase-{1-5}-progress.md
- **Main PRD**: docs/project_plans/initialization/prd.md
- **Design Spec**: docs/project_plans/initialization/design-spec.md

---

## Quick Start Commands

### Start Phase 1
```javascript
Task('backend-typescript-architect', 'Create catalog types and interfaces per TASK-1.1 in .claude/progress/request-log-viewer/phase-1-progress.md. Define FilterState, CatalogEntry, GroupedCatalog, FilterOptions with full JSDoc. Target: src/core/catalog/types.ts', {}, 'high');
```

### Check Progress
```bash
cat .claude/progress/request-log-viewer/phase-1-progress.md
```

### Validate Phase Completion
```javascript
Task('task-completion-validator', 'Validate Phase 1 completion per .claude/progress/request-log-viewer/phase-1-progress.md. Verify all 6 tasks complete, >80% test coverage, no TypeScript errors, performance targets met.', {}, 'high');
```
