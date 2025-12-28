---
type: progress
prd: "cli-v1"
phase: 4
title: "Configuration & Interactive Mode"
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

owners: ["backend-typescript-architect", "ui-engineer-enhanced"]
contributors: ["documentation-writer", "task-completion-validator"]

tasks:
  - id: "TASK-4.1"
    description: "Implement config show command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_effort: "3sp"
    priority: "high"

  - id: "TASK-4.2"
    description: "Implement config set command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-4.1"]
    estimated_effort: "3sp"
    priority: "high"

  - id: "TASK-4.3"
    description: "Implement config init command"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-4.1"]
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-4.4"
    description: "Implement interactive mode (--interactive flag)"
    status: "pending"
    assigned_to: ["ui-engineer-enhanced"]
    dependencies: ["TASK-4.1", "TASK-4.2", "TASK-4.3"]
    estimated_effort: "5sp"
    priority: "medium"

  - id: "TASK-4.5"
    description: "Write configuration and interactive tests"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-4.3", "TASK-4.4"]
    estimated_effort: "4sp"
    priority: "high"

  - id: "TASK-4.6"
    description: "Final integration testing (all phases)"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-4.5"]
    estimated_effort: "2sp"
    priority: "high"

  - id: "TASK-4.7"
    description: "Complete CLI documentation (all 19 commands)"
    status: "pending"
    assigned_to: ["documentation-writer"]
    dependencies: ["TASK-4.4"]
    estimated_effort: "5sp"
    priority: "high"

parallelization:
  batch_1: ["TASK-4.1"]
  batch_2: ["TASK-4.2", "TASK-4.3"]
  batch_3: ["TASK-4.4"]
  batch_4: ["TASK-4.5", "TASK-4.7"]
  batch_5: ["TASK-4.6"]
  critical_path: ["TASK-4.1", "TASK-4.3", "TASK-4.4", "TASK-4.5", "TASK-4.6"]
  estimated_total_time: "1-2 weeks"

blockers: []

success_criteria:
  - { id: "SC-1", description: "All 3 config commands implemented", status: "pending" }
  - { id: "SC-2", description: "Configuration initialization working", status: "pending" }
  - { id: "SC-3", description: "Interactive mode functional", status: "pending" }
  - { id: "SC-4", description: "All 19 commands complete", status: "pending" }
  - { id: "SC-5", description: ">=85% code coverage overall", status: "pending" }
  - { id: "SC-6", description: "Zero regression from Phases 1-3", status: "pending" }
  - { id: "SC-7", description: "Complete documentation", status: "pending" }

files_modified:
  - "src/cli/commands/config/show.ts"
  - "src/cli/commands/config/set.ts"
  - "src/cli/commands/config/init.ts"
  - "src/cli/handlers/config.ts"
  - "src/cli/interactive/prompts.ts"
  - "src/cli/interactive/validators.ts"
  - "src/cli/interactive/utils.ts"
  - "tests/cli/commands/config.test.ts"
  - "tests/cli/interactive.test.ts"
  - "docs/cli/"
---

# CLI v1 - Phase 4: Configuration & Interactive Mode

**Phase**: 4 of 4 (Final)
**Status**: Planning (0% complete)
**Duration**: 1-2 weeks | **Story Points**: 14
**Owner**: backend-typescript-architect, ui-engineer-enhanced
**Prerequisites**: Phases 1-3 complete

---

## Orchestration Quick Reference

> **For Orchestration Agents**: Use this section to delegate tasks without reading the full file.

### Parallelization Strategy

**Batch 1** (Foundation):
- TASK-4.1 → `backend-typescript-architect` (3sp) - config show

**Batch 2** (Parallel - Depends on Batch 1):
- TASK-4.2 → `backend-typescript-architect` (3sp) - config set
- TASK-4.3 → `backend-typescript-architect` (4sp) - config init

**Batch 3** (Depends on Batch 2):
- TASK-4.4 → `ui-engineer-enhanced` (5sp) - Interactive mode

**Batch 4** (Parallel - Depends on Batch 3):
- TASK-4.5 → `backend-typescript-architect` (4sp) - Tests
- TASK-4.7 → `documentation-writer` (5sp) - Documentation

**Batch 5** (Final):
- TASK-4.6 → `backend-typescript-architect` (2sp) - Final integration

**Critical Path**: TASK-4.1 → TASK-4.3 → TASK-4.4 → TASK-4.5 → TASK-4.6

### Task Delegation Commands

