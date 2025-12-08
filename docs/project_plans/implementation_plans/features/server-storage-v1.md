# Implementation Plan: Server-Side Storage (v1)

**Complexity**: Medium (M) | **Track**: Standard
**Estimated Effort**: 26 Story Points | **Timeline**: 2-3 Weeks
**Feature Owner**: Backend Team | **Status**: Planning

---

## Executive Summary

Add a lightweight Bun-based REST API server that enables the web app to save/read files from server filesystem, with HTTP client adapters for the web app. This feature transforms MeatyCapture from a local-only application into a client-server architecture while maximally reusing existing adapter implementations.

### Key Objectives

1. **Server Infrastructure**: Bun HTTP server exposing existing adapters via REST API
2. **HTTP Client Adapters**: Browser-compatible stores that communicate with the server
3. **Platform Detection**: Auto-detection and selection of API vs local adapters
4. **Deployment Ready**: Docker containerization with docker-compose example

### Architecture Pattern

```
Web Browser (React App)
    ↓ Uses: ApiDocStore, ApiProjectStore, ApiFieldStore
    ↓ HTTP/REST
Bun HTTP Server
    ↓ Routes: /api/docs, /api/projects, /api/fields
    ↓ Reuses: FsDocStore, LocalProjectStore, LocalFieldCatalogStore
    ↓
File System (~/.meatycapture/ or NFS mount)
```

### Success Criteria

- [ ] Server exposes all DocStore, ProjectStore, FieldCatalogStore operations via REST
- [ ] Web app can use HTTP adapters transparently (same port interfaces)
- [ ] Platform factory auto-detects and selects appropriate adapter implementation
- [ ] Docker deployment runs server with persistent volume
- [ ] All existing tests pass with new adapters (via integration tests)
- [ ] Error handling includes network failures and timeout scenarios

---

## Implementation Phases

### Phase 1: Server Infrastructure (Foundation)
**Duration**: 3-5 days | **Story Points**: 8

Build the Bun HTTP server with core routing, middleware, and adapter wiring.

**Key Deliverables**:
- Server entry point with Bun.serve configuration
- CORS middleware for cross-origin requests
- Auth middleware stub (bearer token validation)
- Error handling middleware with structured responses
- Route handlers for docs, projects, fields endpoints

**Dependencies**: None (greenfield)

**Validation**: Server starts, handles health check, returns proper CORS headers

---

### Phase 2: API Route Handlers (Core Functionality)
**Duration**: 4-6 days | **Story Points**: 10

Implement REST endpoints that delegate to existing adapter implementations.

**Key Deliverables**:
- DocStore endpoints (list, read, write, append, backup, isWritable)
- ProjectStore endpoints (list, get, create, update, delete)
- FieldCatalogStore endpoints (getGlobal, getForProject, getByField, addOption, removeOption)
- Request validation middleware
- Response serialization with Date handling

**Dependencies**: Phase 1

**Validation**: All endpoints return expected data, handle errors correctly

---

### Phase 3: HTTP Client Adapters (Browser Integration)
**Duration**: 3-5 days | **Story Points**: 8

Create browser-compatible adapter implementations using fetch API.

**Key Deliverables**:
- ApiDocStore implementing DocStore interface
- ApiProjectStore implementing ProjectStore interface
- ApiFieldCatalogStore implementing FieldCatalogStore interface
- Shared HTTP client with retry, timeout, error handling
- Network error mapping to adapter-style errors

**Dependencies**: Phase 2

**Validation**: Client adapters pass existing port interface tests (mocked server)

---

### Phase 4: Platform Detection & Integration
**Duration**: 2-3 days | **Story Points**: 5

Update platform factories to detect and select API-based adapters.

**Key Deliverables**:
- API detection logic (MEATYCAPTURE_API_URL environment variable)
- Updated fs-local/platform-factory.ts
- Updated config-local/platform-factory.ts
- Runtime adapter selection based on environment

**Dependencies**: Phase 3

**Validation**: App uses local adapters by default, API adapters when URL configured

---

