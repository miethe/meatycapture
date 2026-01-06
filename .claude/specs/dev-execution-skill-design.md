# Dev Execution Skill Design

> **Status**: Draft | **Author**: Claude | **Date**: 2025-01-06

## Overview

Consolidate all dev execution guidance into a single `dev-execution` skill with progressive disclosure. Commands become thin action-oriented wrappers that explicitly reference the skill content they need.

## Problem Statement

| Issue | Impact |
|-------|--------|
| `execute-phase` is 716 lines | Excessive token usage on every invocation |
| Duplicated patterns across 6+ dev commands | Maintenance burden, inconsistency |
| No progressive disclosure | All content loaded regardless of use case |
| Commands mix guidance with actions | Hard to maintain, hard to test |

## Key Clarifications

### How Skills Work

Skills are **context added to the conversation thread** when relevant. They are not automatically invoked via frontmatter. Commands must:

1. Explicitly reference which skill files to load
2. Include direct links to skill content for progressive disclosure
3. Keep actions in the command, guidance in the skill

### Skill Integration Pattern

Commands reference skills like this:

```markdown
## Guidance

For execution patterns, see the dev-execution skill:
- Phase execution: [.claude/skills/dev-execution/modes/phase-execution.md]
- Orchestration: [.claude/skills/dev-execution/orchestration/batch-delegation.md]
```

## Proposed Architecture

```text
.claude/
├── commands/dev/
│   ├── execute-phase.md     (~60 lines - actions + skill refs)
│   ├── quick-feature.md     (~40 lines - actions + skill refs)
│   ├── implement-story.md   (~40 lines - actions + skill refs)
│   ├── complete-user-story.md (~50 lines - actions + skill refs)
│   ├── create-feature.md    (~35 lines - actions + skill refs)
│   └── new-feature.md       (~15 lines - minimal)
│
└── skills/dev-execution/
    ├── SKILL.md (200-250 lines - index + quick reference)
    ├── modes/
    │   ├── phase-execution.md      (~150 lines)
    │   ├── quick-execution.md      (~100 lines)
    │   ├── story-execution.md      (~120 lines)
    │   └── scaffold-execution.md   (~80 lines)
    ├── orchestration/
    │   ├── batch-delegation.md     (~100 lines)
    │   ├── parallel-patterns.md    (~80 lines)
    │   └── agent-assignments.md    (~60 lines)
    ├── validation/
    │   ├── quality-gates.md        (~100 lines)
    │   ├── milestone-checks.md     (~80 lines)
    │   └── completion-criteria.md  (~60 lines)
    └── integrations/
        ├── artifact-tracking.md    (~80 lines)
        └── request-log-workflow.md (~60 lines)
```

## SKILL.md Design

### Target: 200-250 lines

