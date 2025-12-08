---
type: progress
prd: "server-storage"
phase: 3
phase_name: "HTTP Client Adapters"
status: pending
progress: 0
total_tasks: 3
completed_tasks: 0
duration_estimate: "3-5 days"
story_points: 8

tasks:
  - id: "TASK-SS-009"
    name: "Implement Shared HTTP Client"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-005", "TASK-SS-006", "TASK-SS-007"]
    estimate: 3
    files:
      - "src/adapters/api-client/http-client.ts"
      - "src/adapters/api-client/types.ts"

  - id: "TASK-SS-010"
    name: "Implement ApiDocStore"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-009"]
    estimate: 2
    files:
      - "src/adapters/api-client/api-doc-store.ts"
      - "src/adapters/api-client/api-doc-store.test.ts"

  - id: "TASK-SS-011"
    name: "Implement ApiProjectStore and ApiFieldCatalogStore"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-009"]
    estimate: 3
    files:
      - "src/adapters/api-client/api-config-stores.ts"
      - "src/adapters/api-client/api-config-stores.test.ts"
      - "src/adapters/api-client/index.ts"

parallelization:
  batch_1: ["TASK-SS-009"]  # HTTP client first
  batch_2: ["TASK-SS-010", "TASK-SS-011"]  # Both adapter implementations in parallel
---

# Phase 3 Progress: HTTP Client Adapters

**Status**: Pending | **Last Updated**: 2025-12-07 | **Completion**: 0%

## Phase Overview

Create browser-compatible adapter implementations using fetch API. These adapters implement the same port interfaces (DocStore, ProjectStore, FieldCatalogStore) but communicate with the REST API server instead of accessing the filesystem directly.

**Key Deliverables**:
- Shared HTTP client with retry, timeout, error handling
- ApiDocStore implementing DocStore interface
- ApiProjectStore implementing ProjectStore interface
- ApiFieldCatalogStore implementing FieldCatalogStore interface
- Network error mapping to adapter-style errors
- Integration tests with mocked server

**Validation**: Client adapters pass existing port interface tests (mocked server)

**Dependencies**: Phase 2 (API Route Handlers) must be complete

## Tasks

### TASK-SS-009: Implement Shared HTTP Client
**Status**: Pending | **Estimate**: 3 points | **Assigned**: backend-typescript-architect

**Description**: Create shared fetch wrapper with error handling, retry, and timeout logic. This is the foundation for all API client adapters.

**Acceptance Criteria**:
- [ ] Uses fetch API for HTTP requests
- [ ] Configurable base URL from MEATYCAPTURE_API_URL
- [ ] Timeout support (default 30s)
- [ ] Retry logic for network failures (3 attempts)
- [ ] Bearer token auth header injection
- [ ] Maps HTTP status codes to errors
- [ ] Serializes/deserializes Date objects
- [ ] TypeScript generic type support

**Files**:
- `src/adapters/api-client/http-client.ts` (create)
- `src/adapters/api-client/types.ts` (create)

**Dependencies**: TASK-SS-005, TASK-SS-006, TASK-SS-007 (API routes must exist)

**Priority**: HIGH - Complete before adapter implementations

**Implementation Pattern**:

```typescript
// Example usage
const client = new HttpClient({
  baseUrl: process.env.MEATYCAPTURE_API_URL,
  authToken: process.env.MEATYCAPTURE_AUTH_TOKEN,
  timeout: 30000,
  retries: 3,
});

// Type-safe requests
const docs = await client.get<DocMeta[]>('/api/docs', { project_id: 'foo' });
const doc = await client.post<RequestLogDoc>('/api/docs/REQ-123', body);
```

---

### TASK-SS-010: Implement ApiDocStore
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create HTTP-based DocStore implementation using the shared HTTP client.

**Acceptance Criteria**:
- [ ] Implements DocStore interface
- [ ] Calls corresponding /api/docs endpoints
- [ ] Handles Clock parameter in append() correctly
- [ ] Maps network errors to DocStore-style errors
- [ ] Deserializes Date objects in responses
- [ ] Includes integration tests with mock server

**Files**:
- `src/adapters/api-client/api-doc-store.ts` (create)
- `src/adapters/api-client/api-doc-store.test.ts` (create)