### Phase 5: Deployment & Documentation
**Duration**: 2-3 days | **Story Points**: 5

Containerize server and provide deployment examples.

**Key Deliverables**:
- Dockerfile with Bun runtime
- docker-compose.yml with server + volume
- .env.example with configuration documentation
- Server start scripts in package.json
- Deployment guide in docs/

**Dependencies**: Phases 1-4

**Validation**: Docker container runs, persists data, handles restarts

---

## Task Breakdown

### PHASE 1: Server Infrastructure

#### TASK-SS-001: Create Server Entry Point
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Implement the main server file with Bun.serve configuration, port binding, and graceful shutdown handling.

**Acceptance Criteria**:
- [ ] Server starts on PORT env var (default 3001)
- [ ] Health check endpoint at GET /health returns 200 OK
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Logs startup information (port, data directory)
- [ ] Error handling for port already in use

**Estimate**: 2 points

**Files**:
- `src/server/index.ts` (create)

---

#### TASK-SS-002: Implement CORS Middleware
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create CORS middleware to handle cross-origin requests from the web app.

**Acceptance Criteria**:
- [ ] Handles preflight OPTIONS requests
- [ ] Configurable allowed origins via env var
- [ ] Sets Access-Control-Allow-Origin, -Methods, -Headers
- [ ] Supports credentials (cookies/auth headers)
- [ ] Logs CORS rejections for debugging

**Estimate**: 2 points

**Files**:
- `src/server/middleware/cors.ts` (create)

---

#### TASK-SS-003: Implement Auth Middleware Stub
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create authentication middleware with bearer token validation (stub for future auth).

**Acceptance Criteria**:
- [ ] Validates Authorization: Bearer {token} header
- [ ] Compares against MEATYCAPTURE_AUTH_TOKEN env var
- [ ] Returns 401 Unauthorized on token mismatch
- [ ] Skips auth if MEATYCAPTURE_AUTH_TOKEN not set
- [ ] Adds user context to request object

**Estimate**: 2 points

**Files**:
- `src/server/middleware/auth.ts` (create)

---

#### TASK-SS-004: Implement Error Handling Middleware
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create centralized error handling with structured error responses.

**Acceptance Criteria**:
- [ ] Catches all unhandled route errors
- [ ] Returns consistent JSON error format: {error, message, details?}
- [ ] Maps common errors to HTTP status codes
- [ ] Logs errors with stack traces
- [ ] Sanitizes error messages in production mode

**Estimate**: 2 points

**Files**:
- `src/server/middleware/error-handler.ts` (create)

---

### PHASE 2: API Route Handlers

#### TASK-SS-005: Implement DocStore Routes
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create REST endpoints for all DocStore operations.

**Acceptance Criteria**:
- [ ] GET /api/docs?project_id={id} - list documents
- [ ] GET /api/docs/{doc_id} - read document
- [ ] POST /api/docs/{doc_id} - write document
- [ ] PATCH /api/docs/{doc_id}/items - append item
- [ ] POST /api/docs/{doc_id}/backup - create backup
- [ ] HEAD /api/docs/{doc_id} - check writability
- [ ] Validates request parameters
- [ ] Serializes Date objects properly
- [ ] Returns 404 for missing documents
- [ ] Uses existing FsDocStore implementation

**Estimate**: 3 points

**Files**:
- `src/server/routes/docs.ts` (create)

---

#### TASK-SS-006: Implement ProjectStore Routes
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create REST endpoints for all ProjectStore operations.

**Acceptance Criteria**:
- [ ] GET /api/projects - list all projects
- [ ] GET /api/projects/{id} - get project by ID
- [ ] POST /api/projects - create new project
- [ ] PATCH /api/projects/{id} - update project
- [ ] DELETE /api/projects/{id} - delete project
- [ ] Validates project data schema
- [ ] Returns 404 for missing projects
- [ ] Returns 409 on duplicate ID conflicts
- [ ] Uses existing LocalProjectStore implementation

**Estimate**: 2 points

**Files**:
- `src/server/routes/projects.ts` (create)

---

