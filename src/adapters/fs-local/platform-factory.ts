/**
 * Platform-aware DocStore Factory
 *
 * Automatically selects the correct filesystem adapter based on
 * the runtime environment (API server, Tauri desktop, or web browser).
 *
 * @example
 * ```typescript
 * import { createDocStore } from '@adapters/fs-local/platform-factory';
 *
 * // Automatically uses ApiDocStore when API URL configured,
 * // TauriDocStore in desktop, or BrowserDocStore in browser
 * const store = createDocStore();
 * ```
 */

import type { DocStore } from '@core/ports';
import { detectAdapterMode } from '@platform';
import { HttpClient, ApiDocStore } from '@adapters/api-client';
import { createTauriDocStore } from './tauri-fs-adapter';
import { createBrowserDocStore } from '@adapters/browser-storage';

/**
 * Creates a platform-appropriate DocStore instance.
 *
 * Selection logic (by priority):
 * 1. API mode: MEATYCAPTURE_API_URL env var set → ApiDocStore (HTTP client)
 * 2. Local mode: Tauri desktop → TauriDocStore (@tauri-apps/plugin-fs)
 * 3. Browser mode: Web browser → BrowserDocStore (IndexedDB)
 *
 * API mode supports both browser and Node.js/Bun environments.
 *
 * @returns DocStore implementation for current platform
 */
export function createDocStore(): DocStore {
  const mode = detectAdapterMode();

  switch (mode) {
    case 'api': {
      // API mode: Use HTTP client to communicate with server
      // HttpClient auto-detects baseUrl from MEATYCAPTURE_API_URL env var
      const client = new HttpClient();
      return new ApiDocStore(client);
    }

    case 'local':
      // Local mode: Tauri desktop with direct filesystem access
      return createTauriDocStore();

    case 'browser':
    default:
      // Browser mode: Web browser with IndexedDB storage
      return createBrowserDocStore();
  }
}
