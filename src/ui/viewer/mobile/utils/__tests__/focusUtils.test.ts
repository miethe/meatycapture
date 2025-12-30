import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getFocusableElements,
  trapFocus,
  returnFocusToTrigger,
  lockBodyScroll,
  unlockBodyScroll,
  _resetScrollLockState,
} from '../focusUtils';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock HTMLElement with specified properties
 */
function createMockElement(
  tagName: string,
  options: {
    disabled?: boolean;
    tabIndex?: number;
    href?: string;
    display?: string;
    visibility?: string;
  } = {}
): HTMLElement {
  const element = document.createElement(tagName);

  if (options.disabled !== undefined) {
    (element as HTMLButtonElement).disabled = options.disabled;
  }

  if (options.tabIndex !== undefined) {
    element.tabIndex = options.tabIndex;
  }

  if (options.href !== undefined && tagName.toLowerCase() === 'a') {
    (element as HTMLAnchorElement).href = options.href;
  }

  // Store style values for getComputedStyle mock
  if (options.display !== undefined) {
    element.dataset.mockDisplay = options.display;
  }

  if (options.visibility !== undefined) {
    element.dataset.mockVisibility = options.visibility;
  }

  return element;
}

/**
 * Create a container with multiple focusable elements
 */
function createContainerWithElements(
  elements: HTMLElement[]
): HTMLElement {
  const container = document.createElement('div');
  elements.forEach((el) => container.appendChild(el));
  return container;
}

/**
 * Create a mock KeyboardEvent
 */
function createKeyboardEvent(
  key: string,
  shiftKey: boolean = false
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
}

// ============================================================================
// Mock Setup
// ============================================================================

beforeEach(() => {
  // Reset scroll lock state before each test
  _resetScrollLockState();
  document.body.style.overflow = '';

  // Mock getComputedStyle to use data attributes for testing visibility
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const element = el as HTMLElement;
    return {
      display: element.dataset.mockDisplay ?? 'block',
      visibility: element.dataset.mockVisibility ?? 'visible',
    } as CSSStyleDeclaration;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.style.overflow = '';
});

// ============================================================================
// getFocusableElements Tests
// ============================================================================

