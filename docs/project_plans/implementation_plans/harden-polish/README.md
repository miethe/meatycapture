---
title: "Mobile Viewer Tab UX Redesign - Implementation Hub"
description: "Central hub for the Mobile Viewer Tab UX Redesign implementation, containing all planning documents, task breakdowns, and testing strategies."
audience: [ai-agents, developers, engineering-lead, product-manager]
tags: [implementation-plan, mobile, ux, viewer, harden-polish]
created: 2025-12-30
updated: 2025-12-30
category: "implementation-hub"
status: ready-for-implementation
---

# Mobile Viewer Tab UX Redesign - Implementation Hub

Welcome to the implementation planning hub for the Mobile Viewer Tab UX Redesign project. This directory contains all documents required to successfully execute the transformation from a desktop-first table layout to a mobile-optimized card-based interface.

---

## Quick Navigation

### Core Documents

1. **[Implementation Plan](./mobile-viewer-ux-v1.md)** - Main implementation plan
   - **5 Phases:** Foundation, Components, Integration, Polish, Testing
   - **89 story points** estimated effort
   - **4-6 weeks** timeline with parallel execution
   - Detailed task breakdowns with acceptance criteria
   - Risk assessment and mitigation strategies
   - Subagent assignments and responsibilities

2. **[Testing Guide](./TESTING-MOBILE-VIEWER.md)** - Comprehensive testing strategy
   - Unit test specifications with code examples
   - Integration test procedures
   - E2E test scenarios (Playwright)
   - Manual testing checklists for iOS and Android
   - Test environment setup instructions
   - Coverage goals and sign-off checklist

3. **[Original PRD](../PRDs/harden-polish/mobile-viewer-ux-v1.md)** - Product requirements
   - Executive summary and business goals
   - User personas and journeys
   - Detailed functional and non-functional requirements
   - Success metrics and acceptance criteria
   - Design specifications

---

## Implementation Overview

### Complexity Assessment
- **Level:** Large (L) - 89 story points
- **Track:** Full Track (all specialized subagents)
- **Timeline:** 4-6 weeks (weeks 1-6)
- **Team Size:** 3-4 parallel subagents

### Key Metrics
- Mobile filter interaction time: 30s → <10s
- Filter abandonment rate: 44% → <15%
- Bundle size impact: <20KB gzipped
- Accessibility violations: 0 (WCAG 2.1 AA)
- Desktop regression: None (no changes)

### Deliverables Checklist
- [x] 5 custom hooks (useBottomSheet, useHalfSheet, useMobileViewport, useSafeArea, useReducedMotion)
- [x] 8 React components (cards, sheets, header, FAB, search, sort)
- [x] 1 container component (MobileViewerContainer)
- [x] CSS styling (~800 lines in mobile-viewer.css)
- [x] Unit tests (90%+ coverage)
- [x] Integration tests
- [x] E2E tests (4+ user journeys)
- [x] Manual testing on iOS and Android

---

## Phase Breakdown

### Phase 1: Foundation Infrastructure (Week 1-2, 25 pts)
**Goal:** Build core infrastructure (hooks, utilities, CSS skeleton)

**Deliverables:**
- Custom hooks for sheets, viewport detection, safe areas, motion preferences
- Gesture utilities (drag distance, dismiss logic)
- Focus management utilities
- CSS foundation with custom properties and layout framework

**Assigned:** ui-engineer-enhanced, frontend-developer

**Quality Gate:** All hooks unit tested, TypeScript strict mode, axe clean

---

### Phase 2: Component Development (Week 2-4, 35 pts)
**Goal:** Build all 8 mobile-specific components and implement CSS styling

**Deliverables:**
- MobileDocCard - Card layout for individual documents
- MobileDocList - Card list container with grouping
- MobileFilterSheet - Bottom sheet with all 7 filters
- MobileDetailSheet - Half-sheet preview with expand-to-full
- MobileFilterFab - Floating action button with badge
- MobileViewerHeader - Sticky header with search
- MobileSortDropdown - Sort menu
- MobileSearchBar - Search input with clear
- Complete CSS styling (mobile-viewer.css)

