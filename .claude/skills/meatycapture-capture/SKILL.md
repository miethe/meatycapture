---
name: meatycapture-capture
description: Use this skill when capturing bugs, enhancements, ideas, or feature requests during development. Invoke when logging technical debt, documenting findings, creating request-log entries, or tracking issues discovered during code review, testing, or implementation. Integrates with MeatyCapture CLI for markdown-based item tracking. Examples - capturing bugs found during debugging, logging enhancement ideas during feature work, documenting technical debt during refactoring.
---

# MeatyCapture - AI Agent Capture Skill

Enable AI agents to programmatically capture bugs, enhancements, ideas, and technical debt to request-log markdown files during development workflows. This skill integrates with the MeatyCapture CLI to create structured, searchable project documentation without interrupting development flow.

## When to Use This Skill

- **Bug Discovery**: Capture bugs found during code review, testing, or debugging
- **Enhancement Ideas**: Log feature requests or improvements while implementing related work
- **Technical Debt**: Document refactoring needs, code smells, or architectural issues
- **Research Findings**: Record investigation results, API limitations, or integration gotchas
- **Multiple Related Items**: Batch capture several findings from a single work session
- **Work Documentation**: Create request-log entries for tracking and future reference

## When NOT to Use This Skill

- Creating general documentation (use documentation agents)
- Writing code comments (inline comments are better)
- Project planning (use PRD/design-spec workflows)
- Immediate fixes (fix and document separately if needed)

## Quick Start

### Quick Capture (Most Common)

Single item capture during development:

```bash
# Inline JSON via stdin
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Add validation for empty tags array",
    "type": "bug",
    "domain": "core",
    "context": "serializer",
    "priority": "medium",
    "status": "triage",
    "tags": ["validation", "serializer"],
    "notes": "Problem: Empty tags array in item metadata causes serializer to write invalid frontmatter. Goal: Add validation to reject or clean empty arrays before write."
  }]
}' | meatycapture log create --json
```

### Batch Capture

Multiple related items:

```bash
# From JSON file
cat > /tmp/findings.json <<'EOF'
{
  "project": "meatycapture",
  "items": [
    {
      "title": "Improve error messages in DocStore",
      "type": "enhancement",
      "domain": "core",
      "priority": "low",
      "tags": ["dx", "error-handling"]
    },
    {
      "title": "Add unit tests for tag aggregation",
      "type": "task",
      "domain": "core",
      "priority": "high",
      "tags": ["testing", "tags"]
    }
  ]
}
EOF

meatycapture log create /tmp/findings.json --json
```

### Append to Existing Document

```bash
# Append to today's request-log
meatycapture log append ~/.meatycapture/meatycapture/REQ-20251229-meatycapture.md - <<'EOF'
{
  "items": [{
    "title": "Performance optimization for large documents",
    "type": "enhancement",
    "domain": "core",
    "priority": "medium",
    "tags": ["performance"]
  }]
}
EOF
```

## Core Workflows

### 1. Quick Capture During Development

**Scenario**: You discover a bug while working on a feature.

**Steps**:

1. **Identify the issue** - Note title, type, affected domain
2. **Determine project** - Auto-detect from `cwd` or CLAUDE.md context
3. **Create JSON** - Use minimal required fields (title, type, domain)
4. **Capture via stdin** - Pipe JSON to `meatycapture log create --json`
5. **Parse response** - Extract `doc_id` and `item_id` from JSON output

**Example**:

```bash
# Bug found during feature work
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Race condition in concurrent doc writes",
    "type": "bug",
    "domain": "core",
    "context": "file-io",
    "priority": "high",
    "status": "triage",
    "tags": ["concurrency", "file-io", "critical-path"],
    "notes": "Problem: Two agents writing to same doc simultaneously causes corruption. Goal: Implement file locking or atomic write strategy."
  }]
}' | meatycapture log create --json

# Expected output:
# {
#   "success": true,
#   "doc_id": "REQ-20251229-meatycapture",
#   "doc_path": "~/.meatycapture/meatycapture/REQ-20251229-meatycapture.md",
#   "items_created": [
#     {
#       "item_id": "REQ-20251229-meatycapture-01",
#       "title": "Race condition in concurrent doc writes"
#     }
#   ]
# }
```

### 2. Batch Capture Related Items

**Scenario**: Code review reveals multiple issues in the same module.

**Steps**:

1. **Collect findings** - List all issues discovered
2. **Group by project** - All items must belong to same project
3. **Create items array** - Each item with appropriate type/priority
4. **Submit batch** - Single `create` call with multiple items
5. **Reference doc** - Save `doc_id` for future appends

