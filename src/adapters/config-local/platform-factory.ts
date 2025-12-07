/**
 * Platform-aware Config Store Factory
 *
 * Automatically selects the correct configuration adapter based on
 * the runtime environment (Tauri desktop vs Node.js vs web browser).
 *
 * @example
 * ```typescript
 * import { createProjectStore, createFieldCatalogStore } from '@adapters/config-local/platform-factory';
 *
 * // Automatically uses TauriConfigAdapter in desktop, LocalConfigAdapter in Node.js
 * const projectStore = createProjectStore();
 * const fieldStore = createFieldCatalogStore();
 * ```
 */

import type { ProjectStore, FieldCatalogStore } from '@core/ports';
import { isTauri } from '@platform';
import { createTauriProjectStore, createTauriFieldCatalogStore } from './tauri-config-adapter';

/**
 * Creates a platform-appropriate ProjectStore instance.
 *
 * Selection logic:
 * - Tauri desktop: Use TauriProjectStore (@tauri-apps/plugin-fs)
 * - Node.js/CLI: Throws error - import adapters directly from index module
 * - Web browser: Throws error (not supported - file-based config requires filesystem access)
 *
 * @returns ProjectStore implementation for current platform
 * @throws Error if running in Node.js CLI or unsupported browser environment
 */
export function createProjectStore(): ProjectStore {
  // Tauri desktop environment
  if (isTauri()) {
    return createTauriProjectStore();
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
    'File-based configuration is not supported in web browsers. ' +
      'Use the Tauri desktop app or CLI for filesystem access.'
  );
}

/**
 * Creates a platform-appropriate FieldCatalogStore instance.
 *
 * Selection logic:
 * - Tauri desktop: Use TauriFieldCatalogStore (@tauri-apps/plugin-fs)
 * - Node.js/CLI: Throws error - import adapters directly from index module
 * - Web browser: Throws error (not supported - file-based config requires filesystem access)
 *
 * @returns FieldCatalogStore implementation for current platform
 * @throws Error if running in Node.js CLI or unsupported browser environment
 */
export function createFieldCatalogStore(): FieldCatalogStore {
  // Tauri desktop environment
  if (isTauri()) {
    return createTauriFieldCatalogStore();
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
    'File-based configuration is not supported in web browsers. ' +
      'Use the Tauri desktop app or CLI for filesystem access.'
  );
}
