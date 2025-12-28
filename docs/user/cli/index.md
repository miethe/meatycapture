---
title: MeatyCapture CLI Overview
description: Quick start guide and overview of the MeatyCapture CLI for headless request-log document management
audience: developers, users
tags: [cli, getting-started, overview]
created: 2025-12-28
updated: 2025-12-28
category: CLI Reference
status: complete
---

# MeatyCapture CLI

Headless batch document creation and management for request-log documents. MeatyCapture CLI enables creating, appending, searching, and managing request-log documents without the UI—perfect for automation, scripting, and CI/CD pipelines.

## Installation

### From NPM

```bash
pnpm install -g @meaty/cli
```

### From Local Development

```bash
cd meatycapture
pnpm install
pnpm build
pnpm link
```

## Quick Start

### 1. Create Your First Project

```bash
# Interactive mode
meatycapture project add --interactive

# Or with explicit arguments
meatycapture project add "My Project" /path/to/docs --id my-project
```

### 2. Create a Request Log Document

```bash
# Interactive mode
meatycapture log create --interactive

# Or from JSON file
meatycapture log create input.json

# Or from stdin
echo '{"project":"my-project","items":[...]}' | meatycapture log create -
```

### 3. Append Items to Existing Document

```bash
meatycapture log append ./REQ-20251228-my-project.md input.json
```

### 4. Search and List Documents

```bash
# List all documents for a project
meatycapture log list my-project

# Search for items across all documents
meatycapture log search "enhancement" --type enhancement

# View a specific document
meatycapture log view ./REQ-20251228-my-project.md
```

## Command Groups

The CLI is organized into four command groups:

### log - Document Management

Create, append, view, search, list, and delete request-log documents.

```bash
meatycapture log <subcommand> [options]
```

**Subcommands:**
- `create` - Create a new document
- `append` - Append items to existing document
- `list` - List documents for a project
- `view` - Display a document
- `search` - Search items across documents
- `delete` - Delete a document

See: [Log Commands Reference](log-commands.md)

### project - Project Configuration

Manage projects in the MeatyCapture registry.

```bash
meatycapture project <subcommand> [options]
```

**Subcommands:**
- `list` - List all projects
- `add` - Create a new project
- `update` - Update project settings
- `enable` - Enable a project
- `disable` - Disable a project
- `set-default` - Set default project for current session

