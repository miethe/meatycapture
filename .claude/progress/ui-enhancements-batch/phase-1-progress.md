---
# === PHASE 1 PROGRESS TRACKING ===
# Core Model Updates for UI Enhancements Batch v1
# REQUIRED FIELDS: assigned_to, dependencies for EVERY task

# Metadata: Identification and Classification
type: progress
prd: "ui-enhancements-batch-v1"
phase: 1
title: "Core Model Updates"
status: "planning"
started: "2026-01-01"
completed: null

# Overall Progress: Status and Estimates
overall_progress: 0
completion_estimate: "on-track"

# Task Counts: Machine-readable task state
total_tasks: 4
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

# Ownership: Primary and secondary agents
owners: ["backend-typescript-architect"]
contributors: []

# === ORCHESTRATION QUICK REFERENCE ===
# For lead-architect and orchestration agents: All tasks with assignments and dependencies
# This section enables minimal-token delegation without reading full file
tasks:
  # Parallel batch 1: Model field additions (no dependencies)
  - id: "TASK-1.1"
    description: "Add modified_at field to RequestLogItem model"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_effort: "2h"
    priority: "high"

  - id: "TASK-1.2"
    description: "Add archived status to RequestLogDoc model"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_effort: "2h"
    priority: "high"

  # Parallel batch 2: Serializer updates (depend on model definitions)
  - id: "TASK-1.3"
    description: "Update serializer for modified_at field"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.1"]
    estimated_effort: "1.5h"
    priority: "high"

  - id: "TASK-1.4"
    description: "Update serializer for archived status"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.2"]
    estimated_effort: "1.5h"
    priority: "high"

# Parallelization Strategy (computed from dependencies)
parallelization:
  batch_1: ["TASK-1.1", "TASK-1.2"]      # Model additions can run simultaneously
  batch_2: ["TASK-1.3", "TASK-1.4"]      # Serializer updates depend on models, can run in parallel
  critical_path: ["TASK-1.1", "TASK-1.3"] # Longest dependency chain (or TASK-1.2, TASK-1.4)
  estimated_total_time: "5h"              # Optimal parallel execution

# Critical Blockers: For immediate visibility
blockers: []

# Success Criteria: Acceptance conditions for phase completion
success_criteria:
  - id: "SC-1"
    description: "modified_at field serializes correctly in RequestLogItem"
    status: "pending"
  - id: "SC-2"
    description: "archived status serializes correctly in RequestLogDoc"
    status: "pending"
  - id: "SC-3"
    description: "Existing request-log documents parse without errors (backward compatible)"
    status: "pending"
  - id: "SC-4"
    description: "TypeScript compiles without errors in strict mode"
    status: "pending"
  - id: "SC-5"
    description: "Type guards validate new fields correctly"
    status: "pending"

# Files Modified: What's being changed in this phase
files_modified:
  - "src/core/models/RequestLogItem.ts"
  - "src/core/models/RequestLogDoc.ts"
  - "src/core/serializer/markdown-writer.ts"
  - "src/core/serializer/markdown-parser.ts"
  - "src/core/validation/type-guards.ts"
  - "src/tests/fixtures/sample-request-logs.ts"
---

# ui-enhancements-batch-v1 - Phase 1: Core Model Updates

**Phase**: 1 of 6
**Status**: 📋 Planning (0% complete)
**Duration**: Started 2026-01-01, estimated completion 2026-01-02
**Owner**: backend-typescript-architect
**Contributors**: None

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Parallel - No Dependencies):
- TASK-1.1 → `backend-typescript-architect` (2h) - Add modified_at to RequestLogItem
- TASK-1.2 → `backend-typescript-architect` (2h) - Add archived to RequestLogDoc

**Batch 2** (Parallel - Depends on Batch 1):
- TASK-1.3 → `backend-typescript-architect` (1.5h) - **Blocked by**: TASK-1.1 - Update serializer for modified_at
- TASK-1.4 → `backend-typescript-architect` (1.5h) - **Blocked by**: TASK-1.2 - Update serializer for archived

**Critical Path**: TASK-1.1 → TASK-1.3 (3.5h) OR TASK-1.2 → TASK-1.4 (3.5h)
**Optimal Total Time**: 5h (with parallel execution)

### Task Delegation Commands

```
# Batch 1 (Launch in parallel)
Task("backend-typescript-architect", "TASK-1.1: Add modified_at field to RequestLogItem model")
Task("backend-typescript-architect", "TASK-1.2: Add archived status to RequestLogDoc model")

# Batch 2 (After Batch 1 completes)
Task("backend-typescript-architect", "TASK-1.3: Update serializer for modified_at field")
Task("backend-typescript-architect", "TASK-1.4: Update serializer for archived status")
```