#### TASK-SS-007: Implement FieldCatalogStore Routes
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create REST endpoints for all FieldCatalogStore operations.

**Acceptance Criteria**:
- [ ] GET /api/fields/global - get global options
- [ ] GET /api/fields/project/{id} - get project options
- [ ] GET /api/fields/by-field/{field}?project_id={id} - get by field
- [ ] POST /api/fields - add new option
- [ ] DELETE /api/fields/{id} - remove option
- [ ] Validates field names and scopes
- [ ] Returns 400 on invalid field names
- [ ] Uses existing LocalFieldCatalogStore implementation

**Estimate**: 2 points

**Files**:
- `src/server/routes/fields.ts` (create)

---

#### TASK-SS-008: Implement Request Validation Middleware
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create middleware for validating request schemas.

**Acceptance Criteria**:
- [ ] Validates required query/path/body parameters
- [ ] Type checks parameters (string, number, boolean)
- [ ] Returns 400 Bad Request with validation errors
- [ ] Reusable validation schemas for each endpoint
- [ ] Validates enum values (field names, scopes)

**Estimate**: 3 points

**Files**:
- `src/server/middleware/validation.ts` (create)
- `src/server/schemas/` (create directory + schemas)

---

### PHASE 3: HTTP Client Adapters

#### TASK-SS-009: Implement Shared HTTP Client
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create shared fetch wrapper with error handling, retry, and timeout logic.

**Acceptance Criteria**:
- [ ] Uses fetch API for HTTP requests
- [ ] Configurable base URL from MEATYCAPTURE_API_URL
- [ ] Timeout support (default 30s)
- [ ] Retry logic for network failures (3 attempts)
- [ ] Bearer token auth header injection
- [ ] Maps HTTP status codes to errors
- [ ] Serializes/deserializes Date objects
- [ ] TypeScript generic type support

**Estimate**: 3 points

**Files**:
- `src/adapters/api-client/http-client.ts` (create)
- `src/adapters/api-client/types.ts` (create)

---

#### TASK-SS-010: Implement ApiDocStore
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create HTTP-based DocStore implementation.

**Acceptance Criteria**:
- [ ] Implements DocStore interface
- [ ] Calls corresponding /api/docs endpoints
- [ ] Handles Clock parameter in append() correctly
- [ ] Maps network errors to DocStore-style errors
- [ ] Deserializes Date objects in responses
- [ ] Includes integration tests with mock server

**Estimate**: 2 points

**Files**:
- `src/adapters/api-client/api-doc-store.ts` (create)
- `src/adapters/api-client/api-doc-store.test.ts` (create)

---

#### TASK-SS-011: Implement ApiProjectStore and ApiFieldCatalogStore
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create HTTP-based ProjectStore and FieldCatalogStore implementations.

**Acceptance Criteria**:
- [ ] ApiProjectStore implements ProjectStore interface
- [ ] ApiFieldCatalogStore implements FieldCatalogStore interface
- [ ] Call corresponding /api/projects and /api/fields endpoints
- [ ] Map network errors appropriately
- [ ] Deserialize Date objects correctly
- [ ] Include integration tests with mock server

**Estimate**: 3 points

**Files**:
- `src/adapters/api-client/api-config-stores.ts` (create)
- `src/adapters/api-client/api-config-stores.test.ts` (create)
- `src/adapters/api-client/index.ts` (create barrel exports)

---

### PHASE 4: Platform Detection & Integration

#### TASK-SS-012: Implement API Detection Logic
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create platform detection module that checks for API server availability.

**Acceptance Criteria**:
- [ ] Checks MEATYCAPTURE_API_URL environment variable
- [ ] Validates URL format
- [ ] Optionally pings /health endpoint to verify server
- [ ] Returns detection result: 'api' | 'local' | 'browser'
- [ ] Caches detection result for performance
- [ ] Logs detection decision

**Estimate**: 2 points

**Files**:
- `src/platform/api-detection.ts` (create)

---

#### TASK-SS-013: Update Platform Factories
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Update existing platform factories to use API adapters when detected.

