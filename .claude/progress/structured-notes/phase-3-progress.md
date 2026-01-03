---
type: progress
prd: "structured-notes-v1"
phase: 3
title: "Capture Wizard Integration"
status: "planning"
started: null
completed: null

overall_progress: 0
completion_estimate: "on-track"

total_tasks: 4
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

owners: ["ui-engineer-enhanced"]
contributors: ["backend-typescript-architect", "test-engineer"]

tasks:
  - id: "CAPT-001"
    description: "Add '+ Add Note' button to ItemStep and wire NoteModal"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "3pts"
    priority: "high"

  - id: "CAPT-002"
    description: "Display notes grouped by type in ReviewStep with edit/delete"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["CAPT-001"]
    estimated_effort: "3pts"
    priority: "high"

  - id: "CAPT-003"
    description: "Wire notes state throughout wizard and handle persistence on submit"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["CAPT-001", "CAPT-002"]
    estimated_effort: "2pts"
    priority: "high"

  - id: "CAPT-004"
    description: "Integration tests for capture + notes workflow (E2E flow)"
    status: "pending"
    assigned_to: ["test-engineer"]
    dependencies: ["CAPT-001", "CAPT-002", "CAPT-003"]
    estimated_effort: "3pts"
    priority: "medium"

parallelization:
  batch_1: ["CAPT-001"]
  batch_2: ["CAPT-002"]
  batch_3: ["CAPT-003"]
  batch_4: ["CAPT-004"]
  critical_path: ["CAPT-001", "CAPT-002", "CAPT-003", "CAPT-004"]
  estimated_total_time: "3 days"

blockers: []

success_criteria:
  - { id: "SC-3.1", description: "'+ Add Note' button appears in ItemStep", status: "pending" }
  - { id: "SC-3.2", description: "Notes display grouped by type in ReviewStep", status: "pending" }
  - { id: "SC-3.3", description: "Notes persist correctly when wizard submits", status: "pending" }
  - { id: "SC-3.4", description: "Notes preserved during wizard navigation", status: "pending" }
  - { id: "SC-3.5", description: "E2E test passes: capture notes -> submit -> file verified", status: "pending" }

files_modified:
  - "src/ui/wizard/ItemStep.tsx"
  - "src/ui/wizard/ReviewStep.tsx"
  - "src/ui/wizard/WizardFlow.tsx"
---

# structured-notes-v1 - Phase 3: Capture Wizard Integration

**Phase**: 3 of 5
**Status**: Planning (0% complete)
**Duration**: Not started, estimated 3 days
**Owner**: ui-engineer-enhanced
**Dependencies**: Phases 1 and 2 complete

---

## Orchestration Quick Reference

### Parallelization Strategy

**Batch 1**:
- CAPT-001 -> `ui-engineer-enhanced` (3pts)

**Batch 2** (Depends on CAPT-001):
- CAPT-002 -> `ui-engineer-enhanced` (3pts)

**Batch 3** (Depends on CAPT-001, CAPT-002):
- CAPT-003 -> `backend-typescript-architect` (2pts)

**Batch 4** (Depends on all):
- CAPT-004 -> `test-engineer` (3pts)

**Critical Path**: Sequential - CAPT-001 -> CAPT-002 -> CAPT-003 -> CAPT-004

### Task Delegation Commands

```
# Batch 1
Task("ui-engineer-enhanced", "CAPT-001: Add '+ Add Note' button to ItemStep below existing fields. Wire button to open NoteModal. On save, add note to ItemDraft.notes array. Display notes list with type + snippet. Add visual note count badge.")

# Batch 2 (After CAPT-001)
Task("ui-engineer-enhanced", "CAPT-002: Display notes in ReviewStep grouped by type. Each note shows type badge, truncated content (200 chars), edit/delete icons. Wire Edit to reopen NoteModal pre-filled, Delete to confirmation dialog. Add '+ Add Note' for adding during review.")

# Batch 3 (After CAPT-002)
Task("backend-typescript-architect", "CAPT-003: Wire notes state in WizardFlow.tsx. Manage ItemDraft.notes throughout wizard navigation. Preserve notes on back/forward navigation. On submit, generate note IDs and set timestamps before serialization.")

# Batch 4 (After all)
Task("test-engineer", "CAPT-004: Write integration tests for capture + notes. Test: add single note, add multiple notes, edit note, delete with confirmation, navigate with notes, submit -> verify file. E2E test: full flow from project selection to file verification.")
```

---

## Overview

Wire structured notes into the capture wizard workflow.

**Why This Phase**: Users need to add notes during the capture process, not just after.

**Scope**:
- IN: ItemStep integration, ReviewStep display, state management, persistence
- OUT: Viewer integration, file I/O operations, accessibility audit

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est |
|----|------|--------|-------|--------------|-----|
| CAPT-001 | Add Note button to ItemStep | Pending | ui-engineer-enhanced | None | 3pts |
| CAPT-002 | Notes in ReviewStep | Pending | ui-engineer-enhanced | CAPT-001 | 3pts |
| CAPT-003 | State & Persistence | Pending | backend-typescript-architect | CAPT-001,002 | 2pts |
| CAPT-004 | Integration Tests | Pending | test-engineer | All | 3pts |

**Total**: 11 story points

---

## Quality Gates

- [ ] All capture integration tests pass
- [ ] E2E test: capture notes -> submit -> file verified
- [ ] Wizard navigation with notes in draft verified
- [ ] No regressions in existing capture workflow
