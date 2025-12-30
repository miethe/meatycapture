---
name: meatycapture-capture
description: Use this skill when working with MeatyCapture request-logs for development tracking. Invoke for capturing bugs/enhancements/ideas, viewing existing logs, searching past fixes, managing project configurations, or referencing structured development history. Integrates with MeatyCapture CLI for markdown-based item tracking across projects.
---

# MeatyCapture Skill

Work with request-log markdown files for development tracking. This skill provides full MeatyCapture CLI integration for AI agents.

## Actions

| Action | Use Case | Reference |
|--------|----------|-----------|
| **Capture** | Log bugs, enhancements, ideas, technical debt | `./capturing-logs.md` |
| **View** | Read existing logs, review past items | `./viewing-logs.md` |
| **Search** | Find items by keyword, type, tag, status | `./viewing-logs.md` |
| **Update Status** | Change item status (triage->done) | `./updating-status.md` |
| **Project** | Configure projects, set defaults | `./managing-projects.md` |

## Quick Reference

### Capture (Most Common)

```bash
echo '{"project": "PROJECT_NAME", "items": [{"title": "...", "type": "bug", "domain": "core"}]}' | meatycapture log create --json
```

See `./capturing-logs.md` for full capture workflows.

### View & Search

```bash
meatycapture log list PROJECT_NAME --json           # List all docs
meatycapture log view <doc-path> --json             # View document
meatycapture log search "query" PROJECT_NAME --json # Search items
```

See `./viewing-logs.md` for search patterns and filtering.

### Project Setup

```bash
meatycapture project list --json                    # List projects
meatycapture project add "name" "/path" --json      # Add project
meatycapture project set-default PROJECT_ID         # Set default
```

See `./managing-projects.md` for project configuration.

## Skill Configuration

Check `./skill-config.yaml` for default project settings. On first use:

1. If `default_project` is set, use it for all commands
2. If unset, auto-detect from cwd/git/CLAUDE.md context
3. If no matching project exists, prompt to create one

See `./managing-projects.md` for project auto-detection strategies.

## CLI Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation error (invalid JSON, missing fields) |
| `2` | File I/O error (path not writable, doc not found) |
| `3` | Command error (unknown command, missing args) |

## Supporting Files

| File | Purpose |
|------|---------|
| `./capturing-logs.md` | Capture workflows, batch capture, append |
| `./viewing-logs.md` | View, search, filter patterns |
| `./updating-status.md` | Status update workflow, valid values |
| `./managing-projects.md` | Project setup, defaults, auto-detection |
| `./skill-config.yaml` | Default project configuration |
| `./references/field-options.md` | Valid field values for items |
| `./references/json-schemas.md` | JSON input schemas |
| `./references/troubleshooting.md` | Error handling guide |
| `./templates/quick-capture.json` | Single item template |
| `./templates/batch-capture.json` | Multi-item template |
| `./integration-spec.md` | Integration patterns for project workflows |

---

**Skill Version**: 2.1.0
**Last Updated**: 2025-12-30
