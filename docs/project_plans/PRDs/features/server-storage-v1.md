---
title: "PRD: MeatyCapture Server-Side Storage (v1)"
description: "REST API server enabling centralized filesystem storage for web browser clients with port/adapter architecture"
audience: [ai-agents, eng, devops]
status: "draft"
created: 2025-12-07
updated: 2025-12-07
owners: ["product-owner"]
domains: ["api", "web", "ops"]
category: "prd"
related_docs:
  - docs/project_plans/initialization/prd.md
  - src/core/ports/index.ts
---

# PRD: MeatyCapture Server-Side Storage (v1)

## Overview

Add a lightweight REST API server that enables web browser clients to save and read request-log markdown files from the hosting server's filesystem. The server provides centralized storage accessible from anywhere, eliminating the isolation limitations of browser-local storage (IndexedDB/localStorage).

**Key principle**: Reuse existing port/adapter architecture. The server wraps existing filesystem adapters behind HTTP endpoints; web clients get new HTTP-based adapter implementations.

## Goals

- Enable web browser clients to access centralized filesystem storage
- Maintain architectural consistency with existing port/adapter pattern
- Support flexible deployment (local dev, Docker, NFS mounts, container volumes)
- Lightweight implementation using Bun's native HTTP server
- Zero-config defaults with environment variable overrides
- Drop-in replacement: same port interfaces, different transport

## Non-Goals (MVP)

- Complex authentication (OAuth, SAML, multi-factor)
- Multi-user support with user isolation
- Real-time sync or WebSocket-based updates
- Conflict resolution beyond last-write-wins
- Rate limiting or advanced API gateway features
- Database backend (file-first architecture preserved)

## Users / Personas

- **Personal user**: Access capture app from multiple devices/browsers without desktop client
- **Homelab operator**: Run server in Docker/k8s with persistent volumes
- **Team member**: Share centralized storage location (auth optional for trusted networks)
- **AI Agent**: Make HTTP requests to capture items programmatically

## User Stories (MVP)

1. As a user, I can configure the web app to use server-side storage by setting `MEATYCAPTURE_API_URL` environment variable.
2. As a user, I can run the Bun server locally and have it read/write to my configured default path.
3. As a DevOps engineer, I can deploy the server in a Docker container with mounted volumes for persistent storage.
4. As a user, I can perform all existing operations (create projects, manage fields, create/append docs) through the web app connected to server storage.
5. As a developer, I can switch between browser-local and server storage by changing one environment variable.
6. As an admin, I can optionally enable simple bearer token authentication for the API.

## Architecture Overview

### Current State (Before)

```
Platform Environments:
┌─────────────────────┐  ┌──────────────────────┐  ┌─────────────────────┐
│   Tauri Desktop     │  │   Web Browser        │  │   Node.js CLI       │
│                     │  │                      │  │                     │
│  UI Layer           │  │  UI Layer            │  │  CLI Layer          │
│       ↓             │  │       ↓              │  │       ↓             │
│  Core Logic         │  │  Core Logic          │  │  Core Logic         │
│       ↓             │  │       ↓              │  │       ↓             │
│  TauriAdapters      │  │  BrowserAdapters     │  │  FsAdapters         │
│  (Tauri FS API)     │  │  (IndexedDB/LS)      │  │  (Node fs)          │
│       ↓             │  │       ↓              │  │       ↓             │
│  Local Filesystem   │  │  Browser Storage     │  │  Local Filesystem   │
└─────────────────────┘  └──────────────────────┘  └─────────────────────┘
```

**Problem**: Web browser storage is isolated per-device. No centralized access.

### Target State (After)

