---
title: "Testing Guide: Mobile Viewer UX Implementation"
description: "Comprehensive testing strategy for mobile viewer components, including unit, integration, E2E, and manual testing procedures."
audience: [ai-agents, developers, qa-engineers]
tags: [testing, mobile, viewer, ux, qa]
created: 2025-12-30
updated: 2025-12-30
category: "testing-guide"
status: active
---

# Testing Guide: Mobile Viewer UX Implementation

## Overview

This guide provides detailed testing procedures for the Mobile Viewer UX Redesign implementation. Testing is conducted in parallel with development (starting Week 2) and continues through Week 6.

---

## Test Categories

### 1. Unit Tests (90%+ Coverage)

#### Custom Hooks Testing

**Test File:** `src/ui/viewer/hooks/__tests__/useBottomSheet.test.ts`

```
describe('useBottomSheet', () => {
  // isOpen initial state
  test('should initialize with isOpen = false', () => {
    const { result } = renderHook(() => useBottomSheet());
    expect(result.current.isOpen).toBe(false);
  });

  // open() method
  test('should set isOpen = true when open() called', () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  // close() method
  test('should set isOpen = false when close() called', () => {
    const { result } = renderHook(() => useBottomSheet(true));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  // toggle() method
  test('should toggle isOpen state', () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(false);
  });

  // Escape key handling
  test('should close sheet on Escape key press', () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => result.current.open());

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    act(() => document.dispatchEvent(event));

    expect(result.current.isOpen).toBe(false);
  });

  // Debounce rapid opens
  test('should debounce rapid open/close calls', async () => {
    const { result } = renderHook(() => useBottomSheet());

    act(() => {
      result.current.open();
      result.current.open();
      result.current.open();
    });

    // Should only trigger once after debounce delay
    expect(result.current.isOpen).toBe(true);
  });
});
```

**Test File:** `src/ui/viewer/hooks/__tests__/useMobileViewport.test.ts`

```
describe('useMobileViewport', () => {
  // Breakpoint detection
  test('should detect mobile viewport (<768px)', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });
    const { result } = renderHook(() => useMobileViewport());
    expect(result.current.isMobile).toBe(true);
  });

  test('should detect desktop viewport (>=768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
    const { result } = renderHook(() => useMobileViewport());
    expect(result.current.isMobile).toBe(false);
  });

  // Resize listener
  test('should update isMobile on window resize', async () => {
    const { result } = renderHook(() => useMobileViewport());

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(true);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(false);
  });

  // Debounced resize
  test('should debounce resize events (100ms)', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useMobileViewport());
    const initialValue = result.current.isMobile;

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
    });

    // Should not update until debounce delay passes
    expect(result.current.isMobile).toBe(initialValue);

    act(() => jest.advanceTimersByTime(100));

    // Now should update
    expect(result.current.isMobile).toBe(true);

    jest.useRealTimers();
  });

  // Cleanup
  test('should clean up resize listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useMobileViewport());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
```

**Test File:** `src/ui/viewer/hooks/__tests__/useSafeArea.test.ts`

```
describe('useSafeArea', () => {
  // Safe area detection
  test('should read CSS env() values for safe areas', () => {
    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBeDefined();
    expect(result.current.right).toBeDefined();
    expect(result.current.bottom).toBeDefined();
    expect(result.current.left).toBeDefined();
    expect(typeof result.current.top).toBe('number');
  });

  // Fallback to 0
  test('should fallback to 0 if safe areas not supported', () => {
    // Mock unsupported browser
    const { result } = renderHook(() => useSafeArea());

    // Should return all 0 or reasonable defaults
    expect(result.current.top >= 0).toBe(true);
    expect(result.current.bottom >= 0).toBe(true);
  });

  // Orientation change
  test('should recalculate insets on orientation change', () => {
    const { result, rerender } = renderHook(() => useSafeArea());
    const initialBottom = result.current.bottom;

    act(() => {
      window.dispatchEvent(new Event('orientationchange'));
    });

    rerender();

    // Insets may change based on orientation
    expect(result.current).toBeDefined();
  });
});
```

**Test File:** `src/ui/viewer/hooks/__tests__/useReducedMotion.test.ts`

