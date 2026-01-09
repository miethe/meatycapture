---
# Viewer Indicators - Progress Tracking
# Combined progress for all phases (medium-sized feature)

type: progress
prd: "viewer-indicators-v1"
plan_id: "IMPL-2026-01-09-VIEWER-INDICATORS"
title: "Viewer Indicators and Collapsible Items"
status: "planning"
started: "2026-01-09"
completed: null

# Overall Progress
overall_progress: 0
completion_estimate: "on-track"

# Task Counts (all phases combined)
total_tasks: 13
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

# Ownership
owners: ["ui-engineer-enhanced"]
contributors: ["frontend-developer", "web-accessibility-checker"]

# === PHASE 1: UI Foundation ===
# Tasks that establish shared utilities and styles

tasks:
  # Phase 1: UI Foundation
  - id: "UI-001"
    phase: 1
    description: "Create aggregation utilities for status/type/note counts"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "2 pts"
    priority: "high"
    files:
      - "src/ui/viewer/utils/indicators.ts"
      - "src/ui/viewer/utils/__tests__/indicators.test.ts"

  - id: "UI-002"
    phase: 1
    description: "Add CSS variables and classes for indicators to viewer.css"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "2 pts"
    priority: "high"
    files:
      - "src/ui/viewer/viewer.css"

  # Phase 2: Indicator Components
  - id: "UI-003"
    phase: 2
    description: "Create StatusIndicator component (colored dot with tooltip)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["UI-002"]
    estimated_effort: "2 pts"
    priority: "high"
    files:
      - "src/ui/viewer/components/StatusIndicator.tsx"
      - "src/ui/viewer/components/__tests__/StatusIndicator.test.tsx"

  - id: "UI-004"
    phase: 2
    description: "Create ItemCountIndicator component (count with status breakdown tooltip)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["UI-001", "UI-002"]
    estimated_effort: "2 pts"
    priority: "high"
    files:
      - "src/ui/viewer/components/ItemCountIndicator.tsx"
      - "src/ui/viewer/components/__tests__/ItemCountIndicator.test.tsx"

  - id: "UI-005"
    phase: 2
    description: "Create TypeDistributionIndicator component (type icons with counts)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["UI-001", "UI-002"]
    estimated_effort: "3 pts"
    priority: "high"
    files:
      - "src/ui/viewer/components/TypeDistributionIndicator.tsx"
      - "src/ui/viewer/components/__tests__/TypeDistributionIndicator.test.tsx"

  - id: "UI-006"
    phase: 2
    description: "Create ProjectProgressIndicator component (done/total ratio)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["UI-001", "UI-002"]
    estimated_effort: "2 pts"
    priority: "medium"
    files:
      - "src/ui/viewer/components/ProjectProgressIndicator.tsx"
      - "src/ui/viewer/components/__tests__/ProjectProgressIndicator.test.tsx"

  - id: "UI-007"
    phase: 2
    description: "Enhance note count indicator with type breakdown tooltip"
    status: "pending"
    assigned_to: ["frontend-developer"]
    dependencies: ["UI-001"]
    estimated_effort: "1 pt"
    priority: "medium"
    files:
      - "src/ui/viewer/ItemCard.tsx"

  # Phase 3: Integration & Testing
  - id: "UI-008"
    phase: 3
    description: "Integrate indicators into DocumentRow"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["UI-004", "UI-005"]
    estimated_effort: "2 pts"
    priority: "high"
    files:
      - "src/ui/viewer/DocumentRow.tsx"

  - id: "UI-009"
    phase: 3
    description: "Integrate StatusIndicator into ItemCard header"
    status: "pending"
    assigned_to: ["frontend-developer"]
    dependencies: ["UI-003", "UI-007"]
    estimated_effort: "1 pt"
    priority: "high"
    files:
      - "src/ui/viewer/ItemCard.tsx"

  - id: "UI-010"
    phase: 3
    description: "Integrate ProjectProgressIndicator into ProjectGroupRow"
    status: "pending"
    assigned_to: ["frontend-developer"]
    dependencies: ["UI-006"]
    estimated_effort: "1 pt"
    priority: "medium"
    files:
      - "src/ui/viewer/ProjectGroupRow.tsx"

  - id: "UI-011"
    phase: 3
    description: "Implement collapsible ItemCard content with toggle button"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["UI-009"]
    estimated_effort: "3 pts"
    priority: "high"
    files:
      - "src/ui/viewer/ItemCard.tsx"
      - "src/ui/viewer/viewer.css"

  - id: "UI-012"
    phase: 3
    description: "Write unit and integration tests for all indicators"
    status: "pending"
    assigned_to: ["frontend-developer"]
    dependencies: ["UI-008", "UI-009", "UI-010", "UI-011"]
    estimated_effort: "2 pts"
    priority: "high"
    files:
      - "src/ui/viewer/__tests__/"

  - id: "UI-013"
    phase: 3
    description: "Accessibility audit for indicators and tooltips"
    status: "pending"
    assigned_to: ["web-accessibility-checker"]
    dependencies: ["UI-012"]
    estimated_effort: "1 pt"
    priority: "high"

