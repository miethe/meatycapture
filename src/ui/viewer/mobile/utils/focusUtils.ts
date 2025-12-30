/**
 * Focus Management Utilities for Modal Sheets
 *
 * Provides utility functions for managing focus in modal dialogs and sheets:
 * - Focus trapping within modal boundaries
 * - Focus restoration after modal close
 * - Body scroll locking during modal display
 *
 * These utilities are designed for accessibility compliance (WCAG 2.1 AA)
 * and work with the mobile sheet components.
 */

/**
 * Query selector for focusable elements within a container.
 * Matches elements that can receive keyboard focus via Tab navigation.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Stored body overflow value for restoration after unlock
 */
let previousBodyOverflow: string | null = null;

/**
 * Get all focusable elements within a container.
 *
 * Returns elements that can receive keyboard focus, excluding:
 * - Elements with tabindex="-1"
 * - Disabled elements
 * - Hidden elements (display: none or visibility: hidden)
 *
 * @param container - The container element to search within
 * @returns Array of focusable HTMLElements, in DOM order
 *
 * @example
 * ```ts
 * const modal = document.querySelector('.modal');
 * const focusable = getFocusableElements(modal);
 * focusable[0]?.focus(); // Focus first element
 * ```
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );

  return elements.filter((el) => {
    // Filter out invisible elements
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/**
 * Trap focus within a container by handling Tab/Shift+Tab key events.
 *
 * When focus reaches the last focusable element and Tab is pressed,
 * focus wraps to the first element. When focus is on the first element
 * and Shift+Tab is pressed, focus wraps to the last element.
 *
 * @param container - The container element to trap focus within
 * @param event - The keyboard event (should be a Tab key event)
 *
 * @example
 * ```ts
 * const handleKeyDown = (e: KeyboardEvent) => {
 *   if (e.key === 'Tab') {
 *     trapFocus(modalRef.current, e);
 *   }
 * };
 * ```
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  // Only handle Tab key events
  if (event.key !== 'Tab') {
    return;
  }

  const focusableElements = getFocusableElements(container);

  // No focusable elements, nothing to trap
  if (focusableElements.length === 0) {
    event.preventDefault();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // TypeScript safety check (should never be undefined given length > 0)
  if (!firstElement || !lastElement) {
    return;
  }

  const activeElement = document.activeElement as HTMLElement;

  // Shift+Tab on first element: wrap to last element
  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  // Tab on last element: wrap to first element
  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
    return;
  }

  // If active element is outside container, move focus into container
  if (!container.contains(activeElement)) {
    event.preventDefault();
    if (event.shiftKey) {
      lastElement.focus();
    } else {
      firstElement.focus();
    }
  }
}

/**
 * Return focus to the element that triggered the modal.
 *
 * Should be called when the modal/sheet is closed to restore
 * keyboard navigation context for the user.
 *
 * @param triggerElement - The element that opened the modal (may be null)
 *
 * @example
 * ```ts
 * const openButton = document.querySelector('.open-modal');
 * // When closing modal:
 * returnFocusToTrigger(openButton);
 * ```
 */
export function returnFocusToTrigger(
  triggerElement: HTMLElement | null
): void {
  if (triggerElement && typeof triggerElement.focus === 'function') {
    // Use requestAnimationFrame to ensure DOM is ready after modal unmount
    requestAnimationFrame(() => {
      triggerElement.focus();
    });
  }
}

/**
 * Lock body scrolling to prevent background scroll while modal is open.
 *
 * Stores the current body overflow value for later restoration.
 * Safe to call multiple times (idempotent after first call).
 *
 * @example
 * ```ts
 * // When opening modal:
 * lockBodyScroll();
 *
 * // When closing modal:
 * unlockBodyScroll();
 * ```
 */
export function lockBodyScroll(): void {
  // Only store the previous value if we haven't already locked
  if (previousBodyOverflow === null) {
    previousBodyOverflow = document.body.style.overflow;
  }
  document.body.style.overflow = 'hidden';
}

/**
 * Unlock body scrolling, restoring the previous overflow value.
 *
 * Restores the overflow value that was present before lockBodyScroll was called.
 * If lockBodyScroll was never called, this is a no-op.
 *
 * @example
 * ```ts
 * // When closing modal:
 * unlockBodyScroll();
 * ```
 */
export function unlockBodyScroll(): void {
  if (previousBodyOverflow !== null) {
    document.body.style.overflow = previousBodyOverflow;
    previousBodyOverflow = null;
  }
}

/**
 * Reset the stored body overflow value.
 * Primarily used for testing to ensure clean state between tests.
 *
 * @internal
 */
export function _resetScrollLockState(): void {
  previousBodyOverflow = null;
}