See: [Project Commands Reference](commands-reference.md#project-commands)

### field - Field Catalog Management

Manage field options for type, domain, context, priority, status, and tags.

```bash
meatycapture field <subcommand> [options]
```

**Subcommands:**
- `list` - List field options
- `add` - Add new field option
- `remove` - Remove field option
- `import` - Import field options from file

See: [Field Commands Reference](commands-reference.md#field-commands)

### config - Configuration Management

Manage global configuration and environment settings.

```bash
meatycapture config <subcommand> [options]
```

**Subcommands:**
- `show` - Display current configuration
- `set` - Set configuration value
- `init` - Initialize configuration directory

See: [Config Commands Reference](commands-reference.md#config-commands)

## Common Options

All commands support these options:

| Option | Description |
|--------|-------------|
| `-h, --help` | Show command help text |
| `-q, --quiet` | Suppress non-error output |
| `--json` | Output as JSON (machine-readable) |
| `--yaml` | Output as YAML format |
| `--csv` | Output as CSV (where applicable) |
| `--table` | Output as ASCII table (list/search only) |

## JSON Input Format

For file-based input, use this JSON structure:

```json
{
  "project": "my-project",
  "title": "Optional document title",
  "items": [
    {
      "title": "Item title",
      "type": "enhancement",
      "domain": "web",
      "context": "Provide context or problem statement",
      "priority": "medium",
      "status": "triage",
      "tags": ["tag1", "tag2"],
      "notes": "Detailed description or implementation notes"
    }
  ]
}
```

**Field Values:**
- `type`: enhancement, bug, documentation, refactor, performance, security
- `domain`: web, backend, devops, database, infrastructure
- `priority`: low, medium, high, critical
- `status`: triage, in-progress, review, done, backlog
- `tags`: Comma-separated list of custom tags

## Configuration

### Operating Modes

MeatyCapture supports two operating modes:

**Local Mode (Default)**
- Uses local filesystem storage at `~/.meatycapture/`
- No server required
- Data stored in JSON files (projects.json, fields.json, config.json)
- Perfect for single-user workflows and local development

**API Mode**
- Connects to a MeatyCapture server via HTTP
- Centralized storage for teams or multi-device usage
- Requires running MeatyCapture server
- All commands work identically in both modes

### Switching Between Modes

```bash
# Enable API mode
meatycapture config set api_url http://localhost:3737

# Verify mode
meatycapture config show
# Shows: Adapter Mode: api

# Disable API mode (return to local)
meatycapture config set api_url ''
# Or: meatycapture config set api_url none
```

### Default Paths

```bash
# Configuration directory
~/.meatycapture/

# Projects registry
~/.meatycapture/projects.json

# Field catalog
~/.meatycapture/fields.json

# Configuration
~/.meatycapture/config.json

# Documents (per project)
~/.meatycapture/docs/<project-id>/
```

### Environment Variables

```bash
# Override configuration directory
export MEATYCAPTURE_CONFIG_DIR=/custom/config/path

# Override default project
export MEATYCAPTURE_DEFAULT_PROJECT=my-project

# Override default document path for all projects
export MEATYCAPTURE_DEFAULT_PROJECT_PATH=/custom/docs/path

# Set API server URL (overrides config file)
export MEATYCAPTURE_API_URL=http://localhost:3737
```

See: [Configuration Guide](configuration.md)

## Output Formats

### Human (Default)

Human-readable format optimized for terminal output:

```bash
meatycapture log list my-project
```

### JSON

Machine-readable JSON format for scripting:

```bash
meatycapture log list my-project --json
```

### YAML

YAML format for configuration and CI/CD:

```bash
meatycapture log view doc.md --yaml
```

### CSV

CSV format for spreadsheet import:

```bash
meatycapture log search "bug" --csv
```

### Table

ASCII table format with borders:

```bash
meatycapture log list my-project --table
```

## Exit Codes

Commands use standardized exit codes for scripting:

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Validation error (invalid input) |
| `2` | I/O error (file system) |
| `3` | Resource conflict or not found |
| `64` | Command line usage error |
| `130` | User interrupted (Ctrl+C) |

See: [Exit Codes Reference](exit-codes.md)

## Common Workflows

### Initial Setup

```bash
# 1. Initialize configuration
meatycapture config init

# 2. Create first project
meatycapture project add --interactive

# 3. Configure field options (optional)
meatycapture field add --interactive
```

### Daily Capture

```bash
# Create JSON with today's items
cat > items.json << 'EOF'
{
  "project": "my-project",
  "items": [...]
}
EOF

# Create document
meatycapture log create items.json

# Or append to existing
meatycapture log append docs/REQ-20251228.md items.json
```

### Batch Processing

```bash
# Process multiple projects
for project in $(meatycapture project list --json | jq -r '.[].id'); do
  meatycapture log list "$project" --json | jq .
done
```

### CI/CD Integration

```bash
# In GitHub Actions, GitLab CI, etc.
meatycapture log create input.json \
  --quiet \
  --json > result.json

if [ $? -eq 0 ]; then
  echo "Document created successfully"
else
  echo "Failed to create document"
  exit 1
fi
```

## Backward Compatibility

For legacy scripts, flat command aliases are supported:

```bash
# Old style (still works)
meatycapture create input.json    # Alias: log create
meatycapture append doc.md in.json # Alias: log append
meatycapture list my-project       # Alias: log list

# New style (recommended)
meatycapture log create input.json
meatycapture log append doc.md in.json
meatycapture log list my-project
```

## Documentation

- **[Commands Reference](commands-reference.md)** - Complete command reference for all 19 commands
- **[Examples](examples.md)** - Common usage patterns and examples
- **[Workflows](workflows.md)** - End-to-end workflow guides
- **[Configuration](configuration.md)** - Configuration and environment setup
- **[Exit Codes](exit-codes.md)** - Exit code reference

## Getting Help

### Command Help

```bash
# General help
meatycapture --help

# Group help
meatycapture log --help
meatycapture project --help
meatycapture field --help
meatycapture config --help

# Specific command help
meatycapture log create --help
meatycapture project add --help
```

### Interactive Mode

Most commands support interactive mode for guided input:

```bash
meatycapture log create --interactive
meatycapture project add --interactive
meatycapture field add --interactive
```

## Version Information

Check the installed version:

```bash
meatycapture --version
```

Current version: **0.1.0**

## Related Documentation

- [Core Models](../design/models.md) - Data structure overview
- [Request-Log Format](../design/request-log-format.md) - Markdown document format
- [Project Status](../project_plans/initialization/README.md) - Overall project progress
