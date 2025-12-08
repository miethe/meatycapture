/**
 * Platform-aware Config Store Factory
 *
 * Automatically selects the correct configuration adapter based on
 * the runtime environment (API server, Tauri desktop, or web browser).
 *
 * @example
 * ```typescript
 * import { createProjectStore, createFieldCatalogStore } from '@adapters/config-local/platform-factory';
 *
 * // Automatically uses API stores when API URL configured,
 * // Tauri stores in desktop, or Browser stores in web
 * const projectStore = createProjectStore();
 * const fieldStore = createFieldCatalogStore();
 * ```
 */

import type { ProjectStore, FieldCatalogStore } from '@core/ports';
import { detectAdapterMode } from '@platform';
import { HttpClient, ApiProjectStore, ApiFieldCatalogStore } from '@adapters/api-client';
import { createTauriProjectStore, createTauriFieldCatalogStore } from './tauri-config-adapter';
import { createBrowserProjectStore, createBrowserFieldCatalogStore } from '@adapters/browser-storage';

/**
 * Creates a platform-appropriate ProjectStore instance.
 *
 * Selection logic (by priority):
 * 1. API mode: MEATYCAPTURE_API_URL env var set → ApiProjectStore (HTTP client)
 * 2. Local mode: Tauri desktop → TauriProjectStore (@tauri-apps/plugin-fs)
 * 3. Browser mode: Web browser → BrowserProjectStore (IndexedDB)
 *
 * API mode supports both browser and Node.js/Bun environments.
 *
 * @returns ProjectStore implementation for current platform
 */
export function createProjectStore(): ProjectStore {
  const mode = detectAdapterMode();

  switch (mode) {
    case 'api': {
      // API mode: Use HTTP client to communicate with server
      // HttpClient auto-detects baseUrl from MEATYCAPTURE_API_URL env var
      const client = new HttpClient();
      return new ApiProjectStore(client);
    }

    case 'local':
      // Local mode: Tauri desktop with direct filesystem access
      return createTauriProjectStore();

    case 'browser':
    default:
      // Browser mode: Web browser with IndexedDB storage
      return createBrowserProjectStore();
  }
}

/**
 * Creates a platform-appropriate FieldCatalogStore instance.
 *
 * Selection logic (by priority):
 * 1. API mode: MEATYCAPTURE_API_URL env var set → ApiFieldCatalogStore (HTTP client)
 * 2. Local mode: Tauri desktop → TauriFieldCatalogStore (@tauri-apps/plugin-fs)
 * 3. Browser mode: Web browser → BrowserFieldCatalogStore (IndexedDB)
 *
 * API mode supports both browser and Node.js/Bun environments.
 *
 * @returns FieldCatalogStore implementation for current platform
 */
export function createFieldCatalogStore(): FieldCatalogStore {
  const mode = detectAdapterMode();

  switch (mode) {
    case 'api': {
      // API mode: Use HTTP client to communicate with server
      // HttpClient auto-detects baseUrl from MEATYCAPTURE_API_URL env var
      const client = new HttpClient();
      return new ApiFieldCatalogStore(client);
    }

    case 'local':
      // Local mode: Tauri desktop with direct filesystem access
      return createTauriFieldCatalogStore();

    case 'browser':
    default:
      // Browser mode: Web browser with IndexedDB storage
      return createBrowserFieldCatalogStore();
  }
}
