/**
 * API Detection Module
 *
 * Detects storage adapter mode based on runtime environment and API server availability.
 * Determines whether to use API-based, local filesystem, or browser storage adapters.
 *
 * Detection priority:
 * 1. API mode: MEATYCAPTURE_API_URL env var is set and valid
 * 2. Local mode: Running in Tauri desktop environment
 * 3. Browser mode: Running in web browser without API URL
 *
 * @example
 * ```typescript
 * import { detectAdapterMode, AdapterMode } from '@platform/api-detection';
 *
 * const mode = detectAdapterMode();
 * if (mode === 'api') {
 *   // Use HTTP client adapters
 * } else if (mode === 'local') {
 *   // Use Tauri filesystem adapters
 * } else {
 *   // Use browser localStorage adapters
 * }
 * ```
 */

/**
 * Checks if running in Tauri desktop environment
 * (Exported for testing, used internally to avoid circular dependency with index.ts)
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Storage adapter mode enumeration.
 *
 * - 'api': Use HTTP client to communicate with server API
 * - 'local': Use Tauri filesystem APIs for direct file access
 * - 'browser': Use browser localStorage/IndexedDB
 */
export type AdapterMode = 'api' | 'local' | 'browser';

/**
 * Health check response from API server
 */
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp?: string;
  version?: string;
}

/**
 * Cached detection result to avoid redundant checks
 */
let cachedMode: AdapterMode | null = null;

/**
 * Validates URL format
 *
 * Ensures the URL string is well-formed with http/https protocol
 * and valid hostname/port.
 *
 * @param url - URL string to validate
 * @returns true if valid URL, false otherwise
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols for security
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Gets API base URL from environment variable
 *
 * Checks MEATYCAPTURE_API_URL in both process.env (Node/Bun)
 * and import.meta.env (Vite) for maximum compatibility.
 *
 * @returns API URL if set and valid, undefined otherwise
 */
function getApiUrlFromEnv(): string | undefined {
  // Check process.env first (Node/Bun/Tauri)
  if (typeof process !== 'undefined' && process.env?.MEATYCAPTURE_API_URL) {
    const url = process.env.MEATYCAPTURE_API_URL;
    if (isValidUrl(url)) {
      return url;
    }
    console.warn(`[API Detection] Invalid MEATYCAPTURE_API_URL in process.env: ${url}`);
    return undefined;
  }

  // Check import.meta.env (Vite build)
  if (typeof import.meta !== 'undefined' && import.meta.env?.MEATYCAPTURE_API_URL) {
    const url = import.meta.env.MEATYCAPTURE_API_URL as string;
    if (isValidUrl(url)) {
      return url;
    }
    console.warn(`[API Detection] Invalid MEATYCAPTURE_API_URL in import.meta.env: ${url}`);
    return undefined;
  }

  return undefined;
}

/**
 * Pings API server health endpoint to verify availability
 *
 * Optional verification step to ensure API server is actually responding.
 * Uses short timeout and no retries for fast detection.
 *
 * @param baseUrl - API base URL to check
 * @returns true if server responds with 200 OK, false otherwise
 */
export async function pingApiHealth(baseUrl: string): Promise<boolean> {
  try {
    const healthUrl = `${baseUrl}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[API Detection] Health check failed with status ${response.status}: ${healthUrl}`);
      return false;
    }

    // Optionally validate response body
    try {
      const data: HealthCheckResponse = await response.json();
      if (data.status === 'ok') {
        console.log(`[API Detection] Health check succeeded: ${healthUrl}`, data);
        return true;
      }
      console.warn(`[API Detection] Health check returned non-ok status:`, data);
      return false;
    } catch {
      // If response isn't JSON, accept 200 OK as valid
      console.log(`[API Detection] Health check succeeded with non-JSON response: ${healthUrl}`);
      return true;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[API Detection] Health check timeout: ${baseUrl}`);
    } else {
      console.warn(`[API Detection] Health check failed:`, error);
    }
    return false;
  }
}

/**
 * Detects storage adapter mode based on runtime environment
 *
 * Detection logic:
 * 1. If MEATYCAPTURE_API_URL is set and valid → 'api'
 * 2. If running in Tauri desktop → 'local'
 * 3. Otherwise (web browser) → 'browser'
 *
 * Result is cached after first detection for performance.
 *
 * @param options - Detection options
 * @param options.skipCache - Skip cache and force re-detection
 * @param options.verifyHealth - Ping /health endpoint to verify API (async, slower)
 * @returns Detected adapter mode
 *
 * @example
 * ```typescript
 * // Fast detection (cached)
 * const mode = detectAdapterMode();
 *
 * // Force re-detection with health check
 * const mode = await detectAdapterMode({ skipCache: true, verifyHealth: true });
 * ```
 */
export function detectAdapterMode(options?: {
  skipCache?: boolean;
  verifyHealth?: boolean;
}): AdapterMode {
  // Return cached result if available and not skipped
  if (cachedMode && !options?.skipCache) {
    return cachedMode;
  }

  let detectedMode: AdapterMode;

  // Priority 1: Check for API URL environment variable
  const apiUrl = getApiUrlFromEnv();
  if (apiUrl) {
    detectedMode = 'api';
    console.log(`[API Detection] Detected 'api' mode: ${apiUrl}`);
  }
  // Priority 2: Check if running in Tauri desktop
  else if (isTauriEnvironment()) {
    detectedMode = 'local';
    console.log(`[API Detection] Detected 'local' mode: Tauri desktop environment`);
  }
  // Priority 3: Default to browser mode
  else {
    detectedMode = 'browser';
    console.log(`[API Detection] Detected 'browser' mode: Web browser environment`);
  }

  // Cache the result
  cachedMode = detectedMode;

  // Optional async health check (caller must await if verifyHealth is true)
  if (options?.verifyHealth && detectedMode === 'api' && apiUrl) {
    // Note: This returns immediately, health check happens async
    // Caller should await pingApiHealth() separately if synchronous verification needed
    pingApiHealth(apiUrl).then((healthy) => {
      if (!healthy) {
        console.warn(
          `[API Detection] API mode detected but health check failed. ` +
          `Server may be unreachable: ${apiUrl}`
        );
      }
    }).catch((error) => {
      console.error(`[API Detection] Health check error:`, error);
    });
  }

  return detectedMode;
}

/**
 * Clears cached detection result
 *
 * Forces next detectAdapterMode() call to re-run detection logic.
 * Useful for testing or when environment changes at runtime.
 */
export function clearDetectionCache(): void {
  cachedMode = null;
  console.log(`[API Detection] Cache cleared`);
}

/**
 * Gets current cached adapter mode without re-detecting
 *
 * @returns Cached mode or null if not yet detected
 */
export function getCachedMode(): AdapterMode | null {
  return cachedMode;
}
