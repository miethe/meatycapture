---
title: "PRD: MeatyCapture CLI v1"
description: "Full-featured command-line interface for request-log management, enabling humans and AI agents to capture, view, and manage logs from the command line with feature parity to web and Tauri apps"
audience: [ai-agents, eng, product]
status: "draft"
created: 2025-12-27
updated: 2025-12-27
owners: ["product-owner"]
domains: ["cli", "core"]
category: "prd"
related_docs:
  - docs/project_plans/initialization/prd.md
  - src/cli/index.ts
  - src/core/ports/index.ts
---

# PRD: MeatyCapture CLI v1

## Overview

Extend the existing CLI foundation with complete CRUD operations, project management, field catalog administration, and interactive modes to provide feature parity with web and Tauri apps. The CLI will serve dual purposes: human-friendly interactive workflows and AI-agent-compatible structured output for programmatic integration.

**Key principle**: Leverage existing headless core (100% UI-agnostic) and port/adapter architecture. The CLI is a thin presentation layer that reuses all domain logic, validation, and storage operations already in place.

## Goals

- **Feature parity**: Support all operations available in web and Tauri UIs (create/read/append/list docs, project CRUD, field catalog management)
- **Dual-mode design**: Interactive mode for humans; structured output modes (JSON/YAML) for AI agents and scripting
- **Serverless-first**: Local file-based operations; reuse existing filesystem adapters without introducing remote dependencies
- **AI-agent friendly**: Structured exit codes, piped input support, batch operations, JSON output for parsing
- **Minimal friction**: Zero-config defaults; environment variables for configuration overrides
- **Extensible**: Subcommand structure allows future commands without disrupting existing workflows

## Non-Goals (MVP)

- REST API server (separate from CLI; see server-storage-v1.md)
- Real-time sync or multi-user conflict resolution beyond last-write-wins
- Shell completion auto-generation (may add in v1.1)
- TUI/interactive prompts beyond basic input (reserve for future ncurses-style mode)
- Remote Git integration (local files only)

## Users / Personas

- **Developer**: Log bugs/enhancements from CI pipeline or local development workflows
- **Product manager**: Quickly capture ideas or batch-create docs from scripts
- **AI Agent**: Integrate MeatyCapture into multi-step workflows; parse structured output for further processing
- **Ops engineer**: Manage projects and field catalogs from Kubernetes deployments or containers
- **Homelab operator**: Run capture as part of local automation scripts (e.g., status page, issue aggregation)

## User Stories (MVP)

1. As a developer, I can create a new request-log document from the CLI by passing a JSON file with project and items.
2. As a developer, I can append items to an existing document without loading a UI.
3. As a developer, I can list all documents for a project or view a specific document's contents from the CLI.
4. As an AI agent, I can get structured JSON output from CLI commands to parse results programmatically.
5. As an admin, I can manage projects (list, add, enable/disable) entirely from the CLI.
6. As an admin, I can manage field catalogs (list, add, remove options) from the CLI with project-specific overrides.
7. As a user, I can use `--json` flag to get machine-readable output instead of human-friendly formatting.
8. As a user, I can pipe JSON input via stdin to create/append items without writing intermediate files.
9. As a user, I can use `--quiet` flag to suppress non-error output for scripting.
10. As a user, I can use `--interactive` flag (future) for guided prompts when available.

## Architecture Overview

### CLI Layering

```
┌─────────────────────────────────────┐
│   CLI Layer (src/cli/)              │
│   - Command parsing (Commander.js)  │
│   - Output formatting (human/JSON)  │
│   - Error handling & exit codes     │
└────────────────┬────────────────────┘
                 │
┌─────────────────────────────────────┐
│   Core Layer (src/core/)            │
│   - Models & validation             │
│   - Serialization                   │
│   - Business logic (UI-agnostic)    │
└────────────────┬────────────────────┘
                 │
┌─────────────────────────────────────┐
│   Adapter Layer (src/adapters/)     │
│   - DocStore (fs-local)             │
│   - ProjectStore (config-local)     │
│   - FieldCatalogStore               │
└────────────────┬────────────────────┘
                 │
             Filesystem
```

