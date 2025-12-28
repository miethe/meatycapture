# Phase 3: Field Catalog Management

**Duration**: 1-2 weeks | **Story Points**: 16
**Assigned**: backend-typescript-architect (Sonnet)

---

## Overview

Phase 3 implements field catalog administration through the `field` command hierarchy. Operations manage global and project-scoped field options for type, domain, priority, status, context, and tags.

### Key Deliverables
- All 4 field subcommands (list, add, remove, import)
- Global and project-level field option management
- Field option CRUD operations
- Batch import/export from JSON/YAML
- Output formatters for all modes
- Comprehensive tests with >=85% coverage

### Success Criteria
- All 4 field subcommands implemented
- Global field options readable/writable
- Project-level field options readable/writable/scoped
- Batch import functional
- >=85% code coverage for Phase 3
- Zero regression from Phases 1-2
- Integration tests for field workflows

---

## Architecture

### Field Catalog Pattern

Field operations leverage the existing FieldCatalogStore adapter:

```typescript
// src/cli/commands/field/list.ts
export async function handleFieldList(
  options: FieldListOptions
): Promise<void> {
  try {
    // 1. Load field catalog
    const fieldStore = createFieldCatalogStore();
    const catalog = await fieldStore.getAll();

    // 2. Filter by field name if specified
    let fields = catalog;
    if (options.field) {
      fields = { [options.field]: catalog[options.field] };
    }

    // 3. If project specified, merge global + project options
    let effectiveFields = fields;
    if (options.project) {
      const projectCatalog = await fieldStore.getForProject(options.project);
      effectiveFields = mergeGlobalAndProject(fields, projectCatalog);
    }

    // 4. Format output
    const output = formatFields(effectiveFields, options);

    console.log(output);
    process.exit(0);
  } catch (error) {
    handleError(error, 1);
  }
}
```

### Global vs Project-Level Scoping

```typescript
interface FieldOption {
  id: string;           // opt-uuid-short
  field: string;        // type|domain|priority|status|context|tags
  value: string;        // "enhancement", "bug", "high", etc.
  scope: 'global' | 'project';
  project_id?: string;  // Only if scope='project'
  created_at: Date;
  updated_at: Date;
}

interface FieldCatalog {
  global: Record<string, FieldOption[]>;           // type→[options]
  projects: Record<string, Record<string, FieldOption[]>>; // project→field→[options]
}
```

---

## Task Breakdown

### TASK-CLI-P3-001: Implement `field list` Command

**Assigned**: backend-typescript-architect

**Description**: List available field options (global or project-specific) with filtering and formatting.

**Acceptance Criteria**:
- [x] `meatycapture field list` shows all global fields
- [x] --field <name> filters to specific field (type, domain, priority, status, context, tags)
- [x] --project <id> shows effective options for project (global + project-specific)
- [x] --global-only shows only global options
- [x] Default human format: field name, list of values with ID
- [x] --json outputs as structured JSON object
- [x] --yaml outputs as YAML
- [x] --csv outputs as CSV (field, value, scope, project_id)
- [x] Sorted alphabetically (values and field names)
- [x] Exit code 0 always (even if field empty)
- [x] Exit code 2 if project not found
- [x] Unit and integration tests

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `src/cli/commands/field/list.ts`
- `tests/cli/commands/field.test.ts` (list section)

**Dependencies**: Phase 1 and 2 complete

---

### TASK-CLI-P3-002: Implement `field add` Command

**Assigned**: backend-typescript-architect

**Description**: Add new field option (global or project-specific) with validation.

