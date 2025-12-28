---
title: MeatyCapture CLI Agent Integration Guide
description: Patterns and workflows for AI agent integration with MeatyCapture CLI
audience: developers, ai-agents
tags: [cli, agents, integration, automation]
created: 2025-12-27
updated: 2025-12-27
category: Integration Guide
status: complete
---

# MeatyCapture CLI Agent Integration Guide

Integration patterns and workflows for AI agents to work with MeatyCapture CLI commands.

## Overview

The MeatyCapture CLI is designed for AI agent consumption through:

1. **Structured JSON output** - Parse results programmatically
2. **Stdin/stdout pipes** - Chain commands together
3. **Standardized exit codes** - Detect success/failure
4. **Quiet mode** - Suppress non-error output for cleaner automation

## Core Integration Principles

### 1. Always Use Structured Output

Request structured formats for programmatic parsing:

```bash
# Good: JSON output for parsing
meatycapture log view ./doc.md --json | jq '.items[] | select(.status == "triage")'

# Bad: Default output is human-readable, hard to parse
meatycapture log view ./doc.md
```

### 2. Check Exit Codes

Every command returns a meaningful exit code:

```bash
meatycapture log create input.json
exit_code=$?

if [ $exit_code -eq 0 ]; then
  # Success - document created
  process_results
elif [ $exit_code -eq 1 ]; then
  # Validation error - fix input
  fix_validation_error
elif [ $exit_code -eq 2 ]; then
  # I/O error - check permissions
  handle_io_error
elif [ $exit_code -eq 3 ]; then
  # Resource error - create missing resource
  create_missing_resource
fi
```

### 3. Use Quiet Mode in Automation

Suppress non-error output for cleaner logs:

```bash
# Quiet mode - only errors printed
meatycapture log create input.json --quiet

# Verify success via exit code
if [ $? -eq 0 ]; then
  echo "✓ Document created"
fi
```

### 4. Pipe JSON Through Stdin

Process data without intermediate files:

```bash
# Generate JSON → Pipe to MeatyCapture
generate_items_json | meatycapture log create -

# Fetch remote data → Transform → Create
curl -s https://api.example.com/issues | \
  jq '{project: "my-app", items: .}' | \
  meatycapture log create -
```

## Common Agent Workflows

### Workflow 1: Create Document from Analysis

Agent analyzes data and creates request-log document:

```bash
#!/bin/bash
# Agent-driven document creation

# Step 1: Analyze and generate JSON
analysis_result=$(agent_analyze_codebase "$1")

# Step 2: Create JSON with analysis results
cat > temp-input.json <<EOF
{
  "project": "$(echo "$analysis_result" | jq -r '.project')",
  "title": "Code Analysis Results",
  "items": $(echo "$analysis_result" | jq -c '.items')
}
EOF

# Step 3: Create document with quiet mode
meatycapture log create temp-input.json --quiet

if [ $? -eq 0 ]; then
  echo "DOCUMENT_CREATED"
else
  echo "DOCUMENT_FAILED"
  exit 1
fi

rm temp-input.json
```

Usage by agent:
```python
result = subprocess.run([
    'bash', 'create_document.sh', 'project-name'
], capture_output=True, text=True)

if result.returncode == 0 and 'DOCUMENT_CREATED' in result.stdout:
    print("Document created successfully")
else:
    print("Failed to create document")
```

### Workflow 2: Search and Process Results

Agent searches documents and processes matches:

```bash
#!/bin/bash
# Search and process results

QUERY="$1"
PROJECT="${2:-}"
OUTPUT_FORMAT="${3:-json}"

# Execute search with JSON output
result=$(meatycapture log search "$QUERY" $PROJECT --json --quiet)

if [ $? -ne 0 ]; then
  echo "ERROR: Search failed"
  exit 1
fi

# Process results based on format
case "$OUTPUT_FORMAT" in
  json)
    echo "$result"
    ;;
  count)
    echo "$result" | jq '.total_results'
    ;;
  items-only)
    echo "$result" | jq '.results[].item_id'
    ;;
  by-type)
    echo "$result" | jq 'group_by(.type) | map({type: .[0].type, count: length})'
    ;;
esac
```