```markdown
---
name: dev-execution
description: "Unified execution engine for all development workflows. Progressive disclosure for phase execution, quick features, story completion, and scaffolding. Integrates with artifact-tracking and meatycapture-capture."
---

# Dev Execution Skill

Unified guidance for executing development workflows.

## Quick Start

| Mode | When to Use | Command |
|------|-------------|---------|
| Phase | Multi-phase plans with YAML tracking | `/dev:execute-phase` |
| Quick | Simple features, single-session | `/dev:quick-feature` |
| Story | User story with existing plan | `/dev:implement-story` |
| Full Story | Complete story end-to-end | `/dev:complete-user-story` |
| Scaffold | New feature structure | `/dev:create-feature` |

## Execution Modes (load only when needed)

| Mode | Guide | When to Load |
|------|-------|--------------|
| [Phase Execution](./modes/phase-execution.md) | Multi-phase YAML-driven work |
| [Quick Execution](./modes/quick-execution.md) | Simple single-session features |
| [Story Execution](./modes/story-execution.md) | User story implementation |
| [Scaffold](./modes/scaffold-execution.md) | Feature structure creation |

## Core Principles

### 1. Delegate Everything

- Opus orchestrates; subagents execute
- Never write implementation code directly
- Use batch delegation for parallel work

### 2. Token Efficiency

- Load only mode-specific content
- Use YAML head extraction for large files
- Request-log operations via `/mc` (see integrations)

### 3. Quality Gates

All modes share these gates:

- [ ] Tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Coverage maintained

## Agent Assignment Quick Reference

| Task Type | Agent |
|-----------|-------|
| Find files/patterns | codebase-explorer |
| React/UI components | ui-engineer-enhanced |
| TypeScript backend | backend-typescript-architect |
| Deep debugging | ultrathink-debugger |
| Validation | task-completion-validator |

For detailed assignments: [./orchestration/agent-assignments.md]

## Orchestration

| Reference | Purpose |
|-----------|---------|
| [Batch Delegation](./orchestration/batch-delegation.md) | Parallel Task() patterns |
| [Parallel Patterns](./orchestration/parallel-patterns.md) | Dependency-aware batching |
| [Agent Assignments](./orchestration/agent-assignments.md) | Agent selection guide |

## Validation

| Reference | Purpose |
|-----------|---------|
| [Quality Gates](./validation/quality-gates.md) | Test, lint, typecheck |
| [Milestone Checks](./validation/milestone-checks.md) | Phase completion criteria |
| [Completion Criteria](./validation/completion-criteria.md) | Story/feature done criteria |

## Skill Integrations

This skill tightly integrates with:

### artifact-tracking

For phase execution, use artifact-tracking for:
- CREATE progress files for new phases
- UPDATE task status after completion
- QUERY pending/blocked tasks
- ORCHESTRATE batch delegation

See [./integrations/artifact-tracking.md] for integration patterns.

### meatycapture-capture

For request-log operations during any execution mode:
- Track work items via `/mc` commands
- Update item status when starting/completing
- Add notes for progress context
- Search existing logs before creating duplicates

See [./integrations/request-log-workflow.md] for workflow.

## Common Patterns

### Start Work on Logged Item

```bash
# Mark item in-progress
meatycapture log item update DOC.md ITEM-01 --status in-progress

# Execute work...

# Mark complete with note
meatycapture log item update DOC.md ITEM-01 --status done
meatycapture log note add DOC.md ITEM-01 -c "Completed in PR #123"
```

### Phase Execution with Artifact Tracking

```markdown
# 1. Read progress YAML (token-efficient)
head -100 ${progress_file} | sed -n '/^---$/,/^---$/p'

# 2. Delegate batch (parallel Task() calls)
Task("ui-engineer-enhanced", "TASK-1.1: ...")
Task("backend-typescript-architect", "TASK-1.2: ...")

# 3. Update artifact tracking
Task("artifact-tracker", "Update phase 1: Mark TASK-1.1, TASK-1.2 complete")

# 4. Update request-log
meatycapture log item update REQ-*.md REQ-ITEM --status done
```
```

## Command Redesigns

### execute-phase.md (Current: 716 lines → Target: ~60 lines)

```yaml
---
description: Execute phase development with YAML-driven orchestration
allowed-tools: All tools
---
```

```markdown
# Execute Phase

Execute a phase from an implementation plan using YAML-driven orchestration.

## Input

- `$ARGUMENTS`: Phase progress file path (required)

## Execution Mode

Load phase execution guidance: [.claude/skills/dev-execution/modes/phase-execution.md]

## Actions

### Phase 1: Initialize Context

1. Read progress file YAML frontmatter:
   ```bash
   head -100 ${progress_file} | sed -n '/^---$/,/^---$/p'
   ```
2. Identify current batch from `parallelization` field
3. Check dependencies satisfied

### Phase 2: Batch Delegation

1. Load orchestration patterns: [.claude/skills/dev-execution/orchestration/batch-delegation.md]
2. Execute Task() calls in parallel for batch
3. Monitor completion

### Phase 3: Continuous Testing

Run after each significant change:
```bash
pnpm test && pnpm typecheck && pnpm lint
```

### Phase 4: Update Tracking

1. Update artifact tracking:
   ```markdown
   Task("artifact-tracker", "Update [prd] phase N: Mark TASK-X.Y complete")
   ```
2. Update request-log if applicable:
   ```bash
   meatycapture log item update DOC.md ITEM --status done
   ```

### Phase 5: Milestone Validation

Load validation criteria: [.claude/skills/dev-execution/validation/milestone-checks.md]

## Quality Gates

- [ ] All batch tasks complete
- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] Progress artifact updated

## Skill References

- Orchestration: [.claude/skills/dev-execution/orchestration/]
- Validation: [.claude/skills/dev-execution/validation/]
- Artifact integration: [.claude/skills/dev-execution/integrations/artifact-tracking.md]
```

