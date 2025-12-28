# Phase 4: Configuration & Interactive Mode

**Duration**: 1-2 weeks | **Story Points**: 14
**Assigned**: backend-typescript-architect (Sonnet) + ui-engineer-enhanced (Sonnet)

---

## Overview

Phase 4 completes the CLI with configuration management commands and introduces an optional `--interactive` mode for guided human workflows. This phase adds the final 3 commands (config show/set/init) and optional interactive prompts.

### Key Deliverables
- All 3 config subcommands (show, set, init)
- Configuration initialization and management
- `--interactive` mode for guided prompts (optional enhancement)
- Integration with all previous phases
- Complete CLI documentation
- Comprehensive tests with >=85% coverage

### Success Criteria
- All 3 config subcommands implemented
- Configuration file creation and management
- Environment variable handling
- `--interactive` mode functional (for human-friendly workflows)
- >=85% code coverage for Phase 4
- Zero regression from Phases 1-3
- Complete documentation for all 19 commands

---

## Architecture

### Configuration Pattern

Configuration operations manage MeatyCapture settings:

```typescript
// src/cli/commands/config/show.ts
export async function handleConfigShow(
  options: ConfigShowOptions
): Promise<void> {
  try {
    // 1. Load configuration
    const configStore = createConfigStore();
    const config = await configStore.getConfig();

    // 2. Load environment overrides
    const envOverrides = {
      MEATYCAPTURE_CONFIG_DIR: process.env.MEATYCAPTURE_CONFIG_DIR,
      MEATYCAPTURE_DEFAULT_PROJECT: process.env.MEATYCAPTURE_DEFAULT_PROJECT,
      MEATYCAPTURE_DEFAULT_PROJECT_PATH: process.env.MEATYCAPTURE_DEFAULT_PROJECT_PATH,
    };

    // 3. Format output
    const output = formatConfig(config, envOverrides, options);

    console.log(output);
    process.exit(0);
  } catch (error) {
    handleError(error, 1);
  }
}
```

### Interactive Mode Pattern

For human-friendly workflows:

```typescript
// src/cli/interactive/prompts.ts
export async function promptForProject(): Promise<string> {
  // Uses readline or inquirer for interactive selection
  const projectStore = createProjectStore();
  const projects = await projectStore.list();

  return await selectFromList(
    projects.map(p => ({ name: p.name, value: p.id })),
    'Select a project:'
  );
}
```

---

## Task Breakdown

### TASK-CLI-P4-001: Implement `config show` Command

**Assigned**: backend-typescript-architect

**Description**: Display current configuration and environment variable overrides.