Usage:
```bash
# Get JSON results
./search_documents.sh "type:bug" my-project json

# Get item count
count=$(./search_documents.sh "tag:critical" all count)

# Get item IDs
items=$(./search_documents.sh "status:triage" my-project items-only)
```

### Workflow 3: Append and Validate

Agent appends items and validates changes:

```bash
#!/bin/bash
# Append items with validation

DOC_PATH="$1"
NEW_ITEMS="$2"

# Validate document exists
if [ ! -f "$DOC_PATH" ]; then
  echo "ERROR: Document not found"
  exit 1
fi

# Get document state before append
before=$(meatycapture log view "$DOC_PATH" --json --quiet)
before_count=$(echo "$before" | jq '.item_count')

# Attempt append
meatycapture log append "$DOC_PATH" "$NEW_ITEMS" --quiet
append_exit=$?

if [ $append_exit -ne 0 ]; then
  echo "ERROR: Append failed (exit code: $append_exit)"
  exit 1
fi

# Validate changes
after=$(meatycapture log view "$DOC_PATH" --json --quiet)
after_count=$(echo "$after" | jq '.item_count')

if [ "$after_count" -gt "$before_count" ]; then
  echo "SUCCESS: Added $((after_count - before_count)) items"
else
  echo "ERROR: Item count did not increase"
  exit 1
fi
```

### Workflow 4: Batch Processing

Agent processes multiple documents in parallel:

```bash
#!/bin/bash
# Process multiple documents in parallel

OPERATION="$1"  # create, append, delete
INPUT_DIR="$2"
MAX_PARALLEL="${3:-4}"

export -f process_single
export OPERATION

# Process files in parallel
find "$INPUT_DIR" -name "*.json" -type f | \
  xargs -P "$MAX_PARALLEL" -I {} bash -c 'process_single "$OPERATION" "$@"' _ {}

# Function to process single file
process_single() {
  local operation="$1"
  local file="$2"

  case "$operation" in
    create)
      meatycapture log create "$file" --quiet
      ;;
    append)
      doc_path=$(jq -r '.doc_path' "$file")
      meatycapture log append "$doc_path" "$file" --quiet
      ;;
  esac

  [ $? -eq 0 ] && echo "OK: $file" || echo "FAIL: $file"
}
```

---

## Output Parsing Patterns

### Parse JSON Results with jq

All JSON output is parseable with `jq`:

```bash
# Extract document ID
meatycapture log list --json | jq -r '.[] | .doc_id'

# Filter by tag
meatycapture log view ./doc.md --json | \
  jq '.items[] | select(.tags | contains(["urgent"]))'

# Extract specific fields
meatycapture log search "bug" --json | \
  jq '.results[] | {id: .item_id, title: .title, tags: .tags}'

# Count by type
meatycapture log view ./doc.md --json | \
  jq '[.items[] | .type] | group_by(.) | map({type: .[0], count: length})'

# Get all high-priority items
meatycapture log view ./doc.md --json | \
  jq '.items[] | select(.priority == "high" or .priority == "critical")'
```

### Parse CSV Results

CSV output works with standard tools:

```bash
# Get all document paths
meatycapture log list --csv | tail -n +2 | cut -d',' -f1

# Filter CSV
meatycapture log list --csv | awk -F',' '$5 > 10'  # More than 10 items

# Convert CSV to JSON
meatycapture log list --csv | jq -Rs 'split("\n") | .[1:] | map(split(",") | {path: .[0], doc_id: .[1], title: .[2]})'
```

### Parse YAML Results

YAML output for configuration/data exchange:

```bash
# Extract document metadata as YAML
meatycapture log view ./doc.md --yaml

# Use with other YAML tools
meatycapture log view ./doc.md --yaml | yq '.tags'
```

---

## Error Handling Patterns

### Exit Code Handling

```bash
#!/bin/bash

handle_exit_code() {
  local exit_code=$1
  local command="$2"

  case $exit_code in
    0)
      echo "SUCCESS: $command completed"
      return 0
      ;;
    1)
      echo "VALIDATION_ERROR: Invalid input or format"
      return 1
      ;;
    2)
      echo "IO_ERROR: File or path error"
      return 1
      ;;
    3)
      echo "RESOURCE_ERROR: Resource not found"
      return 1
      ;;
    64)
      echo "CLI_ERROR: Invalid command or flags"
      return 1
      ;;
    130)
      echo "INTERRUPTED: User cancelled operation"
      return 1
      ;;
    *)
      echo "UNKNOWN_ERROR: Exit code $exit_code"
      return 1
      ;;
  esac
}

# Usage
meatycapture log create input.json --quiet
handle_exit_code $? "log create"
```