### quick-feature.md (Current: 224 lines → Target: ~40 lines)

```yaml
---
description: Streamlined feature implementation for simple enhancements
allowed-tools: All tools
---
```

```markdown
# Quick Feature

Streamlined implementation for simple, single-session features.

## Input

- `$ARGUMENTS`: REQ-ID, file path, or feature description

## Scope Check

**Use this command when**:
- Single-session implementation
- 1-3 files affected
- No cross-cutting concerns

**Use `/dev:execute-phase` instead when**:
- Multi-phase work
- Requires PRD
- Cross-domain changes

## Execution Mode

Load quick execution guidance: [.claude/skills/dev-execution/modes/quick-execution.md]

## Actions

### 1. Resolve Input

- REQ-ID → Load from request-log
- File path → Read feature description
- Text → Use directly

### 2. Lightweight Plan

Create brief plan (not full progress file):
```markdown
## Affected Files
- {file}: {change}

## Steps
1. {step} → @{agent}
```

### 3. Execute

Delegate to appropriate agents per plan.

### 4. Quality Gates

```bash
pnpm test && pnpm typecheck && pnpm lint
```

### 5. Complete

Update request-log if from REQ-ID:
```bash
meatycapture log item update DOC.md REQ-ID --status done
```

## Skill References

- Quick patterns: [.claude/skills/dev-execution/modes/quick-execution.md]
- Quality gates: [.claude/skills/dev-execution/validation/quality-gates.md]
```

### implement-story.md (Current: 168 lines → Target: ~40 lines)

```yaml
---
description: Execute an existing story implementation plan
allowed-tools: All tools
---
```

```markdown
# Implement Story

Execute an existing user story implementation plan.

## Input

- `$ARGUMENTS`: Story ID or plan file path

## Prerequisite

Story must have existing implementation plan. If no plan exists, use `/dev:complete-user-story` instead.

## Execution Mode

Load story execution guidance: [.claude/skills/dev-execution/modes/story-execution.md]

## Actions

### 1. Load Plan

Find and load story plan file.

### 2. Execute Phases

For each phase in plan:
1. Load phase execution mode
2. Delegate tasks to agents
3. Update progress

### 3. Update Tracking

```bash
meatycapture log item update DOC.md STORY-ID --status done
```

### 4. Validate

Load completion criteria: [.claude/skills/dev-execution/validation/completion-criteria.md]

## Skill References

- Story execution: [.claude/skills/dev-execution/modes/story-execution.md]
- Completion: [.claude/skills/dev-execution/validation/completion-criteria.md]
```

### complete-user-story.md (Current: 375 lines → Target: ~50 lines)

```yaml
---
description: Complete a user story end-to-end with subagent orchestration
allowed-tools: All tools
---
```

