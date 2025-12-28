# Phase 1: Core Log Operations (MVP)

**Duration**: 2-3 weeks | **Story Points**: 22
**Assigned**: backend-typescript-architect (Sonnet)

---

## Overview

Phase 1 establishes the MVP by enhancing the existing 3 CLI commands (create, append, list) with new capabilities and adding 3 new commands (view, search, delete). The focus is on making the CLI both human-friendly and AI-agent-compatible through structured output modes, stdin support, and standardized exit codes.

### Key Deliverables
- Enhanced `log create`, `log append`, `log list` with new flags and formatters
- New `log view`, `log search`, `log delete` commands
- Output formatters: human-friendly (default), JSON, CSV, YAML, table
- Stdin support for piped input (use `-` as file argument)
- Standardized exit codes for scripting
- Comprehensive tests (>=85% coverage)
- Complete documentation with examples

### Success Criteria
- All 6 commands implemented and tested
- All output modes working (human, JSON, CSV, YAML)
- Stdin support functional for create/append
- Exit codes standardized across all commands
- >=85% code coverage for Phase 1 CLI code
- Zero backward compatibility breaks
- Performance baseline met (<500ms typical)

---

## Architecture

### Command Handler Pattern

Each command follows a consistent pattern:

```typescript
// src/cli/commands/log/view.ts
export async function handleLogView(
  docPath: string,
  options: LogViewOptions
): Promise<void> {
  try {
    // 1. Resolve and validate inputs
    const resolvedPath = resolve(docPath);

    // 2. Load document via existing DocStore
    const docStore = createFsDocStore();
    const doc = await docStore.read(resolvedPath);

    // 3. Apply filters if specified
    const filtered = applyFilters(doc, options.filterType, options.filterStatus, options.filterTag);

    // 4. Format output based on flags
    const output = formatOutput(filtered, options.format);

    // 5. Print and exit
    console.log(output);
    process.exit(0);
  } catch (error) {
    handleError(error, 1); // Exit code 1 = validation error
  }
}
```

### Formatter Pattern

Output formatters are modular and composable:

```typescript
// src/cli/formatters/json.ts
export function formatDocumentAsJson(doc: RequestLogDoc): string {
  return JSON.stringify({
    doc_id: doc.doc_id,
    title: doc.title,
    project_id: doc.project_id,
    item_count: doc.item_count,
    tags: doc.tags,
    created_at: doc.created_at.toISOString(),
    updated_at: doc.updated_at.toISOString(),
    items: doc.items.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      domain: item.domain,
      priority: item.priority,
      status: item.status,
      tags: item.tags,
      context: item.context,
      notes: item.notes,
      created_at: item.created_at.toISOString(),
    })),
  }, null, 2);
}

export function formatDocumentsAsJson(docs: DocMeta[]): string {
  return JSON.stringify(docs.map(doc => ({
    doc_id: doc.doc_id,
    path: doc.path,
    title: doc.title,
    item_count: doc.item_count,
    updated_at: doc.updated_at.toISOString(),
  })), null, 2);
}
```

### Stdin Handler Pattern

```typescript
// src/cli/handlers/stdin.ts
export async function readInput(filePath: string): Promise<string> {
  if (filePath === '-') {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => resolve(data));
      process.stdin.on('error', reject);
    });
  } else {
    // Read from file
    return fs.readFile(filePath, 'utf-8');
  }
}
```

### Error Handling Pattern

```typescript
// src/cli/handlers/errors.ts
export function handleError(error: unknown, defaultExitCode: number): never {
  if (error instanceof FileNotFoundError) {
    console.error(`Error: File not found: ${error.path}`);
    process.exit(2); // I/O error
  } else if (error instanceof ValidationError) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Validation error
  } else if (error instanceof ResourceNotFoundError) {
    console.error(`Error: ${error.message}`);
    process.exit(3); // Resource not found
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    process.exit(defaultExitCode);
  } else {
    console.error(`Error: Unknown error occurred`);
    process.exit(defaultExitCode);
  }
}
```

---

## Task Breakdown

### TASK-CLI-P1-001: Refactor Command Structure

