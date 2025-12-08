---
type: progress
prd: "server-storage"
phase: 4
phase_name: "Platform Integration"
status: pending
progress: 0
total_tasks: 2
completed_tasks: 0
duration_estimate: "2-3 days"
story_points: 5

tasks:
  - id: "TASK-SS-012"
    name: "Implement API Detection Logic"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-009", "TASK-SS-010", "TASK-SS-011"]
    estimate: 2
    files:
      - "src/platform/api-detection.ts"

  - id: "TASK-SS-013"
    name: "Update Platform Factories"
    status: "pending"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-012"]
    estimate: 3
    files:
      - "src/adapters/fs-local/platform-factory.ts"
      - "src/adapters/config-local/platform-factory.ts"

parallelization:
  batch_1: ["TASK-SS-012"]  # API detection first
  batch_2: ["TASK-SS-013"]  # Platform factory updates after detection ready
---

# Phase 4 Progress: Platform Integration

**Status**: Pending | **Last Updated**: 2025-12-07 | **Completion**: 0%

## Phase Overview

Update platform factories to detect and select API-based adapters when the API server is available. This enables the web app to automatically switch between local and API modes based on environment configuration.

**Key Deliverables**:
- API detection logic (checks MEATYCAPTURE_API_URL environment variable)
- Updated fs-local/platform-factory.ts for DocStore selection
- Updated config-local/platform-factory.ts for ProjectStore/FieldCatalogStore selection
- Runtime adapter selection based on environment
- Tests for adapter switching behavior

**Validation**: App uses local adapters by default, API adapters when URL configured

**Dependencies**: Phase 3 (HTTP Client Adapters) must be complete

## Tasks

### TASK-SS-012: Implement API Detection Logic
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create platform detection module that checks for API server availability.

**Acceptance Criteria**:
- [ ] Checks MEATYCAPTURE_API_URL environment variable
- [ ] Validates URL format
- [ ] Optionally pings /health endpoint to verify server
- [ ] Returns detection result: 'api' | 'local' | 'browser'
- [ ] Caches detection result for performance
- [ ] Logs detection decision

**Files**:
- `src/platform/api-detection.ts` (create)

**Dependencies**: TASK-SS-009, TASK-SS-010, TASK-SS-011 (API client adapters must exist)

**Priority**: HIGH - Complete before platform factory updates

**Implementation Pattern**:

```typescript
// src/platform/api-detection.ts
export type PlatformMode = 'api' | 'local' | 'browser';

export interface ApiDetectionConfig {
  apiUrl?: string;
  authToken?: string;
  verifyHealth?: boolean;  // Ping /health endpoint
  cacheResult?: boolean;
}

export class ApiDetection {
  private cachedResult?: PlatformMode;

  async detect(config?: ApiDetectionConfig): Promise<PlatformMode> {
    // Check cache
    if (this.cachedResult && config?.cacheResult !== false) {
      return this.cachedResult;
    }

    // Check environment variable
    const apiUrl = config?.apiUrl || process.env.MEATYCAPTURE_API_URL;

    if (!apiUrl) {
      const mode = this.detectLocalOrBrowser();
      this.cachedResult = mode;
      console.log(`[ApiDetection] Mode: ${mode} (no API URL configured)`);
      return mode;
    }

    // Validate URL format
    if (!this.isValidUrl(apiUrl)) {
      console.warn(`[ApiDetection] Invalid API URL: ${apiUrl}, falling back to local`);
      return this.detectLocalOrBrowser();
    }

    // Optional: Verify server is reachable
    if (config?.verifyHealth) {
      const reachable = await this.pingHealth(apiUrl, config.authToken);
      if (!reachable) {
        console.warn(`[ApiDetection] API server unreachable: ${apiUrl}, falling back to local`);
        return this.detectLocalOrBrowser();
      }
    }

    this.cachedResult = 'api';
    console.log(`[ApiDetection] Mode: api (${apiUrl})`);
    return 'api';
  }

  private detectLocalOrBrowser(): PlatformMode {
    // Detect if running in browser vs Node.js/Tauri
    return typeof window !== 'undefined' ? 'browser' : 'local';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async pingHealth(apiUrl: string, authToken?: string): Promise<boolean> {
    try {
      const response = await fetch(`${apiUrl}/health`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        signal: AbortSignal.timeout(5000),  // 5s timeout
      });
      return response.ok;
    } catch (error) {
      console.debug(`[ApiDetection] Health check failed:`, error);
      return false;
    }
  }

  clearCache(): void {
    this.cachedResult = undefined;
  }
}

// Singleton instance
export const apiDetection = new ApiDetection();
```

---