**Acceptance Criteria**:
- [x] `meatycapture config show` displays configuration
- [x] Shows config directory path
- [x] Shows config file location
- [x] Shows projects file location
- [x] Shows fields file location
- [x] Shows default project (if set)
- [x] Shows environment variable overrides (set/unset)
- [x] --json outputs configuration as JSON
- [x] --yaml outputs configuration as YAML
- [x] --config-dir flag shows only config directory path
- [x] Exit code 0 always
- [x] Unit and integration tests

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/commands/config/show.ts`
- `tests/cli/commands/config.test.ts` (show section)

**Dependencies**: Phases 1-3 complete

---

### TASK-CLI-P4-002: Implement `config set` Command

**Assigned**: backend-typescript-architect

**Description**: Set configuration values and environment variables.

**Acceptance Criteria**:
- [x] `meatycapture config set <key> <value>` sets config
- [x] Valid keys: default_project, config_dir
- [x] Validates key is recognized
- [x] Validates value (project exists for default_project, path for config_dir)
- [x] Updates ~/.meatycapture/config.json
- [x] Creates config file if not exists
- [x] Returns success message with key=value
- [x] Exit code 0 on success
- [x] Exit code 1 on validation error (invalid key/value)
- [x] Exit code 2 on I/O error (not writable)
- [x] Unit and integration tests

**Estimate**: 3 story points (1 day)

**Deliverables**:
- `src/cli/commands/config/set.ts`
- `tests/cli/commands/config.test.ts` (set section)

**Dependencies**: TASK-CLI-P4-001

---

### TASK-CLI-P4-003: Implement `config init` Command

**Assigned**: backend-typescript-architect

**Description**: Initialize default configuration structure with sample project.

**Acceptance Criteria**:
- [x] `meatycapture config init` initializes config
- [x] Creates ~/.meatycapture directory if missing
- [x] Creates default config.json with version and timestamp
- [x] Creates default projects.json with sample "meatycapture" project
- [x] Creates default fields.json with standard field options
- [x] --config-dir <path> uses custom config directory
- [x] --force overwrites existing config
- [x] Default behavior fails if config exists (exit 3)
- [x] Reports what was created
- [x] Exit code 0 on success
- [x] Exit code 3 if config exists (use --force)
- [x] Unit and integration tests

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `src/cli/commands/config/init.ts`
- `src/cli/handlers/config.ts` (config defaults, structure)
- `tests/cli/commands/config.test.ts` (init section)

**Dependencies**: TASK-CLI-P4-001

---

### TASK-CLI-P4-004: Implement Interactive Mode (Optional)

**Assigned**: ui-engineer-enhanced (Sonnet)

**Description**: Add `--interactive` flag to guided prompts for human-friendly workflows.

**Acceptance Criteria**:
- [x] `meatycapture log create --interactive` prompts for project, document, items
- [x] `meatycapture project add --interactive` prompts for project details
- [x] `meatycapture field add --interactive` prompts for field and value
- [x] Uses readline or inquirer for interactive selection
- [x] Provides default suggestions where applicable
- [x] Validates input during entry
- [x] Shows clear prompts and help text
- [x] Can cancel with Ctrl+C (exit 130)
- [x] Works across all command groups (log, project, field, config)
- [x] Unit and integration tests

**Estimate**: 5 story points (1.5 days)

**Deliverables**:
- `src/cli/interactive/prompts.ts` (prompt implementations)
- `src/cli/interactive/validators.ts` (input validation)
- `src/cli/interactive/utils.ts` (helper functions)
- Updated all command handlers to support --interactive
- `tests/cli/interactive.test.ts`

**Dependencies**: All TASK-CLI-P4-001, TASK-CLI-P4-002, TASK-CLI-P4-003

---

### TASK-CLI-P4-005: Write Configuration Tests

**Assigned**: backend-typescript-architect

**Description**: Comprehensive tests for config commands and interactive mode.

**Acceptance Criteria**:
- [x] Unit tests for all config commands (3 commands)
- [x] Config file creation/modification tests
- [x] Environment variable handling tests
- [x] Interactive mode tests (mock stdin/prompts)
- [x] Validation error tests
- [x] Exit code verification tests
- [x] Formatter tests (JSON, YAML)
- [x] >=85% code coverage for Phase 4
- [x] All tests pass with `pnpm test`

**Estimate**: 4 story points (1 day)

**Deliverables**:
- `tests/cli/commands/config.test.ts` (complete)
- `tests/cli/interactive.test.ts` (complete)
- Coverage report showing >=85%

**Dependencies**: All TASK-CLI-P4-001 through TASK-CLI-P4-004

---

### TASK-CLI-P4-006: Final Integration Testing (All Phases)

**Assigned**: backend-typescript-architect

**Description**: Cross-phase integration tests ensuring all 19 commands work together.

**Acceptance Criteria**:
- [x] All Phase 1 tests pass
- [x] All Phase 2 tests pass
- [x] All Phase 3 tests pass
- [x] All Phase 4 tests pass
- [x] Combined workflow: init → add project → add field → create log
- [x] All output modes work across all commands
- [x] Stdin piping works with all input commands
- [x] Exit codes verified across all error paths
- [x] No regression in any phase

**Estimate**: 2 story points (0.5 days)

**Deliverables**:
- `tests/cli/integration.test.ts` (final comprehensive suite)

**Dependencies**: TASK-CLI-P4-005

---

### TASK-CLI-P4-007: Complete CLI Documentation

**Assigned**: documentation-writer (Haiku)

**Description**: Write complete documentation for all 19 CLI commands.

**Acceptance Criteria**:
- [x] Command reference for all 19 subcommands
- [x] Help text examples for each command
- [x] Usage examples showing all output modes
- [x] Interactive mode examples
- [x] Common workflow guide (init→create→list→view)
- [x] AI agent integration patterns and examples
- [x] Configuration management guide
- [x] Environment variable reference
- [x] Exit code reference
- [x] Troubleshooting guide
- [x] Performance tips and best practices

**Estimate**: 5 story points (1 day)

**Deliverables**:
- `docs/cli/index.md` (overview and table of contents)
- `docs/cli/commands-reference.md` (all 19 commands)
- `docs/cli/examples.md` (usage examples)
- `docs/cli/workflows.md` (common workflows)
- `docs/cli/agent-integration.md` (AI agent patterns)
- `docs/cli/configuration.md` (config management)
- `docs/cli/exit-codes.md` (exit code reference)
- `docs/cli/troubleshooting.md` (common issues)
- `docs/cli/performance.md` (tips and benchmarks)

**Dependencies**: All Phase 4 tasks

---

## Implementation Sequence

**Week 1** (5 days):
1. TASK-CLI-P4-001: `config show` (1 day)
2. TASK-CLI-P4-002: `config set` (1 day)
3. TASK-CLI-P4-003: `config init` (1 day)
4. TASK-CLI-P4-004: Interactive mode (1.5 days)
5. Checkpoint: All config commands and interactive mode working

**Week 1-2** (5 days):
6. TASK-CLI-P4-005: Write tests (1 day)
7. TASK-CLI-P4-006: Final integration testing (0.5 days)
8. TASK-CLI-P4-007: Complete documentation (1 day)
9. Checkpoint: All Phase 4 tasks complete and validated

---

## File Organization

```
src/cli/
├── commands/
│   ├── log/                            # From Phase 1
│   ├── project/                        # From Phase 2
│   ├── field/                          # From Phase 3
│   └── config/                         # NEW
│       ├── show.ts
│       ├── set.ts
│       └── init.ts
├── handlers/
│   ├── errors.ts
│   ├── exitCodes.ts
│   ├── stdin.ts
│   ├── search.ts
│   ├── project.ts
│   ├── field.ts
│   └── config.ts                       # NEW (config defaults, structure)
├── formatters/                         # From Phase 1
└── interactive/                        # NEW
    ├── prompts.ts                      # Interactive prompts
    ├── validators.ts                   # Input validation
    └── utils.ts                        # Helper functions

