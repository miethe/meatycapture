---
type: progress
prd: "structured-notes-v1"
phase: 4
title: "Viewer Integration"
status: "planning"
started: null
completed: null

overall_progress: 0
completion_estimate: "on-track"

total_tasks: 5
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

owners: ["ui-engineer-enhanced"]
contributors: ["backend-typescript-architect", "test-engineer"]

tasks:
  - id: "VIEW-001"
    description: "Add Notes section to ItemCard viewer component"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "2pts"
    priority: "high"

  - id: "VIEW-002"
    description: "Implement note CRUD operations with file persistence"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["VIEW-001"]
    estimated_effort: "4pts"
    priority: "high"

  - id: "VIEW-003"
    description: "Integrate NoteTypeFilter in viewer"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["VIEW-001"]
    estimated_effort: "2pts"
    priority: "medium"

  - id: "VIEW-004"
    description: "File I/O utilities and persistence layer"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["VIEW-002"]
    estimated_effort: "3pts"
    priority: "high"

  - id: "VIEW-005"
    description: "Integration tests for viewer + notes workflow"
    status: "pending"
    assigned_to: ["test-engineer"]
    dependencies: ["VIEW-001", "VIEW-002", "VIEW-003", "VIEW-004"]
    estimated_effort: "3pts"
    priority: "medium"

parallelization:
  batch_1: ["VIEW-001"]
  batch_2: ["VIEW-002", "VIEW-003"]
  batch_3: ["VIEW-004"]
  batch_4: ["VIEW-005"]
  critical_path: ["VIEW-001", "VIEW-002", "VIEW-004", "VIEW-005"]
  estimated_total_time: "3 days"

blockers: []

success_criteria:
  - { id: "SC-4.1", description: "Notes section displays in ItemCard below metadata", status: "pending" }
  - { id: "SC-4.2", description: "Add/Edit/Delete operations work in viewer", status: "pending" }
  - { id: "SC-4.3", description: "Changes persist to markdown file immediately", status: "pending" }
  - { id: "SC-4.4", description: "Type filter correctly filters displayed notes", status: "pending" }
  - { id: "SC-4.5", description: "Concurrent edit handling works (last-write-wins)", status: "pending" }
  - { id: "SC-4.6", description: "E2E test passes: add -> edit -> delete -> file verified", status: "pending" }

files_modified:
  - "src/ui/viewer/ItemCard.tsx"
  - "src/ui/viewer/hooks/useItemEdit.ts"
  - "src/ui/viewer/hooks/useNoteFilter.ts"
  - "src/core/serializer/item-update.ts"
  - "src/adapters/fs-local/doc-store.ts"
---

# structured-notes-v1 - Phase 4: Viewer Integration

**Phase**: 4 of 5
**Status**: Planning (0% complete)
**Duration**: Not started, estimated 3 days
**Owner**: ui-engineer-enhanced
**Dependencies**: Phases 1, 2, and 3 complete

---

## Orchestration Quick Reference

### Parallelization Strategy

**Batch 1**:
- VIEW-001 -> `ui-engineer-enhanced` (2pts)

**Batch 2** (Depends on VIEW-001):
- VIEW-002 -> `backend-typescript-architect` (4pts)
- VIEW-003 -> `ui-engineer-enhanced` (2pts)

**Batch 3** (Depends on VIEW-002):
- VIEW-004 -> `backend-typescript-architect` (3pts)

**Batch 4** (Depends on all):
- VIEW-005 -> `test-engineer` (3pts)

### Task Delegation Commands

```
# Batch 1
Task("ui-engineer-enhanced", "VIEW-001: Add Notes section to ItemCard viewer. Insert below metadata, above copy buttons. Pass item.notes to NotesList. Add '+ Add Note' button. Handle empty state with 'No notes yet' message.")

# Batch 2 (After VIEW-001)
Task("backend-typescript-architect", "VIEW-002: Implement note CRUD in viewer. Add note -> NoteModal -> save to item -> trigger file write. Edit note -> pre-fill modal -> update -> file write. Delete -> confirmation -> remove -> file write. Add success toasts, error handling, concurrent edit detection.")
Task("ui-engineer-enhanced", "VIEW-003: Integrate NoteTypeFilter in viewer. Add filter dropdown above notes list. Manage filter state in ItemCard or custom hook. Pass active filter to NotesList. Default: all types shown.")

# Batch 3 (After VIEW-002)
Task("backend-typescript-architect", "VIEW-004: Create updateItemNotes() utility. Load RequestLogDoc, update target item's notes, regenerate items_index and tags aggregation, serialize, write with backup. Handle errors gracefully. Add unit and integration tests.")

# Batch 4 (After all)
Task("test-engineer", "VIEW-005: Write integration tests for viewer + notes. Test: add note -> file updated, edit note -> file updated with timestamp, delete note -> file updated, filter by type, multiple operations in sequence, reload shows persisted notes, concurrent edit warning. E2E: full lifecycle.")
```

---

## Overview

Add notes section to viewer with full CRUD and immediate file persistence.

**Why This Phase**: Users need to add/edit/delete notes while viewing existing items.

**Scope**:
- IN: ItemCard integration, CRUD operations, file persistence, type filtering
- OUT: Accessibility audit, performance optimization, documentation

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est |
|----|------|--------|-------|--------------|-----|
| VIEW-001 | Add Notes section | Pending | ui-engineer-enhanced | None | 2pts |
| VIEW-002 | Note CRUD | Pending | backend-typescript-architect | VIEW-001 | 4pts |
| VIEW-003 | Type Filter | Pending | ui-engineer-enhanced | VIEW-001 | 2pts |
| VIEW-004 | File I/O | Pending | backend-typescript-architect | VIEW-002 | 3pts |
| VIEW-005 | Integration Tests | Pending | test-engineer | All | 3pts |

**Total**: 14 story points

---

## Quality Gates

- [ ] All viewer integration tests pass
- [ ] E2E test: add/edit/delete notes in viewer -> file persists
- [ ] File I/O operations handle errors gracefully
- [ ] Concurrent edit handling works correctly
- [ ] No regressions in existing viewer functionality