---

## Overview

Phase 1 establishes the foundation for all downstream UI enhancements by updating the MeatyCapture core data models. This phase adds two critical fields:
1. **modified_at**: Auto-updating timestamp on RequestLogItem (enables "edited X minutes ago" display, sorting by recency)
2. **archived**: Boolean status on RequestLogDoc (enables document archival without deletion, filtering in viewer)

These are minimal, focused changes to the domain models with **zero breaking changes** to existing request-log documents. The serializer enhancements ensure full backward compatibility.

**Why This Phase**:
- Models are the foundation for all downstream layers (UI, serializer, service logic)
- These changes unlock Phase 2 (shared components) and downstream Phases 3-5
- Early validation of backward compatibility prevents data loss or parsing errors
- Simple, fast execution (4 tasks, ~5h optimal) enables quick team feedback

**Scope**:
- **IN Scope**: RequestLogItem and RequestLogDoc model updates, markdown serializer/parser updates, type guard updates
- **OUT of Scope**: UI components, document filtering, persistence logic, data migration scripts
- **Backward Compatibility**: 100% - existing docs without these fields parse correctly with sensible defaults

---

## Success Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| SC-1 | modified_at field serializes correctly in RequestLogItem | ⏳ Pending |
| SC-2 | archived status serializes correctly in RequestLogDoc | ⏳ Pending |
| SC-3 | Existing request-log documents parse without errors (backward compatible) | ⏳ Pending |
| SC-4 | TypeScript compiles without errors in strict mode | ⏳ Pending |
| SC-5 | Type guards validate new fields correctly | ⏳ Pending |

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| TASK-1.1 | Add modified_at field to RequestLogItem | ⏳ | backend-typescript-architect | None | 2h | Can run in parallel with TASK-1.2 |
| TASK-1.2 | Add archived status to RequestLogDoc | ⏳ | backend-typescript-architect | None | 2h | Can run in parallel with TASK-1.1 |
| TASK-1.3 | Update serializer for modified_at field | ⏳ | backend-typescript-architect | TASK-1.1 | 1.5h | Reads/writes field in markdown frontmatter |
| TASK-1.4 | Update serializer for archived status | ⏳ | backend-typescript-architect | TASK-1.2 | 1.5h | Reads/writes field in markdown frontmatter |

**Status Legend**:
- `⏳` Not Started (Pending)
- `🔄` In Progress
- `✓` Complete
- `🚫` Blocked
- `⚠️` At Risk

---

## Architecture Context

### Current State

MeatyCapture models follow a layered architecture:
- **Models Layer** (`src/core/models/`): TypeScript interfaces defining domain entities
- **Serializer Layer** (`src/core/serializer/`): Markdown reader/writer with YAML frontmatter
- **Validation Layer** (`src/core/validation/`): Type guards and field validation

**Key Files**:
- `src/core/models/RequestLogItem.ts` - Current item model (title, type, domain, context, priority, status, tags, notes, created_at)
- `src/core/models/RequestLogDoc.ts` - Current doc model (doc_id, title, items_index[], tags[], item_count, created, updated)
- `src/core/serializer/markdown-writer.ts` - Converts models to markdown with YAML frontmatter
- `src/core/serializer/markdown-parser.ts` - Parses markdown back to models
- `src/core/validation/type-guards.ts` - Runtime validation of field types

### Request-Log Markdown Format (Current)

```yaml
---
type: request-log
doc_id: REQ-20251203-capture-app
item_count: 2
tags: [ux, api]
items_index:
  - id: REQ-20251203-capture-app-01
    type: enhancement
---
### REQ-20251203-capture-app-01 - Title
**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** ux
**Created:** 2025-12-03T14:32:00Z
- Problem/goal: ...
```

### Reference Patterns

**Similar Field Additions**:
- `created_at` on RequestLogItem: added as ISO-8601 timestamp, serialized in frontmatter + markdown header
- `updated` on RequestLogDoc: auto-updated on any write, stored in doc-level frontmatter
- Type guards for timestamps: `isValidDate()` validates ISO-8601 format

---

## Implementation Details

### TASK-1.1: Add modified_at Field to RequestLogItem