**Acceptance Criteria**:
- [x] `meatycapture field add <field> <value>` adds to global
- [x] --project <id> adds as project-specific
- [x] Validates field name (type, domain, priority, status, context, tags)
- [x] Validates value is non-empty string
- [x] Validates value doesn't already exist for that field/scope
- [x] Generates option ID (opt-uuid-short)
- [x] Sets scope based on --project flag
- [x] --json outputs created option as JSON
- [x] --yaml outputs created option as YAML
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error (invalid field/value)
- [x] Exit code 2 on project not found
- [x] Exit code 3 on duplicate value
- [x] Unit and integration tests

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `src/cli/commands/field/add.ts`
- `src/cli/handlers/field.ts` (field validation, ID generation)
- `tests/cli/commands/field.test.ts` (add section)

**Dependencies**: TASK-CLI-P3-001

---

### TASK-CLI-P3-003: Implement `field remove` Command

**Assigned**: backend-typescript-architect

**Description**: Remove field option with confirmation and safety checks.

**Acceptance Criteria**:
- [x] `meatycapture field remove <option-id>` removes option
- [x] Prompts for confirmation unless --force/-f
- [x] Validates option exists
- [x] Cannot remove global option if used in project (exit 1)
- [x] Can remove project-specific option freely
- [x] Confirmation uses readline for interactive input
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error (cannot remove)
- [x] Exit code 2 on option not found
- [x] Exit code 130 on user cancel
- [x] Unit and integration tests

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/commands/field/remove.ts`
- `tests/cli/commands/field.test.ts` (remove section)

**Dependencies**: TASK-CLI-P3-001

---

### TASK-CLI-P3-004: Implement `field import` Command

**Assigned**: backend-typescript-architect

**Description**: Batch import field options from JSON/YAML file.

**Acceptance Criteria**:
- [x] `meatycapture field import <file-path>` imports from JSON
- [x] Supports .json and .yaml file extensions
- [x] Input format: { "field": ["value1", "value2"], ... }
- [x] --project <id> imports as project-specific
- [x] --merge merges with existing (default: fail on duplicate)
- [x] Validates all options before importing (atomic)
- [x] Reports summary: field, count added, count skipped
- [x] --json outputs summary as JSON
- [x] --yaml outputs summary as YAML
- [x] Exit code 0 on success
- [x] Exit code 1 on parse error
- [x] Exit code 2 on file not found
- [x] Exit code 3 on duplicate conflict (use --merge)
- [x] Unit and integration tests

**Estimate**: 5 story points (1.5 days)

**Deliverables**:
- `src/cli/commands/field/import.ts`
- `src/cli/handlers/yaml.ts` (if needed for YAML parsing)
- `tests/cli/commands/field.test.ts` (import section)

**Dependencies**: TASK-CLI-P3-001

---

### TASK-CLI-P3-005: Write Field Catalog Tests

**Assigned**: backend-typescript-architect

**Description**: Comprehensive tests for all field commands including CRUD workflows.

**Acceptance Criteria**:
- [x] Unit tests for all field commands (4 commands)
- [x] Integration tests for CRUD workflows (create→read→remove)
- [x] File I/O tests with temp config files
- [x] Batch import tests with JSON/YAML files
- [x] Validation error tests
- [x] Global vs project-level scoping tests
- [x] Exit code verification tests
- [x] Formatter tests (JSON, YAML, CSV)
- [x] >=85% code coverage for Phase 3
- [x] All tests pass with `pnpm test`

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `tests/cli/commands/field.test.ts` (complete)
- Coverage report showing >=85%

**Dependencies**: All TASK-CLI-P3-001 through TASK-CLI-P3-004

---

### TASK-CLI-P3-006: Integration Testing (Phases 1-3)

**Assigned**: backend-typescript-architect

**Description**: Cross-phase integration tests ensuring Phase 3 doesn't break Phases 1-2.

**Acceptance Criteria**:
- [x] All Phase 1 tests still pass
- [x] All Phase 2 tests still pass
- [x] All Phase 3 tests pass
- [x] Combined workflow: create project → add field option → create log using new option
- [x] Cross-command compatibility verified
- [x] No regression in existing functionality

**Estimate**: 2 story points (0.5 days)

**Deliverables**:
- `tests/cli/integration.test.ts` (extended with Phase 3 tests)

**Dependencies**: TASK-CLI-P3-005

---

## Implementation Sequence

**Week 1** (5 days):
1. TASK-CLI-P3-001: `field list` (1 day)
2. TASK-CLI-P3-002: `field add` (1 day)
3. TASK-CLI-P3-003: `field remove` (1 day)
4. TASK-CLI-P3-004: `field import` (1.5 days)
5. Checkpoint: All field read/write commands working

**Week 1-2** (5 days):
6. TASK-CLI-P3-005: Write tests (1 day)
7. TASK-CLI-P3-006: Integration testing (0.5 days)
8. Checkpoint: All Phase 3 tasks complete and validated

---

## File Organization

```
src/cli/
├── commands/
│   ├── log/                            # From Phase 1
│   ├── project/                        # From Phase 2
│   └── field/                          # NEW
│       ├── list.ts
│       ├── add.ts
│       ├── remove.ts
│       └── import.ts
├── handlers/
│   ├── errors.ts
│   ├── exitCodes.ts
│   ├── stdin.ts
│   ├── search.ts
│   ├── project.ts
│   └── field.ts                        # NEW (field validation, ID generation)
└── formatters/

