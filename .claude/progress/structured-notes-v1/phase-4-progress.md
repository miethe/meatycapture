---
# === PHASE 4: VIEWER INTEGRATION PROGRESS ===
# Structured Notes - Phase 4 Viewer Integration

type: progress
prd: "structured-notes-v1"
phase: 4
title: "Viewer Integration"
status: "complete"
started: "2026-01-04"
completed: "2026-01-04"

# Overall Progress
overall_progress: 100
completion_estimate: "on-track"

# Task Counts
total_tasks: 5
completed_tasks: 5
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

# Ownership
owners: ["ui-engineer-enhanced", "backend-typescript-architect"]
contributors: ["code-reviewer", "task-completion-validator"]

# === ORCHESTRATION QUICK REFERENCE ===
tasks:
  - id: "VIEW-001"
    description: "Add Notes section to ItemCard with NotesList integration"
    status: "complete"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "2h"
    priority: "high"

  - id: "VIEW-002"
    description: "Implement Note CRUD operations in viewer with file persistence"
    status: "complete"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["VIEW-001"]
    estimated_effort: "4h"
    priority: "high"

  - id: "VIEW-003"
    description: "Integrate NoteTypeFilter dropdown in viewer"
    status: "complete"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["VIEW-001"]
    estimated_effort: "2h"
    priority: "medium"

  - id: "VIEW-004"
    description: "File I/O and persistence utilities for note operations"
    status: "complete"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_effort: "3h"
    priority: "high"

  - id: "VIEW-005"
    description: "Integration tests for viewer + notes workflow"
    status: "complete"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["VIEW-001", "VIEW-002", "VIEW-003", "VIEW-004"]
    estimated_effort: "3h"
    priority: "high"

# Parallelization Strategy
parallelization:
  batch_1: ["VIEW-001", "VIEW-004"]
  batch_2: ["VIEW-002", "VIEW-003"]
  batch_3: ["VIEW-005"]
  critical_path: ["VIEW-001", "VIEW-002", "VIEW-005"]
  estimated_total_time: "10h"

# Critical Blockers
blockers: []

# Success Criteria
success_criteria:
  - id: "SC-1"
    description: "Notes section visible in ItemCard with NotesList"
    status: "complete"
  - id: "SC-2"
    description: "Add/edit/delete operations work in viewer context"
    status: "complete"
  - id: "SC-3"
    description: "Note changes persist to markdown file immediately"
    status: "complete"
  - id: "SC-4"
    description: "NoteTypeFilter filters notes by type"
    status: "complete"
  - id: "SC-5"
    description: "Integration tests pass for viewer + notes workflow"
    status: "complete"

# Files Modified
files_modified:
  - "src/ui/viewer/ItemCard.tsx"
  - "src/ui/viewer/hooks/useNoteOperations.ts"
  - "src/ui/viewer/hooks/index.ts"
  - "src/core/serializer/item-update.ts"
  - "src/core/serializer/index.ts"
  - "src/ui/shared/NotesList.tsx"
  - "src/ui/shared/NotesList.css"
  - "src/ui/viewer/__tests__/ItemCard.test.tsx"
  - "src/ui/viewer/__tests__/notes-viewer.integration.test.tsx"
  - "src/ui/viewer/hooks/__tests__/useNoteOperations.test.tsx"
  - "src/core/serializer/item-update.test.ts"
---

# structured-notes-v1 - Phase 4: Viewer Integration

**Phase**: 4 of 5
**Status**: ✅ Complete (100%)
**Duration**: Started 2026-01-04, completed 2026-01-04
**Owner**: ui-engineer-enhanced, backend-typescript-architect
**Contributors**: code-reviewer, task-completion-validator

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Parallel - No Dependencies):
- VIEW-001 → `ui-engineer-enhanced` (2h)
- VIEW-004 → `backend-typescript-architect` (3h)

**Batch 2** (Parallel - Depends on Batch 1):
- VIEW-002 → `backend-typescript-architect` (4h) - **Blocked by**: VIEW-001
- VIEW-003 → `ui-engineer-enhanced` (2h) - **Blocked by**: VIEW-001

**Batch 3** (Sequential - Depends on Batch 2):
- VIEW-005 → `ui-engineer-enhanced` (3h) - **Blocked by**: VIEW-001, VIEW-002, VIEW-003, VIEW-004

**Critical Path**: VIEW-001 → VIEW-002 → VIEW-005 (9h total)

### Task Delegation Commands