tests/cli/
├── commands/
│   ├── log.test.ts
│   ├── project.test.ts
│   ├── field.test.ts
│   └── config.test.ts                  # NEW
├── formatters.test.ts
├── handlers.test.ts
├── interactive.test.ts                 # NEW
└── integration.test.ts                 # Final comprehensive

docs/cli/
├── index.md                            # NEW (overview)
├── commands-reference.md               # NEW (all 19 commands)
├── log-commands.md                     # From Phase 1
├── project-commands.md                 # From Phase 2
├── field-commands.md                   # From Phase 3
├── config-commands.md                  # NEW
├── examples.md
├── workflows.md                        # NEW
├── agent-integration.md
├── configuration.md                    # NEW
├── exit-codes.md
├── troubleshooting.md                  # NEW
└── performance.md                      # NEW
```

---

## Configuration File Structure

### ~/.meatycapture/config.json
```json
{
  "version": "1.0.0",
  "default_project": "meatycapture",
  "config_dir": "/Users/user/.meatycapture",
  "created_at": "2025-12-27T00:00:00Z",
  "updated_at": "2025-12-27T00:00:00Z"
}
```

### ~/.meatycapture/projects.json
```json
{
  "projects": [
    {
      "id": "meatycapture",
      "name": "MeatyCapture",
      "default_path": "/Users/user/.meatycapture/docs/meatycapture",
      "repo_url": "https://github.com/user/meatycapture",
      "enabled": true,
      "created_at": "2025-12-27T00:00:00Z",
      "updated_at": "2025-12-27T00:00:00Z"
    }
  ]
}
```

### ~/.meatycapture/fields.json
```json
{
  "type": [
    { "id": "opt-001", "value": "enhancement", "scope": "global" },
    { "id": "opt-002", "value": "bug", "scope": "global" }
  ],
  "priority": [
    { "id": "opt-003", "value": "low", "scope": "global" }
  ]
}
```

---

## Interactive Mode Examples

### Interactive Project Creation
```
$ meatycapture project add --interactive
? Project name: My New Project
? Default path: /path/to/docs
? Repository URL (optional): https://github.com/user/project
? Create project "my-new-project"? (Y/n)
✓ Created project: my-new-project
```

### Interactive Item Creation
```
$ meatycapture log create --interactive
? Select project: (use arrow keys)
❯ meatycapture
  my-new-project
