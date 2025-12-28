---
title: MeatyCapture CLI Configuration Guide
description: Complete guide to MeatyCapture configuration, environment variables, and file locations
audience: developers, users
tags: [cli, configuration, environment, setup]
created: 2025-12-28
updated: 2025-12-28
category: Guides
status: complete
---

# MeatyCapture CLI Configuration Guide

Complete guide to configuring MeatyCapture CLI, managing configuration files, and using environment variables.

---

## Configuration Overview

MeatyCapture operates in two modes:

### Local Mode (Default)

Local mode stores configuration and documents in a directory on your machine:

```
~/.meatycapture/                 # Configuration root
├── projects.json                # Project registry
├── fields.json                  # Global field catalog
├── config.json                  # Local configuration
└── docs/                        # Document storage
    ├── project-1/
    │   └── REQ-*.md
    ├── project-2/
    │   └── REQ-*.md
    └── ...
```

### API Mode

API mode connects the CLI to a remote MeatyCapture server:

- All commands work identically
- Projects, fields, and documents are stored on the server
- Configured via `api_url` setting or `MEATYCAPTURE_API_URL` environment variable
- Perfect for team collaboration and multi-device access
- Client-side config still stored locally (~/.meatycapture/config.json)

---

## Default Locations

### Configuration Directory

**Default:** `~/.meatycapture/`

The directory where all MeatyCapture configuration and documents are stored.

```bash
# View configuration directory
meatycapture config show --config-dir

# Output example:
# /home/user/.meatycapture
```

### Projects Registry

**Location:** `~/.meatycapture/projects.json`

Contains metadata for all projects (name, path, enabled status).

**Example:**
```json
{
  "projects": [
    {
      "id": "my-app",
      "name": "My Application",
      "default_path": "/home/user/projects/my-app/logs",
      "repo_url": "https://github.com/user/my-app",
      "enabled": true,
      "created_at": "2025-12-28T10:00:00Z",
      "updated_at": "2025-12-28T10:00:00Z"
    },
    {
      "id": "backend-api",
      "name": "Backend API",
      "default_path": "/home/user/projects/backend/logs",
      "repo_url": null,
      "enabled": true,
      "created_at": "2025-12-28T11:30:00Z",
      "updated_at": "2025-12-28T11:30:00Z"
    }
  ]
}
```

### Field Catalog

**Location:** `~/.meatycapture/fields.json`

Contains global field options and project-specific overrides.

**Example:**
```json
{
  "global": {
    "type": [
      "enhancement",
      "bug",
      "documentation",
      "refactor",
      "performance",
      "security"
    ],
    "domain": [
      "web",
      "backend",
      "devops",
      "database",
      "infrastructure"
    ],
    "priority": [
      "low",
      "medium",
      "high",
      "critical"
    ],
    "status": [
      "triage",
      "in-progress",
      "review",
      "done",
      "backlog"
    ],
    "context": [],
    "tags": []
  },
  "projects": {
    "my-app": {
      "type": ["spike", "tech-debt"],
      "priority": ["urgent"],
      "status": ["blocked"]
    }
  }
}
```

---

## Initialization

### First-Time Setup

```bash
# Initialize default configuration
meatycapture config init

# Creates:
# ~/.meatycapture/projects.json (empty)
# ~/.meatycapture/fields.json (with defaults)
```

### Custom Configuration Directory

```bash
# Set custom configuration directory
export MEATYCAPTURE_CONFIG_DIR=/custom/config/path
meatycapture config init

# Creates structure in custom location:
# /custom/config/path/projects.json
# /custom/config/path/fields.json
```

### Force Reinitialize

```bash
# Reinitialize, overwriting existing config
meatycapture config init --force
```

---

## Operating Modes

### Switching to API Mode

To use API mode instead of local storage, configure the API server URL:

```bash
# Enable API mode with server URL
meatycapture config set api_url http://localhost:3737

# Verify mode
meatycapture config show
# Output includes: Adapter Mode: api

# Disable API mode (return to local)
meatycapture config set api_url ''
meatycapture config set api_url 'none'
```

### Configuration Priority

When determining the API URL, the CLI checks in this order:

1. **Environment variable** - `MEATYCAPTURE_API_URL` (highest priority)
2. **Config file** - `api_url` in `~/.meatycapture/config.json`
3. **Local mode** - If neither is set, uses local filesystem (default)

### Using Environment Variable for API Mode

For temporary API mode without modifying your config file:

```bash
# Single command with API mode
MEATYCAPTURE_API_URL=http://localhost:3737 meatycapture log list my-project

# Set for entire shell session
export MEATYCAPTURE_API_URL=http://localhost:3737
meatycapture log list
meatycapture project list
meatycapture field list type

# Clear to return to local mode
unset MEATYCAPTURE_API_URL
```

