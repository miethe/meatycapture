# Server-Side Storage (v1) - Implementation Context

## PRD Reference

**Implementation Plan**: `/Users/miethe/dev/homelab/development/meatycapture/docs/project_plans/implementation_plans/features/server-storage-v1.md`

**Complexity**: Medium (M) | **Timeline**: 2-3 Weeks | **Story Points**: 26

## Executive Summary

Transform MeatyCapture from local-only to client-server architecture by adding a lightweight Bun-based REST API server. The server exposes existing adapter implementations via REST API, enabling the web app to save/read files from server filesystem.

**Key Pattern**: Maximally reuse existing adapters - server wraps them with HTTP, client implements port interfaces via HTTP calls.

## Architectural Decisions

### Core Architecture Pattern

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

### Technology Choices

| Decision | Technology | Rationale |
|----------|-----------|-----------|
| **Runtime** | Bun | Fast startup, built-in HTTP server, TypeScript support |
| **API Style** | REST | Simple, well-understood, minimal overhead |
| **Auth** | Bearer token (stub) | Simple for v1, extensible for future multi-user |
| **Deployment** | Docker + docker-compose | Easy self-hosting, volume persistence |

### Layer Compliance

1. **Core Layer**: No changes (reuses existing ports and models)
2. **Adapter Layer**: Adds new API client adapters alongside existing adapters
3. **Server Layer**: New layer wrapping existing adapters with HTTP
4. **Platform Layer**: Enhanced with API detection logic

### Design Principles Followed

- **Headless Core**: Server has no UI dependencies
- **File-First**: Server uses same file-based storage as local mode
- **No Over-Architecture**: Simple REST API, no GraphQL/gRPC complexity
- **Delegate Everything**: Reuses existing adapters, minimal new code

## Environment Variables

### Server Configuration

```bash
# Server runtime
export PORT="3001"                                    # Server port (default: 3001)
export MEATYCAPTURE_DATA_DIR="~/.meatycapture"       # Data directory
export CORS_ORIGINS="http://localhost:5173,http://localhost:3000"  # Allowed origins
export MEATYCAPTURE_AUTH_TOKEN="dev-token-123"       # Bearer token (optional)
export NODE_ENV="development"                         # Environment mode

# Production example
export PORT="3001"
export MEATYCAPTURE_DATA_DIR="/mnt/nfs/meatycapture"
export CORS_ORIGINS="https://app.example.com"
export MEATYCAPTURE_AUTH_TOKEN="$(cat /run/secrets/auth_token)"
export NODE_ENV="production"
```

### Client Configuration

```bash
# Web app
export MEATYCAPTURE_API_URL="http://localhost:3001"  # API server URL
export MEATYCAPTURE_AUTH_TOKEN="dev-token-123"       # Bearer token (must match server)

# If not set, app uses local adapters (browser filesystem API)
```

## Quick File Reference

### Server Files (New)

```
src/server/
├── index.ts                           # Entry point, Bun.serve
├── middleware/
│   ├── cors.ts                        # CORS handling
│   ├── auth.ts                        # Bearer token validation
│   ├── error-handler.ts               # Centralized error responses
│   └── validation.ts                  # Request schema validation
├── routes/
│   ├── docs.ts                        # DocStore endpoints
│   ├── projects.ts                    # ProjectStore endpoints
│   └── fields.ts                      # FieldCatalogStore endpoints
└── schemas/
    └── [validation schemas]           # Request validation schemas
```

### Client Adapters (New)

```
src/adapters/api-client/
├── http-client.ts                     # Shared fetch wrapper
├── api-doc-store.ts                   # HTTP-based DocStore
├── api-config-stores.ts               # HTTP-based Project/Field stores
├── types.ts                           # Shared API types
└── index.ts                           # Barrel exports
```

### Platform Integration (Modified)

```
src/platform/
├── api-detection.ts                   # NEW: Detect API vs local mode
src/adapters/
├── fs-local/platform-factory.ts       # MODIFIED: API adapter selection
└── config-local/platform-factory.ts   # MODIFIED: API adapter selection
```

### Deployment (New)