```
# Batch 1 (Launch in parallel)
Task("ui-engineer-enhanced", "VIEW-001: Add Notes section to ItemCard

Integrate NotesList component into ItemCard viewer component.

Current State:
- ItemCard.tsx displays notes as concatenated markdown (lines 302-313)
- Need to replace with full NotesList component for grouped display
- NotesList, NoteCard, NoteModal components available in src/ui/shared/

Acceptance Criteria:
- Notes section added to ItemCard (below tags, before any copy buttons)
- Passes item.notes array to NotesList component
- NotesList displays notes grouped by type
- '+ Add Note' button visible (opens NoteModal)
- Edit and delete icons functional in viewer context
- Responsive: adjusts for mobile view
- Empty state: 'No notes yet' with add button
- Note operations update local state (actual persistence handled by VIEW-002)

Reference Components:
- NotesList: src/ui/shared/NotesList.tsx
- NoteCard: src/ui/shared/NoteCard.tsx
- NoteModal: src/ui/shared/NoteModal.tsx
- Note model: src/core/models/index.ts

Files to modify: src/ui/viewer/ItemCard.tsx")

Task("backend-typescript-architect", "VIEW-004: File I/O and persistence utilities for note operations

Create utility functions for note persistence in the viewer context.

Current State:
- Serializer in src/core/serializer/index.ts handles full doc serialization
- Need item-level update capability for notes
- useItemEdit hook in src/ui/viewer/hooks/useItemEdit.ts manages item edits

Acceptance Criteria:
- Create updateItemNotes() utility function in core/serializer
- Function takes: doc_id, item_id, notes array
- Load full RequestLogDoc from file
- Update target item's notes array
- Regenerate items_index and tags aggregation
- Serialize and write to file
- Create backup before write (existing strategy)
- Handle file not found, permission errors gracefully
- Return updated doc on success
- Unit tests for updateItemNotes() function

Reference Files:
- Serializer: src/core/serializer/index.ts
- Note model: src/core/models/index.ts (Note interface)
- File adapter pattern: src/adapters/fs-local/

Files to create/modify:
- src/core/serializer/item-update.ts (create)
- src/core/serializer/index.ts (export)
- src/core/serializer/__tests__/item-update.test.ts (create)")

# Batch 2 (After Batch 1 completes)
Task("backend-typescript-architect", "VIEW-002: Implement Note CRUD operations in viewer

Handle add/edit/delete operations and file persistence for notes in viewer.

Dependencies: VIEW-001 (UI), VIEW-004 (File I/O)

Current State:
- useItemEdit hook manages item edit flow
- Need dedicated hook for note operations
- updateItemNotes() utility available from VIEW-004

Acceptance Criteria:
- Create useNoteOperations hook for note CRUD
- Add note: opens NoteModal, saves to item, triggers file write
- Edit note: opens NoteModal pre-filled, updates item and file
- Delete note: shows confirmation, removes from item and file
- All operations trigger file write with backup strategy
- Success toast notification after each operation
- Error handling: display error message, offer retry
- Concurrent edit detection: warn user if document changed on disk
- Last-write-wins: local changes overwrite file changes
- Timestamp updates: modified_at set on item when notes change
- Generate note IDs using generateNoteId() on add

Reference Files:
- useItemEdit: src/ui/viewer/hooks/useItemEdit.ts
- useToast: src/ui/shared/useToast.tsx
- generateNoteId: src/core/validation/id-generator.ts

Files to create/modify:
- src/ui/viewer/hooks/useNoteOperations.ts (create)
- src/ui/viewer/ItemCard.tsx (integrate hook)")

Task("ui-engineer-enhanced", "VIEW-003: Integrate NoteTypeFilter in viewer

Add type filter dropdown for notes section in viewer.

Dependencies: VIEW-001 (Notes section in ItemCard)

Current State:
- NoteTypeFilter component exists in src/ui/shared/NoteTypeFilter.tsx
- NotesList accepts activeFilter prop

Acceptance Criteria:
- NoteTypeFilter dropdown displayed above notes list in ItemCard
- Filter state managed in ItemCard or custom hook
- NotesList receives active filter, hides non-matching types
- Default: all types shown
- Filter preference persists during session (local state only)
- Keyboard accessible
- Responsive design

Reference Components:
- NoteTypeFilter: src/ui/shared/NoteTypeFilter.tsx
- NotesList: src/ui/shared/NotesList.tsx

Files to modify:
- src/ui/viewer/ItemCard.tsx
- Optionally create: src/ui/viewer/hooks/useNoteFilter.ts")

# Batch 3 (After Batch 2 completes)
Task("ui-engineer-enhanced", "VIEW-005: Integration tests for viewer + notes workflow

Comprehensive integration tests for note operations in viewer.

Dependencies: All previous VIEW tasks

Acceptance Criteria:
- Test: add note in viewer → file updated
- Test: edit note in viewer → file updated with new timestamp
- Test: delete note in viewer → file updated
- Test: filter notes by type → display correct subset
- Test: multiple operations in sequence → file integrity maintained
- Test: reload viewer → notes persist from file
- Test: concurrent edit detection → warn user
- E2E test: full lifecycle (add → edit → delete → verify file)
- Follow existing test patterns in src/ui/viewer/__tests__/

Test Patterns:
- Use React Testing Library
- Mock file system operations
- Test hook behavior with renderHook

Files to create:
- src/ui/viewer/__tests__/notes-viewer.integration.test.tsx
- src/ui/viewer/hooks/__tests__/useNoteOperations.test.tsx")
```

---

## Overview

Add notes section to viewer with full CRUD and file persistence. This phase integrates the Note UI components (built in Phase 2) into the viewer, enabling users to add, edit, delete, and filter notes in the item detail view.