**Example**:

```bash
# Multiple findings from security audit
cat > /tmp/security-findings.json <<'EOF'
{
  "project": "meatycapture",
  "title": "Security Audit Findings - 2025-12-29",
  "items": [
    {
      "title": "Sanitize user input in project names",
      "type": "bug",
      "domain": "core",
      "context": "validation",
      "priority": "critical",
      "status": "triage",
      "tags": ["security", "input-validation", "injection"],
      "notes": "Problem: Project names not sanitized, allowing path traversal. Goal: Add strict validation regex and sanitization."
    },
    {
      "title": "Add file permission checks before write",
      "type": "enhancement",
      "domain": "adapters",
      "context": "fs-local",
      "priority": "high",
      "status": "backlog",
      "tags": ["security", "file-io", "permissions"],
      "notes": "Goal: Verify write permissions before attempting file operations to prevent privilege escalation."
    },
    {
      "title": "Document security best practices",
      "type": "task",
      "domain": "docs",
      "priority": "medium",
      "status": "backlog",
      "tags": ["security", "documentation"],
      "notes": "Goal: Create security.md with input validation, file handling, and configuration security guidelines."
    }
  ]
}
EOF

meatycapture log create /tmp/security-findings.json --json
```

### 3. Search Before Capture

**Scenario**: Avoid duplicate items by checking existing request-logs.

**Steps**:

1. **Search existing docs** - Use keywords from potential item
2. **Review matches** - Check if issue already captured
3. **Decision**:
   - If exists: Reference existing item_id
   - If new: Capture new item
   - If related: Append to existing doc

**Example**:

```bash
# Search for existing tag-related items
meatycapture log search "tag aggregation" --json

# Response shows existing item
# {
#   "matches": [{
#     "doc_id": "REQ-20251228-meatycapture",
#     "item_id": "REQ-20251228-meatycapture-03",
#     "title": "Tag aggregation edge cases",
#     "status": "in-progress"
#   }]
# }

# Decide: Append related finding to existing doc
DOC_PATH=$(meatycapture log list meatycapture --json | jq -r '.docs[] | select(.doc_id=="REQ-20251228-meatycapture") | .path')

echo '{
  "items": [{
    "title": "Tag aggregation fails on Unicode tags",
    "type": "bug",
    "domain": "core",
    "priority": "medium",
    "tags": ["tags", "unicode", "edge-case"],
    "notes": "Related to REQ-20251228-meatycapture-03. Problem: Unicode tags not sorted correctly. Goal: Use locale-aware sort."
  }]
}' | meatycapture log append "$DOC_PATH" --json
```

### 4. Project Auto-Detection

**Scenario**: Determine project context automatically during agent workflows.

**Strategies**:

```bash
# Strategy 1: Read CLAUDE.md for project name
PROJECT=$(grep -m1 "^# " /Users/miethe/dev/homelab/development/meatycapture/CLAUDE.md | sed 's/^# //' | tr '[:upper:]' '[:lower:]')

# Strategy 2: Use directory name as fallback
PROJECT=$(basename $(pwd))

# Strategy 3: Check git remote origin
PROJECT=$(git remote get-url origin 2>/dev/null | sed -E 's|.*/(.+)\.git$|\1|')

# Strategy 4: Use explicit MEATYCAPTURE_PROJECT env var
PROJECT=${MEATYCAPTURE_PROJECT:-meatycapture}

# Use detected project in capture
echo "{
  \"project\": \"$PROJECT\",
  \"items\": [{
    \"title\": \"Auto-detected capture\",
    \"type\": \"idea\",
    \"domain\": \"cli\"
  }]
}" | meatycapture log create --json
```

## Field Reference (Quick)

| Field | Required | Valid Values | Default |
|-------|----------|--------------|---------|
| `project` | Yes | Project slug | - |
| `title` | Yes | String (max 200 chars) | - |
| `type` | Yes | enhancement, bug, idea, task, question | - |
| `domain` | Yes | web, api, cli, core, mobile, docs, etc. | - |
| `context` | No | String (module/component) | - |
| `priority` | No | low, medium, high, critical | medium |
| `status` | No | triage, backlog, planned, in-progress, done, wontfix | triage |
| `tags` | No | Array of strings | [] |
| `notes` | No | Markdown text (problem/goal format preferred) | - |

See `./references/field-options.md` for full field catalog and project-specific options.

## Examples

### Bug Found During Code Review

