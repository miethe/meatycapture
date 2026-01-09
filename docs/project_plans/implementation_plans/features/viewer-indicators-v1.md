---
title: "Implementation Plan: Viewer Indicators and Collapsible Items"
description: "Add status/type indicators to Documents and Items in Viewer tab with collapsible item content"
audience: [ai-agents, developers]
tags: [implementation, ui, viewer, indicators, tooltips, collapse]
created: 2026-01-09
updated: 2026-01-09
category: "product-planning"
status: draft
---

# Implementation Plan: Viewer Indicators and Collapsible Items

**Plan ID**: `IMPL-2026-01-09-VIEWER-INDICATORS`
**Date**: 2026-01-09
**Author**: Implementation Planner Agent

**Complexity**: Medium
**Total Estimated Effort**: 21 story points
**Phases**: 3 (UI Foundation → Indicator Components → Integration & Testing)

## Executive Summary

This plan adds comprehensive status/type indicators to the Viewer tab's Document and Item list views. Documents will display item counts with status breakdowns, type distribution icons, and project-level completion ratios. Items will show colored status indicators and enhanced note count tooltips. All items within documents will be collapsible, defaulting to collapsed state.

## Scope Analysis

### In Scope
- Document-level: Item count indicator with status breakdown tooltip
- Document-level: Type distribution indicator with colored icons
- Project-level: Done/total ratio with status breakdown tooltip
- Item-level: Status indicator (colored dot/icon) with tooltip
- Item-level: Note count indicator with type breakdown tooltip
- Collapsible items with toggle button (default: collapsed)

### Out of Scope
- Backend API changes (all data already exists in models)
- New data fetching (using existing RequestLogDoc/Item data)
- Mobile-specific implementations (can follow desktop patterns later)

### Data Model Verification

All required data already exists in models:
- `RequestLogDoc.items[]` - full item data
- `RequestLogItem.status` - triage, backlog, planned, in-progress, done, wontfix
- `RequestLogItem.type` - enhancement, bug, idea, task, question
- `RequestLogItem.notes[]` - array with `type` property (General, Bug Fix Attempt, Validation, Other)
- `RequestLogDoc.item_count` - total items

## Implementation Strategy

### Architecture Sequence

This is a **frontend-only** enhancement:
1. **UI Foundation** - Shared indicator components, tooltip enhancements
2. **Indicator Components** - Status indicator, type badge, count badges
3. **Integration** - Wire indicators into DocumentRow, ItemCard, ProjectGroupRow

### Parallel Work Opportunities

- Phase 1 tasks (utility functions, CSS) can run in parallel
- Phase 2 indicator components are independent of each other
- Testing can begin once components are integrated

### Critical Path

`StatusIndicator → DocumentRow integration → ItemCard collapse`

---

## Phase Breakdown

### Phase 1: UI Foundation

**Duration**: 1-2 tasks
**Dependencies**: None
**Assigned Subagent(s)**: ui-engineer-enhanced

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|---------------------|----------|-------------|--------------|
| UI-001 | Aggregation Utilities | Create utility functions to aggregate item status/type counts, note type counts from RequestLogDoc | Functions return correct counts, tested | 2 pts | ui-engineer-enhanced | None |
| UI-002 | CSS Variables & Classes | Add CSS variables for status colors, type icons, indicator styles to viewer.css | Colors match existing badge patterns, consistent with design system | 2 pts | ui-engineer-enhanced | None |

**Phase 1 Quality Gates:**
- [ ] Aggregation utilities have unit tests
- [ ] CSS follows existing viewer.css patterns
- [ ] Color variables reuse existing status badge colors

---

### Phase 2: Indicator Components

**Duration**: 3-4 tasks
**Dependencies**: Phase 1 complete
**Assigned Subagent(s)**: ui-engineer-enhanced, frontend-developer

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|---------------------|----------|-------------|--------------|
| UI-003 | StatusIndicator Component | Create reusable colored dot/icon component for status with Tooltip | Renders correct color per status, tooltip shows full status name | 2 pts | ui-engineer-enhanced | UI-002 |
| UI-004 | ItemCountIndicator Component | Create indicator showing total items with status breakdown tooltip | Shows count, tooltip lists "N backlog, M done, ..." | 2 pts | ui-engineer-enhanced | UI-001, UI-002 |
| UI-005 | TypeDistributionIndicator Component | Create indicator with colored type icons and counts | Shows icons (bug, feature, etc.) with numbers, tooltip summarizes | 3 pts | ui-engineer-enhanced | UI-001, UI-002 |
| UI-006 | ProjectProgressIndicator Component | Create "X/Y done" ratio indicator with status breakdown tooltip | Shows ratio, tooltip shows all status counts | 2 pts | ui-engineer-enhanced | UI-001, UI-002 |
| UI-007 | NoteCountTooltip Enhancement | Enhance existing note count to show type breakdown on hover | Tooltip shows "N General, M Validation, ..." | 1 pt | frontend-developer | UI-001 |

