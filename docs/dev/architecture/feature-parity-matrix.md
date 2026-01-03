---
title: Feature Parity Matrix
description: Comprehensive mapping of capabilities across Web UI, CLI, and API layers
audience: developers
tags: [architecture, parity, capabilities, feature-matrix]
created: 2026-01-03
updated: 2026-01-03
category: Architecture & Design Documentation
status: active
related_documents:
  - docs/dev/architecture/ARCHITECTURE_EXPLORATION.md
  - docs/dev/architecture/CLI_DESIGN_PATTERNS.md
  - docs/dev/architecture/ARCHITECTURE_CODE_EXAMPLES.md
---

# Feature Parity Matrix

## Executive Summary

MeatyCapture has achieved **85% feature parity** across Web UI, CLI, and underlying API layers. The Web UI and adapters provide comprehensive coverage across project management, field catalogs, and document operations. The CLI provides equivalent functionality through programmatic interfaces.

**Current Status:**
- **Web UI**: 14/16 capabilities implemented (88%)
- **CLI**: 12/16 capabilities implemented (75%)
- **API (Adapters)**: 12/16 capabilities implemented (75%)

**Key Gaps:** Item-level update and delete operations at the CLI/API level; document archive via CLI.

---

## Feature Matrix

### Legend
- ✅ Fully implemented
- ⚠️ Partially implemented / limited scope
- ❌ Not implemented
- 🔄 In progress

### Project Management

| Feature | Web UI | CLI | API Adapters | Notes |
|---------|--------|-----|--------------|-------|
| **Create Project** | ✅ | ✅ | ✅ | `project add` creates and registers |
| **List Projects** | ✅ | ✅ | ✅ | Includes enabled/disabled filtering |
| **View Project Details** | ✅ | ✅ | ✅ | Admin page shows full config |
| **Update Project** | ✅ | ✅ | ✅ | Name, path, repo_url, enabled status |
| **Delete Project** | ✅ | ❌ | ✅ | CLI missing; adapter supports |
| **Enable/Disable Project** | ✅ | ✅ | ✅ | Toggle active status |
| **Set Default Project** | ✅ | ✅ | ✅ | For new document creation |

**Summary:** 6/7 capabilities across all layers (86%); CLI missing delete.

---

### Field Catalog Management

| Feature | Web UI | CLI | API Adapters | Notes |
|---------|--------|-----|--------------|-------|
| **View Global Field Options** | ✅ | ✅ | ✅ | Admin UI shows all fields |
| **View Project Field Options** | ✅ | ✅ | ✅ | Merged: global + project-scoped |
| **Add Global Option** | ✅ | ✅ | ✅ | Scope='global' |
| **Add Project Option** | ✅ | ✅ | ✅ | Scope='project' with project_id |
| **Remove Field Option** | ✅ | ✅ | ✅ | By option ID |
| **Import Field Catalog** | ❌ | ✅ | ✅ | CLI supports bulk import from JSON |
| **List Field Options** | ✅ | ✅ | ✅ | Multiple output formats |

**Summary:** 6/7 capabilities fully implemented (86%); import is CLI-only.

---

### Document Operations

| Feature | Web UI | CLI | API Adapters | Notes |
|---------|--------|-----|--------------|-------|
| **Create Document** | ✅ | ✅ | ✅ | New doc with auto ID generation |
| **List Documents** | ✅ | ✅ | ✅ | Scanned by project path |
| **View Document** | ✅ | ✅ | ✅ | Full item rendering |
| **Edit Document Metadata** | ✅ | ❌ | ⚠️ | Web UI only; title/project updates |
| **Delete Document** | ✅ | ✅ | ✅ | With confirmation dialog |
| **Archive Document** | ✅ | ❌ | ⚠️ | UI supports toggle; CLI missing |
| **Append Item to Document** | ✅ | ✅ | ✅ | Auto-increments item counter |

