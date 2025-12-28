---
title: MeatyCapture Log Commands Reference
description: Complete command reference for meatycapture log subcommands with all flags and options
audience: developers
tags: [cli, commands, reference, log-management]
created: 2025-12-27
updated: 2025-12-27
category: CLI Reference
status: complete
---

# MeatyCapture Log Commands Reference

Complete reference for all `meatycapture log` subcommands with full signatures, flags, options, and examples.

## Overview

The `log` command group manages request-log documents. It includes six subcommands for creating, viewing, searching, and managing documents.

```bash
meatycapture log <subcommand> [options]
```

## Common Options

All log commands support these options:

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (machine-readable) |
| `--yaml` | Output as YAML format |
| `--csv` | Output as CSV (where applicable) |
| `--table` | Output as ASCII table (list/search only) |
| `-q, --quiet` | Suppress all output except errors |
| `-h, --help` | Show command help text |

## log create

Create a new request-log document from JSON input.

### Signature

```bash
meatycapture log create <json-file> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `json-file` | string | Path to JSON input file, or `-` for stdin |

### Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--json` | | | | Output created document as JSON |
| `--yaml` | | | | Output created document as YAML |
| `--quiet` | `-q` | | | Suppress non-error output |
| `--no-backup` | | | | Skip backup file creation |
| `--output` | `-o` | string | auto-generated | Explicit output file path |

### Input Format

```json
{
  "project": "my-project",
  "title": "Optional document title",
  "items": [
    {
      "title": "Item title",
      "type": "enhancement|bug|idea",
      "domain": "web|api|mobile|other",
      "context": "Additional context",
      "priority": "low|medium|high|critical",
      "status": "triage|backlog|in-progress|completed|blocked",
      "tags": ["tag1", "tag2"],
      "notes": "Problem/goal description"
    }
  ]
}
```

### Examples

**Create from file:**
```bash
meatycapture log create input.json
```

**Create with explicit output path:**
```bash
meatycapture log create input.json -o ./docs/requests.md
```

**Create from stdin (pipe JSON):**
```bash
cat input.json | meatycapture log create -
```

**Create and output as JSON:**
```bash
meatycapture log create input.json --json
```

**Create quietly (CI/CD integration):**
```bash
meatycapture log create input.json --quiet
echo $?  # Check exit code
```

### Output

**Default (human-readable):**
```
✓ Created document: /path/to/REQ-20251227-my-project.md
  Doc ID: REQ-20251227-my-project
  Items: 2
  Tags: tag1, tag2, bug
  Backup: /path/to/REQ-20251227-my-project.md.bak
```

**With --json flag:**
```json
{
  "doc_id": "REQ-20251227-my-project",
  "title": "Request Log - my-project",
  "project_id": "my-project",
  "item_count": 2,
  "tags": ["bug", "tag1", "tag2"],
  "created_at": "2025-12-27T15:30:45.123Z",
  "updated_at": "2025-12-27T15:30:45.123Z",
  "items": [...]
}
```

### Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| `0` | Success | Document created |
| `1` | Validation error | Invalid JSON, missing project field |
| `2` | I/O error | Path not writable, file access denied |
| `3` | Resource error | Project not found in catalog |
| `64` | CLI error | Invalid flag combination |

### Common Errors

**Invalid JSON structure:**
```
Error: Invalid JSON structure. Expected format:
{
  "project": "project-slug",
  "items": [...]
}
```

**Missing project:**
```
Error: Validation error: project field is required
```

**Path not writable:**
```
Error: Failed to write document: Permission denied
```

---

## log append

Append items to an existing request-log document.

### Signature

```bash
meatycapture log append <doc-path> <json-file> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `doc-path` | string | Path to existing request-log document |
| `json-file` | string | Path to JSON input file, or `-` for stdin |

### Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--json` | | | | Output updated document as JSON |
| `--yaml` | | | | Output updated document as YAML |
| `--quiet` | `-q` | | | Suppress non-error output |
| `--no-backup` | | | | Skip backup file creation |

