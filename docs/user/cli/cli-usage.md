---
title: CLI Usage Guide
type: documentation
category: user-guide
created: 2025-12-07
updated: 2026-01-03
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

### Log Commands (`meatycapture log`)

Commands for managing request-log documents: creating, appending, viewing, searching, and deleting.

#### log create

Create a new request-log document from JSON input.

**Usage:**
```bash
meatycapture log create <json-file> [options]
```

**Options:**
- `-o, --output <path>` - Output path for the document (default: auto-generated)

**Example:**
```bash
meatycapture log create input.json
meatycapture log create input.json -o /path/to/output.md
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

#### log append

Append items to an existing request-log document.

**Usage:**
```bash
meatycapture log append <doc-path> <json-file>
```

**Example:**
```bash
meatycapture log append /path/to/doc.md items.json
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

#### log list

List request-log documents for a project or directory.

**Usage:**
```bash
meatycapture log list [project] [options]
```

**Options:**
- `-p, --path <path>` - Custom path to search for documents

**Examples:**
```bash
# List all docs in default directory
meatycapture log list

# List docs for a specific project
meatycapture log list my-project

# List docs in a custom path
meatycapture log list --path /custom/path
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

#### log view

View the contents of a request-log document in various formats.

**Usage:**
```bash
meatycapture log view <doc-path> [options]
```

**Options:**
- `--json` - Output as JSON (default: markdown)
- `--yaml` - Output as YAML
- `--markdown` - Output as formatted markdown (default)
- `--filter-type <type>` - Filter items by type (e.g., bug, enhancement, idea)
- `--filter-status <status>` - Filter items by status (e.g., triage, in-progress, done)
- `--filter-tag <tag>` - Filter items by tag (match items with this tag)
- `--items-only` - Show only items, skip metadata

**Examples:**
```bash
# View entire document
meatycapture log view /path/to/doc.md

# View as JSON
meatycapture log view /path/to/doc.md --json

# View only bugs
meatycapture log view /path/to/doc.md --filter-type bug

# View items in progress
meatycapture log view /path/to/doc.md --filter-status in-progress

# View items tagged with "security"
meatycapture log view /path/to/doc.md --filter-tag security

# View items only (no metadata)
meatycapture log view /path/to/doc.md --items-only
```

**Output (markdown):**
```
# REQ-20251207-my-project

Type: request-log | Items: 2 | Updated: 2025-12-07T14:35:35.728Z
Tags: api, bug, enhancement

## REQ-20251207-my-project-01 - Add dark mode
**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** ui, ux
- Problem/goal: Users request dark mode support
```

---

#### log delete

Delete a request-log document with optional backup.

**Usage:**
```bash
meatycapture log delete <doc-path> [options]
```

**Options:**
- `--force` - Skip confirmation prompt
- `--no-backup` - Don't create backup before deletion
- `--quiet` - Suppress output messages

**Examples:**
```bash
# Delete with confirmation
meatycapture log delete /path/to/doc.md

# Delete without confirmation
meatycapture log delete /path/to/doc.md --force

# Delete without creating backup
meatycapture log delete /path/to/doc.md --force --no-backup

# Delete silently
meatycapture log delete /path/to/doc.md --force --quiet
```

**Output:**
```
⚠ This will delete: /path/to/doc.md
  Created backup: /path/to/doc.md.bak
Continue? (y/n): y
✓ Deleted: /path/to/doc.md
```

---

#### log search

Search request-log documents for items matching query criteria.

**Usage:**
```bash
meatycapture log search <query> [options]
```

**Query Syntax:**
- Plain text: Search item titles and notes
- `tag:<value>` - Filter by tag (e.g., `tag:security`)
- `type:<value>` - Filter by type (e.g., `type:bug`)
- `status:<value>` - Filter by status (e.g., `status:in-progress`)
- Multiple filters: Combine with spaces (e.g., `tag:api type:bug`)

**Options:**
- `-p, --path <path>` - Search path (default: all configured project paths)
- `--json` - Output as JSON
- `--yaml` - Output as YAML
- `--csv` - Output as CSV
- `--table` - Output as table (default)
- `--match <type>` - Match type: `any` (OR) or `all` (AND) (default: any)
- `--limit <number>` - Limit results (default: all)
- `--quiet` - Suppress metadata, show only matching items

**Examples:**
```bash
# Search by title/notes
meatycapture log search "authentication bug"

# Search by tag
meatycapture log search "tag:security"

# Search by type
meatycapture log search "type:bug"

# Search by status
meatycapture log search "status:in-progress"

# Combine filters (any match)
meatycapture log search "tag:api type:bug"

# Combine filters (all must match)
meatycapture log search "tag:api type:bug" --match all

# Limit results and output as JSON
meatycapture log search "tag:security" --limit 10 --json

# Search in custom path
meatycapture log search "authentication" --path /custom/docs/path
```

**Output (table):**
```
Found 3 matching item(s)

