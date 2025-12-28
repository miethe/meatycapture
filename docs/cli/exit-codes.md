---
title: MeatyCapture CLI Exit Codes Reference
description: Complete reference for MeatyCapture CLI exit codes and error handling
audience: developers
tags: [cli, exit-codes, error-handling, reference]
created: 2025-12-27
updated: 2025-12-27
category: Reference
status: complete
---

# MeatyCapture CLI Exit Codes Reference

Complete reference for all exit codes returned by MeatyCapture CLI commands and their meanings.

## Exit Code Summary

| Code | Name | Category | Meaning |
|------|------|----------|---------|
| `0` | SUCCESS | Success | Command executed successfully |
| `1` | VALIDATION_ERROR | User Error | Invalid input, format, or validation failure |
| `2` | IO_ERROR | System Error | File system error, permission denied |
| `3` | RESOURCE_ERROR | Resource Error | Resource not found or unavailable |
| `64` | CLI_ERROR | Usage Error | Invalid command or flag combination |
| `130` | INTERRUPTED | Signal | User interrupted (Ctrl+C) |

---

## Exit Code 0: SUCCESS

Command executed successfully.

### When Returned

- All operations completed as expected
- Document created, appended, viewed, or deleted
- Search returned results (even if empty)
- List returned documents (even if empty)

### Examples

```bash
# Create document
meatycapture log create input.json
echo $?  # Output: 0

# View document
meatycapture log view ./doc.md
echo $?  # Output: 0

# Search (even with no results)
meatycapture log search "nonexistent-query"
echo $?  # Output: 0

# List (even if no documents)
meatycapture log list some-project
echo $?  # Output: 0

# Delete with confirmation
meatycapture log delete ./doc.md
# User confirms: y
echo $?  # Output: 0
```

### What This Means

The command completed successfully. For search and list commands, exit code 0 is returned even if no results are found (this is not an error condition).

### Next Steps

- Results are available in stdout
- Continue with next operation
- Parse output if needed

---

## Exit Code 1: VALIDATION_ERROR

Invalid input format, missing required fields, or validation failure.

### When Returned

- Invalid JSON syntax
- Missing required fields (project, items, etc.)
- Invalid field values (unknown type, status, domain)
- Empty items array
- Malformed JSON input
- Invalid search query syntax
- Type/domain/priority/status values not in allowed set
- Tags field is not an array

### Examples

```bash
# Missing 'project' field
echo '{"items": []}' | meatycapture log create -
echo $?  # Output: 1
# Error: Validation error: 'project' field is required

# Invalid JSON syntax
echo '{broken json}' | meatycapture log create -
echo $?  # Output: 1
# Error: Invalid JSON in input

# Empty items array
echo '{"project": "test", "items": []}' | meatycapture log create -
echo $?  # Output: 1
# Error: No items provided

# Invalid item fields
cat > bad-item.json <<EOF
{
  "project": "test",
  "items": [{
    "title": "Item",
    "type": "invalid-type",
    "domain": "web",
    "priority": "high",
    "status": "triage",
    "tags": [],
    "notes": "Test"
  }]
}
EOF
meatycapture log create bad-item.json
echo $?  # Output: 1
# Error: Invalid type: 'invalid-type'

# Tags not an array
cat > bad-tags.json <<EOF
{
  "project": "test",
  "items": [{
    "title": "Item",
    "type": "bug",
    "domain": "web",
    "priority": "high",
    "status": "triage",
    "tags": "tag1",
    "notes": "Test"
  }]
}
EOF
meatycapture log create bad-tags.json
echo $?  # Output: 1
# Error: 'tags' must be an array
```

### What This Means

The input data is invalid or missing required information. The command refuses to process it.

### Next Steps

1. Check error message for details on what's invalid
2. Validate JSON syntax: `jq empty input.json`
3. Verify required fields are present
4. Check that field values are in the allowed set
5. Fix the input and retry

### Common Mistakes

- Forgetting quotes in JSON: `{project: test}` instead of `{"project": "test"}`
- Non-array tags: `"tags": "single-tag"` instead of `"tags": ["single-tag"]`
- Unknown type: `"type": "question"` instead of `type: "enhancement"|"bug"|"idea"`
- Typos in field names: `"projects"` instead of `"project"`

---

## Exit Code 2: IO_ERROR

