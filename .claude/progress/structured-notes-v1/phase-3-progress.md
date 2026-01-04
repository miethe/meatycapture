---
# === PHASE 3: CAPTURE WIZARD INTEGRATION PROGRESS ===
# Structured Notes - Phase 3 Capture Wizard Integration

type: progress
prd: "structured-notes-v1"
phase: 3
title: "Capture Wizard Integration"
status: "complete"
started: "2026-01-04"
completed: "2026-01-04"

# Overall Progress
overall_progress: 100
completion_estimate: "on-track"

# Task Counts
total_tasks: 4
completed_tasks: 4
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

# Ownership
owners: ["ui-engineer-enhanced", "backend-typescript-architect"]
contributors: ["code-reviewer", "task-completion-validator"]

# === ORCHESTRATION QUICK REFERENCE ===
tasks:
  - id: "CAPT-001"
    description: "Add '+ Add Note' button to ItemStep with NoteModal integration"
    status: "complete"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "3h"
    priority: "high"

  - id: "CAPT-002"
    description: "Display notes in ReviewStep with type grouping and edit/delete"
    status: "complete"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: []
    estimated_effort: "3h"
    priority: "high"

  - id: "CAPT-003"
    description: "Wire notes state and persistence through WizardFlow"
    status: "complete"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["CAPT-001", "CAPT-002"]
    estimated_effort: "2h"
    priority: "high"

  - id: "CAPT-004"
    description: "Integration tests for capture + notes workflow"
    status: "complete"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["CAPT-001", "CAPT-002", "CAPT-003"]
    estimated_effort: "3h"
    priority: "high"

# Parallelization Strategy
parallelization:
  batch_1: ["CAPT-001", "CAPT-002"]
  batch_2: ["CAPT-003"]
  batch_3: ["CAPT-004"]
  critical_path: ["CAPT-001", "CAPT-003", "CAPT-004"]
  estimated_total_time: "8h"

# Critical Blockers
blockers: []

# Success Criteria
success_criteria:
  - id: "SC-1"
    description: "+ Add Note button visible and functional in ItemStep"
    status: "complete"
  - id: "SC-2"
    description: "Notes grouped by type in ReviewStep"
    status: "complete"
  - id: "SC-3"
    description: "Notes persist when navigating wizard back/forward"
    status: "complete"
  - id: "SC-4"
    description: "Notes serialized correctly on submit"
    status: "complete"
  - id: "SC-5"
    description: "Integration tests pass for capture + notes workflow"
    status: "complete"

# Files Modified
files_modified:
  - "src/ui/wizard/ItemStep.tsx"
  - "src/ui/wizard/ReviewStep.tsx"
  - "src/ui/wizard/WizardFlow.tsx"
  - "src/ui/wizard/__tests__/notes-capture.integration.test.tsx"
---

# structured-notes-v1 - Phase 3: Capture Wizard Integration

**Phase**: 3 of 5
**Status**: ✅ Complete (100%)
**Duration**: Started 2026-01-04, completed 2026-01-04
**Owner**: ui-engineer-enhanced, backend-typescript-architect
**Contributors**: code-reviewer, task-completion-validator

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Parallel - No Dependencies):
- CAPT-001 → `ui-engineer-enhanced` (3h)
- CAPT-002 → `ui-engineer-enhanced` (3h)

**Batch 2** (Sequential - Depends on Batch 1):
- CAPT-003 → `backend-typescript-architect` (2h) - **Blocked by**: CAPT-001, CAPT-002

**Batch 3** (Sequential - Depends on Batch 2):
- CAPT-004 → `ui-engineer-enhanced` (3h) - **Blocked by**: CAPT-001, CAPT-002, CAPT-003

**Critical Path**: CAPT-001 → CAPT-003 → CAPT-004 (8h total)

### Task Delegation Commands