**Assigned**: backend-typescript-architect

**Description**: Reorganize CLI code to support new command structure (log, project, field, config hierarchies). Update `src/cli/index.ts` to register subcommand groups.

**Acceptance Criteria**:
- [x] `src/cli/index.ts` uses nested subcommand groups
- [x] `meatycapture log --help` shows all log subcommands
- [x] `meatycapture project --help` shows all project subcommands (stub)
- [x] Help text is clear and includes usage examples
- [x] No breaking changes to existing commands

**Estimate**: 3 story points (1 day)

**Deliverables**:
- Updated `src/cli/index.ts` with subcommand structure
- Example help output documentation

**Dependencies**: None

---

### TASK-CLI-P1-002: Implement Output Formatters

**Assigned**: backend-typescript-architect

**Description**: Build formatter module for human-friendly, JSON, CSV, YAML, and table output modes. These are reusable across all phases.

**Acceptance Criteria**:
- [x] JSON formatter produces valid JSON
- [x] CSV formatter produces RFC 4180-compliant output
- [x] YAML formatter produces valid YAML
- [x] Table formatter uses `table` package for aligned output
- [x] Human formatter uses chalk for colored output
- [x] All formatters handle arrays and single objects
- [x] Date serialization consistent (ISO 8601)
- [x] Unit tests for each formatter with snapshots

**Estimate**: 5 story points (1.5 days)

**Deliverables**:
- `src/cli/formatters/human.ts` (default output)
- `src/cli/formatters/json.ts` (JSON output)
- `src/cli/formatters/csv.ts` (CSV output)
- `src/cli/formatters/yaml.ts` (YAML output)
- `src/cli/formatters/table.ts` (ASCII tables)
- `tests/cli/formatters.test.ts`

**Dependencies**: None (uses existing core models)

---

### TASK-CLI-P1-003: Implement Stdin Handler

**Assigned**: backend-typescript-architect

**Description**: Build stdin reader that allows piping JSON input via `-` argument. Enables workflows like `jq '.capture' data.json | meatycapture log create -`.

**Acceptance Criteria**:
- [x] Reading from `-` switches to stdin
- [x] Reading from file path uses filesystem
- [x] Handles EOF correctly
- [x] Error handling for pipe failures
- [x] Works with jq and other JSON pipes
- [x] Unit tests with mock stdin

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/handlers/stdin.ts`
- `tests/cli/stdin.test.ts`

**Dependencies**: None

---

### TASK-CLI-P1-004: Implement Error Handler & Exit Codes

**Assigned**: backend-typescript-architect

**Description**: Build centralized error handling with standardized exit codes. Maps specific error types to exit codes (1=validation, 2=I/O, 3=resource, 64=CLI, 130=interrupt).

**Acceptance Criteria**:
- [x] All error types mapped to correct exit code
- [x] Error messages are clear (<200 chars) with next steps
- [x] Consistent error output format
- [x] Exit codes match PRD spec
- [x] Graceful handling of Ctrl+C (exit 130)
- [x] Unit tests for all error paths

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/handlers/errors.ts`
- `src/cli/handlers/exitCodes.ts`
- `tests/cli/errors.test.ts`

**Dependencies**: None

---

### TASK-CLI-P1-005: Enhance `log create` Command

**Assigned**: backend-typescript-architect

**Description**: Extend existing create command with new flags: --json, --yaml, --csv, --quiet, stdin support, and proper error handling.

**Acceptance Criteria**:
- [x] Existing create behavior unchanged (backward compatible)
- [x] --json flag outputs created document as JSON
- [x] --yaml flag outputs created document as YAML
- [x] --quiet suppresses non-error output
- [x] Stdin support via `-` argument
- [x] --no-backup flag to skip backup creation
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error (invalid JSON, missing project)
- [x] Exit code 2 on I/O error (path not writable)
- [x] Exit code 3 on resource error (project not found)
- [x] All existing tests still pass

**Estimate**: 5 story points (1.5 days)

**Deliverables**:
- Updated `src/cli/commands/log/create.ts`
- Updated `tests/cli/commands/log.test.ts` (create section)

