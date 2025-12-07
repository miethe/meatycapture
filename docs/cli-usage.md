---
title: CLI Usage Guide
type: documentation
category: user-guide
created: 2025-12-07
---

# MeatyCapture CLI

Headless batch document creation for MeatyCapture request-logs. The CLI provides commands for creating, appending, and listing request-log documents without using the UI.

## Installation

After building the CLI:

```bash
pnpm build:cli
```

The CLI is available at `dist/cli/index.js` or via the `meatycapture` command when installed.

## Commands

### create

Create a new request-log document from JSON input.

**Usage:**
```bash
meatycapture create <json-file> [options]
```

**Options:**
- `-o, --output <path>` - Output path for the document (default: auto-generated)

**Example:**
```bash
meatycapture create input.json
meatycapture create input.json -o /path/to/output.md
```

**JSON Input Format:**
```json
{
  "project": "my-project",
  "title": "Optional document title",
  "items": [
    {
      "title": "Item title",
      "type": "enhancement",
      "domain": "web",
      "context": "Additional context",
      "priority": "medium",
      "status": "triage",
      "tags": ["tag1", "tag2"],
      "notes": "Problem/goal description"
    }
  ]
}
```

**Output:**
```
✓ Created document: /path/to/output.md
  Doc ID: REQ-20251207-my-project
  Items: 1
  Tags: tag1, tag2
```

---

### append

Append items to an existing request-log document.

**Usage:**
```bash
meatycapture append <doc-path> <json-file>
```

**Example:**
```bash
meatycapture append /path/to/doc.md items.json
```

**JSON Input Format:**
```json
{
  "project": "my-project",
  "items": [
    {
      "title": "New item title",
      "type": "bug",
      "domain": "api",
      "context": "Context information",
      "priority": "high",
      "status": "triage",
      "tags": ["api", "bug"],
      "notes": "Description of the issue"
    }
  ]
}
```

**Output:**
```
✓ Appended 1 item(s) to: /path/to/doc.md
  Doc ID: REQ-20251207-my-project
  Total Items: 2
  Tags: api, bug, tag1, tag2
```

**Features:**
- Automatically generates sequential item IDs
- Updates aggregated tags
- Updates item count and index
- Creates backup (`.bak`) before modification

---

### list

List request-log documents for a project or directory.

**Usage:**
```bash
meatycapture list [project] [options]
```

**Options:**
- `-p, --path <path>` - Custom path to search for documents

**Examples:**
```bash
# List all docs in default directory
meatycapture list

# List docs for a specific project
meatycapture list my-project

# List docs in a custom path
meatycapture list --path /custom/path
```

**Output:**
```
Found 2 document(s) in: /path/to/docs

REQ-20251207-my-project
  Title: My Project Request Log
  Path: /path/to/docs/REQ-20251207-my-project.md
  Items: 3
  Updated: 2025-12-07T14:35:35.728Z

REQ-20251206-my-project
  Title: Earlier Request Log
  Path: /path/to/docs/REQ-20251206-my-project.md
  Items: 5
  Updated: 2025-12-06T10:22:15.432Z
```

---

## Error Handling

The CLI provides clear error messages and exits with appropriate codes:

- **Exit Code 0**: Success
- **Exit Code 1**: Error (file not found, invalid JSON, write failure, etc.)

**Common Errors:**

### Input file not found
```
Error creating document:
Input file not found: /path/to/input.json
```

### Invalid JSON structure
```
Error creating document:
Invalid JSON structure. Expected format:
{
  "project": "project-slug",
  "items": [...]
}
```

### Document not found (append)
```
Error appending to document:
Document not found: /path/to/doc.md
```

### Path not writable
```
Error creating document:
Failed to write document /path/to/doc.md: EACCES: permission denied
```

---

## JSON Field Reference

### Required Fields

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| `project` | string | Project slug identifier | `"my-project"`, `"api-service"` |
| `items` | array | Array of item objects | See item structure below |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `title` | string | Document title | `"Request Log - {project}"` |

