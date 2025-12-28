# Implementation Plan: MeatyCapture CLI v1

**Complexity**: Large (L) | **Track**: Full
**Estimated Effort**: 68 Story Points | **Timeline**: 6-8 Weeks
**Feature Owner**: Engineering Team | **Status**: Planning

---

## Executive Summary

Extend the existing CLI foundation (3 commands: create, append, list) into a feature-rich command-line interface with 19 subcommands across 4 hierarchies (log, project, field, config). The CLI will serve dual purposes: human-friendly interactive workflows and AI-agent-compatible structured output for programmatic integration.

### Key Objectives

1. **Phase 1 (MVP)**: Enhance log operations with view, search, delete; add output formatters (JSON/CSV/table); implement stdin support and standardized exit codes
2. **Phase 2**: Complete project management CRUD with enable/disable/set-default operations
3. **Phase 3**: Field catalog administration with add/remove/import operations and project-level scoping
4. **Phase 4**: Configuration management and interactive mode for guided prompts

### Architecture Pattern

```
┌─────────────────────────────────────────────────┐
│ CLI Layer (src/cli/)                            │
│ - Commander.js for command parsing              │
│ - Output formatters (human/JSON/CSV/YAML/table) │
│ - Error handling & exit code conventions        │
└────────────────┬────────────────────────────────┘
                 │
┌─────────────────────────────────────────────────┐
│ Core Layer (src/core/)                          │
│ - Models, validation, serialization             │
│ - Business logic (UI-agnostic)                  │
│ - NO CHANGES: reuse existing codepaths          │
└────────────────┬────────────────────────────────┘
                 │
┌─────────────────────────────────────────────────┐
│ Adapter Layer (src/adapters/)                   │
│ - DocStore (fs-local)                           │
│ - ProjectStore (config-local)                   │
│ - FieldCatalogStore (config-local)              │
└────────────────┬────────────────────────────────┘
                 │
              Filesystem
```

### Success Criteria

- [x] All 19 subcommands implemented across 4 hierarchies
- [x] Phase 1 commands support --json, --csv, --quiet, --yaml flags
- [x] Stdin support for create/append (piped input via `-`)
- [x] Standardized exit codes (0=success, 1=validation, 2=I/O, 3=resource, 64=CLI, 130=interrupt)
- [x] >=85% test coverage for CLI layer
- [x] Zero backward compatibility breaks with existing commands
- [x] Performance: all commands <500ms for typical operations
- [x] Complete documentation with example workflows

---

## Phased Breakdown

This implementation plan spans 4 phases with distinct deliverables and dependencies:

### [Phase 1: MVP - Core Log Operations (Priority)](cli-v1/phase-1-log-commands.md)
**Duration**: 2-3 weeks | **Story Points**: 22
- Extend existing 3 commands with enhanced options
- Add `log view`, `log search`, `log delete` commands
- Implement output formatters (JSON, CSV, YAML, table)
- Add stdin support and exit code standardization
- **Baseline**: Human-friendly + AI-agent compatible for log operations

### [Phase 2: Project Management](cli-v1/phase-2-project-mgmt.md)
**Duration**: 1-2 weeks | **Story Points**: 16
- Implement `project` subcommand hierarchy
- Commands: list, add, update, enable, disable, set-default
- Leverage existing ProjectStore adapter with no modifications
- **Baseline**: Complete CRUD for project configuration

### [Phase 3: Field Catalog Management](cli-v1/phase-3-field-catalog.md)
**Duration**: 1-2 weeks | **Story Points**: 16
- Implement `field` subcommand hierarchy
- Commands: list, add, remove, import
- Support global and project-level field option management
- **Baseline**: Full field catalog administration

### [Phase 4: Config & Interactive (Post-MVP)](cli-v1/phase-4-config-interactive.md)
**Duration**: 1-2 weeks | **Story Points**: 14
- Implement `config` subcommand hierarchy
- Commands: show, set, init
- Add `--interactive` mode for guided prompts (Phase 4 only)
- **Baseline**: Configuration management and enhanced UX for humans

---

## Key Features by Hierarchy

### Log Commands (Phase 1)
- `log create <json-file>` - Create new document with JSON input
- `log append <doc-path> <json-file>` - Append items to existing document
- `log list [project]` - List documents (enhanced with formatters)
- `log view <doc-path>` - Display document contents
- `log search <query> [project]` - Search by text/tags/type/status
- `log delete <doc-path>` - Remove document (with confirmation)