**Assigned:** ui-engineer-enhanced, frontend-developer

**Quality Gate:** All components render, snapshots created, 44px+ touch targets, axe clean

---

### Phase 3: Integration & State Management (Week 4, 15 pts)
**Goal:** Connect mobile components to existing filter state and viewport routing

**Deliverables:**
- ViewerContainer breakpoint detection and conditional rendering
- MobileViewerContainer orchestration component
- useViewerFilters hook for shared filter state
- Filter state synchronization between mobile and desktop
- Document tap > detail sheet flow

**Assigned:** ui-engineer-enhanced

**Quality Gate:** Mobile at <768px, desktop at ≥768px, state syncs without race conditions, keyboard nav works

---

### Phase 4: Polish & Animations (Week 5, 10 pts)
**Goal:** Add animations, safe area handling, accessibility polish

**Deliverables:**
- Drag-to-dismiss gestures on bottom and half sheets
- FAB press feedback
- Safe area inset integration (notches, nav bars)
- Prefers-reduced-motion support
- Landscape orientation handling
- Accessibility audit and fixes
- Keyboard navigation refinement

**Assigned:** frontend-developer, a11y-sheriff

**Quality Gate:** 60fps animations, safe areas verified on devices, 0 axe violations, keyboard nav 100%

---

### Phase 5: Testing & QA (Week 5-6, 4 pts)
**Goal:** Comprehensive testing across unit, integration, E2E, and manual

**Deliverables:**
- Unit tests for all hooks and utilities (90%+ coverage)
- Integration tests for component flows and state sync
- E2E tests for critical user journeys (Playwright)
- Manual testing on iOS device (iPhone 12+)
- Manual testing on Android device (Pixel 4+)

**Assigned:** code-reviewer (QA engineer)

**Quality Gate:** All tests passing, 0 critical bugs, manual testing successful on both platforms

---

## Subagent Roles & Responsibilities

| Subagent | Role | Tasks | Timeline |
|----------|------|-------|----------|
| **ui-engineer-enhanced** | Component architect | Custom hooks, React components, container, state | Weeks 1-4 |
| **frontend-developer** | CSS & animations | Styling, gestures, safe areas, animations | Weeks 1-5 |
| **a11y-sheriff** | Accessibility | WCAG 2.1 AA compliance, keyboard nav, VoiceOver | Week 5 |
| **code-reviewer** | QA & testing | Unit/integration/E2E tests, manual testing | Weeks 2-6 |

---

## Critical Success Factors

### Technical
1. **Breakpoint Detection:** Mobile at ≤768px, desktop at ≥769px, no overlap
2. **Filter State Sync:** Single source of truth, no race conditions, desktop unchanged
3. **Touch Targets:** All interactive elements ≥44px (FAB ≥56px)
4. **Gesture Handling:** Smooth drag-to-dismiss with >100px threshold
5. **Accessibility:** 0 axe violations, WCAG 2.1 AA, keyboard nav 100%

### Performance
1. **Bundle Size:** <20KB gzipped (CSS + components)
2. **Filter Latency:** <100ms (same as desktop, no regression)
3. **Animations:** 60fps on test devices (no jank)
4. **Scroll Performance:** Smooth vertical scrolling (no horizontal scroll)