```
┌────────────────────────────────────────────────────────────┐
│                     Web Browser                            │
│                                                            │
│  UI Layer                                                  │
│       ↓                                                    │
│  Core Logic                                                │
│       ↓                                                    │
│  Platform Detection: MEATYCAPTURE_API_URL set?            │
│       ↓                                                    │
│  ┌─────────────────┬──────────────────────┐               │
│  │ Yes: ApiAdapters│ No: BrowserAdapters  │               │
│  │  (HTTP client)  │  (IndexedDB/LS)      │               │
│  └────────┬────────┴──────────────────────┘               │
│           │                                                │
└───────────┼────────────────────────────────────────────────┘
            │
            │ HTTPS/HTTP
            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Bun REST API Server                        │
│                                                             │
│  HTTP Router (Bun.serve)                                    │
│       ↓                                                     │
│  Endpoint Handlers                                          │
│       ↓                                                     │
│  Existing FsDocStore, LocalProjectStore, LocalFieldStore    │
│       ↓                                                     │
│  Node.js fs / Filesystem                                    │
│       ↓                                                     │
│  Local Disk / NFS / Container Volume                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Points**:
- Server reuses `FsDocStore`, `LocalProjectStore`, `LocalFieldCatalogStore` from `src/adapters/fs-local` and `src/adapters/config-local`
- Web client gets new `ApiDocStore`, `ApiProjectStore`, `ApiFieldCatalogStore` in `src/adapters/api-client`
- Platform factory detects `MEATYCAPTURE_API_URL` to choose adapter implementation
- Same port interfaces, different transport layer

## Functional Requirements

### Server Component

| ID | Requirement | Priority |
|----|-------------|----------|
| SRV-01 | Server implemented using Bun's native HTTP server (`Bun.serve`) | P0 |
| SRV-02 | Server runs on configurable port (env: `MEATYCAPTURE_SERVER_PORT`, default: 3737) | P0 |
| SRV-03 | Server base path configurable (env: `MEATYCAPTURE_BASE_PATH`, default: `~/.meatycapture`) | P0 |
| SRV-04 | Server enables CORS for cross-origin web app access | P0 |
| SRV-05 | Configurable CORS origins (env: `MEATYCAPTURE_CORS_ORIGINS`, default: `*` for MVP) | P1 |
| SRV-06 | Optional bearer token authentication (env: `MEATYCAPTURE_API_TOKEN`) | P2 |
| SRV-07 | Structured logging with request/response logging (JSON format) | P1 |
| SRV-08 | Health check endpoint: `GET /health` returns 200 OK with version info | P0 |
| SRV-09 | Graceful shutdown on SIGTERM/SIGINT | P1 |

### API Endpoints

All endpoints return JSON. Error responses follow format: `{ error: string, details?: any }`

#### DocStore Endpoints

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/api/docs/list` | List docs in directory | Query: `directory` | `DocMeta[]` |
| GET | `/api/docs/read` | Read document | Query: `path` | `RequestLogDoc` |
| POST | `/api/docs/write` | Write document | `{ path: string, doc: RequestLogDoc }` | `{ success: true }` |
| POST | `/api/docs/append` | Append item to doc | `{ path: string, item: ItemDraft }` | `RequestLogDoc` |
| POST | `/api/docs/backup` | Create backup | `{ path: string }` | `{ backupPath: string }` |
| GET | `/api/docs/writable` | Check if path writable | Query: `path` | `{ writable: boolean }` |

#### ProjectStore Endpoints

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/api/projects` | List all projects | - | `Project[]` |
| GET | `/api/projects/:id` | Get project by ID | - | `Project \| null` |
| POST | `/api/projects` | Create project | `Omit<Project, 'id' \| 'created_at' \| 'updated_at'>` | `Project` |
| PATCH | `/api/projects/:id` | Update project | `Partial<Project>` | `Project` |
| DELETE | `/api/projects/:id` | Delete project | - | `{ success: true }` |

#### FieldCatalogStore Endpoints

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/api/fields/global` | Get global options | - | `FieldOption[]` |
| GET | `/api/fields/project/:projectId` | Get project options | - | `FieldOption[]` |
| GET | `/api/fields/by-field/:field` | Get by field name | Query: `projectId?` | `FieldOption[]` |
| POST | `/api/fields` | Add field option | `Omit<FieldOption, 'id' \| 'created_at'>` | `FieldOption` |
| DELETE | `/api/fields/:id` | Remove field option | - | `{ success: true }` |

### Client Component