### Item Structure (Required)

| Field | Type | Description | Examples |
|-------|------|-------------|----------|
| `title` | string | Item title/summary | `"Add dark mode"` |
| `type` | string | Item type | `"enhancement"`, `"bug"`, `"idea"` |
| `domain` | string | Domain/area | `"web"`, `"api"`, `"mobile"` |
| `context` | string | Additional context | `"User interface"` |
| `priority` | string | Priority level | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `status` | string | Current status | `"triage"`, `"backlog"`, `"in-progress"` |
| `tags` | array | Tag strings | `["ux", "ui"]` |
| `notes` | string | Freeform description | Multi-line supported |

---

## Automation Examples

### Batch Creation Script

```bash
#!/bin/bash
# Create multiple request logs from JSON files

for file in ./batch-inputs/*.json; do
  echo "Processing $file..."
  meatycapture create "$file"
done
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Create request log from issue
  run: |
    cat > input.json <<EOF
    {
      "project": "my-project",
      "items": [{
        "title": "${{ github.event.issue.title }}",
        "type": "bug",
        "domain": "web",
        "context": "GitHub Issue #${{ github.event.issue.number }}",
        "priority": "medium",
        "status": "triage",
        "tags": ["github", "automated"],
        "notes": "${{ github.event.issue.body }}"
      }]
    }
    EOF
    meatycapture create input.json -o ./docs/issues/issue-${{ github.event.issue.number }}.md
```

### Append from Template

```bash
#!/bin/bash
# Append a new item to today's log

DOC_PATH="./docs/REQ-$(date +%Y%m%d)-my-project.md"

cat > new-item.json <<EOF
{
  "project": "my-project",
  "items": [{
    "title": "$1",
    "type": "${2:-enhancement}",
    "domain": "${3:-web}",
    "context": "${4:-}",
    "priority": "${5:-medium}",
    "status": "triage",
    "tags": [],
    "notes": "${6:-}"
  }]
}
EOF

if [ -f "$DOC_PATH" ]; then
  meatycapture append "$DOC_PATH" new-item.json
else
  meatycapture create new-item.json -o "$DOC_PATH"
fi

rm new-item.json
```

---

## Configuration

### Default Paths

The CLI respects the following path resolution:

1. **Explicit output** (`-o` flag): Highest priority
2. **Project default_path**: From project configuration
3. **Environment variable**: `MEATYCAPTURE_DEFAULT_PROJECT_PATH`
4. **Fallback**: `~/.meatycapture/docs/<project-id>/`

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `MEATYCAPTURE_CONFIG_DIR` | Config directory | `~/.meatycapture` |
| `MEATYCAPTURE_DEFAULT_PROJECT_PATH` | Default doc path | `~/.meatycapture/docs` |

---

## Building the CLI

**Development:**
```bash
pnpm build:cli
```

**Output:** `dist/cli/index.js`

**Testing locally:**
```bash
./dist/cli/index.js --help
```

**Installing globally (from package):**
```bash
pnpm link
meatycapture --help
```

---

## Troubleshooting

### Command not found

If `meatycapture` command is not found after installation:

1. Verify the build output exists: `ls dist/cli/index.js`
2. Check if executable: `ls -la dist/cli/index.js`
3. Make executable if needed: `chmod +x dist/cli/index.js`
4. Run directly: `./dist/cli/index.js --help`

### Module resolution errors

If you see module resolution errors:
1. Rebuild the CLI: `pnpm build:cli`
2. Ensure dependencies are installed: `pnpm install`
3. Check Node.js version: `node --version` (requires >= 18.0.0)

### Permission denied

If you get permission errors when writing documents:
1. Check directory permissions: `ls -la /path/to/directory`
2. Ensure write access: `test -w /path/to/directory && echo "writable"`
3. Create directory if needed: `mkdir -p /path/to/directory`
