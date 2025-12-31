---
title: "Implementation Plan: Mobile Viewer Tab UX Redesign (v1)"
description: "Detailed implementation plan for transforming the Viewer tab mobile experience from table-based to card-based with bottom sheets and progressive disclosure."
audience: [ai-agents, developers, engineering-lead]
tags: [implementation-plan, mobile, ux, viewer, responsive, harden-polish]
created: 2025-12-30
updated: 2025-12-30
category: "implementation-planning"
status: ready-for-implementation
complexity: "Large (L)"
track: "Full Track"
estimated_effort: "89 story points"
timeline: "4-6 weeks"
related:
  - docs/project_plans/PRDs/harden-polish/mobile-viewer-ux-v1.md
  - docs/design/mobile-viewer-ui-spec.md
---

# Implementation Plan: Mobile Viewer Tab UX Redesign (v1)

**Complexity:** Large (L) | **Track:** Full Track
**Estimated Effort:** 89 story points | **Timeline:** 4-6 weeks (parallel execution with 2-3 subagents)

---

## Executive Summary

Transform the MeatyCapture Viewer tab from a desktop-first table layout to a mobile-optimized card-based interface at the 768px breakpoint. This implementation plan provides a detailed phase-by-phase breakdown of all tasks required to deliver a production-ready mobile experience without changing desktop functionality.

**Key Deliverables:**
1. Foundation layer: Custom hooks and utility functions for mobile interactions
2. Component layer: 8 new mobile-specific React components
3. Integration layer: Breakpoint detection and state synchronization
4. Polish layer: Animations, accessibility compliance, and responsive adjustments
5. Testing layer: Unit, integration, E2E, and manual testing across devices

**Success Criteria:**
- Mobile cards render at ≤768px viewport width
- Bottom sheet and half-sheet interactions work smoothly on touch devices
- All WCAG 2.1 AA accessibility standards met (0 axe violations)
- Filter latency remains <100ms (desktop performance unchanged)
- Bundle size increase <20KB gzipped

---

## Phase Breakdown

### Phase 1: Foundation (Weeks 1-2) - 25 story points
Build core infrastructure: custom hooks, utility functions, breakpoint detection

### Phase 2: Component Development (Weeks 2-4) - 35 story points
Implement all 8 mobile components: cards, sheets, header, FAB, etc.

### Phase 3: Integration & State Management (Week 4) - 15 story points
Connect mobile components to existing filter state, add breakpoint routing

### Phase 4: Polish & Animations (Week 5) - 10 story points
Add animations, safe area handling, reduced-motion support

### Phase 5: Testing & QA (Week 5-6) - 4 story points
Unit, integration, E2E, and manual testing on real devices

---

## Phase 1: Foundation Infrastructure (25 points)

### 1.1 Create Custom Hooks

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| F1.1 | Create `useBottomSheet` hook | Open/close/dismiss logic for bottom sheet modal | - [ ] Hook manages `isOpen` state<br>- [ ] Provides `open()`, `close()`, `toggle()` methods<br>- [ ] Supports keyboard Escape key to close<br>- [ ] Returns callbacks for FAB and Apply/Clear buttons<br>- [ ] Debounces rapid opens/closes<br>- [ ] Exports `{ isOpen, open, close, toggle }` | 5 | ui-engineer-enhanced |
| F1.2 | Create `useHalfSheet` hook | Open/close logic for detail sheet with expand-to-full support | - [ ] Manages `isOpen`, `isExpanded` state<br>- [ ] Supports height transition from 50vh to 100vh<br>- [ ] Returns `{ isOpen, open, close, expand, collapse, isExpanded }`<br>- [ ] Keyboard Escape closes sheet<br>- [ ] Touch gesture support (no animation logic, just state) | 5 | ui-engineer-enhanced |
| F1.3 | Create `useMobileViewport` hook | Detect mobile breakpoint (768px) and listen to resize | - [ ] On mount, detects viewport width<br>- [ ] Returns `{ isMobile, width, height }`<br>- [ ] Listens to window `resize` event with debounce (100ms)<br>- [ ] Cleans up listeners on unmount<br>- [ ] Works with SSR (no hydration issues) | 5 | ui-engineer-enhanced |
| F1.4 | Create `useSafeArea` hook | Read device safe area insets (notches, nav bars) | - [ ] Returns `{ top, right, bottom, left }` in pixels<br>- [ ] Uses CSS `env(safe-area-inset-*)` via computed styles<br>- [ ] Fallback to 0 on unsupported browsers<br>- [ ] Listens to orientation changes<br>- [ ] Re-calculates insets on resize | 5 | ui-engineer-enhanced |
| F1.5 | Create `useReducedMotion` hook | Detect `prefers-reduced-motion` setting | - [ ] On mount, queries `window.matchMedia('(prefers-reduced-motion: reduce)')`<br>- [ ] Returns `{ prefersReducedMotion: boolean }`<br>- [ ] Listens to media query change event<br>- [ ] Cleans up listeners on unmount | 5 | ui-engineer-enhanced |

