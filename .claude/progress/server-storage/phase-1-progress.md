---
type: progress
prd: "server-storage"
phase: 1
phase_name: "Server Infrastructure"
status: pending
progress: 0
total_tasks: 4
completed_tasks: 0
duration_estimate: "3-5 days"
story_points: 8

tasks:
  - id: "TASK-SS-001"
    name: "Create Server Entry Point"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimate: 2
    files:
      - "src/server/index.ts"

  - id: "TASK-SS-002"
    name: "Implement CORS Middleware"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimate: 2
    files:
      - "src/server/middleware/cors.ts"

  - id: "TASK-SS-003"
    name: "Implement Auth Middleware Stub"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimate: 2
    files:
      - "src/server/middleware/auth.ts"

  - id: "TASK-SS-004"
    name: "Implement Error Handling Middleware"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: []
    estimate: 2
    files:
      - "src/server/middleware/error-handler.ts"

parallelization:
  batch_1: ["TASK-SS-001", "TASK-SS-002", "TASK-SS-003", "TASK-SS-004"]  # All can run in parallel
---

# Phase 1 Progress: Server Infrastructure

**Status**: Pending | **Last Updated**: 2025-12-07 | **Completion**: 0%

## Phase Overview

Build the Bun HTTP server with core routing, middleware, and adapter wiring. This is the foundation layer that all subsequent phases depend on.

**Key Deliverables**:
- Server entry point with Bun.serve configuration
- CORS middleware for cross-origin requests
- Auth middleware stub (bearer token validation)
- Error handling middleware with structured responses
- Route handlers for docs, projects, fields endpoints

**Validation**: Server starts, handles health check, returns proper CORS headers

## Tasks

### TASK-SS-001: Create Server Entry Point
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Implement the main server file with Bun.serve configuration, port binding, and graceful shutdown handling.

**Acceptance Criteria**:
- [ ] Server starts on PORT env var (default 3001)
- [ ] Health check endpoint at GET /health returns 200 OK
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Logs startup information (port, data directory)
- [ ] Error handling for port already in use

**Files**:
- `src/server/index.ts` (create)

**Dependencies**: None

---

### TASK-SS-002: Implement CORS Middleware
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create CORS middleware to handle cross-origin requests from the web app.

**Acceptance Criteria**:
- [ ] Handles preflight OPTIONS requests
- [ ] Configurable allowed origins via env var
- [ ] Sets Access-Control-Allow-Origin, -Methods, -Headers
- [ ] Supports credentials (cookies/auth headers)
- [ ] Logs CORS rejections for debugging

**Files**:
- `src/server/middleware/cors.ts` (create)

**Dependencies**: None

---

### TASK-SS-003: Implement Auth Middleware Stub
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create authentication middleware with bearer token validation (stub for future auth).

**Acceptance Criteria**:
- [ ] Validates Authorization: Bearer {token} header
- [ ] Compares against MEATYCAPTURE_AUTH_TOKEN env var
- [ ] Returns 401 Unauthorized on token mismatch
- [ ] Skips auth if MEATYCAPTURE_AUTH_TOKEN not set
- [ ] Adds user context to request object

**Files**:
- `src/server/middleware/auth.ts` (create)

**Dependencies**: None

---

### TASK-SS-004: Implement Error Handling Middleware
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create centralized error handling with structured error responses.

**Acceptance Criteria**:
- [ ] Catches all unhandled route errors
- [ ] Returns consistent JSON error format: {error, message, details?}
- [ ] Maps common errors to HTTP status codes
- [ ] Logs errors with stack traces
- [ ] Sanitizes error messages in production mode

**Files**:
- `src/server/middleware/error-handler.ts` (create)

**Dependencies**: None

---

## Completed Tasks

None yet.

---

## In Progress

None yet.

---

## Blocked

None.

---

## Next Actions

1. All tasks in this phase can run in parallel (batch_1)
2. Start with TASK-SS-001 to establish server foundation
3. Validate each middleware independently before integration
4. Test server startup with all middleware combined

---

## Integration Notes

- All middleware should follow Bun server middleware patterns
- Error handler must be last in middleware chain
- CORS must run before auth (to handle preflight)
- Health check endpoint should bypass auth middleware

---

## Testing Checklist

- [ ] Server starts successfully on configurable port
- [ ] Health check returns 200 OK
- [ ] CORS headers present in responses
- [ ] Preflight OPTIONS requests handled
- [ ] Auth validation works (valid/invalid/missing tokens)
- [ ] Auth skips when MEATYCAPTURE_AUTH_TOKEN not set
- [ ] Error responses have consistent structure
- [ ] Errors logged with stack traces
- [ ] Graceful shutdown works (SIGTERM/SIGINT)
- [ ] Port conflict error handled gracefully

