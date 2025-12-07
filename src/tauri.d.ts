/**
 * Tauri Type Declarations
 *
 * Augments the global Window interface to include Tauri-specific
 * objects injected at runtime.
 */

declare global {
  interface Window {
    /**
     * Tauri API object injected by the Tauri runtime.
     * Present when running in Tauri desktop app, undefined in web browser.
     */
    __TAURI__?: {
      [key: string]: unknown;
    };
  }
}

export {};