### TASK-SS-013: Update Platform Factories
**Status**: Pending | **Estimate**: 3 points | **Assigned**: backend-typescript-architect

**Description**: Update existing platform factories to use API adapters when detected.

**Acceptance Criteria**:
- [ ] fs-local/platform-factory.ts uses ApiDocStore when API detected
- [ ] config-local/platform-factory.ts uses Api stores when API detected
- [ ] Falls back to local/browser adapters when API not available
- [ ] Includes runtime switching tests
- [ ] Preserves existing factory behavior as default

**Files**:
- `src/adapters/fs-local/platform-factory.ts` (update)
- `src/adapters/config-local/platform-factory.ts` (update)

**Dependencies**: TASK-SS-012 (API Detection Logic)

**Implementation Pattern**:

```typescript
// src/adapters/fs-local/platform-factory.ts
import { DocStore } from '../../core/ports/doc-store';
import { FsDocStore } from './fs-doc-store';
import { BrowserDocStore } from './browser-doc-store';
import { ApiDocStore } from '../api-client/api-doc-store';
import { apiDetection } from '../../platform/api-detection';

export async function createDocStore(config?: {
  dataDir?: string;
  forceMode?: 'api' | 'local' | 'browser';
}): Promise<DocStore> {
  const mode = config?.forceMode || await apiDetection.detect();

  switch (mode) {
    case 'api':
      console.log('[PlatformFactory] Using ApiDocStore');
      return new ApiDocStore({
        baseUrl: process.env.MEATYCAPTURE_API_URL!,
        authToken: process.env.MEATYCAPTURE_AUTH_TOKEN,
      });

    case 'local':
      console.log('[PlatformFactory] Using FsDocStore');
      return new FsDocStore(config?.dataDir);

    case 'browser':
      console.log('[PlatformFactory] Using BrowserDocStore');
      return new BrowserDocStore();

    default:
      throw new Error(`Unknown platform mode: ${mode}`);
  }
}
```

```typescript
// src/adapters/config-local/platform-factory.ts
import { ProjectStore } from '../../core/ports/project-store';
import { FieldCatalogStore } from '../../core/ports/field-catalog-store';
import { LocalProjectStore } from './local-project-store';
import { LocalFieldCatalogStore } from './local-field-catalog-store';
import { ApiProjectStore, ApiFieldCatalogStore } from '../api-client/api-config-stores';
import { apiDetection } from '../../platform/api-detection';

export async function createProjectStore(config?: {
  configDir?: string;
  forceMode?: 'api' | 'local' | 'browser';
}): Promise<ProjectStore> {
  const mode = config?.forceMode || await apiDetection.detect();

  switch (mode) {
    case 'api':
      console.log('[PlatformFactory] Using ApiProjectStore');
      return new ApiProjectStore({
        baseUrl: process.env.MEATYCAPTURE_API_URL!,
        authToken: process.env.MEATYCAPTURE_AUTH_TOKEN,
      });

    case 'local':
    case 'browser':
      console.log('[PlatformFactory] Using LocalProjectStore');
      return new LocalProjectStore(config?.configDir);

    default:
      throw new Error(`Unknown platform mode: ${mode}`);
  }
}

export async function createFieldCatalogStore(config?: {
  configDir?: string;
  forceMode?: 'api' | 'local' | 'browser';
}): Promise<FieldCatalogStore> {
  const mode = config?.forceMode || await apiDetection.detect();

  switch (mode) {
    case 'api':
      console.log('[PlatformFactory] Using ApiFieldCatalogStore');
      return new ApiFieldCatalogStore({
        baseUrl: process.env.MEATYCAPTURE_API_URL!,
        authToken: process.env.MEATYCAPTURE_AUTH_TOKEN,
      });

    case 'local':
    case 'browser':
      console.log('[PlatformFactory] Using LocalFieldCatalogStore');
      return new LocalFieldCatalogStore(config?.configDir);

    default:
      throw new Error(`Unknown platform mode: ${mode}`);
  }
}
```

---

## Completed Tasks

None yet.

---

## In Progress

None yet.

---

## Blocked

None. Waiting for Phase 3 completion.

---

## Next Actions

1. **Complete Phase 3 first** (HTTP Client Adapters)
2. Start with TASK-SS-012 (API Detection Logic) - foundation for factory updates
3. Once detection ready, implement TASK-SS-013 (Platform Factory Updates)
4. Test adapter switching with different environment configurations
5. Verify fallback behavior when API unavailable

---

## Implementation Notes

### Environment Configuration Examples

