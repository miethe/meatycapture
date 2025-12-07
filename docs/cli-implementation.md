---
title: CLI Implementation Summary
type: documentation
category: implementation
created: 2025-12-07
---

# CLI Implementation Summary

## Overview

Implemented headless CLI for MeatyCapture that enables batch document creation and management without the UI. The CLI provides three core commands: `create`, `append`, and `list`.

## Architecture

### Build System

**Challenge:** TypeScript path aliases (`@core/*`, `@adapters/*`) don't resolve in compiled output.

**Solution:** esbuild bundler with custom build script

```
src/cli/index.ts
  ↓ (esbuild)
dist/cli/index.js (bundled, executable)
```

**Build Script:** `build-cli.js`
- Bundles CLI with all dependencies
- Resolves path aliases
- Adds shebang for direct execution
- Marks output as executable

**Key Configuration:**
- External dependencies: `commander`, `node:*`
- Format: ESM
- Target: Node.js 18+
- Logging stub: `@core/logging` → `./src/cli/logging-stub.ts`

### Logging Abstraction

**Problem:** `@core/logging` uses Vite-specific `import.meta.env` which breaks in Node.js builds.

**Solution:** Path alias override in CLI build

```typescript
// tsconfig.cli.json
"paths": {
  "@core/logging": ["./src/cli/logging-stub.ts"],  // Override
  "@core/*": ["./src/core/*"]
}
```

**Stub Implementation:** `src/cli/logging-stub.ts`
- Matches interface of `@core/logging`
- Silent debug/info logs (avoid polluting CLI output)
- Warnings/errors to stderr

## File Structure

```
src/cli/
├── index.ts           # Main CLI entry point (commands)
├── logging-stub.ts    # Minimal logger for CLI builds

build-cli.js           # esbuild bundler script
tsconfig.cli.json      # CLI-specific TypeScript config

dist/cli/
└── index.js           # Bundled, executable CLI
```

## Commands

### 1. create

Creates a new request-log document from JSON input.

**Signature:**
```bash
meatycapture create <json-file> [--output <path>]
```

**Process:**
1. Read and validate JSON input
2. Generate document ID from project slug and date
3. Convert ItemDrafts to RequestLogItems with sequential IDs
4. Aggregate tags from all items
5. Build RequestLogDoc with metadata
6. Write to filesystem (with backup if file exists)

**Output Path Resolution:**
1. `--output` flag (highest priority)
2. Project's `default_path`
3. `MEATYCAPTURE_DEFAULT_PROJECT_PATH` env var
4. Fallback: `~/.meatycapture/docs/<project-id>/`

### 2. append

Appends items to an existing document.

**Signature:**
```bash
meatycapture append <doc-path> <json-file>
```

**Process:**
1. Read existing document
2. For each item in JSON:
   - Generate next sequential item ID
   - Add with current timestamp
3. Re-aggregate tags (unique sorted)
4. Update items_index
5. Increment item_count
6. Set updated_at timestamp
7. Create backup (.bak) before write

**Features:**
- Automatic item ID sequencing
- Tag deduplication and sorting
- Backup safety

### 3. list

Lists request-log documents in a directory.

**Signature:**
```bash
meatycapture list [project] [--path <path>]
```

**Process:**
1. Determine search path (from project config, `--path`, or default)
2. Scan directory for `.md` files
3. Parse each file, filter valid request-logs
4. Sort by `updated_at` descending
5. Display metadata

**Output:**
- Document ID
- Title
- File path
- Item count
- Last updated timestamp

## JSON Input Format

```json
{
  "project": "project-slug",
  "title": "Optional document title",
  "items": [
    {
      "title": "Item title",
      "type": "enhancement",
      "domain": "web",
      "context": "Context info",
      "priority": "medium",
      "status": "triage",
      "tags": ["tag1", "tag2"],
      "notes": "Problem/goal description"
    }
  ]
}
```

**Validation:**
- Type guards ensure structure validity
- All fields required (except `title`)
- Clear error messages for malformed JSON

## Error Handling

**Exit Codes:**
- 0: Success
- 1: Error (file not found, invalid JSON, write failure, etc.)

**Error Categories:**
1. **Input Validation**
   - File not found
   - JSON parsing errors
   - Invalid structure