### Project Commands (Phase 2)
- `project list` - List all configured projects
- `project add <name> <path>` - Create new project
- `project update <id> [options]` - Modify project
- `project enable/disable <id>` - Enable/disable project
- `project set-default <id>` - Set default project

### Field Commands (Phase 3)
- `field list [--field <name>]` - List available options
- `field add <field> <value>` - Add new option
- `field remove <option-id>` - Remove option
- `field import <file>` - Batch import options

### Config Commands (Phase 4)
- `config show` - Display current configuration
- `config set <key> <value>` - Update configuration
- `config init` - Initialize default configuration

---

## Output Format Modes

All Phase 1 commands support multiple output modes:

| Flag | Behavior | Use Case |
|------|----------|----------|
| (default) | Human-friendly formatted output | Terminal usage |
| `--json` | Valid JSON output (array/object) | Parsing by agents/scripts |
| `--yaml` | YAML-formatted output | Config files |
| `--csv` | CSV format for tabular data | Spreadsheet import |
| `--quiet` / `-q` | Suppress all non-error output | Scripting, cron |

---

## Exit Code Convention

All CLI commands follow standardized exit codes for scripting compatibility:

| Code | Meaning | Examples |
|------|---------|----------|
| 0 | Success | Command completed normally |
| 1 | Validation/logic error | Invalid JSON, missing required field |
| 2 | I/O error | File not found, permission denied |
| 3 | Resource error | Project/document not found |
| 64 | Command line error | Invalid flag syntax |
| 130 | User interrupted | Ctrl+C during confirmation prompt |

---

## AI Agent Integration Patterns

CLI is designed for programmatic usage in CI/CD and automation workflows:

### Pattern 1: Create Document (Programmatic)
```bash
cat > /tmp/capture.json << 'EOF'
{
  "project": "my-project",
  "items": [
    {
      "title": "Automated Test",
      "type": "task",
      "domain": "api",
      "context": "CI Pipeline",
      "priority": "high",
      "status": "in-progress",
      "tags": ["automation", "ci"],
      "notes": "Verify workflow"
    }
  ]
}
EOF

meatycapture log create /tmp/capture.json --json
```

### Pattern 2: Piped Input (No Intermediate Files)
```bash
jq '.capture' data.json | meatycapture log create - --quiet
```

### Pattern 3: Batch Operations
```bash
jq -c '.captures[]' batch.json | while read -r capture; do
  echo "$capture" | meatycapture log create - --quiet
done
```

### Pattern 4: Result Parsing
```bash
meatycapture log list my-project --json | \
  jq '.[] | select(.item_count > 2) | .doc_id'
```

---

## Technology & Dependencies

### Existing Stack (No Changes)
- **Commander.js** v11+ - Command parsing (already in use)
- **TypeScript** - Type safety
- **Node.js** 18+ - Runtime

### New Dependencies (Minimal)
- **chalk** v5+ - Colored output (already in use)
- **table** v6+ - ASCII table formatting (optional, for enhanced output)
- **yaml** v2+ - YAML output support (new)

### Zero New Storage Adapters
- CLI uses existing DocStore, ProjectStore, FieldCatalogStore adapters
- No server, HTTP client, or remote adapters introduced
- All file operations go through existing fs-local and config-local adapters

---

## Architecture Constraints

### Must-Have
- [x] Reuse 100% of existing core logic (models, validation, serializer)
- [x] Reuse 100% of existing adapter implementations
- [x] No breaking changes to existing CLI commands (create, append, list)
- [x] Backward compatible input/output formats

### Must-Not-Have
- [x] No REST API or server infrastructure (see server-storage-v1.md for that)
- [x] No interactive prompts by default (reserved for Phase 4 with --interactive flag)
- [x] No remote Git integration
- [x] No multi-user conflict resolution beyond last-write-wins

---

## Testing Strategy

### Unit Tests (Per Command)
- Argument parsing and validation
- Output formatting (JSON, CSV, YAML, table)
- Error handling and exit codes
- Type guards and input validation

### Integration Tests (End-to-End Workflows)
- Create → list → append → view → search → delete
- Project CRUD operations
- Field catalog management
- Stdin piped input
- Output format parsing (JSON/CSV roundtrips)

### File I/O Tests
- Temp directories for isolation
- Backup creation and restoration
- Concurrent access scenarios
- Malformed document recovery