**Phase 2 Quality Gates:**
- [ ] All indicators render correctly with mock data
- [ ] Tooltips display on hover with correct positioning
- [ ] Components are accessible (aria-labels, keyboard focusable)
- [ ] Components follow memoization patterns for performance

---

### Phase 3: Integration & Testing

**Duration**: 4-5 tasks
**Dependencies**: Phase 2 complete
**Assigned Subagent(s)**: ui-engineer-enhanced, frontend-developer, web-accessibility-checker

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|---------------------|----------|-------------|--------------|
| UI-008 | DocumentRow Integration | Add ItemCountIndicator and TypeDistributionIndicator to DocumentRow | Indicators render with real data, tooltips work | 2 pts | ui-engineer-enhanced | UI-004, UI-005 |
| UI-009 | ItemCard Integration | Add StatusIndicator to ItemCard header, enhance note count tooltip | Status dot visible, tooltip functional | 1 pt | frontend-developer | UI-003, UI-007 |
| UI-010 | ProjectGroupRow Integration | Add ProjectProgressIndicator to ProjectGroupRow | Shows done/total ratio, tooltip works | 1 pt | frontend-developer | UI-006 |
| UI-011 | Collapsible Item Content | Add toggle button to ItemCard, default collapsed, show only title + indicators when collapsed | Toggle works, state persists during session, default collapsed | 3 pts | ui-engineer-enhanced | UI-009 |
| UI-012 | Unit & Integration Tests | Write tests for all indicator components and integrations | Coverage >80%, all interactions tested | 2 pts | frontend-developer | UI-008, UI-009, UI-010, UI-011 |
| UI-013 | Accessibility Audit | Verify WCAG 2.1 AA compliance for all indicators and tooltips | All indicators have aria-labels, keyboard accessible, screen reader compatible | 1 pt | web-accessibility-checker | UI-012 |