File system error, permission denied, or I/O operation failed.

### When Returned

- Input file not found
- Output path not writable
- Document file not found (for append/view/delete)
- Permission denied on file or directory
- Disk full or write failure
- Path is a directory instead of file
- Symbolic link broken
- File permissions prevent read/write

### Examples

```bash
# Input file not found
meatycapture log create /nonexistent/file.json
echo $?  # Output: 2
# Error: Input file not found: /nonexistent/file.json

# Output path not writable (permission denied)
meatycapture log create input.json -o /root/restricted/doc.md
echo $?  # Output: 2
# Error: Failed to write document: Permission denied

# Document not found (append)
meatycapture log append /nonexistent/doc.md items.json
echo $?  # Output: 2
# Error: Document not found: /nonexistent/doc.md

# Document not found (view)
meatycapture log view /nonexistent/doc.md
echo $?  # Output: 2
# Error: File not found: /nonexistent/doc.md

# Document not found (delete)
meatycapture log delete /nonexistent/doc.md
echo $?  # Output: 2
# Error: File not found: /nonexistent/doc.md

# Path is a directory (not a file)
meatycapture log view /some/directory/
echo $?  # Output: 2
# Error: Not a file: /some/directory/

# Permission denied on read
chmod 000 input.json
meatycapture log create input.json
echo $?  # Output: 2
# Error: Permission denied: input.json

# Disk full (write failure)
meatycapture log create input.json -o /full-disk/doc.md
echo $?  # Output: 2
# Error: Failed to write document: No space left on device
```

### What This Means

A file system operation failed. This is typically not an error in your data, but rather an environment/system issue.

### Next Steps

1. Check if file exists: `ls -la /path/to/file`
2. Check permissions: `ls -ld /path/to/directory`
3. Verify write access: `touch /path/to/directory/test && rm /path/to/directory/test`
4. Check disk space: `df -h`
5. Fix permissions: `chmod 755 /path/to/directory`
6. Retry the command

### Common Solutions

- **File not found:** Create parent directory: `mkdir -p /path/to/directory`
- **Permission denied:** Change permissions: `chmod 755 /path/to/directory`
- **Disk full:** Free up space or use different path
- **Broken symlink:** Fix or remove symlink: `rm /path/to/link`

---

## Exit Code 3: RESOURCE_ERROR

Resource not found or unavailable.

### When Returned

- Project not found in catalog (create/append)
- Document parse error (corrupted file)
- Project slug not in configured projects
- Referenced project doesn't exist
- Invalid path in document metadata

### Examples

```bash
# Project not found (not in projects.json)
echo '{"project": "unknown-project", "items": [...]}' | meatycapture log create -
echo $?  # Output: 3
# Error: Project 'unknown-project' not found in catalog

# Document parse error (corrupted file)
echo "This is not valid markdown/YAML" > corrupted.md
meatycapture log view ./corrupted.md
echo $?  # Output: 3
# Error: Failed to parse document: Invalid frontmatter

# Invalid project slug format
echo '{"project": "invalid project", "items": [...]}' | meatycapture log create -
echo $?  # Output: 3
# Error: Invalid project slug format

# Project configuration error
# (project exists but has invalid configuration)
meatycapture log create input.json
echo $?  # Output: 3
# Error: Project configuration error: default_path not set
```

### What This Means

A required resource doesn't exist or is not available. The request references something that can't be found.

### Next Steps

1. Verify project exists: `meatycapture project list`
2. Check project configuration: `cat ~/.meatycapture/projects.json`
3. Create missing project: `meatycapture project create <project-id>`
4. Verify document exists (for append/view): `ls -la /path/to/doc.md`
5. Check document for corruption: `jq . /path/to/doc.md`

### Common Solutions

- **Project not found:** Create project: `meatycapture project create my-project`
- **Document corrupted:** Restore from backup: `cp doc.md.bak doc.md`
- **Invalid project slug:** Use lowercase with hyphens: `my-project` not `My Project`

---

## Exit Code 64: CLI_ERROR

Invalid command syntax, unknown flags, or invalid flag combination.

### When Returned

- Unknown flag provided
- Invalid flag value
- Conflicting flags
- Missing required argument
- Invalid command
- Wrong number of arguments
- Invalid output format flag
- Mutually exclusive options

### Examples