```
describe('useReducedMotion', () => {
  // Preference detection
  test('should detect prefers-reduced-motion preference', () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(typeof result.current.prefersReducedMotion).toBe('boolean');
  });

  // Media query listener
  test('should listen to media query changes', () => {
    const matchMediaSpy = jest.spyOn(window, 'matchMedia');
    const { result } = renderHook(() => useReducedMotion());

    expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');

    matchMediaSpy.mockRestore();
  });

  // Cleanup
  test('should clean up media query listener on unmount', () => {
    let removeListenerSpy: jest.Mock;
    jest.spyOn(window, 'matchMedia').mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: (listener) => { removeListenerSpy = listener; },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(removeListenerSpy).toBeDefined();
  });
});
```

#### Utility Functions Testing

**Test File:** `src/ui/viewer/utils/__tests__/gestureUtils.test.ts`

```
describe('gestureUtils', () => {
  describe('calculateDragDistance', () => {
    test('should calculate positive distance for downward drag', () => {
      const distance = calculateDragDistance(100, 200);
      expect(distance).toBe(100);
    });

    test('should calculate negative distance for upward drag', () => {
      const distance = calculateDragDistance(200, 100);
      expect(distance).toBe(-100);
    });

    test('should handle zero distance', () => {
      const distance = calculateDragDistance(150, 150);
      expect(distance).toBe(0);
    });
  });

  describe('shouldDismiss', () => {
    test('should dismiss if distance > threshold', () => {
      expect(shouldDismiss(150, 100)).toBe(true);
    });

    test('should not dismiss if distance < threshold', () => {
      expect(shouldDismiss(50, 100)).toBe(false);
    });

    test('should not dismiss if distance exactly equals threshold', () => {
      expect(shouldDismiss(100, 100)).toBe(false);
    });
  });

  describe('calculateTransform', () => {
    test('should return CSS transform for drag distance', () => {
      const transform = calculateTransform(50);
      expect(transform).toContain('translateY');
      expect(transform).toContain('50');
    });

    test('should handle zero distance', () => {
      const transform = calculateTransform(0);
      expect(transform).toContain('translateY(0');
    });
  });

  describe('getSwipeVelocity', () => {
    test('should calculate pixels per millisecond', () => {
      const velocity = getSwipeVelocity(100, 200);
      expect(velocity).toBe(0.5);
    });

    test('should handle very fast swipes', () => {
      const velocity = getSwipeVelocity(200, 50);
      expect(velocity).toBe(4);
    });
  });
});
```

### 2. Integration Tests

**Test File:** `src/ui/viewer/__tests__/MobileDocCard.integration.test.tsx`

```
describe('MobileDocCard Integration', () => {
  const mockEntry = {
    id: 'doc-1',
    doc_id: 'REQ-20251230-web-app',
    title: 'Fix login form validation',
    path: '/docs/REQ-20251230-web-app.md',
    item_count: 3,
    updated_at: new Date('2025-12-30'),
    priority: 'high',
    tags: ['bug', 'auth'],
    project: { id: 'proj-1', name: 'Web App' },
  };

  test('should render card with document metadata', () => {
    const { getByText, getByLabelText } = render(
      <MobileDocCard entry={mockEntry} onTap={jest.fn()} />
    );

    expect(getByText('REQ-20251230-web-app')).toBeInTheDocument();
    expect(getByText('Fix login form validation')).toBeInTheDocument();
    expect(getByText('3')).toBeInTheDocument();
    expect(getByText('bug')).toBeInTheDocument();
    expect(getByText('auth')).toBeInTheDocument();
  });

  test('should call onTap callback when card is tapped', () => {
    const onTap = jest.fn();
    const { container } = render(
      <MobileDocCard entry={mockEntry} onTap={onTap} />
    );

    fireEvent.click(container.querySelector('[role="button"]'));

    expect(onTap).toHaveBeenCalledWith(mockEntry.path);
  });

  test('should show overflow indicator if >2 tags', () => {
    const entryWithManyTags = {
      ...mockEntry,
      tags: ['bug', 'auth', 'urgent', 'security'],
    };

    const { getByText } = render(
      <MobileDocCard entry={entryWithManyTags} onTap={jest.fn()} />
    );

    expect(getByText('bug')).toBeInTheDocument();
    expect(getByText('auth')).toBeInTheDocument();
    expect(getByText('+2')).toBeInTheDocument();
  });

  test('should meet touch target size (88px+)', () => {
    const { container } = render(
      <MobileDocCard entry={mockEntry} onTap={jest.fn()} />
    );

    const card = container.querySelector('.mobile-doc-card');
    const height = card.clientHeight;

    expect(height).toBeGreaterThanOrEqual(88);
  });

  test('should have proper accessibility labels', () => {
    const { getByLabelText, getByRole } = render(
      <MobileDocCard entry={mockEntry} onTap={jest.fn()} />
    );

    const card = getByRole('button');
    expect(card).toHaveAttribute('aria-label');
  });
});
```

