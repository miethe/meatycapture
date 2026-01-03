---
title: "Implementation Plan: CLI Item Management v1"
description: "Detailed implementation plan for adding missing CLI commands to achieve feature parity with Web UI: log update, log delete-item, and log archive with full item modification capabilities"
audience: [ai-agents, developers, engineering-lead]
tags: [implementation-plan, cli-enhancements, item-management, command-line]
created: 2026-01-03
updated: 2026-01-03
category: "implementation-planning"
status: ready-for-implementation
complexity: "Medium (M)"
track: "Standard Track"
estimated_effort: "24 story points"
timeline: "2-3 weeks"
related:
  - docs/project_plans/implementation_plans/enhancements/ui-enhancements-batch-v1.md
  - docs/project_plans/initialization/design-spec.md
---

# Implementation Plan: CLI Item Management v1

**Complexity:** Medium (M) | **Track:** Standard Track
**Estimated Effort:** 24 story points | **Timeline:** 2-3 weeks (parallel execution with 1-2 subagents)

**Plan ID:** `IMPL-20260103-CLI-ITEM-MANAGEMENT-V1`

---

## Executive Summary

Complete CLI feature parity with the Web UI by implementing three critical missing commands for individual item management. The Web UI already supports inline editing and deletion of items through ItemCard CRUD operations (Phase 3 of UI Enhancements). This plan brings those capabilities to the CLI, enabling developers and automation scripts to manage individual items within request-log documents without requiring full document rewrites.

**Key Deliverables:**
1. **`log update` command:** Modify individual item fields (status, priority, type, title, tags, notes, domain, context) with partial update support
2. **`log delete-item` command:** Remove individual items from documents with confirmation and backup safety
3. **`log archive` command:** Archive/unarchive entire documents (mark archived in frontmatter)
4. **Enhanced `log view` command:** Support `--item <item-id>` flag to view single item
5. **Interactive mode:** Optional prompting for `log update` when flags omitted

**Success Criteria:**
- All three commands work with existing DocStore port abstraction (file system, future adapters)
- Modified items have auto-updating `modified_at` timestamp
- Document metadata (item_count, tags, items_index) automatically updated
- Backup created before destructive operations (update, delete-item, archive)
- JSON output mode for all commands (scripting support)
- Confirmation prompts with --force option (skips confirmation)
- Exit codes: 0=success, 1=validation error, 2=I/O error, 130=user interrupt
- Zero breaking changes to existing commands
- Full parity with Web UI functionality

---

## Implementation Strategy

### Architecture Sequence

Following MeatyCapture's layered architecture and existing CLI patterns:

1. **Core Model Layer** - Ensure RequestLogItem has `modified_at` field (already implemented by UI Phase 1)
2. **Core Update Logic** - Create reusable itemUpdate helper function in core serializer
3. **CLI Update Command** - Implement `log update` with all field options
4. **CLI Delete-Item Command** - Implement `log delete-item` with confirmation and document cleanup
5. **CLI Archive Command** - Implement `log archive` / `log unarchive` with document metadata updates
6. **CLI View Enhancement** - Add `--item <item-id>` flag to view single item by ID
7. **Interactive Mode** - Optional prompting for update command (Phase 2 nice-to-have)
8. **Testing & Validation** - Unit, integration, CLI, accessibility, cross-platform

### Parallel Work Opportunities

- Phases 1-2 can proceed in parallel (model verification + core logic)
- Update and Delete-Item commands (Phase 3) can be developed in parallel
- Archive command (Phase 4) is independent and can overlap
- View enhancement (Phase 5) is independent and can overlap
- Interactive mode (Phase 6 nice-to-have) is optional polish

### Critical Path

1. Model layer verification (Phase 1) - Required by all downstream phases
2. Core update logic (Phase 2) - Required by Update command and Archive
3. Update command (Phase 3a) - Most complex, foundational for other changes
4. Delete-Item and Archive commands (Phase 3b, 4) - Can overlap with Update
5. View enhancement (Phase 5) - Independent, can overlap
6. Testing & validation (Phase 7) - Comprehensive validation of all features

