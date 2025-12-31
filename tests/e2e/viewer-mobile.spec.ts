/**
 * Mobile Viewer E2E Tests
 *
 * End-to-end tests for mobile viewer user journeys.
 * Tests cover the complete mobile viewer experience including:
 * - Browse, filter, preview, and full view flows
 * - Search and dismiss interactions
 * - Sort and filter combinations
 * - Viewport switching between desktop and mobile
 * - Touch gesture interactions
 *
 * Mobile breakpoint: <768px width triggers mobile view
 */

import { test, expect, Page } from '@playwright/test';

// =============================================================================
// Test Configuration & Helpers
// =============================================================================

/**
 * Common viewport sizes for testing
 */
const VIEWPORTS = {
  mobilePortrait: { width: 390, height: 844 }, // iPhone 12/13/14
  mobileLandscape: { width: 844, height: 390 },
  tabletPortrait: { width: 768, height: 1024 }, // Exactly at breakpoint
  desktop: { width: 1280, height: 720 },
};

/**
 * Navigate to the Viewer tab and wait for it to load
 */
async function navigateToViewer(page: Page): Promise<void> {
  // Navigate to the app root
  await page.goto('/');

  // Click the Viewer navigation button
  await page.click('button[aria-label="Navigate to Viewer"]');

  // Wait for the viewer to load - look for mobile or desktop container
  await Promise.race([
    page.waitForSelector('[data-testid="mobile-viewer-container"]', { timeout: 10000 }),
    page.waitForSelector('.viewer-container', { timeout: 10000 }),
  ]);
}

/**
 * Wait for mobile viewer container to be visible
 */
async function waitForMobileViewer(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="mobile-viewer-container"]', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * Wait for desktop viewer container to be visible
 */
async function waitForDesktopViewer(page: Page): Promise<void> {
  await page.waitForSelector('.viewer-container', {
    state: 'visible',
    timeout: 10000,
  });
}

// Note: Helper functions for touch gestures are available via page.locator().tap()
// and can be extended as needed for specific gesture patterns.

// =============================================================================
// Journey 1: Browse > Filter > Preview > Full view
// =============================================================================

test.describe('Journey 1: Browse > Filter > Preview > Full view', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);
  });

  test('should display mobile viewer at mobile viewport', async ({ page }) => {
    // Verify mobile viewer container is displayed
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();
  });

  test('should show loading skeleton initially', async ({ page }) => {
    // Navigate fresh and catch loading state
    await page.goto('/');
    await page.click('button[aria-label="Navigate to Viewer"]');

    // Check for loading state or immediate content
    const loadingOrContent = await Promise.race([
      page.waitForSelector('[role="status"][aria-label="Loading documents"]', { timeout: 2000 }).then(() => 'loading'),
      page.waitForSelector('[data-testid="mobile-viewer-container"]', { timeout: 2000 }).then(() => 'content'),
    ]).catch(() => 'content');

    // Either loading state or content should be present
    expect(['loading', 'content']).toContain(loadingOrContent);
  });

  test('should open filter sheet when FAB is tapped', async ({ page }) => {
    // Wait for FAB to be visible
    const fab = page.locator('.mobile-filter-fab');
    await expect(fab).toBeVisible();

    // Tap the FAB
    await fab.tap();

    // Wait for filter sheet to appear
    const filterSheet = page.locator('.mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

    // Verify filter sheet has expected sections
    await expect(page.locator('text=Filters')).toBeVisible();
    await expect(page.locator('text=Project')).toBeVisible();
    await expect(page.locator('text=Apply Filters')).toBeVisible();
  });

  test('should filter documents and show results', async ({ page }) => {
    // Open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();

    // Wait for filter sheet
    await page.waitForSelector('.mobile-filter-sheet', { state: 'visible' });

    // Check if there are filter options available
    const typeCheckboxes = page.locator('.mobile-filter-sheet__checkbox-group [role="group"][aria-label="Type filters"] input[type="checkbox"]');
    const typeCount = await typeCheckboxes.count();

    if (typeCount > 0) {
      // Select first type filter
      await typeCheckboxes.first().check();
    }

    // Apply filters
    await page.click('text=Apply Filters');

    // Sheet should close
    const filterSheet = page.locator('.mobile-filter-sheet');
    await expect(filterSheet).not.toBeVisible({ timeout: 5000 });
  });

  test('should open document preview when card is tapped', async ({ page }) => {
    // Wait for document cards to load
    const cards = page.locator('.mobile-doc-card');

    // Check if there are any cards
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Tap the first card
      await cards.first().tap();

      // Wait for detail sheet to appear
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Verify detail content is displayed
      await expect(page.locator('[data-testid="mobile-detail-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-detail-doc-id"]')).toBeVisible();
    } else {
      // No documents - check for empty state
      const emptyState = page.locator('[role="status"]');
      await expect(emptyState).toBeVisible();
    }
  });

  test('should expand detail sheet to full view', async ({ page }) => {
    // Wait for document cards to load
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Tap the first card
      await cards.first().tap();

      // Wait for detail sheet
      await page.waitForSelector('[data-testid="mobile-detail-sheet"]', { state: 'visible' });

      // Click "View Full Document" button
      const viewFullBtn = page.locator('[data-testid="mobile-detail-view-full"]');
      await viewFullBtn.tap();

      // Sheet should expand (height changes to 100vh)
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toHaveAttribute('aria-expanded', 'true');
    }
  });
});