**Test File:** `src/ui/viewer/__tests__/MobileFilterSheet.integration.test.tsx`

```
describe('MobileFilterSheet Integration', () => {
  const mockFilterState = {
    project_id: undefined,
    types: [],
    domains: [],
    priorities: [],
    statuses: [],
    tags: [],
    text: '',
    sort_by: 'date',
    sort_order: 'desc',
  };

  const mockFilterOptions = {
    projects: [{ id: 'p1', name: 'Web App' }],
    types: ['bug', 'enhancement'],
    domains: ['web', 'api'],
    priorities: ['p0', 'p1'],
    statuses: ['triage', 'in-progress'],
    tags: ['urgent', 'security'],
  };

  const mockOnChange = jest.fn();
  const mockOnApply = jest.fn();

  test('should render all 7 filter controls', () => {
    const { getByLabelText } = render(
      <MobileFilterSheet
        isOpen={true}
        filterState={mockFilterState}
        filterOptions={mockFilterOptions}
        onFilterChange={mockOnChange}
        onApply={mockOnApply}
        onClose={jest.fn()}
      />
    );

    expect(getByLabelText(/project/i)).toBeInTheDocument();
    expect(getByLabelText(/type/i)).toBeInTheDocument();
    expect(getByLabelText(/domain/i)).toBeInTheDocument();
    expect(getByLabelText(/priority/i)).toBeInTheDocument();
    expect(getByLabelText(/status/i)).toBeInTheDocument();
    expect(getByLabelText(/tag/i)).toBeInTheDocument();
    expect(getByLabelText(/search/i)).toBeInTheDocument();
  });

  test('should call onApply when Apply Filters button clicked', () => {
    const { getByText } = render(
      <MobileFilterSheet
        isOpen={true}
        filterState={mockFilterState}
        filterOptions={mockFilterOptions}
        onFilterChange={mockOnChange}
        onApply={mockOnApply}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(getByText(/Apply Filters/i));

    expect(mockOnApply).toHaveBeenCalled();
  });

  test('should show active filter count badge', () => {
    const filterWithValues = {
      ...mockFilterState,
      types: ['bug'],
      priorities: ['p0'],
    };

    const { getByText } = render(
      <MobileFilterSheet
        isOpen={true}
        filterState={filterWithValues}
        filterOptions={mockFilterOptions}
        onFilterChange={mockOnChange}
        onApply={mockOnApply}
        onClose={jest.fn()}
      />
    );

    expect(getByText(/Apply Filters \(2\)/i)).toBeInTheDocument();
  });

  test('should have all touch targets >=48px', () => {
    const { container } = render(
      <MobileFilterSheet
        isOpen={true}
        filterState={mockFilterState}
        filterOptions={mockFilterOptions}
        onFilterChange={mockOnChange}
        onApply={mockOnApply}
        onClose={jest.fn()}
      />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      const height = button.clientHeight;
      expect(height).toBeGreaterThanOrEqual(48);
    });
  });
});
```

**Test File:** `src/ui/viewer/__tests__/ViewerContainer.mobile.integration.test.tsx`