```
# Batch 1
Task("backend-typescript-architect", "TASK-4.1: Implement config show command. Display config dir, files, default project, env overrides. Support --json, --yaml, --config-dir flags.")

# Batch 2 (After Batch 1 - launch in parallel)
Task("backend-typescript-architect", "TASK-4.2: Implement config set command. meatycapture config set <key> <value>. Valid keys: default_project, config_dir. Validate project exists for default_project. Update ~/.meatycapture/config.json.")

Task("backend-typescript-architect", "TASK-4.3: Implement config init command. Create ~/.meatycapture directory with config.json, projects.json (sample project), fields.json (standard options). --config-dir, --force flags. Exit 3 if exists without --force.")

# Batch 3 (After Batch 2)
Task("ui-engineer-enhanced", "TASK-4.4: Implement --interactive mode for all command groups. Guided prompts using readline/inquirer. log create --interactive prompts for project, doc, items. project add --interactive prompts for details. Clear prompts, validation, Ctrl+C handling.")

# Batch 4 (After Batch 3 - launch in parallel)
Task("backend-typescript-architect", "TASK-4.5: Write config and interactive tests. Unit tests for 3 config commands. Mock stdin for interactive tests. Config file creation/modification tests. >=85% coverage for Phase 4.")

Task("documentation-writer", "TASK-4.7: Complete CLI documentation for all 19 commands. Create docs/cli/index.md, commands-reference.md, workflows.md, configuration.md, troubleshooting.md, performance.md. Interactive mode examples.")

# Batch 5 (After Batch 4)
Task("backend-typescript-architect", "TASK-4.6: Final integration testing. Verify all 4 phases pass. Combined workflow: init → add project → add field → create log. All output modes across all commands. Exit codes verified.")
```

---

## Overview

Phase 4 completes the CLI with configuration management commands and introduces an optional `--interactive` mode for guided human workflows. This phase adds the final 3 commands (config show/set/init) and optional interactive prompts.

**Why This Phase**: Completes the CLI with configuration management and human-friendly interactive mode.

**Scope**:
- IN: 3 config commands, interactive mode, final docs
- OUT: Post-MVP enhancements (shell completion, batch ops, remote integration)

---

## Tasks

| ID | Task | Status | Agent | Dependencies | Est | Notes |
|----|------|--------|-------|--------------|-----|-------|
| TASK-4.1 | Implement config show | ⏳ | backend-typescript-architect | None | 3sp | Foundation |
| TASK-4.2 | Implement config set | ⏳ | backend-typescript-architect | 4.1 | 3sp | Settings |
| TASK-4.3 | Implement config init | ⏳ | backend-typescript-architect | 4.1 | 4sp | Setup |
| TASK-4.4 | Implement interactive | ⏳ | ui-engineer-enhanced | 4.1-4.3 | 5sp | Human UX |
| TASK-4.5 | Write tests | ⏳ | backend-typescript-architect | 4.3-4.4 | 4sp | >=85% coverage |
| TASK-4.6 | Final integration | ⏳ | backend-typescript-architect | 4.5 | 2sp | All phases |
| TASK-4.7 | Complete documentation | ⏳ | documentation-writer | 4.4 | 5sp | All 19 commands |

**Status Legend**: ⏳ Pending | 🔄 In Progress | ✓ Complete | 🚫 Blocked | ⚠️ At Risk

---

## Interactive Mode Examples

### Interactive Project Creation
```
$ meatycapture project add --interactive
? Project name: My New Project
? Default path: /path/to/docs
? Repository URL (optional): https://github.com/user/project
? Create project "my-new-project"? (Y/n)
✓ Created project: my-new-project
```

### Interactive Item Creation
```
$ meatycapture log create --interactive
? Select project: (use arrow keys)
❯ meatycapture
  my-new-project
? Create new document or append to existing? new
? Document title: Q1 Planning
? Item title: Review API design
? Item type: enhancement
...
✓ Created document: /path/to/REQ-20251227-meatycapture-01.md
```

---

## Configuration Structure

### ~/.meatycapture/config.json
```json
{
  "version": "1.0.0",
  "default_project": "meatycapture",
  "config_dir": "/Users/user/.meatycapture",
  "created_at": "2025-12-27T00:00:00Z"
}
```

---

## CLI Command Summary (All 19)

| Category | Commands |
|----------|----------|
| Log (6) | create, append, list, view, search, delete |
| Project (5) | list, add, update, enable, disable, set-default |
| Field (4) | list, add, remove, import |
| Config (3) | show, set, init |

---

## Additional Resources

- **Implementation Plan**: `/docs/project_plans/implementation_plans/features/cli-v1/phase-4-config-interactive.md`
- **PRD**: `/docs/project_plans/PRDs/features/cli-v1.md`
- **Phase 3 Progress**: `/.claude/progress/cli-v1/phase-3-progress.md`