describe('getFocusableElements', () => {
  it('should return buttons that are not disabled', () => {
    const button = createMockElement('button');
    const container = createContainerWithElements([button]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(button);
  });

  it('should exclude disabled buttons', () => {
    const enabledButton = createMockElement('button');
    const disabledButton = createMockElement('button', { disabled: true });
    const container = createContainerWithElements([enabledButton, disabledButton]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(enabledButton);
  });

  it('should return links with href', () => {
    const link = createMockElement('a', { href: 'https://example.com' });
    const container = createContainerWithElements([link]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(link);
  });

  it('should exclude links without href', () => {
    const linkWithHref = createMockElement('a', { href: 'https://example.com' });
    const linkWithoutHref = document.createElement('a'); // No href
    const container = createContainerWithElements([linkWithHref, linkWithoutHref]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(linkWithHref);
  });

  it('should return input, textarea, and select elements', () => {
    const input = createMockElement('input');
    const textarea = createMockElement('textarea');
    const select = createMockElement('select');
    const container = createContainerWithElements([input, textarea, select]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(3);
    expect(result).toContain(input);
    expect(result).toContain(textarea);
    expect(result).toContain(select);
  });

  it('should exclude disabled form elements', () => {
    const enabledInput = createMockElement('input');
    const disabledInput = createMockElement('input', { disabled: true });
    const disabledTextarea = createMockElement('textarea', { disabled: true });
    const disabledSelect = createMockElement('select', { disabled: true });
    const container = createContainerWithElements([
      enabledInput,
      disabledInput,
      disabledTextarea,
      disabledSelect,
    ]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(enabledInput);
  });

  it('should return elements with positive tabindex', () => {
    const div = createMockElement('div', { tabIndex: 0 });
    const span = createMockElement('span', { tabIndex: 1 });
    const container = createContainerWithElements([div, span]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(2);
    expect(result).toContain(div);
    expect(result).toContain(span);
  });

  it('should exclude elements with tabindex="-1"', () => {
    const focusable = createMockElement('div', { tabIndex: 0 });
    const notFocusable = createMockElement('div', { tabIndex: -1 });
    const container = createContainerWithElements([focusable, notFocusable]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(focusable);
  });

  it('should exclude hidden elements (display: none)', () => {
    const visible = createMockElement('button');
    const hidden = createMockElement('button', { display: 'none' });
    const container = createContainerWithElements([visible, hidden]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(visible);
  });

  it('should exclude invisible elements (visibility: hidden)', () => {
    const visible = createMockElement('button');
    const invisible = createMockElement('button', { visibility: 'hidden' });
    const container = createContainerWithElements([visible, invisible]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(visible);
  });

  it('should return empty array for container with no focusable elements', () => {
    const div = document.createElement('div');
    const span = document.createElement('span');
    const container = createContainerWithElements([div, span]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for empty container', () => {
    const container = document.createElement('div');

    const result = getFocusableElements(container);

    expect(result).toHaveLength(0);
  });

  it('should return elements in DOM order', () => {
    const button1 = createMockElement('button');
    button1.id = 'first';
    const button2 = createMockElement('button');
    button2.id = 'second';
    const button3 = createMockElement('button');
    button3.id = 'third';
    const container = createContainerWithElements([button1, button2, button3]);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe('first');
    expect(result[1]?.id).toBe('second');
    expect(result[2]?.id).toBe('third');
  });

  it('should find nested focusable elements', () => {
    const container = document.createElement('div');
    const nested = document.createElement('div');
    const button = createMockElement('button');
    nested.appendChild(button);
    container.appendChild(nested);

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(button);
  });
});

// ============================================================================
// trapFocus Tests
// ============================================================================

describe('trapFocus', () => {
  it('should do nothing for non-Tab key events', () => {
    const button = createMockElement('button');
    const container = createContainerWithElements([button]);
    const event = createKeyboardEvent('Enter');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    trapFocus(container, event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should prevent default and do nothing when container has no focusable elements', () => {
    const container = document.createElement('div');
    const event = createKeyboardEvent('Tab');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    trapFocus(container, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should wrap focus from last to first element on Tab', () => {
    const button1 = createMockElement('button');
    const button2 = createMockElement('button');
    const container = createContainerWithElements([button1, button2]);
    document.body.appendChild(container);

    // Focus the last element
    button2.focus();

    const event = createKeyboardEvent('Tab', false);
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const focusSpy = vi.spyOn(button1, 'focus');

    trapFocus(container, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('should wrap focus from first to last element on Shift+Tab', () => {
    const button1 = createMockElement('button');
    const button2 = createMockElement('button');
    const container = createContainerWithElements([button1, button2]);
    document.body.appendChild(container);

    // Focus the first element
    button1.focus();

    const event = createKeyboardEvent('Tab', true);
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const focusSpy = vi.spyOn(button2, 'focus');

    trapFocus(container, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('should not prevent default for Tab in middle of focusable elements', () => {
    const button1 = createMockElement('button');
    const button2 = createMockElement('button');
    const button3 = createMockElement('button');
    const container = createContainerWithElements([button1, button2, button3]);
    document.body.appendChild(container);

    // Focus the middle element
    button2.focus();

    const event = createKeyboardEvent('Tab', false);
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    trapFocus(container, event);

    // Should not prevent default - let browser handle normal tab
    expect(preventDefaultSpy).not.toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it('should move focus into container when active element is outside', () => {
    const button1 = createMockElement('button');
    const button2 = createMockElement('button');
    const container = createContainerWithElements([button1, button2]);
    const outsideButton = createMockElement('button');
    document.body.appendChild(container);
    document.body.appendChild(outsideButton);

    // Focus element outside container
    outsideButton.focus();

    const event = createKeyboardEvent('Tab', false);
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const focusSpy = vi.spyOn(button1, 'focus');

    trapFocus(container, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(container);
    document.body.removeChild(outsideButton);
  });

  it('should focus last element when Shift+Tab with focus outside container', () => {
    const button1 = createMockElement('button');
    const button2 = createMockElement('button');
    const container = createContainerWithElements([button1, button2]);
    const outsideButton = createMockElement('button');
    document.body.appendChild(container);
    document.body.appendChild(outsideButton);

    // Focus element outside container
    outsideButton.focus();

    const event = createKeyboardEvent('Tab', true);
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const focusSpy = vi.spyOn(button2, 'focus');

    trapFocus(container, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(container);
    document.body.removeChild(outsideButton);
  });

  it('should handle single focusable element', () => {
    const button = createMockElement('button');
    const container = createContainerWithElements([button]);
    document.body.appendChild(container);

    // Focus the only element
    button.focus();

    const event = createKeyboardEvent('Tab', false);
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    const focusSpy = vi.spyOn(button, 'focus');

    trapFocus(container, event);

    // Should wrap to itself
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(container);
  });
});

// ============================================================================
// returnFocusToTrigger Tests
// ============================================================================

describe('returnFocusToTrigger', () => {
  it('should do nothing when triggerElement is null', () => {
    // Should not throw
    expect(() => returnFocusToTrigger(null)).not.toThrow();
  });

  it('should call focus on the trigger element', async () => {
    const trigger = createMockElement('button');
    document.body.appendChild(trigger);

    const focusSpy = vi.spyOn(trigger, 'focus');

    returnFocusToTrigger(trigger);

    // Wait for requestAnimationFrame
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(focusSpy).toHaveBeenCalled();

    document.body.removeChild(trigger);
  });

  it('should handle element without focus method gracefully', () => {
    const element = document.createElement('div');
    // Remove focus method to simulate edge case
    (element as { focus?: unknown }).focus = undefined;

    expect(() => returnFocusToTrigger(element)).not.toThrow();
  });

  it('should use requestAnimationFrame for timing', async () => {
    const trigger = createMockElement('button');
    const focusSpy = vi.spyOn(trigger, 'focus');
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    returnFocusToTrigger(trigger);

    expect(rafSpy).toHaveBeenCalled();

    // Focus should not be called synchronously
    expect(focusSpy).not.toHaveBeenCalled();

    // Wait for RAF callback
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(focusSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// lockBodyScroll Tests
// ============================================================================

describe('lockBodyScroll', () => {
  it('should set body overflow to hidden', () => {
    lockBodyScroll();

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should store previous overflow value', () => {
    document.body.style.overflow = 'auto';

    lockBodyScroll();

    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();

    expect(document.body.style.overflow).toBe('auto');
  });

  it('should be idempotent (multiple calls safe)', () => {
    document.body.style.overflow = 'scroll';

    lockBodyScroll();
    lockBodyScroll(); // Second call should not overwrite stored value
    lockBodyScroll();

    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();

    // Should restore original value, not 'hidden'
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('should handle empty string overflow', () => {
    document.body.style.overflow = '';

    lockBodyScroll();

    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();

    expect(document.body.style.overflow).toBe('');
  });
});

// ============================================================================
// unlockBodyScroll Tests
// ============================================================================

describe('unlockBodyScroll', () => {
  it('should restore previous overflow value', () => {
    document.body.style.overflow = 'visible';

    lockBodyScroll();
    unlockBodyScroll();

    expect(document.body.style.overflow).toBe('visible');
  });

  it('should do nothing if lockBodyScroll was not called', () => {
    document.body.style.overflow = 'auto';

    unlockBodyScroll();

    // Should remain unchanged
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should clear stored value after unlock', () => {
    document.body.style.overflow = 'scroll';

    lockBodyScroll();
    unlockBodyScroll();

    // Second unlock should be no-op
    document.body.style.overflow = 'visible';
    unlockBodyScroll();

    // Should still be 'visible' (not changed by second unlock)
    expect(document.body.style.overflow).toBe('visible');
  });

  it('should handle lock/unlock cycle correctly', () => {
    document.body.style.overflow = 'auto';

    // First cycle
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('auto');

    // Change overflow and do second cycle
    document.body.style.overflow = 'scroll';
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('scroll');
  });
});

// ============================================================================
// _resetScrollLockState Tests
// ============================================================================

describe('_resetScrollLockState', () => {
  it('should reset internal state', () => {
    document.body.style.overflow = 'visible';

    lockBodyScroll();

    // Reset without unlocking
    _resetScrollLockState();

    // Now lock again with different initial value
    document.body.style.overflow = 'auto';
    lockBodyScroll();
    unlockBodyScroll();

    // Should restore 'auto', not 'visible'
    expect(document.body.style.overflow).toBe('auto');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Focus Utils Integration', () => {
  it('should work together for modal lifecycle', async () => {
    // Setup: create trigger and modal
    const trigger = createMockElement('button');
    trigger.id = 'trigger';
    const modalButton1 = createMockElement('button');
    modalButton1.id = 'modal-btn-1';
    const modalButton2 = createMockElement('button');
    modalButton2.id = 'modal-btn-2';
    const modal = createContainerWithElements([modalButton1, modalButton2]);

    document.body.appendChild(trigger);
    document.body.appendChild(modal);
    document.body.style.overflow = 'auto';

    // Open modal
    trigger.focus();
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    // Focus first element in modal
    const focusable = getFocusableElements(modal);
    expect(focusable).toHaveLength(2);
    focusable[0]?.focus();
    expect(document.activeElement).toBe(modalButton1);

    // Tab through modal (should trap)
    modalButton2.focus();
    const tabEvent = createKeyboardEvent('Tab', false);
    trapFocus(modal, tabEvent);

    // Close modal
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('auto');

    returnFocusToTrigger(trigger);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.activeElement).toBe(trigger);

    // Cleanup
    document.body.removeChild(trigger);
    document.body.removeChild(modal);
  });
});