```bash
# Unknown flag
meatycapture log create input.json --unknown-flag
echo $?  # Output: 64
# Error: Unknown option: --unknown-flag

# Invalid output format
meatycapture log view ./doc.md --format xml
echo $?  # Output: 64
# Error: Invalid format: xml. Must be one of: json, yaml, csv, table, markdown

# Missing required argument
meatycapture log create
echo $?  # Output: 64
# Error: Missing argument: <json-file>

# Conflicting flags
meatycapture log delete ./doc.md --force --confirm
echo $?  # Output: 64
# Error: Conflicting flags: --force and --confirm cannot be used together

# Wrong number of arguments
meatycapture log append ./doc1.md ./doc2.md ./doc3.md
echo $?  # Output: 64
# Error: Too many arguments

# Invalid command
meatycapture log invalid-command
echo $?  # Output: 64
# Error: Unknown command: invalid-command

# Invalid sort option
meatycapture log list --sort invalid-order
echo $?  # Output: 64
# Error: Invalid sort option: invalid-order. Must be one of: name, date, items
```

### What This Means

The command itself is malformed. The CLI doesn't recognize the command, flags, or their combination.

### Next Steps

1. Check command syntax: `meatycapture log --help`
2. View available flags: `meatycapture log <command> --help`
3. Verify flag names are correct
4. Check for typos in command or flags
5. Ensure proper flag syntax (- for short, -- for long)

### Common Solutions

- **Unknown flag:** Check `--help` for correct flag name
- **Missing argument:** Provide the required argument
- **Invalid format:** Use one of: `json`, `yaml`, `csv`, `table`
- **Wrong command:** Check available commands with `meatycapture log --help`

---

## Exit Code 130: INTERRUPTED

User interrupted the command (usually Ctrl+C).

### When Returned

- User pressed Ctrl+C during execution
- User canceled a confirmation prompt
- Signal received (SIGINT, SIGTERM)
- Process terminated externally

### Examples

```bash
# User presses Ctrl+C during search
meatycapture log search "query"
# User presses: Ctrl+C
echo $?  # Output: 130
# (no error message, just interrupted)

# User cancels delete confirmation
meatycapture log delete ./doc.md
# Prompt: "Delete /path/to/doc.md? (y/N): "
# User presses: Ctrl+C
echo $?  # Output: 130
# (document not deleted)

# Process killed externally
kill -INT $$
echo $?  # Output: 130
```

### What This Means

The command was interrupted, usually by the user. This is a normal, expected behavior.

### Next Steps

No action needed - the user intentionally canceled the operation.

---

## Exit Code Summary by Command

### log create

| Exit Code | Condition |
|-----------|-----------|
| `0` | Document created successfully |
| `1` | Invalid JSON, missing project, invalid items |
| `2` | Input file not found, output path not writable |
| `3` | Project not found |
| `64` | Invalid flags |

### log append

| Exit Code | Condition |
|-----------|-----------|
| `0` | Items appended successfully |
| `1` | Invalid JSON, invalid items |
| `2` | Document not found, not writable |
| `3` | Document parse error (corrupted) |
| `64` | Invalid flags |

### log list

| Exit Code | Condition |
|-----------|-----------|
| `0` | Success (even if no documents) |
| `1` | Invalid project |
| `2` | Path not accessible |
| `64` | Invalid flags, invalid sort option |

### log view

| Exit Code | Condition |
|-----------|-----------|
| `0` | Document viewed successfully |
| `1` | File not found |
| `2` | Document parse error |
| `64` | Invalid flags |

### log search

| Exit Code | Condition |
|-----------|-----------|
| `0` | Search completed (even if no results) |
| `1` | Path error, invalid project |
| `2` | Invalid query syntax |
| `64` | Invalid flags, invalid match option |

### log delete

| Exit Code | Condition |
|-----------|-----------|
| `0` | Document deleted successfully |
| `1` | File not found |
| `2` | Permission denied |
| `64` | Invalid flags |
| `130` | User canceled (Ctrl+C) |

---

## Handling Exit Codes in Scripts

### Basic Check

```bash
#!/bin/bash

meatycapture log create input.json

if [ $? -eq 0 ]; then
  echo "✓ Success"
else
  echo "✗ Failed"
  exit 1
fi
```

### Detailed Error Handling