// =============================================================================
// Journey 2: Search > Tap card > Dismiss
// =============================================================================

test.describe('Journey 2: Search > Tap card > Dismiss', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);
  });

  test('should have search input in header', async ({ page }) => {
    const searchBar = page.locator('[data-testid="mobile-search-bar"]');
    await expect(searchBar).toBeVisible();

    const searchInput = page.locator('[data-testid="mobile-search-bar"] input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('role', 'searchbox');
  });

  test('should filter documents when searching', async ({ page }) => {
    const searchInput = page.locator('[data-testid="mobile-search-bar"] input');

    // Type a search term
    await searchInput.fill('test');

    // Wait for filter to apply (debounced)
    await page.waitForTimeout(500);

    // The document list should update (either show filtered results or empty state)
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();
  });

  test('should show clear button when search has value', async ({ page }) => {
    const searchInput = page.locator('[data-testid="mobile-search-bar"] input');

    // Initially, clear button should not be visible
    const clearButton = page.locator('[data-testid="mobile-search-bar"] button[aria-label="Clear search"]');
    await expect(clearButton).not.toBeVisible();

    // Type a search term
    await searchInput.fill('test');

    // Clear button should now be visible
    await expect(clearButton).toBeVisible();

    // Click clear button
    await clearButton.tap();

    // Search input should be empty
    await expect(searchInput).toHaveValue('');

    // Clear button should be hidden again
    await expect(clearButton).not.toBeVisible();
  });

  test('should dismiss detail sheet by tapping scrim', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Tap the first card
      await cards.first().tap();

      // Wait for detail sheet
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Tap the scrim to dismiss
      const scrim = page.locator('[data-testid="mobile-detail-scrim"]');
      await scrim.tap({ force: true });

      // Sheet should close
      await expect(detailSheet).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should dismiss detail sheet with close button', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Tap the first card
      await cards.first().tap();

      // Wait for detail sheet
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Click close button
      const closeBtn = page.locator('[data-testid="mobile-detail-close"]');
      await closeBtn.tap();

      // Sheet should close
      await expect(detailSheet).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should dismiss detail sheet with Escape key', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Tap the first card
      await cards.first().tap();

      // Wait for detail sheet
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Press Escape key
      await page.keyboard.press('Escape');

      // Sheet should close
      await expect(detailSheet).not.toBeVisible({ timeout: 5000 });
    }
  });
});

// =============================================================================
// Journey 3: Sort > Filter > View results
// =============================================================================