**Current state**: 3 commands exist (create, append, list). MVP extends with full CRUD and admin.

### Command Structure

Hierarchical subcommand design for clarity and extensibility:

```
meatycapture
├── log
│   ├── create <json-file>
│   ├── append <doc-path> <json-file>
│   ├── list [project]
│   ├── view <doc-path>
│   ├── search <query> [project]
│   └── delete <doc-path> [--force]
├── project
│   ├── list
│   ├── add <name> <default-path>
│   ├── update <id> [--name] [--path] [--repo-url]
│   ├── enable <id>
│   ├── disable <id>
│   └── set-default <id>
├── field
│   ├── list [--field <name>] [--project <id>]
│   ├── add <field> <value> [--project <id>]
│   ├── remove <option-id> [--force]
│   └── import <file-path> [--project <id>]
└── config
    ├── show
    ├── set <key> <value>
    └── init
```

### Output Modes

| Flag | Behavior | Use Case |
|------|----------|----------|
| (default) | Human-friendly formatted output | Terminal usage |
| `--json` | Valid JSON output (array/object) | Parsing by agents/scripts |
| `--yaml` | YAML-formatted output | Config files, readability |
| `--quiet` / `-q` | Suppress all non-error output | Scripting, cron jobs |
| `--csv` | CSV format for tabular data | Spreadsheet import |

## Functional Requirements

### Phase 1: Core Log Operations (MVP)

#### `meatycapture log create`

**Purpose**: Create new request-log document from JSON input.

**Command**:
```bash
meatycapture log create <json-file> [options]
```

**Options**:
- `-o, --output <path>` - Override output path (default: auto-generated under project default_path)
- `--json` - Output created document as JSON
- `--no-backup` - Skip backup creation

**Input format** (JSON):
```json
{
  "project": "project-slug",
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

**Output** (success):
```
✓ Created document: /path/to/REQ-20251227-project-01.md
  Doc ID: REQ-20251227-project-01
  Items: 2
  Tags: enhancement, ux, api
  Path: /path/to/REQ-20251227-project-01.md
```

**Output** (--json):
```json
{
  "doc_id": "REQ-20251227-project-01",
  "path": "/path/to/REQ-20251227-project-01.md",
  "item_count": 2,
  "tags": ["api", "enhancement", "ux"],
  "created_at": "2025-12-27T10:00:00Z"
}
```

**Exit codes**:
- 0: Success
- 1: Validation error (invalid JSON, missing project)
- 2: File I/O error (path not writable, permission denied)
- 3: Project not found

#### `meatycapture log append`

**Purpose**: Append items to existing request-log document.

**Command**:
```bash
meatycapture log append <doc-path> <json-file> [options]
```

**Options**:
- `--json` - Output updated document as JSON
- `--no-backup` - Skip backup creation

**Input format**: Same as `create` but `project` field is ignored (inferred from doc).

**Output** (success):
```
✓ Appended 1 item(s) to: /path/to/REQ-20251227-project-01.md
  Doc ID: REQ-20251227-project-01
  Total Items: 3
  Tags: api, enhancement, ux
```

**Exit codes**:
- 0: Success
- 1: Validation error
- 2: File not found or not writable
- 3: Parse error (corrupted document)

#### `meatycapture log list`

**Purpose**: List request-log documents.

**Command**:
```bash
meatycapture log list [project] [options]
```

**Arguments**:
- `project` (optional) - Project ID to filter by

**Options**:
- `-p, --path <path>` - Custom search directory
- `--json` - Output as JSON array
- `--csv` - Output as CSV (path, doc_id, title, item_count, updated_at)
- `--sort <field>` - Sort by: name|date|items (default: date desc)
- `--limit <n>` - Return top N results

**Output** (default):
```
Found 3 document(s) in project "project-slug":

