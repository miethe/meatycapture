/**
 * Browser compatibility utilities for APIs that require secure contexts.
 * Provides fallbacks for crypto.randomUUID and navigator.clipboard.
 */

/**
 * Generate a UUID v4 string.
 * Uses crypto.randomUUID when available (secure context),
 * falls back to crypto.getRandomValues implementation.
 */
export function generateUUID(): string {
  // Use native randomUUID if available (requires secure context)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback using crypto.getRandomValues (broader support)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant (RFC4122) bits
    // Using non-null assertions since we know indices 6 and 8 exist in a 16-byte array
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // Version 4
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // Variant RFC4122

    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last resort fallback using Math.random (not cryptographically secure)
  // This should rarely be needed in modern browsers
  console.warn('Using Math.random for UUID generation - not cryptographically secure');
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Copy text to clipboard.
 * Uses navigator.clipboard.writeText when available (secure context),
 * falls back to execCommand for non-secure contexts.
 *
 * @returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Use modern Clipboard API if available
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback using execCommand (deprecated but widely supported)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Prevent scrolling to bottom of page
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);

    return success;
  } catch {
    console.error('Failed to copy to clipboard: no available method');
    return false;
  }
}