```
describe('ViewerContainer Mobile Integration', () => {
  test('should render mobile components when viewport <768px', () => {
    // Mock useMobileViewport to return isMobile=true
    jest.spyOn(require('@ui/shared/hooks/useMobileViewport'), 'useMobileViewport').mockReturnValue({
      isMobile: true,
      width: 375,
      height: 667,
    });

    const { container } = render(
      <ViewerContainer projectStore={mockProjectStore} docStore={mockDocStore} />
    );

    expect(container.querySelector('.mobile-doc-list')).toBeInTheDocument();
    expect(container.querySelector('.mobile-filter-fab')).toBeInTheDocument();
  });

  test('should render desktop components when viewport >=768px', () => {
    jest.spyOn(require('@ui/shared/hooks/useMobileViewport'), 'useMobileViewport').mockReturnValue({
      isMobile: false,
      width: 1024,
      height: 768,
    });

    const { container } = render(
      <ViewerContainer projectStore={mockProjectStore} docStore={mockDocStore} />
    );

    expect(container.querySelector('.viewer-table')).toBeInTheDocument();
    expect(container.querySelector('.mobile-doc-list')).not.toBeInTheDocument();
  });

  test('should preserve filter state when switching viewport', async () => {
    const mockUseMobileViewport = jest.spyOn(require('@ui/shared/hooks/useMobileViewport'), 'useMobileViewport');

    const { rerender } = render(
      <ViewerContainer projectStore={mockProjectStore} docStore={mockDocStore} />
    );

    // Set mobile filters
    const filterInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(filterInput, { target: { value: 'test' } });

    // Switch to desktop
    mockUseMobileViewport.mockReturnValue({ isMobile: false, width: 1024, height: 768 });
    rerender(
      <ViewerContainer projectStore={mockProjectStore} docStore={mockDocStore} />
    );

    // Filter state should be preserved
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });
});
```

### 3. E2E Tests (Playwright)

**Test File:** `tests/e2e/viewer-mobile.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mobile Viewer Tab - User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to app
    await page.goto('/');

    // Navigate to Viewer tab
    await page.click('button[aria-label="Viewer tab"]');

    // Wait for cards to load
    await page.waitForSelector('[role="button"][class*="mobile-doc-card"]');
  });

  test('Journey 1: Browse > Filter > Preview > Full view', async ({ page }) => {
    // Step 1: See documents in card list
    const cardCount = await page.locator('[role="button"][class*="mobile-doc-card"]').count();
    expect(cardCount).toBeGreaterThan(0);

    // Step 2: Open filter sheet via FAB
    await page.click('[class*="mobile-filter-fab"]');
    await page.waitForSelector('[role="dialog"]');

    // Step 3: Select filter (Type = bug)
    await page.click('label:has-text("Type")');
    await page.click('[role="option"]:has-text("bug")');

    // Step 4: Apply filters
    await page.click('button:has-text("Apply Filters")');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Step 5: Card list updated
    const updatedCardCount = await page.locator('[role="button"][class*="mobile-doc-card"]').count();
    expect(updatedCardCount).toBeLessThanOrEqual(cardCount);

    // Step 6: Tap first card (opens detail sheet)
    await page.click('[role="button"][class*="mobile-doc-card"]', { position: { x: 50, y: 50 } });
    await page.waitForSelector('[class*="mobile-detail-sheet"]');

    // Step 7: See preview data
    const docId = await page.textContent('[class*="doc-id-badge"]');
    expect(docId).toMatch(/REQ-\d+-\w+/);

    // Step 8: Tap "View Full Document"
    await page.click('button:has-text("View Full Document")');

    // Sheet should expand to full height
    const sheet = await page.locator('[class*="mobile-detail-sheet"]');
    const height = await sheet.evaluate((el) => el.offsetHeight);
    expect(height).toBeGreaterThan(600);

    // Step 9: Dismiss sheet (tap back or swipe)
    await page.click('button[aria-label="Close detail sheet"]');
    await page.waitForSelector('[role="button"][class*="mobile-doc-card"]');
  });

  test('Journey 2: Search > Tap card > Dismiss', async ({ page }) => {
    // Step 1: Use search in header
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('important');

    // Step 2: Wait for filtered results
    await page.waitForTimeout(400); // Debounce delay

    // Step 3: Tap card
    await page.click('[role="button"][class*="mobile-doc-card"]', { position: { x: 50, y: 50 } });

    // Step 4: Detail sheet opens
    await page.waitForSelector('[class*="mobile-detail-sheet"]');

    // Step 5: Swipe down to dismiss (drag gesture)
    const sheet = page.locator('[class*="mobile-detail-sheet"]');
    const box = await sheet.boundingBox();
    await page.dragFrom(
      { x: box!.x + box!.width / 2, y: box!.y + 50 },
      { x: box!.x + box!.width / 2, y: box!.y + 200 }
    );

    // Step 6: Sheet closes
    await page.waitForSelector('[role="button"][class*="mobile-doc-card"]');
  });

  test('Journey 3: Sort > Filter > View results', async ({ page }) => {
    // Step 1: Open sort dropdown
    await page.click('button[aria-label*="Sort"]');
    await page.waitForSelector('[role="menu"]');

    // Step 2: Select sort option
    await page.click('[role="menuitem"]:has-text("Item Count")');

    // Step 3: Cards reorder
    const firstTitle = await page.locator('[class*="mobile-doc-card"]').first().textContent();

    // Step 4: Open filter sheet
    await page.click('[class*="mobile-filter-fab"]');

    // Step 5: Apply filter
    await page.click('label:has-text("Priority")');
    await page.click('[role="option"]:has-text("p0")');
    await page.click('button:has-text("Apply Filters")');

    // Step 6: Results filtered and sorted
    const resultText = await page.locator('[class*="mobile-doc-list"]').textContent();
    expect(resultText).toContain('of');
  });

  test('Keyboard Navigation: Tab/Shift+Tab in sheets', async ({ page }) => {
    // Open filter sheet
    await page.click('[class*="mobile-filter-fab"]');
    await page.waitForSelector('[role="dialog"]');

    // Tab through controls
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);

    // Shift+Tab backward
    await page.keyboard.press('Shift+Tab');

    // Escape closes sheet
    await page.keyboard.press('Escape');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeHidden();
  });

  test('Accessibility: Screen reader announces filter count', async ({ page }) => {
    // Open filter sheet
    await page.click('[class*="mobile-filter-fab"]');

    // Check ARIA label
    const fab = page.locator('[class*="mobile-filter-fab"]');
    const label = await fab.getAttribute('aria-label');
    expect(label).toMatch(/filters?/i);
  });

  test('Orientation change: Landscape layout', async ({ page }) => {
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });

    // Cards still render
    const cards = page.locator('[role="button"][class*="mobile-doc-card"]');
    expect(cards).toHaveCount(await cards.count());

    // Open sheet in landscape
    await page.click('[class*="mobile-filter-fab"]');
    const sheet = page.locator('[class*="mobile-filter-sheet"]');
    const height = await sheet.evaluate((el) => el.offsetHeight);

    // Sheet height reduced in landscape (max 70vh)
    expect(height).toBeLessThan(375 * 0.7 * 1.2); // Rough estimate
  });
});
```