REQ-20251227-project-01
  Title: Enhancement Request - Q1 2026
  Items: 2
  Updated: 2025-12-27 10:05:00 UTC
  Path: /Users/user/.meatycapture/docs/project-slug/REQ-20251227-project-01.md

REQ-20251226-project-01
  Title: Bug Report - Login Flow
  Items: 5
  Updated: 2025-12-26 14:30:00 UTC
  Path: /Users/user/.meatycapture/docs/project-slug/REQ-20251226-project-01.md
```

**Output** (--json):
```json
[
  {
    "doc_id": "REQ-20251227-project-01",
    "path": "/Users/user/.meatycapture/docs/project-slug/REQ-20251227-project-01.md",
    "title": "Enhancement Request - Q1 2026",
    "item_count": 2,
    "updated_at": "2025-12-27T10:05:00Z"
  }
]
```

**Exit codes**:
- 0: Success (even if no documents found)
- 1: Path doesn't exist or not readable
- 2: Invalid project ID

#### `meatycapture log view`

**Purpose**: Display complete contents of a request-log document.

**Command**:
```bash
meatycapture log view <doc-path> [options]
```

**Options**:
- `--json` - Output document as JSON
- `--markdown` - Output original markdown (default)
- `--items-only` - Show only items (no frontmatter)
- `--filter-type <type>` - Show only items of specified type
- `--filter-status <status>` - Show only items with specified status
- `--filter-tag <tag>` - Show only items with specified tag

**Output** (default markdown):
```
REQ-20251227-project-01 - Enhancement Request - Q1 2026

Created: 2025-12-27 10:00:00 UTC
Updated: 2025-12-27 10:05:00 UTC
Project: project-slug
Items: 2
Tags: api, enhancement, ux

---

REQ-20251227-project-01-01 - Redesign API Response Format
Type: enhancement | Domain: api | Priority: high | Status: planned
Tags: api, ux
- Problem/goal: Current response format is inconsistent; redesign for clarity

REQ-20251227-project-01-02 - Fix Login Button Text
Type: bug | Domain: web | Priority: medium | Status: triage
Tags: ui, ux
- Problem/goal: Button text misaligned on mobile devices
```

**Output** (--json):
```json
{
  "doc_id": "REQ-20251227-project-01",
  "title": "Enhancement Request - Q1 2026",
  "project_id": "project-slug",
  "item_count": 2,
  "tags": ["api", "enhancement", "ux"],
  "created_at": "2025-12-27T10:00:00Z",
  "updated_at": "2025-12-27T10:05:00Z",
  "items": [
    {
      "id": "REQ-20251227-project-01-01",
      "title": "Redesign API Response Format",
      "type": "enhancement",
      "domain": "api",
      "priority": "high",
      "status": "planned",
      "tags": ["api", "ux"],
      "context": "",
      "notes": "Current response format is inconsistent; redesign for clarity",
      "created_at": "2025-12-27T10:00:00Z"
    }
  ]
}
```

**Exit codes**:
- 0: Success
- 1: File not found
- 2: Parse error (corrupted document)

#### `meatycapture log search`

**Purpose**: Search documents by text content, tags, type, or status.

**Command**:
```bash
meatycapture log search <query> [project] [options]
```

**Arguments**:
- `query` - Search term (title, notes, tags; supports `tag:<name>`, `type:<type>`, `status:<status>`)
- `project` (optional) - Filter by project

**Options**:
- `-p, --path <path>` - Custom search directory
- `--json` - Output results as JSON
- `--match` - Match mode: full|starts|contains (default: contains)

**Output** (default):
```
Found 2 matches for query "api":

REQ-20251227-project-01-01 (REQ-20251227-project-01)
  Title: Redesign API Response Format
  Type: enhancement | Status: planned
  Tags: api, ux
  Match: title, tags
