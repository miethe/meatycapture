---
title: MeatyCapture CLI Usage Examples
description: Practical examples and workflows for MeatyCapture CLI commands
audience: developers, users
tags: [cli, examples, workflows, how-to]
created: 2025-12-27
updated: 2025-12-27
category: CLI Usage
status: complete
---

# MeatyCapture CLI Usage Examples

Practical examples and common workflows for using MeatyCapture CLI commands.

## Quick Start

### Create Your First Document

Create a JSON file with your first item:

**input.json:**
```json
{
  "project": "my-app",
  "items": [
    {
      "title": "Add dark mode toggle",
      "type": "enhancement",
      "domain": "web",
      "context": "User interface improvement",
      "priority": "medium",
      "status": "triage",
      "tags": ["ui", "ux"],
      "notes": "Users have requested dark mode support. Consider using system preferences initially."
    }
  ]
}
```

Create the document:
```bash
meatycapture log create input.json
```

Output:
```
✓ Created document: /Users/user/.meatycapture/docs/REQ-20251227-my-app.md
  Doc ID: REQ-20251227-my-app
  Items: 1
  Tags: ui, ux
  Backup: /Users/user/.meatycapture/docs/REQ-20251227-my-app.md.bak
```

### View Your Document

View the created document as markdown:
```bash
meatycapture log view /Users/user/.meatycapture/docs/REQ-20251227-my-app.md
```

View as JSON:
```bash
meatycapture log view /Users/user/.meatycapture/docs/REQ-20251227-my-app.md --json
```

---

## Input Format Examples

### Minimal Input (Required Fields Only)

```json
{
  "project": "my-project",
  "items": [
    {
      "title": "Item title",
      "type": "bug",
      "domain": "api",
      "context": "Context text",
      "priority": "high",
      "status": "triage",
      "tags": [],
      "notes": "Description of the issue"
    }
  ]
}
```

### Full Document Input (All Fields)

```json
{
  "project": "backend-api",
  "title": "Backend API - Sprint 15 Issues",
  "items": [
    {
      "title": "Authentication timeout too short",
      "type": "bug",
      "domain": "api",
      "context": "Session management",
      "priority": "high",
      "status": "in-progress",
      "tags": ["auth", "performance", "critical"],
      "notes": "Users are getting logged out after 15 minutes of inactivity. Increase to 30 minutes minimum."
    },
    {
      "title": "Add pagination to users endpoint",
      "type": "enhancement",
      "domain": "api",
      "context": "API efficiency",
      "priority": "medium",
      "status": "triage",
      "tags": ["api", "performance"],
      "notes": "GET /api/users returns all users without pagination, causing performance issues on large databases."
    }
  ]
}
```

### Multiple Projects

Create separate documents for different projects:

**project-a-issues.json:**
```json
{
  "project": "project-a",
  "title": "Project A - Feature Requests",
  "items": [
    {
      "title": "Export to PDF",
      "type": "enhancement",
      "domain": "web",
      "context": "User request",
      "priority": "medium",
      "status": "triage",
      "tags": ["user-feature", "export"],
      "notes": "User requested ability to export reports to PDF"
    }
  ]
}
```

**project-b-issues.json:**
```json
{
  "project": "project-b",
  "title": "Project B - Infrastructure Tasks",
  "items": [
    {
      "title": "Migrate to new CDN",
      "type": "technical-debt",
      "domain": "devops",
      "context": "Cost optimization",
      "priority": "medium",
      "status": "blocked",
      "tags": ["infrastructure", "cost"],
      "notes": "Current CDN contract expires next month. Evaluate alternatives."
    }
  ]
}
```

Create both:
```bash
meatycapture log create project-a-issues.json
meatycapture log create project-b-issues.json
```

---

## Common Workflows

### Workflow 1: Daily Bug Capture

Capture bugs found during daily testing:

```bash
#!/bin/bash
# daily-bugs.sh - Capture bugs found today

DOC_PATH="/data/requests/REQ-$(date +%Y%m%d)-mobile-app.md"

# Create or append bugs
cat > temp-bugs.json <<EOF
{
  "project": "mobile-app",
  "items": [
    {
      "title": "Login button unresponsive on low network",
      "type": "bug",
      "domain": "mobile",
      "context": "Network conditions",
      "priority": "high",
      "status": "triage",
      "tags": ["mobile", "network"],
      "notes": "On 3G networks, login button appears unresponsive. Likely timeout issue."
    }
  ]
}
EOF

if [ -f "$DOC_PATH" ]; then
  meatycapture log append "$DOC_PATH" temp-bugs.json
else
  meatycapture log create temp-bugs.json -o "$DOC_PATH"
fi

rm temp-bugs.json
```

Run:
```bash
chmod +x daily-bugs.sh
./daily-bugs.sh
```

### Workflow 2: Batch Import from CSV

Convert CSV to JSON and import:

**issues.csv:**
```
title,type,domain,priority,status,tags,notes
"Add user settings page","enhancement","web","medium","triage","ui,ux","Users want to customize their preferences"
"Fix email notifications","bug","api","high","in-progress","email,notifications","Some emails not being sent"
```

**csv-to-json.sh:**
```bash
#!/bin/bash
# Convert CSV to MeatyCapture JSON format

CSV_FILE="$1"
PROJECT="$2"

# Simple CSV parser (requires jq)
jq -Rs '
  split("\n") |
  .[0:] as $rows |
  ($rows[0] | split(",")) as $headers |
  {
    project: env.PROJECT,
    items: [
      $rows[1:] | .[] |
      select(length > 0) |
      split(",") as $row |
      {
        title: $row[0],
        type: $row[1],
        domain: $row[2],
        priority: $row[3],
        status: $row[4],
        tags: ($row[5] | split(";")),
        notes: $row[6]
      }
    ]
  }
' PROJECT="$PROJECT" < "$CSV_FILE"
```

Usage:
```bash
chmod +x csv-to-json.sh
./csv-to-json.sh issues.csv my-project > issues.json
meatycapture log create issues.json
```

### Workflow 3: GitHub Issues to Request Log

Convert GitHub issues to request-log documents:

**github-issues.sh:**
```bash
#!/bin/bash
# Create request-log from GitHub issues

PROJECT="$1"  # e.g., "my-project"
REPO="$2"     # e.g., "owner/repo"

# Fetch open issues from GitHub API
curl -s "https://api.github.com/repos/$REPO/issues?state=open" | jq '[
  .[] | {
    title: .title,
    type: (if .labels | map(.name) | any(. == "bug") then "bug" else "enhancement" end),
    domain: "web",
    context: "GitHub Issue #\(.number)",
    priority: (if .labels | map(.name) | any(. == "critical") then "critical" elif .labels | map(.name) | any(. == "high") then "high" else "medium" end),
    status: "triage",
    tags: [.labels[].name],
    notes: .body
  }
] | {project: env.PROJECT, items: .}' PROJECT="$PROJECT" > issues.json

meatycapture log create issues.json
rm issues.json
```

Usage:
```bash
chmod +x github-issues.sh
./github-issues.sh my-project "owner/repo"
```

### Workflow 4: Append Weekly Items

Add weekly improvements/issues at end of week:

```bash
#!/bin/bash
# weekly-sync.sh - Append weekly items to current document

PROJECT="my-project"
DOC_PATH="/data/requests/weekly-$PROJECT.md"

read -p "Enter item title: " TITLE
read -p "Enter item type (bug/enhancement/idea): " TYPE
read -p "Enter priority (low/medium/high/critical): " PRIORITY
read -p "Enter tags (comma-separated): " TAGS_RAW

# Convert comma-separated tags to JSON array
TAGS=$(echo "$TAGS_RAW" | tr ',' '\n' | jq -Rs 'split("\n") | map(select(length > 0))')

cat > temp-item.json <<EOF
{
  "project": "$PROJECT",
  "items": [
    {
      "title": "$TITLE",
      "type": "$TYPE",
      "domain": "web",
      "context": "Weekly sync",
      "priority": "$PRIORITY",
      "status": "triage",
      "tags": $TAGS,
      "notes": ""
    }
  ]
}
EOF

if [ -f "$DOC_PATH" ]; then
  meatycapture log append "$DOC_PATH" temp-item.json --quiet
else
  meatycapture log create temp-item.json -o "$DOC_PATH" --quiet
fi

echo "✓ Added to $DOC_PATH"
rm temp-item.json
```