### Snapshot Tests
- Generated markdown output format consistency
- Output formatting (table, CSV, YAML)

### Performance Tests
- CLI startup <100ms
- List 100 documents <500ms
- Create document with 10 items <200ms
- Search across 50 documents <300ms

---

## Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Path conflicts on Windows | Medium | Test on WSL; use Path.resolve() consistently |
| Large document parsing | Low | Stream-based parsing for files >1MB (future) |
| Concurrent CLI usage | Medium | Document last-write-wins; .bak created |
| Breaking existing commands | High | Maintain strict compatibility; test all existing flows |
| Performance regression | Medium | Baseline all commands; perf budget <500ms |

---

## Quality Gates & Acceptance

### Before Phase 1 Closure
- [ ] All 6 Phase 1 commands implemented and tested
- [ ] Output formatters (JSON, CSV, YAML, table) working
- [ ] Stdin support working for create/append
- [ ] Exit codes standardized across all commands
- [ ] >=85% test coverage for CLI layer
- [ ] No regression in existing commands (create, append, list)
- [ ] Performance baseline met (<500ms typical)
- [ ] CLI help text complete and accurate
- [ ] Example scripts provided in docs/

### Before Phase 2 Closure
- [ ] All 5 project management commands implemented
- [ ] Project CRUD operations tested
- [ ] No regression from Phase 1
- [ ] Integration tests passing

### Before Phase 3 Closure
- [ ] All 4 field catalog commands implemented
- [ ] Global + project-level scoping working
- [ ] Import batch operations tested
- [ ] No regression from Phases 1-2

### Before Phase 4 Closure
- [ ] All 3 config commands implemented
- [ ] Interactive mode (--interactive) working
- [ ] All 19 commands complete and tested
- [ ] Full CLI documentation in place

---

## Deliverables by Phase

### Phase 1 Deliverables
- `src/cli/commands/log/` directory with subcommands
- `src/cli/formatters/` directory with output formatters
- `src/cli/handlers/` directory with command handlers
- Updated `src/cli/index.ts` to register new commands
- `tests/cli/` test suite with >=85% coverage
- `docs/cli/` with examples and recipes
- `.claude/progress/cli-v1-phase-1.md` progress notes

### Phase 2 Deliverables
- `src/cli/commands/project/` directory with subcommands
- Updated `src/cli/handlers/` with project handlers
- Enhanced test suite covering project operations
- Updated CLI documentation

### Phase 3 Deliverables
- `src/cli/commands/field/` directory with subcommands
- Updated `src/cli/handlers/` with field handlers
- Enhanced test suite covering field operations
- Updated CLI documentation

### Phase 4 Deliverables
- `src/cli/commands/config/` directory with subcommands
- `src/cli/interactive/` directory with prompt utilities
- Updated `src/cli/handlers/` with config handlers
- Enhanced test suite covering config operations
- Complete CLI documentation with interactive mode examples

---

## File Organization

```
docs/project_plans/implementation_plans/features/
├── cli-v1.md                           # THIS FILE (main plan + summary)
└── cli-v1/
    ├── phase-1-log-commands.md         # Phase 1 detailed tasks
    ├── phase-2-project-mgmt.md         # Phase 2 detailed tasks
    ├── phase-3-field-catalog.md        # Phase 3 detailed tasks
    └── phase-4-config-interactive.md   # Phase 4 detailed tasks

src/cli/
├── index.ts                            # CLI entry point (updated)
├── commands/
│   ├── log/
│   │   ├── create.ts
│   │   ├── append.ts
│   │   ├── list.ts
│   │   ├── view.ts
│   │   ├── search.ts
│   │   └── delete.ts
│   ├── project/
│   │   ├── list.ts
│   │   ├── add.ts
│   │   ├── update.ts
│   │   ├── enable.ts
│   │   ├── disable.ts
│   │   └── set-default.ts
│   ├── field/
│   │   ├── list.ts
│   │   ├── add.ts
│   │   ├── remove.ts
│   │   └── import.ts
│   └── config/
│       ├── show.ts
│       ├── set.ts
│       └── init.ts
├── formatters/
│   ├── human.ts
│   ├── json.ts
│   ├── csv.ts
│   ├── yaml.ts
│   └── table.ts
├── handlers/
│   ├── stdin.ts
│   ├── errors.ts
│   └── exitCodes.ts
└── interactive/
    ├── prompts.ts
    ├── validators.ts
    └── utils.ts

tests/cli/
├── commands/
│   ├── log.test.ts
│   ├── project.test.ts
│   ├── field.test.ts
│   └── config.test.ts
├── formatters.test.ts
├── stdin.test.ts
└── integration.test.ts
```