```

**Exit codes**:
- 0: Success (even if no results)
- 1: Path doesn't exist

#### `meatycapture log delete`

**Purpose**: Delete a request-log document.

**Command**:
```bash
meatycapture log delete <doc-path> [options]
```

**Options**:
- `--force` / `-f` - Skip confirmation prompt
- `--keep-backup` - Retain .bak file after deletion

**Output**:
```
Delete document: /path/to/REQ-20251227-project-01.md? (y/N)
✓ Deleted document
  Backup retained at: /path/to/REQ-20251227-project-01.bak
```

**Exit codes**:
- 0: Success
- 1: File not found
- 130: User cancelled (Ctrl+C)

### Phase 2: Project Management

#### `meatycapture project list`

**Purpose**: List all configured projects.

**Command**:
```bash
meatycapture project list [options]
```

**Options**:
- `--json` - Output as JSON
- `--enabled-only` - Show only enabled projects
- `--disabled-only` - Show only disabled projects

**Output** (default):
```
Configured projects (2):

meatycapture (enabled)
  Name: MeatyCapture
  Default Path: /Users/user/.meatycapture/docs/meatycapture
  Repo: https://github.com/user/meatycapture
  Created: 2025-12-03

homelab (enabled)
  Name: Homelab
  Default Path: /Users/user/homelab/docs
  Repo: (none)
  Created: 2025-12-15
```

**Output** (--json):
```json
[
  {
    "id": "meatycapture",
    "name": "MeatyCapture",
    "default_path": "/Users/user/.meatycapture/docs/meatycapture",
    "repo_url": "https://github.com/user/meatycapture",
    "enabled": true,
    "created_at": "2025-12-03T00:00:00Z",
    "updated_at": "2025-12-03T00:00:00Z"
  }
]
```

**Exit codes**:
- 0: Success

#### `meatycapture project add`

**Purpose**: Create new project configuration.

**Command**:
```bash
meatycapture project add <name> <default-path> [options]
```

**Arguments**:
- `name` - Human-readable project name
- `default-path` - Default filesystem path for documents

**Options**:
- `--repo-url <url>` - Optional repository URL
- `--id <slug>` - Custom project ID (default: slugified name)
- `--json` - Output created project as JSON

**Output**:
```
✓ Created project: meatycapture
  Name: MeatyCapture
  Default Path: /Users/user/.meatycapture/docs/meatycapture
  Project ID: meatycapture
```

**Exit codes**:
- 0: Success
- 1: Invalid input (name/path required, path not writable)
- 3: Project ID already exists

#### `meatycapture project update`

**Purpose**: Modify project configuration.

**Command**:
```bash
meatycapture project update <id> [options]
```

**Arguments**:
- `id` - Project identifier

**Options**:
- `--name <name>` - New project name
- `--path <path>` - New default path
- `--repo-url <url>` - New repository URL
- `--json` - Output updated project as JSON

**Output**:
```
✓ Updated project: meatycapture
  Name: MeatyCapture
  Default Path: /Users/user/new/path
```

**Exit codes**:
- 0: Success
- 1: Invalid input
- 2: Project not found

#### `meatycapture project enable / disable`

**Purpose**: Enable or disable a project.

**Command**:
```bash
meatycapture project enable <id>
meatycapture project disable <id>
```

**Output**:
```
✓ Project enabled: meatycapture
```

**Exit codes**:
- 0: Success
- 2: Project not found

#### `meatycapture project set-default`

**Purpose**: Set the default project for CLI operations.

**Command**:
```bash
meatycapture project set-default <id>
```

**Output**:
```
✓ Default project set to: meatycapture
```

**Environment**: Sets `MEATYCAPTURE_DEFAULT_PROJECT` in config.

### Phase 3: Field Catalog Management

#### `meatycapture field list`

**Purpose**: List available field options.

**Command**:
```bash
meatycapture field list [options]
```

**Options**:
- `--field <name>` - Filter by field name (type, domain, priority, status, context, tags)
- `--project <id>` - Show effective options for project (global + project-specific)
- `--json` - Output as JSON
- `--global-only` - Show only global options

**Output** (default):
```
Field Options:

TYPE (5 options):
  - enhancement
  - bug
  - idea
  - task
  - question

PRIORITY (4 options):
  - low
  - medium
  - high
  - critical

STATUS (6 options):
  - triage
  - backlog
  - planned
  - in-progress
  - done
  - wontfix

DOMAIN (6 options):
  - api
  - web
  - cli
  - data
  - infra
  - ml
```

**Output** (--project meatycapture --field type):
```
TYPE options for project "meatycapture":

Global:
  - enhancement
  - bug
  - idea
  - task
  - question

Project-specific:
  - research
  - spike
```

**Output** (--json):
```json
{
  "type": {
    "global": ["enhancement", "bug", "idea", "task", "question"],
    "project": ["research", "spike"]
  },
  "priority": {
    "global": ["low", "medium", "high", "critical"],
    "project": []
  }
}
```

**Exit codes**:
- 0: Success
- 2: Project not found

#### `meatycapture field add`

**Purpose**: Add new field option (global or project-specific).

**Command**:
```bash
meatycapture field add <field> <value> [options]
```

**Arguments**:
- `field` - Field name (type, domain, priority, status, context, tags)
- `value` - Option value to add

**Options**:
- `--project <id>` - Add as project-specific (default: global)
- `--json` - Output created option as JSON

**Output**:
```
✓ Added option to field "type" (global):
  Value: feature-request
  ID: opt-20251227-xxxx
```

**Exit codes**:
- 0: Success
- 1: Invalid field or value
- 2: Project not found (if --project specified)
- 3: Option already exists for field

#### `meatycapture field remove`

**Purpose**: Remove field option.

**Command**:
```bash
meatycapture field remove <option-id> [options]
```

**Arguments**:
- `option-id` - Field option ID to remove

**Options**:
- `--force` / `-f` - Skip confirmation

**Output**:
```
Remove option "feature-request" from field "type"? (y/N)
✓ Removed option
```

**Exit codes**:
- 0: Success
- 1: Cannot remove global option (if used in project)
- 2: Option not found
- 130: User cancelled

#### `meatycapture field import`

**Purpose**: Import field options from file (JSON/YAML).

**Command**:
```bash
meatycapture field import <file-path> [options]
```

**Arguments**:
- `file-path` - Path to import file

**Options**:
- `--project <id>` - Import as project-specific
- `--merge` - Merge with existing (default: fail if exists)
- `--json` - Output import summary as JSON

**Input format** (JSON):
```json
{
  "type": ["feature-request", "chore"],
  "priority": ["p0", "p1", "p2", "p3"],
  "status": ["needs-review", "approved"]
}
```

**Output**:
```
✓ Imported 7 options:
  type: 2 added
  priority: 4 added
  status: 2 added
```

**Exit codes**:
- 0: Success
- 1: File not found or parse error
- 3: Option conflicts (use --merge to override)

### Phase 4: Configuration Management

#### `meatycapture config show`

**Purpose**: Display current configuration.

**Command**:
```bash
meatycapture config show [options]
```

**Options**:
- `--json` - Output as JSON
- `--config-dir` - Show only config directory

**Output**:
```
MeatyCapture Configuration:

Config Directory: /Users/user/.meatycapture
Config File: /Users/user/.meatycapture/config.json
Projects File: /Users/user/.meatycapture/projects.json
Fields File: /Users/user/.meatycapture/fields.json

Default Project: meatycapture
Environment Overrides:
  MEATYCAPTURE_CONFIG_DIR: (not set)
  MEATYCAPTURE_DEFAULT_PROJECT_PATH: (not set)
  MEATYCAPTURE_DEFAULT_PROJECT: (not set)