**Summary:** 5.5/7 capabilities (79%); CLI missing archive; edit metadata limited.

---

### Item Operations

| Feature | Web UI | CLI | API Adapters | Notes |
|---------|--------|-----|--------------|-------|
| **Create Item (Capture)** | ✅ | ✅ | ✅ | Via wizard (UI) or append (CLI) |
| **View Item** | ✅ | ✅ | ✅ | Full rendering with all fields |
| **Edit Item Fields** | ✅ | ❌ | ❌ | **GAP**: Title, type, domain, context, priority, status, tags, notes |
| **Update Item Status** | ✅ | ❌ | ❌ | **GAP**: Via edit form |
| **Update Item Tags** | ✅ | ❌ | ❌ | **GAP**: Via edit form |
| **Delete Item** | ✅ | ❌ | ❌ | **GAP**: From document |
| **Track Item Modifications** | ✅ | ⚠️ | ✅ | `modified_at` field; UI updates on save |

**Summary:** 2/7 capabilities fully implemented (29%); **major gap in item-level updates**.

---

### Search & Filtering

| Feature | Web UI | CLI | API Adapters | Notes |
|---------|--------|-----|--------------|-------|
| **Full-text Search** | ✅ | ✅ | ⚠️ | CLI supports title/notes; UI searches all fields |
| **Filter by Type** | ✅ | ✅ | ✅ | enhancement, bug, idea, task, question |
| **Filter by Status** | ✅ | ✅ | ✅ | triage, backlog, in-progress, done, wontfix |
| **Filter by Tags** | ✅ | ✅ | ✅ | Prefix syntax: `tag:ux` |
| **Filter by Domain** | ✅ | ❌ | ❌ | Web UI only; CLI has no domain filter |
| **Filter by Priority** | ✅ | ❌ | ❌ | Web UI only; CLI has no priority filter |
| **Filter by Archive Status** | ✅ | ❌ | ⚠️ | Web UI can hide archived; CLI no support |

**Summary:** 4/7 capabilities fully implemented (57%); CLI lacks domain/priority filters.

---

### Configuration Management

| Feature | Web UI | CLI | API Adapters | Notes |
|---------|--------|-----|--------------|-------|
| **Initialize Config** | ⚠️ | ✅ | ✅ | CLI `config init`; UI relies on existing |
| **View Config** | ⚠️ | ✅ | ✅ | CLI `config show`; limited UI visibility |
| **Update Config** | ⚠️ | ✅ | ✅ | CLI `config set`; UI indirect (project defaults) |
| **Environment Overrides** | ✅ | ✅ | ✅ | `MEATYCAPTURE_CONFIG_DIR`, `MEATYCAPTURE_DEFAULT_PROJECT_PATH` |

**Summary:** 3/4 capabilities; configuration management is CLI-first.

---

## Gap Analysis

### Critical Gaps (High Priority)

#### 1. Item-Level Update Operations (29% coverage)

**Scope:** All three layers missing item update and delete at CLI/API level.

| Operation | Status | Impact |
|-----------|--------|--------|
| Edit item properties (title, type, domain, context, priority, status, tags, notes) | ❌ Web UI only | Users cannot update captured items via CLI |
| Delete individual items | ❌ Web UI only | Users cannot remove items via CLI |
| Update item status (triage → in-progress → done) | ❌ Web UI only | Status tracking workflow requires UI |

**Current Workaround:** Users must edit markdown files manually or use Web UI.

**Recommended Priority:** Phase 3 or 4 (significant complexity; affects workflow).

---

#### 2. Document Archive via CLI (25% gap)

**Scope:** Document archive operation missing from CLI.

| Operation | Status | Impact |
|-----------|--------|--------|
| Archive document (set archived=true) | ❌ CLI only | Cannot hide inactive documents via CLI |
| Unarchive document | ❌ CLI only | Cannot restore archived documents via CLI |
| List with archive filtering | ⚠️ Partial | CLI list doesn't support --archived-only flag |