---

## Subagent Assignments

### Phase 1-4: Core Implementation
**Assigned**: backend-typescript-architect (Sonnet)
- Implement all command handlers
- Implement output formatters
- Implement error handling and exit codes
- Write unit and integration tests

### Phase 1: Log Commands Validation
**Assigned**: task-completion-validator (Sonnet)
- Validate command handlers against PRD specs
- Review output format accuracy
- Verify backward compatibility with existing commands

### Phase 4: Interactive Mode Implementation
**Assigned**: ui-engineer-enhanced (Sonnet)
- Implement `--interactive` prompts and guided workflows
- Design prompt flow and validation

### Documentation (All Phases)
**Assigned**: documentation-writer (Haiku)
- Write CLI help text and examples
- Create workflow documentation
- Document AI agent integration patterns

### Final Review
**Assigned**: task-completion-validator (Sonnet)
- Review complete implementation
- Verify all acceptance criteria met
- Validate test coverage and performance

---

## Dependencies & Integration Points

### Existing Codepaths (No Changes Required)
- `src/core/models/` - Project, RequestLogDoc, ItemDraft
- `src/core/validation/` - ID generation, field validation
- `src/core/serializer/` - Markdown parsing/generation
- `src/adapters/fs-local/` - File read/write, backup
- `src/adapters/config-local/` - Project and field catalog storage
- `src/adapters/clock/` - Time generation

### New Code (CLI Only)
- Command parsing and routing
- Output formatting
- Error handling and exit codes
- Stdin input processing
- Interactive prompts (Phase 4 only)

### No Remote Dependencies
- No REST API or server-side adapters
- No database connections
- No remote Git integration
- All operations are local file-based

---

## Acceptance Criteria Summary

### Phase 1 (MVP)
- [x] All 6 log subcommands working
- [x] Output formatters (JSON, CSV, YAML, table) functional
- [x] Stdin support for create/append
- [x] Exit codes standardized
- [x] >=85% test coverage
- [x] No breaking changes to existing commands
- [x] Performance <500ms for typical operations
- [x] Documentation complete

### Phase 2
- [x] All 5 project subcommands working
- [x] Project CRUD operations functional
- [x] Integration tests passing
- [x] No regression from Phase 1

### Phase 3
- [x] All 4 field subcommands working
- [x] Global + project-level scoping
- [x] Batch import functional
- [x] No regression from Phases 1-2

### Phase 4
- [x] All 3 config subcommands working
- [x] Interactive mode (--interactive) functional
- [x] All 19 commands complete
- [x] Complete documentation
- [x] No regression from Phases 1-3

---

## Timeline & Resources

**Total Duration**: 6-8 weeks
**Total Effort**: 68 Story Points
**Team Size**: 2-3 engineers (1 primary backend, 1 validator, 1 docs)

### Week-by-Week Estimate
- **Weeks 1-2**: Phase 1 implementation (log commands, formatters, tests)
- **Weeks 2-3**: Phase 1 validation and docs
- **Weeks 3-4**: Phase 2 implementation (project commands)
- **Weeks 4-5**: Phase 3 implementation (field commands)
- **Weeks 5-6**: Phase 4 implementation (config + interactive)
- **Weeks 6-8**: Testing, validation, documentation, polish

---

## Post-MVP Enhancements (Future Versions)

- **v1.1**: Shell completion (bash/zsh), enhanced --interactive mode
- **v1.2**: Batch file operations (meatycapture batch create multiple-items.json)
- **v1.3**: Remote integration (git push after create, webhook notifications)
- **v1.4**: Performance optimizations (streaming parser for large docs)
- **v2.0**: REST API integration (when server-storage-v1 available)

---

## Quick Command Reference

See individual phase documents for detailed task breakdowns:
- [Phase 1: Log Commands](cli-v1/phase-1-log-commands.md)
- [Phase 2: Project Management](cli-v1/phase-2-project-mgmt.md)
- [Phase 3: Field Catalog](cli-v1/phase-3-field-catalog.md)
- [Phase 4: Config & Interactive](cli-v1/phase-4-config-interactive.md)
