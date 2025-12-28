---
title: MeatyCapture CLI Commands Reference
description: Complete reference for all 19 MeatyCapture CLI commands with signatures, options, and examples
audience: developers, users
tags: [cli, commands, reference, complete]
created: 2025-12-28
updated: 2025-12-28
category: CLI Reference
status: complete
---

# MeatyCapture CLI Commands Reference

Complete reference for all 19 MeatyCapture CLI commands organized by command group.

## Overview

| Group | Commands | Purpose |
|-------|----------|---------|
| `log` | 6 | Document management (create, append, list, view, search, delete) |
| `project` | 6 | Project configuration (list, add, update, enable, disable, set-default) |
| `field` | 4 | Field catalog management (list, add, remove, import) |
| `config` | 3 | Configuration management (show, set, init) |
| **Total** | **19** | - |

## Common Options

All commands support these options:

| Option | Description |
|--------|-------------|
| `-h, --help` | Show command help text |
| `-q, --quiet` | Suppress non-error output (most commands) |
| `--json` | Output as JSON format |
| `--yaml` | Output as YAML format |
| `--csv` | Output as CSV format (applicable commands) |
| `--table` | Output as ASCII table (list/search only) |

---

# LOG COMMANDS

## log create

Create a new request-log document from JSON input or interactive prompts.

### Signature

```bash
meatycapture log create [json-file] [options]
meatycapture log create --interactive [options]
meatycapture create [json-file] [options]  # Legacy alias
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `json-file` | string | No (with --interactive) | Path to JSON input file or `-` for stdin |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-i, --interactive` | boolean | false | Interactive guided prompts |
| `-o, --output <path>` | string | auto-generated | Output path for the document |
| `--json` | boolean | false | Output result as JSON |
| `--yaml` | boolean | false | Output result as YAML |
| `--csv` | boolean | false | Output result as CSV |
| `--table` | boolean | false | Output result as table |
| `-q, --quiet` | boolean | false | Suppress output |
| `--no-backup` | boolean | false | Skip backup creation |

### Input Format

```json
{
  "project": "project-id",
  "title": "Optional document title",
  "items": [
    {
      "title": "Item title",
      "type": "enhancement",
      "domain": "web",
      "context": "Problem or goal statement",
      "priority": "medium",
      "status": "triage",
      "tags": ["tag1", "tag2"],
      "notes": "Detailed description"
    }
  ]
}
```

### Examples

```bash
# Interactive mode
meatycapture log create --interactive

# From JSON file
meatycapture log create items.json

# From stdin
echo '{"project":"app","items":[...]}' | meatycapture log create -

# With custom output path
meatycapture log create items.json --output /custom/path/REQ-20251228.md

# JSON output
meatycapture log create items.json --json

# Multiple items in one document
meatycapture log create items.json --quiet
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Document created successfully |
| 1 | Validation error (invalid JSON or structure) |
| 2 | I/O error (path not writable) |
| 3 | Resource conflict |
| 64 | Command line usage error |
| 130 | User interrupted |

---

## log append

Append items to an existing request-log document.

### Signature

```bash
meatycapture log append <doc-path> <json-file> [options]
meatycapture append <doc-path> <json-file> [options]  # Legacy alias
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `doc-path` | string | Path to existing request-log document |
| `json-file` | string | Path to JSON file with items to append or `-` for stdin |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output result as JSON |
| `--yaml` | boolean | false | Output result as YAML |
| `--csv` | boolean | false | Output result as CSV |
| `--table` | boolean | false | Output result as table |
| `-q, --quiet` | boolean | false | Suppress output |
| `--no-backup` | boolean | false | Skip backup creation |

### Input Format

```json
{
  "project": "project-id",
  "items": [
    {
      "title": "Item title",
      "type": "bug",
      "domain": "backend",
      "context": "Context or problem description",
      "priority": "high",
      "status": "in-progress",
      "tags": ["critical"],
      "notes": "Implementation notes"
    }
  ]
}
```

### Examples