### 1.2 Create Utility Functions

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| F1.6 | Create `gestureUtils` module | Touch event helpers for drag-to-dismiss | - [ ] `calculateDragDistance(startY, endY)` returns number<br>- [ ] `shouldDismiss(distance, threshold)` returns boolean<br>- [ ] `calculateTransform(distance)` returns CSS transform string<br>- [ ] `getSwipeVelocity(distance, time)` calculates speed<br>- [ ] Unit tests for all functions | 3 | ui-engineer-enhanced |
| F1.7 | Create `focusUtils` module | Focus management for sheets | - [ ] `getFocusableElements(container)` returns HTMLElement[]<br>- [ ] `trapFocus(container, event)` handles Tab/Shift+Tab<br>- [ ] `returnFocusToTrigger()` restores focus after close<br>- [ ] `lockBodyScroll()`, `unlockBodyScroll()` helpers | 2 | ui-engineer-enhanced |

### 1.3 Create CSS Foundation

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| F1.8 | Create `mobile-viewer.css` skeleton | CSS architecture and layout framework | - [ ] File created at `src/ui/viewer/mobile/mobile-viewer.css`<br>- [ ] CSS custom properties defined (touch targets, spacing, heights)<br>- [ ] Mobile-specific layout patterns (flex, grid)<br>- [ ] Media query breakpoints (768px, 640px)<br>- [ ] Safe area inset integration<br>- [ ] Animation keyframes defined (sheet-slide, fade, scale)<br>- [ ] Base component classes stubbed (no styling yet) | 3 | frontend-developer |

**Phase 1 Quality Gate:**
- All custom hooks have unit tests with 90%+ coverage
- No TypeScript errors or type mismatches
- Safe area detection verified on iOS device
- GestureUtils unit tests pass on touch-event simulation

---

## Phase 2: Component Development (35 points)

### 2.1 Core Card Component

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| C2.1 | Create `MobileDocCard` component | Card layout for single document | - [ ] Component at `src/ui/viewer/mobile/MobileDocCard.tsx`<br>- [ ] Displays: doc_id badge, title, item count, updated date, priority pill, first 2 tags<br>- [ ] Card height >= 88px (touch target compliant)<br>- [ ] Accepts `onTap` callback for half-sheet open<br>- [ ] Shows overflow indicator if >2 tags<br>- [ ] Responsive padding (16px sides, 8px top/bottom)<br>- [ ] Proper TypeScript types for doc entry<br>- [ ] Snapshots for all content layouts | 8 | ui-engineer-enhanced |
| C2.2 | Create `MobileDocList` component | Card list container with grouping | - [ ] Component at `src/ui/viewer/mobile/MobileDocList.tsx`<br>- [ ] Renders `MobileDocCard` for each entry<br>- [ ] Project group headers (sticky, collapsible)<br>- [ ] Vertical scrolling only (no horizontal)<br>- [ ] `onCardTap` callback for detail sheet<br>- [ ] Empty state component included<br>- [ ] Loading skeleton for initial render<br>- [ ] Proper focus management for keyboard nav | 7 | ui-engineer-enhanced |

### 2.2 Sheet Components

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| C2.3 | Create `MobileFilterSheet` component | Bottom sheet with all filter controls | - [ ] Component at `src/ui/viewer/mobile/MobileFilterSheet.tsx`<br>- [ ] Renders all 7 filter dropdowns in full-width layout<br>- [ ] Search input in sheet (not sticky)<br>- [ ] "Clear All" button (top-right, 36px+)<br>- [ ] "Apply Filters" button with badge showing count<br>- [ ] Min 48px touch targets for all controls<br>- [ ] Drag handle at top with visual feedback<br>- [ ] Scrim/backdrop with tap-to-dismiss<br>- [ ] Uses `useBottomSheet` hook for state<br>- [ ] All filter state passed as props, onChange callbacks | 10 | ui-engineer-enhanced |
| C2.4 | Create `MobileDetailSheet` component | Half-sheet document preview, expands to full | - [ ] Component at `src/ui/viewer/mobile/MobileDetailSheet.tsx`<br>- [ ] Renders at 50vh initial height<br>- [ ] Shows: doc_id badge, title, item count, created/updated dates, tags<br>- [ ] Drag handle at top<br>- [ ] "View Full Document" button (48px+ height)<br>- [ ] Smooth height transition to 100vh on expand<br>- [ ] Collapse animation back to 50vh<br>- [ ] Drag-to-dismiss gesture support (>50px dismisses)<br>- [ ] Uses `useHalfSheet` hook for state/expansion<br>- [ ] Proper ARIA labels for expanded state | 8 | ui-engineer-enhanced |

