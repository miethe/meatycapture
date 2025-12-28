---
title: MeatyCapture CLI Workflows
description: End-to-end workflow guides for common MeatyCapture CLI usage patterns
audience: developers, users
tags: [cli, workflows, guides, how-to]
created: 2025-12-28
updated: 2025-12-28
category: Guides
status: complete
---

# MeatyCapture CLI Workflows

Complete end-to-end workflow guides for common MeatyCapture CLI usage patterns.

---

## Workflow 1: Initial Setup

Get MeatyCapture CLI configured and create your first project.

### Prerequisites

- MeatyCapture CLI installed globally
- Desired project directory path ready

### Steps

#### 1. Initialize Configuration

```bash
# Initialize default configuration directory and files
meatycapture config init

# Verify configuration
meatycapture config show
```

**Output:**
```
config_dir: /home/user/.meatycapture
projects_file: /home/user/.meatycapture/projects.json
fields_file: /home/user/.meatycapture/fields.json
default_project: null
```

#### 2. Create First Project

**Option A: Interactive Mode**

```bash
# Start interactive project creation
meatycapture project add --interactive
```

**Prompts:**
```
Project name: My App
Project path: /home/user/projects/my-app/logs
Use custom ID? (y/N): n
Project ID (auto-generated): my-app
Repository URL (optional): https://github.com/user/my-app

Created project: my-app
```

**Option B: Command Line**

```bash
# Create with explicit arguments
meatycapture project add \
  "My App" \
  /home/user/projects/my-app/logs \
  --repo-url https://github.com/user/my-app
```

#### 3. Verify Setup

```bash
# List projects
meatycapture project list --table

# View project details
meatycapture project list --json | jq '.[] | select(.id == "my-app")'
```

#### 4. Configure Field Options (Optional)

```bash
# Add custom field options for your project
meatycapture field add --interactive

# Add multiple options
meatycapture field add type "spike" --project my-app
meatycapture field add domain "mobile" --project my-app
meatycapture field add priority "urgent" --project my-app
```

#### 5. Set Default Project

```bash
# Set default project for shell session
export MEATYCAPTURE_DEFAULT_PROJECT=my-app

# Verify
meatycapture config show
```

### Verification

```bash
# List all projects (should show my-app)
meatycapture project list

# View default project
meatycapture config show --json | jq '.default_project'
```

---

## Workflow 2: Daily Capture

Log ideas, bugs, and enhancements throughout the day.

### Quick Start

#### 1. Prepare Items File

```bash
# Create items.json with today's entries
cat > items.json << 'EOF'
{
  "project": "my-app",
  "items": [
    {
      "title": "Add dark mode support",
      "type": "enhancement",
      "domain": "web",
      "context": "Users requested dark mode for better accessibility",
      "priority": "medium",
      "status": "backlog",
      "tags": ["ux", "accessibility"],
      "notes": "Consider using CSS custom properties for theme switching"
    },
    {
      "title": "Fix login timeout issue",
      "type": "bug",
      "domain": "backend",
      "context": "Session expires too quickly on slow connections",
      "priority": "high",
      "status": "triage",
      "tags": ["critical"],
      "notes": "Increase default timeout from 15 to 30 minutes"
    }
  ]
}
EOF
```

#### 2. Create New Document (First Capture)

```bash
# Create new request-log for today
meatycapture log create items.json

# Or with interactive mode
meatycapture log create --interactive
```

**Output:**
```
Created: /home/user/.meatycapture/docs/my-app/REQ-20251228-my-app.md
```

#### 3. Append Items (Throughout Day)

```bash
# Later, add more items to same document
cat > afternoon-items.json << 'EOF'
{
  "project": "my-app",
  "items": [
    {
      "title": "Review payment integration",
      "type": "review",
      "domain": "backend",
      "context": "Third-party payment provider changed API",
      "priority": "high",
      "status": "in-progress",
      "tags": ["payment", "integration"],
      "notes": "Check new webhook format"
    }
  ]
}
EOF

# Append to existing document
meatycapture log append ./REQ-20251228-my-app.md afternoon-items.json

# Verify append
meatycapture log view ./REQ-20251228-my-app.md
```

### Quick Daily Patterns