```

**Exit codes**:
- 0: Success

#### `meatycapture config set`

**Purpose**: Set configuration values.

**Command**:
```bash
meatycapture config set <key> <value>
```

**Arguments**:
- `key` - Config key (default_project, config_dir)
- `value` - Value to set

**Output**:
```
✓ Set config key "default_project" = "meatycapture"
```

**Exit codes**:
- 0: Success
- 1: Invalid key
- 2: Invalid value

#### `meatycapture config init`

**Purpose**: Initialize default configuration structure.

**Command**:
```bash
meatycapture config init [options]
```

**Options**:
- `--config-dir <path>` - Custom config directory (default: ~/.meatycapture)
- `--force` - Overwrite existing config

**Output**:
```
✓ Initialized MeatyCapture configuration:
  Config Directory: /Users/user/.meatycapture
  Sample Project: meatycapture
  Default Fields: type, domain, priority, status, context, tags

Ready to use! Try: meatycapture log create --help
```

**Exit codes**:
- 0: Success
- 3: Config already exists (use --force to overwrite)

## Input/Output Specifications

### JSON Schema (Create/Append)

```typescript
interface CliCreateInput {
  project: string;        // Required: project slug
  title?: string;         // Optional: document title
  items: CliItemInput[];  // Required: at least 1 item
}

interface CliItemInput {
  title: string;        // Required
  type: string;         // Required
  domain: string;       // Required
  context: string;      // Required (can be empty string)
  priority: string;     // Required
  status: string;       // Required
  tags: string[];       // Required (can be empty array)
  notes: string;        // Required (can be empty string)
}
```

### Stdin Support

Commands support piping JSON input via stdin when no file argument provided:

```bash
# Create from stdin
echo '{"project":"my-project","items":[...]}' | meatycapture log create -

# Append from stdin
echo '{"items":[...]}' | meatycapture log append /path/to/doc.md -