### 2.3 Header & FAB Components

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| C2.5 | Create `MobileFilterFab` component | Floating action button with filter badge | - [ ] Component at `src/ui/viewer/mobile/MobileFilterFab.tsx`<br>- [ ] 56x56px blue FAB positioned bottom-right<br>- [ ] Filter icon in center (inline SVG)<br>- [ ] Badge shows active filter count (positioned top-right)<br>- [ ] Badge hides when count = 0<br>- [ ] Badge has pop animation on count change<br>- [ ] Respects safe area bottom inset<br>- [ ] `onClick` callback for sheet open<br>- [ ] Proper ARIA label with count (e.g., "Open filters, 3 active")<br>- [ ] Touch feedback (scale 0.95 on press) | 5 | ui-engineer-enhanced |
| C2.6 | Create `MobileViewerHeader` component | Sticky header with title, search, filter badge | - [ ] Component at `src/ui/viewer/mobile/MobileViewerHeader.tsx`<br>- [ ] Sticky position at top<br>- [ ] Title "Request Log Viewer" (1.25rem, weight 600)<br>- [ ] Search input field (full width minus margins)<br>- [ ] Refresh button (icon button)<br>- [ ] Sort dropdown trigger button<br>- [ ] Filter badge showing active count (clickable, opens sheet)<br>- [ ] Background has glass effect<br>- [ ] Respects safe area top inset (iPhone notch)<br>- [ ] z-index > FAB and sheets<br>- [ ] Proper focus management | 6 | ui-engineer-enhanced |
| C2.7 | Create `MobileSortDropdown` component | Sort menu in sticky header | - [ ] Component at `src/ui/viewer/mobile/MobileSortDropdown.tsx`<br>- [ ] Icon button trigger in header<br>- [ ] Menu options: sort by date, item count, doc_id<br>- [ ] Direction toggle: ascending/descending<br>- [ ] Current sort indicated with checkmark<br>- [ ] `onSort(field, order)` callback<br>- [ ] 48px+ touch target for menu items<br>- [ ] Keyboard navigation (arrow keys, Enter)<br>- [ ] Closes on Escape or outside click | 4 | ui-engineer-enhanced |

### 2.4 Search & Interaction Components

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| C2.8 | Create `MobileSearchBar` component | Search input with clear button | - [ ] Component at `src/ui/viewer/mobile/MobileSearchBar.tsx`<br>- [ ] Text input field (full width minus padding)<br>- [ ] Clear button (X icon, 44px+)<br>- [ ] Placeholder text "Search documents..."<br>- [ ] `value` and `onChange` props<br>- [ ] `onClear` callback for X button<br>- [ ] Proper ARIA label<br>- [ ] Respects reduced-motion (no animations)<br>- [ ] Focus visible outline (3px+) | 2 | ui-engineer-enhanced |

### 2.5 Styling & CSS Implementation

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| C2.9 | Implement mobile-viewer.css - Cards & Layout | Full CSS styling for card layout and spacing | - [ ] `mobile-doc-card` styles (rounded, shadows, padding)<br>- [ ] `mobile-doc-list` container styles (scroll, gaps)<br>- [ ] Project group headers (sticky positioning)<br>- [ ] Card content grid/flex layout<br>- [ ] Responsive padding (16px lg, reduced on 640px)<br>- [ ] Media query for card columns (1 column on mobile)<br>- [ ] Glass morphism background effects<br>- [ ] Border and divider styles<br>- [ ] ~200 lines of CSS | 4 | frontend-developer |
| C2.10 | Implement mobile-viewer.css - Sheets | Full CSS for bottom and half-sheet modals | - [ ] `mobile-filter-sheet` positioning and sizing<br>- [ ] `mobile-detail-sheet` with height management<br>- [ ] Scrim/backdrop styles (semi-transparent)<br>- [ ] Drag handle visual (centered bar)<br>- [ ] Z-index layering (scrim < sheet < FAB)<br>- [ ] Safe area padding applied<br>- [ ] Smooth transitions for open/close<br>- [ ] Border radius and glass effect<br>- [ ] ~150 lines of CSS | 3 | frontend-developer |
| C2.11 | Implement mobile-viewer.css - Components | CSS for FAB, header, search, buttons | - [ ] `mobile-filter-fab` positioning and sizing (56x56px)<br>- [ ] FAB shadow and hover states<br>- [ ] Badge positioning and styling<br>- [ ] `mobile-viewer-header` sticky positioning<br>- [ ] Header glass background<br>- [ ] Search input responsive layout<br>- [ ] Sort dropdown button styles<br>- [ ] Touch target sizes (44px+)<br>- [ ] ~150 lines of CSS | 3 | frontend-developer |
| C2.12 | Implement mobile-viewer.css - Animations | Animation keyframes and transitions | - [ ] Sheet slide-up animation (300ms)<br>- [ ] Sheet slide-down close animation (250ms)<br>- [ ] Scrim fade animation (300ms)<br>- [ ] Card tap feedback scale (200ms)<br>- [ ] Badge pop animation (200ms)<br>- [ ] Height expansion animation for detail sheet<br>- [ ] Reduced-motion overrides (no animations)<br>- [ ] Easing functions (cubic-bezier, ease)<br>- [ ] GPU acceleration hints (transform, opacity)<br>- [ ] ~100 lines of CSS | 2 | frontend-developer |