tests/cli/
├── commands/
│   ├── log.test.ts
│   ├── project.test.ts
│   └── field.test.ts                   # NEW
├── formatters.test.ts
├── handlers.test.ts
└── integration.test.ts                 # Extended

docs/cli/
├── log-commands.md
├── project-commands.md
├── field-commands.md                   # NEW
├── examples.md
└── exit-codes.md
```

---

## Quality Checklist

### Code Quality
- [x] Consistent with Phases 1-2 patterns
- [x] All TypeScript types strict
- [x] Error handling consistent
- [x] Linting passes
- [x] Formatting correct

### Testing
- [x] >=85% code coverage
- [x] All happy paths tested
- [x] All error paths tested
- [x] Exit codes verified
- [x] Integration with Phases 1-2

### Backward Compatibility
- [x] All Phase 1 commands still work
- [x] All Phase 2 commands still work
- [x] All Phase 1 tests pass
- [x] All Phase 2 tests pass
- [x] No breaking changes

### Documentation
- [x] Help text for all commands
- [x] Examples for all commands
- [x] Field catalog examples
- [x] Batch import examples

---

## Success Metrics

**Functional**:
- All 4 field commands implemented
- Global field options working
- Project-level field options working
- Batch import functional

**Quality**:
- >=85% test coverage for Phase 3
- 100% backward compatibility with Phases 1-2
- All previous tests pass

**Documentation**:
- Help text complete
- Command examples provided
- Workflow documentation complete

---

## Field Naming Conventions

Valid field names (from PRD):
- `type` - enhancement, bug, idea, task, question, etc.
- `domain` - api, web, cli, data, infra, ml
- `priority` - low, medium, high, critical
- `status` - triage, backlog, planned, in-progress, done, wontfix
- `context` - freeform, typically a URL or path
- `tags` - freeform tags for grouping

---

## Input File Format

### JSON Import
```json
{
  "type": ["feature-request", "chore"],
  "priority": ["p0", "p1", "p2"],
  "status": ["needs-review", "approved"],
  "domain": ["backend", "frontend"]
}
```

### YAML Import
```yaml
type:
  - feature-request
  - chore
priority:
  - p0
  - p1
  - p2
status:
  - needs-review
  - approved
domain:
  - backend
  - frontend
```

---

## Validation Gates

### Before Moving to Phase 4

- [x] All 4 Phase 3 commands implemented and tested
- [x] >=85% code coverage achieved
- [x] Zero breaking changes to Phases 1-2
- [x] All Phase 1 and 2 tests still pass
- [x] Code review approved
- [x] All linting and type checks passing
- [x] All CI/CD checks green

Once all Phase 3 tasks complete and gates pass, proceed to Phase 4: Config & Interactive.