---

## Phase Breakdown

### Phase 1: Model Layer Verification (2 story points)

**Duration:** 0.5 day
**Dependencies:** None
**Assigned Subagent(s):** backend-typescript-architect

Verify that RequestLogItem includes `modified_at` field (already implemented by UI Phase 1). If not yet implemented, add it now.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| M1.1 | Verify/Add Modified field to RequestLogItem | Ensure `modified_at: Date` field exists and auto-updates on item changes | - [ ] Field present in RequestLogItem interface<br>- [ ] Serializer reads/writes field correctly<br>- [ ] Default: equals `created_at` on creation<br>- [ ] Updates on any item modification<br>- [ ] Backward compatible (defaults to created_at if missing)<br>- [ ] No breaking changes to existing docs | 2 | backend-typescript-architect | None |

**Phase 1 Quality Gate:**
- [ ] Modified field present and accessible in models
- [ ] Serializer correctly reads/writes the field
- [ ] Type guards validate correctly
- [ ] Existing documents still load without errors
- [ ] Tests verify timestamp behavior

---

### Phase 2: Core Item Update Logic (3 story points)

**Duration:** 0.5-1 day
**Dependencies:** Phase 1 complete
**Assigned Subagent(s):** backend-typescript-architect

Create reusable core logic for updating individual items within documents. This logic will be used by both the CLI update command and the archive command (which updates all items' modified_at).

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| L2.1 | Create itemUpdateInDocument helper function | Core utility to update a single item, recalculate document metadata | - [ ] Function at `src/core/serializer/item-update.ts`<br>- [ ] Signature: `(doc: RequestLogDoc, itemId: string, patch: Partial<RequestLogItem>) => RequestLogDoc`<br>- [ ] Updates only specified fields (partial update)<br>- [ ] Auto-updates item's `modified_at` timestamp<br>- [ ] Recalculates doc `item_count` (unchanged, but validates)<br>- [ ] Recalculates doc `tags` (aggregates all items)<br>- [ ] Recalculates doc `items_index` (updates modified item entry)<br>- [ ] Validates patch before applying<br>- [ ] Throws descriptive error if item not found<br>- [ ] Throws error if patch violates field constraints<br>- [ ] Unit tests for all field types (string, array, enum)<br>- [ ] Snapshot tests for document updates | 2 | backend-typescript-architect | M1.1 |
| L2.2 | Create itemDeleteFromDocument helper function | Core utility to delete a single item and clean up metadata | - [ ] Function at `src/core/serializer/item-delete.ts`<br>- [ ] Signature: `(doc: RequestLogDoc, itemId: string) => RequestLogDoc`<br>- [ ] Removes item from items array<br>- [ ] Updates doc `item_count` (decrements)<br>- [ ] Recalculates doc `tags` (removes orphaned tags)<br>- [ ] Recalculates doc `items_index` (removes entry)<br>- [ ] Throws descriptive error if item not found<br>- [ ] Validates integrity after deletion<br>- [ ] Unit tests<br>- [ ] Snapshot tests | 1 | backend-typescript-architect | M1.1 |

**Phase 2 Quality Gate:**
- [ ] Helper functions export correctly
- [ ] All unit tests pass
- [ ] Snapshot tests validate output
- [ ] Error messages are clear and actionable
- [ ] No side effects on input document

---

### Phase 3: Update Command Implementation (6 story points)

**Duration:** 1.5 days
**Dependencies:** Phase 2 complete
**Assigned Subagent(s):** backend-typescript-architect

Implement the `log update` command for modifying individual item fields.

#### Phase 3.1: Core Update Command

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| U3.1 | Create log update command file | Implementation of `meatycapture log update <doc-path> <item-id> [options]` | - [ ] File at `src/cli/commands/log/update.ts`<br>- [ ] Function signature: `updateAction(docPath: string, itemId: string, options: UpdateOptions): Promise<void>`<br>- [ ] Options interface includes all updatable fields<br>- [ ] Validates item-id format (REQ-YYYYMMDD-...-XX)<br>- [ ] Validates file path<br>- [ ] Reads document, validates item exists<br>- [ ] Creates backup before update<br>- [ ] Applies partial update using itemUpdateInDocument helper<br>- [ ] Writes updated document back<br>- [ ] Reports success with updated item summary<br>- [ ] Exit codes: 0=success, 1=validation, 2=I/O, 130=interrupt<br>- [ ] Full JSDoc comments | 3 | backend-typescript-architect | L2.1 |
| U3.2 | Implement all update field options | Add support for updating all RequestLogItem fields | - [ ] Options: --status, --priority, --type, --title, --domain, --context<br>- [ ] Options: --add-tag, --remove-tag (multiple use allowed)<br>- [ ] Options: --notes<br>- [ ] Options: --json (output updated item as JSON)<br>- [ ] Options: -q, --quiet (suppress output)<br>- [ ] Options: -f, --force (skip backup creation)<br>- [ ] Options: --no-backup (skip backup entirely)<br>- [ ] Validation: required fields not emptied<br>- [ ] Validation: enum fields (status, priority, type) validated against allowed values<br>- [ ] Validation: at least one field must be specified<br>- [ ] Error messages suggest valid values for enum fields | 2 | backend-typescript-architect | U3.1 |
| U3.3 | Register update command with log group | Wire update into log command hierarchy | - [ ] Export registerUpdateCommand function<br>- [ ] Update log/index.ts to import and register<br>- [ ] Add help text with examples<br>- [ ] Help shows all available fields and constraints<br>- [ ] Example: `meatycapture log update ./docs/REQ-20251203-app.md REQ-20251203-app-01 --status done`<br>- [ ] Example: `meatycapture log update ./docs/REQ-20251203-app.md REQ-20251203-app-01 --priority high --add-tag urgent`<br>- [ ] Example: `meatycapture log update ./docs/REQ-20251203-app.md REQ-20251203-app-01 --notes "Updated notes" --json` | 1 | backend-typescript-architect | U3.2 |

**Phase 3 Quality Gate:**
- [ ] Command parses all options correctly
- [ ] Validation rejects invalid input with clear errors
- [ ] Backup created before write
- [ ] Document integrity maintained after update
- [ ] Output shows updated item fields
- [ ] JSON mode produces valid JSON
- [ ] Exit codes correct for all scenarios

---

### Phase 4: Delete-Item Command Implementation (6 story points)

**Duration:** 1.5 days
**Dependencies:** Phase 2 complete, Phase 3a complete (can overlap)
**Assigned Subagent(s):** backend-typescript-architect

Implement the `log delete-item` command for removing individual items from documents.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| D4.1 | Create log delete-item command file | Implementation of `meatycapture log delete-item <doc-path> <item-id>` | - [ ] File at `src/cli/commands/log/delete-item.ts`<br>- [ ] Function signature: `deleteItemAction(docPath: string, itemId: string, options: DeleteItemOptions): Promise<void>`<br>- [ ] Validates item-id format<br>- [ ] Validates file path<br>- [ ] Reads document, validates item exists<br>- [ ] Creates backup before delete<br>- [ ] Prompts for confirmation (shows item being deleted)<br>- [ ] Deletes using itemDeleteFromDocument helper<br>- [ ] Writes updated document<br>- [ ] Reports success with deleted item ID and new item count<br>- [ ] Exit codes: 0=success, 1=validation, 2=I/O, 130=interrupt<br>- [ ] Full JSDoc comments | 3 | backend-typescript-architect | L2.2 |
| D4.2 | Implement delete-item options and confirmation | Add confirmation flow and options | - [ ] Options: -f, --force (skip confirmation)<br>- [ ] Options: --no-backup (skip backup)<br>- [ ] Options: -q, --quiet (suppress output, still confirms unless --force)<br>- [ ] Options: --json (output deleted item as JSON)<br>- [ ] Confirmation prompt shows: item ID, title, type, status<br>- [ ] Requires user to type 'yes' to confirm<br>- [ ] Handles Ctrl+C gracefully (exit 130)<br>- [ ] Error if item not found<br>- [ ] Validates document integrity after deletion | 2 | backend-typescript-architect | D4.1 |
| D4.3 | Register delete-item command with log group | Wire delete-item into log command hierarchy | - [ ] Export registerDeleteItemCommand function<br>- [ ] Update log/index.ts to import and register<br>- [ ] Add help text with examples<br>- [ ] Example: `meatycapture log delete-item ./docs/REQ-20251203-app.md REQ-20251203-app-01`<br>- [ ] Example: `meatycapture log delete-item ./docs/REQ-20251203-app.md REQ-20251203-app-01 --force`<br>- [ ] Clarify that this deletes a single item, not the entire document | 1 | backend-typescript-architect | D4.2 |

**Phase 4 Quality Gate:**
- [ ] Command parses options correctly
- [ ] Confirmation prompt works and requires 'yes'
- [ ] Ctrl+C handled gracefully
- [ ] Backup created before deletion
- [ ] Document metadata updated correctly
- [ ] Document integrity maintained
- [ ] Exit codes correct
- [ ] JSON output valid

---

### Phase 5: Archive Command Implementation (4 story points)

**Duration:** 1 day
**Dependencies:** Phase 2 complete (for itemUpdateInDocument), can overlap with Phase 3-4
**Assigned Subagent(s):** backend-typescript-architect

Implement the `log archive` and `log unarchive` commands for marking documents as archived.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| A5.1 | Create log archive command file | Implementation of `meatycapture log archive <doc-path>` | - [ ] File at `src/cli/commands/log/archive.ts`<br>- [ ] Function signature: `archiveAction(docPath: string, options: ArchiveOptions): Promise<void>`<br>- [ ] Validates file path<br>- [ ] Reads document<br>- [ ] Checks current archived status<br>- [ ] Creates backup before update<br>- [ ] Sets `archived: true` in document<br>- [ ] Updates all items' `modified_at` to current time<br>- [ ] Writes updated document<br>- [ ] Reports success with document ID<br>- [ ] Exit codes: 0=success, 1=validation, 2=I/O, 130=interrupt<br>- [ ] Full JSDoc comments | 2 | backend-typescript-architect | L2.1 |
| A5.2 | Create log unarchive command | Implementation of `meatycapture log unarchive <doc-path>` | - [ ] File at `src/cli/commands/log/unarchive.ts`<br>- [ ] Mirrors archive command, sets `archived: false`<br>- [ ] Updates all items' `modified_at` to current time<br>- [ ] Reports success | 1 | backend-typescript-architect | A5.1 |
| A5.3 | Implement archive options and confirmation | Add confirmation flow and options | - [ ] Options: -f, --force (skip confirmation for archive)<br>- [ ] Options: --no-backup (skip backup)<br>- [ ] Options: -q, --quiet (suppress output)<br>- [ ] Confirmation prompt for archive (non-destructive, so lighter):<br>  "Archive document REQ-XXX? You can restore it later."<br>- [ ] No confirmation required for unarchive (restore is safe)<br>- [ ] Error if document already in desired state<br>- [ ] Validation: check archived status before and after | 1 | backend-typescript-architect | A5.2 |

**Phase 5 Quality Gate:**
- [ ] Archive command sets archived flag correctly
- [ ] Unarchive command unsets flag correctly
- [ ] Document metadata (modified_at on all items) updated
- [ ] Backup created before changes
- [ ] Confirmation prompt shown for archive
- [ ] Exit codes correct
- [ ] Error handling for edge cases

---

### Phase 6: View Enhancement & Optional Interactive Mode (2 story points)

**Duration:** 0.5-1 day
**Dependencies:** Phase 3 complete (uses update logic patterns)
**Assigned Subagent(s):** backend-typescript-architect

Add `--item <item-id>` flag to existing `log view` command. Optionally add interactive prompting for `log update`.

#### Phase 6.1: View Enhancement

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| V6.1 | Add --item flag to log view command | Filter and display single item by ID | - [ ] Update src/cli/commands/log/view.ts<br>- [ ] Add --item <item-id> option<br>- [ ] Filters items array to single item matching ID<br>- [ ] Shows item in selected format (JSON, YAML, human)<br>- [ ] Error if item not found<br>- [ ] Works with other filters (--filter-type, --filter-status, etc.)<br>- [ ] Help updated with examples<br>- [ ] Exit code 3 if item not found (consistent with view) | 1 | backend-typescript-architect | Phase 3 |

#### Phase 6.2: Interactive Mode (Optional, Nice-to-Have)

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| I6.2 | Add interactive prompting to log update (OPTIONAL) | Prompt for fields if no options specified | - [ ] If `log update <doc> <item-id>` with no field options, prompt interactively<br>- [ ] Prompts: "Update status? [current-value] (leave blank to skip)"<br>- [ ] Prompts for each field in order<br>- [ ] Shows current values and allowed options for enums<br>- [ ] Builds options object from responses<br>- [ ] Calls updateAction with constructed options<br>- [ ] Allows Ctrl+C to cancel<br>- [ ] Requires explicit confirmation at end<br>- [ ] Optional - only if time permits | 1 | backend-typescript-architect | U3.2 |

**Phase 6 Quality Gate:**
- [ ] `--item` flag filters correctly
- [ ] Error handling for missing items
- [ ] Interactive mode prompts work (if implemented)
- [ ] No regression in existing view command

---

### Phase 7: Testing & Quality Assurance (3 story points)

**Duration:** 1 day
**Dependencies:** All commands complete (Phases 3-6)
**Assigned Subagent(s):** backend-typescript-architect, task-completion-validator

Comprehensive testing across all new commands.

#### Phase 7.1: Unit & Integration Testing

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| T7.1 | Unit tests for core helpers | Test itemUpdateInDocument and itemDeleteFromDocument | - [ ] Tests at `src/core/serializer/__tests__/item-update.test.ts`<br>- [ ] Tests at `src/core/serializer/__tests__/item-delete.test.ts`<br>- [ ] Test: update single field<br>- [ ] Test: update multiple fields<br>- [ ] Test: partial update (only changed fields)<br>- [ ] Test: modified_at timestamp updates<br>- [ ] Test: document metadata recalculation<br>- [ ] Test: validation errors<br>- [ ] Test: item not found errors<br>- [ ] Test: deletion cascading updates<br>- [ ] Test: tag aggregation after delete<br>- [ ] Snapshot tests for output documents<br>- [ ] >85% coverage | 1 | backend-typescript-architect | Phase 2 |
| T7.2 | CLI command integration tests | Test all three commands end-to-end | - [ ] Tests at `src/cli/commands/log/__tests__/update.test.ts`<br>- [ ] Tests at `src/cli/commands/log/__tests__/delete-item.test.ts`<br>- [ ] Tests at `src/cli/commands/log/__tests__/archive.test.ts`<br>- [ ] Test: command parsing<br>- [ ] Test: option validation<br>- [ ] Test: file I/O with temp directories<br>- [ ] Test: backup creation<br>- [ ] Test: confirmation prompts<br>- [ ] Test: JSON output<br>- [ ] Test: exit codes<br>- [ ] Test: error scenarios<br>- [ ] Snapshot tests for output<br>- [ ] >80% coverage | 1 | backend-typescript-architect | Phases 3-5 |
| T7.3 | Accessibility & usability testing | Verify error messages and confirmations | - [ ] Error messages are clear and actionable<br>- [ ] Confirmation prompts guide users (show example "yes")<br>- [ ] Help text is complete and clear<br>- [ ] All options documented in help<br>- [ ] Exit codes documented<br>- [ ] Examples cover common workflows | 0.5 | task-completion-validator | Phases 3-5 |

#### Phase 7.2: Cross-Platform & CLI Validation

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| T7.4 | End-to-end CLI workflows | Test realistic user scenarios | - [ ] Workflow: Update item status only<br>- [ ] Workflow: Update multiple fields (title + status + priority)<br>- [ ] Workflow: Add and remove tags<br>- [ ] Workflow: Delete item with confirmation<br>- [ ] Workflow: Delete item with --force<br>- [ ] Workflow: Archive document, then unarchive<br>- [ ] Workflow: View single item by ID<br>- [ ] Workflow: JSON output pipeline (update | jq)<br>- [ ] Cross-platform: macOS, Linux<br>- [ ] Verify backup files created and readable | 0.5 | backend-typescript-architect | Phases 3-5 |

**Phase 7 Quality Gate:**
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] >80% code coverage for all new code
- [ ] No TypeScript errors
- [ ] All help text complete
- [ ] Error messages clear
- [ ] Exit codes correct
- [ ] Cross-platform testing complete
- [ ] No regressions in existing commands

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Concurrent document edits conflict | Medium | Low | Document last-write-wins policy, recommend --force with backups |
| Backup creation fails | Medium | Low | Test backup creation extensively, graceful error handling, option to skip |
| Document metadata sync issues | High | Low | Extensive unit tests for metadata recalculation helpers |
| Modified_at field not yet in models | Medium | Medium | Phase 1 verifies field exists; if not, adds it immediately |
| Complex field validation failures | Medium | Low | Reuse existing validation from core models, thorough testing |
| Archive toggle state confusion | Low | Low | Clear help text, show current state in error messages |

