# MeatyCapture Architecture Exploration - Complete Index

**Date:** December 27, 2025
**Purpose:** Comprehensive codebase understanding for CLI feature planning
**Status:** Exploration Complete

---

## Documents Created

This exploration generated 4 comprehensive documents to understand the MeatyCapture architecture:

### 1. ARCHITECTURE_EXPLORATION.md (Primary)
**Size:** ~1,500 lines | **Scope:** Complete architecture overview

**Contents:**
- Executive summary of headless core + adapter pattern
- Detailed breakdown of all core modules (1,000+ lines):
  - Models and type guards
  - Validation & ID generation patterns
  - Serialization (markdown ↔ domain objects)
  - Port/adapter interfaces
  - Catalog filtering/grouping
  - Logging infrastructure
- Adapter implementations:
  - File system (fs-local)
  - Configuration (config-local)
  - Clock abstraction
  - Optional: browser storage, API client
- UI layer structure (wizard, viewer, shared components)
- Existing CLI implementation analysis
- TypeScript configuration
- Build system and dependencies
- Data flow patterns for common operations
- Key architectural principles
- Environment variables reference
- Testing strategy
- Recommendations for CLI expansion

**Best For:** Getting a complete understanding of how everything fits together

### 2. ARCHITECTURE_CODE_EXAMPLES.md (Reference)
**Size:** ~600 lines | **Scope:** Concrete code patterns from the codebase

**Contents:**
- Working with domain models
- Building documents from scratch
- ID generation and parsing
- Validation examples
- Serialization patterns:
  - Document to markdown
  - Markdown back to document
  - Tag aggregation
  - Index updates
- Storage adapter usage:
  - File system operations
  - Project management
  - Field catalog operations
- Type guards and runtime validation
- CLI input validation patterns (existing)
- Filtering and catalog operations
- Logging patterns
- CLI command structure (existing create/append/list)
- Path resolution and tilde expansion
- Type safety in adapters
- Testing patterns with mock clock
- Snapshot testing

**Best For:** Quick reference when implementing new features; copy-paste patterns

### 3. CLI_DESIGN_PATTERNS.md (Extension Guide)
**Size:** ~800 lines | **Scope:** How to extend CLI while maintaining architecture

**Contents:**
- CLI architecture overview and design principle
- Dependency injection pattern for stores
- Command structure template (anatomy of a CLI command)
- Error handling and exit codes
- Reusing core domain logic:
  - Models and validation
  - ID generation and validation
  - Serialization patterns
  - Catalog filtering
- Store management patterns:
  - Creating ProjectStore
  - Creating DocStore
  - Creating FieldCatalogStore
- Input/output patterns:
  - Reading JSON input files
  - Console formatting
  - Help text with examples
- Path handling patterns:
  - Tilde expansion
  - Path resolution
  - Project path lookup
- Common CLI extensions (template)
- Adding logging to commands
- Testing CLI commands:
  - Unit test patterns
  - Integration test patterns
- Best practices checklist
- Complete example: adding a "query" command to search documents

**Best For:** Planning and implementing new CLI features; ensuring consistency

### 4. CODEBASE_MAP.md (Navigation)
**Size:** ~500 lines | **Scope:** File-by-file reference guide

**Contents:**
- Complete file inventory with purpose and line counts:
  - Core domain layer (6 modules, 2,000+ lines)
  - Adapter layer (4 implementations)
  - UI layer (30+ files across 4 sections)
  - CLI entry point
  - Platform detection
  - Optional server layer
- Build configuration (package.json, tsconfig.json, vite.config.ts)
- Type definitions and entry points
- Testing infrastructure
- Documentation files
- Configuration storage format (JSON schemas)
- Key relationships (dependency graph)
- File size reference table
- Import patterns for common scenarios
- Development quick reference
- Configuration environment variables
- Next steps for different use cases

**Best For:** Navigating the codebase; finding specific files; understanding dependencies

---

## Quick Navigation by Task

### Understanding the Architecture
1. Start with: **ARCHITECTURE_EXPLORATION.md** (sections 1-7)
2. Then read: **ARCHITECTURE_CODE_EXAMPLES.md** (to see patterns in action)
3. Reference: **CODEBASE_MAP.md** (to find specific files)