Usage:
```bash
chmod +x weekly-sync.sh
./weekly-sync.sh
```

---

## Output Format Examples

### JSON Output

View document as JSON:
```bash
meatycapture log view ./requests.md --json
```

Output:
```json
{
  "doc_id": "REQ-20251227-my-project",
  "title": "My Project Requests",
  "project_id": "my-project",
  "item_count": 2,
  "tags": ["api", "bug", "enhancement"],
  "created_at": "2025-12-27T10:00:00.000Z",
  "updated_at": "2025-12-27T15:30:00.000Z",
  "items": [
    {
      "id": "REQ-20251227-my-project-01",
      "title": "Fix authentication timeout",
      "type": "bug",
      "domain": "api",
      "context": "Session management",
      "priority": "high",
      "status": "in-progress",
      "tags": ["auth", "critical"],
      "notes": "Increase session timeout from 15 to 30 minutes"
    }
  ]
}
```

### CSV Output

Export as CSV:
```bash
meatycapture log list my-project --csv
```

Output:
```csv
path,doc_id,title,project_id,item_count,updated_at
"/data/requests/REQ-20251227-my-project.md",REQ-20251227-my-project,"My Project Requests",my-project,2,2025-12-27T15:30:00Z
```

### YAML Output

View as YAML:
```bash
meatycapture log view ./requests.md --yaml
```

Output:
```yaml
doc_id: REQ-20251227-my-project
title: My Project Requests
project_id: my-project
item_count: 2
tags:
  - api
  - bug
  - enhancement
created_at: 2025-12-27T10:00:00.000Z
updated_at: 2025-12-27T15:30:00.000Z
items:
  - id: REQ-20251227-my-project-01
    title: Fix authentication timeout
    type: bug
    domain: api
    # ... more fields
```

---

## Search Examples

### Simple Text Search

Find items mentioning "login":
```bash
meatycapture log search "login"
```

Search within specific project:
```bash
meatycapture log search "performance" backend-api
```

### Tag Search

Find all items tagged "critical":
```bash
meatycapture log search "tag:critical"
```

Find items with multiple tags:
```bash
meatycapture log search "tag:api tag:performance"
```

### Type Search

Find all enhancement requests:
```bash
meatycapture log search "type:enhancement"
```

Find all bugs:
```bash
meatycapture log search "type:bug"
```

### Status Search

Find items in triage:
```bash
meatycapture log search "status:triage"
```

Find in-progress items:
```bash
meatycapture log search "status:in-progress"
```

### Combined Searches

Find critical bugs (high priority bugs):
```bash
meatycapture log search "type:bug tag:critical"
```

Find enhancements in specific domain:
```bash
meatycapture log search "type:enhancement domain:web"
```

### Search with Filters

Limit search results:
```bash
meatycapture log search "type:bug" --limit 10
```

Export search results:
```bash
meatycapture log search "tag:urgent" --json > urgent-items.json
```

---

## Shell Scripting Examples

### Count Items by Type

```bash
#!/bin/bash
# Count items by type in a document

DOC_PATH="$1"

meatycapture log view "$DOC_PATH" --json | jq '
  .items | group_by(.type) |
  map({type: .[0].type, count: length}) |
  sort_by(.count) | reverse[]
'
```

Usage:
```bash
chmod +x count-by-type.sh
./count-by-type.sh /data/requests/REQ-20251227-my-project.md
```