### Quality
1. **Test Coverage:** 90%+ unit, 80%+ integration, 4+ E2E journeys
2. **No Regressions:** Desktop UI and functionality unchanged
3. **Device Testing:** iOS 12+ and Android 8+ verified
4. **Accessibility Testing:** VoiceOver and TalkBack navigation verified

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Touch event jank on low-end devices | High | Medium | Debounce listeners, passive events, test old devices |
| Gesture conflicts with scroll | Medium | Medium | Drag threshold >50-100px, extensive manual testing |
| Sheet animation thrashing | Medium | Low | CSS transforms only, no position changes, GPU hints |
| Focus trap breaks nav | Medium | Low | Manual implementation, test keyboard-only navigation |
| Safe area edge cases | Low | Low | Test iPhone 12+ and Pixel 4+, fallback to 0 |
| Mobile filter desync | High | Low | Share single state hook, integration tests verify |
| Small touch targets | High | Low | Early audit, CSS custom properties for min-sizes |
| Gesture triggers unintended actions | Medium | Medium | 20px safe zone, scroll-to-top requirement |
| Bundle size bloat | Low | Low | Monitor during Phase 2, <800 lines CSS target |
| Tablet layout issues | Medium | Low | 768px breakpoint standard, test iPad at 1024px |

---

## Dependencies & Prerequisites

### Codebase Dependencies
- `@core/models` - RequestLogDoc, CatalogEntry types (stable)
- `@core/catalog` - Filter logic, grouping (stable)
- `@ui/shared/hooks` - Existing hooks (useDebounce)
- `src/styles/index.css` - Design system tokens (no changes)
- `src/ui/viewer/ViewerContainer.tsx` - Parent component (needs breakpoint logic)

### External Dependencies
- React 18+
- TypeScript 4.5+
- Vitest (testing)
- Playwright (E2E testing)
- axe-core (accessibility testing)

### No New Dependencies Required
- No UI frameworks (Radix UI already used)
- No CSS libraries (pure CSS + custom properties)
- No animation libraries (CSS animations only)
- No gesture libraries (manual Touch Events API)

---

## File Structure

```
src/ui/viewer/
├── ViewerContainer.tsx          (MODIFIED - add breakpoint detection)
├── DocumentFilters.tsx          (UNCHANGED - used by desktop)
├── DocumentCatalog.tsx          (UNCHANGED - used by desktop)
├── DocumentRow.tsx              (UNCHANGED)
├── viewer.css                   (MODIFIED - wrap desktop in @media)
│
└── mobile/                       (NEW DIRECTORY)
    ├── MobileDocCard.tsx        (NEW - card component)
    ├── MobileDocList.tsx        (NEW - list container)
    ├── MobileFilterSheet.tsx    (NEW - bottom sheet)
    ├── MobileDetailSheet.tsx    (NEW - half-sheet preview)
    ├── MobileFilterFab.tsx      (NEW - floating action button)
    ├── MobileViewerHeader.tsx   (NEW - sticky header)
    ├── MobileSortDropdown.tsx   (NEW - sort menu)
    ├── MobileSearchBar.tsx      (NEW - search input)
    ├── MobileViewerContainer.tsx (NEW - orchestrator)
    ├── mobile-viewer.css        (NEW - all mobile styling)
    └── index.ts                 (NEW - exports)

src/ui/shared/hooks/             (NEW DIRECTORY)
├── useBottomSheet.ts            (NEW - sheet state management)
├── useHalfSheet.ts              (NEW - detail sheet with expand)
├── useMobileViewport.ts         (NEW - breakpoint detection)
├── useSafeArea.ts               (NEW - safe area insets)
└── useReducedMotion.ts          (NEW - motion preference)

src/ui/shared/utils/             (NEW DIRECTORY)
├── gestureUtils.ts              (NEW - drag detection)
└── focusUtils.ts                (NEW - focus management)

tests/e2e/
└── viewer-mobile.spec.ts        (NEW - E2E tests)

docs/project_plans/implementation_plans/harden-polish/
├── mobile-viewer-ux-v1.md       (NEW - main implementation plan)
├── TESTING-MOBILE-VIEWER.md     (NEW - testing guide)
└── README.md                     (NEW - this file)
```

---

## Quick Start for Subagents

### For ui-engineer-enhanced

1. Review Phase 1 tasks (F1.1-F1.5): Custom hooks
2. Implement `useBottomSheet`, `useHalfSheet`, `useMobileViewport`, `useSafeArea`, `useReducedMotion`
3. Write unit tests for each hook (target 90%+ coverage)
4. Coordinate with frontend-developer on CSS custom properties
5. Begin Phase 2: Component development (C2.1-C2.8)
6. Create MobileDocCard, MobileDocList, sheets, header, FAB, search
7. Phase 3: Integrate with ViewerContainer, sync filter state