**Dependencies**: TASK-CLI-P1-002, TASK-CLI-P1-003, TASK-CLI-P1-004

---

### TASK-CLI-P1-006: Enhance `log append` Command

**Assigned**: backend-typescript-architect

**Description**: Extend append command with formatters, stdin support, and standardized error handling.

**Acceptance Criteria**:
- [x] Existing append behavior unchanged
- [x] --json flag outputs updated document as JSON
- [x] --yaml flag outputs updated document as YAML
- [x] --quiet suppresses non-error output
- [x] Stdin support via `-` argument
- [x] --no-backup flag to skip backup creation
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error
- [x] Exit code 2 on I/O error (file not found/not writable)
- [x] Exit code 3 on parse error (corrupted document)
- [x] All existing tests still pass

**Estimate**: 4 story points (1 day)

**Deliverables**:
- Updated `src/cli/commands/log/append.ts`
- Updated `tests/cli/commands/log.test.ts` (append section)

**Dependencies**: TASK-CLI-P1-002, TASK-CLI-P1-003, TASK-CLI-P1-004

---

### TASK-CLI-P1-007: Enhance `log list` Command

**Assigned**: backend-typescript-architect

**Description**: Extend list command with formatters, sorting, filtering, and all output modes.

**Acceptance Criteria**:
- [x] Existing list behavior unchanged (lists docs for project)
- [x] --json outputs as JSON array
- [x] --csv outputs as CSV (path, doc_id, title, item_count, updated_at)
- [x] --yaml outputs as YAML
- [x] --table outputs as ASCII table (default human mode)
- [x] --sort flag with options: name|date|items (default: date desc)
- [x] --limit flag to cap results
- [x] --quiet suppresses non-error output
- [x] Exit code 0 even if no documents found
- [x] Exit code 1 on path error
- [x] Exit code 2 on invalid project
- [x] All existing tests still pass

**Estimate**: 4 story points (1 day)

**Deliverables**:
- Updated `src/cli/commands/log/list.ts`
- Updated `tests/cli/commands/log.test.ts` (list section)

**Dependencies**: TASK-CLI-P1-002, TASK-CLI-P1-004

---

### TASK-CLI-P1-008: Implement `log view` Command

**Assigned**: backend-typescript-architect

**Description**: New command to display complete contents of a request-log document with multiple output modes and filtering.

**Acceptance Criteria**:
- [x] `meatycapture log view <doc-path>` displays markdown (default)
- [x] --json outputs document as JSON object
- [x] --yaml outputs document as YAML
- [x] --markdown outputs original markdown (same as default)
- [x] --items-only shows only items (no frontmatter)
- [x] --filter-type <type> shows only items of type
- [x] --filter-status <status> shows only items with status
- [x] --filter-tag <tag> shows only items with tag
- [x] Multiple filters can be combined (AND logic)
- [x] Exit code 0 on success
- [x] Exit code 1 on file not found
- [x] Exit code 2 on parse error
- [x] Unit and integration tests

**Estimate**: 5 story points (1.5 days)

**Deliverables**:
- `src/cli/commands/log/view.ts`
- `tests/cli/commands/log.test.ts` (view section)

**Dependencies**: TASK-CLI-P1-002, TASK-CLI-P1-004

---

### TASK-CLI-P1-009: Implement `log search` Command

**Assigned**: backend-typescript-architect

**Description**: New command to search documents by text content, tags, type, or status with query language support.

**Acceptance Criteria**:
- [x] `meatycapture log search <query> [project]` searches in title, notes, tags
- [x] Query supports special syntax: `tag:<name>`, `type:<type>`, `status:<status>`
- [x] --json outputs results as JSON array
- [x] --yaml outputs results as YAML
- [x] --csv outputs results as CSV
- [x] --match flag with modes: full|starts|contains (default: contains)
- [x] Results include match location (title, tags, notes)
- [x] Case-insensitive search
- [x] Exit code 0 even if no results
- [x] Exit code 1 on path error
- [x] Unit and integration tests

**Estimate**: 6 story points (2 days)

