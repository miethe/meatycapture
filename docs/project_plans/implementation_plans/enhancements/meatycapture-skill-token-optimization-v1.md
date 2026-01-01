---
title: "Implementation Plan: MeatyCapture Skill Token Optimization"
description: "Reduce skill token overhead by 70%+ through tiered entry points and progressive disclosure"
audience: [ai-agents, developers]
tags: [implementation, skills, token-efficiency, optimization]
created: 2025-12-31
updated: 2025-12-31
category: "enhancements"
status: draft
related:
  - /docs/project_plans/Reports/meatycapture-skill-token-efficiency.md
---

# Implementation Plan: MeatyCapture Skill Token Optimization

**Plan ID**: `IMPL-2025-12-31-SKILL-TOKEN-OPT`
**Date**: 2025-12-31
**Author**: Planning Agent
**Related Documents**:
- **Analysis**: `/docs/project_plans/Reports/meatycapture-skill-token-efficiency.md`
- **Skill**: `.claude/skills/meatycapture-capture/`

**Complexity**: Small
**Total Estimated Effort**: 8 story points
**Phases**: 3

---

## Executive Summary

Reduce meatycapture-capture skill token consumption from ~3,847 tokens to ~800 tokens for simple operations (79% reduction). Implement tiered entry points: slash commands for quick CLI access, optimized skill for complex workflows.

---

## Current State Analysis

| Component | Bytes | Tokens | Issue |
|-----------|------:|-------:|-------|
| SKILL.md | 3,256 | ~815 | Loads for all operations |
| capturing-logs.md | 6,974 | ~1,744 | Loaded even for view/list |
| skill-config.yaml | 1,423 | ~356 | Always loaded |
| **Total per invocation** | **11,653** | **~2,915** | **76% fixed overhead** |

---

## Target State

| Entry Point | Use Case | Tokens | Reduction |
|-------------|----------|-------:|----------:|
| `/mc` slash command | list, view, search | ~150 | 95% |
| Optimized SKILL.md | capture, batch, update | ~400 | 86% |
| Full workflow (on-demand) | complex batch capture | ~1,200 | 59% |

---

## Phase Breakdown

### Phase 1: Create Slash Command (HIGH Priority)

**Duration**: 1 session
**Dependencies**: None
**Assigned Subagent(s)**: ai-artifacts-engineer

| Task ID | Task | Description | Tokens Saved |
|---------|------|-------------|-------------:|
| CMD-001 | Create `/mc` command | Slash command for quick CLI access | ~2,765 |
| CMD-002 | Add command variants | list, view, search, capture shortcuts | - |
| CMD-003 | Test command | Verify token efficiency | - |

**Deliverable**: `.claude/commands/mc.md`

```markdown
---
description: Quick MeatyCapture CLI - list/view/search/capture logs
allowed-tools: [Bash]
---

MeatyCapture quick commands. Default project: meatycapture

## Commands
- List: `meatycapture log list $ARGUMENTS --json`
- View: `meatycapture log view $ARGUMENTS --json`
- Search: `meatycapture log search "$ARGUMENTS" --json`
- Capture: `echo '$ARGUMENTS' | meatycapture log create --json`

Run the appropriate command based on user request.
```

**Phase 1 Quality Gates:**
- [ ] `/mc list` works with <200 tokens
- [ ] `/mc view <path>` works with <200 tokens
- [ ] `/mc search "query"` works with <200 tokens

---

### Phase 2: Optimize SKILL.md (HIGH Priority)

**Duration**: 1 session
**Dependencies**: None (parallel with Phase 1)
**Assigned Subagent(s)**: ai-artifacts-engineer

| Task ID | Task | Description | Tokens Saved |
|---------|------|-------------|-------------:|
| SKILL-001 | Slim SKILL.md | Reduce to command cheatsheet only | ~400 |
| SKILL-002 | Remove inline examples | Reference files instead of embedding | ~200 |
| SKILL-003 | Add action router | Direct to specific workflow files | - |

**Before** (current SKILL.md - 89 lines, ~815 tokens):
- Contains quick reference with code examples
- Lists all supporting files
- Duplicates info from workflow files

**After** (target - 50 lines, ~400 tokens):

