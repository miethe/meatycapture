---
description: Execute an existing story implementation plan
argument-hint: "<story_id>"
allowed-tools: Read, Grep, Glob, Edit, MultiEdit, Write,
  Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(pytest:*),
  Bash(uv:*), Bash(pre-commit:*)
---

# Implement Story

Execute approved implementation plan for story `$ARGUMENTS`.

## Execution Mode

Load story execution guidance: [.claude/skills/dev-execution/modes/story-execution.md]

## Prerequisite

Plan **must exist** at `.claude/plans/${story_id}-plan.md`

If no plan exists, use `/dev:complete-user-story` instead.

## Actions

### 1. Load Plan and Progress

```bash
story_id="${ARGUMENTS%.md}"
plan_file=".claude/plans/${story_id}-plan.md"
progress_file=".claude/progress/${story_id}.md"

# Error if no plan
if [ ! -f "$plan_file" ]; then
  echo "ERROR: No plan found. Run /plan-story ${story_id} first"
fi
```

### 2. Execute Plan Systematically

For each phase/section in plan:
- Identify required expertise
- Delegate to appropriate agents
- Track completion
- Commit after each file

Agent assignments: [.claude/skills/dev-execution/orchestration/agent-assignments.md]

### 3. Continuous Testing

After each component:

```bash
pnpm test && pnpm typecheck && pnpm lint
```

### 4. Update Progress

Track completion in progress file after each task.

### 5. Final Validation

Load completion criteria: [.claude/skills/dev-execution/validation/completion-criteria.md]

### 6. Update Request-Log

```bash
meatycapture log item update DOC ${story_id} --status done
```

## Skill References

- Story execution: [.claude/skills/dev-execution/modes/story-execution.md]
- Orchestration: [.claude/skills/dev-execution/orchestration/]
- Completion criteria: [.claude/skills/dev-execution/validation/completion-criteria.md]