```bash
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Serializer crashes on null item fields",
    "type": "bug",
    "domain": "core",
    "priority": "high",
    "tags": ["serializer", "null-handling"],
    "notes": "Problem: RequestLogSerializer.write() throws TypeError when item.context is null. Goal: Add null-safe property access."
  }]
}' | meatycapture log create --json
```

### Enhancement Idea

```bash
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Add keyboard shortcuts for wizard navigation",
    "type": "enhancement",
    "domain": "web",
    "priority": "low",
    "tags": ["ux", "accessibility"],
    "notes": "Goal: Ctrl+Enter to submit, Escape to cancel. Improves accessibility."
  }]
}' | meatycapture log create --json
```

### Batch Related Findings

```bash
cat > /tmp/findings.json <<'EOF'
{
  "project": "meatycapture",
  "title": "Performance Profiling - Tag Aggregation",
  "items": [
    {"title": "Optimize tag deduplication", "type": "enhancement", "domain": "core", "tags": ["performance"]},
    {"title": "Cache aggregated tags", "type": "idea", "domain": "core", "tags": ["caching"]},
    {"title": "Add performance benchmarks", "type": "task", "domain": "core", "tags": ["testing"]}
  ]
}
EOF
meatycapture log create /tmp/findings.json --json
```

## CLI Reference (Quick)

| Command | Purpose | Output |
|---------|---------|--------|
| `meatycapture log create [input.json] --json` | Create new request-log doc | doc_id, doc_path, items_created |
| `meatycapture log append <path> [items.json] --json` | Append items to existing doc | doc_id, items_appended |
| `meatycapture log list [project] --json` | List request-log documents | Array of doc metadata |
| `meatycapture log search "query" --json` | Search across documents | Matching items with context |
| `meatycapture log view <path> --json` | View document details | Full doc with items |

**Stdin Support**: All commands accept `-` or omitted file argument to read from stdin.

**Exit Codes**:
- `0`: Success
- `1`: Invalid input (JSON parse error, validation failure)
- `2`: File I/O error (path not writable, doc not found)
- `3`: Command error (unknown command, missing args)

## Best Practices

### 1. Use Problem/Goal Format in Notes

**Good**:
```
Problem: Validation logic duplicated across 3 components.
Goal: Extract to shared validator utility with unit tests.
```

**Poor**:
```
Need to fix validation stuff.
```

### 2. Tag Consistently

- Use lowercase, hyphenated tags: `error-handling`, `input-validation`
- Include domain tags: `core`, `web`, `cli`
- Add context tags: `security`, `performance`, `ux`
- Reference related areas: `testing`, `documentation`

### 3. Set Appropriate Priority

- **critical**: Security vulnerabilities, data corruption, crashes
- **high**: User-facing bugs, broken features
- **medium**: Enhancements, minor bugs, technical debt
- **low**: Nice-to-haves, polish, future ideas

### 4. Batch Related Items

If you discover 3+ related issues, create a single titled document rather than 3 separate docs:

```json
{
  "title": "API Error Handling Audit - 2025-12-29",
  "items": [...]
}
```

### 5. Search Before Creating

Avoid duplicate items by searching first:

```bash
meatycapture log search "validation" --json | jq '.matches[] | .item_id, .title'
```

### 6. Reference Related Items

When capturing related work, cross-reference existing item IDs in notes:

```
Related to REQ-20251228-meatycapture-05. Extends tag validation to support Unicode.
```

### 7. Use JSON Output Mode

Always use `--json` flag for machine-readable output:

```bash
# Parse programmatically
RESULT=$(echo "$JSON_INPUT" | meatycapture log create --json)
DOC_ID=$(echo "$RESULT" | jq -r '.doc_id')
```

## Troubleshooting

Common issues and quick solutions. See `./references/troubleshooting.md` for detailed examples.

| Issue | Quick Fix |
|-------|----------|
| JSON parse error | Validate with `jq`: `echo "$JSON" \| jq .` |
| Project not found | List projects: `meatycapture projects list --json` |
| Path not writable | Check permissions: `stat ~/.meatycapture/` |
| Doc not found | Use `create` instead of `append` |
| Empty response | Verify `--json` flag, check `$?` exit code |

**Exit Codes**: 0=success, 1=validation error, 2=file I/O error, 3=command error

## Supporting Files

- `./references/field-options.md` - Complete field catalog with valid values
- `./references/json-schemas.md` - Full JSON schema definitions
- `./references/troubleshooting.md` - Detailed troubleshooting guide
- `./templates/quick-capture.json` - Single item template
- `./templates/batch-capture.json` - Multi-item template

---

**Skill Version**: 1.0.0
**Last Updated**: 2025-12-29
**Maintainer**: MeatyCapture Team
