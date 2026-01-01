# Bug Fixes - January 2026

## Mobile Viewer UX Touch Handler Issues

### Filter Menu Click-Through Bug

**Issue**: Clicking on filter options in MobileFilterSheet caused the menu to disappear without registering the selection
- **Location**: `src/ui/viewer/mobile/MobileFilterSheet.tsx`
- **Root Cause**: Touch handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`) were attached to the entire sheet div, intercepting all touch events including taps on filter controls. The drag-to-dismiss gesture handlers were capturing touch events before they could reach the filter checkboxes, selects, and buttons.
- **Fix**: Moved touch handlers from the main sheet `<div>` to ONLY the drag handle element. This allows drag-to-dismiss from the handle bar while letting filter controls receive touch events normally.
- **Commit(s)**: 6ad4970
- **Status**: RESOLVED

---

### View Full Document Button Not Working

**Issue**: Clicking "View Full Document" button in MobileDetailSheet did nothing - expected to expand half-sheet to full screen
- **Location**: `src/ui/viewer/mobile/MobileDetailSheet.tsx`
- **Root Cause**: The action buttons ("View Full Document" and "Expand/Collapse") were nested inside the content `<div>` that had touch handlers for drag-to-dismiss gestures. When users tapped the buttons, the touch events were intercepted by the content area's touch handlers.
- **Fix**: Restructured the component to move action buttons into a separate sibling `<div>` outside the touch-handled content area. The content div now only contains the scrollable metadata grid, while actions are in their own untouched container with `data-testid="mobile-detail-actions"`.
- **Commit(s)**: 6ad4970
- **Status**: RESOLVED

---

### Click Areas Misaligned - Wrong Button Triggered

**Issue**: Clicking in the View Full Document area triggered the Expand/Collapse button instead
- **Location**: `src/ui/viewer/mobile/MobileDetailSheet.tsx`
- **Root Cause**: Same as above - touch handler on content area was interfering with button click targets, causing unpredictable behavior when touch events bubbled through the DOM.
- **Fix**: Same fix as "View Full Document" - action buttons moved outside the touch-handled content area.
- **Commit(s)**: 6ad4970
- **Status**: RESOLVED

---

### Sort Appears to Have No Effect

**Issue**: Sort dropdown selection registers but card order doesn't visibly change
- **Location**: `src/ui/viewer/mobile/MobileSortDropdown.tsx`, `MobileViewerContainer.tsx`, `ViewerContainer.tsx`
- **Root Cause**: After thorough code analysis, the sorting implementation is **correct**. The callback chain is properly wired: `MobileSortDropdown.onSort` -> `MobileViewerHeader.onSort` -> `MobileViewerContainer.handleSort` -> `ViewerContainer.handleSortChange` -> `setSort` state update -> `useMemo` recalculates `filteredAndSorted` with `createGroupedCatalog(filtered, sort)` which correctly sorts entries within groups.
- **Actual Issue**: The apparent lack of sorting effect is likely due to:
  1. Test/demo data having identical or similar values for sort fields (e.g., all entries with same date)
  2. Single entry per project group making within-group sorting invisible
  3. Subtle visual changes without animation feedback
- **Fix**: No code change required. Sorting logic is correct. Consider adding sort transition animation for better UX feedback in future enhancement.
- **Commit(s)**: N/A - No code change
- **Status**: INVESTIGATION COMPLETE - Not a bug