**Deliverables**:
- `src/cli/commands/log/search.ts`
- `src/cli/handlers/search.ts` (search logic)
- `tests/cli/commands/log.test.ts` (search section)

**Dependencies**: TASK-CLI-P1-002, TASK-CLI-P1-004

---

### TASK-CLI-P1-010: Implement `log delete` Command

**Assigned**: backend-typescript-architect

**Description**: New command to delete request-log documents with confirmation and backup retention options.

**Acceptance Criteria**:
- [x] `meatycapture log delete <doc-path>` prompts for confirmation
- [x] --force/-f skips confirmation
- [x] --keep-backup retains .bak file after deletion
- [x] Default keeps backup (can disable with --no-backup)
- [x] Exit code 0 on success
- [x] Exit code 1 on file not found
- [x] Exit code 130 on user cancel (Ctrl+C)
- [x] Confirmation uses readline for interactive input
- [x] Unit and integration tests

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `src/cli/commands/log/delete.ts`
- `tests/cli/commands/log.test.ts` (delete section)

**Dependencies**: TASK-CLI-P1-004

---

### TASK-CLI-P1-011: Write Comprehensive CLI Tests

**Assigned**: backend-typescript-architect

**Description**: Build comprehensive test suite covering all Phase 1 commands, formatters, error handling, and exit codes. Target >=85% coverage.

**Acceptance Criteria**:
- [x] Unit tests for all commands (argument parsing, output formatting)
- [x] Unit tests for all formatters (JSON/CSV/YAML/table/human)
- [x] Unit tests for error handlers
- [x] Unit tests for stdin handler
- [x] Integration tests for complete workflows (create→list→view→search→append→delete)
- [x] File I/O tests with temp directories
- [x] Backup creation and restoration tests
- [x] Exit code verification tests
- [x] Snapshot tests for markdown and formatted output
- [x] >=85% code coverage for CLI layer
- [x] All tests pass with `pnpm test`

**Estimate**: 8 story points (2 days)

**Deliverables**:
- `tests/cli/commands/log.test.ts` (all log commands)
- `tests/cli/formatters.test.ts` (all formatters)
- `tests/cli/handlers.test.ts` (error, stdin, search handlers)
- `tests/cli/integration.test.ts` (end-to-end workflows)
- Coverage report showing >=85%

**Dependencies**: All TASK-CLI-P1-005 through TASK-CLI-P1-010

---

### TASK-CLI-P1-012: Write CLI Documentation

**Assigned**: documentation-writer (Haiku)

**Description**: Write complete documentation for Phase 1 CLI commands including help text, examples, and AI agent integration patterns.

**Acceptance Criteria**:
- [x] Complete `meatycapture log --help` text
- [x] Help text for all 6 log subcommands
- [x] Usage examples for each command
- [x] Examples of all output modes (JSON, CSV, YAML, human)
- [x] Stdin piping examples
- [x] AI agent integration patterns (batch create, parse results, etc.)
- [x] Exit code reference documentation
- [x] Troubleshooting guide
- [x] Placed in `docs/cli/` or similar

**Estimate**: 5 story points (1 day)

**Deliverables**:
- `docs/cli/log-commands.md` (command reference)
- `docs/cli/examples.md` (usage examples)
- `docs/cli/agent-integration.md` (AI workflows)
- `docs/cli/exit-codes.md` (exit code reference)
- Updated main CLI help text

**Dependencies**: TASK-CLI-P1-005 through TASK-CLI-P1-010

---

## Implementation Sequence

**Week 1** (5 days):
1. TASK-CLI-P1-001: Refactor command structure (1 day)
2. TASK-CLI-P1-002: Output formatters (1.5 days)
3. TASK-CLI-P1-003: Stdin handler (1 day)
4. TASK-CLI-P1-004: Error handling (1 day)
5. Checkpoint: All foundational components working

**Week 1-2** (5 days):
6. TASK-CLI-P1-005: Enhance `log create` (1.5 days)
7. TASK-CLI-P1-006: Enhance `log append` (1 day)
8. TASK-CLI-P1-007: Enhance `log list` (1 day)
9. Checkpoint: All enhanced existing commands working