```markdown
# Complete User Story

Complete a user story end-to-end, creating plan if needed.

## Input

- `$ARGUMENTS`: Story ID, request-log entry, or description

## Difference from /implement-story

This command creates the plan if missing; `/implement-story` requires existing plan.

## Execution Mode

Load story execution guidance: [.claude/skills/dev-execution/modes/story-execution.md]

## Actions

### 1. Resolve Story

- Story ID → Load from request-log
- Description → Create new story entry

### 2. Check for Plan

If plan exists → proceed to execution.
If no plan → create lightweight implementation plan.

### 3. Mark In-Progress

```bash
meatycapture log item update DOC.md STORY-ID --status in-progress
```

### 4. Execute

Load appropriate execution mode based on complexity:
- Simple → Quick execution mode
- Complex → Phase execution mode with artifact tracking

### 5. Complete

```bash
meatycapture log item update DOC.md STORY-ID --status done
meatycapture log note add DOC.md STORY-ID -c "Completed: {summary}"
```

## Skill References

- Story execution: [.claude/skills/dev-execution/modes/story-execution.md]
- Orchestration: [.claude/skills/dev-execution/orchestration/]
- Request-log workflow: [.claude/skills/dev-execution/integrations/request-log-workflow.md]
```

## Integration Files

### integrations/artifact-tracking.md (~80 lines)

```markdown
# Artifact Tracking Integration

How dev-execution integrates with the artifact-tracking skill.

## When to Use

| Scenario | Use Artifact Tracking |
|----------|----------------------|
| Phase execution | Always |
| Quick feature | No (too lightweight) |
| Story execution | If multi-phase |
| Scaffolding | No |

## Workflow

### Before Execution

1. Check for existing progress file:
   ```
   .claude/progress/[prd]/phase-N-progress.md
   ```

2. If missing, create:
   ```markdown
   Task("artifact-tracker", "Create Phase N progress for [prd]")
   ```

### During Execution

1. Read YAML frontmatter (token-efficient):
   ```bash
   head -100 ${progress_file} | sed -n '/^---$/,/^---$/p'
   ```

2. Identify batch from `parallelization` field

3. After task completion:
   ```markdown
   Task("artifact-tracker", "Update [prd] phase N: Mark TASK-X.Y complete")
   ```

### After Execution

1. Validate phase completion:
   ```markdown
   Task("artifact-validator", "Validate Phase N for [prd]")
   ```

2. Mark phase complete:
   ```markdown
   Task("artifact-tracker", "Update [prd] phase N: Set status to complete")
   ```

## Key Points

- Always use artifact-tracker agent for updates (not manual Edit)
- Read YAML only (~2KB) instead of full file (~25KB)
- Update immediately after task completion
- Validate before marking phase complete

## Reference

Full artifact-tracking skill: [.claude/skills/artifact-tracking/SKILL.md]
```

### integrations/request-log-workflow.md (~60 lines)

```markdown
# Request Log Workflow Integration

How dev-execution integrates with meatycapture-capture for request-log operations.

## When to Use

Always use request-log tracking when:
- Work originates from a REQ-* item
- Implementing logged enhancement/bug/idea
- Want searchable history of work

## Quick Commands

Use `/mc` for simple operations:

| Action | Command |
|--------|---------|
| Search before work | `meatycapture log search "query" PROJECT` |
| Mark in-progress | `meatycapture log item update DOC ITEM --status in-progress` |
| Mark complete | `meatycapture log item update DOC ITEM --status done` |
| Add note | `meatycapture log note add DOC ITEM -c "text"` |

## Workflow

### Starting Work

1. Search for existing item:
   ```bash
   meatycapture log search "feature name" meatycapture
   ```

2. If found, mark in-progress:
   ```bash
   meatycapture log item update REQ-*.md REQ-ITEM --status in-progress
   ```

3. If not found, capture new:
   ```bash
   meatycapture log create --json < input.json
   ```

### During Work

Add progress notes:
```bash
meatycapture log note add REQ-*.md REQ-ITEM -c "Completed backend, starting UI"
```

### Completing Work

1. Mark complete:
   ```bash
   meatycapture log item update REQ-*.md REQ-ITEM --status done
   ```

2. Add completion note:
   ```bash
   meatycapture log note add REQ-*.md REQ-ITEM -c "Completed in PR #123"
   ```

## Reference

Full meatycapture-capture skill: [.claude/skills/meatycapture-capture/SKILL.md]
```

## Token Savings Analysis