**Dependencies**: TASK-SS-009 (Shared HTTP Client)

**Interface Compliance**:

```typescript
// Must implement all DocStore methods
interface DocStore {
  list(projectId: string): Promise<DocMeta[]>;
  read(docId: string): Promise<RequestLogDoc>;
  write(docId: string, doc: RequestLogDoc): Promise<void>;
  append(docId: string, item: ItemDraft, clock?: Clock): Promise<RequestLogDoc>;
  backup(docId: string): Promise<string>;
  isWritable(docId: string): Promise<boolean>;
}
```

**Error Mapping**:

```typescript
// Map HTTP errors to DocStore errors
404 → DocumentNotFoundError
403 → PermissionDeniedError
409 → ConcurrentModificationError
500 → StorageError
Network failure → NetworkError
```

---

### TASK-SS-011: Implement ApiProjectStore and ApiFieldCatalogStore
**Status**: Pending | **Estimate**: 3 points | **Assigned**: backend-typescript-architect

**Description**: Create HTTP-based ProjectStore and FieldCatalogStore implementations using the shared HTTP client.

**Acceptance Criteria**:
- [ ] ApiProjectStore implements ProjectStore interface
- [ ] ApiFieldCatalogStore implements FieldCatalogStore interface
- [ ] Call corresponding /api/projects and /api/fields endpoints
- [ ] Map network errors appropriately
- [ ] Deserialize Date objects correctly
- [ ] Include integration tests with mock server

**Files**:
- `src/adapters/api-client/api-config-stores.ts` (create)
- `src/adapters/api-client/api-config-stores.test.ts` (create)
- `src/adapters/api-client/index.ts` (create barrel exports)

**Dependencies**: TASK-SS-009 (Shared HTTP Client)

**Interface Compliance**:

```typescript
// ApiProjectStore must implement
interface ProjectStore {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | undefined>;
  create(project: Omit<Project, 'id' | 'created' | 'updated'>): Promise<Project>;
  update(id: string, updates: Partial<Project>): Promise<Project>;
  delete(id: string): Promise<void>;
}

// ApiFieldCatalogStore must implement
interface FieldCatalogStore {
  getGlobal(): Promise<FieldOption[]>;
  getForProject(projectId: string): Promise<FieldOption[]>;
  getByField(field: string, projectId?: string): Promise<FieldOption[]>;
  addOption(option: Omit<FieldOption, 'id' | 'created'>): Promise<FieldOption>;
  removeOption(id: string): Promise<void>;
}
```

**Barrel Exports** (index.ts):

```typescript
export { HttpClient } from './http-client';
export { ApiDocStore } from './api-doc-store';
export { ApiProjectStore, ApiFieldCatalogStore } from './api-config-stores';
export type * from './types';
```

---

## Completed Tasks

None yet.

---

## In Progress

None yet.

---

## Blocked

None. Waiting for Phase 2 completion.

---

## Next Actions

1. **Complete Phase 2 first** (API Route Handlers)
2. Start with TASK-SS-009 (Shared HTTP Client) - foundation for all adapters
3. Once HTTP client ready, run TASK-SS-010 and TASK-SS-011 in parallel
4. Test each adapter against mocked server responses
5. Integration test all adapters against real server (local)

---

## Implementation Notes

### HTTP Client Pattern

```typescript
// src/adapters/api-client/http-client.ts
export class HttpClient {
  private baseUrl: string;
  private authToken?: string;
  private timeout: number;
  private retries: number;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl || process.env.MEATYCAPTURE_API_URL || '';
    this.authToken = config.authToken || process.env.MEATYCAPTURE_AUTH_TOKEN;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
  }

  async get<T>(path: string, query?: Record<string, any>): Promise<T> {
    // Build URL with query params
    // Add auth header
    // Fetch with timeout
    // Retry on network failure
    // Deserialize Date objects
    // Map HTTP errors
  }

  async post<T>(path: string, body?: any): Promise<T> { /* ... */ }
  async patch<T>(path: string, body?: any): Promise<T> { /* ... */ }
  async delete<T>(path: string): Promise<T> { /* ... */ }
  async head(path: string): Promise<boolean> { /* ... */ }
}
```

### Date Deserialization Pattern