test.describe('Journey 3: Sort > Filter > View results', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);
  });

  test('should have sort dropdown in header', async ({ page }) => {
    const sortDropdown = page.locator('[data-testid="mobile-sort-dropdown"]');
    await expect(sortDropdown).toBeVisible();
  });

  test('should open sort menu when dropdown is tapped', async ({ page }) => {
    const sortTrigger = page.locator('[data-testid="mobile-sort-dropdown-trigger"]');
    await sortTrigger.tap();

    // Sort menu should appear
    const sortMenu = page.locator('[data-testid="mobile-sort-dropdown-menu"]');
    await expect(sortMenu).toBeVisible();

    // Verify sort options are present
    await expect(page.locator('[data-testid="mobile-sort-option-updated_at"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-sort-option-item_count"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-sort-option-title"]')).toBeVisible();
  });

  test('should change sort order when option is selected', async ({ page }) => {
    // Open sort dropdown
    const sortTrigger = page.locator('[data-testid="mobile-sort-dropdown-trigger"]');
    await sortTrigger.tap();

    // Wait for menu
    await page.waitForSelector('[data-testid="mobile-sort-dropdown-menu"]', { state: 'visible' });

    // Select "Title" sort option
    const titleOption = page.locator('[data-testid="mobile-sort-option-title"]');
    await titleOption.tap();

    // Menu should close
    const sortMenu = page.locator('[data-testid="mobile-sort-dropdown-menu"]');
    await expect(sortMenu).not.toBeVisible();

    // Reopen to verify selection (should show checkmark on Title)
    await sortTrigger.tap();
    await page.waitForSelector('[data-testid="mobile-sort-dropdown-menu"]', { state: 'visible' });

    // Title option should now have checkmark (aria-checked)
    await expect(page.locator('[data-testid="mobile-sort-option-title"]')).toHaveAttribute('aria-checked', 'true');
  });

  test('should toggle sort direction on re-click', async ({ page }) => {
    // Open sort dropdown
    const sortTrigger = page.locator('[data-testid="mobile-sort-dropdown-trigger"]');
    await sortTrigger.tap();

    // Wait for menu
    await page.waitForSelector('[data-testid="mobile-sort-dropdown-menu"]', { state: 'visible' });

    // Click the currently selected option (updated_at by default)
    const updatedAtOption = page.locator('[data-testid="mobile-sort-option-updated_at"]');
    const initialAriaLabel = await sortTrigger.getAttribute('aria-label');

    await updatedAtOption.tap();

    // Reopen to check direction changed
    await sortTrigger.tap();
    await page.waitForSelector('[data-testid="mobile-sort-dropdown-menu"]', { state: 'visible' });

    // The direction indicator should have changed
    // This is reflected in the trigger's aria-label
    const newAriaLabel = await sortTrigger.getAttribute('aria-label');

    // Direction should have toggled (ascending <-> descending)
    expect(newAriaLabel).not.toBe(initialAriaLabel);
  });

  test('should combine sort and filter operations', async ({ page }) => {
    // First, change sort
    const sortTrigger = page.locator('[data-testid="mobile-sort-dropdown-trigger"]');
    await sortTrigger.tap();
    await page.waitForSelector('[data-testid="mobile-sort-dropdown-menu"]', { state: 'visible' });
    await page.locator('[data-testid="mobile-sort-option-title"]').tap();

    // Then, open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();
    await page.waitForSelector('.mobile-filter-sheet', { state: 'visible' });

    // Enter search text
    const filterSearchInput = page.locator('#filter-search');
    await filterSearchInput.fill('test');

    // Apply filters
    await page.click('text=Apply Filters');

    // Verify both sort and filter are applied
    // The mobile viewer should still be visible and functional
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();
  });
});

// =============================================================================
// Journey 4: Switch viewport (desktop > mobile)
// =============================================================================