```
# Batch 1 (Launch in parallel)
Task("ui-engineer-enhanced", "CAPT-001: Add '+ Add Note' button to ItemStep

Integrate '+ Add Note' button into ItemStep capture form.

Acceptance Criteria:
- Button positioned below existing fields in ItemStep
- Button triggers NoteModal for adding new note
- Modal integration: save note → add to ItemDraft.notes array
- Display notes list showing notes added so far (type + snippet)
- User can add multiple notes before submitting wizard
- Visual indication of notes count (e.g., badge on button)
- Responsive: button and list adjust for mobile view
- Keyboard accessible: Tab to button, Enter to activate

Reference Components:
- NoteModal: src/ui/shared/NoteModal.tsx
- NotesList: src/ui/shared/NotesList.tsx
- Note model: src/core/models/index.ts (Note interface)

Files to modify: src/ui/wizard/ItemStep.tsx")

Task("ui-engineer-enhanced", "CAPT-002: Display notes in ReviewStep with type grouping

Show structured notes in capture review screen with type grouping.

Acceptance Criteria:
- Notes section in ReviewStep displaying all captured notes
- Notes grouped by type (same as viewer)
- Each note shows: type badge, truncated content (first 200 chars), edit/delete icons
- Edit icon opens NoteModal pre-filled with note data
- Delete icon shows confirmation dialog before removing
- '+ Add Note' button to add notes during review
- Notes persist when user submits wizard
- Responsive: single column on mobile, expanded on desktop

Reference Components:
- NotesList: src/ui/shared/NotesList.tsx
- NoteCard: src/ui/shared/NoteCard.tsx
- NoteModal: src/ui/shared/NoteModal.tsx

Files to modify: src/ui/wizard/ReviewStep.tsx")

# Batch 2 (After Batch 1 completes)
Task("backend-typescript-architect", "CAPT-003: Wire notes state and persistence through WizardFlow

Manage note state throughout wizard and handle persistence on submit.

Acceptance Criteria:
- ItemDraft state includes notes array (type safety via TypeScript)
- WizardFlow manages notes state transitions
- Notes preserved when user navigates backward/forward in wizard
- On wizard submit: notes serialized correctly to markdown
- ID generation for new notes happens on submit (not during capture)
- Timestamps (created_at, updated_at) set correctly during persistence
- Integration test: capture notes → navigate → review → submit → file has notes

Reference Files:
- Note model: src/core/models/index.ts
- Serializer: src/core/serializer/index.ts
- ID generator: src/core/validation/id-generator.ts

Files to modify: src/ui/wizard/WizardFlow.tsx")

# Batch 3 (After Batch 2 completes)
Task("ui-engineer-enhanced", "CAPT-004: Integration tests for capture + notes workflow

Comprehensive integration tests for note capture workflow.

Acceptance Criteria:
- Test: add single note in ItemStep
- Test: add multiple notes (different types)
- Test: edit note in ItemStep
- Test: delete note in ItemStep with confirmation
- Test: add note in ReviewStep
- Test: navigate wizard with notes in draft (notes persist)
- Test: submit wizard with notes → persists to markdown file
- Test: backup created before write
- E2E test: full flow (project → doc → item + notes → review → submit → verify file)

Test Patterns:
- Follow existing test patterns in src/ui/wizard/__tests__/
- Use React Testing Library
- Mock file system operations

Files to create: src/ui/wizard/__tests__/notes-capture.integration.test.tsx")
```

---

## Overview

Wire notes into the capture workflow with full CRUD support. This phase integrates the Note UI components (built in Phase 2) into the capture wizard, enabling users to add, edit, and delete notes during the capture process.

**Why This Phase**: Users need to capture structured notes during the initial item creation workflow, not just in the viewer.

**Scope**:
- IN: ItemStep integration, ReviewStep display, WizardFlow state management, integration tests
- OUT: Viewer integration (Phase 4), accessibility audit (Phase 5)

---

## Success Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| SC-1 | + Add Note button visible and functional in ItemStep | ✓ Complete |
| SC-2 | Notes grouped by type in ReviewStep | ✓ Complete |
| SC-3 | Notes persist when navigating wizard back/forward | ✓ Complete |
| SC-4 | Notes serialized correctly on submit | ✓ Complete |
| SC-5 | Integration tests pass for capture + notes workflow | ✓ Complete |

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| CAPT-001 | Add '+ Add Note' button to ItemStep | ✓ | ui-engineer-enhanced | None | 3h | Batch 1 |
| CAPT-002 | Display notes in ReviewStep | ✓ | ui-engineer-enhanced | None | 3h | Batch 1 |
| CAPT-003 | Wire notes state and persistence | ✓ | backend-typescript-architect | CAPT-001, CAPT-002 | 2h | Batch 2 |
| CAPT-004 | Integration tests for capture + notes | ✓ | ui-engineer-enhanced | CAPT-001, CAPT-002, CAPT-003 | 3h | Batch 3 |