### For frontend-developer

1. Review Phase 1 task (F1.8): CSS skeleton
2. Create base mobile-viewer.css structure with custom properties
3. Coordinate with ui-engineer-enhanced on component layout
4. Phase 2: Implement CSS for cards, sheets, components, animations (C2.9-C2.12)
5. Phase 4: Gesture handling (P4.1-P4.3), safe areas (P4.4), animations (P4.5-P4.6)
6. Monitor bundle size (<20KB gzipped target)

### For a11y-sheriff

1. Start Week 4-5 after components complete
2. Run axe-core on all components (target 0 violations)
3. Test VoiceOver on iOS device
4. Test TalkBack on Android device
5. Verify WCAG 2.1 AA compliance
6. Test keyboard-only navigation in sheets
7. Phase 4: Final accessibility audit (P4.7-P4.8)

### For code-reviewer

1. Concurrent with development (Weeks 2-6)
2. Phase 1: Review hook implementations and unit tests
3. Phase 2: Review component snapshots and TypeScript types
4. Phase 3: Review integration and state sync logic
5. Phase 5: Run full test suite, manual testing on devices
6. Track coverage (target 90% unit, 80% integration)

---

## Documentation

### For Developers
- Review implementation plan for task details
- Check testing guide for test specifications
- Refer to original PRD for user stories and acceptance criteria
- Use snapshots to verify component visual correctness

### For QA/Testing
- Follow testing guide for unit, integration, E2E procedures
- Execute manual testing checklists on iOS and Android
- Report bugs using provided template
- Track test coverage goals (90%+ unit, 80%+ integration)

### For Product/Design
- Monitor Phase 4 polish (animations, gestures)
- Request design review of mobile layouts
- Validate accessibility features match requirements
- Collect post-launch metrics (filter time, abandonment rate)

---

## Communication & Escalation

### Daily Standup Topics
- Phase progress (% complete)
- Blockers or dependencies
- Touch target audit results
- Test coverage status
- Bundle size tracking

### Weekly Checkpoint
- Full phase review
- Quality gate checklist
- Risk register updates
- Timeline adjustments if needed

### Escalation Path
1. Subagent → Engineering Lead (technical blockers)
2. Engineering Lead → Product Manager (scope/timeline issues)
3. Product Manager → Design Lead (design conflicts)

---

## Post-Launch Metrics

**30-Day Goals:**
- Filter abandonment rate: 44% → <15%
- Mobile filter interaction time: 30s → <10s
- Mobile user session duration: +20% increase
- Mobile conversion rate: +30% increase
- Bundle size: <20KB gzipped
- Desktop user metrics: No regression
- Zero critical accessibility issues

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-30 | Initial implementation plan | Implementation Planner Orchestrator |

---

## Related Documentation

- **PRD:** [Mobile Viewer Tab UX Redesign](../PRDs/harden-polish/mobile-viewer-ux-v1.md)
- **Design Spec:** [Mobile Viewer UI Specification](../../design/mobile-viewer-ui-spec.md)
- **Design System:** [Glass-Morphism Design System](../../design/glass-morphism.md)
- **Project Guidelines:** [CLAUDE.md](../../../../CLAUDE.md) - MeatyCapture development guidelines

---

## Support & Questions

For questions or issues during implementation:
1. Check relevant phase in the implementation plan
2. Review testing guide for test procedures
3. Reference original PRD for requirements clarification
4. Ask engineering lead for blockers or scope questions
5. Contact product manager for priority/timeline concerns

---

**Status:** Ready for Implementation
**Complexity:** Large (L) - 89 story points
**Timeline:** 4-6 weeks
**Track:** Full Track (all subagents)
**Last Updated:** 2025-12-30

Generated with [Claude Code](https://claude.com/claude-code)