# Create using jq pipeline
jq '.capture' data.json | meatycapture log create -
```

### Exit Code Convention

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation/logic error (bad input, missing field) |
| 2 | I/O error (file not found, permission denied) |
| 3 | Resource error (project/document not found) |
| 64 | Command line error (bad syntax, invalid flag) |
| 130 | User interrupted (Ctrl+C) |

## Non-Functional Requirements

| Requirement | Acceptance Criteria |
|-------------|-------------------|
| **Performance** | CLI startup < 100ms; list 100 docs in < 500ms; create doc with 10 items in < 200ms |
| **Compatibility** | Node.js 18+, macOS/Linux/Windows (via WSL), works in CI/CD environments |
| **Backward compat** | All existing CLI commands (create, append, list) maintain same input/output |
| **Error messaging** | All error messages < 200 chars, suggest next action where possible |
| **Scripting-friendly** | No interactive prompts by default; --interactive flag for future human mode |
| **Parsing robustness** | Handle malformed documents gracefully with backup restoration option |

## Testing Strategy

| Type | Coverage |
|------|----------|
| **Unit** | Command argument parsing, output formatting, validation |
| **Integration** | End-to-end workflows (create → list → append → view) |
| **File I/O** | Temp dirs, backup creation, concurrent access |
| **Snapshot** | Generated markdown output (markdown format unchanged) |
| **Exit codes** | All error paths return correct exit code |
| **JSON parsing** | Valid JSON output for --json flag |
| **Stdin piping** | Input via stdin works as file argument |

## Data Model Alignment

MeatyCapture CLI uses existing domain models unchanged:

- `Project` - Project entity with id, name, default_path, repo_url, enabled
- `RequestLogDoc` - Complete document with frontmatter and items
- `RequestLogItem` - Individual items with ID, type, domain, priority, status, tags, notes
- `FieldOption` - Configurable field option with scope (global/project)

**ID patterns** (unchanged):
- `doc_id`: `REQ-YYYYMMDD-<project-slug>`
- `item_id`: `REQ-YYYYMMDD-<project-slug>-XX`
- `option_id`: `opt-<uuid-short>`

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `MEATYCAPTURE_CONFIG_DIR` | `~/.meatycapture` | Config directory (projects, fields, config) |
| `MEATYCAPTURE_DEFAULT_PROJECT_PATH` | `$CONFIG_DIR/docs/<project-id>` | Base path for all docs |
| `MEATYCAPTURE_DEFAULT_PROJECT` | First enabled project | Default project for operations |

### Config File Structure

**`~/.meatycapture/config.json`**:
```json
{
  "version": "1.0.0",
  "default_project": "meatycapture",
  "config_dir": "/Users/user/.meatycapture",
  "created_at": "2025-12-03T00:00:00Z"
}
```

**`~/.meatycapture/projects.json`**:
```json
{
  "projects": [
    {
      "id": "meatycapture",
      "name": "MeatyCapture",
      "default_path": "/Users/user/.meatycapture/docs/meatycapture",
      "repo_url": "https://github.com/user/meatycapture",
      "enabled": true,
      "created_at": "2025-12-03T00:00:00Z",
      "updated_at": "2025-12-03T00:00:00Z"
    }
  ]
}
```

## Phased Rollout

### Phase 1 (MVP): Core Log Operations
- Extend existing create/append/list commands with new flags
- Add `log view` and `log search` commands
- Implement --json, --csv, --quiet flags
- Stdin support for create/append
- Exit code standardization
- **Timeline**: 2-3 weeks
- **Acceptance**: All Phase 1 stories passing; all CLI tests green

### Phase 2: Project Management
- `project list/add/update/enable/disable/set-default` commands
- Full project CRUD operations
- **Timeline**: 1-2 weeks
- **Acceptance**: Project stories passing; integration tests passing

### Phase 3: Field Catalog Management
- `field list/add/remove/import` commands
- Global and project-scoped field management
- **Timeline**: 1-2 weeks
- **Acceptance**: Field catalog stories passing; no regression in existing commands

### Phase 4 (Future): Advanced Features
- `meatycapture config` commands
- Interactive mode (`--interactive`)
- Shell completion generation
- Batch import/export
- **Timeline**: Post-MVP

## AI Agent Integration Guide

### Pattern 1: Create Document (Programmatic)

```bash
# Create input file
cat > /tmp/capture.json << 'EOF'
{
  "project": "my-project",
  "title": "Automated Capture from Pipeline",
  "items": [
    {
      "title": "CI/CD Integration Test",
      "type": "task",
      "domain": "api",
      "context": "Pipeline step: build-and-test",
      "priority": "high",
      "status": "in-progress",
      "tags": ["automation", "ci"],
      "notes": "Verify end-to-end flow works"
    }
  ]
}
EOF

# Execute
meatycapture log create /tmp/capture.json --json
```

### Pattern 2: Parse and Process Results

```bash
# Capture and filter by tag
meatycapture log list my-project --json | \
  jq '.[] | select(.item_count > 2)' | \
  while read -r doc; do
    echo "Processing: $(echo $doc | jq -r '.doc_id')"
  done
```

### Pattern 3: Batch Operations

```bash
# Create multiple documents from array
cat > /tmp/batch.json << 'EOF'
{
  "captures": [
    {"project": "p1", "items": [...]},
    {"project": "p2", "items": [...]}
  ]
}
EOF

# Process batch
jq -c '.captures[]' /tmp/batch.json | while read -r capture; do
  echo "$capture" | meatycapture log create - --quiet && echo "OK" || echo "FAIL"
done
```

### Pattern 4: Conditional Capture (CI/CD)

```bash
# In GitHub Actions or similar
if [ "$CI_BUILD_STATUS" = "failed" ]; then
  jq '.build_info | {
    project: "ci-pipeline",
    items: [{
      title: "Build #\(.build_id) Failed",
      type: "bug",
      domain: "ci",
      context: "\(.branch)",
      priority: "high",
      status: "triage",
      tags: ["ci", "failed", .service],
      notes: "\(.error_message)"
    }]
  }' < $BUILD_INFO | meatycapture log create - --quiet