**Single item append:**
```bash
echo '{
  "project": "my-app",
  "items": [{
    "title": "Quick fix needed",
    "type": "bug",
    "domain": "web",
    "context": "Description",
    "priority": "high",
    "status": "triage",
    "tags": ["urgent"],
    "notes": "Details"
  }]
}' | meatycapture log append ./REQ-20251228-my-app.md -
```

**From template file:**
```bash
# Create daily template
cat > template.json << 'EOF'
{
  "project": "my-app",
  "items": [
    {
      "title": "TODO: Fill in title",
      "type": "enhancement",
      "domain": "web",
      "context": "TODO: Context",
      "priority": "medium",
      "status": "triage",
      "tags": [],
      "notes": "TODO: Notes"
    }
  ]
}
EOF

# Edit template each day
meatycapture log create template.json
```

---

## Workflow 3: Review and Search

Find and analyze logged items.

### Find Items by Criteria

#### Search by Text

```bash
# Find all items mentioning "payment"
meatycapture log search "payment" \
  --path /home/user/.meatycapture/docs/my-app

# Search across all projects
meatycapture log search "critical" \
  --path /home/user/.meatycapture/docs
```

#### Filter by Type

```bash
# Find all bugs
meatycapture log search "" --type bug \
  --path /home/user/.meatycapture/docs/my-app

# Find high-priority items
meatycapture log search "" --priority high --table
```

#### Combine Filters

```bash
# Bugs that are high priority in web domain
meatycapture log search "" \
  --type bug \
  --priority high \
  --domain web \
  --table
```

#### Tag-Based Search

```bash
# Find all items with "critical" tag
meatycapture log search "" --tag critical --json

# Export critical items to CSV
meatycapture log search "" \
  --tag critical \
  --csv > critical-items.csv
```

### View and Analyze Documents

#### List Recent Documents

```bash
# List documents for a project, newest first
meatycapture log list my-app --sort date

# Last 5 documents
meatycapture log list my-app --sort date --limit 5 --reverse
```

#### View Document Details

```bash
# Human-readable format
meatycapture log view ./REQ-20251228-my-app.md

# JSON for processing
meatycapture log view ./REQ-20251228-my-app.md --json

# YAML for configuration
meatycapture log view ./REQ-20251228-my-app.md --yaml

# Raw markdown
meatycapture log view ./REQ-20251228-my-app.md --raw
```

### Export for Analysis

```bash
# Export all documents as JSON
meatycapture log list my-app --json > project-docs.json

# Export search results as CSV
meatycapture log search "bug" --type bug --csv > bugs.csv

# Export for spreadsheet
meatycapture log search "" \
  --priority high \
  --csv > high-priority.csv

# Process with jq
meatycapture log list my-app --json | \
  jq '.[] | select(.item_count > 5)'
```

---

## Workflow 4: Project Management

Manage projects and their field catalogs.

### Multi-Project Setup

```bash
# Create multiple projects
meatycapture project add "Frontend" /projects/frontend/logs
meatycapture project add "Backend" /projects/backend/logs
meatycapture project add "DevOps" /projects/devops/logs

# List all projects
meatycapture project list --table

# Create documents in different projects
meatycapture log create frontend-items.json  # Creates in frontend
meatycapture log create backend-items.json   # Creates in backend
```

### Project-Specific Fields

```bash
# Add global type options (apply to all projects)
meatycapture field add type "spike"
meatycapture field add type "tech-debt"

# Add project-specific priority
meatycapture field add priority "urgent" --project frontend

# View project-specific options
meatycapture field list priority --project frontend

# Import team-specific field definitions
meatycapture field import team-fields.yaml --project backend --merge
```

### Enable/Disable Projects

```bash
# Temporarily disable a project
meatycapture project disable archived-project

# Re-enable when needed
meatycapture project enable archived-project

# List active projects only
meatycapture project list --enabled-only
```

### Update Project Configuration

```bash
# Change project settings
meatycapture project update my-app \
  --name "My Application" \
  --path /new/docs/path \
  --repo-url https://github.com/new/repo

# Verify changes
meatycapture project list --json | jq '.[] | select(.id == "my-app")'
```

---

## Workflow 5: Automation and CI/CD

Integrate MeatyCapture CLI into automated pipelines.

### GitHub Actions