### Input Format

Same as `log create`, but `title` field is optional and ignored:

```json
{
  "project": "my-project",
  "items": [
    {
      "title": "New item",
      "type": "enhancement",
      "domain": "web",
      "context": "Context",
      "priority": "medium",
      "status": "triage",
      "tags": ["tag"],
      "notes": "Description"
    }
  ]
}
```

### Examples

**Append items to existing document:**
```bash
meatycapture log append ./docs/REQ-20251227-my-project.md items.json
```

**Append from stdin:**
```bash
jq '.items | {project: "my-project", items: .}' data.json | meatycapture log append ./docs/requests.md -
```

**Append and output as JSON:**
```bash
meatycapture log append ./docs/requests.md items.json --json
```

**Batch append (multiple files):**
```bash
for file in items-*.json; do
  meatycapture log append ./docs/requests.md "$file" --quiet
done
```

### Output

**Default (human-readable):**
```
✓ Appended 2 item(s) to: /path/to/REQ-20251227-my-project.md
  Doc ID: REQ-20251227-my-project
  New Item IDs: REQ-20251227-my-project-03, REQ-20251227-my-project-04
  Total Items: 4
  Tags: api, bug, tag1, tag2
  Backup: /path/to/REQ-20251227-my-project.md.bak
```

### Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| `0` | Success | Items appended |
| `1` | Validation error | Invalid JSON format |
| `2` | I/O error | Document not found, not writable |
| `3` | Parse error | Document corrupted, can't parse |
| `64` | CLI error | Invalid flag combination |

### Features

- Automatically generates sequential item IDs
- Merges tags from all items (unique, sorted)
- Updates item count and metadata
- Creates backup before modification
- Validates project consistency

---

## log list

List request-log documents for a project or directory.

### Signature

```bash
meatycapture log list [project] [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `project` | string (optional) | Project slug to filter by |

### Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--path` | `-p` | string | `~/.meatycapture/docs` | Custom search path |
| `--json` | | | | Output as JSON array |
| `--csv` | | | | Output as CSV |
| `--yaml` | | | | Output as YAML |
| `--table` | | | | Output as ASCII table (default) |
| `--sort` | `-s` | string | `date` | Sort by: name, date, items |
| `--limit` | `-l` | number | unlimited | Maximum results to show |
| `--quiet` | `-q` | | | Suppress non-error output |

### Examples

**List all documents (default path):**
```bash
meatycapture log list
```

**List documents for specific project:**
```bash
meatycapture log list my-project
```

**List with custom search path:**
```bash
meatycapture log list --path /data/requests
```

**List sorted by item count (descending):**
```bash
meatycapture log list --sort items
```

**List as JSON (for parsing):**
```bash
meatycapture log list my-project --json
```

**List top 5 most recent documents:**
```bash
meatycapture log list --sort date --limit 5
```

**List as CSV (export):**
```bash
meatycapture log list --csv > documents.csv
```

**List all projects with counts:**
```bash
meatycapture log list --json | jq 'group_by(.project_id) | map({project: .[0].project_id, count: length})'
```

### Output Formats

**Default (human-readable table):**
```
Found 3 document(s) in: /Users/user/.meatycapture/docs

REQ-20251227-my-project
  Title: My Project Request Log
  Path: /Users/user/.meatycapture/docs/REQ-20251227-my-project.md
  Items: 4
  Tags: api, bug, tag1, tag2
  Updated: 2025-12-27T15:30:45Z

REQ-20251226-my-project
  Title: Earlier Request Log
  Path: /Users/user/.meatycapture/docs/REQ-20251226-my-project.md
  Items: 2
  Tags: enhancement, ux
  Updated: 2025-12-26T10:15:22Z
```

