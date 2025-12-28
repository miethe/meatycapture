# Phase 2: Project Management

**Duration**: 1-2 weeks | **Story Points**: 16
**Assigned**: backend-typescript-architect (Sonnet)

---

## Overview

Phase 2 implements complete project management capabilities through the `project` command hierarchy. All operations leverage the existing ProjectStore adapter with no modifications to core code.

### Key Deliverables
- All 5 project subcommands (list, add, update, enable, disable, set-default)
- Project CRUD operations via CLI
- Output formatters for all modes (JSON, YAML, table, human)
- Comprehensive tests with >=85% coverage
- Integration with Phase 1 infrastructure

### Success Criteria
- All 5 project subcommands implemented
- Project configuration creation, modification, and state management
- Output formatters working for all commands
- >=85% code coverage for Phase 2
- Zero regression from Phase 1
- Integration tests for project workflows

---

## Architecture

### Project Management Pattern

Project operations follow the same pattern as Phase 1 log commands:

```typescript
// src/cli/commands/project/list.ts
export async function handleProjectList(
  options: ProjectListOptions
): Promise<void> {
  try {
    // 1. Load projects via ProjectStore
    const projectStore = createProjectStore();
    let projects = await projectStore.list();

    // 2. Apply filtering if specified
    if (options.enabledOnly) {
      projects = projects.filter(p => p.enabled);
    }
    if (options.disabledOnly) {
      projects = projects.filter(p => !p.enabled);
    }

    // 3. Format output based on flags
    const output = formatProjects(projects, options.format);

    // 4. Print and exit
    console.log(output);
    process.exit(0);
  } catch (error) {
    handleError(error, 1);
  }
}
```

### ProjectStore Integration

All project operations use the existing ProjectStore adapter:

```typescript
interface ProjectStore {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(project: Project): Promise<void>;
  update(id: string, updates: Partial<Project>): Promise<void>;
  delete(id: string): Promise<void>;
}
```

No changes to adapter code required.

---

## Task Breakdown

### TASK-CLI-P2-001: Implement `project list` Command

**Assigned**: backend-typescript-architect

**Description**: List all configured projects with filtering and formatting options.

**Acceptance Criteria**:
- [x] `meatycapture project list` displays all projects
- [x] Default human format shows: ID, Name, Path, Repo URL, Created, Enabled status
- [x] --json outputs as JSON array
- [x] --yaml outputs as YAML
- [x] --csv outputs as CSV
- [x] --table outputs as ASCII table
- [x] --enabled-only shows only enabled projects
- [x] --disabled-only shows only disabled projects
- [x] Sorted by name alphabetically (human), configurable (--sort id|name|created)
- [x] Exit code 0 always (even if no projects)
- [x] Unit and integration tests

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/commands/project/list.ts`
- `tests/cli/commands/project.test.ts` (list section)

**Dependencies**: Phase 1 complete (formatters, error handling)

---

### TASK-CLI-P2-002: Implement `project add` Command

**Assigned**: backend-typescript-architect

**Description**: Create new project configuration with validation and ID generation.

**Acceptance Criteria**:
- [x] `meatycapture project add <name> <default-path>` creates project
- [x] Generates project ID from name (kebab-case) or --id flag
- [x] --repo-url optional parameter
- [x] Validates name and path are provided
- [x] Validates path exists and is writable
- [x] Validates project ID is unique (not already exists)
- [x] Creates project with enabled=true, timestamps
- [x] --json outputs created project as JSON
- [x] --yaml outputs created project as YAML
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error (invalid input)
- [x] Exit code 2 on I/O error (path not writable)
- [x] Exit code 3 on resource conflict (ID already exists)
- [x] Unit and integration tests

**Estimate**: 4 story points (1.5 days)

**Deliverables**:
- `src/cli/commands/project/add.ts`
- `src/cli/handlers/project.ts` (project ID generation, validation)
- `tests/cli/commands/project.test.ts` (add section)

**Dependencies**: TASK-CLI-P2-001

---

### TASK-CLI-P2-003: Implement `project update` Command

**Assigned**: backend-typescript-architect

**Description**: Modify existing project configuration with partial updates.

**Acceptance Criteria**:
- [x] `meatycapture project update <id> [--name] [--path] [--repo-url]` updates project
- [x] At least one field must be specified
- [x] Validates updated path exists and is writable
- [x] Validates project exists (exit 2 if not found)
- [x] Updates only specified fields, preserves others
- [x] Updates timestamp on change
- [x] --json outputs updated project as JSON
- [x] --yaml outputs updated project as YAML
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error
- [x] Exit code 2 on project not found
- [x] Unit and integration tests

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/commands/project/update.ts`
- `tests/cli/commands/project.test.ts` (update section)

**Dependencies**: TASK-CLI-P2-001

---

### TASK-CLI-P2-004: Implement `project enable/disable` Commands

**Assigned**: backend-typescript-architect

**Description**: Enable or disable a project (controls whether it appears in selections).

**Acceptance Criteria**:
- [x] `meatycapture project enable <id>` enables project
- [x] `meatycapture project disable <id>` disables project
- [x] Validates project exists
- [x] Sets enabled=true/false
- [x] Updates timestamp
- [x] Returns success message with project name
- [x] Exit code 0 on success
- [x] Exit code 2 on project not found
- [x] No change if already in desired state (success)
- [x] Unit and integration tests

**Estimate**: 2 story points (0.5 days)

**Deliverables**:
- `src/cli/commands/project/enable.ts`
- `src/cli/commands/project/disable.ts`
- `tests/cli/commands/project.test.ts` (enable/disable section)

**Dependencies**: TASK-CLI-P2-001

---

### TASK-CLI-P2-005: Implement `project set-default` Command

