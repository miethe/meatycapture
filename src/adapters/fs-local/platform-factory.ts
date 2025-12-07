/**
 * Platform-aware DocStore Factory
 *
 * Automatically selects the correct filesystem adapter based on
 * the runtime environment (Tauri desktop vs web browser).
 *
 * @example
 * ```typescript
 * import { createDocStore } from '@adapters/fs-local/platform-factory';
 *
 * // Automatically uses TauriDocStore in desktop, FsDocStore in Node.js
 * const store = createDocStore();
 * ```
 */

import type { DocStore } from '@core/ports';
import { isTauri } from '@platform';
import { createTauriDocStore } from './tauri-fs-adapter';

/**
 * Creates a platform-appropriate DocStore instance.
 *
 * Selection logic:
 * - Tauri desktop: Use TauriDocStore (@tauri-apps/plugin-fs)
 * - Node.js/CLI: Throws error - import adapters directly from index module
 * - Web browser: Throws error (not supported - would need IndexedDB adapter)
 *
 * @returns DocStore implementation for current platform
 * @throws Error if running in Node.js CLI or unsupported browser environment
 */
export function createDocStore(): DocStore {
  // Tauri desktop environment
  if (isTauri()) {
    return createTauriDocStore();
  }

  // Node.js environment (CLI or server)
  // Check if we're in Node.js by looking for process.versions.node
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    throw new Error(
      'Node.js CLI environment detected. For CLI usage, import adapters directly from the index module. ' +
        'This platform factory is intended for browser/Tauri contexts only.'
    );
  }

  // Browser environment - not supported for file-based storage
  throw new Error(
    'File-based storage is not supported in web browsers. ' +
      'Use the Tauri desktop app or CLI for filesystem access.'
  );
}
