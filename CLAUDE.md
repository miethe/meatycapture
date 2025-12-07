# CLAUDE.md

MeatyCapture: Lightweight capture app for logging enhancements/bugs/ideas to request-log markdown files with project-aware defaults and tag aggregation.

## Prime Directives

| Directive | Implementation |
|-----------|---------------|
| **Delegate everything** | Opus orchestrates; subagents implement |
| Token efficient | codebase-explorer for pattern discovery |
| Headless core | UI-agnostic domain logic for web/desktop/mobile |
| File-first | Local markdown, no server for MVP |
| No over-architecture | YAGNI until proven |

**You are Opus. Tokens are expensive. You orchestrate; subagents execute.**

- Never write implementation code directly; delegate to specialized subagents
- Always use codebase-explorer for pattern discovery
- Focus on reasoning, analysis, planning, orchestration

---

## Agent Delegation

| Task | Agent | Model |
|------|-------|-------|
| Find files/patterns | codebase-explorer | Haiku |
| Deep analysis | explore | Haiku |
| Debug investigation | ultrathink-debugger | Sonnet |
| React/UI components | ui-engineer-enhanced | Sonnet |
| TypeScript backend | backend-typescript-architect | Sonnet |
| Validation/review | task-completion-validator | Sonnet |
| Most docs (90%) | documentation-writer | Haiku |
| Complex docs | documentation-complex | Sonnet |
| AI artifacts | ai-artifacts-engineer | Sonnet |

---

## Architecture Overview

```
meatycapture/
├── core/                 # Headless domain logic (UI-agnostic)
│   ├── models/           # Project, FieldOption, ItemDraft, RequestLogDoc
│   ├── validation/       # Field validation, ID generation
│   ├── serializer/       # Request-log markdown writer/parser
│   └── ports/            # Storage interfaces (DocStore, ProjectStore)
├── adapters/             # Port implementations
│   ├── fs-local/         # File system read/write
│   └── config-local/     # Projects + field catalogs (JSON/TOML)
├── ui/                   # React components
│   ├── wizard/           # Multi-step capture flow
│   ├── admin/            # Field management
│   └── shared/           # DropdownWithAdd, MultiSelectWithAdd, etc.
└── platform/             # Optional desktop shell (Tauri/Electron)
```

**Layered Pattern**: `UI → Core → Adapters → File System`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Build | Vite |
| UI | React |
| Styling | CSS (glass/x-morphism) |
| Config | JSON/TOML |
| Desktop | Tauri/Electron (optional) |

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start dev server |
| `pnpm test` | Run tests |
| `pnpm test:coverage` | Tests with coverage |
| `pnpm lint` | Lint code |
| `pnpm format` | Format code |
| `pnpm typecheck` | Type checking |

---

## Data Model

| Entity | Key Fields |
|--------|-----------|
| `Project` | id, name, default_path, repo_url?, enabled |
| `FieldOption` | id, field, value, scope (global/project), project_id? |
| `ItemDraft` | title, type, domain, context, priority, status, tags[], notes |
| `RequestLogDoc` | doc_id, title, items_index[], tags[], item_count |

**ID Patterns**:

- `doc_id`: `REQ-YYYYMMDD-<project-slug>`
- `item_id`: `REQ-YYYYMMDD-<project-slug>-XX` (zero-padded counter)

---

## Request-Log Format

```yaml
---
type: request-log
doc_id: REQ-20251203-capture-app
item_count: 2
tags: [ux, api]
items_index:
  - id: REQ-20251203-capture-app-01
    type: enhancement
---
### REQ-20251203-capture-app-01 - Title
**Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
**Tags:** ux
- Problem/goal: ...
```

---

## Key Patterns

### Port/Adapter

```typescript
interface DocStore {
  list(path: string): Promise<DocMeta[]>
  read(path: string): Promise<RequestLogDoc>
  write(path: string, doc: RequestLogDoc): Promise<void>
  append(path: string, item: ItemDraft): Promise<void>
}
```

### Tag Aggregation

- On write/append: merge tags from all items (unique sorted list)
- Auto-update `item_count` and `updated` date

### Field Catalog Resolution

- Effective options = global + project-level additions
- Global shown greyed in project admin; "Enable for project" creates copy

### Backup Strategy

- Before write/append: create `filename.bak`
- Warn on failure, allow explicit proceed

---

## UX Flow (Wizard)

1. **Project** - Select or Add New
2. **Doc** - Create new or select existing
3. **Item Details** - Type, domain, context, priority, status, tags, notes
4. **Review** - Submit; optionally add another item (Project/Doc fixed)

---

## Shared Components

| Component | Purpose |
|-----------|---------|
| `ProjectSelect` | Dropdown with Add New modal |
| `PathField` | Text input with validation |
| `DocSelector` | New vs existing radio + list |
| `DropdownWithAdd` | Single select with inline Add+ |
| `MultiSelectWithAdd` | Tags with suggestions + Add+ |
| `StepShell` | Wizard container with animations |

---

## Configuration

**Default path**: `~/.meatycapture/`

| File | Purpose |
|------|---------|
| `projects.json` | Project registry |
| `fields.json` | Global + project field catalogs |

**Env overrides**: `MEATYCAPTURE_CONFIG_DIR`, `MEATYCAPTURE_DEFAULT_PROJECT_PATH`

---

## Documentation Policy

**Reference**: `.claude/specs/doc-policy-spec.md`

| Allowed | Prohibited |
|---------|------------|
| `/docs/` with frontmatter | Debugging summaries |
| `.claude/progress/` (ONE per phase) | Multiple progress/phase |
| `.claude/worknotes/` | Ad-hoc session notes |

---

## Testing Strategy

| Type | Focus |
|------|-------|
| Unit | Models, serializer, ID generation, tag aggregation |
| Integration | Wizard flows, project add, batch items |
| File I/O | Temp dirs, corruption prevention, backups |
| Snapshot | Generated markdown output |
| Accessibility | Aria labels, keyboard navigation |

---

## Error Handling

| Scenario | Response |
|----------|----------|
| Path not writable | Block submission, inline error |
| Doc parse failure | Warning with backup option |
| Backup failure | Warn, allow explicit proceed |
| Concurrent edits | Last-write wins (MVP) |

---

## Git Workflow

**Commit types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

**Safety**: Commit often; never `--amend` others' commits; never `--force` main; never commit secrets

---

## Project Status

**Phase**: Pre-implementation (scaffolding)

**Key Documents**:
- [PRD](docs/project_plans/initialization/prd.md)
- [Implementation Plan](docs/project_plans/initialization/implementation-plan.md)
- [Design Spec](docs/project_plans/initialization/design-spec.md)

**MVP Scope**: Local Projects, wizard capture, new/append docs, tag aggregation, Admin field manager