### Schedule Risks

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Scope creep (interactive mode) | Low | Medium | Interactive mode marked as optional Phase 6.2 |
| Complex CLI option parsing | Medium | Low | Follow existing patterns from `delete` and `view` commands |
| Testing takes longer than estimated | Medium | Medium | Parallel testing while Phase 3-5 complete |
| Unexpected model layer changes | High | Low | Phase 1 verification gates all downstream work |

---

## Resource Requirements

### Team Composition
- **Backend/TypeScript Architect (Sonnet):** 2 FTE (Phases 1-7, focus on core logic and CLI)
- **Validation Specialist (Sonnet):** 0.25 FTE (Phase 7 - help text review, testing validation)

### Skill Requirements
- TypeScript, Node.js CLI development
- Commander.js framework patterns
- File I/O, error handling
- Testing: Vitest, mocking
- Git, CI/CD

---

## Success Metrics

### Delivery Metrics
- On-time delivery (±10% of estimate)
- Code coverage >80% for all new code
- Zero P0/P1 bugs in first week of deployment
- All acceptance criteria met
- Zero breaking changes to existing commands

### User Experience Metrics
- Update command completes in <500ms
- Delete confirmation clear and safe (requires 'yes')
- JSON output valid and usable in scripts
- Error messages guide users to resolution
- Help text complete and discoverable