# Parallelization Strategy
parallelization:
  batch_1: ["UI-001", "UI-002"]                         # Phase 1: Run parallel
  batch_2: ["UI-003", "UI-004", "UI-005", "UI-006", "UI-007"]  # Phase 2: Mostly parallel
  batch_3: ["UI-008", "UI-009", "UI-010"]               # Phase 3: Integration parallel
  batch_4: ["UI-011"]                                    # Collapse depends on UI-009
  batch_5: ["UI-012"]                                    # Tests after implementation
  batch_6: ["UI-013"]                                    # A11y after tests
  critical_path: ["UI-002", "UI-003", "UI-009", "UI-011", "UI-012", "UI-013"]
  estimated_total_time: "21 pts"

# Phase Quality Gates
quality_gates:
  phase_1:
    - id: "QG-1.1"
      description: "Aggregation utilities have unit tests"
      status: "pending"
    - id: "QG-1.2"
      description: "CSS follows existing viewer.css patterns"
      status: "pending"
  phase_2:
    - id: "QG-2.1"
      description: "All indicators render correctly with mock data"
      status: "pending"
    - id: "QG-2.2"
      description: "Tooltips display on hover with correct positioning"
      status: "pending"
    - id: "QG-2.3"
      description: "Components are accessible (aria-labels)"
      status: "pending"
  phase_3:
    - id: "QG-3.1"
      description: "All indicators display with real document data"
      status: "pending"
    - id: "QG-3.2"
      description: "Collapse/expand works with animation"
      status: "pending"
    - id: "QG-3.3"
      description: "Tests pass with >80% coverage"
      status: "pending"
    - id: "QG-3.4"
      description: "Accessibility audit passes"
      status: "pending"

# Blockers
blockers: []

# Success Criteria
success_criteria:
  - id: "SC-1"
    description: "Documents show item count with status breakdown tooltip"
    status: "pending"
  - id: "SC-2"
    description: "Documents show type distribution with icons and counts"
    status: "pending"
  - id: "SC-3"
    description: "Items show colored status indicator with tooltip"
    status: "pending"
  - id: "SC-4"
    description: "Note counts show type breakdown on hover"
    status: "pending"
  - id: "SC-5"
    description: "Projects show done/total ratio with breakdown"
    status: "pending"
  - id: "SC-6"
    description: "Items are collapsible, default collapsed"
    status: "pending"

# Files to be modified/created
files_modified:
  - "src/ui/viewer/utils/indicators.ts"
  - "src/ui/viewer/utils/__tests__/indicators.test.ts"
  - "src/ui/viewer/viewer.css"
  - "src/ui/viewer/components/StatusIndicator.tsx"
  - "src/ui/viewer/components/ItemCountIndicator.tsx"
  - "src/ui/viewer/components/TypeDistributionIndicator.tsx"
  - "src/ui/viewer/components/ProjectProgressIndicator.tsx"
  - "src/ui/viewer/DocumentRow.tsx"
  - "src/ui/viewer/ItemCard.tsx"
  - "src/ui/viewer/ProjectGroupRow.tsx"
---

# Viewer Indicators - Progress Tracking

**YAML frontmatter is the source of truth for tasks, status, and assignments.**

## Quick Reference

```bash
# Update task status
python .claude/skills/artifact-tracking/scripts/update-status.py \
  -f .claude/progress/viewer-indicators/progress.md -t UI-001 -s completed

# Batch update
python .claude/skills/artifact-tracking/scripts/update-batch.py \
  -f .claude/progress/viewer-indicators/progress.md \
  --updates "UI-001:completed,UI-002:completed"
```

---

## Objective

Add comprehensive status/type indicators to the Viewer tab's Document and Item list views, plus collapsible item content. This improves scannability and reduces visual noise when reviewing many items.

---

## Phase Summary

| Phase | Title | Tasks | Status |
|-------|-------|-------|--------|
| 1 | UI Foundation | UI-001, UI-002 | pending |
| 2 | Indicator Components | UI-003 - UI-007 | pending |
| 3 | Integration & Testing | UI-008 - UI-013 | pending |

---