| ID | Requirement | Priority |
|----|-------------|----------|
| CLI-01 | Implement `ApiDocStore` class in `src/adapters/api-client/` implementing `DocStore` interface | P0 |
| CLI-02 | Implement `ApiProjectStore` class implementing `ProjectStore` interface | P0 |
| CLI-03 | Implement `ApiFieldCatalogStore` class implementing `FieldCatalogStore` interface | P0 |
| CLI-04 | All API adapters accept `baseURL` and optional `authToken` in constructor | P0 |
| CLI-05 | API adapters use `fetch()` for HTTP requests (browser-native) | P0 |
| CLI-06 | Handle network errors gracefully with user-friendly messages | P0 |
| CLI-07 | Include auth token in `Authorization: Bearer <token>` header when configured | P1 |
| CLI-08 | Implement request retry logic with exponential backoff (max 3 retries) | P2 |

### Platform Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| PLT-01 | Update `createDocStore()` to check for `MEATYCAPTURE_API_URL` env var | P0 |
| PLT-02 | Update `createProjectStore()` to check for `MEATYCAPTURE_API_URL` env var | P0 |
| PLT-03 | Update `createFieldCatalogStore()` to check for `MEATYCAPTURE_API_URL` env var | P0 |
| PLT-04 | Factories read `MEATYCAPTURE_API_TOKEN` from env if API URL is set | P1 |
| PLT-05 | Selection order: API URL → Tauri → Browser storage | P0 |
| PLT-06 | Clear error message if API URL set but server unreachable | P0 |

### Docker / Deployment

| ID | Requirement | Priority |
|----|-------------|----------|
| DEP-01 | Provide `Dockerfile` using official Bun base image | P0 |
| DEP-02 | Dockerfile exposes port 3737 by default | P0 |
| DEP-03 | Support volume mount for storage path (e.g., `/data`) | P0 |
| DEP-04 | Provide `docker-compose.yml` example with volume and env vars | P0 |
| DEP-05 | Document deployment to common platforms (Docker, k8s, systemd) | P1 |
| DEP-06 | Health check endpoint compatible with container orchestration | P1 |

## Data Model

No new models required. All existing models from `@core/models` are used:
- `Project`
- `FieldOption`
- `ItemDraft`
- `RequestLogDoc`
- `DocMeta`

Port interfaces remain unchanged (see `src/core/ports/index.ts`).

## API Contract

### Error Response Format

```typescript
interface ApiError {
  error: string;          // Human-readable error message
  details?: any;          // Optional additional context
  code?: string;          // Optional error code (e.g., 'PATH_NOT_WRITABLE')
}
```

### HTTP Status Codes

| Status | Usage |
|--------|-------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST for new resources) |
| 204 | Success with no content (DELETE) |
| 400 | Bad request (validation error, missing params) |
| 401 | Unauthorized (missing or invalid token) |
| 404 | Resource not found |
| 500 | Internal server error |

### Authentication Flow

When `MEATYCAPTURE_API_TOKEN` is set on server:
1. Server validates `Authorization: Bearer <token>` header on all `/api/*` requests
2. Missing or invalid token → 401 response
3. Health endpoint `/health` remains unauthenticated

When token not set: All endpoints are public (trust network security).

## Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| Performance | API response time (local network) | < 100ms p95 |
| Performance | Document write operation | < 500ms |
| Reliability | Server uptime in steady state | > 99% |
| Scalability | Concurrent requests supported | 10+ (MVP, single-user focused) |
| Security | HTTPS support via reverse proxy | Recommended for production |
| Security | Bearer token minimum length | 32 characters |
| Observability | Structured logging (JSON) | All requests logged |
| Observability | Health endpoint includes version | `{ status: 'ok', version: string }` |
| Compatibility | Bun version | >= 1.0.0 |
| Compatibility | Node.js fs compatibility | Use standard APIs for portability |

## User Experience

### Configuration (Web Client)

**Environment Variables** (injected at build or runtime):
```bash
# Enable server storage mode
VITE_MEATYCAPTURE_API_URL=http://localhost:3737

# Optional: API authentication
VITE_MEATYCAPTURE_API_TOKEN=your-secret-token-here
```

**Runtime Detection**:
- If `VITE_MEATYCAPTURE_API_URL` is set → use API adapters
- Otherwise → use browser storage adapters (IndexedDB)
- Show storage mode indicator in UI footer: "Storage: Browser Local" vs "Storage: Server (connected)"

### Configuration (Server)