```bash
# Local mode (no API server)
# No env vars set - uses FsDocStore, LocalProjectStore, LocalFieldCatalogStore

# API mode (with server)
export MEATYCAPTURE_API_URL="http://localhost:3001"
export MEATYCAPTURE_AUTH_TOKEN="dev-token-123"
# Uses ApiDocStore, ApiProjectStore, ApiFieldCatalogStore

# Force mode (for testing)
# Can override detection with forceMode config parameter
const store = await createDocStore({ forceMode: 'local' });
```

### Detection Flow

```
1. Check forceMode config parameter
   ↓ If not set
2. Check cachedResult (performance optimization)
   ↓ If not cached
3. Check MEATYCAPTURE_API_URL env var
   ↓ If not set
4. Detect local vs browser (typeof window)
   ↓ If API URL set
5. Validate URL format
   ↓ If valid
6. Optional: Ping /health endpoint
   ↓ If reachable or health check skipped
7. Return 'api' mode
   ↓ Otherwise
8. Fallback to local/browser mode
```

### Testing Strategy

```typescript
// Test API detection
describe('ApiDetection', () => {
  it('returns "local" when no API URL configured', async () => {
    delete process.env.MEATYCAPTURE_API_URL;
    const mode = await apiDetection.detect();
    expect(mode).toBe('local');
  });

  it('returns "api" when API URL configured', async () => {
    process.env.MEATYCAPTURE_API_URL = 'http://localhost:3001';
    const mode = await apiDetection.detect();
    expect(mode).toBe('api');
  });

  it('validates URL format', async () => {
    process.env.MEATYCAPTURE_API_URL = 'invalid-url';
    const mode = await apiDetection.detect();
    expect(mode).toBe('local'); // Falls back
  });

  it('caches detection result', async () => {
    process.env.MEATYCAPTURE_API_URL = 'http://localhost:3001';
    const mode1 = await apiDetection.detect({ cacheResult: true });
    delete process.env.MEATYCAPTURE_API_URL;
    const mode2 = await apiDetection.detect({ cacheResult: true });
    expect(mode2).toBe(mode1); // Still 'api' from cache
  });
});

// Test platform factory switching
describe('Platform Factories', () => {
  it('creates ApiDocStore when API URL configured', async () => {
    process.env.MEATYCAPTURE_API_URL = 'http://localhost:3001';
    const store = await createDocStore();
    expect(store).toBeInstanceOf(ApiDocStore);
  });

  it('creates FsDocStore when API URL not configured', async () => {
    delete process.env.MEATYCAPTURE_API_URL;
    const store = await createDocStore();
    expect(store).toBeInstanceOf(FsDocStore);
  });

  it('respects forceMode override', async () => {
    process.env.MEATYCAPTURE_API_URL = 'http://localhost:3001';
    const store = await createDocStore({ forceMode: 'local' });
    expect(store).toBeInstanceOf(FsDocStore); // Forced to local
  });
});
```

---

## Testing Checklist

### API Detection (TASK-SS-012)
- [ ] Returns 'local' when no API URL configured
- [ ] Returns 'api' when API URL configured
- [ ] Validates URL format (rejects invalid URLs)
- [ ] Optional health check pings /health endpoint
- [ ] Health check timeout after 5s
- [ ] Falls back on unreachable server (if health check enabled)
- [ ] Caches detection result
- [ ] clearCache() resets cached result
- [ ] Logs detection decisions

### Platform Factory Updates (TASK-SS-013)
- [ ] fs-local factory creates ApiDocStore when API mode
- [ ] fs-local factory creates FsDocStore when local mode
- [ ] fs-local factory creates BrowserDocStore when browser mode
- [ ] config-local factory creates ApiProjectStore when API mode
- [ ] config-local factory creates ApiFieldCatalogStore when API mode
- [ ] config-local factory creates Local stores when local/browser mode
- [ ] forceMode override works
- [ ] Logs factory selection decisions
- [ ] Preserves existing factory behavior (backward compatible)

### Integration Testing
- [ ] App uses local adapters when MEATYCAPTURE_API_URL not set
- [ ] App uses API adapters when MEATYCAPTURE_API_URL set
- [ ] App falls back to local when API URL invalid
- [ ] App falls back to local when API server unreachable (if health check enabled)
- [ ] Adapter switching doesn't break existing functionality
- [ ] All existing tests still pass
- [ ] forceMode testing override works

---

## Orchestration Quick Reference

### Run Detection First, Then Factory Updates

```typescript
// Step 1: API Detection Logic (must complete first)
Task("backend-typescript-architect", `
Implement TASK-SS-012: API Detection Logic