**Week 2** (5 days):
10. TASK-CLI-P1-008: Implement `log view` (1.5 days)
11. TASK-CLI-P1-009: Implement `log search` (2 days)
12. TASK-CLI-P1-010: Implement `log delete` (1 day)
13. Checkpoint: All new log commands working

**Week 3** (3 days):
14. TASK-CLI-P1-011: Write comprehensive tests (2 days)
15. TASK-CLI-P1-012: Write documentation (1 day)
16. Final validation and polish

---

## File Organization

```
src/cli/
├── index.ts                            # Updated: nested subcommands
├── commands/
│   └── log/
│       ├── create.ts                   # Enhanced
│       ├── append.ts                   # Enhanced
│       ├── list.ts                     # Enhanced
│       ├── view.ts                     # NEW
│       ├── search.ts                   # NEW
│       └── delete.ts                   # NEW
├── formatters/                         # NEW
│   ├── index.ts
│   ├── human.ts
│   ├── json.ts
│   ├── csv.ts
│   ├── yaml.ts
│   └── table.ts
└── handlers/                           # NEW
    ├── index.ts
    ├── errors.ts
    ├── exitCodes.ts
    ├── stdin.ts
    └── search.ts

tests/cli/                              # NEW
├── commands/
│   └── log.test.ts
├── formatters.test.ts
├── handlers.test.ts
└── integration.test.ts

docs/cli/                               # NEW
├── log-commands.md
├── examples.md
├── agent-integration.md
└── exit-codes.md
```

---

## Quality Checklist

### Code Quality
- [x] All TypeScript types strict mode enabled
- [x] No `any` types without justification
- [x] Consistent error handling across all commands
- [x] No console.log (use stdout/stderr properly)
- [x] Linting passes (`pnpm lint`)
- [x] Formatting correct (`pnpm format`)

### Testing
- [x] >=85% code coverage
- [x] All happy paths tested
- [x] All error paths tested
- [x] Exit codes verified
- [x] Snapshot tests for formatted output
- [x] Integration tests for complete workflows

### Backward Compatibility
- [x] Existing `meatycapture create` works unchanged
- [x] Existing `meatycapture append` works unchanged
- [x] Existing `meatycapture list` works unchanged
- [x] No breaking changes to JSON input/output
- [x] All existing tests still pass

### Documentation
- [x] Help text complete and accurate
- [x] Examples provided for all commands
- [x] Exit codes documented
- [x] AI agent patterns documented
- [x] Troubleshooting guide provided

### Performance
- [x] CLI startup <100ms
- [x] List 100 docs <500ms
- [x] Create doc with 10 items <200ms
- [x] Search across 50 docs <300ms
- [x] No unexpected memory usage

---

## Success Metrics

**Functional**:
- All 6 log commands implemented and working
- All output modes (human, JSON, CSV, YAML) functional
- Stdin support working for create/append
- Exit codes standardized and correct
- All formatters producing valid output

**Quality**:
- >=85% test coverage for CLI layer
- 100% backward compatibility with existing commands
- All existing tests pass
- Linting and type checking pass
- Performance baselines met

**Documentation**:
- Complete help text for all commands
- Usage examples for each output mode
- AI agent integration patterns documented
- Exit code reference complete
- Troubleshooting guide provided

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing commands | Extensive regression testing on all existing commands |
| Output format incompatibility | Snapshot tests and manual validation of JSON/CSV/YAML |
| Stdin handling issues | Mock stdin tests and real pipe testing |
| Exit code inconsistency | Centralized error handler with test verification |
| Performance regression | Baseline all commands, perf tests in CI |
| Missing error cases | Comprehensive error path testing |

---

## Validation Gates

### Before Moving to Phase 2

- [x] All 6 Phase 1 commands implemented and tested
- [x] >=85% test coverage achieved
- [x] Zero breaking changes to existing commands
- [x] Performance baselines met (<500ms typical)
- [x] Complete documentation provided
- [x] Code review approved by task-completion-validator
- [x] All linting and type checks passing
- [x] All CI/CD checks green

Once all Phase 1 tasks complete and gates pass, proceed to Phase 2: Project Management.