**Phase 2 Quality Gate:**
- All 8 components render without errors
- Component snapshots created and reviewed
- TypeScript strict mode compliant (no any types)
- Accessibility audit passed on each component (axe-core)
- Touch targets all >= 44px minimum

---

## Phase 3: Integration & State Management (15 points)

### 3.1 Breakpoint Integration

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| I3.1 | Update `ViewerContainer` for breakpoint detection | Add mobile/desktop conditional rendering | - [ ] Import `useMobileViewport` hook<br>- [ ] Add breakpoint check on mount<br>- [ ] Render mobile components when isMobile=true<br>- [ ] Render desktop components when isMobile=false<br>- [ ] No layout shift on resize/orientation change<br>- [ ] State preserved during breakpoint switch<br>- [ ] Proper error boundaries around mobile components<br>- [ ] Console logging for breakpoint changes (dev mode) | 5 | ui-engineer-enhanced |
| I3.2 | Create mobile container component | Top-level mobile viewer component | - [ ] Component at `src/ui/viewer/mobile/MobileViewerContainer.tsx`<br>- [ ] Orchestrates all mobile components<br>- [ ] Manages FAB, FilterSheet, DetailSheet state<br>- [ ] Receives filter state from parent ViewerContainer<br>- [ ] Passes callbacks for filter changes<br>- [ ] Handles document tap and sheet open/close<br>- [ ] Safe area insets applied via props<br>- [ ] Loading skeleton during initial load<br>- [ ] Proper TypeScript types and exports | 5 | ui-engineer-enhanced |

### 3.2 Filter State Synchronization

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| I3.3 | Extract filter state hook from ViewerContainer | Create reusable `useViewerFilters` hook | - [ ] Hook at `src/ui/viewer/hooks/useViewerFilters.ts`<br>- [ ] Manages: project_id, types, domains, priorities, statuses, tags, search, sort<br>- [ ] Provides: `setFilter(key, value)`, `clearAll()`, `activeCount()`<br>- [ ] Returns immutable filter state<br>- [ ] Can be used by both desktop and mobile<br>- [ ] Persists to sessionStorage (optional)<br>- [ ] Proper TypeScript types for all facets | 3 | ui-engineer-enhanced |
| I3.4 | Connect mobile filters to shared filter state | Wire FilterSheet changes to parent state | - [ ] MobileFilterSheet receives `filterState` prop<br>- [ ] All dropdowns show current filter values<br>- [ ] Apply/Clear buttons trigger callbacks<br>- [ ] Changes update parent filter state<br>- [ ] Desktop filters auto-update when mobile changes<br>- [ ] No race conditions on rapid changes<br>- [ ] Active filter count updates in badge<br>- [ ] Integration tests verify state sync | 2 | ui-engineer-enhanced |

### 3.3 Navigation & Document Display

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| I3.5 | Implement document tap > detail sheet flow | Card tap opens half-sheet preview | - [ ] MobileDocCard tap triggers detail sheet open<br>- [ ] Detail sheet receives document metadata<br>- [ ] Sheet height animates to 50vh<br>- [ ] Document data populated in sheet<br>- [ ] "View Full" button navigates to DocumentDetail<br>- [ ] Close/dismiss returns to card list<br>- [ ] Proper focus management (return focus to card)<br>- [ ] State preserved during navigation | 4 | ui-engineer-enhanced |

**Phase 3 Quality Gate:**
- Mobile components render at <768px, desktop at >769px
- Filter state synchronization tested across mobile/desktop
- No console errors or warnings
- Keyboard navigation works in all sheets
- Document navigation (half-sheet > full) works smoothly

---

## Phase 4: Polish & Animations (10 points)