**Status Legend**:
- `⏳` Not Started (Pending)
- `🔄` In Progress
- `✓` Complete
- `🚫` Blocked
- `⚠️` At Risk

---

## Architecture Context

### Current State

Phase 1 completed the Note data model and serialization:
- Note interface with id, type, content, created_at, updated_at
- ItemDraft.notes: Note[] replaces string field
- generateNoteId() function
- Serializer handles note persistence

Phase 2 completed UI components:
- NoteModal: Modal for add/edit with type dropdown + MarkdownEditor
- MarkdownEditor: Textarea with formatting toolbar
- NoteCard: Display component with type badge, content, actions
- NotesList: Container with grouping, filtering, add button
- NoteTypeFilter: Dropdown for type filtering

**Key Files**:
- `src/core/models/index.ts` - Note interface and types
- `src/core/serializer/index.ts` - Note serialization
- `src/ui/shared/NoteModal.tsx` - Add/edit modal
- `src/ui/shared/NotesList.tsx` - Notes display container
- `src/ui/shared/NoteCard.tsx` - Individual note display

### Reference Patterns

**Wizard State Management**:
- WizardFlow.tsx manages ItemDraft state
- Step components receive state via props
- State updates flow through WizardFlow handlers

**Similar Integrations**:
- Tags field in ItemStep shows multi-select pattern
- Existing form fields show responsive layout pattern

---

## Implementation Details

### Technical Approach

1. **ItemStep Integration** (CAPT-001):
   - Add NotesList below existing fields
   - Pass notes from ItemDraft state
   - Wire add/edit/delete callbacks to update ItemDraft.notes

2. **ReviewStep Display** (CAPT-002):
   - Add Notes section using NotesList (read-only mode)
   - Group by type with collapsible sections
   - Allow add/edit/delete in review mode

3. **State Management** (CAPT-003):
   - WizardFlow maintains notes in ItemDraft
   - Notes preserved across step navigation
   - On submit: generate note IDs, set timestamps, serialize

4. **Integration Tests** (CAPT-004):
   - Test all CRUD operations in wizard context
   - Test navigation with notes in draft
   - E2E test from capture to file persistence

### Known Gotchas

- Notes need temporary IDs during capture (final IDs generated on submit)
- Must handle note ordering consistency across add/edit/delete
- NoteModal edit mode needs to update existing note, not add new

### Development Setup

```bash
# Run dev server
pnpm dev

# Run specific test file
pnpm test -- --testPathPattern="ItemStep"

# Run all wizard tests
pnpm test -- --testPathPattern="wizard"
```

---

## Dependencies

### External Dependencies

- Phase 1: Note model and serialization (COMPLETE)
- Phase 2: UI components (COMPLETE)

### Internal Integration Points

- ItemStep integrates with NoteModal and NotesList
- ReviewStep displays notes using NotesList
- WizardFlow manages notes state throughout wizard

---

## Testing Strategy

| Test Type | Scope | Coverage | Status |
|-----------|-------|----------|--------|
| Unit | Note state updates | 80%+ | ⏳ |
| Integration | Wizard + notes flow | Core flows | ⏳ |
| E2E | Capture to file | Happy path | ⏳ |

---

## Next Session Agenda

### Immediate Actions (Next Session)
1. [x] Create Phase 3 progress file
2. [ ] Launch Batch 1: CAPT-001 and CAPT-002 in parallel
3. [ ] Wait for Batch 1 completion
4. [ ] Launch Batch 2: CAPT-003
5. [ ] Launch Batch 3: CAPT-004
6. [ ] Validate all success criteria

### Context for Continuing Agent

Phase 1 and 2 are complete. All Note model, serialization, and UI components are ready. This phase wires them into the capture wizard workflow.

---

## Session Notes

### 2026-01-04

**Completed**:
- Created Phase 3 progress file

**In Progress**:
- Ready to launch Batch 1

**Next Session**:
- Execute Batch 1: CAPT-001, CAPT-002