### Retry Logic with Backoff

```bash
#!/bin/bash

retry_with_exponential_backoff() {
  local max_attempts=5
  local timeout=1
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    "$@"
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
      return 0
    fi

    # Don't retry on validation errors (exit code 1)
    if [ $exit_code -eq 1 ]; then
      echo "Validation error, not retrying"
      return 1
    fi

    echo "Attempt $attempt failed (exit: $exit_code), retrying in ${timeout}s..."
    sleep "$timeout"

    timeout=$((timeout * 2))
    attempt=$((attempt + 1))
  done

  echo "All $max_attempts attempts failed"
  return 1
}

# Usage
retry_with_exponential_backoff meatycapture log create input.json --quiet
```

### Validate Input Before Submission

```bash
#!/bin/bash

validate_create_input() {
  local file="$1"

  # Check file exists
  if [ ! -f "$file" ]; then
    echo "FILE_NOT_FOUND: $file"
    return 1
  fi

  # Validate JSON syntax
  if ! jq empty "$file" 2>/dev/null; then
    echo "INVALID_JSON: Syntax error in $file"
    return 1
  fi

  # Check required fields
  local project=$(jq -r '.project // empty' "$file")
  if [ -z "$project" ]; then
    echo "MISSING_FIELD: 'project' field required"
    return 1
  fi

  local item_count=$(jq '.items | length' "$file")
  if [ "$item_count" -eq 0 ]; then
    echo "EMPTY_ITEMS: No items in document"
    return 1
  fi

  # Validate items structure
  local invalid_items=$(jq '[.items[] | select(
    .title == null or
    .type == null or
    .domain == null or
    .priority == null or
    .status == null
  )] | length' "$file")

  if [ "$invalid_items" -gt 0 ]; then
    echo "INVALID_ITEMS: $invalid_items items missing required fields"
    return 1
  fi

  return 0
}

# Usage
if validate_create_input "input.json"; then
  meatycapture log create input.json --quiet
else
  echo "Validation failed, skipping"
  exit 1
fi
```

---

## Performance Optimization

### Batch Operations

Process multiple operations without individual CLI invocations:

```bash
#!/bin/bash

# Create multiple documents efficiently
for file in batch-*.json; do
  meatycapture log create "$file" --quiet &
done
wait

# Or use xargs for parallel processing
find ./batch -name "*.json" | \
  xargs -P 4 -I {} meatycapture log create {} --quiet
```

### Minimize Output Parsing

Cache results when possible:

```bash
#!/bin/bash

# Get all documents once, process multiple times
docs=$(meatycapture log list --json --quiet)

# Extract document paths
paths=$(echo "$docs" | jq -r '.[] | .path')

# Extract tags
tags=$(echo "$docs" | jq -r '.[] | .tags | @csv')

# Count documents
count=$(echo "$docs" | jq 'length')
```

### Use Appropriate Output Formats

Choose output format based on need:

```bash
# For agent processing: JSON
meatycapture log search "query" --json --quiet

# For aggregation: CSV (easier to parse)
meatycapture log list --csv --quiet

# For configuration: YAML
meatycapture log view ./doc.md --yaml --quiet
```

---

## Integration Examples

### Integration with LLM APIs

```bash
#!/bin/bash
# Use CLI output with LLM for analysis

# Get document in structured format
doc_json=$(meatycapture log view ./requests.md --json --quiet)

# Send to LLM API
curl -s https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"gpt-4\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": \"Analyze this request log and prioritize items:\\n$doc_json\"
    }]
  }" | jq '.choices[0].message.content'
```

### Integration with Data Pipelines

```bash
#!/bin/bash
# Pipeline: Fetch → Transform → Create Document → Store

# Stage 1: Fetch data
data=$(curl -s https://data.example.com/items)

# Stage 2: Transform to MeatyCapture format
input=$(echo "$data" | jq '{
  project: .project_id,
  items: [.items[] | {
    title: .name,
    type: .category,
    domain: "api",
    context: .source,
    priority: (.importance | if . == "high" then "high" elif . == "low" then "low" else "medium" end),
    status: "triage",
    tags: .labels,
    notes: .description
  }]
}')

# Stage 3: Create document
echo "$input" | meatycapture log create - --quiet

# Stage 4: Store result reference
if [ $? -eq 0 ]; then
  echo "Processed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> ./pipeline.log
fi
```