**JSON format:**
```json
[
  {
    "doc_id": "REQ-20251227-my-project",
    "path": "/Users/user/.meatycapture/docs/REQ-20251227-my-project.md",
    "title": "My Project Request Log",
    "project_id": "my-project",
    "item_count": 4,
    "tags": ["api", "bug", "tag1", "tag2"],
    "updated_at": "2025-12-27T15:30:45Z"
  }
]
```

**CSV format:**
```
path,doc_id,title,project_id,item_count,updated_at
"/Users/user/.meatycapture/docs/REQ-20251227-my-project.md",REQ-20251227-my-project,"My Project Request Log",my-project,4,2025-12-27T15:30:45Z
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (even if no documents found) |
| `1` | Path error (invalid project) |
| `2` | Directory not accessible |

### Sorting Options

- `date`: By updated_at (newest first)
- `name`: By doc_id alphabetically
- `items`: By item count (descending)

---

## log view

Display complete contents of a request-log document.

### Signature

```bash
meatycapture log view <doc-path> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `doc-path` | string | Path to request-log document |

### Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--json` | | | | Output as JSON object |
| `--yaml` | | | | Output as YAML |
| `--markdown` | `-m` | | markdown | Output as markdown (same as default) |
| `--items-only` | | | | Show only items (no frontmatter) |
| `--filter-type` | `-t` | string | | Show only items of type |
| `--filter-status` | `-s` | string | | Show only items with status |
| `--filter-tag` | `-g` | string | | Show only items with tag |
| `--quiet` | `-q` | | | Suppress non-error output |

### Examples

**View document as markdown (default):**
```bash
meatycapture log view ./docs/REQ-20251227-my-project.md
```

**View as JSON:**
```bash
meatycapture log view ./docs/REQ-20251227-my-project.md --json
```

**View only enhancements:**
```bash
meatycapture log view ./docs/REQ-20251227-my-project.md --filter-type enhancement
```

**View items with tag 'ux':**
```bash
meatycapture log view ./docs/REQ-20251227-my-project.md --filter-tag ux
```

**View only items without frontmatter:**
```bash
meatycapture log view ./docs/REQ-20251227-my-project.md --items-only
```

**View high-priority bugs (combined filters):**
```bash
meatycapture log view ./docs/REQ-20251227-my-project.md --filter-type bug --filter-tag critical
```

**Pipe to jq for processing:**
```bash
meatycapture log view ./docs/requests.md --json | jq '.items[] | select(.status == "triage")'
```

### Output Formats

**Default (markdown):**
```markdown
---
type: request-log
doc_id: REQ-20251227-my-project
item_count: 4
tags: [api, bug, tag1, tag2]
items_index:
  - id: REQ-20251227-my-project-01
    type: enhancement
---

### REQ-20251227-my-project-01 - Add user profiles
**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** tag1
- Context: User interface
- Notes: Allow users to create and customize profiles
```