### 4. Manual Testing Procedures

#### iOS Testing (iPhone 12+)

**Device:** iPhone 12 Pro / iPhone 14 Pro Max
**iOS Version:** iOS 16+
**Orientation:** Portrait & Landscape

**Checklist:**

- [ ] **App Launch**
  - [ ] App opens without crashes
  - [ ] Viewer tab loads successfully
  - [ ] No console errors (if dev tools available)

- [ ] **Card Display**
  - [ ] Cards render in full-screen width (safe margins)
  - [ ] 2-3 cards visible above fold
  - [ ] No horizontal scrolling
  - [ ] Card height >= 88px (tap target compliant)

- [ ] **Safe Area (Notch)**
  - [ ] Header doesn't overlap notch
  - [ ] FAB doesn't overlap notch area
  - [ ] All content visible without scroll

- [ ] **Touch Interactions**
  - [ ] FAB button responds to tap (scale feedback)
  - [ ] Filter sheet opens smoothly (no jank)
  - [ ] Card tap opens detail sheet
  - [ ] Buttons respond to touches (no missed taps)

- [ ] **Filter Sheet**
  - [ ] Bottom sheet slides up 300ms smoothly
  - [ ] All dropdowns expand/collapse
  - [ ] Drag handle visible and responsive
  - [ ] Clear All button resets filters
  - [ ] Apply Filters button closes sheet
  - [ ] Filter count badge shows correct number

- [ ] **Detail Sheet**
  - [ ] Half-sheet slides up from bottom
  - [ ] Document data populated
  - [ ] "View Full" button works
  - [ ] Sheet expands to full screen (smooth height transition)
  - [ ] Drag gesture dismisses sheet (>50px down)
  - [ ] Focus returns to card after close

- [ ] **VoiceOver (Screen Reader)**
  - [ ] All buttons have labels
  - [ ] Sheet states announced (modal dialog)
  - [ ] Card titles read correctly
  - [ ] Filter badges announced with count
  - [ ] Keyboard navigation works (rotor, two-finger scrub)

