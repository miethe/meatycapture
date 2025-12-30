# MeatyCapture Integration Spec

Design specification for integrating the meatycapture-capture skill into project workflows. Use this spec during skill deployment to configure target projects.

---

## Integration Points

| Trigger | Action | Status Update |
|---------|--------|---------------|
| Bug discovered during development | Capture as type:bug | triage |
| Enhancement identified | Capture as type:enhancement | backlog |
| Technical debt noted | Capture as type:task | backlog |
| Work started on logged item | Update status | in-progress |
| Work completed | Update status | done |
| Item won't be fixed | Update status + note reason | wontfix |

---

## CLAUDE.md Integration

Add to project's root CLAUDE.md under appropriate section:

```markdown
## Development Tracking

Use `/meatycapture-capture` skill for structured bug/enhancement/idea tracking:

| When | Action |
|------|--------|
| Bug found | Capture with type:bug, include reproduction steps |
| Enhancement idea | Capture with type:enhancement, include goal |
| TODO needed | Capture instead of code comment (searchable, trackable) |
| Starting logged work | Update item status to in-progress |
| Work complete | Update item status to done |

Search existing logs before creating duplicates: `meatycapture log search "keyword" PROJECT`
```

---

## Command Integration Patterns

### Fix Commands (e.g., `/fix:fix-gh-issue`, `/fix:bugfix-commit`)

**After successful fix**, capture for future reference:

```markdown
## Follow-up (after fix merged)

If the bug warrants tracking for patterns/recurrence:
- Use `/meatycapture-capture` to log the fix
- Include: root cause, solution approach, affected files
- Set status: done
```

### Development Commands (e.g., `/dev:implement-story`, `/dev:new-feature`)

**Before implementation**, check for related logs:

```markdown
## Context Gathering

Search request-logs for related items:
```bash
meatycapture log search "feature-keyword" PROJECT --json
```

Reference existing items when relevant to current work.
```

**After implementation**, update any related items:

```markdown
## Post-Implementation

Update status of any request-log items addressed by this work:
- See `./updating-status.md` for status transition workflow
```

### Planning Commands (e.g., `/plan:plan-feature`, `/plan:spike`)

**During planning**, check existing logs for related items:

```markdown
## Discovery Phase

Query existing request-logs for related bugs/enhancements:
```bash
meatycapture log search "type:bug" PROJECT --json
meatycapture log search "domain:web" PROJECT --json
```

Incorporate relevant items into implementation plan.
```

---

## Skill Cross-References

### artifact-tracking Integration

When using `/artifact-tracking` for phase progress:

```markdown
## Task Sources

Reference request-log items in task definitions:
```yaml
tasks:
  - id: "TASK-1.1"
    source: "REQ-20251229-project-03"  # Link to request-log item
    status: "pending"
```
```

### planning Integration

When using `/planning` skill:

```markdown
## Input Sources

Include request-log search in planning discovery:
- Bugs: `meatycapture log search "type:bug status:backlog" PROJECT`
- Enhancements: `meatycapture log search "type:enhancement" PROJECT`
```

---

## Generic Integration Patterns

For projects without specific commands, add to CLAUDE.md:

```markdown
## Request Log Workflow

### Capture (during development)
When you encounter bugs, enhancements, or ideas:
```bash
# Quick capture
echo '{"project": "PROJECT", "items": [{"title": "...", "type": "bug", "domain": "core", "notes": "Problem: ...\\nGoal: ..."}]}' | meatycapture log create --json
```

### Reference (before implementation)
Before starting work, check for related items:
```bash
meatycapture log search "keyword" PROJECT --json
```

### Update (during/after work)
Update item status as work progresses:
- Edit markdown file directly (see skill docs)
- Change `**Status:** triage` to `**Status:** in-progress` or `done`
```

---

## Init Workflow

When deploying this skill to a new project:

### 1. Configure skill-config.yaml

```bash
# Set project default
cat > .claude/skills/meatycapture-capture/skill-config.yaml << 'EOF'
default_project: "project-slug"
auto_detect: true
auto_create_project: true
default_path_pattern: "~/.meatycapture/{project}"
EOF
```

### 2. Add CLAUDE.md Section

Insert the "Development Tracking" section from above into the project's CLAUDE.md.

### 3. Identify Integration Points

Scan for existing commands/skills that should integrate:

| Pattern | Integration |
|---------|-------------|
| `fix/*` commands | Add post-fix capture guidance |
| `dev/*` commands | Add context search + status update |
| `plan/*` commands | Add discovery search |
| `review/*` commands | Add bug capture for findings |

### 4. Update Relevant Commands

For each identified command, add appropriate integration snippet from patterns above.

---

## Anti-Patterns

| Don't | Instead |
|-------|---------|
| Create TODO comments | Capture to request-log (searchable, trackable) |
| Log every minor fix | Only log patterns worth tracking |
| Duplicate existing items | Search before capture |
| Leave items in triage forever | Review and transition regularly |

---

## Validation

After init, verify integration:

```bash
# Test capture works
echo '{"project": "test", "items": [{"title": "Test", "type": "task"}]}' | meatycapture log create --json

# Test search works
meatycapture log search "Test" test --json

# Test project is configured
cat .claude/skills/meatycapture-capture/skill-config.yaml
```