**JSON format:**
```json
{
  "doc_id": "REQ-20251227-my-project",
  "title": "My Project Request Log",
  "project_id": "my-project",
  "item_count": 4,
  "tags": ["api", "bug", "tag1", "tag2"],
  "created_at": "2025-12-27T15:30:45Z",
  "updated_at": "2025-12-27T15:30:45Z",
  "items": [...]
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | File not found |
| `2` | Parse error (corrupted document) |

### Filters

All filters are case-insensitive and can be combined (AND logic).

- `--filter-type`: Show items matching specific type (enhancement, bug, idea, etc.)
- `--filter-status`: Show items matching specific status (triage, backlog, in-progress, etc.)
- `--filter-tag`: Show items containing specific tag

---

## log search

Search request-log documents by text, tags, type, or status.

### Signature

```bash
meatycapture log search <query> [project] [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `query` | string | Search query (text or special syntax) |
| `project` | string (optional) | Project slug to limit search |

### Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--path` | `-p` | string | `~/.meatycapture/docs` | Custom search path |
| `--match` | `-m` | string | `contains` | Match mode: full, starts, contains |
| `--json` | | | | Output results as JSON |
| `--csv` | | | | Output results as CSV |
| `--yaml` | | | | Output results as YAML |
| `--table` | | | | Output as ASCII table (default) |
| `--limit` | `-l` | number | unlimited | Maximum results |
| `--quiet` | `-q` | | | Suppress non-error output |

### Query Syntax

Basic text search (searches title, notes, tags):

```bash
meatycapture log search "login bug"
meatycapture log search "authentication"
```

Special prefixes for structured search:

```bash
# Search by tag
meatycapture log search "tag:ux"
meatycapture log search "tag:performance"

# Search by type
meatycapture log search "type:enhancement"
meatycapture log search "type:bug"

# Search by status
meatycapture log search "status:triage"
meatycapture log search "status:in-progress"

# Combine multiple (AND logic)
meatycapture log search "type:bug tag:api"
```

### Examples

**Search for "login" across all projects:**
```bash
meatycapture log search "login"
```

**Search in specific project:**
```bash
meatycapture log search "authentication" my-project
```

**Search for bugs with tag 'critical':**
```bash
meatycapture log search "type:bug tag:critical"
```

**Search for triage items:**
```bash
meatycapture log search "status:triage"
```

**Search with case-insensitive exact start:**
```bash
meatycapture log search "add" --match starts
```

**Search and output as JSON:**
```bash
meatycapture log search "bug" --json
```

**Search and limit results:**
```bash
meatycapture log search "enhancement" --limit 10
```

**Search for performance issues in api project:**
```bash
meatycapture log search "performance" api-project --match contains
```

**Pipe results to other tools:**
```bash
meatycapture log search "tag:urgent" --json | jq '.results[] | .item_id'
```

### Output Formats

**Default (human-readable):**
```
Found 2 results for "login":

REQ-20251227-my-project-02 - Fix login redirect issue
  Document: /path/to/REQ-20251227-my-project.md
  Type: bug | Status: triage | Priority: high
  Tags: auth, critical
  Matched in: title, tags
  Preview: "Fix login redirect issue when using OAuth providers"

REQ-20251226-my-project-01 - Add login metrics tracking
  Document: /path/to/REQ-20251226-my-project.md
  Type: enhancement | Status: backlog | Priority: medium
  Tags: analytics, login
  Matched in: notes
  Preview: "Track login success/failure rates by region"
```

**JSON format:**
```json
{
  "query": "login",
  "total_results": 2,
  "results": [
    {
      "item_id": "REQ-20251227-my-project-02",
      "doc_id": "REQ-20251227-my-project",
      "doc_path": "/path/to/REQ-20251227-my-project.md",
      "title": "Fix login redirect issue",
      "type": "bug",
      "status": "triage",
      "tags": ["auth", "critical"],
      "matched_fields": ["title", "tags"],
      "preview": "Fix login redirect issue when using OAuth providers"
    }
  ]
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (even if no results) |
| `1` | Path error or invalid project |
| `2` | Invalid query syntax |

### Match Modes

- `contains` (default): Query text appears anywhere (case-insensitive)
- `starts`: Item field starts with query text
- `full`: Exact match (case-insensitive)

---

## log delete

Delete a request-log document with optional confirmation.

### Signature

```bash
meatycapture log delete <doc-path> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `doc-path` | string | Path to document to delete |

### Options

| Option | Alias | Type | Default | Description |
|--------|-------|------|---------|-------------|
| `--force` | `-f` | | | Skip confirmation prompt |
| `--keep-backup` | | | true | Keep .bak backup file |
| `--no-backup` | | | | Delete .bak file too |
| `--quiet` | `-q` | | | Suppress non-error output |

### Examples

**Delete with confirmation:**
```bash
meatycapture log delete ./docs/REQ-20251227-my-project.md
# Prompts: "Delete /path/to/REQ-20251227-my-project.md? (y/N) "
```

**Delete without confirmation:**
```bash
meatycapture log delete ./docs/REQ-20251227-my-project.md --force
```

**Delete and remove backup:**
```bash
meatycapture log delete ./docs/REQ-20251227-my-project.md --force --no-backup
```

**Delete quietly (for scripts):**
```bash
meatycapture log delete ./docs/requests.md --force --quiet
echo $?  # Check exit code
```

**Delete multiple documents:**
```bash
for doc in ./docs/REQ-2024*.md; do
  meatycapture log delete "$doc" --force --quiet
done
```

### Output

**Default (with confirmation):**
```
Document: /path/to/REQ-20251227-my-project.md
Items: 4
Tags: api, bug, tag1, tag2

Delete this document? (y/N): y
✓ Deleted document: /path/to/REQ-20251227-my-project.md
  Backup preserved: /path/to/REQ-20251227-my-project.md.bak
```

**With --force --quiet:**
```
(no output on success)
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | File not found |
| `2` | I/O error (permission denied) |
| `130` | User canceled (Ctrl+C) |

### Backup Behavior

- Default: Keeps backup file (`.bak`)
- `--no-backup`: Removes backup file
- Can restore from backup: `mv REQ-20251227-my-project.md.bak REQ-20251227-my-project.md`

---

## Help Text

Get detailed help for any command:

```bash
# Main log help
meatycapture log --help

# Command-specific help
meatycapture log create --help
meatycapture log append --help
meatycapture log list --help
meatycapture log view --help
meatycapture log search --help
meatycapture log delete --help
```

Each help text shows:
- Brief description
- Usage signature
- All available options
- Common examples
- Link to full documentation

---

## Exit Code Summary

| Code | Meaning | Used By |
|------|---------|---------|
| `0` | Success | All commands |
| `1` | Validation/format error | All commands |
| `2` | I/O error (file/path error) | All commands |
| `3` | Resource error (project not found) | create, append |
| `64` | CLI usage error (invalid flags) | All commands |
| `130` | User interrupt (Ctrl+C) | delete (during confirmation) |

---

## Field Value Reference

### Valid Type Values

- `enhancement` - Feature request
- `bug` - Bug/defect
- `idea` - Idea/suggestion
- `technical-debt` - Technical debt
- `spike` - Investigation/research

### Valid Domain Values

- `web` - Web interface
- `api` - API/backend
- `mobile` - Mobile app
- `devops` - DevOps/infrastructure
- `other` - Other/unclassified

### Valid Priority Values

- `low` - Low priority
- `medium` - Medium priority
- `high` - High priority
- `critical` - Critical/blocking

### Valid Status Values

- `triage` - Needs triage
- `backlog` - In backlog
- `in-progress` - Currently being worked on
- `completed` - Completed
- `blocked` - Blocked/on hold

---

## Tips & Tricks

### Batch Operations

Create multiple documents in one script:
```bash
for input in batch-*.json; do
  meatycapture log create "$input" --quiet
done
```

### JSON Output for Parsing

Get structured data for further processing:
```bash
# List documents as JSON
docs=$(meatycapture log list --json)

# Find documents with specific tag
echo "$docs" | jq '.[] | select(.tags | contains(["urgent"]))'
```

### Search Integration

Combine search results with other tools:
```bash
# Export search results to CSV
meatycapture log search "type:bug" --csv > bugs.csv

# Count items by type
meatycapture log view ./docs/requests.md --json | \
  jq '.items | group_by(.type) | map({type: .[0].type, count: length})'
```

### Automation & CI/CD

Use quiet mode and exit code checking:
```bash
#!/bin/bash
set -e  # Exit on first error

meatycapture log create input.json --quiet
if [ $? -eq 0 ]; then
  echo "✓ Document created successfully"
else
  echo "✗ Failed to create document"
  exit 1
fi
```