```
Dockerfile                             # Bun server container
docker-compose.yml                     # Local deployment stack
.env.example                           # Environment variable template
docs/deployment/server-mode.md         # Deployment guide
```

## API Endpoint Quick Reference

### DocStore Endpoints

- `GET /api/docs?project_id={id}` - List documents
- `GET /api/docs/:doc_id` - Read document
- `POST /api/docs/:doc_id` - Write document (body: RequestLogDoc)
- `PATCH /api/docs/:doc_id/items` - Append item (body: ItemDraft)
- `POST /api/docs/:doc_id/backup` - Create backup
- `HEAD /api/docs/:doc_id` - Check writability

### ProjectStore Endpoints

- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create project (body: Omit<Project, 'id'...>)
- `PATCH /api/projects/:id` - Update project (body: Partial<Project>)
- `DELETE /api/projects/:id` - Delete project

### FieldCatalogStore Endpoints

- `GET /api/fields/global` - Get global options
- `GET /api/fields/project/:id` - Get project options
- `GET /api/fields/by-field/:field?project_id={id}` - Get by field
- `POST /api/fields` - Add option (body: Omit<FieldOption, 'id'...>)
- `DELETE /api/fields/:id` - Remove option

## Key Implementation Challenges

### 1. CORS Configuration

**Challenge**: Cross-origin requests from web app to server
**Solution**: Comprehensive CORS middleware with configurable origins
**Testing**: Test with multiple origins, preflight requests

### 2. Date Serialization

**Challenge**: JSON doesn't support Date objects natively
**Solution**: Centralized serialization utilities in HTTP client
**Testing**: Round-trip Date serialization in all endpoints

### 3. Network Timeout Handling

**Challenge**: Network failures, slow responses
**Solution**: Configurable timeouts, retry logic (3 attempts), clear error messages
**Testing**: Simulate network failures, slow endpoints

### 4. File System Permissions

**Challenge**: Docker volume permissions, server access to data directory
**Solution**: Health check validates permissions, clear error messages
**Testing**: Test with various permission configurations

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

## Success Criteria

- [ ] Server exposes all DocStore, ProjectStore, FieldCatalogStore operations via REST
- [ ] Web app can use HTTP adapters transparently (same port interfaces)
- [ ] Platform factory auto-detects and selects appropriate adapter implementation
- [ ] Docker deployment runs server with persistent volume
- [ ] All existing tests pass with new adapters (via integration tests)
- [ ] Error handling includes network failures and timeout scenarios

## Risk Mitigation

### High Priority Risks

1. **CORS Configuration Issues**
   - **Mitigation**: Comprehensive testing, clear documentation, permissive dev defaults

2. **Date Serialization Bugs**
   - **Mitigation**: Centralized utilities, thorough integration tests, JSON date format validation

3. **Network Timeout Handling**
   - **Mitigation**: Configurable timeouts, retry logic, clear error messages

4. **File System Permission Errors**
   - **Mitigation**: Docker volume guidance, health check validation, clear errors

## Future Enhancements (Out of Scope)

- WebSocket support for real-time updates
- Multi-user authentication with user accounts
- Optimistic locking for concurrent edit detection
- Server-side search and filtering
- GraphQL API alternative
- Metrics and observability endpoints
- Rate limiting and abuse prevention

## Context for AI Agents

When continuing work on this feature:

1. **Check phase progress files** for current status
2. **Follow port/adapter pattern** - server wraps adapters, client implements ports
3. **Reuse existing code** - don't duplicate adapter logic
4. **Use Bun runtime** for server (not Node.js)
5. **Test with real adapters** in integration tests (use temp directories)
6. **Document all env vars** in .env.example
7. **Follow error handling patterns** from existing adapters

## Related Documentation

- **Prime Directives**: `/Users/miethe/dev/homelab/development/meatycapture/CLAUDE.md`
- **Architecture Overview**: See CLAUDE.md "Architecture Overview" section
- **Port/Adapter Pattern**: See CLAUDE.md "Key Patterns" section
- **Agent Delegation**: See CLAUDE.md "Agent Delegation" table