Output:
```
{"type":"enhancement","count":5}
{"type":"bug","count":3}
{"type":"idea","count":1}
```

### Find High-Priority Items

```bash
#!/bin/bash
# List all high/critical priority items

PROJECT="$1"

meatycapture log search "tag:urgent tag:critical" "$PROJECT" --json | jq '
  .results[] |
  select(.priority == "critical" or .priority == "high") |
  "\(.item_id) - \(.title) [\(.priority)]"'
```

Usage:
```bash
chmod +x high-priority.sh
./high-priority.sh my-project
```

### Backup Documents

```bash
#!/bin/bash
# Backup all request-log documents

BACKUP_DIR="/backups/requests-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

meatycapture log list --json | jq -r '.[] | .path' | while read -r doc; do
  cp "$doc" "$BACKUP_DIR/"
done

echo "✓ Backed up $(ls $BACKUP_DIR | wc -l) documents to $BACKUP_DIR"
```

Usage:
```bash
chmod +x backup-documents.sh
./backup-documents.sh
```

### Clean Old Documents

```bash
#!/bin/bash
# Delete documents older than 30 days

DAYS_OLD=30
CUTOFF=$(date -d "$DAYS_OLD days ago" +%s)

meatycapture log list --json | jq -r '.[] | select(.updated_at < '"$CUTOFF"') | .path' | while read -r doc; do
  echo "Deleting: $doc"
  meatycapture log delete "$doc" --force --quiet
done
```

Usage:
```bash
chmod +x clean-old-documents.sh
./clean-old-documents.sh
```

---

## Piped Input Examples

### Using jq to Filter and Pipe

Create document from filtered data:
```bash
# Extract only bugs from JSON
jq '{project: .project, items: [.items[] | select(.type == "bug")]}' source.json | \
  meatycapture log create -
```

### Using cat with stdin

Pipe JSON directly:
```bash
cat items.json | meatycapture log create -
```

### Using echo for Quick Testing

Quick test with inline JSON:
```bash
echo '{
  "project": "test",
  "items": [{
    "title": "Test item",
    "type": "idea",
    "domain": "web",
    "context": "Testing",
    "priority": "low",
    "status": "triage",
    "tags": [],
    "notes": "Quick test"
  }]
}' | meatycapture log create -
```

### Using curl for Remote Input

Create document from remote JSON:
```bash
curl -s "https://api.example.com/export" | meatycapture log create -
```

---

## CI/CD Integration Examples

### GitHub Actions

```yaml
name: Create request log from issue

on:
  issues:
    types: [opened]

jobs:
  capture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Create request-log from issue
        run: |
          cat > input.json <<EOF
          {
            "project": "${{ github.event.repository.name }}",
            "items": [{
              "title": "${{ github.event.issue.title }}",
              "type": "bug",
              "domain": "web",
              "context": "GitHub Issue #${{ github.event.issue.number }}",
              "priority": "medium",
              "status": "triage",
              "tags": ${{ env.TAGS }},
              "notes": "${{ github.event.issue.body }}"
            }]
          }
          EOF

          npm run build:cli
          node dist/cli/index.js log create input.json

          rm input.json
        env:
          TAGS: '["github", "automated"]'
```

### GitLab CI

```yaml
create_request_log:
  script:
    - |
      cat > input.json <<EOF
      {
        "project": "$CI_PROJECT_NAME",
        "items": [{
          "title": "Pipeline failure",
          "type": "bug",
          "domain": "devops",
          "context": "CI/CD Pipeline",
          "priority": "high",
          "status": "triage",
          "tags": ["ci", "automated"],
          "notes": "Build failed: $CI_COMMIT_MESSAGE"
        }]
      }
      EOF
    - npm run build:cli
    - node dist/cli/index.js log create input.json
```

---

## Error Handling Examples

### Check Exit Codes

