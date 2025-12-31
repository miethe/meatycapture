---
type: context
prd: "mobile-viewer-ux-v1"
created: 2025-12-30
updated: 2025-12-30
status: not_started
current_phase: 1
total_phases: 5
total_points: 89
completed_points: 0

key_files:
  prd: "docs/project_plans/PRDs/harden-polish/mobile-viewer-ux-v1.md"
  design_spec: "docs/design/mobile-viewer-ui-spec.md"
  impl_plan: "docs/project_plans/implementation_plans/harden-polish/mobile-viewer-ux-v1.md"
  progress_dir: ".claude/progress/mobile-viewer-ux/"

subagents:
  - name: "ui-engineer-enhanced"
    responsibility: "React components, hooks, TypeScript"
    points: 50
  - name: "frontend-developer"
    responsibility: "CSS, animations, gestures"
    points: 25
  - name: "a11y-sheriff"
    responsibility: "Accessibility audit, keyboard nav"
    points: 8
  - name: "code-reviewer"
    responsibility: "Testing suite, manual QA"
    points: 6

phase_summary:
  - phase: 1
    title: "Foundation"
    points: 25
    status: "not_started"
    progress_file: "phase-1-foundation-progress.md"
  - phase: 2
    title: "Components"
    points: 35
    status: "not_started"
    progress_file: "phase-2-components-progress.md"
  - phase: 3
    title: "Integration"
    points: 15
    status: "not_started"
    progress_file: "phase-3-integration-progress.md"
  - phase: 4
    title: "Polish"
    points: 10
    status: "not_started"
    progress_file: "phase-4-polish-progress.md"
  - phase: 5
    title: "Testing"
    points: 4
    status: "not_started"
    progress_file: "phase-5-testing-progress.md"

active_blockers: []

decisions: []

session_history: []
---

# Mobile Viewer UX Redesign - Context

**PRD:** mobile-viewer-ux-v1 | **Status:** Not Started | **Progress:** 0/89 pts

## Project Summary

Transform the MeatyCapture Viewer tab from a desktop-first table layout to a mobile-optimized card-based interface at the 768px breakpoint. The goal is to eliminate horizontal scrolling, reduce filter dominance, and implement progressive disclosure patterns.

## Key Deliverables

1. **5 Custom Hooks**: useBottomSheet, useHalfSheet, useMobileViewport, useSafeArea, useReducedMotion
2. **8 React Components**: MobileDocCard, MobileDocList, MobileFilterSheet, MobileDetailSheet, MobileFilterFab, MobileViewerHeader, MobileSortDropdown, MobileSearchBar
3. **1 Container Component**: MobileViewerContainer
4. **~800 Lines CSS**: mobile-viewer.css
5. **Comprehensive Tests**: Unit, integration, E2E, manual

## Architecture Notes

- Desktop experience MUST NOT change (768px+ unchanged)
- Share filter state between desktop/mobile via useViewerFilters hook
- Mobile components only render at ≤768px
- Touch targets minimum 44px, FAB 56px
- Animations respect prefers-reduced-motion
- NO new external dependencies

## File Structure

```
src/ui/viewer/
├── mobile/
│   ├── index.ts                    # Barrel exports
│   ├── MobileViewerContainer.tsx   # Orchestrator
│   ├── MobileDocCard.tsx           # Document card
│   ├── MobileDocList.tsx           # Card list with groups
│   ├── MobileFilterSheet.tsx       # Bottom sheet filters
│   ├── MobileDetailSheet.tsx       # Half-sheet preview
│   ├── MobileFilterFab.tsx         # Floating action button
│   ├── MobileViewerHeader.tsx      # Sticky header
│   ├── MobileSortDropdown.tsx      # Sort menu
│   ├── MobileSearchBar.tsx         # Search input
│   └── mobile-viewer.css           # All mobile styles
├── hooks/
│   ├── useBottomSheet.ts
│   ├── useHalfSheet.ts
│   ├── useMobileViewport.ts
│   ├── useSafeArea.ts
│   ├── useReducedMotion.ts
│   └── useViewerFilters.ts         # Shared filter state
└── utils/
    ├── gestureUtils.ts
    └── focusUtils.ts
```

## Session Handoff

### Current State

- PRD created: `docs/project_plans/PRDs/harden-polish/mobile-viewer-ux-v1.md`
- Design spec created: `docs/design/mobile-viewer-ui-spec.md`
- Implementation plan created: `docs/project_plans/implementation_plans/harden-polish/mobile-viewer-ux-v1.md`
- Progress tracking initialized (5 phase files)
- Ready to begin Phase 1: Foundation

### Next Actions

1. Start Phase 1 by executing Batch 1 tasks (F1.1-F1.5) in parallel
2. All 5 custom hooks can be developed simultaneously
3. See `.claude/progress/mobile-viewer-ux/phase-1-foundation-progress.md` for Task() commands

### Blockers

None currently.

## Quick Navigation

| Resource | Path |
|----------|------|
| PRD | `docs/project_plans/PRDs/harden-polish/mobile-viewer-ux-v1.md` |
| Design Spec | `docs/design/mobile-viewer-ui-spec.md` |
| Implementation Plan | `docs/project_plans/implementation_plans/harden-polish/mobile-viewer-ux-v1.md` |
| Phase 1 Progress | `.claude/progress/mobile-viewer-ux/phase-1-foundation-progress.md` |
| Phase 2 Progress | `.claude/progress/mobile-viewer-ux/phase-2-components-progress.md` |
| Phase 3 Progress | `.claude/progress/mobile-viewer-ux/phase-3-integration-progress.md` |
| Phase 4 Progress | `.claude/progress/mobile-viewer-ux/phase-4-polish-progress.md` |
| Phase 5 Progress | `.claude/progress/mobile-viewer-ux/phase-5-testing-progress.md` |

## Notes

_No session notes yet_