### Technical Metrics
- 100% of new commands have integration tests
- All new code passes TypeScript strict mode
- No linter errors
- Exit codes correct for all scenarios
- Cross-platform (macOS, Linux) verified

---

## Communication Plan

- **Daily standups** for progress tracking and blocker resolution
- **Phase reviews** after each phase completion (approval gate)
- **Weekly sync** with stakeholders on progress
- **Help text review** before Phase 7 completion
- **Final validation** before production deployment

---

## Post-Implementation

- Monitor error reports for common update/delete mistakes
- Collect user feedback on command usability
- Track usage of JSON output for scripts/automation
- Consider future enhancements (bulk operations, interactive mode promotion)
- Document CLI patterns for future command additions
- Update main README with new commands
- Add command examples to documentation

---

## Detailed Task Breakdown by Phase

### Phase 1 Tasks (Sequential)
1. M1.1: Verify/Add Modified field (backend-typescript-architect) - 2 pts

### Phase 2 Tasks (Sequential)
1. L2.1: Create itemUpdateInDocument helper (backend-typescript-architect) - 2 pts
2. L2.2: Create itemDeleteFromDocument helper (backend-typescript-architect) - 1 pt

### Phase 3 Tasks (Sequential with Phase 4 overlap)
1. U3.1: Create log update command file (backend-typescript-architect) - 3 pts
2. U3.2: Implement all update field options (backend-typescript-architect) - 2 pts
3. U3.3: Register update command with log group (backend-typescript-architect) - 1 pt