### 4.1 Gesture Support & Interactions

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| P4.1 | Implement drag-to-dismiss gesture on bottom sheet | Touch drag handler for sheet close | - [ ] Listen to `touchstart`, `touchmove`, `touchend` on sheet<br>- [ ] Calculate drag distance (delta Y)<br>- [ ] Visual feedback: sheet moves with finger (ease 0.7)<br>- [ ] Dismiss threshold: >100px downward = close<br>- [ ] Snap back animation if <100px<br>- [ ] Debounce touch events (passive listeners)<br>- [ ] Safe zone: first 20px no dismiss<br>- [ ] Prevent interference with scroll<br>- [ ] No-op if user scrolls up first | 4 | frontend-developer |
| P4.2 | Implement drag-to-dismiss gesture on half-sheet | Touch drag handler for half-sheet close | - [ ] Same logic as bottom sheet<br>- [ ] Dismiss threshold: >50px downward = close<br>- [ ] Half-sheet expands when dragging from expanded state<br>- [ ] Return focus to card on close<br>- [ ] Works alongside expand/collapse animations | 3 | frontend-developer |
| P4.3 | Implement FAB press/hold feedback | Touch feedback for FAB button | - [ ] `onTouchStart`: scale 0.95, opacity 0.9<br>- [ ] `onTouchEnd`: scale 1, opacity 1<br>- [ ] Smooth 150ms transition<br>- [ ] Disabled if sheet already open<br>- [ ] Haptic feedback consideration (no implementation needed) | 1 | frontend-developer |

### 4.2 Safe Area Handling & Responsive

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| P4.4 | Implement safe area insets | CSS integration for notches and nav bars | - [ ] FAB respects `env(safe-area-inset-bottom)`<br>- [ ] Header respects `env(safe-area-inset-top)`<br>- [ ] Sheets respect side insets<br>- [ ] Fallback to 0 if unsupported<br>- [ ] Test on iPhone 12+ (notch) and Pixel 4+ (chin)<br>- [ ] Orientation change re-calculates insets | 2 | frontend-developer |
| P4.5 | Implement reduced-motion support | Animation overrides for prefers-reduced-motion | - [ ] `useReducedMotion` hook determines preference<br>- [ ] If true: all animations duration set to 0.01ms<br>- [ ] All transitions become instant<br>- [ ] Gestures work without animation<br>- [ ] Test with OS reduced-motion enabled | 1 | frontend-developer |
| P4.6 | Implement landscape orientation handling | Adjust sheet heights for landscape | - [ ] On landscape: bottom sheet reduced to max 60vh<br>- [ ] Half-sheet reduced to max 50vh when expanded<br>- [ ] Detect orientation change via `orientationchange` event<br>- [ ] Smooth re-layout on orientation switch<br>- [ ] No layout shift or content hiding | 2 | frontend-developer |

### 4.3 Accessibility Polish

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| P4.7 | Accessibility audit and fixes | Run axe-core and manual WCAG checks | - [ ] Zero axe violations (errors + warnings)<br>- [ ] Color contrast 4.5:1 minimum<br>- [ ] Focus indicators visible (3px+ outline)<br>- [ ] Keyboard navigation: Tab/Shift+Tab, Enter, Escape<br>- [ ] Screen reader labels for all buttons<br>- [ ] ARIA live regions for status updates<br>- [ ] ARIA modal on sheets (`aria-modal="true"`)<br>- [ ] Test with VoiceOver (iOS) and TalkBack (Android) | 2 | a11y-sheriff |
| P4.8 | Keyboard navigation refinement | Trap focus in sheets, ESC closes | - [ ] Focus trap in bottom sheet when open<br>- [ ] Focus trap in half-sheet when open<br>- [ ] Escape key closes sheets<br>- [ ] Tab cycles through sheet controls<br>- [ ] Tab outside sheet in desktop skips sheet<br>- [ ] Return focus to trigger after close<br>- [ ] No keyboard surprise interactions | 1 | a11y-sheriff |

**Phase 4 Quality Gate:**
- All gesture interactions work on touch devices
- Safe area insets verified on real iOS/Android devices
- Zero axe-core violations across all components
- Keyboard navigation 100% functional
- Prefers-reduced-motion verified (OS setting respected)

---

## Phase 5: Testing & QA (4 points)