Create src/platform/api-detection.ts:
- Check MEATYCAPTURE_API_URL environment variable
- Validate URL format (new URL())
- Optional: Ping /health endpoint to verify server (5s timeout)
- Return detection result: 'api' | 'local' | 'browser'
- Cache detection result for performance
- Log detection decision
- Singleton instance: apiDetection

Class: ApiDetection with detect() method
Config: { apiUrl?, authToken?, verifyHealth?, cacheResult? }

Detection flow:
1. Check cache (if cacheResult enabled)
2. Check MEATYCAPTURE_API_URL env var
3. If not set → detect local vs browser (typeof window)
4. If set → validate URL format
5. If valid and verifyHealth → ping /health
6. Return 'api' if reachable, else fallback to local/browser

Reference: Phase 4, Task SS-012 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
Implementation pattern in phase-4-progress.md
`);

// Step 2: Platform Factory Updates (after detection ready)
Task("backend-typescript-architect", `
Implement TASK-SS-013: Update Platform Factories

Update both platform factories to use API adapters when detected:

1. src/adapters/fs-local/platform-factory.ts
   - Import ApiDocStore from api-client
   - Import apiDetection from platform
   - Update createDocStore() to detect mode
   - Return ApiDocStore when mode === 'api'
   - Return FsDocStore when mode === 'local'
   - Return BrowserDocStore when mode === 'browser'
   - Support forceMode override
   - Log factory selection

2. src/adapters/config-local/platform-factory.ts
   - Import ApiProjectStore, ApiFieldCatalogStore from api-client
   - Import apiDetection from platform
   - Update createProjectStore() to detect mode
   - Update createFieldCatalogStore() to detect mode
   - Return API stores when mode === 'api'
   - Return Local stores when mode === 'local' or 'browser'
   - Support forceMode override
   - Log factory selection

Both factories:
- Use await apiDetection.detect() to get mode
- Pass API URL and auth token to API adapters
- Preserve existing behavior (backward compatible)
- Support forceMode for testing

Include tests for adapter switching behavior.

Reference: Phase 4, Task SS-013 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
Implementation pattern in phase-4-progress.md
`);
```

### Run Individual Tasks

```typescript
// TASK-SS-012 (run first)
Task("backend-typescript-architect", `
Implement TASK-SS-012: API Detection Logic

Create platform detection module with API URL checking, URL validation,
optional health check, caching, and logging.

See orchestration command above.
`);

// TASK-SS-013
Task("backend-typescript-architect", `
Implement TASK-SS-013: Update Platform Factories

Update fs-local and config-local platform factories to use API adapters
when API mode detected. Support forceMode override.

See orchestration command above.
`);
```

### Validation Task

```typescript
Task("task-completion-validator", `
Validate Phase 4 completion for server-storage feature.

Check all acceptance criteria:
1. TASK-SS-012: API detection works, validates URLs, caches results, logs decisions
2. TASK-SS-013: Both factories updated, adapter switching works, tests pass

Test:
- API detection returns correct mode based on env vars
- URL validation works (rejects invalid URLs)
- Health check pings /health endpoint (if enabled)
- Health check falls back on timeout/failure
- Caching works (detection result reused)
- fs-local factory creates correct DocStore based on mode
- config-local factory creates correct stores based on mode
- forceMode override works
- Logging shows factory selections

Integration test:
- Start with no MEATYCAPTURE_API_URL → local adapters
- Set MEATYCAPTURE_API_URL → API adapters
- Set invalid URL → falls back to local
- Start server, verify health check succeeds
- Stop server, verify fallback to local (if health check enabled)

Ensure backward compatibility:
- All existing tests pass
- Default behavior preserved (local mode)
- No breaking changes to factory APIs

Update: /Users/miethe/dev/homelab/development/meatycapture/.claude/progress/server-storage/phase-4-progress.md
`);
```

---

## Context for AI Agents

When working on this phase:

1. **Complete Phase 3 first**: API client adapters must exist
2. **Start with detection**: TASK-SS-012 is foundation (batch_1 → batch_2)
3. **URL validation**: Use `new URL()` to validate format
4. **Health check optional**: Make verifyHealth configurable (false by default for performance)
5. **Cache for performance**: Detection can be expensive (health check), cache result
6. **Fallback gracefully**: Always have a fallback mode (local/browser)
7. **Log decisions**: Help developers debug adapter selection
8. **Backward compatible**: Preserve existing factory behavior (default to local)
9. **forceMode for testing**: Allow override for unit tests
10. **Integration testing**: Test with real server (start/stop scenarios)

Key patterns:
- Singleton detection instance
- Async factory functions
- Environment variable configuration
- Graceful fallback
- Clear logging
- Backward compatibility

Next phase (Phase 5) handles deployment with Docker.