### Phase 4 Tasks (Sequential, can overlap with Phase 3)
1. D4.1: Create log delete-item command file (backend-typescript-architect) - 3 pts
2. D4.2: Implement delete-item options and confirmation (backend-typescript-architect) - 2 pts
3. D4.3: Register delete-item command with log group (backend-typescript-architect) - 1 pt

### Phase 5 Tasks (Sequential, can overlap with Phase 3-4)
1. A5.1: Create log archive command file (backend-typescript-architect) - 2 pts
2. A5.2: Create log unarchive command (backend-typescript-architect) - 1 pt
3. A5.3: Implement archive options and confirmation (backend-typescript-architect) - 1 pt

### Phase 6 Tasks (Sequential)
1. V6.1: Add --item flag to log view command (backend-typescript-architect) - 1 pt
2. I6.2: Add interactive prompting to log update [OPTIONAL] (backend-typescript-architect) - 1 pt

### Phase 7 Tasks (Parallel testing groups)
1. T7.1: Unit tests for core helpers (backend-typescript-architect) - 1 pt
2. T7.2: CLI command integration tests (backend-typescript-architect) - 1 pt
3. T7.3: Accessibility & usability testing (task-completion-validator) - 0.5 pts
4. T7.4: End-to-end CLI workflows (backend-typescript-architect) - 0.5 pts