**Acceptance Criteria**:
- [ ] Field added to RequestLogItem interface: `modified_at: Date`
- [ ] Type guards updated: `isRequestLogItem()` validates field
- [ ] Default value on creation: equals `created_at`
- [ ] Updates on edit: set to current timestamp when item modified
- [ ] No breaking changes: existing items without field parse correctly (default: `created_at`)
- [ ] Unit tests: 3+ tests covering creation, defaults, updates

**Technical Approach**:
1. Update `src/core/models/RequestLogItem.ts`:
   - Add `modified_at: Date` field to interface
   - Document field purpose: "Auto-updated timestamp of last modification"
2. Update `src/core/validation/type-guards.ts`:
   - Enhance `isRequestLogItem()` to validate `modified_at` is ISO-8601 date or fallback to `created_at`
3. Update item creation logic:
   - When ItemDraft is converted to RequestLogItem, set `modified_at = created_at`
4. Write unit tests:
   - Test valid ISO-8601 dates
   - Test parsing items without `modified_at` (backward compat)
   - Test default value assignment

**Known Gotchas**:
- Ensure timezone handling is consistent (UTC/ISO-8601)
- Type guards must handle missing field gracefully (old docs)
- Date serialization must be consistent with existing `created_at` pattern

---

### TASK-1.2: Add archived Status to RequestLogDoc

**Acceptance Criteria**:
- [ ] Field added to RequestLogDoc interface: `archived: boolean`
- [ ] Type guards updated: `isRequestLogDoc()` validates field
- [ ] Default value: `false` (not archived)
- [ ] Backward compatible: existing docs without field parse correctly
- [ ] Unit tests: 3+ tests covering creation, defaults, field validation

**Technical Approach**:
1. Update `src/core/models/RequestLogDoc.ts`:
   - Add `archived: boolean` field to interface
   - Document field purpose: "Soft-delete flag; enables archive without data loss"
2. Update `src/core/validation/type-guards.ts`:
   - Enhance `isRequestLogDoc()` to validate `archived` is boolean or fallback to `false`
3. Write unit tests:
   - Test valid boolean values
   - Test parsing docs without `archived` field
   - Test default assignment

**Known Gotchas**:
- Ensure YAML serialization handles boolean correctly (not string "true"/"false")
- Type guards must treat missing field as `false` for backward compat

---

### TASK-1.3: Update Serializer for modified_at Field

**Acceptance Criteria**:
- [ ] Markdown writer includes `modified_at` in YAML frontmatter for items
- [ ] Markdown parser reads `modified_at` from frontmatter
- [ ] Round-trip test: write → parse → matches original
- [ ] Old documents (no modified_at): parser assigns default value
- [ ] Format: ISO-8601 (e.g., "2025-12-03T14:32:00Z")
- [ ] Integration tests: 5+ tests for round-tripping with modified_at

**Technical Approach**:
1. Update `src/core/serializer/markdown-writer.ts`:
   - When writing item, include `modified_at: <ISO-8601>` in items_index[] YAML
   - Or as metadata line in item section (e.g., `**Modified:** 2025-12-03T14:32:00Z`)
2. Update `src/core/serializer/markdown-parser.ts`:
   - Parse `modified_at` from frontmatter or item metadata
   - Fallback to `created_at` if field missing
3. Write integration tests:
   - New item with modified_at round-trips correctly
   - Old item (no modified_at) parses with fallback
   - Multiple items with different modified_at values

**Known Gotchas**:
- Ensure metadata line format is consistent with existing patterns (e.g., **Created**, **Tags**)
- YAML escaping for timestamp values

---

### TASK-1.4: Update Serializer for archived Status

**Acceptance Criteria**:
- [ ] Markdown writer includes `archived: boolean` in document-level YAML frontmatter
- [ ] Markdown parser reads `archived` from document frontmatter
- [ ] Round-trip test: write → parse → matches original
- [ ] Old documents (no archived field): parser assigns default `false`
- [ ] Integration tests: 5+ tests for round-tripping with archived status

**Technical Approach**:
1. Update `src/core/serializer/markdown-writer.ts`:
   - When writing document, include `archived: <boolean>` in doc-level YAML frontmatter
   - Example: `archived: false`
2. Update `src/core/serializer/markdown-parser.ts`:
   - Parse `archived` from document frontmatter
   - Fallback to `false` if field missing
3. Write integration tests:
   - New doc with archived status round-trips correctly
   - Old doc (no archived field) parses with fallback
   - Archive status persists across edits

**Known Gotchas**:
- Ensure YAML boolean serialization (not string)
- Document-level vs item-level fields (archived is doc-level only)

---

### Development Setup

**Prerequisites**:
- TypeScript installed and configured (tsconfig.json)
- Vitest test runner available
- Existing RequestLogItem and RequestLogDoc models accessible

