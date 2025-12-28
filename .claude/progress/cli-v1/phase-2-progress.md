---
type: progress
prd: "cli-v1"
phase: 2
title: "Project Management"
status: "planning"
started: null
completed: null

overall_progress: 0
completion_estimate: "on-track"

total_tasks: 7
completed_tasks: 0
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

owners: ["backend-typescript-architect"]
contributors: ["task-completion-validator"]

tasks:
  - id: "TASK-2.1"
    description: "Implement project list command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_effort: "3sp"
    priority: "high"

  - id: "TASK-2.2"
    description: "Implement project add command with validation"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-2.1"]
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-2.3"
    description: "Implement project update command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-2.1"]
    estimated_effort: "3sp"
    priority: "medium"

  - id: "TASK-2.4"
    description: "Implement project enable/disable commands"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-2.1"]
    estimated_effort: "2sp"
    priority: "medium"

  - id: "TASK-2.5"
    description: "Implement project set-default command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-2.1"]
    estimated_effort: "2sp"
    priority: "medium"

  - id: "TASK-2.6"
    description: "Write project management tests"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-2.2", "TASK-2.3", "TASK-2.4", "TASK-2.5"]
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-2.7"
    description: "Integration testing (Phase 1 + Phase 2)"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-2.6"]
    estimated_effort: "2sp"
    priority: "high"

parallelization:
  batch_1: ["TASK-2.1"]
  batch_2: ["TASK-2.2", "TASK-2.3", "TASK-2.4", "TASK-2.5"]
  batch_3: ["TASK-2.6", "TASK-2.7"]
  critical_path: ["TASK-2.1", "TASK-2.2", "TASK-2.6"]
  estimated_total_time: "1-2 weeks"

blockers: []

success_criteria:
  - { id: "SC-1", description: "All 5 project commands implemented", status: "pending" }
  - { id: "SC-2", description: "Project CRUD operations working", status: "pending" }
  - { id: "SC-3", description: "Output formatters working for all commands", status: "pending" }
  - { id: "SC-4", description: ">=85% code coverage for Phase 2", status: "pending" }
  - { id: "SC-5", description: "Zero regression from Phase 1", status: "pending" }

files_modified:
  - "src/cli/commands/project/list.ts"
  - "src/cli/commands/project/add.ts"
  - "src/cli/commands/project/update.ts"
  - "src/cli/commands/project/enable.ts"
  - "src/cli/commands/project/disable.ts"
  - "src/cli/commands/project/set-default.ts"
  - "src/cli/handlers/project.ts"
  - "tests/cli/commands/project.test.ts"
---

# CLI v1 - Phase 2: Project Management

**Phase**: 2 of 4
**Status**: Planning (0% complete)
**Duration**: 1-2 weeks | **Story Points**: 16
**Owner**: backend-typescript-architect
**Prerequisites**: Phase 1 complete

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Foundation):
- TASK-2.1 → `backend-typescript-architect` (3sp) - project list

**Batch 2** (Parallel - Depends on Batch 1):
- TASK-2.2 → `backend-typescript-architect` (4sp) - project add
- TASK-2.3 → `backend-typescript-architect` (3sp) - project update
- TASK-2.4 → `backend-typescript-architect` (2sp) - enable/disable
- TASK-2.5 → `backend-typescript-architect` (2sp) - set-default

**Batch 3** (Sequential - Depends on Batch 2):
- TASK-2.6 → `backend-typescript-architect` (4sp) - Tests
- TASK-2.7 → `backend-typescript-architect` (2sp) - Integration

**Critical Path**: TASK-2.1 → TASK-2.2 → TASK-2.6

### Task Delegation Commands

```
# Batch 1
Task("backend-typescript-architect", "TASK-2.1: Implement project list command in src/cli/commands/project/list.ts. Use existing ProjectStore adapter. Support --json, --yaml, --csv, --table, --enabled-only, --disabled-only, --sort (id|name|created) flags.")

# Batch 2 (After Batch 1 completes - launch in parallel)
Task("backend-typescript-architect", "TASK-2.2: Implement project add command. meatycapture project add <name> <path> with optional --id, --repo-url flags. Validate path exists/writable, ID unique. Generate kebab-case ID from name.")

Task("backend-typescript-architect", "TASK-2.3: Implement project update command. meatycapture project update <id> [--name] [--path] [--repo-url]. Partial updates only, preserve unchanged fields.")

Task("backend-typescript-architect", "TASK-2.4: Implement project enable/disable commands. meatycapture project enable|disable <id>. Set enabled flag, update timestamp. Idempotent (success if already in state).")

Task("backend-typescript-architect", "TASK-2.5: Implement project set-default command. Store in ~/.meatycapture/config.json. Validate project exists before setting.")

# Batch 3 (After Batch 2 completes)
Task("backend-typescript-architect", "TASK-2.6: Write comprehensive project tests. Unit tests for all 5 commands, CRUD workflow integration tests, validation error tests. >=85% coverage.")

Task("backend-typescript-architect", "TASK-2.7: Cross-phase integration testing. Verify Phase 1 tests still pass. Test combined workflow: create project → create log doc for project → list projects.")
```

---

## Overview

Phase 2 implements complete project management capabilities through the `project` command hierarchy. All operations leverage the existing ProjectStore adapter with no modifications to core code.

**Why This Phase**: Enables project configuration management - users can add, modify, and organize projects entirely via CLI.

**Scope**:
- IN: 5 project commands (list, add, update, enable/disable, set-default)
- OUT: field/config commands (Phases 3-4)

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| TASK-2.1 | Implement project list | ⏳ | backend-typescript-architect | None | 3sp | Foundation |
| TASK-2.2 | Implement project add | ⏳ | backend-typescript-architect | 2.1 | 4sp | With validation |
| TASK-2.3 | Implement project update | ⏳ | backend-typescript-architect | 2.1 | 3sp | Partial updates |
| TASK-2.4 | Implement enable/disable | ⏳ | backend-typescript-architect | 2.1 | 2sp | State management |
| TASK-2.5 | Implement set-default | ⏳ | backend-typescript-architect | 2.1 | 2sp | Config update |
| TASK-2.6 | Write tests | ⏳ | backend-typescript-architect | 2.2-2.5 | 4sp | >=85% coverage |
| TASK-2.7 | Integration testing | ⏳ | backend-typescript-architect | 2.6 | 2sp | Cross-phase |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✓ Complete | 🚫 Blocked | ⚠️ At Risk

---

## Architecture Context

### ProjectStore Interface

```typescript
interface ProjectStore {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(project: Project): Promise<void>;
  update(id: string, updates: Partial<Project>): Promise<void>;
  delete(id: string): Promise<void>;
}
```

No changes to adapter code required - CLI is a thin presentation layer.

---

## Additional Resources

- **Implementation Plan**: `/docs/project_plans/implementation_plans/features/cli-v1/phase-2-project-mgmt.md`
- **PRD**: `/docs/project_plans/PRDs/features/cli-v1.md`
- **Phase 1 Progress**: `/.claude/progress/cli-v1/phase-1-progress.md`