```yaml
# .github/workflows/log-issues.yml
name: Log Issues to MeatyCapture

on:
  issues:
    types: [opened, labeled]

jobs:
  log:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup MeatyCapture
        run: npm install -g @meaty/cli

      - name: Initialize config
        run: meatycapture config init

      - name: Create project
        run: |
          meatycapture project add \
            "${{ github.repository }}" \
            ./logs \
            --id ${{ github.event.repository.name }}

      - name: Log issue
        run: |
          cat > issue.json << 'EOF'
          {
            "project": "${{ github.event.repository.name }}",
            "items": [{
              "title": "${{ github.event.issue.title }}",
              "type": "bug",
              "domain": "web",
              "context": "${{ github.event.issue.body }}",
              "priority": "medium",
              "status": "triage",
              "tags": ${{ toJson(github.event.issue.labels.*.name) }},
              "notes": "GitHub issue #${{ github.event.issue.number }}"
            }]
          }
          EOF

          meatycapture log create issue.json --quiet

      - name: Commit logs
        run: |
          git add logs/
          git commit -m "docs: log issue ${{ github.event.issue.number }}" || true
          git push
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - log

log-issue:
  stage: log
  script:
    - npm install -g @meaty/cli
    - meatycapture config init
    - meatycapture project add "$CI_PROJECT_NAME" ./logs
    - |
      cat > issue.json << 'EOF'
      {
        "project": "$CI_PROJECT_NAME",
        "items": [{
          "title": "Build $CI_JOB_ID failed",
          "type": "bug",
          "domain": "devops",
          "context": "Pipeline failure in $CI_COMMIT_BRANCH",
          "priority": "high",
          "status": "triage",
          "tags": ["ci"],
          "notes": "See logs at $CI_JOB_URL"
        }]
      }
      EOF
    - meatycapture log create issue.json --quiet
  only:
    - main
  when: on_failure
```

### Bash Script for Batch Processing

```bash
#!/bin/bash
# batch-log.sh - Log items from multiple sources

set -e

PROJECT_ID="my-app"
DOCS_DIR="/data/docs"

# Initialize if needed
meatycapture config init || true

# Create project if needed
meatycapture project add "$PROJECT_ID" "$DOCS_DIR" 2>/dev/null || true

# Process CSV file of items
while IFS=',' read -r title type domain priority; do
  echo "Logging: $title"

  cat > /tmp/item.json << EOF
{
  "project": "$PROJECT_ID",
  "items": [{
    "title": "$title",
    "type": "$type",
    "domain": "$domain",
    "context": "Batch import",
    "priority": "$priority",
    "status": "triage",
    "tags": ["batch-import"],
    "notes": "Imported from CSV"
  }]
}
EOF

  meatycapture log create /tmp/item.json --quiet
done < items.csv
```

### Error Handling in Scripts

```bash
#!/bin/bash
# capture-with-retry.sh

MAX_RETRIES=3
RETRY_DELAY=2

retry_meatycapture() {
  local cmd=$1
  local count=0

  while [ $count -lt $MAX_RETRIES ]; do
    if $cmd; then
      return 0
    fi

    count=$((count + 1))
    if [ $count -lt $MAX_RETRIES ]; then
      echo "Retry $count/$MAX_RETRIES in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
  done

  echo "Failed after $MAX_RETRIES attempts"
  return 1
}

# Usage
retry_meatycapture "meatycapture log create items.json"

# Or with exit code checking
if meatycapture log create items.json; then
  echo "Success!"
else
  case $? in
    1) echo "Validation error" ;;
    2) echo "I/O error" ;;
    3) echo "Resource error" ;;
    *) echo "Unknown error" ;;
  esac
fi
```

---

## Workflow 6: Team Collaboration

Share and synchronize request logs across team.

### Shared Repository Structure

```bash
# Initialize shared repository
git init meatycapture-logs
cd meatycapture-logs

# Create standard structure
mkdir -p {docs,config,templates}

# Create standard projects
meatycapture project add "Frontend" ./docs/frontend
meatycapture project add "Backend" ./docs/backend
meatycapture project add "DevOps" ./docs/devops

# Commit initial config
git add .
git commit -m "docs: initialize meatycapture configuration"
git push
```

### Team Field Definitions

