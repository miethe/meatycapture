# MeatyCapture Capture Skill

AI agent skill for programmatically capturing bugs, enhancements, ideas, and technical debt to request-log markdown files during development workflows.

## Quick Start

```bash
# Capture a bug found during development
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Fix validation bug",
    "type": "bug",
    "domain": "core",
    "tags": ["validation"]
  }]
}' | meatycapture log create --json
```

## When to Use

- Capturing bugs found during code review, testing, or debugging
- Logging enhancement ideas while implementing related features
- Documenting technical debt during refactoring
- Recording investigation findings or API limitations
- Batch capturing multiple related items from a work session

## Files

| File | Purpose | Lines |
|------|---------|-------|
| **SKILL.md** | Main skill instructions | 451 |
| **references/field-options.md** | Valid field values catalog | 438 |
| **references/json-schemas.md** | JSON schema definitions | 908 |
| **references/troubleshooting.md** | Detailed troubleshooting | 413 |
| **templates/quick-capture.json** | Single item template | - |
| **templates/batch-capture.json** | Multi-item template | - |

## Core Workflows

1. **Quick Capture** - Single item during development (most common)
2. **Batch Capture** - Multiple related items at once
3. **Append to Existing** - Add items to existing request-log
4. **Search & Reference** - Find existing items before duplicating

## CLI Commands

```bash
# Create new request-log
meatycapture log create input.json --json

# Append to existing
meatycapture log append doc-path items.json --json

# Search documents
meatycapture log search "query" --json

# List documents
meatycapture log list [project] --json
```

## Field Reference

| Field | Required | Example Values |
|-------|----------|----------------|
| project | Yes | `meatycapture` |
| title | Yes | `Fix validation bug` |
| type | Yes | `bug`, `enhancement`, `idea`, `task`, `question` |
| domain | Yes | `core`, `web`, `api`, `cli` |
| priority | No | `low`, `medium`, `high`, `critical` |
| status | No | `triage`, `backlog`, `planned`, `in-progress`, `done` |
| tags | No | `["validation", "security"]` |
| notes | No | Problem/goal markdown |

See `references/field-options.md` for complete catalog.

## Examples

### Bug Discovery

```bash
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Serializer crashes on null fields",
    "type": "bug",
    "domain": "core",
    "priority": "high",
    "tags": ["serializer", "null-handling"],
    "notes": "Problem: TypeError when item.context is null. Goal: Add null checks."
  }]
}' | meatycapture log create --json
```

### Enhancement Idea

```bash
echo '{
  "project": "meatycapture",
  "items": [{
    "title": "Add keyboard shortcuts",
    "type": "enhancement",
    "domain": "web",
    "priority": "low",
    "tags": ["ux", "accessibility"]
  }]
}' | meatycapture log create --json
```

### Batch Findings

```bash
cat templates/batch-capture.json | \
  jq '.items[0].title = "First finding" | .items[1].title = "Second finding"' | \
  meatycapture log create --json
```

## Templates

Use ready-made templates as starting points:

```bash
# Copy and customize quick capture template
cp templates/quick-capture.json /tmp/my-capture.json
# Edit /tmp/my-capture.json
meatycapture log create /tmp/my-capture.json --json
```

## Token Optimization

- Use minimal JSON with only required fields
- Pipe JSON via stdin instead of temp files
- Parse responses with `jq` for needed fields only
- Batch multiple items in single `create` call
- Reference templates instead of recreating structure

## Troubleshooting

| Issue | Quick Fix |
|-------|----------|
| JSON parse error | Validate: `echo "$JSON" \| jq .` |
| Project not found | List: `meatycapture projects list --json` |
| Path not writable | Check: `stat ~/.meatycapture/` |
| Doc not found | Use `create` instead of `append` |

See `references/troubleshooting.md` for detailed solutions.

## Exit Codes

- `0` - Success
- `1` - Validation error (invalid JSON, bad field values)
- `2` - File I/O error (path issues, permissions)
- `3` - Command error (syntax, missing args)

## Skill Metadata

- **Name**: meatycapture-capture
- **Version**: 1.0.0
- **Type**: CLI integration skill
- **Created**: 2025-12-29
- **Token Optimized**: Yes (451 lines main file)
- **Progressive Disclosure**: Yes (references + templates)

## Learn More

Start with `SKILL.md` for complete instructions and workflows.