**Environment Variables**:
```bash
# Server listening port
MEATYCAPTURE_SERVER_PORT=3737

# Base storage path (supports ~/ expansion)
MEATYCAPTURE_BASE_PATH=~/.meatycapture

# CORS allowed origins (comma-separated, or *)
MEATYCAPTURE_CORS_ORIGINS=http://localhost:5173,https://app.example.com

# Optional: Bearer token for API authentication
MEATYCAPTURE_API_TOKEN=your-secret-token-here

# Optional: Log level (debug, info, warn, error)
MEATYCAPTURE_LOG_LEVEL=info
```

**Startup**:
```bash
# Local development
bun run src/server/index.ts

# Docker
docker run -p 3737:3737 \
  -v /path/to/storage:/data \
  -e MEATYCAPTURE_BASE_PATH=/data \
  meatycapture-server
```

### Error Handling

| Scenario | Client Behavior | Server Behavior |
|----------|----------------|-----------------|
| Server unreachable | Show error banner: "Cannot connect to storage server" with retry button | N/A |
| Invalid token | Show error: "Authentication failed. Check API token configuration." | Return 401 with `{ error: "Invalid or missing token" }` |
| Path not writable | Inline error in UI (same as current behavior) | Return 400 with `{ error: "Path not writable", code: "PATH_NOT_WRITABLE" }` |
| File parse error | Show warning with backup option (same as current) | Return 500 with parse error details |
| Network timeout | Retry up to 3 times, then show error | Log timeout in server logs |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API endpoint coverage | 100% of port interfaces mapped | Code review |
| Integration test pass rate | 100% | CI/CD pipeline |
| Server startup time | < 2 seconds | Manual testing |
| Web app works with both storage modes | 100% feature parity | QA testing |
| Docker image size | < 150 MB | Docker inspect |
| API response time (local) | < 100ms p95 | Load testing |
| Documentation completeness | Setup + deployment guide exists | Doc review |

## Constraints / Risks / Dependencies

### Constraints

- Must maintain 100% compatibility with existing port interfaces
- Server must remain lightweight (no heavy frameworks like Express/Fastify in MVP)
- No breaking changes to existing Tauri or browser-storage code paths

### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CORS misconfiguration blocks web app | High | Medium | Provide clear setup docs; default to `*` in dev mode |
| Network latency degrades UX compared to local storage | Medium | Low | Optimize for LAN deployment; add loading states in UI |
| Concurrent writes cause data corruption | High | Low | Document last-write-wins behavior; backup before write |
| Bun compatibility issues in production | Medium | Low | Test on target platforms; provide Node.js fallback option if needed |
| Path traversal security vulnerability | High | Medium | Validate paths server-side; restrict to base path only |

### Dependencies

- Bun runtime (>= 1.0.0)
- Existing adapters: `FsDocStore`, `LocalProjectStore`, `LocalFieldCatalogStore`
- Web client: `fetch()` API (all modern browsers)
- Docker (optional, for containerized deployment)

## Implementation Phases

### Phase 1: Server Core (Week 1)
- Set up Bun HTTP server with routing
- Implement DocStore endpoints
- Implement ProjectStore endpoints
- Implement FieldCatalogStore endpoints
- Add CORS middleware
- Health endpoint

**Deliverable**: Working server accepting HTTP requests, responding with mock data

### Phase 2: Client Adapters (Week 1)
- Implement `ApiDocStore` with `fetch()` calls
- Implement `ApiProjectStore`
- Implement `ApiFieldCatalogStore`
- Error handling and retry logic
- Update platform factories

**Deliverable**: Web app can connect to server and perform CRUD operations

### Phase 3: Authentication & Security (Week 2)
- Bearer token authentication middleware
- Path validation and sanitization
- Security audit of endpoints
- Rate limiting (optional)

**Deliverable**: Secure server with optional token auth

### Phase 4: Deployment (Week 2)
- Create Dockerfile
- docker-compose.yml example
- Kubernetes manifest examples
- Deployment documentation
- Systemd service file

**Deliverable**: Production-ready deployment artifacts

### Phase 5: Testing & Documentation (Week 2-3)
- Integration tests for all endpoints
- E2E tests with web client
- Load testing
- API documentation (OpenAPI spec)
- Setup and deployment guides

**Deliverable**: Fully tested and documented feature

## Testing Strategy

### Unit Tests