**Why This Phase**: Users need to manage notes on existing items, not just during initial capture.

**Scope**:
- IN: ItemCard notes section, NoteTypeFilter integration, file persistence, integration tests
- OUT: Accessibility audit (Phase 5), performance testing (Phase 5)

---

## Success Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| SC-1 | Notes section visible in ItemCard with NotesList | ✓ Complete |
| SC-2 | Add/edit/delete operations work in viewer context | ✓ Complete |
| SC-3 | Note changes persist to markdown file immediately | ✓ Complete |
| SC-4 | NoteTypeFilter filters notes by type | ✓ Complete |
| SC-5 | Integration tests pass for viewer + notes workflow | ✓ Complete |

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| VIEW-001 | Add Notes section to ItemCard | ✓ | ui-engineer-enhanced | None | 2h | Batch 1 |
| VIEW-002 | Implement Note CRUD in Viewer | ✓ | backend-typescript-architect | VIEW-001 | 4h | Batch 2 |
| VIEW-003 | Integrate NoteTypeFilter | ✓ | ui-engineer-enhanced | VIEW-001 | 2h | Batch 2 |
| VIEW-004 | File I/O and Persistence | ✓ | backend-typescript-architect | None | 3h | Batch 1 |
| VIEW-005 | Integration Tests | ✓ | ui-engineer-enhanced | All | 3h | Batch 3 |

**Status Legend**:
- `⏳` Not Started (Pending)
- `🔄` In Progress
- `✓` Complete
- `🚫` Blocked
- `⚠️` At Risk

---

## Architecture Context

### Current State

Phase 1-3 completed:
- Note interface with id, type, content, created_at, updated_at
- ItemDraft.notes and RequestLogItem.notes arrays
- Serializer handles note persistence
- NoteModal, NoteCard, NotesList, NoteTypeFilter UI components
- Capture wizard integration complete

**Key Files**:
- `src/core/models/index.ts` - Note interface and types
- `src/core/serializer/index.ts` - Note serialization
- `src/ui/shared/NoteModal.tsx` - Add/edit modal
- `src/ui/shared/NotesList.tsx` - Notes display container
- `src/ui/shared/NoteCard.tsx` - Individual note display
- `src/ui/shared/NoteTypeFilter.tsx` - Type filtering
- `src/ui/viewer/ItemCard.tsx` - Target for integration

### Reference Patterns

**Viewer Edit Flow**:
- useItemEdit manages item edit state
- EditModal wraps ItemEditForm
- Success/error feedback via useToast

**Similar Integrations**:
- Tags display in ItemCard shows chip pattern
- Markdown rendering shows content display pattern

---

## Implementation Details

### Technical Approach

1. **ItemCard Notes Section** (VIEW-001):
   - Replace simple markdown display with NotesList component
   - Wire callbacks for add/edit/delete to local state
   - Integrate NoteModal for add/edit operations

2. **File I/O Utilities** (VIEW-004):
   - Create updateItemNotes() for targeted note updates
   - Reuse existing backup strategy
   - Handle edge cases (missing files, permissions)

3. **CRUD Operations** (VIEW-002):
   - Create useNoteOperations hook
   - Wire to file persistence via updateItemNotes
   - Handle timestamps and ID generation

4. **Type Filter** (VIEW-003):
   - Add NoteTypeFilter above notes list
   - Manage filter state locally
   - Pass to NotesList activeFilter prop

5. **Integration Tests** (VIEW-005):
   - Test all CRUD operations
   - Test file persistence
   - Test concurrent edit handling

### Known Gotchas

- ItemCard receives item as prop, need to handle local state for notes
- Note ID generation requires doc context for proper format
- Concurrent edit detection needs file timestamp comparison
- Mobile view needs responsive layout testing

### Development Setup

```bash
# Run dev server
pnpm dev

# Run specific test file
pnpm test -- --testPathPattern="ItemCard"

# Run all viewer tests
pnpm test -- --testPathPattern="viewer"
```

---

## Dependencies

### External Dependencies

- Phase 1: Note model and serialization (COMPLETE)
- Phase 2: UI components (COMPLETE)
- Phase 3: Capture integration (COMPLETE)

### Internal Integration Points

- ItemCard integrates NotesList, NoteModal, NoteTypeFilter
- useNoteOperations uses updateItemNotes for persistence
- File operations follow existing adapter patterns

---

## Testing Strategy

| Test Type | Scope | Coverage | Status |
|-----------|-------|----------|--------|
| Unit | updateItemNotes | 80%+ | ⏳ |
| Unit | useNoteOperations | 80%+ | ⏳ |
| Integration | Viewer + notes flow | Core flows | ⏳ |
| E2E | Full lifecycle | Happy path | ⏳ |

---

## Session Notes

### 2026-01-04

**Completed**:
- Created Phase 4 progress file
- Analyzed current ItemCard implementation
- Identified integration points

**In Progress**:
- Ready to launch Batch 1

**Next**:
- Execute Batch 1: VIEW-001, VIEW-004 in parallel
