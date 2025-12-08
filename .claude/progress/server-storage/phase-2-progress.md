---
type: progress
prd: "server-storage"
phase: 2
phase_name: "API Route Handlers"
status: pending
progress: 0
total_tasks: 4
completed_tasks: 0
duration_estimate: "4-6 days"
story_points: 10

tasks:
  - id: "TASK-SS-005"
    name: "Implement DocStore Routes"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-001", "TASK-SS-004"]
    estimate: 3
    files:
      - "src/server/routes/docs.ts"

  - id: "TASK-SS-006"
    name: "Implement ProjectStore Routes"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-001", "TASK-SS-004"]
    estimate: 2
    files:
      - "src/server/routes/projects.ts"

  - id: "TASK-SS-007"
    name: "Implement FieldCatalogStore Routes"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-001", "TASK-SS-004"]
    estimate: 2
    files:
      - "src/server/routes/fields.ts"

  - id: "TASK-SS-008"
    name: "Implement Request Validation Middleware"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-001"]
    estimate: 3
    files:
      - "src/server/middleware/validation.ts"
      - "src/server/schemas/"

parallelization:
  batch_1: ["TASK-SS-008"]  # Validation first (needed by routes)
  batch_2: ["TASK-SS-005", "TASK-SS-006", "TASK-SS-007"]  # All routes in parallel after validation
---

# Phase 2 Progress: API Route Handlers

**Status**: Pending | **Last Updated**: 2025-12-07 | **Completion**: 0%

## Phase Overview

Implement REST endpoints that delegate to existing adapter implementations (FsDocStore, LocalProjectStore, LocalFieldCatalogStore). This is the core functionality layer that exposes existing adapters via HTTP.

**Key Deliverables**:
- DocStore endpoints (list, read, write, append, backup, isWritable)
- ProjectStore endpoints (list, get, create, update, delete)
- FieldCatalogStore endpoints (getGlobal, getForProject, getByField, addOption, removeOption)
- Request validation middleware
- Response serialization with Date handling

**Validation**: All endpoints return expected data, handle errors correctly

**Dependencies**: Phase 1 (Server Infrastructure) must be complete

## Tasks

### TASK-SS-008: Implement Request Validation Middleware
**Status**: Pending | **Estimate**: 3 points | **Assigned**: backend-typescript-architect

**Description**: Create middleware for validating request schemas. Should be implemented first as it's needed by all route handlers.

**Acceptance Criteria**:
- [ ] Validates required query/path/body parameters
- [ ] Type checks parameters (string, number, boolean)
- [ ] Returns 400 Bad Request with validation errors
- [ ] Reusable validation schemas for each endpoint
- [ ] Validates enum values (field names, scopes)

**Files**:
- `src/server/middleware/validation.ts` (create)
- `src/server/schemas/` (create directory + schemas)

**Dependencies**: TASK-SS-001 (Server Entry Point)

**Priority**: HIGH - Complete before route handlers

---

### TASK-SS-005: Implement DocStore Routes
**Status**: Pending | **Estimate**: 3 points | **Assigned**: backend-typescript-architect

**Description**: Create REST endpoints for all DocStore operations.

**Acceptance Criteria**:
- [ ] GET /api/docs?project_id={id} - list documents
- [ ] GET /api/docs/:doc_id - read document
- [ ] POST /api/docs/:doc_id - write document
- [ ] PATCH /api/docs/:doc_id/items - append item
- [ ] POST /api/docs/:doc_id/backup - create backup
- [ ] HEAD /api/docs/:doc_id - check writability
- [ ] Validates request parameters
- [ ] Serializes Date objects properly
- [ ] Returns 404 for missing documents
- [ ] Uses existing FsDocStore implementation

**Files**:
- `src/server/routes/docs.ts` (create)

**Dependencies**: TASK-SS-001 (Server), TASK-SS-004 (Error Handler), TASK-SS-008 (Validation)

**Integration**: Wire into server router after completion

---

### TASK-SS-006: Implement ProjectStore Routes
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create REST endpoints for all ProjectStore operations.

**Acceptance Criteria**:
- [ ] GET /api/projects - list all projects
- [ ] GET /api/projects/:id - get project by ID
- [ ] POST /api/projects - create new project
- [ ] PATCH /api/projects/:id - update project
- [ ] DELETE /api/projects/:id - delete project
- [ ] Validates project data schema
- [ ] Returns 404 for missing projects
- [ ] Returns 409 on duplicate ID conflicts
- [ ] Uses existing LocalProjectStore implementation

**Files**:
- `src/server/routes/projects.ts` (create)

**Dependencies**: TASK-SS-001 (Server), TASK-SS-004 (Error Handler), TASK-SS-008 (Validation)