```bash
# Define team field standards
cat > templates/fields.yaml << 'EOF'
type:
  - enhancement
  - bug
  - documentation
  - refactor
  - performance
  - security
  - spike
  - tech-debt

domain:
  - web
  - backend
  - devops
  - database
  - infrastructure
  - mobile

priority:
  - low
  - medium
  - high
  - critical
  - urgent

status:
  - triage
  - in-progress
  - review
  - done
  - backlog
  - blocked
EOF

# Import for each project
for project in frontend backend devops; do
  meatycapture field import templates/fields.yaml \
    --project $project \
    --merge
done
```

### Daily Sync Workflow

```bash
#!/bin/bash
# sync-logs.sh - Team log synchronization

set -e

REPO_DIR="/shared/meatycapture-logs"
cd "$REPO_DIR"

# Pull latest
git pull origin main

# Create today's items
DATE=$(date +%Y%m%d)
ITEMS_FILE="docs/daily/$DATE-items.json"
mkdir -p "$(dirname "$ITEMS_FILE")"

# Add items from each team member
for member in alice bob charlie; do
  if [ -f "/tmp/$member-items.json" ]; then
    # Merge items
    jq -s '.[0].items += .[1].items | .[0]' \
      "$ITEMS_FILE" "/tmp/$member-items.json" > /tmp/merged.json
    mv /tmp/merged.json "$ITEMS_FILE"
  fi
done

# Create log for all items
if [ -s "$ITEMS_FILE" ]; then
  meatycapture log create "$ITEMS_FILE" --quiet
fi

# Push to shared repo
git add docs/
git commit -m "docs: daily logs $DATE" || true
git push origin main
```

---

## Workflow 7: Data Export and Reporting

Export and analyze logged items for reporting.

### Generate Daily Report

```bash
#!/bin/bash
# daily-report.sh

PROJECT="my-app"
DATE=$(date +%Y-%m-%d)

echo "=== MeatyCapture Daily Report ===" > report.txt
echo "Date: $DATE" >> report.txt
echo "" >> report.txt

# Count by type
echo "## Items by Type" >> report.txt
meatycapture log list "$PROJECT" --json | \
  jq -r '.[] | .[] | .type' | \
  sort | uniq -c | sort -rn >> report.txt
echo "" >> report.txt

# Count by priority
echo "## Items by Priority" >> report.txt
meatycapture log list "$PROJECT" --json | \
  jq -r '.[] | .[] | .priority' | \
  sort | uniq -c | sort -rn >> report.txt
echo "" >> report.txt

# Critical items
echo "## Critical Items" >> report.txt
meatycapture log search "" \
  --priority critical \
  --json | jq '.[] | "\(.title) - \(.domain)"' >> report.txt

echo "Report saved to report.txt"
```

### Export to Database

```bash
# Export all logs to CSV for import
meatycapture log list my-app --json | \
  jq -r '.[] | [.doc_id, .title, .item_count, .tags[0]] | @csv' > logs.csv

# Import to database
sqlite3 meatycapture.db << EOF
.mode csv
.import logs.csv logs
SELECT * FROM logs LIMIT 10;
EOF
```

### Generate Markdown Summary

```bash
#!/bin/bash
# summary.sh - Generate markdown summary

PROJECT="my-app"
OUTPUT="SUMMARY.md"

{
  echo "# Project Summary - $PROJECT"
  echo ""
  echo "## Overview"

  COUNT=$(meatycapture log list "$PROJECT" --json | jq '.[0] | length')
  echo "Total documents: $COUNT"

  ITEMS=$(meatycapture log list "$PROJECT" --json | jq '[.[].item_count] | add')
  echo "Total items: $ITEMS"

  echo ""
  echo "## By Type"
  echo ""

  meatycapture log search "" --json | \
    jq -r 'group_by(.type) | .[] | "\(.name): \(length)"'

  echo ""
  echo "## Recent Documents"
  echo ""

  meatycapture log list "$PROJECT" --json | \
    jq -r '.[] | "- \(.doc_id): \(.item_count) items"' | \
    head -5

} > "$OUTPUT"

echo "Summary written to $OUTPUT"
```

---

## Related Documentation

- [Quick Start Guide](index.md)
- [Commands Reference](commands-reference.md)
- [Examples](examples.md)
- [Configuration Guide](configuration.md)