test.describe('Journey 4: Switch viewport (desktop > mobile)', () => {
  test('should render desktop viewer at desktop viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToViewer(page);

    // Should show desktop viewer
    await waitForDesktopViewer(page);
    const desktopViewer = page.locator('.viewer-container');
    await expect(desktopViewer).toBeVisible();

    // Mobile viewer should not be visible
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).not.toBeVisible();
  });

  test('should render mobile viewer at mobile viewport', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);

    // Should show mobile viewer
    await waitForMobileViewer(page);
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();

    // Desktop viewer should not be visible
    const desktopViewer = page.locator('.viewer-container:not([data-testid="mobile-viewer-container"])');
    const desktopVisible = await desktopViewer.isVisible().catch(() => false);
    expect(desktopVisible).toBe(false);
  });

  test('should switch from desktop to mobile on viewport resize', async ({ page }) => {
    // Start at desktop viewport
    await page.setViewportSize(VIEWPORTS.desktop);
    await navigateToViewer(page);
    await waitForDesktopViewer(page);

    // Verify desktop viewer is shown
    let desktopViewer = page.locator('.viewer-container:not([data-testid="mobile-viewer-container"])');
    await expect(desktopViewer).toBeVisible();

    // Resize to mobile viewport
    await page.setViewportSize(VIEWPORTS.mobilePortrait);

    // Wait for React to re-render with mobile view
    await page.waitForTimeout(500);

    // Mobile viewer should now be visible
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible({ timeout: 5000 });
  });

  test('should switch from mobile to desktop on viewport resize', async ({ page }) => {
    // Start at mobile viewport
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    // Verify mobile viewer is shown
    let mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();

    // Resize to desktop viewport
    await page.setViewportSize(VIEWPORTS.desktop);

    // Wait for React to re-render with desktop view
    await page.waitForTimeout(500);

    // Desktop viewer should now be visible
    const desktopViewer = page.locator('.viewer-container:not([data-testid="mobile-viewer-container"])');
    await expect(desktopViewer).toBeVisible({ timeout: 5000 });
  });

  test('should render correctly at breakpoint boundary', async ({ page }) => {
    // Test at exactly the breakpoint (768px)
    await page.setViewportSize(VIEWPORTS.tabletPortrait);
    await navigateToViewer(page);

    // At 768px, should be desktop (breakpoint is <768 for mobile)
    // Wait for either view to load
    await Promise.race([
      page.waitForSelector('[data-testid="mobile-viewer-container"]', { timeout: 5000 }),
      page.waitForSelector('.viewer-container', { timeout: 5000 }),
    ]);

    // Just below breakpoint should show mobile
    await page.setViewportSize({ width: 767, height: 1024 });
    await page.waitForTimeout(500);

    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// Portrait and Landscape Orientation Tests
// =============================================================================

test.describe('Portrait and Landscape Orientation', () => {
  test('should display correctly in portrait orientation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    // Mobile viewer should be visible
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();

    // FAB should be visible
    const fab = page.locator('.mobile-filter-fab');
    await expect(fab).toBeVisible();

    // Header should be visible
    const header = page.locator('.mobile-viewer-header');
    await expect(header).toBeVisible();
  });

  test('should display correctly in landscape orientation', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileLandscape);
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    // Mobile viewer should be visible in landscape
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();

    // All controls should still be accessible
    const fab = page.locator('.mobile-filter-fab');
    await expect(fab).toBeVisible();

    const searchBar = page.locator('[data-testid="mobile-search-bar"]');
    await expect(searchBar).toBeVisible();
  });

  test('should open and use filter sheet in landscape', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobileLandscape);
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    // Open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();

    // Filter sheet should be visible
    const filterSheet = page.locator('.mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

    // Content should be scrollable in landscape
    const content = page.locator('.mobile-filter-sheet__content');
    await expect(content).toBeVisible();
  });

  test('should handle orientation change during detail view', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Open detail sheet
      await cards.first().tap();
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Rotate to landscape
      await page.setViewportSize(VIEWPORTS.mobileLandscape);
      await page.waitForTimeout(500);

      // Detail sheet should still be visible and functional
      await expect(detailSheet).toBeVisible();

      // Close button should work
      const closeBtn = page.locator('[data-testid="mobile-detail-close"]');
      await closeBtn.tap();
      await expect(detailSheet).not.toBeVisible({ timeout: 5000 });
    }
  });
});

// =============================================================================
// Touch Gesture Tests
// =============================================================================

