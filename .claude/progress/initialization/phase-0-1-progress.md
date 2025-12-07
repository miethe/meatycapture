---
prd_name: initialization
phase: "0-1"
title: "Scaffolding + Core Models & Storage Ports"
status: completed
completion: 100%
started_at: 2025-12-06
completed_at: 2025-12-06
tasks:
  - id: TASK-0.1
    title: "Project scaffolding with TypeScript + Vite/React"
    description: "Create project structure, package.json, tsconfig, vite.config"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimated_time: "1h"
    status: completed
  - id: TASK-0.2
    title: "Add lint/format/test configs"
    description: "ESLint, Prettier, Vitest configuration"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-0.1"]
    estimated_time: "30m"
    status: completed
  - id: TASK-1.1
    title: "Define domain models"
    description: "Project, FieldOption (global/project scope), ItemDraft, RequestLogDoc types"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-0.1"]
    estimated_time: "1h"
    status: completed
  - id: TASK-1.2
    title: "Define storage port interfaces"
    description: "ProjectStore, FieldCatalogStore, DocStore, Clock interfaces"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.1"]
    estimated_time: "1h"
    status: completed
  - id: TASK-1.3
    title: "Implement local FS adapters"
    description: "fs-local adapter for DocStore, config-local for ProjectStore and FieldCatalogStore"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.2"]
    estimated_time: "2h"
    status: completed
  - id: TASK-1.4
    title: "Implement request-log serializer"
    description: "Serialize/deserialize request-log markdown format with frontmatter, items_index, tag aggregation"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.1"]
    estimated_time: "2h"
    status: completed
  - id: TASK-1.5
    title: "ID generation utilities"
    description: "Generate doc_id (REQ-YYYYMMDD-<slug>) and item_id (REQ-YYYYMMDD-<slug>-XX) patterns"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.1"]
    estimated_time: "30m"
    status: completed
  - id: TASK-1.6
    title: "Unit tests for core"
    description: "Tests for serialization, ID generation, tag aggregation, models"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-1.4", "TASK-1.5"]
    estimated_time: "1.5h"
    status: completed

parallelization:
  batch_1: ["TASK-0.1"]
  batch_2: ["TASK-0.2", "TASK-1.1"]
  batch_3: ["TASK-1.2", "TASK-1.4", "TASK-1.5"]
  batch_4: ["TASK-1.3"]
  batch_5: ["TASK-1.6"]
  critical_path: ["TASK-0.1", "TASK-1.1", "TASK-1.2", "TASK-1.3", "TASK-1.6"]
  estimated_total_time: "9h"

blockers: []
---

## Work Log

### 2025-12-06
- Phase execution started
- Progress tracking infrastructure created

## Orchestration Quick Reference

### Batch 1 (No dependencies)
```
Task("backend-typescript-architect", "TASK-0.1: Create MeatyCapture project scaffolding with TypeScript + Vite/React. Structure: core/ (headless domain logic), adapters/ (fs-local, config-local), ui/ (React components), platform/ (optional desktop shell). Include package.json with pnpm, tsconfig.json, vite.config.ts")
```

### Batch 2 (Depends on TASK-0.1)
```
Task("backend-typescript-architect", "TASK-0.2: Add lint/format/test configs - ESLint with TypeScript support, Prettier, Vitest for testing")
Task("backend-typescript-architect", "TASK-1.1: Define domain models in core/models/: Project (id, name, default_path, repo_url?, enabled), FieldOption (id, field, value, scope: global|project, project_id?), ItemDraft (title, type, domain, context, priority, status, tags[], notes), RequestLogDoc (doc_id, title, items_index[], tags[], item_count)")
```

### Batch 3 (Depends on TASK-1.1)
```
Task("backend-typescript-architect", "TASK-1.2: Define storage port interfaces in core/ports/: ProjectStore (list, get, create, update), FieldCatalogStore (getGlobal, getForProject, addOption), DocStore (list, read, write, append), Clock (now)")
Task("backend-typescript-architect", "TASK-1.4: Implement request-log serializer in core/serializer/: parse/serialize request-log markdown with YAML frontmatter (type, doc_id, item_count, tags, items_index), item sections with ## headers, tag aggregation from all items")
Task("backend-typescript-architect", "TASK-1.5: Implement ID generation in core/validation/: doc_id pattern REQ-YYYYMMDD-<project-slug>, item_id pattern REQ-YYYYMMDD-<project-slug>-XX with zero-padded counter")
```

### Batch 4 (Depends on TASK-1.2)
```
Task("backend-typescript-architect", "TASK-1.3: Implement local FS adapters in adapters/: fs-local for DocStore (read/write/append markdown files with backup), config-local for ProjectStore and FieldCatalogStore (JSON files at ~/.meatycapture/)")
```

### Batch 5 (Depends on TASK-1.4, TASK-1.5)
```
Task("backend-typescript-architect", "TASK-1.6: Write unit tests with Vitest for: serializer roundtrip, ID generation patterns, tag aggregation, model validation")
```

## Files Changed

(To be updated as work progresses)

## Success Criteria

- [ ] Project scaffolding complete with TypeScript + Vite/React
- [ ] Lint/format/test configs working
- [ ] Domain models defined with proper types
- [ ] Storage port interfaces defined
- [ ] Local FS adapters implemented
- [ ] Request-log serializer/deserializer working
- [ ] ID generation utilities working
- [ ] Unit tests passing