### Planning a New CLI Feature
1. Read: **CLI_DESIGN_PATTERNS.md** (sections 1-3)
2. Reference: **ARCHITECTURE_CODE_EXAMPLES.md** (copy patterns)
3. Use: **CLI_DESIGN_PATTERNS.md** (sections 7-10 for template)
4. Check: **CODEBASE_MAP.md** (find related files)

### Understanding How a Specific Feature Works
1. Find file in: **CODEBASE_MAP.md**
2. Read code from: /Users/miethe/dev/homelab/development/meatycapture/src/...
3. See patterns in: **ARCHITECTURE_CODE_EXAMPLES.md**
4. Understand context in: **ARCHITECTURE_EXPLORATION.md**

### Implementing a New Adapter
1. Study: **ARCHITECTURE_EXPLORATION.md** (section 2 - ports)
2. Reference: **CODEBASE_MAP.md** (existing adapter implementations)
3. Review: **ARCHITECTURE_CODE_EXAMPLES.md** (adapter usage)

### Adding Tests
1. Check: **ARCHITECTURE_EXPLORATION.md** (section 11)
2. Reference: **ARCHITECTURE_CODE_EXAMPLES.md** (section 11)
3. Find examples in: `/Users/miethe/dev/homelab/development/meatycapture/src/**/*.test.ts`

---

## Key Insights from Exploration

### 1. Headless Core Pattern
✓ All domain logic (models, validation, serialization) exists in `@core/` with **zero I/O and zero dependencies**
✓ This enables reuse across CLI, UI, API, and future platforms
✓ Core is 100% testable without mocking external services

### 2. Port/Adapter Architecture
✓ Storage is abstracted via port interfaces (`ProjectStore`, `DocStore`, `FieldCatalogStore`, `Clock`)
✓ Currently 2 implementations: local filesystem (fs-local) and configuration files (config-local)
✓ Easy to add new implementations (API, database, etc.) without touching core