```bash
# Append from file
meatycapture log append ./REQ-20251228-app.md items.json

# Append from stdin
cat items.json | meatycapture log append ./doc.md -

# Suppress output
meatycapture log append ./doc.md items.json --quiet

# JSON output
meatycapture log append ./doc.md items.json --json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Items appended successfully |
| 1 | Validation error (invalid JSON) |
| 2 | I/O error (document not found or not writable) |
| 4 | Resource not found (document doesn't exist) |
| 64 | Command line usage error |

---

## log list

List request-log documents for a project or directory.

### Signature

```bash
meatycapture log list [project-id] [options]
meatycapture list [project-id] [options]  # Legacy alias
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `project-id` | string | No | Project identifier (uses default if omitted) |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-p, --path <path>` | string | project default_path | Custom directory to search |
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `--csv` | boolean | false | Output as CSV |
| `--table` | boolean | false | Output as table |
| `-q, --quiet` | boolean | false | Suppress output |
| `--sort <field>` | string | date | Sort by: name, date, or items |
| `--reverse` | boolean | false | Reverse sort order |
| `--limit <num>` | string | unlimited | Limit results to N documents |

### Examples

```bash
# List all documents for a project
meatycapture log list my-project

# List with custom directory
meatycapture log list --path ~/Documents/logs

# List with sorting
meatycapture log list my-project --sort name --reverse

# Limit results
meatycapture log list my-project --limit 10

# JSON output for scripting
meatycapture log list my-project --json

# Table format
meatycapture log list my-project --table

# CSV export
meatycapture log list my-project --csv
```

### Output Structure

```json
[
  {
    "doc_id": "REQ-20251228-my-project",
    "title": "Request Log - my-project",
    "path": "/home/user/.meatycapture/docs/my-project/REQ-20251228-my-project.md",
    "item_count": 5,
    "tags": ["enhancement", "bug"],
    "created_at": "2025-12-28T10:30:00Z",
    "updated_at": "2025-12-28T10:30:00Z"
  }
]
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (even if no documents found) |
| 2 | I/O error (directory not accessible) |
| 4 | Project not found |

---

## log view

Display a request-log document in human-readable format.

### Signature

```bash
meatycapture log view <doc-path> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `doc-path` | string | Path to request-log document |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `--csv` | boolean | false | Output as CSV |
| `--raw` | boolean | false | Output raw markdown |
| `-q, --quiet` | boolean | false | Suppress non-error output |

### Examples

```bash
# View formatted document
meatycapture log view ./REQ-20251228-app.md

# View as JSON
meatycapture log view ./doc.md --json

# View as YAML
meatycapture log view ./doc.md --yaml

# View raw markdown
meatycapture log view ./doc.md --raw
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 2 | I/O error (file not found or not readable) |
| 1 | Parse error (invalid document format) |

---

## log search

Search for items across request-log documents.

### Signature

```bash
meatycapture log search <query> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `query` | string | Search term (title, notes, tags) |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-p, --path <path>` | string | current dir | Directory to search |
| `--type <value>` | string | - | Filter by item type |
| `--domain <value>` | string | - | Filter by domain |
| `--priority <value>` | string | - | Filter by priority |
| `--status <value>` | string | - | Filter by status |
| `--tag <value>` | string | - | Filter by tag |
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `--csv` | boolean | false | Output as CSV |
| `--table` | boolean | false | Output as table |
| `-q, --quiet` | boolean | false | Suppress output |
| `--limit <num>` | string | unlimited | Limit results |

### Examples

```bash
# Simple text search
meatycapture log search "authentication"

# Search with filters
meatycapture log search "bug" --type bug --priority high

# Search by tag
meatycapture log search "" --tag "critical"

# Search in specific directory
meatycapture log search "API" --path ~/logs

# JSON output
meatycapture log search "enhancement" --json

# Limit results
meatycapture log search "fix" --limit 5 --table
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (even if no matches) |
| 1 | Validation error |
| 2 | I/O error (directory not accessible) |

---

## log delete

Delete a request-log document with optional backup.

### Signature

```bash
meatycapture log delete <doc-path> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `doc-path` | string | Path to request-log document |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-f, --force` | boolean | false | Skip confirmation prompt |
| `--no-backup` | boolean | false | Don't create backup |
| `-q, --quiet` | boolean | false | Suppress output |

### Examples

```bash
# Delete with confirmation
meatycapture log delete ./REQ-20251228-app.md