## Implementation Notes

### Architectural Decisions

- **Reuse existing Tooltip component** from `src/ui/shared/Tooltip.tsx`
- **Follow existing badge patterns** in viewer.css (`.status-*`, `.priority-*`)
- **Memoize aggregation functions** for performance with large document sets
- **Use React.memo** on indicator components to prevent unnecessary re-renders

### Patterns and Best Practices

- Existing color patterns: `src/ui/viewer/viewer.css` lines with `.status-done`, `.status-backlog`, etc.
- Existing collapse pattern: DocumentRow chevron rotation, detail row animation
- Existing tooltip: `src/ui/shared/Tooltip.tsx` with position and delay props

### Known Gotchas

- Tooltip positioning near viewport edges - use smart positioning
- Collapse animation should use CSS transitions, not JS
- Ensure 44px minimum touch target for toggle button (mobile)
- Screen reader support for all indicators (aria-labels)

### Development Setup

```bash
pnpm dev      # Start dev server
pnpm test     # Run tests in watch mode
```

---

## Task Commands (for agents)

### Phase 1: Foundation (parallel)
```
Task(subagent_type="ui-engineer-enhanced", prompt="UI-001: Create aggregation utility functions in src/ui/viewer/utils/indicators.ts. Functions needed: aggregateStatusCounts(items), aggregateTypeCounts(items), aggregateNoteTypeCounts(notes), calculateProjectProgress(documents). Include unit tests. Reference existing RequestLogItem and Note types from src/core/models/index.ts")

Task(subagent_type="ui-engineer-enhanced", prompt="UI-002: Add CSS variables and classes for indicators to src/ui/viewer/viewer.css. Add status color variables (reuse existing .status-* patterns), type icon colors, indicator badge styles. Follow existing glass/morphism aesthetic.")
```

### Phase 2: Components (mostly parallel after Phase 1)
```
Task(subagent_type="ui-engineer-enhanced", prompt="UI-003: Create StatusIndicator component in src/ui/viewer/components/StatusIndicator.tsx. Props: status string, size (sm|md), showTooltip boolean. Render colored dot based on status, show tooltip with 'Status: {status}' on hover. Use existing Tooltip component.")

Task(subagent_type="ui-engineer-enhanced", prompt="UI-004: Create ItemCountIndicator component in src/ui/viewer/components/ItemCountIndicator.tsx. Props: items array. Show total count, tooltip with 'N backlog, M done, ...' breakdown. Use aggregateStatusCounts utility.")

Task(subagent_type="ui-engineer-enhanced", prompt="UI-005: Create TypeDistributionIndicator component in src/ui/viewer/components/TypeDistributionIndicator.tsx. Props: items array. Show colored icons for each type (bug, enhancement, etc.) with counts. Tooltip summarizes all types.")

Task(subagent_type="ui-engineer-enhanced", prompt="UI-006: Create ProjectProgressIndicator component in src/ui/viewer/components/ProjectProgressIndicator.tsx. Props: documents array. Show 'X/Y done' ratio, tooltip with full status breakdown across all items in project.")

Task(subagent_type="frontend-developer", prompt="UI-007: Enhance note count display in ItemCard to show type breakdown tooltip on hover. Use aggregateNoteTypeCounts utility. Tooltip shows 'N General, M Validation, ...'")
```

### Phase 3: Integration (sequential after Phase 2)
```
Task(subagent_type="ui-engineer-enhanced", prompt="UI-008: Integrate ItemCountIndicator and TypeDistributionIndicator into DocumentRow.tsx. Add after existing item_count display. Wire to document.items data.")

Task(subagent_type="frontend-developer", prompt="UI-009: Integrate StatusIndicator into ItemCard header, next to item title. Use item.status prop.")

Task(subagent_type="frontend-developer", prompt="UI-010: Integrate ProjectProgressIndicator into ProjectGroupRow.tsx. Calculate from grouped documents' items.")

Task(subagent_type="ui-engineer-enhanced", prompt="UI-011: Implement collapsible ItemCard content. Add toggle button (chevron), default to collapsed showing only title + indicators. Expand shows full item details. Use CSS transition for animation.")

Task(subagent_type="frontend-developer", prompt="UI-012: Write comprehensive tests for all indicator components and integrations. Target >80% coverage. Test tooltip interactions, collapse/expand, edge cases (empty items, single item, etc.)")

Task(subagent_type="web-accessibility-checker", prompt="UI-013: Accessibility audit for all new indicators. Verify aria-labels, keyboard navigation, screen reader compatibility, color contrast for status indicators.")
```

---

## Completion Notes

*To be filled when implementation is complete*