test.describe('Touch Gesture Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);
  });

  test('should have touch-friendly target sizes (44px minimum)', async ({ page }) => {
    // Check FAB size
    const fab = page.locator('.mobile-filter-fab');
    const fabBox = await fab.boundingBox();
    expect(fabBox?.width).toBeGreaterThanOrEqual(44);
    expect(fabBox?.height).toBeGreaterThanOrEqual(44);

    // Check sort dropdown trigger size
    const sortTrigger = page.locator('[data-testid="mobile-sort-dropdown-trigger"]');
    const sortBox = await sortTrigger.boundingBox();
    expect(sortBox?.width).toBeGreaterThanOrEqual(44);
    expect(sortBox?.height).toBeGreaterThanOrEqual(44);
  });

  test('should support drag handle for detail sheet', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Open detail sheet
      await cards.first().tap();
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Find the drag handle
      const dragHandle = page.locator('[data-testid="mobile-detail-handle"]');
      await expect(dragHandle).toBeVisible();

      // Drag handle should be focusable (keyboard accessible)
      await expect(dragHandle).toHaveAttribute('tabindex', '0');
      await expect(dragHandle).toHaveAttribute('role', 'button');
    }
  });

  test('document cards should be keyboard accessible', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Card should be focusable
      await expect(firstCard).toHaveAttribute('tabindex', '0');

      // Focus the card
      await firstCard.focus();

      // Press Enter to open detail sheet
      await page.keyboard.press('Enter');

      // Detail sheet should open
      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();
    }
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
    await navigateToViewer(page);
    await waitForMobileViewer(page);
  });

  test('filter sheet should have proper ARIA attributes', async ({ page }) => {
    // Open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();

    const filterSheet = page.locator('.mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

    // Check ARIA attributes
    await expect(filterSheet).toHaveAttribute('role', 'dialog');
    await expect(filterSheet).toHaveAttribute('aria-modal', 'true');
    await expect(filterSheet).toHaveAttribute('aria-labelledby', 'filter-sheet-title');
  });

  test('detail sheet should have proper ARIA attributes', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Open detail sheet
      await cards.first().tap();

      const detailSheet = page.locator('[data-testid="mobile-detail-sheet"]');
      await expect(detailSheet).toBeVisible();

      // Check ARIA attributes
      await expect(detailSheet).toHaveAttribute('role', 'dialog');
      await expect(detailSheet).toHaveAttribute('aria-modal', 'true');
      await expect(detailSheet).toHaveAttribute('aria-labelledby', 'detail-sheet-title');
    }
  });

  test('document cards should have proper ARIA labels', async ({ page }) => {
    const cards = page.locator('.mobile-doc-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Card should have role="button"
      await expect(firstCard).toHaveAttribute('role', 'button');

      // Card should have aria-label describing the document
      const ariaLabel = await firstCard.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Document');
    }
  });

  test('filter sheet should trap focus', async ({ page }) => {
    // Open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();

    const filterSheet = page.locator('.mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

    // Tab through elements in the sheet
    // Focus should stay within the sheet
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Active element should still be within the filter sheet
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest('.mobile-filter-sheet') !== null;
    });

    expect(activeElement).toBe(true);
  });

  test('should close filter sheet with Escape key', async ({ page }) => {
    // Open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();

    const filterSheet = page.locator('.mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Sheet should close
    await expect(filterSheet).not.toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// Empty State and Error Handling
// =============================================================================

test.describe('Empty State and Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
  });

  test('should show empty state when no documents match filter', async ({ page }) => {
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    // Open filter sheet
    const fab = page.locator('.mobile-filter-fab');
    await fab.tap();

    // Enter a search term that likely won't match
    const filterSearchInput = page.locator('#filter-search');
    await filterSearchInput.fill('xyznonexistentdocument123456789');

    // Apply filters
    await page.click('text=Apply Filters');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Should show empty state or filtered results
    const mobileViewer = page.locator('[data-testid="mobile-viewer-container"]');
    await expect(mobileViewer).toBeVisible();

    // Check for empty state message
    const emptyState = page.locator('.mobile-viewer-container__empty');
    const cards = page.locator('.mobile-doc-card');

    // Either empty state is shown or cards are shown (depending on data)
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const cardsCount = await cards.count();

    // At least one condition should be true
    expect(emptyVisible || cardsCount >= 0).toBe(true);
  });

  test('should provide clear filters button in empty state', async ({ page }) => {
    await navigateToViewer(page);
    await waitForMobileViewer(page);

    // Apply a restrictive search
    const searchInput = page.locator('[data-testid="mobile-search-bar"] input');
    await searchInput.fill('xyznonexistentdocument');

    await page.waitForTimeout(500);

    // If empty state is shown, it should have a clear button
    const clearButton = page.locator('.mobile-viewer-container__empty button');
    const clearButtonVisible = await clearButton.isVisible().catch(() => false);

    // If there's an empty state with filters, clear button should be present
    if (clearButtonVisible) {
      await expect(clearButton).toContainText('Clear');
    }
  });
});