# Force delete without confirmation
meatycapture log delete ./doc.md --force

# Delete without backup
meatycapture log delete ./doc.md --force --no-backup

# Quiet mode
meatycapture log delete ./doc.md --force --quiet
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Document deleted |
| 2 | I/O error (file not found) |
| 130 | User cancelled |

---

# PROJECT COMMANDS

## project list

List all projects in the registry.

### Signature

```bash
meatycapture project list [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `--csv` | boolean | false | Output as CSV |
| `--table` | boolean | false | Output as table |
| `-q, --quiet` | boolean | false | Suppress output |
| `--enabled-only` | boolean | false | Show enabled projects only |

### Examples

```bash
# List all projects
meatycapture project list

# JSON output for scripting
meatycapture project list --json

# Show only enabled projects
meatycapture project list --enabled-only

# Table format
meatycapture project list --table
```

### Output Structure

```json
[
  {
    "id": "my-project",
    "name": "My Project",
    "default_path": "/home/user/.meatycapture/docs/my-project",
    "repo_url": "https://github.com/user/repo",
    "enabled": true,
    "created_at": "2025-12-28T10:00:00Z",
    "updated_at": "2025-12-28T10:00:00Z"
  }
]
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |

---

## project add

Create a new project in the registry.

### Signature

```bash
meatycapture project add <name> <path> [options]
meatycapture project add --interactive [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | No (with --interactive) | Project display name |
| `path` | string | No (with --interactive) | Default document path |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--id <id>` | string | auto-generated | Custom project ID (kebab-case) |
| `--repo-url <url>` | string | - | Repository URL |
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `-q, --quiet` | boolean | false | Suppress output |
| `-i, --interactive` | boolean | false | Interactive prompts |

### Examples

```bash
# Interactive mode
meatycapture project add --interactive

# With explicit arguments
meatycapture project add "My Project" /path/to/docs

# With custom ID
meatycapture project add "My Project" /path/to/docs --id my-project

# With repository URL
meatycapture project add "My Project" /path/to/docs --repo-url https://github.com/user/repo

# JSON output
meatycapture project add "My Project" /path/to/docs --json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Project created |
| 1 | Validation error (invalid input) |
| 2 | I/O error (path not writable) |
| 3 | Resource conflict (ID already exists) |

---

## project update

Update project settings.

### Signature

```bash
meatycapture project update <project-id> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `project-id` | string | Project identifier |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--name <name>` | string | New project name |
| `--path <path>` | string | New default path |
| `--repo-url <url>` | string | New repository URL |
| `--json` | boolean | Output as JSON |
| `--yaml` | boolean | Output as YAML |
| `-q, --quiet` | boolean | Suppress output |

### Examples

```bash
# Update project name
meatycapture project update my-project --name "New Name"

# Update path
meatycapture project update my-project --path /new/path

# Update repository
meatycapture project update my-project --repo-url https://github.com/user/new-repo

# Multiple updates
meatycapture project update my-project --name "New Name" --path /new/path

# JSON output
meatycapture project update my-project --name "New Name" --json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Project updated |
| 1 | Validation error |
| 4 | Project not found |

---

## project enable

Enable a project (allow document creation).

### Signature

```bash
meatycapture project enable <project-id> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `project-id` | string | Project identifier |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--json` | boolean | Output as JSON |
| `-q, --quiet` | boolean | Suppress output |

### Examples

```bash
# Enable project
meatycapture project enable my-project

# JSON output
meatycapture project enable my-project --json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Project enabled |
| 4 | Project not found |

---

## project disable

Disable a project (prevent document creation).

### Signature

```bash
meatycapture project disable <project-id> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `project-id` | string | Project identifier |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--json` | boolean | Output as JSON |
| `-q, --quiet` | boolean | Suppress output |

### Examples

```bash
# Disable project
meatycapture project disable my-project