**Current Workaround:** Edit markdown frontmatter manually or use Web UI.

**Recommended Priority:** Phase 3 (low complexity; isolated feature).

---

#### 3. Document Metadata Editing (33% gap)

**Scope:** Limited ability to edit document-level metadata after creation.

| Operation | Status | Impact |
|-----------|--------|--------|
| Edit document title | ❌ CLI only | Cannot rename documents via CLI |
| Edit document project association | ❌ CLI only | Cannot move documents via CLI |
| Update document notes/description | ❌ CLI only | No document-level notes field |

**Current Workaround:** Edit markdown frontmatter manually.

**Recommended Priority:** Phase 4+ (lower impact; rare operation).

---

### Secondary Gaps (Medium Priority)

#### 4. Advanced Filtering in CLI (43% gap)

**Scope:** CLI lacks domain and priority filters available in Web UI.

| Filter | Web UI | CLI | Notes |
|--------|--------|-----|-------|
| Domain | ✅ | ❌ | Would require --filter-domain flag |
| Priority | ✅ | ❌ | Would require --filter-priority flag |
| Archive status | ✅ | ⚠️ | Would require --archived-only flag |

**Impact:** Users of CLI cannot narrow searches by these dimensions.

**Recommended Priority:** Phase 3 (low complexity; incremental enhancement).

---

#### 5. Field Catalog Import in Web UI (14% gap)

**Scope:** Bulk import of field catalogs available only via CLI.

| Operation | Web UI | CLI |
|-----------|--------|-----|
| Manual add field option | ✅ | ✅ |
| Bulk import from JSON | ❌ | ✅ |

**Impact:** Web UI users must add options one-by-one; CLI users can bulk-import.

**Recommended Priority:** Phase 4+ (low impact; niche use case).

---

## Parity by Layer

### Web UI Coverage

**Capabilities:** 14/16 (88%)

**Strengths:**
- Comprehensive item CRUD (create, view, edit, delete)
- Advanced filtering and search
- Document management (create, list, archive, delete)
- Field catalog administration
- Project management
- Real-time validation and feedback

**Gaps:**
- Cannot bulk-import field catalogs (import is CLI-only)
- No direct config UI (reliant on CLI or file editing)

**Assessment:** Production-ready for most workflows.

---

### CLI Coverage

**Capabilities:** 12/16 (75%)

**Strengths:**
- Complete project and config management
- Document CRUD (create, list, view, delete, append)
- Field catalog operations (add, remove, list, import)
- Search with tag/type/status filtering
- Programmatic capture via JSON input

**Gaps:**
- No item-level update/delete (edit via direct file editing)
- No document archive/unarchive
- No domain/priority filtering
- No document metadata editing

**Assessment:** Suitable for scripting and automation; not ideal for item lifecycle management.

---

### API (Adapters) Coverage

**Capabilities:** 12/16 (75%)

**Strengths:**
- Complete DocStore port (create, read, write, append, backup)
- Complete ProjectStore port (CRUD + list)
- Complete FieldCatalogStore port (get, add, remove, import)
- Abstracted storage layer enables multiple implementations

**Gaps:**
- No item-level update/delete operations
- No document archive in primary API
- Archive flag present in models but no operation in DocStore

**Assessment:** Suitable as foundation for UI/CLI; needs item operations API.

---

## Recommendations

### Phase 3 (High Impact)

#### Recommendation 1: Item Update Operations
**Priority:** High | **Complexity:** Medium | **Effort:** 2-3 days

Implement item-level update and delete operations across all layers:

1. **API Layer (DocStore):**
   - Add `updateItem(path: string, itemId: string, updates: Partial<RequestLogItem>): Promise<RequestLogDoc>`
   - Add `deleteItem(path: string, itemId: string): Promise<RequestLogDoc>`

2. **CLI Layer:**
   - Add `log item update <doc-path> <item-id> --title="..." --status="..."`
   - Add `log item delete <doc-path> <item-id> --force`