**Assigned**: backend-typescript-architect

**Description**: Set the default project for CLI operations.

**Acceptance Criteria**:
- [x] `meatycapture project set-default <id>` sets default
- [x] Validates project exists
- [x] Stores in config (MEATYCAPTURE_DEFAULT_PROJECT)
- [x] Updates ~/.meatycapture/config.json
- [x] Returns success message with project name
- [x] Exit code 0 on success
- [x] Exit code 2 on project not found
- [x] Unit and integration tests

**Estimate**: 2 story points (0.5 days)

**Deliverables**:
- `src/cli/commands/project/set-default.ts`
- `tests/cli/commands/project.test.ts` (set-default section)

**Dependencies**: TASK-CLI-P2-001

---

### TASK-CLI-P2-006: Write Project Management Tests

**Assigned**: backend-typescript-architect

**Description**: Comprehensive tests for all project commands including CRUD workflows and error handling.

**Acceptance Criteria**:
- [x] Unit tests for all project commands (5 commands)
- [x] Integration tests for CRUD workflows (create→read→update→enable/disable→set-default)
- [x] File I/O tests with temp config files
- [x] Validation error tests (invalid ID, missing project, etc.)
- [x] Exit code verification tests
- [x] Formatter tests (JSON, YAML, CSV, table)
- [x] >=85% code coverage for Phase 2
- [x] All tests pass with `pnpm test`

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `tests/cli/commands/project.test.ts` (complete)
- Coverage report showing >=85%

**Dependencies**: All TASK-CLI-P2-001 through TASK-CLI-P2-005

---

### TASK-CLI-P2-007: Integration Testing (Phase 1 + Phase 2)

**Assigned**: backend-typescript-architect

**Description**: Cross-phase integration tests ensuring Phase 2 doesn't break Phase 1 and tests combined workflows.

**Acceptance Criteria**:
- [x] All Phase 1 tests still pass
- [x] All Phase 2 tests pass
- [x] Combined workflow test: create project → create log doc for project → list projects
- [x] Cross-command compatibility verified
- [x] No regression in existing functionality

**Estimate**: 2 story points (0.5 days)

**Deliverables**:
- `tests/cli/integration.test.ts` (extended with Phase 2 tests)

**Dependencies**: TASK-CLI-P2-006

---

## Implementation Sequence

**Week 1** (5 days):
1. TASK-CLI-P2-001: `project list` (1 day)
2. TASK-CLI-P2-002: `project add` (1.5 days)
3. TASK-CLI-P2-003: `project update` (1 day)
4. Checkpoint: All project read/write commands working

**Week 1-2** (5 days):
5. TASK-CLI-P2-004: `project enable/disable` (0.5 days)
6. TASK-CLI-P2-005: `project set-default` (0.5 days)
7. TASK-CLI-P2-006: Write tests (1 day)
8. TASK-CLI-P2-007: Integration testing (0.5 days)
9. Checkpoint: All Phase 2 tasks complete and validated

---

## File Organization

```
src/cli/
├── commands/
│   ├── log/                            # From Phase 1
│   │   ├── create.ts
│   │   ├── append.ts
│   │   ├── list.ts
│   │   ├── view.ts
│   │   ├── search.ts
│   │   └── delete.ts
│   └── project/                        # NEW
│       ├── list.ts
│       ├── add.ts
│       ├── update.ts
│       ├── enable.ts
│       ├── disable.ts
│       └── set-default.ts
├── handlers/                            # From Phase 1
│   ├── errors.ts
│   ├── exitCodes.ts
│   ├── stdin.ts
│   ├── search.ts
│   └── project.ts                      # NEW (ID generation, validation)
└── formatters/                         # From Phase 1

tests/cli/
├── commands/
│   ├── log.test.ts                     # From Phase 1
│   └── project.test.ts                 # NEW
├── formatters.test.ts                  # From Phase 1
├── handlers.test.ts                    # From Phase 1
└── integration.test.ts                 # Extended

docs/cli/
├── log-commands.md                     # From Phase 1
├── project-commands.md                 # NEW
├── examples.md                         # Extended
└── exit-codes.md                       # From Phase 1
```

---

## Quality Checklist

### Code Quality
- [x] Consistent with Phase 1 patterns
- [x] All TypeScript types strict
- [x] No `any` types without justification
- [x] Error handling consistent
- [x] Linting passes
- [x] Formatting correct

### Testing
- [x] >=85% code coverage
- [x] All happy paths tested
- [x] All error paths tested
- [x] Exit codes verified
- [x] Formatter tests
- [x] Integration with Phase 1

### Backward Compatibility
- [x] All Phase 1 commands still work
- [x] All Phase 1 tests pass
- [x] No breaking changes
- [x] Existing logs unaffected

### Documentation
- [x] Help text for all commands
- [x] Examples for all commands
- [x] Exit codes documented
- [x] Workflow examples provided

---

## Success Metrics

**Functional**:
- All 5 project commands implemented
- Project CRUD operations working
- State management (enable/disable/set-default) working
- All output modes functional

**Quality**:
- >=85% test coverage for Phase 2
- 100% backward compatibility with Phase 1
- All Phase 1 tests pass
- All Phase 2 tests pass

**Documentation**:
- Help text complete
- Command examples provided
- Workflow documentation complete

---

## Validation Gates

### Before Moving to Phase 3

- [x] All 5 Phase 2 commands implemented and tested
- [x] >=85% code coverage achieved
- [x] Zero breaking changes to Phase 1
- [x] All Phase 1 tests still pass
- [x] Code review approved
- [x] All linting and type checks passing
- [x] All CI/CD checks green

Once all Phase 2 tasks complete and gates pass, proceed to Phase 3: Field Catalog Management.