```bash
#!/bin/bash

meatycapture log create input.json --quiet

case $? in
  0)
    echo "✓ Document created"
    ;;
  1)
    echo "✗ Validation error - check JSON format"
    exit 1
    ;;
  2)
    echo "✗ I/O error - check file permissions"
    exit 1
    ;;
  3)
    echo "✗ Resource error - project not found"
    exit 1
    ;;
  64)
    echo "✗ CLI error - check command flags"
    exit 1
    ;;
  *)
    echo "✗ Unknown error (exit code: $?)"
    exit 1
    ;;
esac
```

### Conditional Retry

```bash
#!/bin/bash

# Retry on I/O error, but not on validation error
meatycapture log create input.json --quiet
exit_code=$?

if [ $exit_code -eq 2 ]; then
  echo "I/O error, retrying in 5 seconds..."
  sleep 5
  meatycapture log create input.json --quiet
elif [ $exit_code -ne 0 ]; then
  echo "Non-recoverable error (exit code: $exit_code)"
  exit $exit_code
fi
```

### Exit Code Mapping to Messages

```bash
#!/bin/bash

show_error_message() {
  local exit_code=$1

  case $exit_code in
    0)
      echo "Success"
      ;;
    1)
      echo "Validation error: Invalid input format or missing required fields"
      ;;
    2)
      echo "I/O error: File system operation failed (check permissions and paths)"
      ;;
    3)
      echo "Resource error: Required resource not found"
      ;;
    64)
      echo "CLI error: Invalid command syntax or flags"
      ;;
    130)
      echo "Interrupted: User canceled operation"
      ;;
    *)
      echo "Unknown error (exit code: $exit_code)"
      ;;
  esac
}

meatycapture log create input.json --quiet
exit_code=$?

if [ $exit_code -ne 0 ]; then
  show_error_message $exit_code
  exit $exit_code
fi
```

---

## Testing Exit Codes

### Verify Exit Code Behavior

```bash
#!/bin/bash

# Test success case
echo '{"project": "test", "items": [{"title": "Test", "type": "bug", "domain": "web", "priority": "high", "status": "triage", "tags": [], "notes": "Test"}]}' | meatycapture log create - --quiet
echo "Exit code for valid input: $?"

# Test validation error
echo '{"invalid": "json"}' | meatycapture log create - --quiet 2>/dev/null
echo "Exit code for invalid JSON: $?"

# Test file not found
meatycapture log view /nonexistent/file.md --quiet 2>/dev/null
echo "Exit code for file not found: $?"

# Test invalid project
meatycapture log list nonexistent-project --quiet 2>/dev/null
echo "Exit code for invalid project: $?"
```

### Verify in CI/CD

```yaml
# GitHub Actions example
- name: Test CLI exit codes
  run: |
    # Test success case
    echo '{"project": "test", "items": [...]}' | meatycapture log create -q
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
      echo "Expected exit code 0, got $exit_code"
      exit 1
    fi

    # Test validation error case
    echo '{"invalid": "json"}' | meatycapture log create -q 2>/dev/null || true
    exit_code=$?
    if [ $exit_code -ne 1 ]; then
      echo "Expected exit code 1, got $exit_code"
      exit 1
    fi
```

---

## Exit Code Reference Quick Lookup

**Need to handle success?** → Exit code `0`

**Need to handle validation error?** → Exit code `1`

**Need to handle file/permission error?** → Exit code `2`

**Need to handle resource not found?** → Exit code `3`

**Need to handle CLI usage error?** → Exit code `64`

**Need to handle user interruption?** → Exit code `130`

For more details on each exit code and when it occurs, see the relevant section above.

---

## Glossary

- **VALIDATION_ERROR**: Input data is invalid (malformed JSON, missing fields, invalid values)
- **IO_ERROR**: File system operation failed (file not found, permission denied, disk full)
- **RESOURCE_ERROR**: Required resource doesn't exist (project not found, document corrupted)
- **CLI_ERROR**: Command or flag is invalid (unknown flag, invalid option value)
- **INTERRUPTED**: User canceled the operation (Ctrl+C)

---

## Related Documentation

- [Log Commands Reference](/docs/cli/log-commands.md) - Complete command documentation
- [Usage Examples](/docs/cli/examples.md) - Practical examples and workflows
- [Agent Integration Guide](/docs/cli/agent-integration.md) - Integration patterns for AI agents