**Test Fixtures**:
- Use existing sample data in `src/tests/fixtures/sample-request-logs.ts`
- Create test documents with and without new fields
- Validate backward compatibility against real-world request-logs

**Commands**:
```bash
# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Linting
pnpm lint
```

---

## Blockers

### Active Blockers

None identified at planning stage.

### Resolved Blockers

N/A - Phase 1 initial planning.

---

## Dependencies

### External Dependencies

None - Phase 1 is self-contained model updates with no external dependencies.

### Internal Integration Points

- **RequestLogItem model** → used by serializer, validator, wizard capture flow
- **RequestLogDoc model** → used by serializer, validator, document viewer
- **Type guards** → used by all layers to validate data integrity
- **Markdown serializer** → must maintain backward compatibility with existing request-logs in `.meatycapture/` directory

---

## Testing Strategy

| Test Type | Scope | Coverage | Status |
|-----------|-------|----------|--------|
| Unit | Type guards, field validation | >85% | ⏳ |
| Integration | Serializer round-trip (write → parse) | Core paths + edge cases | ⏳ |
| Backward Compat | Parse existing docs without new fields | 100% of sample docs | ⏳ |
| Type Safety | TypeScript strict mode compilation | All files modified | ⏳ |

**Test Plan**:
1. **Unit Tests** (TASK-1.1, 1.2):
   - Valid field values
   - Missing fields (backward compat fallback)
   - Type guard validation

2. **Integration Tests** (TASK-1.3, 1.4):
   - Write document with new fields → parse back
   - Verify round-trip matches original
   - Parse old document without new fields
   - Parse documents with partial fields

3. **Snapshot Tests**:
   - Generated markdown output snapshots
   - Detect unintended serialization changes

---

## Next Session Agenda

### Immediate Actions (Next Session)

1. [ ] Review Phase 1 plan with backend-typescript-architect
2. [ ] Assign TASK-1.1 and TASK-1.2 to start in parallel
3. [ ] Set up test environment and fixtures
4. [ ] Begin TASK-1.1: Add modified_at to RequestLogItem

### Upcoming Critical Items

- **TASK-1.1 completion**: Unblocks TASK-1.3 (serializer update)
- **TASK-1.2 completion**: Unblocks TASK-1.4 (serializer update)
- **Phase 1 Quality Gate**: All tests passing, backward compat verified
- **Phase 2 kickoff**: Available once Phase 1 complete

### Context for Continuing Agent

**Key Technical Details**:
- RequestLogItem currently has: title, type, domain, context, priority, status, tags, notes, created_at
- RequestLogDoc currently has: doc_id, title, items_index, tags, item_count, created, updated
- Serializer uses YAML frontmatter for metadata, markdown body for item details
- Type guards are defensive: handle missing/invalid fields with sensible defaults
- Backward compatibility is critical: existing request-logs must parse without error

**Critical Files**:
- `src/core/models/RequestLogItem.ts` - Start here for TASK-1.1
- `src/core/models/RequestLogDoc.ts` - Start here for TASK-1.2
- `src/core/serializer/markdown-writer.ts` - Essential for TASK-1.3, 1.4
- `src/core/validation/type-guards.ts` - Updates required in all tasks

**Testing Approach**:
- Reuse existing test patterns and fixtures
- Ensure snapshots capture markdown output format
- Test both happy path and edge cases (missing fields, invalid dates, etc.)

---

## Session Notes

### 2026-01-01 (Planning)

**Completed**:
- Phase 1 scope definition: 4 focused tasks, 5h optimal execution
- Parallelization strategy: Batch 1 (model defs) → Batch 2 (serializer updates)
- Success criteria defined: backward compat + type safety

**In Progress**:
- Phase 1 progress tracking document (this file)

**Next Actions**:
- Distribute Phase 1 tasks to backend-typescript-architect
- Await TASK-1.1 and TASK-1.2 completion before TASK-1.3, 1.4

---

## Additional Resources

- **Implementation Plan**: `docs/project_plans/implementation_plans/enhancements/ui-enhancements-batch-v1.md` (Phase 1 section)
- **Architecture Overview**: `CLAUDE.md` (Layered Pattern section)
- **Model Interfaces**: `src/core/models/` directory
- **Serializer Implementation**: `src/core/serializer/markdown-writer.ts` and `markdown-parser.ts`
- **Type Guards**: `src/core/validation/type-guards.ts`
- **Test Fixtures**: `src/tests/fixtures/sample-request-logs.ts`