---

## Orchestration Quick Reference

### Run All Tasks in Parallel

```typescript
Task("backend-typescript-architect", `
Implement Phase 1: Server Infrastructure for server-storage feature.

Complete all 4 tasks in parallel:

1. TASK-SS-001: Create server entry point (src/server/index.ts)
   - Bun.serve configuration
   - PORT env var (default 3001)
   - Health check at GET /health
   - Graceful shutdown (SIGTERM/SIGINT)
   - Port conflict error handling

2. TASK-SS-002: Implement CORS middleware (src/server/middleware/cors.ts)
   - Handle preflight OPTIONS
   - Configurable origins via CORS_ORIGINS env var
   - Access-Control headers
   - Credentials support
   - Log CORS rejections

3. TASK-SS-003: Implement Auth middleware (src/server/middleware/auth.ts)
   - Bearer token validation
   - Compare against MEATYCAPTURE_AUTH_TOKEN env var
   - 401 on mismatch
   - Skip if token not set
   - Add user context to request

4. TASK-SS-004: Implement Error handling middleware (src/server/middleware/error-handler.ts)
   - Catch all unhandled errors
   - Consistent JSON format: {error, message, details?}
   - Map errors to HTTP status codes
   - Log with stack traces
   - Sanitize in production

Reference: /Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/implementation_plans/features/server-storage-v1.md
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md

Follow Bun server patterns. CORS before auth, error handler last. Health check bypasses auth.
`);
```

### Run Individual Tasks

```typescript
// TASK-SS-001
Task("backend-typescript-architect", `
Implement TASK-SS-001: Create Server Entry Point

Create src/server/index.ts with:
- Bun.serve configuration
- PORT env var (default 3001)
- Health check at GET /health returns 200 OK
- Graceful shutdown on SIGTERM/SIGINT
- Log startup info (port, data directory)
- Handle port already in use error

Reference: Phase 1, Task SS-001 in implementation plan
`);

// TASK-SS-002
Task("backend-typescript-architect", `
Implement TASK-SS-002: Implement CORS Middleware

Create src/server/middleware/cors.ts with:
- Handle preflight OPTIONS requests
- Configurable origins via CORS_ORIGINS env var
- Set Access-Control-Allow-Origin, -Methods, -Headers
- Support credentials (cookies/auth headers)
- Log CORS rejections for debugging

Reference: Phase 1, Task SS-002 in implementation plan
`);

// TASK-SS-003
Task("backend-typescript-architect", `
Implement TASK-SS-003: Implement Auth Middleware Stub

Create src/server/middleware/auth.ts with:
- Validate Authorization: Bearer {token} header
- Compare against MEATYCAPTURE_AUTH_TOKEN env var
- Return 401 Unauthorized on token mismatch
- Skip auth if MEATYCAPTURE_AUTH_TOKEN not set
- Add user context to request object

Reference: Phase 1, Task SS-003 in implementation plan
`);

// TASK-SS-004
Task("backend-typescript-architect", `
Implement TASK-SS-004: Implement Error Handling Middleware

Create src/server/middleware/error-handler.ts with:
- Catch all unhandled route errors
- Return consistent JSON error format: {error, message, details?}
- Map common errors to HTTP status codes
- Log errors with stack traces
- Sanitize error messages in production mode

Reference: Phase 1, Task SS-004 in implementation plan
`);
```

### Validation Task

```typescript
Task("task-completion-validator", `
Validate Phase 1 completion for server-storage feature.

Check all acceptance criteria:
1. TASK-SS-001: Server starts, health check works, graceful shutdown
2. TASK-SS-002: CORS headers present, preflight handled
3. TASK-SS-003: Auth validation works, skips when not configured
4. TASK-SS-004: Error responses consistent, logged properly

Test:
- Server starts on configurable port
- All middleware integrated correctly
- Health check bypasses auth
- Middleware order: CORS → Auth → Routes → Error Handler

Update: /Users/miethe/dev/homelab/development/meatycapture/.claude/progress/server-storage/phase-1-progress.md
`);
```

---

## Context for AI Agents

When working on this phase:

1. **Follow Bun patterns**: Use Bun.serve, not Express/Fastify
2. **Middleware order matters**: CORS → Auth → Routes → Error Handler
3. **Environment variables**: All config via env vars (see context.md)
4. **Health check special**: Bypasses auth middleware
5. **Error format**: Consistent {error, message, details?} structure
6. **Testing**: Test each middleware independently first
7. **Production ready**: Sanitize errors, configurable origins, graceful shutdown

Next phase depends on this foundation being solid. Focus on:
- Clean middleware interfaces
- Comprehensive error handling
- Clear logging
- Environment-based configuration