| Command | Current Lines | New Lines | Mode Load | Total | Savings |
|---------|---------------|-----------|-----------|-------|---------|
| execute-phase | 716 | 60 | 150 | 210 | **71%** |
| quick-feature | 224 | 40 | 100 | 140 | **38%** |
| implement-story | 168 | 40 | 120 | 160 | **5%** |
| complete-user-story | 375 | 50 | 120 | 170 | **55%** |
| create-feature | 131 | 35 | 80 | 115 | **12%** |

**Average Savings**: ~36% token reduction per invocation

**Additional Benefits**:
- Shared patterns loaded once across commands
- Progressive disclosure (load only needed modes)
- Consistent integration patterns

## Implementation Plan

### Phase 1: Create Skill Structure

1. Create `dev-execution/` directory
2. Write SKILL.md index (~200 lines)
3. Create subdirectory structure

### Phase 2: Extract Mode Content

| File | Source(s) |
|------|-----------|
| `modes/phase-execution.md` | `execute-phase.md` |
| `modes/quick-execution.md` | `quick-feature.md` |
| `modes/story-execution.md` | `implement-story.md` + `complete-user-story.md` |
| `modes/scaffold-execution.md` | `create-feature.md` + `new-feature.md` |

### Phase 3: Create Orchestration Reference

| File | Content |
|------|---------|
| `orchestration/batch-delegation.md` | Task() parallel patterns |
| `orchestration/parallel-patterns.md` | Dependency-aware batching |
| `orchestration/agent-assignments.md` | Agent selection guide |

### Phase 4: Create Validation Reference

| File | Content |
|------|---------|
| `validation/quality-gates.md` | Test, lint, typecheck |
| `validation/milestone-checks.md` | Phase completion criteria |
| `validation/completion-criteria.md` | Story/feature done criteria |

### Phase 5: Create Integration Files

| File | Content |
|------|---------|
| `integrations/artifact-tracking.md` | Integration with artifact-tracking skill |
| `integrations/request-log-workflow.md` | Integration with meatycapture-capture |

### Phase 6: Slim Down Commands

Rewrite each command to:
- Keep only actions and quick reference
- Add explicit skill file references
- Remove all detailed guidance (now in skill)

### Phase 7: Validation

- Test each command loads skill content correctly
- Verify progressive disclosure works
- Measure token usage

## Files to Create

```text
.claude/skills/dev-execution/
├── SKILL.md
├── modes/
│   ├── phase-execution.md
│   ├── quick-execution.md
│   ├── story-execution.md
│   └── scaffold-execution.md
├── orchestration/
│   ├── batch-delegation.md
│   ├── parallel-patterns.md
│   └── agent-assignments.md
├── validation/
│   ├── quality-gates.md
│   ├── milestone-checks.md
│   └── completion-criteria.md
└── integrations/
    ├── artifact-tracking.md
    └── request-log-workflow.md
```

## Files to Modify

```text
.claude/commands/dev/
├── execute-phase.md      (716 → ~60 lines)
├── quick-feature.md      (224 → ~40 lines)
├── implement-story.md    (168 → ~40 lines)
├── complete-user-story.md (375 → ~50 lines)
├── create-feature.md     (131 → ~35 lines)
└── new-feature.md        (16 → keep minimal)
```

## Success Criteria

- [ ] Skill SKILL.md under 250 lines
- [ ] Each mode file under 150 lines
- [ ] Each command under 60 lines
- [ ] All existing functionality preserved
- [ ] Token savings >30% on average
- [ ] Progressive disclosure working
- [ ] Artifact-tracking integration documented
- [ ] Request-log workflow integrated

## Appendix: Current Command Line Counts

| Command | Lines | Purpose |
|---------|-------|---------|
| execute-phase | 716 | Full phase execution |
| complete-user-story | 375 | End-to-end story |
| quick-feature | 224 | Simple features |
| implement-story | 168 | Execute existing plan |
| create-feature | 131 | Scaffold structure |
| new-feature | 16 | MP architecture scaffold |

Total: **1,630 lines** across dev execution commands

Target: **~240 lines** in commands + **~1,000 lines** in skill (loaded progressively)