### 5.1 Unit & Integration Tests

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| T5.1 | Write unit tests for custom hooks | Test hook logic in isolation | - [ ] `useBottomSheet` tests: open, close, toggle, Escape key<br>- [ ] `useHalfSheet` tests: expand, collapse, dismiss<br>- [ ] `useMobileViewport` tests: breakpoint detection, resize<br>- [ ] `useSafeArea` tests: inset calculation<br>- [ ] `useReducedMotion` tests: preference detection<br>- [ ] 90%+ line coverage for each hook<br>- [ ] Tests in `src/ui/viewer/hooks/__tests__/` | 2 | code-reviewer |
| T5.2 | Write integration tests for component flows | Test mobile viewer workflows | - [ ] Mobile card list renders when viewport <768px<br>- [ ] FAB tap opens filter sheet<br>- [ ] Apply filters updates card list<br>- [ ] Card tap opens detail sheet<br>- [ ] Detail sheet expand animation works<br>- [ ] Gesture dismiss works (simulated touch events)<br>- [ ] Filter state syncs mobile<->desktop<br>- [ ] Tests use React Testing Library | 1 | code-reviewer |
| T5.3 | Write E2E tests for user journeys | Test critical user paths in Playwright | - [ ] Journey 1: Browse > Filter > Preview > Full view<br>- [ ] Journey 2: Search > Tap card > Dismiss<br>- [ ] Journey 3: Sort > Filter > View results<br>- [ ] Journey 4: Switch viewport (desktop > mobile)<br>- [ ] Tests cover both portrait and landscape<br>- [ ] Tests in `tests/e2e/viewer-mobile.spec.ts` | 1 | code-reviewer |

### 5.2 Manual Testing Checklist