REQ-20251207-my-project-01 | authentication bug | bug | api | in-progress
REQ-20251206-my-project-02 | login flow issue | bug | web | triage
REQ-20251205-my-project-03 | token refresh | enhancement | api | backlog
```

---

### Project Commands (`meatycapture project`)

Commands for managing projects and their configuration.

#### project list

List all registered projects.

**Usage:**
```bash
meatycapture project list [options]
```

**Options:**
- `--json` - Output as JSON
- `--yaml` - Output as YAML

**Examples:**
```bash
meatycapture project list
meatycapture project list --json
```

**Output:**
```
Registered projects:

my-project (enabled)
  Path: /Users/user/projects/my-project
  Repo: https://github.com/user/my-project.git
  Default: Yes

api-service (enabled)
  Path: /Users/user/projects/api-service
  Repo: https://github.com/user/api-service.git
  Default: No

archived-project (disabled)
  Path: /Users/user/projects/archived-project
  Default: No
```

---

#### project add

Create and register a new project.

**Usage:**
```bash
meatycapture project add <name> <path> [options]
```

**Options:**
- `--repo <url>` - Optional Git repository URL
- `--set-default` - Set as default project for new documents
- `--quiet` - Suppress output

**Examples:**
```bash
meatycapture project add my-project /path/to/project
meatycapture project add my-project /path/to/project --repo https://github.com/user/my-project.git
meatycapture project add my-project /path/to/project --set-default
```

**Output:**
```
✓ Project created: my-project
  Path: /path/to/project
  Repo: https://github.com/user/my-project.git
  Default: No
```

---

#### project update

Update project configuration.

**Usage:**
```bash
meatycapture project update <id> [options]
```

**Options:**
- `--name <name>` - Update project name
- `--path <path>` - Update default document path
- `--repo <url>` - Update repository URL
- `--quiet` - Suppress output

**Examples:**
```bash
meatycapture project update my-project --name "My Project Updated"
meatycapture project update my-project --path /new/path
meatycapture project update my-project --repo https://github.com/user/new-repo.git
```

**Output:**
```
✓ Project updated: my-project
```

---

#### project enable

Enable a disabled project.

**Usage:**
```bash
meatycapture project enable <id> [options]
```

**Options:**
- `--quiet` - Suppress output

**Example:**
```bash
meatycapture project enable my-project
```

**Output:**
```
✓ Project enabled: my-project
```

---

#### project disable

Disable a project (documents remain, project is hidden from listings).

**Usage:**
```bash
meatycapture project disable <id> [options]
```

**Options:**
- `--quiet` - Suppress output

**Example:**
```bash
meatycapture project disable archived-project
```

**Output:**
```
✓ Project disabled: archived-project
```

---

#### project set-default

Set a project as the default for new documents.

**Usage:**
```bash
meatycapture project set-default <id> [options]
```

**Options:**
- `--quiet` - Suppress output

**Example:**
```bash
meatycapture project set-default my-project
```

**Output:**
```
✓ Default project set: my-project
```

---

### Field Commands (`meatycapture field`)

Commands for managing field options and value catalogs.

#### field list

List available field options (global and project-specific).

**Usage:**
```bash
meatycapture field list [options]
```

**Options:**
- `--project <id>` - Filter by project (shows project + inherited global options)
- `--field <name>` - Filter by field name (e.g., type, status, domain)
- `--json` - Output as JSON
- `--scope <scope>` - Filter by scope: global or project

**Examples:**
```bash
# List all field options
meatycapture field list

# List options for a specific project
meatycapture field list --project my-project

# List options for a specific field
meatycapture field list --field type

# List project-scoped options only
meatycapture field list --project my-project --scope project

# Output as JSON
meatycapture field list --json
```

**Output:**
```
Field Options:

type (global)
  enhancement - New features and improvements
  bug - Defects and issues
  idea - Ideas and proposals

domain (global)
  web - Web application
  api - Backend API
  mobile - Mobile application

status (global + project:my-project)
  triage - Needs review and categorization
  backlog - Approved, waiting to start
  in-progress - Currently being worked on
  done - Completed
  on-hold - Paused, awaiting further action

  [my-project only]
  deployment-testing - In deployment test environment
```

---

#### field add

Add a new option to a field's catalog.

**Usage:**
```bash
meatycapture field add <field> <value> [options]
```

**Options:**
- `--description <text>` - Description of the field value
- `--project <id>` - Add to project scope (default: global)

**Examples:**
```bash
# Add global field option
meatycapture field add type "infrastructure" --description "Infrastructure and DevOps"

# Add project-specific field option
meatycapture field add status "deployment-testing" --project my-project --description "In deployment test environment"
```

**Output:**
```
✓ Added field option: type = infrastructure
  Scope: global
  Description: Infrastructure and DevOps