### Integration with Monitoring Systems

```bash
#!/bin/bash
# Monitor alerts and create issues

check_alert_system() {
  local alerts=$(curl -s https://alerts.example.com/active)

  echo "$alerts" | jq -c '.[]' | while read -r alert; do
    cat > temp-alert.json <<EOF
{
  "project": "monitoring",
  "items": [{
    "title": "$(echo "$alert" | jq -r '.title')",
    "type": "bug",
    "domain": "devops",
    "context": "Monitoring alert",
    "priority": "$(echo "$alert" | jq -r '.severity')",
    "status": "triage",
    "tags": ["monitoring", "alert"],
    "notes": "$(echo "$alert" | jq -r '.description')"
  }]
}
EOF

    meatycapture log create temp-alert.json --quiet
    rm temp-alert.json
  done
}

# Run periodically
check_alert_system
```

---

## Best Practices for Agent Integration

### 1. Always Validate Input

```bash
# Bad: No validation
echo "$data" | meatycapture log create -

# Good: Validate before submission
if validate_json "$data"; then
  echo "$data" | meatycapture log create -
else
  echo "Invalid data, skipping"
  exit 1
fi
```

### 2. Use Exit Codes for Control Flow

```bash
# Bad: Ignore exit code
meatycapture log create input.json
# Continues regardless of success

# Good: Check exit code
if meatycapture log create input.json --quiet; then
  echo "Created successfully"
  continue_process
else
  echo "Creation failed"
  handle_error
fi
```

### 3. Implement Timeout Protection

```bash
#!/bin/bash
# Timeout after 30 seconds

timeout 30 meatycapture log search "query" --json

if [ $? -eq 124 ]; then
  echo "Search timed out"
  exit 1
fi
```

### 4. Handle Large Results

```bash
#!/bin/bash
# Stream large results instead of loading all

# Bad: Load all at once
all_docs=$(meatycapture log list --json)
echo "$all_docs" | jq '.[]'

# Good: Stream with pagination
meatycapture log list --json --limit 100 | \
  jq '.[] | {id: .doc_id, path: .path}' | \
  while read -r doc; do
    process_document "$doc"
  done
```

### 5. Log All Operations

```bash
#!/bin/bash

execute_with_logging() {
  local command="$@"
  local log_file="./cli-operations.log"

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Executing: $command" >> "$log_file"

  "$@"
  local exit_code=$?

  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Exit code: $exit_code" >> "$log_file"

  return $exit_code
}

# Usage
execute_with_logging meatycapture log create input.json --quiet
```

---

## Troubleshooting Agent Integration

### Debugging Failed Commands

```bash
#!/bin/bash

# Run with verbose error output
meatycapture log create input.json 2>&1

# Capture both stdout and stderr
output=$(meatycapture log search "query" 2>&1)
exit_code=$?

echo "Output: $output"
echo "Exit code: $exit_code"
```

### Testing JSON Parsing

```bash
#!/bin/bash

# Verify output is valid JSON
meatycapture log view ./doc.md --json | jq empty

if [ $? -eq 0 ]; then
  echo "✓ JSON output is valid"
else
  echo "✗ JSON output is invalid"
fi
```

### Monitoring Performance

```bash
#!/bin/bash

# Time command execution
time meatycapture log search "query" --json > /dev/null

# Count operations per second
for i in {1..10}; do
  time meatycapture log list --quiet
done
```

---

## Summary

Key takeaways for agent integration:

1. **Always use `--json` for structured output**
2. **Check exit codes to determine success/failure**
3. **Use `--quiet` to suppress human-readable output**
4. **Pipe JSON via stdin to avoid temporary files**
5. **Validate input before submission**
6. **Implement error handling and retry logic**
7. **Use appropriate output formats for parsing**
8. **Log all operations for debugging**
9. **Implement timeouts for long-running operations**
10. **Cache results when processing multiple times**

For more details on specific commands, see `/docs/cli/log-commands.md`.