# JSON output
meatycapture project disable my-project --json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Project disabled |
| 4 | Project not found |

---

## project set-default

Set the default project for the current shell session.

### Signature

```bash
meatycapture project set-default <project-id> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `project-id` | string | Project identifier |

### Options

| Option | Type | Description |
|--------|------|-------------|
| `--json` | boolean | Output as JSON |
| `-q, --quiet` | boolean | Suppress output |

### Examples

```bash
# Set default project
meatycapture project set-default my-project

# Use in shell session
export MEATYCAPTURE_DEFAULT_PROJECT=my-project
meatycapture log list  # Uses my-project

# JSON output
meatycapture project set-default my-project --json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Default set |
| 4 | Project not found |

---

# FIELD COMMANDS

## field list

List field options for a specific field.

### Signature

```bash
meatycapture field list <field-name> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `field-name` | string | Field name: type, domain, context, priority, status, or tags |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--project <id>` | string | - | Show project-specific options |
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `--csv` | boolean | false | Output as CSV |
| `--table` | boolean | false | Output as table |
| `-q, --quiet` | boolean | false | Suppress output |

### Examples

```bash
# List global type options
meatycapture field list type

# List project-specific options
meatycapture field list type --project my-project

# JSON output
meatycapture field list type --json

# Table format
meatycapture field list priority --table

# List all tags
meatycapture field list tags --project my-project
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Invalid field name |
| 4 | Project not found (with --project) |

---

## field add

Add a new option to a field catalog.

### Signature

```bash
meatycapture field add <field-name> <value> [options]
meatycapture field add --interactive [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `field-name` | string | No (with --interactive) | Field name |
| `value` | string | No (with --interactive) | Option value |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--project <id>` | string | global | Add to project-specific catalog |
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `-q, --quiet` | boolean | false | Suppress output |
| `-i, --interactive` | boolean | false | Interactive prompts |

### Examples

```bash
# Interactive mode
meatycapture field add --interactive

# Add global option
meatycapture field add type "investigation"

# Add project-specific option
meatycapture field add priority "urgent" --project my-project

# JSON output
meatycapture field add type "spike" --json

# Add tag (multi-value field)
meatycapture field add tags "breaking-change"
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Option added |
| 1 | Validation error (invalid field or empty value) |
| 3 | Duplicate (option already exists) |
| 4 | Project not found |

---

## field remove

Remove an option from a field catalog.

### Signature

```bash
meatycapture field remove <field-name> <value> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `field-name` | string | Field name |
| `value` | string | Option value to remove |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--project <id>` | string | global | Remove from project-specific catalog |
| `-f, --force` | boolean | false | Skip confirmation |
| `-q, --quiet` | boolean | false | Suppress output |

### Examples

```bash
# Remove global option with confirmation
meatycapture field remove type "old-type"

# Force remove without confirmation
meatycapture field remove type "old-type" --force

# Remove project-specific option
meatycapture field remove priority "low" --project my-project --force

# Quiet mode
meatycapture field remove tags "obsolete" --force --quiet
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Option removed |
| 1 | Validation error (invalid field) |
| 4 | Option not found |
| 130 | User cancelled |

---

## field import

Import field options from a JSON or YAML file.

### Signature

```bash
meatycapture field import <file> [options]
meatycapture field import --interactive [options]
```

### Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `file` | string | No (with --interactive) | Path to import file or `-` for stdin |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--project <id>` | string | global | Import to project-specific catalog |
| `--merge` | boolean | false | Merge with existing (don't replace) |
| `-i, --interactive` | boolean | false | Interactive prompts |
| `-q, --quiet` | boolean | false | Suppress output |

### Import File Format

```yaml
# fields.yaml
type:
  - enhancement
  - bug
  - refactor
  - documentation

domain:
  - web
  - backend
  - devops

priority:
  - low
  - medium
  - high
  - critical
```

### Examples

```bash
# Import from file
meatycapture field import fields.yaml

# Import and merge
meatycapture field import fields.yaml --merge

# Import to project
meatycapture field import fields.yaml --project my-project

# Import from stdin
cat fields.yaml | meatycapture field import -

# Interactive selection
meatycapture field import --interactive
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Import successful |
| 1 | Validation error (invalid file format) |
| 2 | I/O error (file not found) |
| 4 | Project not found |

---

# CONFIG COMMANDS

## config show

Display current configuration and environment settings.

### Signature

```bash
meatycapture config show [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `--yaml` | boolean | false | Output as YAML |
| `-q, --quiet` | boolean | false | Suppress output |
| `--config-dir` | boolean | false | Show config directory only |

### Examples

```bash
# Show all configuration
meatycapture config show

# JSON output
meatycapture config show --json

# YAML output
meatycapture config show --yaml

# Config directory only
meatycapture config show --config-dir
```

### Output Structure

**Local Mode:**
```json
{
  "config_dir": "/home/user/.meatycapture",
  "projects_file": "/home/user/.meatycapture/projects.json",
  "fields_file": "/home/user/.meatycapture/fields.json",
  "config_file": "/home/user/.meatycapture/config.json",
  "default_project": "my-project",
  "adapter_mode": "local",
  "environment": {
    "MEATYCAPTURE_CONFIG_DIR": null,
    "MEATYCAPTURE_DEFAULT_PROJECT": null,
    "MEATYCAPTURE_DEFAULT_PROJECT_PATH": null,
    "MEATYCAPTURE_API_URL": null
  }
}
```

**API Mode:**
```json
{
  "config_dir": "/home/user/.meatycapture",
  "config_file": "/home/user/.meatycapture/config.json",
  "api_url": "http://localhost:3737",
  "default_project": "my-project",
  "adapter_mode": "api",
  "environment": {
    "MEATYCAPTURE_CONFIG_DIR": null,
    "MEATYCAPTURE_DEFAULT_PROJECT": null,
    "MEATYCAPTURE_DEFAULT_PROJECT_PATH": null,
    "MEATYCAPTURE_API_URL": "http://localhost:3737"
  }
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (always) |

---

## config set

Set a configuration value.

### Signature

```bash
meatycapture config set <key> <value> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `key` | string | Configuration key |
| `value` | string | Configuration value |

### Supported Keys

| Key | Description |
|-----|-------------|
| `default_project` | Default project ID for commands without explicit project |
| `api_url` | API server URL for remote mode (empty string or 'none' to disable) |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--json` | boolean | false | Output as JSON |
| `-q, --quiet` | boolean | false | Suppress output |

### Examples

```bash
# Set default project
meatycapture config set default_project my-project

# Enable API mode with server URL
meatycapture config set api_url http://localhost:3737

# Verify mode changed
meatycapture config show

# Disable API mode (switch back to local)
meatycapture config set api_url ''
meatycapture config set api_url 'none'

# Clear setting (quiet mode)
meatycapture config set default_project '' --quiet
```

### API Mode Configuration

```bash
# Set different API servers
meatycapture config set api_url http://api.example.com:3737
meatycapture config set api_url https://meatycapture.internal.corp

# Temporary override via environment variable (doesn't modify config)
export MEATYCAPTURE_API_URL=http://localhost:3737
meatycapture log list

# Environment variable takes precedence over config file
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Setting updated |
| 1 | Validation error (invalid key or value) |

---

## config init

Initialize configuration directory and files.

### Signature

```bash
meatycapture config init [options]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--force` | boolean | false | Overwrite existing config |
| `-q, --quiet` | boolean | false | Suppress output |

### Examples

```bash
# Initialize default configuration
meatycapture config init

# Force reinitialize
meatycapture config init --force

# Quiet mode
meatycapture config init --quiet
```

### Created Files

```
~/.meatycapture/
├── projects.json      # Empty project registry
└── fields.json        # Default field catalog
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Initialization successful |
| 2 | I/O error (directory not writable) |
| 3 | Already initialized (without --force) |

---

## Related Documentation

- [Quick Start Guide](index.md)
- [Examples](examples.md)
- [Workflows](workflows.md)
- [Configuration Guide](configuration.md)
- [Exit Codes Reference](exit-codes.md)