**Acceptance Criteria**:
- [ ] fs-local/platform-factory.ts uses ApiDocStore when API detected
- [ ] config-local/platform-factory.ts uses Api stores when API detected
- [ ] Falls back to local/browser adapters when API not available
- [ ] Includes runtime switching tests
- [ ] Preserves existing factory behavior as default

**Estimate**: 3 points

**Files**:
- `src/adapters/fs-local/platform-factory.ts` (update)
- `src/adapters/config-local/platform-factory.ts` (update)

---

### PHASE 5: Deployment & Documentation

#### TASK-SS-014: Create Dockerfile
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create optimized Dockerfile for Bun server.

**Acceptance Criteria**:
- [ ] Uses official Bun base image
- [ ] Multi-stage build for smaller image size
- [ ] Copies only necessary files (src/server, src/core, src/adapters)
- [ ] Sets proper file permissions
- [ ] Exposes PORT (default 3001)
- [ ] Runs as non-root user
- [ ] Health check using /health endpoint

**Estimate**: 2 points

**Files**:
- `Dockerfile` (create)
- `.dockerignore` (create)

---

#### TASK-SS-015: Create docker-compose Configuration
**Assigned**: backend-typescript-architect (Sonnet)

**Description**: Create docker-compose.yml for easy local deployment.

**Acceptance Criteria**:
- [ ] Defines meatycapture-server service
- [ ] Mounts volume for persistent data
- [ ] Configures environment variables
- [ ] Sets restart policy (unless-stopped)
- [ ] Includes optional nginx reverse proxy config
- [ ] Port mapping (3001:3001)
- [ ] Network configuration

**Estimate**: 1 point

**Files**:
- `docker-compose.yml` (create)
- `docker-compose.override.example.yml` (create)

---

#### TASK-SS-016: Add Server Scripts and Environment Template
**Assigned**: documentation-writer (Haiku)

**Description**: Add server start scripts to package.json and create environment template.

**Acceptance Criteria**:
- [ ] package.json includes "server:dev" script (Bun dev mode)
- [ ] package.json includes "server:start" script (production)
- [ ] package.json includes "server:build" script (compile server)
- [ ] .env.example documents all server environment variables
- [ ] Includes Bun runtime dependency
- [ ] Scripts use correct Bun CLI commands

**Estimate**: 1 point

**Files**:
- `package.json` (update)
- `.env.example` (create)

---

#### TASK-SS-017: Write Deployment Documentation
**Assigned**: documentation-complex (Sonnet)

**Description**: Create comprehensive deployment guide for server mode.

**Acceptance Criteria**:
- [ ] Quick start guide (Docker deployment)
- [ ] Environment variable reference table
- [ ] Architecture diagram
- [ ] Security best practices (HTTPS, auth tokens)
- [ ] Troubleshooting common issues
- [ ] Performance tuning recommendations
- [ ] Monitoring and logging guidance
- [ ] Backup and restore procedures

**Estimate**: 2 points

**Files**:
- `docs/deployment/server-mode.md` (create)

---

## Risk Assessment

### High Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **CORS Configuration Issues** | High | Medium | Comprehensive CORS testing with multiple origins; clear documentation; permissive defaults for development |
| **Date Serialization Bugs** | High | Medium | Centralized serialization utilities; thorough integration tests; JSON date format validation |
| **Network Timeout Handling** | Medium | High | Configurable timeouts; retry logic; clear error messages; offline fallback strategy |
| **File System Permission Errors** | High | Medium | Docker volume permission guidance; health check validation; clear error messages |

### Medium Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Bun Runtime Compatibility** | Medium | Low | Use stable Bun version; test on multiple platforms; fallback to Node.js documentation |
| **Concurrent Write Conflicts** | Medium | Medium | Document last-write-wins behavior; future: optimistic locking with ETags |
| **Large Document Performance** | Low | Medium | Stream large responses; pagination for list endpoints; document size limits |

---

## Architecture Validation

### MeatyPrompts Layer Compliance

This feature follows the established layered architecture:

1. **Core Layer**: Reuses existing ports and models (no changes required)
2. **Adapter Layer**: Adds new API client adapters alongside existing adapters
3. **Server Layer**: New layer that wraps existing adapters with HTTP
4. **Platform Layer**: Enhanced with API detection logic

### Port/Adapter Pattern Validation

- Server exposes existing port interfaces via REST (adapter wrapping)
- Client implements port interfaces via HTTP calls (adapter implementation)
- No changes to core domain logic required
- Platform factory handles runtime selection

### Design Principles

- **Headless Core**: Server has no UI dependencies
- **File-First**: Server uses same file-based storage as local mode
- **No Over-Architecture**: Simple REST API, no GraphQL/gRPC complexity
- **Delegate Everything**: Reuses existing adapters, minimal new code

---

## Dependencies & Prerequisites

### External Dependencies

- **Bun Runtime**: Version 1.0+ (for server)
- **Docker**: Version 20.10+ (for deployment)
- **Node.js**: Version 18+ (for client builds)

### Internal Dependencies

- All existing adapters must be stable (FsDocStore, LocalProjectStore, LocalFieldCatalogStore)
- Core serializer must handle Date objects correctly
- Port interfaces are stable (no breaking changes)

### Environment Setup

```bash
# Development
export MEATYCAPTURE_API_URL="http://localhost:3001"
export MEATYCAPTURE_AUTH_TOKEN="dev-token-123"

# Server
export MEATYCAPTURE_DATA_DIR="~/.meatycapture"
export PORT="3001"
export CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
```

---

## API Endpoint Reference

### DocStore Endpoints

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | /api/docs | List documents | Query: project_id | DocMeta[] |
| GET | /api/docs/:doc_id | Read document | - | RequestLogDoc |
| POST | /api/docs/:doc_id | Write document | Body: RequestLogDoc | void |
| PATCH | /api/docs/:doc_id/items | Append item | Body: ItemDraft | RequestLogDoc |
| POST | /api/docs/:doc_id/backup | Create backup | - | {backup_path: string} |
| HEAD | /api/docs/:doc_id | Check writable | - | 200 OK / 403 Forbidden |

### ProjectStore Endpoints

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | /api/projects | List projects | - | Project[] |
| GET | /api/projects/:id | Get project | - | Project |
| POST | /api/projects | Create project | Body: Omit<Project, 'id'...> | Project |
| PATCH | /api/projects/:id | Update project | Body: Partial<Project> | Project |
| DELETE | /api/projects/:id | Delete project | - | void |

### FieldCatalogStore Endpoints

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | /api/fields/global | Get global options | - | FieldOption[] |
| GET | /api/fields/project/:id | Get project options | - | FieldOption[] |
| GET | /api/fields/by-field/:field | Get by field | Query: project_id? | FieldOption[] |
| POST | /api/fields | Add option | Body: Omit<FieldOption, 'id'...> | FieldOption |
| DELETE | /api/fields/:id | Remove option | - | void |

---

## Testing Strategy

### Unit Tests

- HTTP client error handling and retry logic
- Request validation schemas
- CORS middleware logic
- Auth middleware token validation

### Integration Tests

- API adapters with mocked fetch responses
- End-to-end route handlers with real adapters (temp directories)
- Platform factory adapter selection logic

### Manual Testing Checklist

- [ ] Server starts and responds to health check
- [ ] Web app connects and performs CRUD operations
- [ ] CORS headers allow cross-origin requests
- [ ] Auth token validation works
- [ ] Error responses have correct status codes
- [ ] Docker container runs and persists data
- [ ] Backup files are created correctly
- [ ] Large documents (100+ items) load performantly

---

## Quality Gates

### Pre-Merge Checklist

- [ ] All 17 tasks completed and tested
- [ ] TypeScript compiles with no errors
- [ ] All existing tests pass
- [ ] New integration tests added and passing
- [ ] ESLint/Prettier checks pass
- [ ] API documentation complete
- [ ] Docker image builds successfully
- [ ] docker-compose stack starts cleanly

### Production Readiness Checklist