---

## Integration Points with Existing Systems

### DocStore Integration
- All commands use existing `DocStore.read()` and `DocStore.write()` interfaces
- Backup creation via `DocStore.backup()` before destructive operations
- No changes needed to DocStore interface

### Serializer Integration
- Commands use existing `serialize()` function for document output
- New `itemUpdateInDocument()` and `itemDeleteFromDocument()` helpers in serializer
- Integration with existing field validation from core models

### CLI Command Pattern Integration
- Follow existing patterns from `delete`, `view`, `append` commands
- Use Commander.js option parsing
- Leverage existing error handling and exit codes
- Reuse existing formatters (JSON, YAML, human)
- Use existing confirmation logic patterns

### Field Catalog Integration
- Optional future enhancement: validate enum fields (status, priority, type) against catalog
- For now: use hardcoded allowed values in command validation
- Tags can be any string (no validation beyond non-empty)

---

## Linear Compatibility

All tasks are structured for Linear import with:
- Unique Task IDs (M1.1, L2.1, U3.1, D4.1, A5.1, V6.1, T7.1, etc.)
- Clear acceptance criteria (checkboxes for Linear Task Checklist)
- Effort estimates in story points (Fibonacci: 1, 2, 3, 5, 8, 13, 21)
- Phase grouping for milestone tracking
- Dependency mapping for sequencing
- Assigned subagent as team member

**Estimated Total Effort:** 24 story points
**Recommended Team:** 1-2 engineers (backend-typescript-architect, mostly)
**Target Timeline:** 2-3 weeks (accounting for testing and validation)

---

## Implementation Plan Version

**Version:** 1.0
**Created:** 2026-01-03
**Last Updated:** 2026-01-03
**Status:** Ready for Implementation

**Next Steps:**
1. Review plan with stakeholders
2. Verify Phase 1 (Modified field) with UI Phase 1 completion
3. Assign backend-typescript-architect to Phases 1-7
4. Create progress tracking document at `.claude/progress/cli-item-management-v1/all-phases-progress.md`
5. Begin Phase 1 (model verification)
6. Create Linear project with all tasks
7. Coordinate with UI Enhancements team on Modified field completion

---

**Progress Tracking:**

See `.claude/progress/cli-item-management-v1/all-phases-progress.md` (to be created during implementation)