```typescript
// Deserialize ISO date strings to Date objects
function deserializeDates(obj: any): any {
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
    return new Date(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeDates);
  }
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, deserializeDates(v)])
    );
  }
  return obj;
}
```

### Retry Logic Pattern

```typescript
async function fetchWithRetry(url: string, options: RequestInit, retries: number): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return response; // Success or client error (don't retry)
      }
      // Server error, retry
      if (i < retries - 1) {
        await sleep(1000 * (i + 1)); // Exponential backoff
      }
    } catch (error) {
      // Network error, retry
      if (i < retries - 1) {
        await sleep(1000 * (i + 1));
      } else {
        throw new NetworkError('Failed to connect to API server', { cause: error });
      }
    }
  }
  throw new NetworkError('Max retries exceeded');
}
```

### Error Mapping Pattern

```typescript
function mapHttpError(status: number, body: any): Error {
  const message = body?.message || body?.error || 'Unknown error';

  switch (status) {
    case 400:
      return new ValidationError(message);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new PermissionDeniedError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 500:
      return new StorageError(message);
    default:
      return new ApiError(`HTTP ${status}: ${message}`);
  }
}
```

---

## Testing Checklist

### Shared HTTP Client (TASK-SS-009)
- [ ] GET/POST/PATCH/DELETE/HEAD methods work
- [ ] Query parameters serialized correctly
- [ ] Auth header injected when token configured
- [ ] Timeout works (AbortController)
- [ ] Retry logic works for network failures
- [ ] Retry logic skips client errors (4xx)
- [ ] Date deserialization works
- [ ] HTTP errors mapped to typed errors
- [ ] TypeScript generics work
- [ ] Base URL configuration works

### ApiDocStore (TASK-SS-010)
- [ ] Implements all DocStore methods
- [ ] list() calls GET /api/docs with project_id
- [ ] read() calls GET /api/docs/:doc_id
- [ ] write() calls POST /api/docs/:doc_id with body
- [ ] append() calls PATCH /api/docs/:doc_id/items with item
- [ ] backup() calls POST /api/docs/:doc_id/backup
- [ ] isWritable() calls HEAD /api/docs/:doc_id
- [ ] Clock parameter handled in append()
- [ ] Date deserialization works
- [ ] Error mapping works (404, 403, 500)
- [ ] Integration tests with mock server pass

### ApiProjectStore and ApiFieldCatalogStore (TASK-SS-011)
- [ ] ApiProjectStore implements all ProjectStore methods
- [ ] ApiFieldCatalogStore implements all FieldCatalogStore methods
- [ ] All endpoints called correctly
- [ ] Date deserialization works
- [ ] Error mapping works
- [ ] Integration tests with mock server pass
- [ ] Barrel exports (index.ts) include all adapters

### Integration Testing
- [ ] All adapters work against real server (local)
- [ ] Network failures handled gracefully
- [ ] Auth token validation works
- [ ] CORS doesn't block requests
- [ ] Large documents (100+ items) work
- [ ] Concurrent requests work
- [ ] Server restart recovers gracefully

---

## Orchestration Quick Reference

### Run HTTP Client First, Then Adapters in Parallel

```typescript
// Step 1: Shared HTTP Client (must complete first)
Task("backend-typescript-architect", `
Implement TASK-SS-009: Shared HTTP Client

Create src/adapters/api-client/http-client.ts and types.ts:
- Use fetch API for HTTP requests
- Configurable base URL from MEATYCAPTURE_API_URL env var
- Timeout support (default 30s) using AbortController
- Retry logic for network failures (3 attempts, exponential backoff)
- Bearer token auth header injection from MEATYCAPTURE_AUTH_TOKEN
- Map HTTP status codes to typed errors (400→ValidationError, 404→NotFoundError, etc.)
- Serialize/deserialize Date objects (ISO strings ↔ Date)
- TypeScript generic type support for responses

Methods: get<T>, post<T>, patch<T>, delete<T>, head

Reference: Phase 3, Task SS-009 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
Implementation patterns in phase-3-progress.md
`);

// Step 2: Both adapters in parallel (after HTTP client complete)
Task("backend-typescript-architect", `
Implement Phase 3 API Client Adapters (TASK-SS-010, TASK-SS-011)

Complete both adapter implementations in parallel:

1. TASK-SS-010: ApiDocStore (src/adapters/api-client/api-doc-store.ts)
   - Implement DocStore interface
   - list() → GET /api/docs?project_id={id}
   - read() → GET /api/docs/:doc_id
   - write() → POST /api/docs/:doc_id
   - append() → PATCH /api/docs/:doc_id/items
   - backup() → POST /api/docs/:doc_id/backup
   - isWritable() → HEAD /api/docs/:doc_id
   - Handle Clock parameter in append()
   - Map HTTP errors to DocStore errors
   - Deserialize Date objects
   - Integration tests with mock server

2. TASK-SS-011: API Config Stores (src/adapters/api-client/api-config-stores.ts)
   - ApiProjectStore implements ProjectStore interface
   - ApiFieldCatalogStore implements FieldCatalogStore interface
   - Call corresponding /api/projects and /api/fields endpoints
   - Map HTTP errors appropriately
   - Deserialize Date objects
   - Integration tests with mock server
   - Create barrel exports in index.ts

Both adapters:
- Use shared HTTP client from TASK-SS-009
- Follow error mapping pattern
- Follow Date deserialization pattern
- Include comprehensive tests

Reference: Phase 3, Tasks SS-010 and SS-011 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
`);
```

### Run Individual Tasks

```typescript
// TASK-SS-009 (run first)
Task("backend-typescript-architect", `
Implement TASK-SS-009: Shared HTTP Client

Create HTTP client with fetch wrapper, retry, timeout, error handling.
See orchestration command above.
`);

// TASK-SS-010
Task("backend-typescript-architect", `
Implement TASK-SS-010: ApiDocStore

Create src/adapters/api-client/api-doc-store.ts implementing DocStore interface.
Use shared HTTP client, call /api/docs endpoints, handle Dates and errors.

Reference: Phase 3, Task SS-010 in implementation plan
`);

// TASK-SS-011
Task("backend-typescript-architect", `
Implement TASK-SS-011: ApiProjectStore and ApiFieldCatalogStore

Create src/adapters/api-client/api-config-stores.ts with both implementations.
Create barrel exports in index.ts. Include integration tests.

Reference: Phase 3, Task SS-011 in implementation plan
`);
```

### Validation Task

```typescript
Task("task-completion-validator", `
Validate Phase 3 completion for server-storage feature.

Check all acceptance criteria:
1. TASK-SS-009: HTTP client works, retry/timeout/auth/Date handling correct
2. TASK-SS-010: ApiDocStore implements all methods, tests pass
3. TASK-SS-011: Both config stores implement interfaces, tests pass

Test:
- All adapters implement correct port interfaces
- HTTP client methods work (GET/POST/PATCH/DELETE/HEAD)
- Retry logic works for network failures
- Timeout works (AbortController)
- Auth header injected correctly
- Date serialization/deserialization works
- Error mapping correct (400, 404, 403, 409, 500)
- Integration tests with mock server pass
- Barrel exports complete

Integration test against real server:
- Start server from Phase 2
- Test all adapters perform CRUD operations
- Verify network error handling
- Verify auth token validation
- Verify CORS headers don't block

Update: /Users/miethe/dev/homelab/development/meatycapture/.claude/progress/server-storage/phase-3-progress.md
`);
```

---

## Context for AI Agents

When working on this phase:

1. **Complete Phase 2 first**: API routes must exist and be tested
2. **Start with HTTP client**: TASK-SS-009 is foundation (batch_1 → batch_2)
3. **Implement port interfaces**: Adapters must match existing port interfaces exactly
4. **Use fetch API**: Browser-compatible, no axios/node-fetch
5. **Retry on network errors**: 3 attempts with exponential backoff
6. **Don't retry client errors**: 4xx errors are final (no retry)
7. **Date handling**: Deserialize ISO strings to Date objects
8. **Error mapping**: Map HTTP status codes to adapter-specific errors
9. **Mock server testing**: Use MSW or similar for integration tests
10. **Real server testing**: Test against actual server in local dev

Key patterns:
- Shared HTTP client (DRY)
- Consistent error mapping
- Date serialization/deserialization
- Retry with exponential backoff
- Auth header injection
- TypeScript generics for type safety

Next phase (Phase 4) integrates these adapters into platform factories for auto-detection.