- [ ] Error handling covers all failure modes
- [ ] Logging includes request/response details
- [ ] CORS configuration documented
- [ ] Auth token rotation process documented
- [ ] Backup/restore procedure tested
- [ ] Performance tested with 1000+ documents
- [ ] Security review completed (OWASP top 10)

---

## Linear Import Data

### Epic

```yaml
title: "Server-Side Storage (v1)"
description: "Add Bun-based REST API server for multi-user deployment"
status: "planned"
priority: "medium"
estimate: 26
```

### Stories

```yaml
- id: TASK-SS-001
  title: "Create Server Entry Point"
  description: "Implement main server with Bun.serve, port binding, health check"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-002
  title: "Implement CORS Middleware"
  description: "Handle cross-origin requests from web app"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-003
  title: "Implement Auth Middleware Stub"
  description: "Bearer token validation for future auth"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-004
  title: "Implement Error Handling Middleware"
  description: "Centralized error responses with structured format"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-005
  title: "Implement DocStore Routes"
  description: "REST endpoints for document operations"
  estimate: 3
  assignee: "backend-typescript-architect"

- id: TASK-SS-006
  title: "Implement ProjectStore Routes"
  description: "REST endpoints for project CRUD"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-007
  title: "Implement FieldCatalogStore Routes"
  description: "REST endpoints for field catalog management"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-008
  title: "Implement Request Validation Middleware"
  description: "Schema validation for all endpoints"
  estimate: 3
  assignee: "backend-typescript-architect"

- id: TASK-SS-009
  title: "Implement Shared HTTP Client"
  description: "Fetch wrapper with retry, timeout, error handling"
  estimate: 3
  assignee: "backend-typescript-architect"

- id: TASK-SS-010
  title: "Implement ApiDocStore"
  description: "HTTP-based DocStore implementation"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-011
  title: "Implement API Config Stores"
  description: "ApiProjectStore and ApiFieldCatalogStore"
  estimate: 3
  assignee: "backend-typescript-architect"

- id: TASK-SS-012
  title: "Implement API Detection Logic"
  description: "Platform detection for API vs local mode"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-013
  title: "Update Platform Factories"
  description: "Integrate API adapters into factory selection"
  estimate: 3
  assignee: "backend-typescript-architect"

- id: TASK-SS-014
  title: "Create Dockerfile"
  description: "Optimized Docker image for Bun server"
  estimate: 2
  assignee: "backend-typescript-architect"

- id: TASK-SS-015
  title: "Create docker-compose Configuration"
  description: "Local deployment stack with persistence"
  estimate: 1
  assignee: "backend-typescript-architect"

- id: TASK-SS-016
  title: "Add Server Scripts and Environment Template"
  description: "package.json scripts and .env.example"
  estimate: 1
  assignee: "documentation-writer"

- id: TASK-SS-017
  title: "Write Deployment Documentation"
  description: "Comprehensive server deployment guide"
  estimate: 2
  assignee: "documentation-complex"
```

---

## Success Metrics

### Development Metrics

- **Code Coverage**: >80% for new server code
- **Build Time**: <5s for server compilation
- **Docker Image Size**: <200MB compressed

### Runtime Metrics

- **API Response Time**: <100ms p95 for read operations
- **API Response Time**: <500ms p95 for write operations
- **Server Startup Time**: <2s
- **Memory Usage**: <100MB baseline (idle)

### User Experience Metrics

- **Network Error Recovery**: Auto-retry succeeds >90% of time
- **Offline Handling**: Clear error message within 3s
- **Documentation Clarity**: Deployment successful in <30min

---

## Future Enhancements (Out of Scope)

- WebSocket support for real-time updates
- Multi-user authentication with user accounts
- Optimistic locking for concurrent edit detection
- Server-side search and filtering
- GraphQL API alternative
- Metrics and observability endpoints
- Rate limiting and abuse prevention
- Multi-tenancy with project isolation

---

**Generated**: 2025-12-07
**Generated with**: [Claude Code](https://claude.com/claude-code)
**Implementation Plan Orchestrator**: Sonnet 4.5
