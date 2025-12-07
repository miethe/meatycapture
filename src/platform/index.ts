/**
 * Platform Detection Utility
 *
 * Detects runtime environment (Tauri desktop vs web browser)
 * and provides platform-specific feature flags.
 *
 * @example
 * ```typescript
 * import { isTauri, getPlatform } from '@platform';
 *
 * if (isTauri()) {
 *   // Use Tauri filesystem API
 * } else {
 *   // Use browser localStorage
 * }
 * ```
 */

/**
 * Checks if the application is running in Tauri desktop environment.
 *
 * @returns True if running in Tauri, false if in browser
 */
export function isTauri(): boolean {
  // Tauri injects __TAURI__ global object
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Platform type enumeration.
 */
export type Platform = 'tauri-desktop' | 'web-browser';

/**
 * Gets the current platform type.
 *
 * @returns Platform identifier
 */
export function getPlatform(): Platform {
  return isTauri() ? 'tauri-desktop' : 'web-browser';
}

/**
 * Platform capability flags.
 */
export interface PlatformCapabilities {
  /** Can read/write files to arbitrary filesystem locations */
  hasFileSystemAccess: boolean;
  /** Can use native file picker dialogs */
  hasNativeFilePicker: boolean;
  /** Can use native notifications */
  hasNativeNotifications: boolean;
  /** Platform identifier */
  platform: Platform;
}

/**
 * Gets platform-specific capability flags.
 *
 * @returns Capability flags for current platform
 */
export function getPlatformCapabilities(): PlatformCapabilities {
  const platform = getPlatform();

  if (platform === 'tauri-desktop') {
    return {
      hasFileSystemAccess: true,
      hasNativeFilePicker: true,
      hasNativeNotifications: true,
      platform,
    };
  }

  // Web browser - limited capabilities
  return {
    hasFileSystemAccess: false,
    hasNativeFilePicker: 'showOpenFilePicker' in window,
    hasNativeNotifications: 'Notification' in window,
    platform,
  };
}