| Component | Test Coverage |
|-----------|---------------|
| API endpoint handlers | 100% - all CRUD paths, error cases |
| HTTP client adapters | 100% - success, errors, retries |
| Platform factory selection | 100% - API URL detection logic |
| Authentication middleware | 100% - valid/invalid tokens |
| Path validation | 100% - safe paths, traversal attempts |

### Integration Tests

| Scenario | Description |
|----------|-------------|
| Server CRUD operations | Full lifecycle: create project → add item → append → read |
| Client-server round trip | Web client → HTTP → Server → Filesystem → Response |
| Concurrent requests | Multiple clients writing to different docs |
| Error propagation | Server errors correctly surface in client UI |
| CORS headers | Pre-flight requests handled correctly |

### End-to-End Tests

| Flow | Description |
|------|-------------|
| Web app with server storage | Complete wizard flow using API adapters |
| Storage mode switching | Change env var, restart, verify correct adapter used |
| Docker deployment | Build image, run container, connect web app |
| Token authentication | Server with token, client with/without token |

### Performance Tests

| Test | Target |
|------|--------|
| API latency (local network) | < 100ms p95 |
| Document write throughput | 10+ writes/second |
| Concurrent connections | 10 simultaneous clients |
| Large document handling | 1000+ item docs under 2s response time |

## Documentation Requirements

| Document | Audience | Content |
|----------|----------|---------|
| `docs/setup/server-storage.md` | Developers | Architecture overview, setup instructions, env vars |
| `docs/deployment/docker.md` | DevOps | Docker setup, volume mounts, networking |
| `docs/deployment/kubernetes.md` | DevOps | k8s deployment manifest, ingress, persistent volumes |
| `docs/api/rest-api.md` | Developers | OpenAPI spec, endpoint documentation, examples |
| `README.md` update | All users | Add server storage mode to main features list |
| `CHANGELOG.md` entry | All users | Feature announcement, migration notes |

## Acceptance Criteria

### Server Component

- [ ] Bun server starts and listens on configurable port
- [ ] All 16 API endpoints implemented and functional
- [ ] CORS headers included in all responses
- [ ] Health endpoint returns 200 with version info
- [ ] Optional bearer token authentication works
- [ ] Graceful shutdown on signals
- [ ] Structured JSON logging for all requests
- [ ] Path traversal attacks prevented

### Client Component

- [ ] `ApiDocStore` implements all `DocStore` methods
- [ ] `ApiProjectStore` implements all `ProjectStore` methods
- [ ] `ApiFieldCatalogStore` implements all `FieldCatalogStore` methods
- [ ] Platform factories detect `MEATYCAPTURE_API_URL` correctly
- [ ] Network errors shown with user-friendly messages
- [ ] Auth token sent in headers when configured
- [ ] Retry logic handles transient failures

### Integration

- [ ] Web app wizard flow works end-to-end with server storage
- [ ] Create new project via web app writes to server filesystem
- [ ] Append item to doc updates file on disk
- [ ] Tag aggregation works correctly through HTTP layer
- [ ] Switching between browser and server storage modes works
- [ ] No breaking changes to existing Tauri or browser storage code

### Deployment

- [ ] Dockerfile builds successfully
- [ ] Docker container starts and serves requests
- [ ] Volume mounts persist data correctly
- [ ] docker-compose example works out of box
- [ ] Health check endpoint works with container orchestration

### Documentation

- [ ] Setup guide covers local dev and Docker deployment
- [ ] API documentation includes all endpoints with examples
- [ ] Security best practices documented (HTTPS, tokens)
- [ ] Migration guide from browser storage to server storage

## Open Questions

1. **Rate limiting**: Should MVP include basic rate limiting, or defer to reverse proxy?
   - **Recommendation**: Defer to reverse proxy (nginx, Traefik) for MVP

2. **File locking**: How to handle concurrent writes to same doc from multiple clients?
   - **Recommendation**: Document last-write-wins behavior; add optimistic locking in v2

3. **Backup strategy**: Should server auto-backup before write, or rely on volume snapshots?
   - **Recommendation**: Reuse existing `backup()` method before writes; encourage volume snapshots

4. **WebSocket support**: Should we add real-time updates for collaborative editing?
   - **Recommendation**: Out of scope for MVP; HTTP polling or SSE in future if needed

