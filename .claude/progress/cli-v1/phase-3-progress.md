---
type: progress
prd: "cli-v1"
phase: 3
title: "Field Catalog Management"
status: "planning"
started: null
completed: null

overall_progress: 0
completion_estimate: "on-track"

total_tasks: 6
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

owners: ["backend-typescript-architect"]
contributors: ["task-completion-validator"]

tasks:
  - id: "TASK-3.1"
    description: "Implement field list command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-3.2"
    description: "Implement field add command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-3.1"]
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-3.3"
    description: "Implement field remove command with confirmation"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-3.1"]
    estimated_effort: "3sp"
    priority: "medium"

  - id: "TASK-3.4"
    description: "Implement field import command (JSON/YAML batch)"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-3.1"]
    estimated_effort: "5sp"
    priority: "high"

  - id: "TASK-3.5"
    description: "Write field catalog tests"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-3.2", "TASK-3.3", "TASK-3.4"]
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-3.6"
    description: "Integration testing (Phases 1-3)"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-3.5"]
    estimated_effort: "2sp"
    priority: "high"

parallelization:
  batch_1: ["TASK-3.1"]
  batch_2: ["TASK-3.2", "TASK-3.3", "TASK-3.4"]
  batch_3: ["TASK-3.5", "TASK-3.6"]
  critical_path: ["TASK-3.1", "TASK-3.2", "TASK-3.5"]
  estimated_total_time: "1-2 weeks"

blockers: []

success_criteria:
  - { id: "SC-1", description: "All 4 field commands implemented", status: "pending" }
  - { id: "SC-2", description: "Global field options working", status: "pending" }
  - { id: "SC-3", description: "Project-level field options working", status: "pending" }
  - { id: "SC-4", description: "Batch import functional", status: "pending" }
  - { id: "SC-5", description: ">=85% code coverage for Phase 3", status: "pending" }
  - { id: "SC-6", description: "Zero regression from Phases 1-2", status: "pending" }

files_modified:
  - "src/cli/commands/field/list.ts"
  - "src/cli/commands/field/add.ts"
  - "src/cli/commands/field/remove.ts"
  - "src/cli/commands/field/import.ts"
  - "src/cli/handlers/field.ts"
  - "tests/cli/commands/field.test.ts"
---

# CLI v1 - Phase 3: Field Catalog Management

**Phase**: 3 of 4
**Status**: Planning (0% complete)
**Duration**: 1-2 weeks | **Story Points**: 16
**Owner**: backend-typescript-architect
**Prerequisites**: Phases 1-2 complete

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Foundation):
- TASK-3.1 → `backend-typescript-architect` (4sp) - field list

**Batch 2** (Parallel - Depends on Batch 1):
- TASK-3.2 → `backend-typescript-architect` (4sp) - field add
- TASK-3.3 → `backend-typescript-architect` (3sp) - field remove
- TASK-3.4 → `backend-typescript-architect` (5sp) - field import

**Batch 3** (Sequential - Depends on Batch 2):
- TASK-3.5 → `backend-typescript-architect` (4sp) - Tests
- TASK-3.6 → `backend-typescript-architect` (2sp) - Integration

**Critical Path**: TASK-3.1 → TASK-3.2 → TASK-3.5

### Task Delegation Commands

```
# Batch 1
Task("backend-typescript-architect", "TASK-3.1: Implement field list command. meatycapture field list [--field <name>] [--project <id>] [--global-only]. Show effective options (global + project). Support --json, --yaml, --csv formats.")

# Batch 2 (After Batch 1 - launch in parallel)
Task("backend-typescript-architect", "TASK-3.2: Implement field add command. meatycapture field add <field> <value> [--project <id>]. Validate field name (type|domain|priority|status|context|tags). Generate opt-uuid-short ID. Scope based on --project flag.")

Task("backend-typescript-architect", "TASK-3.3: Implement field remove command. meatycapture field remove <option-id> [--force]. Confirmation prompt. Cannot remove global if used in project (exit 1). Exit 130 on cancel.")

Task("backend-typescript-architect", "TASK-3.4: Implement field import command. meatycapture field import <file> [--project <id>] [--merge]. Support .json and .yaml. Input: { 'type': ['val1', 'val2'], ... }. Atomic validation before import.")

# Batch 3 (After Batch 2)
Task("backend-typescript-architect", "TASK-3.5: Write field catalog tests. Unit tests for all 4 commands. Global vs project scoping tests. Batch import with JSON/YAML. >=85% coverage.")

Task("backend-typescript-architect", "TASK-3.6: Cross-phase integration testing. Verify Phases 1-2 tests pass. Test: create project → add field option → create log using new option.")
```

---

## Overview

Phase 3 implements field catalog administration through the `field` command hierarchy. Operations manage global and project-scoped field options for type, domain, priority, status, context, and tags.

**Why This Phase**: Enables customization of field options - users can add their own types, priorities, statuses, etc.

**Scope**:
- IN: 4 field commands (list, add, remove, import)
- OUT: config commands, interactive mode (Phase 4)

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| TASK-3.1 | Implement field list | ⏳ | backend-typescript-architect | None | 4sp | Scoping |
| TASK-3.2 | Implement field add | ⏳ | backend-typescript-architect | 3.1 | 4sp | Validation |
| TASK-3.3 | Implement field remove | ⏳ | backend-typescript-architect | 3.1 | 3sp | Confirmation |
| TASK-3.4 | Implement field import | ⏳ | backend-typescript-architect | 3.1 | 5sp | Batch |
| TASK-3.5 | Write tests | ⏳ | backend-typescript-architect | 3.2-3.4 | 4sp | >=85% coverage |
| TASK-3.6 | Integration testing | ⏳ | backend-typescript-architect | 3.5 | 2sp | Cross-phase |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✓ Complete | 🚫 Blocked | ⚠️ At Risk

---

## Field Naming Conventions

Valid field names:
- `type` - enhancement, bug, idea, task, question
- `domain` - api, web, cli, data, infra, ml
- `priority` - low, medium, high, critical
- `status` - triage, backlog, planned, in-progress, done, wontfix
- `context` - freeform (URL or path)
- `tags` - freeform tags for grouping

---

## Import File Format

### JSON
```json
{
  "type": ["feature-request", "chore"],
  "priority": ["p0", "p1", "p2"]
}
```

### YAML
```yaml
type:
  - feature-request
  - chore
priority:
  - p0
  - p1
```

---

## Additional Resources

- **Implementation Plan**: `/docs/project_plans/implementation_plans/features/cli-v1/phase-3-field-catalog.md`
- **PRD**: `/docs/project_plans/PRDs/features/cli-v1.md`
- **Phase 2 Progress**: `/.claude/progress/cli-v1/phase-2-progress.md`
