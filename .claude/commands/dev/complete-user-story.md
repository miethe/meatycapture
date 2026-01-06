---
description: Complete a user story end-to-end with automatic subagent orchestration
argument-hint: [<story_id>] | [<attached_user_story.md>]
allowed-tools: Read, Grep, Glob, Edit, MultiEdit, Write,
  Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(pytest:*),
  Bash(uv:*), Bash(pre-commit:*)
---

# Complete User Story

Complete story `$ARGUMENTS` end-to-end, creating plan if needed.

## Execution Mode

Load story execution guidance: [.claude/skills/dev-execution/modes/story-execution.md]

## Difference from /implement-story

This command **creates the plan if missing**; `/dev:implement-story` requires existing plan.

## Actions

### 1. Resolve Story

Extract `${story_id}` from `$ARGUMENTS` (strip `.md` if present).

Search for story in:
- Request-log files (`REQ-*-${story_id}`)
- Story files (`.claude/stories/`)

### 2. Check for Plan

If plan exists at `.claude/plans/${story_id}-plan.md` → proceed to execution.

If no plan → create lightweight implementation plan.

### 3. Mark In-Progress

```bash
meatycapture log item update DOC ${story_id} --status in-progress
```

### 4. Execute

Load execution mode based on complexity:
- Simple → [.claude/skills/dev-execution/modes/quick-execution.md]
- Complex → [.claude/skills/dev-execution/modes/phase-execution.md]

Delegate to agents per [.claude/skills/dev-execution/orchestration/agent-assignments.md]

### 5. Quality Gates

```bash
pnpm test && pnpm typecheck && pnpm lint
```

### 6. Complete

```bash
meatycapture log item update DOC ${story_id} --status done
meatycapture log note add DOC ${story_id} -c "Completed: {summary}"
```

### 7. Create PR

Push and create draft PR with comprehensive description.

## Skill References

- Story execution: [.claude/skills/dev-execution/modes/story-execution.md]
- Agent assignments: [.claude/skills/dev-execution/orchestration/agent-assignments.md]
- Completion criteria: [.claude/skills/dev-execution/validation/completion-criteria.md]
- Request-log: [.claude/skills/dev-execution/integrations/request-log-workflow.md]