5. **Multi-tenancy**: How to support multiple users with isolated storage?
   - **Recommendation**: Out of scope for MVP; single-user/team shared storage model

## Assumptions

- Server runs in trusted network (LAN, VPN) or behind HTTPS reverse proxy
- Storage filesystem supports POSIX semantics (local disk, NFS)
- Web app deployment and server deployment can use different env var mechanisms
- Single-user or small team usage (< 10 concurrent users)
- Network latency < 50ms for good UX (LAN deployment)

## Appendix

### Environment Variable Summary

| Variable | Component | Default | Description |
|----------|-----------|---------|-------------|
| `VITE_MEATYCAPTURE_API_URL` | Web client | (none) | Base URL for API server |
| `VITE_MEATYCAPTURE_API_TOKEN` | Web client | (none) | Bearer token for auth |
| `MEATYCAPTURE_SERVER_PORT` | Server | 3737 | HTTP listening port |
| `MEATYCAPTURE_BASE_PATH` | Server | `~/.meatycapture` | Storage root directory |
| `MEATYCAPTURE_CORS_ORIGINS` | Server | `*` | Allowed CORS origins |
| `MEATYCAPTURE_API_TOKEN` | Server | (none) | Required bearer token |
| `MEATYCAPTURE_LOG_LEVEL` | Server | info | Logging verbosity |

### File Structure (New)

```
src/
├── server/
│   ├── index.ts              # Server entry point
│   ├── routes/
│   │   ├── docs.ts           # DocStore endpoints
│   │   ├── projects.ts       # ProjectStore endpoints
│   │   ├── fields.ts         # FieldCatalogStore endpoints
│   │   └── health.ts         # Health check endpoint
│   ├── middleware/
│   │   ├── cors.ts           # CORS middleware
│   │   ├── auth.ts           # Bearer token auth
│   │   └── logger.ts         # Request logging
│   ├── utils/
│   │   ├── config.ts         # Env var loading
│   │   └── errors.ts         # Error formatting
│   └── types.ts              # Server-specific types
├── adapters/
│   └── api-client/
│       ├── index.ts          # Factory exports
│       ├── api-doc-store.ts  # HTTP DocStore impl
│       ├── api-project-store.ts
│       ├── api-field-catalog-store.ts
│       └── client.ts         # Shared fetch() wrapper
└── platform/
    └── index.ts              # Updated platform detection

docker/
├── Dockerfile
├── docker-compose.yml
└── .dockerignore

docs/
├── setup/
│   └── server-storage.md
├── deployment/
│   ├── docker.md
│   └── kubernetes.md
└── api/
    └── rest-api.md
```

### API Example: Append Item

**Request**:
```http
POST /api/docs/append HTTP/1.1
Host: localhost:3737
Content-Type: application/json
Authorization: Bearer abc123xyz

{
  "path": "/home/user/.meatycapture/projects/my-app/REQ-20251207-my-app.md",
  "item": {
    "title": "Add user authentication",
    "type": "enhancement",
    "domain": "api",
    "context": "backend",
    "priority": "p1",
    "status": "triage",
    "tags": ["auth", "security"],
    "notes": "Implement JWT-based authentication..."
  }
}
```

**Response**:
```json
{
  "doc_id": "REQ-20251207-my-app",
  "title": "My App Requests",
  "created": "2025-12-07T10:00:00Z",
  "updated": "2025-12-07T14:30:00Z",
  "item_count": 3,
  "tags": ["auth", "security", "ui", "api"],
  "items_index": [
    { "id": "REQ-20251207-my-app-01", "type": "bug" },
    { "id": "REQ-20251207-my-app-02", "type": "enhancement" },
    { "id": "REQ-20251207-my-app-03", "type": "enhancement" }
  ],
  "items": [...]
}
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  meatycapture-server:
    build: .
    ports:
      - "3737:3737"
    volumes:
      - ./storage:/data
    environment:
      - MEATYCAPTURE_BASE_PATH=/data
      - MEATYCAPTURE_CORS_ORIGINS=http://localhost:5173
      - MEATYCAPTURE_API_TOKEN=${API_TOKEN}
      - MEATYCAPTURE_LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3737/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

**File Path**: `/Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/PRDs/features/server-storage-v1.md`