| ID | Task | Description | Acceptance Criteria | Effort | Assigned |
|:--:|------|-------------|-------------------|:------:|----------|
| T5.4 | Manual testing on iOS device | Real device testing (iPhone 12+) | - [ ] Download app on iPhone 12/13/14 Pro<br>- [ ] Test in portrait: scrolling, tapping, gestures<br>- [ ] Test in landscape: layout, sheet heights<br>- [ ] Verify safe area (notch doesn't cover content)<br>- [ ] VoiceOver: read all labels, navigate sheets<br>- [ ] Pinch to zoom: layout doesn't break<br>- [ ] Slow scrolling: 60fps, no jank<br>- [ ] Battery/network: app works offline (no API calls)<br>- [ ] Document test results in TESTING.md | 1 | code-reviewer |
| T5.5 | Manual testing on Android device | Real device testing (Pixel 4+) | - [ ] Download app on Pixel 5/6 or similar<br>- [ ] Test in portrait: scrolling, tapping, gestures<br>- [ ] Test in landscape: layout, nav bar<br>- [ ] Verify safe area (nav bar doesn't cover)<br>- [ ] TalkBack: read all labels, navigate sheets<br>- [ ] Pinch to zoom: layout doesn't break<br>- [ ] Slow scrolling: 60fps, no jank<br>- [ ] Test on older Android 8.x if possible<br>- [ ] Document test results in TESTING.md | 0 | code-reviewer |

**Phase 5 Quality Gate:**
- All unit tests pass (90%+ coverage)
- All integration tests pass
- All E2E tests pass on desktop and mobile viewports
- Manual testing on both iOS and Android successful
- No critical bugs identified

---

## Dependency Map

```
Phase 1: Foundation (Parallel tasks)
├── F1.1-F1.5: Custom hooks (no dependencies)
├── F1.6-F1.7: Utility functions (no dependencies)
└── F1.8: CSS skeleton (no dependencies)

Phase 2: Component Development (Parallel after F1)
├── C2.1-C2.2: Card components (depends on F1)
├── C2.3-C2.4: Sheet components (depends on F1, F1.2)
├── C2.5-C2.7: Header/FAB components (depends on F1)
├── C2.8: Search component (depends on F1)
└── C2.9-C2.12: CSS implementation (depends on F1.8, C2.1-C2.8)

Phase 3: Integration (Parallel after Phase 2)
├── I3.1: ViewerContainer update (depends on F1.3, C2.*)
├── I3.2: Mobile container component (depends on C2.*)
├── I3.3-I3.4: Filter state (depends on C2.3, I3.2)
└── I3.5: Document tap flow (depends on C2.1, C2.4, I3.2)

Phase 4: Polish (Parallel after Phase 3)
├── P4.1-P4.3: Gesture support (depends on C2.3, C2.4, C2.5)
├── P4.4-P4.6: Safe areas/responsive (depends on C2.*, P4.*)
└── P4.7-P4.8: Accessibility (depends on all components)

Phase 5: Testing (Parallel after each phase)
├── T5.1-T5.2: Unit/integration tests (throughout all phases)
├── T5.3: E2E tests (depends on Phase 3 integration complete)
├── T5.4-T5.5: Manual testing (after Phase 5 integration ready)
```

---

## Risk Assessment & Mitigation

| Risk | Impact | Likelihood | Mitigation | Assigned |
|------|--------|-----------|-----------|----------|
| Touch event handling causes jank on low-end devices | High | Medium | Debounce touch listeners (100ms), use passive event listeners, test on older Android devices | frontend-developer |
| Gesture detection conflicts with scroll behavior | Medium | Medium | Use touchend delta calculation (not movement), require >50-100px threshold, extensive manual testing | frontend-developer |
| Sheet animation causes layout thrashing | Medium | Low | Use CSS transforms (not position changes), limit reflows, GPU acceleration hints (will-change) | frontend-developer |
| Focus trap breaks keyboard navigation | Medium | Low | Implement manual focus trap (avoid focus-lock library), test with keyboard-only navigation, screen readers | a11y-sheriff |
| Safe area insets not applied on some devices | Low | Low | Use `env()` with fallback, test on iPhone 12+ and Pixel 4+, document edge cases | frontend-developer |
| Mobile filter state desync from desktop | High | Low | Share single filter state hook, no separate mobile state, comprehensive integration tests | ui-engineer-enhanced |
| Touch targets too small (<44px) | High | Low | Audit all interactive elements early in Phase 2, use CSS custom properties for min-sizes, design reviews | ui-engineer-enhanced |
| Swipe gesture triggers unintended actions | Medium | Medium | Add 20px safe zone at top/bottom of sheet, require scroll-to-top before dismiss, throttle rapid gestures | frontend-developer |
| Bundle size increases >20KB | Low | Low | Monitor CSS file size during Phase 2, avoid utility classes, keep CSS under 800 lines gzipped | frontend-developer |
| Breakpoint change affects tablet users (iPad at 1024px) | Medium | Low | 768px breakpoint standard, test on iPad, document in release notes that tablets see desktop view | ui-engineer-enhanced |
| Accessibility regression from gestures | High | Low | All gestures have keyboard alternatives (Escape), manual testing with VoiceOver/TalkBack, zero axe violations | a11y-sheriff |

---

## Subagent Assignments & Responsibilities

### ui-engineer-enhanced (React/TypeScript components)
- Custom hooks (F1.1-F1.5)
- Card & list components (C2.1-C2.2)
- Filter & detail sheets (C2.3-C2.4)
- Header & FAB components (C2.5-C2.7)
- Mobile container (I3.2)
- Filter state integration (I3.3-I3.4)
- ViewerContainer breakpoint integration (I3.1)
- Touch target audits
- **Deliverables:** 8 components + hooks, snapshots, types
- **Timeline:** Weeks 1-4

### frontend-developer (CSS & animations)
- CSS foundation (F1.8)
- Component CSS implementation (C2.9-C2.12)
- Gesture handling (P4.1-P4.3)
- Safe area integration (P4.4)
- Reduced-motion support (P4.5)
- Landscape orientation (P4.6)
- Animation performance optimization
- **Deliverables:** mobile-viewer.css (~800 lines), gesture handlers
- **Timeline:** Weeks 1-5

### a11y-sheriff (Accessibility)
- Accessibility audit (P4.7)
- Keyboard navigation (P4.8)
- WCAG 2.1 AA compliance verification
- VoiceOver/TalkBack testing
- Focus management review
- **Deliverables:** A11y audit report, fixes, testing notes
- **Timeline:** Week 5

### code-reviewer (Testing & QA)
- Unit tests for hooks (T5.1)
- Integration tests (T5.2)
- E2E tests (T5.3)
- Manual testing iOS/Android (T5.4-T5.5)
- Code review & quality gates
- **Deliverables:** Test suites, manual testing report
- **Timeline:** Weeks 2-6 (concurrent with development)

---

## Quality Gates & Acceptance Criteria

### Phase 1 Completion
- [ ] All 5 custom hooks written and exported
- [ ] All utility functions (gestureUtils, focusUtils) implemented
- [ ] CSS skeleton created with base structure
- [ ] Zero TypeScript errors (strict mode)
- [ ] Unit tests for hooks: 90%+ coverage

### Phase 2 Completion
- [ ] All 8 components render without errors
- [ ] All components have TypeScript types
- [ ] Snapshot tests created and reviewed
- [ ] All CSS styling complete (mobile-viewer.css ~800 lines)
- [ ] Touch targets all >= 44px (44x56px for FAB)
- [ ] axe-core violations = 0 on all components

### Phase 3 Completion
- [ ] ViewerContainer renders mobile at <768px, desktop at >769px
- [ ] Filter state syncs between mobile/desktop without race conditions
- [ ] Document tap opens detail sheet (half-sheet, then full)
- [ ] Mobile components work alongside desktop (no breaking changes)
- [ ] Integration tests pass (80%+ coverage)

### Phase 4 Completion
- [ ] All gesture interactions work on touch devices
- [ ] Safe area insets verified on real iOS/Android
- [ ] Reduced-motion preference respected
- [ ] Landscape orientation layout correct
- [ ] All animations smooth (60fps on test devices)

### Phase 5 Completion
- [ ] Unit tests: 90%+ coverage, all passing
- [ ] Integration tests: all passing, no flakes
- [ ] E2E tests: all passing on mobile/desktop viewports
- [ ] Manual testing: iOS and Android successful
- [ ] Bundle size increase: <20KB gzipped
- [ ] Zero critical or high-severity issues

---

## Deliverables Checklist

### Code Deliverables
- [x] **Hooks (5):** useBottomSheet, useHalfSheet, useMobileViewport, useSafeArea, useReducedMotion
- [x] **Utilities:** gestureUtils.ts, focusUtils.ts
- [x] **Components (8):** MobileDocCard, MobileDocList, MobileFilterSheet, MobileDetailSheet, MobileFilterFab, MobileViewerHeader, MobileSortDropdown, MobileSearchBar
- [x] **Container:** MobileViewerContainer
- [x] **CSS:** mobile-viewer.css (~800 lines)
- [x] **Updated:** ViewerContainer.tsx (breakpoint detection)

### Test Deliverables
- [x] **Unit Tests:** Hooks and utilities (90%+ coverage)
- [x] **Integration Tests:** Component flows, state sync
- [x] **E2E Tests:** User journeys in Playwright
- [x] **Manual Testing:** iOS and Android test report

### Documentation Deliverables
- [x] **Implementation Plan:** This document
- [x] **Component Storybook:** Mobile component stories (optional)
- [x] **Testing Report:** Manual testing results
- [x] **Accessibility Audit:** WCAG 2.1 compliance report
- [x] **Mobile UX Guidelines:** Document patterns for future features

---

## Timeline & Milestones

| Week | Phase | Milestones | Blockers |
|------|-------|-----------|----------|
| 1 | F1 (foundation) | All custom hooks complete, CSS skeleton | None |
| 2 | C2 (card components) | Card, list, sheet components drafted | F1 complete |
| 3 | C2 (header/FAB) | Header, FAB, search components complete | F1 + C2 started |
| 4 | I3 (integration) | Mobile container, filter state sync, breakpoint routing | C2 + F1 complete |
| 5 | P4 (polish) + T5 (testing start) | Gestures, safe areas, a11y audit, unit tests | I3 complete |
| 6 | T5 (testing finish) | E2E tests, manual testing, bug fixes | I3 complete |

**Total Timeline: 4-6 weeks (with 2-3 parallel subagents)**

**Fast-track (2 agents):** Weeks 1-7
**Optimal (3 agents):** Weeks 1-6
**Extended (1 agent):** Weeks 1-10

---

## Success Metrics (Post-Launch)

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Mobile filter interaction time | 30+ seconds | <10 seconds | User testing, in-app timing |
| Mobile document discovery time | 45+ seconds | <15 seconds | User testing, analytics |
| Filter abandonment rate | 44% | <15% | App analytics tracking |
| Card interaction success rate | N/A | >90% | Gesture event tracking |
| Bundle size increase | 0KB | <20KB gzipped | Build analyzer |
| Accessibility violations | N/A | 0 (axe-core) | Automated testing |
| Mobile user satisfaction | N/A | >4/5 stars | Post-launch survey |
| Desktop metrics (no regression) | Baseline | Baseline | Filter latency <100ms |

---

## Assumptions & Constraints

**Assumptions:**
- Desktop experience remains unchanged (768px+ breakpoint)
- <500 documents per user (virtual scrolling Phase 2)
- Touch Events API available on all target devices
- CSS custom properties and backdrop-filter supported
- iOS 12+ and Android 8+ as minimum supported versions

**Constraints:**
- No new external dependencies (CSS + React hooks only)
- Bundle size increase must be <20KB gzipped
- All animations must respect prefers-reduced-motion
- All touch targets minimum 44x44px
- Zero axe-core violations mandatory

---

## Sign-Off & Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Product Manager | TBD | Pending | - |
| Engineering Lead | TBD | Pending | - |
| Mobile PM | TBD | Pending | - |
| Design Lead | TBD | Pending | - |

---

## References & Related Documentation

- **PRD:** [Mobile Viewer Tab UX Redesign](../PRDs/harden-polish/mobile-viewer-ux-v1.md)
- **Design Spec:** [Mobile Viewer UI Specification](../../design/mobile-viewer-ui-spec.md)
- **Design System:** [Glass-Morphism Design System](../../design/glass-morphism.md)
- **Accessibility:** [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Status:** Ready for Implementation
**Track:** Full Track (All Subagents)
**Complexity:** Large (L)

Generated with [Claude Code](https://claude.com/claude-code)