2. **File System**
   - Path not writable
   - Document not found
   - Backup creation failure

3. **Business Logic**
   - Invalid project ID
   - Missing required fields

**Error Output:** Sent to stderr, with context

## Dependencies

**Production:**
- `commander` (^14.0.2): CLI argument parsing

**DevDependencies:**
- `esbuild` (^0.27.1): Bundler for path alias resolution
- `@types/node` (^22.10.1): Node.js type definitions

## Build & Usage

**Build:**
```bash
pnpm build:cli
```

**Output:** `dist/cli/index.js` (executable)

**Run:**
```bash
./dist/cli/index.js --help
meatycapture create input.json
meatycapture append doc.md items.json
meatycapture list my-project
```

**Install globally:**
```bash
pnpm link
meatycapture --help
```

## Integration Points

### Core Domain
- `@core/models`: ItemDraft, RequestLogDoc types
- `@core/validation`: generateDocId, generateItemId
- `@core/serializer`: serialize, parse, aggregateTags, updateItemsIndex

### Adapters
- `@adapters/fs-local`: FsDocStore (read/write/append/list)
- `@adapters/config-local`: LocalProjectStore (project lookup)
- `@adapters/clock`: realClock (timestamps)

### Type Safety
- Full TypeScript strict mode
- Input validation with type guards
- Runtime checks for file operations

## Testing Verification

**Test Cases Verified:**

1. **Create Command**
   - ✓ Creates new document with multiple items
   - ✓ Generates correct doc ID format
   - ✓ Aggregates tags correctly
   - ✓ Creates items with sequential IDs
   - ✓ Respects custom output path

2. **Append Command**
   - ✓ Appends items to existing doc
   - ✓ Increments item numbers correctly
   - ✓ Merges tags (unique sorted)
   - ✓ Updates metadata (item_count, updated_at)
   - ✓ Creates backup before modification

3. **List Command**
   - ✓ Lists docs in directory
   - ✓ Sorts by updated_at descending
   - ✓ Shows correct metadata
   - ✓ Handles empty directories gracefully

## Performance Considerations

**Optimization Strategies:**

1. **Bundling:** Single executable reduces startup time
2. **Lazy Loading:** Commander parses arguments efficiently
3. **Streaming:** File reads/writes use Node.js streams (via fs promises)
4. **No UI Overhead:** Headless = minimal dependencies

**Scalability:**
- Handles large JSON inputs (array of items)
- Efficient tag aggregation (Set-based deduplication)
- Backup creation is fast (copyFile)

## Future Enhancements

**Potential Improvements:**

1. **Validation**
   - Schema validation with Zod
   - Field option validation against catalogs

2. **Output Formats**
   - JSON output mode (`--json`)
   - CSV export

3. **Batch Operations**
   - Multi-file input glob pattern
   - Directory watching

4. **Integration**
   - Git hooks integration
   - CI/CD templates
   - Webhook receivers

5. **Interactive Mode**
   - Prompt-based item creation
   - Field completion from catalogs

## Security Considerations

**Input Sanitization:**
- JSON parsing with error handling
- Path validation (resolve, no traversal)
- File permission checks

**File Safety:**
- Backup before overwrite
- Atomic writes (via fs.writeFile)
- No shell injection (no exec/spawn)

**Dependencies:**
- Minimal attack surface
- Commander is well-maintained
- esbuild is dev-only

## Maintenance Notes

**Build Process:**
1. `build-cli.js` is the source of truth for bundling
2. `tsconfig.cli.json` excludes UI and logging modules
3. Path alias for logging is critical for Node.js compat

**Breaking Changes:**
- Changing `@core/logging` interface requires updating stub
- Commander major version updates may need migration
- esbuild config changes affect bundle output

**Debugging:**
- Check bundle size: `ls -lh dist/cli/index.js`
- Test locally before publish: `./dist/cli/index.js`
- Enable debug logs: Uncomment in logging-stub.ts

## Related Documentation

- [CLI Usage Guide](./cli-usage.md)
- [Core Serializer](../src/core/serializer/index.ts)
- [Port Interfaces](../src/core/ports/index.ts)
- [Build Script](../build-cli.js)