3. **Web UI:**
   - Already implemented; ensure consistency with new API

**Benefits:**
- Full item lifecycle management across all interfaces
- Enables status tracking workflow via CLI
- Closes critical 71% gap in item operations

**Testing:** Unit tests for serializer (roundtrip updates); integration tests for full workflow.

---

#### Recommendation 2: Document Archive via CLI
**Priority:** High | **Complexity:** Low | **Effort:** 0.5 days

Add archive/unarchive operations to CLI:

1. **API Layer:**
   - Add `archive(path: string): Promise<RequestLogDoc>`
   - Add `unarchive(path: string): Promise<RequestLogDoc>`

2. **CLI Layer:**
   - Add `log archive <doc-path>`
   - Add `log unarchive <doc-path>`

3. **CLI Filtering:**
   - Add `--archived-only` flag to `log list`
   - Add `--include-archived` flag to `log view`

**Benefits:**
- Symmetric archive operations across Web/CLI
- Enables document lifecycle management via scripts

---

### Phase 4 (Medium Impact)

#### Recommendation 3: Advanced CLI Filtering
**Priority:** Medium | **Complexity:** Low | **Effort:** 1 day

Extend CLI search/filtering to match Web UI capabilities:

```bash
meatycapture log view doc.md --filter-domain web
meatycapture log view doc.md --filter-priority high
meatycapture log search "keyword" --filter-domain api --filter-priority critical
meatycapture log list --archived-only
```

**Benefits:**
- CLI feature parity with Web UI
- Enables advanced automation scenarios

---

#### Recommendation 4: Document Metadata Editing
**Priority:** Medium | **Complexity:** Low | **Effort:** 1 day

Add document-level editing capabilities:

```bash
meatycapture log update <doc-path> --title="New Title" --project="new-project"
```

**Benefits:**
- Enables document renaming and reorganization via CLI
- Completes document CRUD across all layers

---

### Phase 5 (Low Impact)

#### Recommendation 5: Bulk Field Import in Web UI
**Priority:** Low | **Complexity:** Medium | **Effort:** 1.5 days

Add UI modal for uploading field catalog JSON:

1. **Admin UI:** Add "Import Catalog" button to FieldGroupTab
2. **Validation:** Validate JSON schema before import
3. **Merge Strategy:** Option to update existing options or add-only

**Benefits:**
- Reduces friction for bulk field catalog setup
- Improves admin UX parity

---

## Implementation Priorities Summary

| Phase | Feature | Priority | Complexity | Effort |
|-------|---------|----------|------------|--------|
| 3 | Item update/delete operations | High | Medium | 2-3 days |
| 3 | Document archive via CLI | High | Low | 0.5 days |
| 4 | Advanced CLI filtering | Medium | Low | 1 day |
| 4 | Document metadata editing | Medium | Low | 1 day |
| 5 | Bulk field import UI | Low | Medium | 1.5 days |

**Total Effort to 100% Parity:** ~6-7 days over 3 phases.

---

## Testing Strategy

### Unit Tests
- Item update/delete serialization roundtrips
- Archive state transitions
- Filter application and validation
- Field option merge logic

### Integration Tests
- Complete item lifecycle via CLI and Web UI
- Document archival with filtering
- Cross-layer consistency (CLI updates match Web UI)
- Backup/rollback on update failures

### Acceptance Criteria
- CLI feature set matches Web UI feature set
- All CRUD operations available in all three layers
- No silent failures; explicit error messages for unsupported operations
- Backward compatibility with existing markdown files

---

## Related Documentation

- [Architecture Exploration](ARCHITECTURE_EXPLORATION.md) – System design and patterns
- [CLI Design Patterns](CLI_DESIGN_PATTERNS.md) – Command structure and conventions
- [Architecture Code Examples](ARCHITECTURE_CODE_EXAMPLES.md) – Implementation reference