### API Server Requirements

When using API mode, ensure:

- MeatyCapture server is running and accessible
- Server is listening on the configured URL
- Network connectivity between CLI and server
- Server is authorized if authentication is required

**Example server startup:**

```bash
# In terminal 1: Start MeatyCapture server
meatycapture serve --port 3737

# In terminal 2: Use API mode
export MEATYCAPTURE_API_URL=http://localhost:3737
meatycapture project list
```

### Local vs API Mode Comparison

| Feature | Local Mode | API Mode |
|---------|-----------|----------|
| Storage | Local filesystem | Remote server |
| Setup | Zero setup | Requires server |
| Collaboration | Single-user | Multi-user |
| Offline Access | Yes | No |
| Data Backup | Manual or scripted | Server-managed |
| Configuration | JSON files | JSON + server |
| Commands | All work | All work |

---

## Environment Variables

MeatyCapture respects standard environment variables for configuration override.

### MEATYCAPTURE_CONFIG_DIR

**Purpose:** Override configuration directory location

**Default:** `~/.meatycapture/`

```bash
# Set custom config directory
export MEATYCAPTURE_CONFIG_DIR=/etc/meatycapture

# Verify
meatycapture config show
```

**Use cases:**
- Corporate centralized configuration
- Docker/container deployments
- Multi-user systems with shared config

### MEATYCAPTURE_DEFAULT_PROJECT

**Purpose:** Set default project for commands

**Default:** Unset (must be specified with each command)

```bash
# Set default project
export MEATYCAPTURE_DEFAULT_PROJECT=my-app

# Now these are equivalent:
meatycapture log list my-app
meatycapture log list  # Uses MEATYCAPTURE_DEFAULT_PROJECT
```

**Use cases:**
- Single-project workflows
- CI/CD pipelines
- Shell aliases

### MEATYCAPTURE_DEFAULT_PROJECT_PATH

**Purpose:** Override default path for all projects

**Default:** Unset

```bash
# Set custom default path
export MEATYCAPTURE_DEFAULT_PROJECT_PATH=/data/logs

# Documents created without explicit path:
# /data/logs/project-id/REQ-*.md
```

**Use cases:**
- Network-mounted document storage
- Docker volume mapping
- Centralized document repository

### MEATYCAPTURE_API_URL

**Purpose:** Set API server URL for remote mode (overrides config file)

**Default:** Unset (uses local mode)

```bash
# Set API server URL
export MEATYCAPTURE_API_URL=http://localhost:3737

# All commands now use API mode
meatycapture log list my-project
meatycapture project list

# Clear to return to local mode
unset MEATYCAPTURE_API_URL
```

**Use cases:**
- Team collaboration on shared server
- Multi-device access to same data
- Temporary API mode without config changes
- CI/CD pipelines with centralized storage
- Docker/container deployments

**Priority:**
- Environment variable takes precedence over config file
- Allows temporary overrides without modifying persistent config
- Perfect for testing different servers

---

## Configuration Management Commands

### View Configuration

```bash
# Show all configuration
meatycapture config show

# Output (Local Mode):
# config_dir: /home/user/.meatycapture
# projects_file: /home/user/.meatycapture/projects.json
# fields_file: /home/user/.meatycapture/fields.json
# config_file: /home/user/.meatycapture/config.json
# default_project: my-app
# adapter_mode: local
# environment:
#   MEATYCAPTURE_CONFIG_DIR: null
#   MEATYCAPTURE_DEFAULT_PROJECT: my-app
#   MEATYCAPTURE_DEFAULT_PROJECT_PATH: null
#   MEATYCAPTURE_API_URL: null

# Output (API Mode):
# config_dir: /home/user/.meatycapture
# config_file: /home/user/.meatycapture/config.json
# api_url: http://localhost:3737
# default_project: my-app
# adapter_mode: api
# environment:
#   MEATYCAPTURE_CONFIG_DIR: null
#   MEATYCAPTURE_DEFAULT_PROJECT: null
#   MEATYCAPTURE_API_URL: http://localhost:3737
```

### JSON Output

```bash
# Get configuration as JSON
meatycapture config show --json

# Use with jq for processing
meatycapture config show --json | jq '.config_dir'
```

### Config Directory Only

```bash
# Get configuration directory path only
meatycapture config show --config-dir

# Use in scripts
CONFIG_DIR=$(meatycapture config show --config-dir)
echo "Configuration in: $CONFIG_DIR"
```

---

## Project Configuration

### Create Project

```bash
# Create project with default path
meatycapture project add "My App" /path/to/logs

# The project's default_path is now /path/to/logs
# New documents are created in: /path/to/logs/REQ-*.md
```

### Update Project

