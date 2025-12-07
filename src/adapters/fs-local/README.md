# Filesystem Adapters

This directory contains platform-aware filesystem implementations for MeatyCapture.

## Adapters

### FsDocStore (`index.ts`)
Node.js filesystem implementation using `node:fs`.

**Use case:** CLI and server-side environments

```typescript
import { createFsDocStore } from '@adapters/fs-local';

const store = createFsDocStore();
const docs = await store.list('/Users/you/projects/app');
```

### TauriDocStore (`tauri-fs-adapter.ts`)
Tauri desktop implementation using `@tauri-apps/plugin-fs`.

**Use case:** Desktop application (macOS, Windows, Linux)

```typescript
import { createTauriDocStore } from '@adapters/fs-local/tauri-fs-adapter';

const store = createTauriDocStore();
const docs = await store.list('~/meatycapture/projects/app');
```

### Platform Factory (`platform-factory.ts`)
Automatic adapter selection based on runtime environment.

**Use case:** Shared code that runs in multiple environments

```typescript
import { createDocStore } from '@adapters/fs-local/platform-factory';

// Automatically selects:
// - TauriDocStore in Tauri desktop
// - FsDocStore in Node.js/CLI
// - Throws error in web browser
const store = createDocStore();
```

## Feature Comparison

| Feature | FsDocStore | TauriDocStore | Web Browser |
|---------|-----------|---------------|-------------|
| Read files | ✅ Yes | ✅ Yes | ❌ No |
| Write files | ✅ Yes | ✅ Yes | ❌ No |
| Full FS access | ✅ Yes | ✅ Yes (scoped) | ❌ No |
| Path expansion | ❌ No | ⚠️ Partial | ❌ No |
| Async operations | ✅ Yes | ✅ Yes | - |
| Environment | Node.js | Tauri | Browser |

## Usage in Components

### React Components (Tauri or Web)

```typescript
import { createDocStore } from '@adapters/fs-local/platform-factory';
import { isTauri } from '@platform';

function MyComponent() {
  const store = useMemo(() => {
    if (!isTauri()) {
      // Show message or provide alternative UI
      return null;
    }
    return createDocStore();
  }, []);

  if (!store) {
    return <div>Desktop app required for file access</div>;
  }

  // Use store...
}
```

### CLI Scripts (Node.js)

```typescript
import { createFsDocStore } from '@adapters/fs-local';

async function main() {
  const store = createFsDocStore();
  const docs = await store.list(process.argv[2]);
  console.log(`Found ${docs.length} documents`);
}

main();
```

## Security Considerations

### Tauri File System Scope

Tauri enforces file system access restrictions via `tauri.conf.json`:

```json
{
  "plugins": {
    "fs": {
      "scope": {
        "allow": ["$HOME/**"],
        "deny": []
      }
    }
  }
}
```

**Current configuration:**
- ✅ Allow: Entire home directory and subdirectories
- ❌ Deny: None (intentionally permissive for MeatyCapture's use case)

**Production apps should:**
1. Use more restrictive scoping (e.g., `$HOME/meatycapture/**`)
2. Deny sensitive directories (`$HOME/.ssh/**`, `$HOME/.aws/**`)
3. Use file picker dialogs instead of arbitrary path access

### Node.js (No Restrictions)

FsDocStore has full filesystem access with no sandboxing.
Validate all user-provided paths to prevent directory traversal attacks.

## Testing

Both adapters implement the same `DocStore` interface, making them easily testable:

```typescript
import { describe, it, expect } from 'vitest';
import { createFsDocStore } from '@adapters/fs-local';

describe('FsDocStore', () => {
  it('should list documents', async () => {
    const store = createFsDocStore();
    const docs = await store.list('/tmp/test-docs');
    expect(docs).toBeInstanceOf(Array);
  });
});
```

For Tauri tests, mock the `@tauri-apps/plugin-fs` module:

```typescript
vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  readDir: vi.fn(),
  exists: vi.fn(),
}));
```

## Future Enhancements

### IndexedDB Adapter (Browser)
For web-based usage without file system access:

```typescript
class IndexedDbDocStore implements DocStore {
  // Store documents in browser's IndexedDB
  // Export/import via File API
}
```

### Remote Adapter (API)
For cloud storage integration:

```typescript
class RemoteDocStore implements DocStore {
  // Sync with remote API
  // Cache locally for offline access
}
```

### Hybrid Adapter (Online/Offline)
Combines local and remote storage:

```typescript
class HybridDocStore implements DocStore {
  // Local-first with background sync
  // Conflict resolution
}
```