```markdown
---
name: meatycapture-capture
description: Capture bugs/enhancements/ideas to request-logs. For quick operations use /mc command instead.
---

# MeatyCapture Skill

Request-log markdown files for development tracking.

## Quick Commands (use `/mc` for simple operations)

| Command | Example |
|---------|---------|
| List | `meatycapture log list PROJECT --json` |
| View | `meatycapture log view PATH --json` |
| Search | `meatycapture log search "query" PROJECT --json` |
| Capture | `meatycapture log create --json < input.json` |

## Workflows (load only when needed)

| Action | When to Load |
|--------|--------------|
| [Capture](./workflows/capturing.md) | Batch capture, validation, templates |
| [View/Search](./workflows/viewing.md) | Advanced filters, output formats |
| [Status Update](./workflows/updating.md) | Change item status |
| [Projects](./workflows/managing.md) | Configure projects, defaults |

## Field Reference

See [./references/field-options.md](./references/field-options.md) for valid values.
```

**Phase 2 Quality Gates:**
- [ ] SKILL.md < 60 lines
- [ ] SKILL.md < 500 tokens
- [ ] All workflows still accessible via links

---

### Phase 3: Restructure Workflow Files (MEDIUM Priority)

**Duration**: 1 session
**Dependencies**: Phase 2 complete
**Assigned Subagent(s)**: ai-artifacts-engineer, documentation-writer

| Task ID | Task | Description | Tokens Saved |
|---------|------|-------------|-------------:|
| WF-001 | Create workflows/ directory | Organize workflow docs | - |
| WF-002 | Move and rename files | Consistent naming | - |
| WF-003 | Slim workflow files | Remove redundant content | ~500 |
| WF-004 | Add validation script | Execute vs load pattern | ~200 |

**New Structure:**

```
.claude/skills/meatycapture-capture/
├── SKILL.md                      # 50 lines (was 89)
├── skill-config.yaml             # Keep as-is
├── workflows/
│   ├── capturing.md              # Renamed from capturing-logs.md
│   ├── viewing.md                # Renamed from viewing-logs.md
│   ├── updating.md               # Renamed from updating-status.md
│   └── managing.md               # Renamed from managing-projects.md
├── references/
│   ├── field-options.md          # Keep as-is
│   ├── json-schemas.md           # Keep as-is
│   └── troubleshooting.md        # Keep as-is
├── templates/
│   ├── quick-capture.json        # Keep as-is
│   └── batch-capture.json        # Keep as-is
└── scripts/
    └── validate-items.ts         # NEW: validation script
```

**Phase 3 Quality Gates:**
- [ ] All workflow files in workflows/ directory
- [ ] No broken links in SKILL.md
- [ ] Validation script executes without loading content

---

## Token Efficiency Comparison

| Scenario | Before | After | Reduction |
|----------|-------:|------:|----------:|
| Simple list | 2,915 | 150 | **95%** |
| Simple view | 2,915 | 150 | **95%** |
| Quick capture | 3,847 | 800 | **79%** |
| Batch capture | 3,847 | 1,200 | **69%** |

---

## Implementation Sequence

```
Phase 1 ──┬── CMD-001: Create /mc command
          ├── CMD-002: Add variants
          └── CMD-003: Test

Phase 2 ──┬── SKILL-001: Slim SKILL.md     ← Can run parallel with Phase 1
          ├── SKILL-002: Remove examples
          └── SKILL-003: Add router

Phase 3 ──┬── WF-001: Create workflows/    ← Depends on Phase 2
          ├── WF-002: Move files
          ├── WF-003: Slim content
          └── WF-004: Add script
```

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Broken skill discovery | High | Test skill description matches use cases |
| Missing workflow links | Medium | Automated link validation |
| User confusion (command vs skill) | Low | Clear description in both entry points |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Simple operation tokens | <200 |
| Skill invocation tokens | <500 |
| Full workflow tokens | <1,500 |
| Overall reduction | >70% |

---

## Post-Implementation

- Update token efficiency report with new measurements
- Document slash command in project README
- Consider similar optimization for other skills

---

**Implementation Plan Version**: 1.0
**Last Updated**: 2025-12-31