fi
```

## Success Metrics

- **Adoption**: CLI used in ≥2 CI/CD pipelines or automation workflows
- **Performance**: All commands complete within stated NFRs
- **Reliability**: Zero data loss in 100+ create/append operations
- **Test coverage**: ≥85% code coverage for CLI layer
- **Documentation**: CLI help text complete; example scripts provided

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Path conflicts on Windows | Medium | Test on WSL; use Path.resolve() consistently |
| Large document parsing | Low | Stream-based parsing for files >1MB (future optimization) |
| Concurrent CLI usage | Medium | Document last-write-wins; backup .bak created |
| Breaking changes to core models | High | Maintain strict backward compatibility; version models |

## Future Enhancements (Post-MVP)

- **v1.1**: Shell completion (bash/zsh), --interactive mode with prompts
- **v1.2**: Batch file operations (meatycapture batch create multiple-items.json)
- **v1.3**: Remote integration (git push after create, webhook notifications)
- **v1.4**: Performance optimizations (streaming parser for large docs)

## Dependencies & Integration Points

### Existing Codepaths Used

- `src/core/models/` - Project, RequestLogDoc, ItemDraft (no changes)
- `src/core/validation/` - ID generation, field validation (no changes)
- `src/core/serializer/` - Markdown parsing/generation (extended for JSON output)
- `src/adapters/fs-local/` - File read/write (already supports all operations)
- `src/adapters/config-local/` - Project and field catalog storage (already supports all operations)
- `src/adapters/clock/` - Time generation (already in use)

### New Dependencies

- `commander` v11+ (already in use, no changes)
- `chalk` v5+ (colored output for human mode, already in use)
- `table` v6+ (ASCII table formatting, optional)

### No New Storage Adapters

CLI uses existing adapters; future server CLI could introduce HTTP adapter.

## Appendix A: Command Quick Reference

```bash
# Logs
meatycapture log create input.json                    # Create new doc
meatycapture log append path/to/doc.md input.json     # Append items
meatycapture log list [project]                       # List docs
meatycapture log view path/to/doc.md                  # View document
meatycapture log search "tag:api" project             # Search documents
meatycapture log delete path/to/doc.md --force        # Delete document

# Projects
meatycapture project list                             # List all projects
meatycapture project add "Project Name" /path/to/dir  # Add project
meatycapture project update id --name "New Name"      # Update project
meatycapture project enable|disable id                # Enable/disable
meatycapture project set-default id                   # Set default

# Fields
meatycapture field list --field type --json           # List field options
meatycapture field add type "new-type" --project id   # Add option
meatycapture field remove opt-id                      # Remove option
meatycapture field import fields.json                 # Import batch

# Config
meatycapture config show                              # Show configuration
meatycapture config set default_project myproject     # Set config value
meatycapture config init                              # Initialize config
```

## Appendix B: Example Workflows

### Workflow 1: Daily standup capture (human)

```bash
# Interactive: select project, create new doc, add 3 items
meatycapture log create standup-input.json

# Review what was captured
meatycapture log view path/to/REQ-*.md --markdown
```

### Workflow 2: CI pipeline auto-capture (agent)

```bash
#!/bin/bash
# Create item if tests failed
if [ $TEST_EXIT_CODE -ne 0 ]; then
  cat > item.json << EOF
{
  "project": "myapp",
  "items": [{
    "title": "Test Suite Failed",
    "type": "bug",
    "domain": "ci",
    "context": "Build #$CI_BUILD_ID",
    "priority": "high",
    "status": "triage",
    "tags": ["ci", "test-failure"],
    "notes": "See logs at $CI_LOG_URL"
  }]
}
EOF
  meatycapture log create item.json --json
fi
```

### Workflow 3: Audit log aggregation (admin)

```bash
# Export all docs from project as JSON
meatycapture log list myproject --json | \
  jq '.[] | .path' | \
  xargs -I {} meatycapture log view {} --json | \
  jq -s 'map(.items) | flatten' > audit.json
```