```bash
#!/bin/bash
# Safely create document with error handling

meatycapture log create input.json

case $? in
  0)
    echo "✓ Document created successfully"
    ;;
  1)
    echo "✗ Validation error (invalid JSON or missing fields)"
    exit 1
    ;;
  2)
    echo "✗ I/O error (path not writable)"
    exit 1
    ;;
  3)
    echo "✗ Resource error (project not found)"
    exit 1
    ;;
  *)
    echo "✗ Unknown error"
    exit 1
    ;;
esac
```

### Retry Logic

```bash
#!/bin/bash
# Retry with exponential backoff

retry_with_backoff() {
  local max_attempts=3
  local timeout=1
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if meatycapture log "$@"; then
      return 0
    fi

    echo "Attempt $attempt failed, retrying in ${timeout}s..."
    sleep $timeout
    timeout=$((timeout * 2))
    attempt=$((attempt + 1))
  done

  return 1
}

retry_with_backoff log create input.json
```

### Validate Input Before Creating

```bash
#!/bin/bash
# Validate JSON before submission

validate_input() {
  local file="$1"

  # Check file exists
  if [ ! -f "$file" ]; then
    echo "Error: File not found: $file"
    return 1
  fi

  # Validate JSON
  if ! jq empty "$file" 2>/dev/null; then
    echo "Error: Invalid JSON in $file"
    return 1
  fi

  # Check required fields
  if ! jq -e '.project' "$file" > /dev/null; then
    echo "Error: Missing 'project' field"
    return 1
  fi

  if ! jq -e '.items | length > 0' "$file" > /dev/null; then
    echo "Error: No items in document"
    return 1
  fi

  return 0
}

if validate_input "input.json"; then
  meatycapture log create input.json
else
  exit 1
fi
```

---

## Performance Examples

### Batch Create Multiple Documents

```bash
#!/bin/bash
# Process multiple files in parallel

for file in batch-*.json; do
  meatycapture log create "$file" --quiet &
done

wait
echo "✓ All documents created"
```

### List with Sorting and Limiting

```bash
# Get 10 most recent documents
meatycapture log list --sort date --limit 10 --json > recent.json

# Get documents by item count
meatycapture log list --sort items --limit 5 --json > largest.json
```

### Search and Export

```bash
# Export all bugs to CSV
meatycapture log search "type:bug" --csv > all-bugs.csv

# Export high-priority items as JSON
meatycapture log search "tag:critical" --json > critical-items.json
```

---

## Troubleshooting Examples

### Verify Document Created

```bash
# Check if document was created
if meatycapture log view /path/to/doc.md > /dev/null 2>&1; then
  echo "✓ Document exists and is readable"
else
  echo "✗ Document creation failed or file is unreadable"
fi
```

### Check Backup Files

```bash
# List backup files
ls -la ~/.meatycapture/docs/*.bak

# Restore from backup
mv ./REQ-20251227-my-project.md.bak ./REQ-20251227-my-project.md
meatycapture log view ./REQ-20251227-my-project.md
```

### Debug JSON Input

```bash
# Pretty-print JSON for inspection
jq '.' input.json

# Check specific fields
jq '.items[0]' input.json

# Validate against schema
jq 'has("project") and has("items")' input.json
```

### Verify Exit Codes

```bash
# Test each command
meatycapture log create /nonexistent/file.json
echo "Exit code: $?"

meatycapture log list /invalid/path
echo "Exit code: $?"

meatycapture log search "query"
echo "Exit code: $?"
```

---

## Tips & Best Practices

1. **Always validate JSON before submitting** - Use `jq empty` to catch syntax errors
2. **Use quiet mode in scripts** - Add `--quiet` flag for cleaner output
3. **Check exit codes** - Always verify `$?` after critical operations
4. **Keep backup files** - Default behavior preserves `.bak` files
5. **Use project slugs consistently** - Keep project names lowercase with hyphens
6. **Tag strategically** - Use consistent tags for better search/filter
7. **Structure notes well** - Use clear, actionable descriptions
8. **Batch operations** - Group related items in one document
9. **Export for archival** - Use CSV/JSON for backup and analysis
10. **Automate repetitive tasks** - Create shell scripts for common workflows
