---
type: progress
prd: viewer-indicators-v1
phase: 3
title: Integration & Testing
status: completed
progress: 100
created: '2026-01-09'
updated: '2026-01-09'
tasks:
- id: UI-008
  title: DocumentRow Integration
  description: Add ItemCountIndicator and TypeDistributionIndicator to DocumentRow
  status: completed
  assigned_to:
  - ui-engineer-enhanced
  dependencies:
  - UI-004
  - UI-005
  estimate: 2 pts
  acceptance:
  - Indicators render with real data
  - Tooltips work correctly
- id: UI-009
  title: ItemCard Integration
  description: Add StatusIndicator to ItemCard header, enhance note count tooltip
  status: completed
  assigned_to:
  - frontend-developer
  dependencies:
  - UI-003
  - UI-007
  estimate: 1 pt
  acceptance:
  - Status dot visible in card header
  - Note count tooltip functional
- id: UI-010
  title: ProjectGroupRow Integration
  description: Add ProjectProgressIndicator to ProjectGroupRow
  status: completed
  assigned_to:
  - frontend-developer
  dependencies:
  - UI-006
  estimate: 1 pt
  acceptance:
  - Shows done/total ratio
  - Tooltip works
- id: UI-011
  title: Collapsible Item Content
  description: Add toggle button to ItemCard, default collapsed, show only title +
    indicators when collapsed
  status: completed
  assigned_to:
  - ui-engineer-enhanced
  dependencies:
  - UI-009
  estimate: 3 pts
  acceptance:
  - Toggle button works
  - State persists during session
  - Default collapsed
  - Smooth animation
- id: UI-012
  title: Unit & Integration Tests
  description: Write tests for all indicator components and integrations
  status: completed
  assigned_to:
  - frontend-developer
  dependencies:
  - UI-008
  - UI-009
  - UI-010
  - UI-011
  estimate: 2 pts
  acceptance:
  - Coverage >80%
  - All interactions tested
- id: UI-013
  title: Accessibility Audit
  description: Verify WCAG 2.1 AA compliance for all indicators and tooltips
  status: completed
  assigned_to:
  - web-accessibility-checker
  dependencies:
  - UI-012
  estimate: 1 pt
  acceptance:
  - All indicators have aria-labels
  - Keyboard accessible
  - Screen reader compatible
parallelization:
  batch_1:
  - UI-008
  - UI-009
  - UI-010
  batch_2:
  - UI-011
  batch_3:
  - UI-012
  batch_4:
  - UI-013
quality_gates:
- All indicators display with real document data
- Collapse/expand works smoothly with animation
- Tooltips position correctly (don't overflow viewport)
- Tests pass with >80% coverage
- Accessibility audit passes
total_tasks: 6
completed_tasks: 6
in_progress_tasks: 0
blocked_tasks: 0
---

# Phase 3: Integration & Testing

## Status

Phase 2 (Indicator Components) completed. All foundation components ready for integration.

## Current Work

Starting Batch 1 integration tasks.

## Notes

- Indicators created in Phase 2: StatusIndicator, ItemCountIndicator, TypeDistributionIndicator, ProjectProgressIndicator
- Aggregation utilities available at `src/ui/viewer/utils/indicators.ts`
- CSS variables and classes added in Phase 1