```

---

#### field remove

Remove a field option from the catalog.

**Usage:**
```bash
meatycapture field remove <id> [options]
```

**Options:**
- `--force` - Skip confirmation
- `--quiet` - Suppress output

**Examples:**
```bash
meatycapture field remove field-option-id
meatycapture field remove field-option-id --force
```

**Output:**
```
⚠ This will remove: type = deprecated_value
Continue? (y/n): y
✓ Removed field option: type = deprecated_value
```

---

#### field import

Batch import field options from a JSON or YAML file.

**Usage:**
```bash
meatycapture field import <file> [options]
```

**Options:**
- `--project <id>` - Import as project-scoped options
- `--merge` - Merge with existing (default: replace duplicates)
- `--quiet` - Suppress output

**File Format (JSON):**
```json
{
  "fields": {
    "type": [
      {
        "value": "enhancement",
        "description": "New features and improvements"
      },
      {
        "value": "bug",
        "description": "Defects and issues"
      }
    ],
    "domain": [
      {
        "value": "web",
        "description": "Web application"
      }
    ]
  }
}
```

**File Format (YAML):**
```yaml
fields:
  type:
    - value: enhancement
      description: New features and improvements
    - value: bug
      description: Defects and issues
  domain:
    - value: web
      description: Web application
```

**Examples:**
```bash
# Import global field options
meatycapture field import ./field-catalog.json

# Import as project-scoped
meatycapture field import ./project-fields.json --project my-project

# Import and merge with existing
meatycapture field import ./new-fields.json --merge
```

**Output:**
```
✓ Imported 5 field option(s)
  3 for type, 2 for domain
  Global scope
```

---

### Config Commands (`meatycapture config`)

Commands for managing global configuration.

#### config init

Initialize default configuration and directory structure.

**Usage:**
```bash
meatycapture config init [options]
```

**Options:**
- `--force` - Overwrite existing configuration
- `--quiet` - Suppress output

**Example:**
```bash
meatycapture config init
meatycapture config init --force
```

**Output:**
```
✓ Configuration initialized
  Config dir: /Users/user/.meatycapture
  Projects: projects.json
  Fields: fields.json
  Docs path: /Users/user/.meatycapture/docs
```

---

#### config show

Display current configuration.

**Usage:**
```bash
meatycapture config show [options]
```

**Options:**
- `--json` - Output as JSON
- `--yaml` - Output as YAML
- `--all` - Show all config including defaults

**Examples:**
```bash
meatycapture config show
meatycapture config show --json
```

**Output:**
```
MeatyCapture Configuration

Config Directory: /Users/user/.meatycapture
Default Docs Path: /Users/user/.meatycapture/docs
Default Project: my-project

Projects: 3 registered
Fields: 15 global options

Environment Variables:
  MEATYCAPTURE_CONFIG_DIR not set (using default)
  MEATYCAPTURE_DEFAULT_PROJECT_PATH not set (using default)
```

---

#### config set

Set individual configuration values.

**Usage:**
```bash
meatycapture config set <key> <value> [options]
```

**Available Keys:**
- `default-project` - Set default project ID
- `default-path` - Set default documents path
- `auto-backup` - Enable/disable automatic backups (true/false)

**Options:**
- `--quiet` - Suppress output

**Examples:**
```bash
meatycapture config set default-project my-project
meatycapture config set default-path /custom/docs/path
meatycapture config set auto-backup true
```

**Output:**
```
✓ Configuration updated
  Key: default-project
  Value: my-project
```

---

## Known Limitations

The following features are not yet supported in the CLI but are planned for upcoming releases:

### Item-Level Updates

Direct updates to individual items within existing documents are not yet supported. Planned for **CLI Item Management v1**.

**Workaround:**
- View the document with `log view`
- Manually edit the markdown file
- Use `log view --json` to export as JSON, modify, then use `append` with a new document

### Document Archive/Unarchive

Document archiving and unarchiving operations are not yet implemented. Planned for **CLI Item Management v1**.

**Workaround:**
- Disable the associated project with `project disable` to hide from listings
- Documents remain available for direct access via `log view <path>`

### Related Documentation

For the complete roadmap of planned enhancements, see:
- [CLI Item Management v1 Implementation Plan](docs/project_plans/implementation_plans/enhancements/cli-item-management-v1.md)

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
  meatycapture log create "$file"
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
    meatycapture log create input.json -o ./docs/issues/issue-${{ github.event.issue.number }}.md
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
  meatycapture log append "$DOC_PATH" new-item.json
else
  meatycapture log create new-item.json -o "$DOC_PATH"
fi

rm new-item.json
```

### Search and Filter Operations

```bash
#!/bin/bash
# Find all bugs in active projects

meatycapture log search "type:bug" --limit 20 --json | jq '.[] | {id, title, domain, status}'

# Find all high-priority items across all logs
meatycapture log search "priority:high" --table

# Export security-tagged items to CSV
meatycapture log search "tag:security" --csv > security-items.csv
```

### Project and Field Management

```bash
#!/bin/bash
# Initialize new project with defaults

PROJECT_NAME="new-service"
PROJECT_PATH="/Users/user/projects/$PROJECT_NAME"

# Create project
meatycapture project add "$PROJECT_NAME" "$PROJECT_PATH" \
  --repo "https://github.com/user/$PROJECT_NAME.git" \
  --set-default

# Import project-specific field options
meatycapture field import ./project-fields.json --project "$PROJECT_NAME" --merge

# Verify setup
meatycapture project list --json | jq '.[] | select(.id == "'$PROJECT_NAME'")'
meatycapture field list --project "$PROJECT_NAME"
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