```bash
# Update project path
meatycapture project update my-app --path /new/path

# Update name
meatycapture project update my-app --name "New Project Name"

# Update repository
meatycapture project update my-app --repo-url https://github.com/new/repo
```

### View Project Configuration

```bash
# List all projects
meatycapture project list

# Get specific project as JSON
meatycapture project list --json | jq '.[] | select(.id == "my-app")'

# Output:
# {
#   "id": "my-app",
#   "name": "My Application",
#   "default_path": "/home/user/projects/my-app/logs",
#   "repo_url": "https://github.com/user/my-app",
#   "enabled": true,
#   "created_at": "2025-12-28T10:00:00Z",
#   "updated_at": "2025-12-28T10:00:00Z"
# }
```

### Enable/Disable Projects

```bash
# Disable a project (prevents document creation)
meatycapture project disable legacy-project

# Re-enable
meatycapture project enable legacy-project

# Check status
meatycapture project list --json | \
  jq '.[] | {id, name, enabled}'
```

---

## Field Catalog Configuration

### Global Field Options

Global options apply to all projects.

```bash
# Add global type option
meatycapture field add type "spike"

# Add global priority option
meatycapture field add priority "urgent"

# View global types
meatycapture field list type

# Output:
# enhancement
# bug
# documentation
# refactor
# performance
# security
# spike
```

### Project-Specific Options

Project-specific options override global ones for that project.

```bash
# Add project-specific priority
meatycapture field add priority "emergency" --project my-app

# View project options (effective = global + project-specific)
meatycapture field list priority --project my-app

# Remove project-specific option
meatycapture field remove priority "emergency" --project my-app --force
```

### Import Field Definitions

Import field options from file.

**fields.yaml:**
```yaml
type:
  - enhancement
  - bug
  - documentation

domain:
  - web
  - backend

priority:
  - low
  - medium
  - high
```

```bash
# Import to global catalog
meatycapture field import fields.yaml

# Import to project
meatycapture field import fields.yaml --project my-app

# Merge with existing (don't replace)
meatycapture field import fields.yaml --merge
```

### Export Field Configuration

```bash
# List fields as JSON
meatycapture field list type --json

# Create YAML export
{
  echo "type:"
  meatycapture field list type --json | \
    jq -r '.[] | "  - \(.value)"'
} > exported-fields.yaml
```

---

## Path Configuration

### Document Paths

Documents are stored in project-specific directories:

**Pattern:** `<default_path>/REQ-YYYYMMDD-<project-id>.md`

```bash
# Project default_path
/home/user/projects/my-app/logs

# Document location
/home/user/projects/my-app/logs/REQ-20251228-my-app.md
```

### Custom Output Paths

Override document location with --output flag:

```bash
# Create document at specific path
meatycapture log create items.json \
  --output /custom/location/my-document.md

# Document created at: /custom/location/my-document.md
```

### Path Resolution Order

When creating documents, paths are resolved in this order:

1. **Explicit `--output` flag** (if provided)
2. **Project's `default_path`** (from projects.json)
3. **MEATYCAPTURE_DEFAULT_PROJECT_PATH** env var (if set)
4. **Default:** `~/.meatycapture/docs/<project-id>/`

---

## Shell Configuration

### Bash/Zsh Profile

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# MeatyCapture configuration
export MEATYCAPTURE_CONFIG_DIR="$HOME/.meatycapture"
export MEATYCAPTURE_DEFAULT_PROJECT="my-app"

# Add CLI alias for quick access
alias mc='meatycapture'
alias mclog='meatycapture log'
alias mcproj='meatycapture project'
```

### Fish Shell

Add to `~/.config/fish/config.fish`:

```fish
# MeatyCapture configuration
set -gx MEATYCAPTURE_CONFIG_DIR "$HOME/.meatycapture"
set -gx MEATYCAPTURE_DEFAULT_PROJECT "my-app"

# Aliases
alias mc='meatycapture'
alias mclog='meatycapture log'
```

### PowerShell

Add to `$PROFILE`:

```powershell
# MeatyCapture configuration
$env:MEATYCAPTURE_CONFIG_DIR = "$HOME\.meatycapture"
$env:MEATYCAPTURE_DEFAULT_PROJECT = "my-app"

# Aliases
Set-Alias -Name mc -Value meatycapture
Set-Alias -Name mclog -Value "meatycapture log"
```

---

## Docker Configuration

### Environment Variables in Container

```dockerfile
FROM node:18-alpine

RUN npm install -g @meaty/cli

ENV MEATYCAPTURE_CONFIG_DIR=/etc/meatycapture
ENV MEATYCAPTURE_DEFAULT_PROJECT_PATH=/data/logs

WORKDIR /app