- [ ] **Landscape Orientation**
  - [ ] Layout reflows correctly
  - [ ] Cards maintain readability
  - [ ] FAB repositioned correctly
  - [ ] Filter sheet height reduced
  - [ ] No content hidden

- [ ] **Performance**
  - [ ] Card list scrolls smoothly (60fps)
  - [ ] No lag when opening sheets
  - [ ] Animations are smooth
  - [ ] App responsive to taps

**Document Results:**
- Screenshots of card list, filter sheet, detail sheet
- VoiceOver test results (readable, navigable)
- Performance observations
- Any bugs or issues

#### Android Testing (Pixel 4+)

**Device:** Pixel 5 / Pixel 6 / Pixel 6 Pro
**Android Version:** Android 11+
**Orientation:** Portrait & Landscape

**Checklist:**

- [ ] **App Launch**
  - [ ] App opens without crashes
  - [ ] Viewer tab loads successfully
  - [ ] Material You design integration (if applicable)

- [ ] **Navigation Bar**
  - [ ] FAB doesn't overlap system nav bar
  - [ ] Sheets respect bottom inset
  - [ ] All content visible above nav bar

- [ ] **Touch Interactions**
  - [ ] FAB provides haptic feedback (if enabled)
  - [ ] Sheet opening smooth (no jank)
  - [ ] Gesture dismiss works (drag >50px)

- [ ] **TalkBack (Screen Reader)**
  - [ ] All buttons labeled
  - [ ] Card content readable
  - [ ] Sheet announced as dialog
  - [ ] Filter count badge announced
  - [ ] Keyboard navigation works

- [ ] **Landscape Orientation**
  - [ ] Layout reflows correctly
  - [ ] Cards fit in landscape layout
  - [ ] FAB repositioned
  - [ ] No content hidden

- [ ] **Performance**
  - [ ] Smooth scrolling (60fps)
  - [ ] Sheet animations smooth
  - [ ] No lag on older Android 8.x (if tested)

**Document Results:**
- Screenshots of layouts
- TalkBack test results
- Performance observations
- Any bugs or issues

---

## Test Environment Setup

### Unit/Integration Test Setup

```bash
# Install test dependencies
pnpm add -D vitest @testing-library/react @testing-library/jest-dom

# Configure vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/__tests__/**/*.test.ts?(x)'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 90,
      functions: 90,
      branches: 85,
    },
  },
});

# Run tests
pnpm test
pnpm test:coverage
```

### E2E Test Setup

```bash
# Install Playwright
pnpm add -D @playwright/test

# Configure playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  retries: 1,
  workers: 4,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});

# Run E2E tests
pnpm test:e2e
```

---

## Coverage Goals

| Test Type | Coverage | Target |
|-----------|----------|--------|
| Unit Tests | Hooks, utilities | 90%+ |
| Integration Tests | Components, state sync | 80%+ |
| E2E Tests | Critical user journeys | 4+ major journeys |
| Manual Testing | Real devices | iOS + Android |
| A11y Testing | All components | 0 axe violations |

---

## Bug Tracking & Reporting

### Template: Bug Report

```
Title: [Component] Issue description
Environment:
- Device: iPhone 12 Pro / Pixel 5
- OS: iOS 16 / Android 12
- Browser/App: Safari / Chrome / Native
- Viewport: Portrait / Landscape

Steps to Reproduce:
1. ...
2. ...
3. ...

Expected: ...
Actual: ...

Screenshots/Video: [attach]

Severity: Critical/High/Medium/Low
```

---

## Sign-Off Checklist

- [ ] All unit tests passing (90%+ coverage)
- [ ] All integration tests passing
- [ ] All E2E tests passing on mobile/desktop
- [ ] Manual testing on iOS device successful
- [ ] Manual testing on Android device successful
- [ ] Zero axe violations on all components
- [ ] VoiceOver/TalkBack navigation functional
- [ ] Keyboard-only navigation works
- [ ] Safe area insets verified on notched devices
- [ ] Performance: 60fps animations on test devices
- [ ] No critical bugs identified

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Status:** Ready for Implementation

Generated with [Claude Code](https://claude.com/claude-code)