**Integration**: Wire into server router after completion

---

### TASK-SS-007: Implement FieldCatalogStore Routes
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create REST endpoints for all FieldCatalogStore operations.

**Acceptance Criteria**:
- [ ] GET /api/fields/global - get global options
- [ ] GET /api/fields/project/:id - get project options
- [ ] GET /api/fields/by-field/:field?project_id={id} - get by field
- [ ] POST /api/fields - add new option
- [ ] DELETE /api/fields/:id - remove option
- [ ] Validates field names and scopes
- [ ] Returns 400 on invalid field names
- [ ] Uses existing LocalFieldCatalogStore implementation

**Files**:
- `src/server/routes/fields.ts` (create)

**Dependencies**: TASK-SS-001 (Server), TASK-SS-004 (Error Handler), TASK-SS-008 (Validation)

**Integration**: Wire into server router after completion

---

## Completed Tasks

None yet.

---

## In Progress

None yet.

---

## Blocked

None. Waiting for Phase 1 completion.

---

## Next Actions

1. **Complete Phase 1 first** (Server Infrastructure)
2. Start with TASK-SS-008 (Validation Middleware) - needed by all routes
3. Once validation ready, run TASK-SS-005, TASK-SS-006, TASK-SS-007 in parallel
4. Wire all routes into server router after individual testing
5. Integration test all endpoints together

---

## Implementation Notes

### Date Serialization Pattern

All routes must handle Date serialization consistently:

```typescript
// Response serialization
function serializeResponse(data: any): any {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    value instanceof Date ? value.toISOString() : value
  ));
}

// Request deserialization
function deserializeDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value;
}
```

### Error Mapping Pattern

Map adapter errors to HTTP status codes:

```typescript
const errorStatusMap = {
  'NotFoundError': 404,
  'ValidationError': 400,
  'PermissionError': 403,
  'ConflictError': 409,
  'StorageError': 500,
};
```

### Adapter Reuse Pattern

All routes delegate to existing adapters:

```typescript
// Example: DocStore route
import { FsDocStore } from '../../adapters/fs-local/fs-doc-store';

const docStore = new FsDocStore(dataDir);

async function handleListDocs(req) {
  const projectId = req.query.project_id;
  const docs = await docStore.list(projectId);
  return serializeResponse(docs);
}
```

---

## Testing Checklist

### Validation Middleware (TASK-SS-008)
- [ ] Required parameters validated
- [ ] Type checking works (string, number, boolean)
- [ ] 400 Bad Request on validation failure
- [ ] Enum values validated
- [ ] Reusable schemas for all endpoints

### DocStore Routes (TASK-SS-005)
- [ ] All 6 endpoints implemented and tested
- [ ] Date serialization works
- [ ] 404 on missing documents
- [ ] FsDocStore integration works
- [ ] Request validation applied
- [ ] Error responses structured correctly

### ProjectStore Routes (TASK-SS-006)
- [ ] All 5 endpoints implemented and tested
- [ ] 404 on missing projects
- [ ] 409 on duplicate IDs
- [ ] LocalProjectStore integration works
- [ ] Project schema validation works
- [ ] Error responses structured correctly

### FieldCatalogStore Routes (TASK-SS-007)
- [ ] All 5 endpoints implemented and tested
- [ ] Field name validation works
- [ ] 400 on invalid field names
- [ ] LocalFieldCatalogStore integration works
- [ ] Scope validation works (global/project)
- [ ] Error responses structured correctly

### Integration Testing
- [ ] All routes wired into server router
- [ ] CORS headers present in all responses
- [ ] Auth middleware applied correctly
- [ ] Error handler catches route errors
- [ ] Health check still works
- [ ] Server starts with all routes

---

## Orchestration Quick Reference

### Run Validation First, Then Routes in Parallel

```typescript
// Step 1: Validation middleware (must complete first)
Task("backend-typescript-architect", `
Implement TASK-SS-008: Request Validation Middleware

Create src/server/middleware/validation.ts and src/server/schemas/:
- Validate required query/path/body parameters
- Type check parameters (string, number, boolean)
- Return 400 Bad Request with validation errors
- Reusable validation schemas for each endpoint
- Validate enum values (field names, scopes)

Create validation schemas for:
- DocStore endpoints (doc_id, project_id, item draft)
- ProjectStore endpoints (project ID, project data)
- FieldCatalogStore endpoints (field names, scopes, option data)

Reference: Phase 2, Task SS-008 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
`);

// Step 2: All routes in parallel (after validation complete)
Task("backend-typescript-architect", `
Implement Phase 2 Route Handlers (TASK-SS-005, TASK-SS-006, TASK-SS-007)

Complete all 3 route handlers in parallel:

1. TASK-SS-005: DocStore Routes (src/server/routes/docs.ts)
   - GET /api/docs?project_id={id} - list
   - GET /api/docs/:doc_id - read
   - POST /api/docs/:doc_id - write
   - PATCH /api/docs/:doc_id/items - append
   - POST /api/docs/:doc_id/backup - backup
   - HEAD /api/docs/:doc_id - check writable
   - Use FsDocStore from adapters/fs-local
   - Serialize Date objects
   - Return 404 on missing docs

2. TASK-SS-006: ProjectStore Routes (src/server/routes/projects.ts)
   - GET /api/projects - list
   - GET /api/projects/:id - get
   - POST /api/projects - create
   - PATCH /api/projects/:id - update
   - DELETE /api/projects/:id - delete
   - Use LocalProjectStore from adapters/config-local
   - Return 404 on missing, 409 on duplicates

3. TASK-SS-007: FieldCatalogStore Routes (src/server/routes/fields.ts)
   - GET /api/fields/global - global options
   - GET /api/fields/project/:id - project options
   - GET /api/fields/by-field/:field?project_id={id} - by field
   - POST /api/fields - add option
   - DELETE /api/fields/:id - remove option
   - Use LocalFieldCatalogStore from adapters/config-local
   - Return 400 on invalid field names

All routes:
- Apply validation middleware from TASK-SS-008
- Consistent error responses via error handler
- Date serialization pattern
- Wire into server router

Reference: Phase 2 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
`);
```

### Run Individual Tasks

```typescript
// TASK-SS-008 (run first)
Task("backend-typescript-architect", `
Implement TASK-SS-008: Request Validation Middleware

Create validation middleware and schemas. See orchestration command above.
`);

// TASK-SS-005
Task("backend-typescript-architect", `
Implement TASK-SS-005: DocStore Routes

Create src/server/routes/docs.ts with all 6 DocStore endpoints.
Use FsDocStore, apply validation, serialize Dates, return 404 on missing.

Reference: Phase 2, Task SS-005 in implementation plan
`);

// TASK-SS-006
Task("backend-typescript-architect", `
Implement TASK-SS-006: ProjectStore Routes

Create src/server/routes/projects.ts with all 5 ProjectStore endpoints.
Use LocalProjectStore, apply validation, return 404/409 appropriately.

Reference: Phase 2, Task SS-006 in implementation plan
`);

// TASK-SS-007
Task("backend-typescript-architect", `
Implement TASK-SS-007: FieldCatalogStore Routes

Create src/server/routes/fields.ts with all 5 FieldCatalogStore endpoints.
Use LocalFieldCatalogStore, validate field names/scopes, return 400 on invalid.

Reference: Phase 2, Task SS-007 in implementation plan
`);
```

### Validation Task

```typescript
Task("task-completion-validator", `
Validate Phase 2 completion for server-storage feature.

Check all acceptance criteria:
1. TASK-SS-008: Validation middleware works, schemas cover all endpoints
2. TASK-SS-005: All 6 DocStore endpoints work, Dates serialize correctly
3. TASK-SS-006: All 5 ProjectStore endpoints work, errors mapped correctly
4. TASK-SS-007: All 5 FieldCatalogStore endpoints work, field validation works

Test:
- All routes wired into server router
- Validation applied to all endpoints
- Error responses consistent
- Adapter integration works
- Date serialization/deserialization works
- HTTP status codes correct (200, 400, 404, 409, 500)

Integration test:
- Start server with all routes
- Test each endpoint with valid/invalid data
- Verify CORS headers present
- Verify auth middleware applied
- Verify error handler catches route errors

Update: /Users/miethe/dev/homelab/development/meatycapture/.claude/progress/server-storage/phase-2-progress.md
`);
```

---

## Context for AI Agents

When working on this phase:

1. **Complete Phase 1 first**: Don't start until server infrastructure is solid
2. **Start with validation**: TASK-SS-008 must complete before routes (batch_1 → batch_2)
3. **Reuse existing adapters**: Import and use FsDocStore, LocalProjectStore, LocalFieldCatalogStore
4. **Date serialization**: Use consistent pattern across all routes (see implementation notes)
5. **Error mapping**: Map adapter errors to HTTP status codes (see implementation notes)
6. **Validation**: Apply validation middleware to all routes
7. **Testing**: Test each route independently before integration
8. **Router integration**: Wire routes into server router after individual testing

Key patterns:
- Delegate to adapters (don't duplicate logic)
- Consistent error responses
- Date serialization/deserialization
- Request validation
- HTTP status codes (200, 400, 404, 409, 500)

Next phase (Phase 3) builds HTTP client adapters that call these endpoints.