ENTRYPOINT ["meatycapture"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  meatycapture:
    image: node:18-alpine
    environment:
      MEATYCAPTURE_CONFIG_DIR: /etc/meatycapture
      MEATYCAPTURE_DEFAULT_PROJECT_PATH: /data/logs
      MEATYCAPTURE_DEFAULT_PROJECT: my-app
    volumes:
      - ./config:/etc/meatycapture
      - ./logs:/data/logs
    working_dir: /app
    command: sh
```

---

## Backup and Recovery

### Backup Configuration

```bash
# Backup all configuration
cp -r ~/.meatycapture ~/.meatycapture.backup

# Backup specific files
cp ~/.meatycapture/projects.json ~/.meatycapture/projects.json.bak
cp ~/.meatycapture/fields.json ~/.meatycapture/fields.json.bak
```

### Automatic Backups

Documents created by `log create` and `log append` automatically create backups:

```bash
# Before overwriting, backup created:
REQ-20251228-my-app.md          # New document
REQ-20251228-my-app.md.bak      # Previous version backup

# Disable backup with --no-backup flag
meatycapture log create items.json --no-backup
```

### Restore from Backup

```bash
# Restore configuration
rm -r ~/.meatycapture
cp -r ~/.meatycapture.backup ~/.meatycapture

# Restore specific project
cp ~/.meatycapture/projects.json.bak ~/.meatycapture/projects.json

# Restore document
cp REQ-20251228.md.bak REQ-20251228.md
```

---

## Migration and Upgrade

### Move Configuration to New Location

```bash
# Stop using old location
OLD_DIR="~/.meatycapture"
NEW_DIR="/new/config/location"

# Copy everything
cp -r "$OLD_DIR" "$NEW_DIR"

# Update environment
export MEATYCAPTURE_CONFIG_DIR="$NEW_DIR"

# Verify
meatycapture config show

# Update shell profile
echo 'export MEATYCAPTURE_CONFIG_DIR="'"$NEW_DIR"'"' >> ~/.bashrc

# Remove old location (optional)
# rm -r "$OLD_DIR"
```

### Centralize Multiple Users' Configs

```bash
# Create shared config directory
SHARED="/data/meatycapture-config"
mkdir -p "$SHARED"
chmod 755 "$SHARED"

# Copy user configs
for user in alice bob charlie; do
  cp -r /home/$user/.meatycapture "$SHARED/$user-config"
done

# Set environment for all users
echo 'export MEATYCAPTURE_CONFIG_DIR=/data/meatycapture-config/$(whoami)-config' \
  | tee -a /etc/profile.d/meatycapture.sh
```

---

## Troubleshooting

### Config Not Found

```bash
# Check configuration directory
meatycapture config show

# If path is wrong, set environment variable
export MEATYCAPTURE_CONFIG_DIR="/correct/path"

# Reinitialize if missing
meatycapture config init
```

### Permission Denied

```bash
# Check directory permissions
ls -la ~/.meatycapture

# Fix permissions
chmod 755 ~/.meatycapture
chmod 644 ~/.meatycapture/*.json

# Check file permissions
stat ~/.meatycapture/projects.json
```

### Projects Not Found

```bash
# Verify projects.json exists
test -f ~/.meatycapture/projects.json && echo "Found" || echo "Missing"

# Reinitialize if corrupted
meatycapture config init --force
```

### Environment Variables Not Applied

```bash
# Verify variables are set
echo $MEATYCAPTURE_CONFIG_DIR
echo $MEATYCAPTURE_DEFAULT_PROJECT

# Make sure they're exported
export MEATYCAPTURE_CONFIG_DIR=/path

# Check in subshell
bash -c 'echo $MEATYCAPTURE_CONFIG_DIR'
```

---

## Best Practices

1. **Backup Configuration Regularly**
   ```bash
   # Weekly backup
   cp -r ~/.meatycapture ~/.meatycapture.$(date +%Y%m%d)
   ```

2. **Use Environment Variables for CI/CD**
   ```bash
   # Don't hardcode paths
   export MEATYCAPTURE_CONFIG_DIR="${CONFIG_DIR:-.meatycapture}"
   ```

3. **Version Control Configuration**
   ```bash
   # Track field definitions in git
   git add .meatycapture/fields.json
   git add .meatycapture/projects.json
   ```

4. **Separate Global and Project Fields**
   - Global fields: standard types, priorities, domains
   - Project fields: project-specific options, custom statuses

5. **Use Custom IDs for Portability**
   ```bash
   # Use slugified project IDs for scripts
   meatycapture project add "My App Name" /path --id my-app
   ```

---

## Related Documentation

- [Quick Start Guide](index.md)
- [Commands Reference](commands-reference.md)
- [Workflows](workflows.md)
- [Examples](examples.md)