### 3. Type Safety Throughout
✓ Runtime type guards on all domain models
✓ Strict TypeScript compiler settings
✓ Path aliases for clean imports: @core/*, @adapters/*, @ui/*, etc.

### 4. Existing CLI Foundation
✓ CLI already exists in `src/cli/index.ts` with 3 commands: create, append, list
✓ Demonstrates all patterns for command structure, validation, store usage
✓ Ready to be extended with new features

### 5. Zero Dependencies in Core
✓ Serializer includes custom YAML parser (no external dependencies)
✓ Logger uses console methods (no bunyan, winston, etc.)
✓ Validation and ID generation are pure functions
✓ This enables CLI usage without bundling React/UI libraries

### 6. Smart Path Handling
✓ Tilde expansion works in server and desktop modes
✓ Smart defaults: configured path → env variable → fallback
✓ Path sanitization prevents traversal attacks

### 7. Catalog Module for Search
✓ Filtering system already built for viewer (can be reused for CLI search)
✓ Supports multiple filters with AND logic
✓ Grouping by project
✓ Sorting by multiple fields

---

## Architecture Diagrams

### Layered Architecture
```
┌────────────────────────────────────────────────┐
│ CLI or UI or Future APIs                       │
│ (Presentation / User Interaction)              │
└─────────────┬──────────────────────────────────┘
              │ uses dependency injection
┌─────────────▼──────────────────────────────────┐
│ Core Domain (@core/*)                          │
│ - Models (type definitions)                    │
│ - Validation (ID generation, normalization)    │
│ - Serialization (markdown ↔ domain objects)    │
│ - Ports (storage interfaces)                   │
│ - Catalog (filtering, grouping)                │
│ - Logging (structured logging)                 │
│ (Pure functions, zero I/O, zero dependencies)  │
└─────────────┬──────────────────────────────────┘
              │ implements
┌─────────────▼──────────────────────────────────┐
│ Adapters (@adapters/*)                         │
│ - fs-local (filesystem DocStore)               │
│ - config-local (JSON ProjectStore, FieldStore) │
│ - clock (time abstraction)                     │
│ - (optional) api-client, browser-storage       │
│ (Concrete I/O implementations)                 │
└──────────────────────────────────────────────────┘
```

### Data Flow for Document Creation
```
User Input (CLI args or UI form)
    ↓ validate via type guards
Validated Input (ItemDraft, ProjectId)
    ↓ core functions
Document (RequestLogDoc with tags + index auto-updated)
    ↓ serialize
Markdown String (YAML frontmatter + items)
    ↓ adapter.write()
Filesystem (REQ-YYYYMMDD-project.md with .bak backup)
    ↓ user feedback
Success Message
```

### Port/Adapter Relationships
```
Presentation Layer
    ↓ uses
┌─────────────────────────────┐
│ ProjectStore (interface)    │ → LocalProjectStore (impl)
│ DocStore (interface)        │ → FsDocStore (impl)
│ FieldCatalogStore (interface)→ LocalFieldCatalogStore (impl)
│ Clock (interface)           │ → realClock (impl)
└─────────────────────────────┘
```

---

## Critical Implementation Files

**For CLI Planning, these files are essential:**

### Core Domain (understand FIRST)
- `/Users/miethe/dev/homelab/development/meatycapture/src/core/models/index.ts` — Domain entities
- `/Users/miethe/dev/homelab/development/meatycapture/src/core/validation/index.ts` — ID generation, validation
- `/Users/miethe/dev/homelab/development/meatycapture/src/core/serializer/index.ts` — Markdown I/O
- `/Users/miethe/dev/homelab/development/meatycapture/src/core/ports/index.ts` — Storage interfaces
- `/Users/miethe/dev/homelab/development/meatycapture/src/core/catalog/` — Filtering/grouping (4 files)

### Adapters (how core is used)
- `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/fs-local/index.ts` — File I/O
- `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/config-local/index.ts` — JSON config
- `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/clock/index.ts` — Time abstraction

### CLI (reference implementation)
- `/Users/miethe/dev/homelab/development/meatycapture/src/cli/index.ts` — Existing commands

### Configuration
- `/Users/miethe/dev/homelab/development/meatycapture/package.json` — Dependencies, scripts
- `/Users/miethe/dev/homelab/development/meatycapture/tsconfig.json` — TypeScript config, path aliases
- `/Users/miethe/dev/homelab/development/meatycapture/CLAUDE.md` — Project directives

---

## Statistics

| Metric | Value |
|--------|-------|
| **Total TypeScript Files** | 50+ |
| **Core Domain LOC** | 2,000+ |
| **Adapter Implementations** | 4 (fs-local, config-local, clock, + 2 optional) |
| **CLI Commands** | 3 (create, append, list) |
| **UI Pages** | 3 (Wizard, Viewer, Admin) |
| **Shared Components** | 12+ |
| **Type Definitions** | 20+ |
| **Default Field Options** | 3 (type, priority, status) |
| **Port Interfaces** | 4 (Clock, ProjectStore, FieldCatalogStore, DocStore) |
| **Configuration Files** | 2 JSON files (~/.meatycapture/) |
| **Build Tools** | Vite + Vitest + TypeScript + ESLint + Prettier |
| **Framework** | React 18 + Radix UI |
| **CLI Framework** | Commander.js |

---

## Next Steps for CLI Development

### Phase 1: Planning (Now)
✓ Read **ARCHITECTURE_EXPLORATION.md** (complete understanding)
✓ Review **CLI_DESIGN_PATTERNS.md** (identify extension points)
✓ Examine existing CLI commands (learn patterns)

### Phase 2: Design
- [ ] Define new CLI commands needed
- [ ] Identify which core functions to reuse
- [ ] Plan input/output format
- [ ] Sketch error handling strategy
- [ ] Document in ADR (Architecture Decision Record)

### Phase 3: Implementation
- [ ] Use **CLI_DESIGN_PATTERNS.md** section 7 as template
- [ ] Reference **ARCHITECTURE_CODE_EXAMPLES.md** for patterns
- [ ] Maintain consistency with existing 3 commands
- [ ] Add tests following patterns in **ARCHITECTURE_EXPLORATION.md** section 11

### Phase 4: Validation
- [ ] Ensure all store operations are async (Promise-based)
- [ ] Validate inputs with type guards
- [ ] Test with mock clock for deterministic behavior
- [ ] Check error messages for clarity
- [ ] Verify exit codes (0 = success, 1 = failure)

---

## Quick Reference: Finding Things

### "How do I..."

**...generate an ID for a new item?**
→ See `generateItemId()` in **ARCHITECTURE_CODE_EXAMPLES.md** section 2.1
→ Read source: `/Users/miethe/dev/homelab/development/meatycapture/src/core/validation/index.ts` (line 105)

**...read a document from disk?**
→ See `docStore.read()` in **ARCHITECTURE_CODE_EXAMPLES.md** section 4.1
→ Read source: `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/fs-local/index.ts`

**...validate user input?**
→ See `isValidCliInput()` in **ARCHITECTURE_CODE_EXAMPLES.md** section 5.2
→ Read source: `/Users/miethe/dev/homelab/development/meatycapture/src/cli/index.ts` (line 63)

**...serialize a document to markdown?**
→ See `serialize()` in **ARCHITECTURE_CODE_EXAMPLES.md** section 3.1
→ Read source: `/Users/miethe/dev/homelab/development/meatycapture/src/core/serializer/index.ts` (line 41)

**...list documents in a directory?**
→ See `docStore.list()` in **ARCHITECTURE_CODE_EXAMPLES.md** section 4.1
→ Read source: `/Users/miethe/dev/homelab/development/meatycapture/src/adapters/fs-local/index.ts`

**...create a new CLI command?**
→ Read **CLI_DESIGN_PATTERNS.md** section 2
→ See example in section 10 (query command)

**...add filters to documents?**
→ See filtering in **ARCHITECTURE_CODE_EXAMPLES.md** section 6
→ Read source: `/Users/miethe/dev/homelab/development/meatycapture/src/core/catalog/`

**...write tests?**
→ Read **ARCHITECTURE_EXPLORATION.md** section 11
→ See patterns in **ARCHITECTURE_CODE_EXAMPLES.md** section 11
→ Find examples: `/Users/miethe/dev/homelab/development/meatycapture/src/**/*.test.ts`

---

## Document Locations

All exploration documents are located in:
`/Users/miethe/dev/homelab/development/meatycapture/`

- `ARCHITECTURE_EXPLORATION.md` — Complete architecture guide (1,500 lines)
- `ARCHITECTURE_CODE_EXAMPLES.md` — Code patterns and examples (600 lines)
- `CLI_DESIGN_PATTERNS.md` — CLI extension guidelines (800 lines)
- `CODEBASE_MAP.md` — File-by-file reference (500 lines)
- `EXPLORATION_INDEX.md` — This document (this file)

**Total Documentation:** ~4,200 lines of comprehensive architecture analysis

---

## Final Summary

The MeatyCapture codebase demonstrates **exceptional architecture**:

✓ **Clear separation of concerns:** Core, adapters, UI are independent
✓ **Type safe:** Runtime validation + strict TypeScript
✓ **Testable:** No singletons, dependency injection, mock-friendly
✓ **Extensible:** Ports enable new adapters; core is self-contained
✓ **Documented:** Clear patterns to follow for new features
✓ **CLI-Ready:** Headless core already proven in existing CLI
✓ **Zero Waste:** No unused abstractions; all patterns are in use

For CLI feature planning, the codebase provides:
- Proven patterns in existing 3 commands
- Complete domain logic ready to reuse
- Type safety via type guards throughout
- Smart defaults for common operations
- Error handling best practices

The exploration documents provide:
- Complete architectural understanding
- Code examples for every major pattern
- Templates for new CLI commands
- Guidance for maintaining consistency
- File-by-file navigation reference

**You are well-positioned to confidently extend the CLI** while maintaining the codebase's excellent architecture and code quality.

---

**Exploration Date:** December 27, 2025
**Thoroughness Level:** Medium (focused on CLI planning)
**Time Investment:** 2-3 hours of reading these documents + codebase study recommended before implementation
