/**
 * Adapter Factory
 *
 * Creates storage adapters based on detected mode (api/local).
 * Uses MEATYCAPTURE_API_URL env var or config file api_url setting.
 *
 * Mode Detection Priority:
 * 1. MEATYCAPTURE_API_URL environment variable (highest priority)
 * 2. api_url in persistent config file
 * 3. Default to local filesystem adapters
 *
 * This factory provides a single point of adapter creation that respects
 * both environment configuration and persistent user settings.
 *
 * @example
 * ```typescript
 * import { createAdapters, createConfigStore } from '@adapters/factory';
 *
 * // Get adapters based on current configuration
 * const adapters = await createAdapters();
 * if (adapters.mode === 'api') {
 *   console.log('Using API mode with server:', process.env.MEATYCAPTURE_API_URL);
 * }
 *
 * // Use the adapters
 * const projects = await adapters.projectStore.list();
 * const fields = await adapters.fieldStore.getGlobal();
 * const docs = await adapters.docStore.list('/path/to/docs');
 * ```
 */

import { HttpClient } from './api-client/http-client.js';
import { ApiProjectStore, ApiFieldCatalogStore } from './api-client/api-config-stores.js';
import { ApiDocStore } from './api-client/api-doc-store.js';
import {
  createProjectStore as createLocalProjectStore,
  createFieldCatalogStore as createLocalFieldCatalogStore,
  createConfigStore as createLocalConfigStore,
} from './config-local/index.js';
import { createFsDocStore } from './fs-local/index.js';
import type { ProjectStore, FieldCatalogStore, ConfigStore, DocStore } from '@core/ports';

/**
 * Adapter collection with mode indicator
 *
 * Provides all necessary storage adapters for the application,
 * along with a mode flag indicating which implementation is active.
 */
export interface Adapters {
  /** Project storage adapter (API or local) */
  projectStore: ProjectStore;
  /** Field catalog storage adapter (API or local) */
  fieldStore: FieldCatalogStore;
  /** Document storage adapter (API or local) */
  docStore: DocStore;
  /** Active adapter mode ('api' or 'local') */
  mode: 'api' | 'local';
}

/**
 * Gets API URL from environment variable
 *
 * Checks both process.env (Node/Bun) and import.meta.env (Vite)
 * for maximum runtime compatibility.
 *
 * @returns API URL if MEATYCAPTURE_API_URL is set, undefined otherwise
 */
function getApiUrlFromEnv(): string | undefined {
  // Check process.env first (Node/Bun/CLI)
  if (typeof process !== 'undefined' && process.env?.MEATYCAPTURE_API_URL) {
    return process.env.MEATYCAPTURE_API_URL;
  }

  // Check import.meta.env (Vite browser builds)
  if (typeof import.meta !== 'undefined' && import.meta.env?.MEATYCAPTURE_API_URL) {
    return import.meta.env.MEATYCAPTURE_API_URL as string;
  }

  return undefined;
}

/**
 * Gets API URL from persistent config or environment variable
 *
 * Priority order:
 * 1. MEATYCAPTURE_API_URL environment variable (highest priority)
 * 2. api_url in config.json file
 * 3. undefined (no API URL configured)
 *
 * The environment variable takes precedence to allow temporary overrides
 * without modifying the persistent configuration file.
 *
 * @returns API URL string if configured, undefined otherwise
 */
async function getApiUrl(): Promise<string | undefined> {
  // Priority 1: Environment variable takes precedence
  const envUrl = getApiUrlFromEnv();
  if (envUrl) {
    return envUrl;
  }

  // Priority 2: Check persistent config file
  try {
    const configStore = createLocalConfigStore();
    const config = await configStore.get();
    return config.api_url;
  } catch {
    // Config file doesn't exist or can't be read - not an error
    // Just means no API URL is configured yet
    return undefined;
  }
}

/**
 * Creates storage adapters based on configuration
 *
 * Detects whether to use API or local adapters by checking for api_url
 * configuration. If an API URL is found (either in env var or config file),
 * returns HTTP-based adapters. Otherwise, returns local filesystem adapters.
 *
 * This function is async because it needs to read the config file to check
 * for a persistent api_url setting.
 *
 * @returns Adapter collection with mode indicator
 *
 * @example
 * ```typescript
 * // With MEATYCAPTURE_API_URL=http://localhost:3737
 * const adapters = await createAdapters();
 * console.log(adapters.mode); // 'api'
 *
 * // Without MEATYCAPTURE_API_URL or api_url config
 * const adapters = await createAdapters();
 * console.log(adapters.mode); // 'local'
 * ```
 */
export async function createAdapters(): Promise<Adapters> {
  const apiUrl = await getApiUrl();

  if (apiUrl) {
    // API mode: Use HTTP client adapters
    const client = new HttpClient({ baseUrl: apiUrl });
    return {
      projectStore: new ApiProjectStore(client),
      fieldStore: new ApiFieldCatalogStore(client),
      docStore: new ApiDocStore(client),
      mode: 'api',
    };
  }

  // Local mode (default): Use filesystem adapters
  return {
    projectStore: createLocalProjectStore(),
    fieldStore: createLocalFieldCatalogStore(),
    docStore: createFsDocStore(),
    mode: 'local',
  };
}

/**
 * Creates a ConfigStore instance
 *
 * Config store is always local (never uses API) because it stores
 * the api_url configuration itself. This is a convenience re-export
 * from config-local to provide a consistent factory interface.
 *
 * @param configDir - Optional custom config directory (defaults to ~/.meatycapture)
 * @returns Local ConfigStore instance
 *
 * @example
 * ```typescript
 * const configStore = createConfigStore();
 * const config = await configStore.get();
 * await configStore.set('api_url', 'http://localhost:3737');
 * ```
 */
export function createConfigStore(configDir?: string): ConfigStore {
  return createLocalConfigStore(configDir);
}
