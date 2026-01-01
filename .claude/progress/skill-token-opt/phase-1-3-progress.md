---
prd: skill-token-optimization
phase: 1-3
status: in_progress
completion: 0%
started_at: 2025-12-31T00:00:00Z
tasks:
  - id: CMD-001
    title: Create /mc command
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: []
    estimated_time: 30m
  - id: CMD-002
    title: Add command variants
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [CMD-001]
    estimated_time: 15m
  - id: CMD-003
    title: Test command
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [CMD-002]
    estimated_time: 15m
  - id: SKILL-001
    title: Slim SKILL.md
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: []
    estimated_time: 30m
  - id: SKILL-002
    title: Remove inline examples
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [SKILL-001]
    estimated_time: 15m
  - id: SKILL-003
    title: Add action router
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [SKILL-002]
    estimated_time: 15m
  - id: WF-001
    title: Create workflows/ directory
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [SKILL-003]
    estimated_time: 10m
  - id: WF-002
    title: Move and rename files
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [WF-001]
    estimated_time: 20m
  - id: WF-003
    title: Slim workflow files
    status: pending
    assigned_to: [documentation-writer]
    dependencies: [WF-002]
    estimated_time: 30m
  - id: WF-004
    title: Add validation script
    status: pending
    assigned_to: [ai-artifacts-engineer]
    dependencies: [WF-002]
    estimated_time: 20m
parallelization:
  batch_1: [CMD-001, SKILL-001]
  batch_2: [CMD-002, SKILL-002]
  batch_3: [CMD-003, SKILL-003]
  batch_4: [WF-001]
  batch_5: [WF-002]
  batch_6: [WF-003, WF-004]
  critical_path: [SKILL-001, SKILL-002, SKILL-003, WF-001, WF-002]
---

# Phase 1-3 Progress: Skill Token Optimization

## Objective
Reduce meatycapture-capture skill token consumption from ~3,847 tokens to ~800 tokens for simple operations (79% reduction).

## Work Log

### 2025-12-31
- Progress tracking initialized
- Beginning Phase 1-3 execution

## Quality Gates

### Phase 1 (Slash Command)
- [ ] `/mc list` works with <200 tokens
- [ ] `/mc view <path>` works with <200 tokens
- [ ] `/mc search "query"` works with <200 tokens

### Phase 2 (SKILL.md Optimization)
- [ ] SKILL.md < 60 lines
- [ ] SKILL.md < 500 tokens
- [ ] All workflows still accessible via links

### Phase 3 (Workflow Restructure)
- [ ] All workflow files in workflows/ directory
- [ ] No broken links in SKILL.md
- [ ] Validation script executes without loading content

## Files Changed
- TBD

## Blockers
- None