**Phase 3 Quality Gates:**
- [ ] All indicators display with real document data
- [ ] Collapse/expand works smoothly with animation
- [ ] Tooltips position correctly (don't overflow viewport)
- [ ] Tests pass with >80% coverage
- [ ] Accessibility audit passes

---

## Technical Specifications

### Status Colors (from existing viewer.css patterns)

| Status | Color Variable | Visual |
|--------|---------------|--------|
| triage | `--color-status-triage` | Gray |
| backlog | `--color-status-backlog` | Red |
| planned | `--color-status-planned` | Yellow |
| in-progress | `--color-status-in-progress` | Blue |
| done | `--color-status-done` | Green |
| wontfix | `--color-status-wontfix` | Gray strikethrough |

### Type Icons (suggestions)

| Type | Icon | Color |
|------|------|-------|
| bug | 🐛 or Bug SVG | Red accent |
| enhancement | ✨ or Star SVG | Blue accent |
| idea | 💡 or Lightbulb SVG | Yellow accent |
| task | ✓ or Check SVG | Green accent |
| question | ❓ or Question SVG | Purple accent |

### Component Props Interfaces

```typescript
// StatusIndicator
interface StatusIndicatorProps {
  status: string;
  size?: 'sm' | 'md'; // default 'sm'
  showTooltip?: boolean; // default true
}

// ItemCountIndicator
interface ItemCountIndicatorProps {
  items: RequestLogItem[];
  size?: 'sm' | 'md';
}

// TypeDistributionIndicator
interface TypeDistributionIndicatorProps {
  items: RequestLogItem[];
  maxTypes?: number; // default 5
}

// ProjectProgressIndicator
interface ProjectProgressIndicatorProps {
  documents: RequestLogDoc[];
}

// CollapsibleItemCard (enhanced ItemCard)
interface CollapsibleItemCardProps extends ItemCardProps {
  defaultCollapsed?: boolean; // default true
  onCollapseChange?: (collapsed: boolean) => void;
}
```

### Aggregation Utility Functions

```typescript
// src/ui/viewer/utils/indicators.ts

function aggregateStatusCounts(items: RequestLogItem[]): Record<string, number>;
function aggregateTypeCounts(items: RequestLogItem[]): Record<string, number>;
function aggregateNoteTypeCounts(notes: Note[]): Record<string, number>;
function calculateProjectProgress(documents: RequestLogDoc[]): { done: number; total: number; statusBreakdown: Record<string, number> };
```

---

## File Changes Summary

### New Files
- `src/ui/viewer/components/StatusIndicator.tsx`
- `src/ui/viewer/components/ItemCountIndicator.tsx`
- `src/ui/viewer/components/TypeDistributionIndicator.tsx`
- `src/ui/viewer/components/ProjectProgressIndicator.tsx`
- `src/ui/viewer/utils/indicators.ts`
- `src/ui/viewer/utils/__tests__/indicators.test.ts`
- `src/ui/viewer/components/__tests__/StatusIndicator.test.tsx`
- `src/ui/viewer/components/__tests__/ItemCountIndicator.test.tsx`
- `src/ui/viewer/components/__tests__/TypeDistributionIndicator.test.tsx`
- `src/ui/viewer/components/__tests__/ProjectProgressIndicator.test.tsx`

### Modified Files
- `src/ui/viewer/viewer.css` - Add indicator styles, status colors
- `src/ui/viewer/DocumentRow.tsx` - Add ItemCountIndicator, TypeDistributionIndicator
- `src/ui/viewer/ItemCard.tsx` - Add StatusIndicator, collapse functionality
- `src/ui/viewer/ProjectGroupRow.tsx` - Add ProjectProgressIndicator
- `src/ui/shared/NoteCard.tsx` or `ItemCard.tsx` - Enhanced note count tooltip

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Tooltip positioning issues | Medium | Medium | Use existing Tooltip component, test edge cases |
| Performance with many items | Medium | Low | Memoize aggregation functions, use React.memo |
| Collapse animation jank | Low | Medium | Use CSS transitions, test on slow devices |

### UX Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Visual clutter | Medium | Medium | Keep indicators compact, use subtle colors |
| Tooltip overlap | Low | Medium | Stagger tooltip delays, position intelligently |

---

## Success Metrics

### Delivery Metrics
- All 13 tasks completed
- Code coverage >80%
- Zero accessibility violations

### UX Metrics
- Users can quickly scan document/item status at a glance
- Collapse reduces visual noise when reviewing many items
- Tooltips provide detail without cluttering UI

---

## Quick Reference: Task Commands

```bash
# Phase 1: Foundation
Task(subagent_type="ui-engineer-enhanced", prompt="UI-001: Create aggregation utilities...")
Task(subagent_type="ui-engineer-enhanced", prompt="UI-002: Add CSS variables for indicators...")

# Phase 2: Components (can run in parallel)
Task(subagent_type="ui-engineer-enhanced", prompt="UI-003: Create StatusIndicator component...")
Task(subagent_type="ui-engineer-enhanced", prompt="UI-004: Create ItemCountIndicator...")
Task(subagent_type="ui-engineer-enhanced", prompt="UI-005: Create TypeDistributionIndicator...")
Task(subagent_type="ui-engineer-enhanced", prompt="UI-006: Create ProjectProgressIndicator...")
Task(subagent_type="frontend-developer", prompt="UI-007: Enhance note count tooltip...")

# Phase 3: Integration
Task(subagent_type="ui-engineer-enhanced", prompt="UI-008: Integrate indicators into DocumentRow...")
Task(subagent_type="frontend-developer", prompt="UI-009: Integrate StatusIndicator into ItemCard...")
Task(subagent_type="frontend-developer", prompt="UI-010: Integrate ProjectProgressIndicator...")
Task(subagent_type="ui-engineer-enhanced", prompt="UI-011: Implement collapsible ItemCard...")
Task(subagent_type="frontend-developer", prompt="UI-012: Write tests for indicators...")
Task(subagent_type="web-accessibility-checker", prompt="UI-013: Accessibility audit...")
```

---

**Progress Tracking:** `.claude/progress/viewer-indicators/progress.md`

---

**Implementation Plan Version**: 1.0
**Last Updated**: 2026-01-09