? Create new document or append to existing? (new/existing)
  new
? Document title: Q1 Planning
? Item title: Review API design
? Item type: (use arrow keys)
❯ enhancement
  bug
  idea
? Item domain: api
? Item priority: high
? Item status: in-progress
? Tags (comma-separated): api,planning
? Notes: Review current API design for consistency
? Add another item to this document? (y/N)
  n
✓ Created document: /path/to/REQ-20251227-meatycapture-01.md
```

---

## Quality Checklist

### Code Quality
- [x] Consistent with all previous phases
- [x] All TypeScript types strict
- [x] Error handling consistent
- [x] Linting passes
- [x] Formatting correct
- [x] Interactive mode properly handles cancellation

### Testing
- [x] >=85% code coverage for Phase 4
- [x] All config commands tested
- [x] Interactive mode tested (mock input)
- [x] All phases integrated and tested
- [x] No regression in any phase

### Backward Compatibility
- [x] All Phase 1-3 commands still work
- [x] All Phase 1-3 tests pass
- [x] No breaking changes
- [x] Existing logs/configs unaffected

### Documentation
- [x] Complete command reference
- [x] All examples provided
- [x] Interactive mode documented
- [x] All workflows documented
- [x] Troubleshooting guide

---

## Success Metrics

**Functional**:
- All 3 config commands implemented
- Configuration initialization and management working
- Interactive mode functional (optional)
- All 19 commands complete and working

**Quality**:
- >=85% code coverage for Phase 4
- >=85% code coverage overall for CLI
- 100% backward compatibility with all previous phases
- All tests passing (all phases)

**Documentation**:
- Complete command reference for all 19 commands
- Usage examples for all commands
- Interactive mode guide
- Workflow documentation
- Troubleshooting guide

---

## CLI Command Summary (All 19)

### Log Commands (6)
- `meatycapture log create <json-file>`
- `meatycapture log append <doc-path> <json-file>`
- `meatycapture log list [project]`
- `meatycapture log view <doc-path>`
- `meatycapture log search <query> [project]`
- `meatycapture log delete <doc-path>`

### Project Commands (5)
- `meatycapture project list`
- `meatycapture project add <name> <path>`
- `meatycapture project update <id> [options]`
- `meatycapture project enable <id>`
- `meatycapture project disable <id>`
- `meatycapture project set-default <id>`

### Field Commands (4)
- `meatycapture field list [--field <name>]`
- `meatycapture field add <field> <value>`
- `meatycapture field remove <option-id>`
- `meatycapture field import <file-path>`

### Config Commands (3)
- `meatycapture config show`
- `meatycapture config set <key> <value>`
- `meatycapture config init`

---

## Validation Gates

### Before Closing CLI v1

- [x] All 19 commands implemented and tested
- [x] >=85% code coverage across all phases
- [x] Zero breaking changes to existing functionality
- [x] All phases' tests pass
- [x] Code review approved
- [x] All linting and type checks passing
- [x] All CI/CD checks green
- [x] Complete documentation provided
- [x] All examples working
- [x] Performance baselines met
- [x] Ready for production release

---

## Post-MVP Enhancements

These features are documented for future iterations:

### v1.1
- Shell completion generation (bash/zsh/fish)
- Enhanced --interactive mode with menu system
- Command aliases (e.g., `mc` for `meatycapture`)

### v1.2
- Batch file operations (`meatycapture batch create multiple-items.json`)
- Export commands (`meatycapture log export <doc-path> --format csv|json`)
- Filtering presets for common searches

### v1.3
- Remote Git integration (push after create, webhook notifications)
- Database adapter support (future server-storage-v2)
- Advanced templating for item creation

### v2.0
- REST API integration (when server-storage-v1 available)
- Cloud storage adapters (AWS S3, Google Cloud)
- Multi-workspace support
- Team collaboration features

---

## Conclusion

Phase 4 completes the MeatyCapture CLI v1 with configuration management and optional interactive mode, bringing all 19 subcommands to production-ready status. The CLI provides both human-friendly and AI-agent-compatible interfaces, with comprehensive documentation, >85% test coverage, and zero breaking changes to existing functionality.

Once all Phase 4 tasks complete and validation gates pass, the CLI v1 is ready for release.
