---
description: Scaffold new feature with boilerplate code, tests, and documentation
allowed-tools: Read, Write, Edit, Bash
argument-hint: [feature-name] | [feature-type] [name]
---

# Create Feature

Scaffold new feature: `$ARGUMENTS`

## Execution Mode

Load scaffold execution guidance: [.claude/skills/dev-execution/modes/scaffold-execution.md]

## Actions

### 1. Feature Planning

- Define requirements and acceptance criteria
- Break down into smaller tasks
- Identify affected components
- Plan API/interface design

### 2. Pattern Discovery

Delegate to **codebase-explorer**: Study existing patterns and conventions.

### 3. Environment Setup

```bash
git checkout -b feature/${ARGUMENTS}
```

### 4. Implementation Sequence

Follow MP architecture sequence:

```
schema → DTO → repo → service → API → UI → tests
```

### 5. Wire Infrastructure

- Add telemetry spans (`{route}.{operation}`)
- Add structured JSON logs
- Update OpenAPI docs

### 6. Quality Gates

```bash
pnpm test && pnpm typecheck && pnpm lint
```

### 7. Commit

```bash
git add .
git commit -m "feat(${feature}): scaffold ${feature} following MP architecture"
```

## Skill References

- Scaffold execution: [.claude/skills/dev-execution/modes/scaffold-execution.md]
- Agent assignments: [.claude/skills/dev-execution/orchestration/agent-assignments.md]
- Quality gates: [.claude/skills/dev-execution/validation/quality-gates.md]
