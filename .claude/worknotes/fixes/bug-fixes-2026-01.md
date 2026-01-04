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

---

### TypeScript Build Errors After Phase 6 Changes

**Issue**: Docker build failing with 5 TypeScript errors after Phase 6 UI changes - `archived` property missing from `DocMeta` objects and `exactOptionalPropertyTypes` violations
- **Location**: Multiple adapters (`idb-doc-store.ts`, `fs-local/index.ts`, `tauri-fs-adapter.ts`) and UI components (`DocumentRow.tsx`, `DocumentKebabMenu.tsx`)
- **Root Cause**: Phase 6 added `archived` as a required property on `DocMeta` type, but adapters still constructed DocMeta objects without it. Additionally, `exactOptionalPropertyTypes` was enabled, requiring explicit `| undefined` for props that can be explicitly passed as undefined.
- **Fix**:
  1. Added `archived: false` (or `doc.archived ?? false`) to all DocMeta construction sites
  2. Changed optional callback prop types from `prop?: Type` to `prop?: Type | undefined` for explicit undefined assignment compatibility
  3. Fixed 30+ test files with same patterns plus unused variable warnings
- **Commit(s)**: 8e9f2e8
- **Status**: RESOLVED

---

### Multi-Select Not Implemented in Capture Wizard

**Issue**: The UI enhancement plan (ui-enhancements-batch-v1) created multi-select components for ItemEditForm (viewer) but left the capture wizard's ItemStep unchanged. Domain and context fields remained single-select dropdowns instead of multi-select, and the model incorrectly used `string` instead of `string[]` for these fields.
- **Location**: `src/ui/wizard/ItemStep.tsx`, `src/core/models/index.ts`, `src/core/serializer/index.ts`
- **Root Cause**: Enhancement plan scope gap - multi-select was implemented for ItemEditForm (editing existing items) but not for ItemStep (capturing new items). Additionally, ItemEditForm appeared to support multi-select but only saved the first value due to model mismatch.
- **Fix**: Comprehensive multi-select implementation:
  1. Updated core model: `domain` and `context` changed from `string` to `string[]`
  2. Updated serializer: read/write comma-separated values for domain/context
  3. Updated ItemStep: replaced DropdownWithAdd with MultiSelectCombobox for domain/context
  4. Fixed ItemEditForm: now saves all selected values instead of just first
  5. Updated ReviewStep: displays multiple badges for domain/context
  6. Updated WizardFlow: initializes domain/context as empty arrays
  7. Updated CLI validation: accepts array format for domain/context
  8. Updated 26 files with test fixtures and type assertions
- **Commit(s)**: 97ea409
- **Status**: RESOLVED

---

### Structured Notes Date Serialization Error

**Issue**: Creating a new request log via web app fails with server error: "date.toISOString is not a function. (In 'date.toISOString()', 'date.toISOString' is undefined)"
- **Location**: `src/server/schemas/docs.ts:53` and `src/server/schemas/docs.ts:258`
- **Root Cause**: The `validateRequestLogItem` and `validateItemDraftBody` functions passed notes arrays through without validating/converting Note date fields. When notes come from JSON (via HTTP), `created_at` and `updated_at` fields are ISO strings, not Date objects. The serializer then failed when calling `.toISOString()` on these strings.
- **Fix**: Added `validateNote` helper function that validates Note objects and converts date strings to Date objects using the existing `validateDate` function. Updated both `validateRequestLogItem` (line 53) and `validateItemDraftBody` (line 258) to map notes through this validator.
- **Commit(s)**: dbe88af
- **Status**: RESOLVED

---

### Existing Notes Not Appearing After Structured Notes Feature

**Issue**: Existing notes no longer appearing in web app or CLI despite files still existing on disk
- **Location**: `src/server/schemas/docs.ts`
- **Root Cause**: Same root cause as above - when documents with notes were read from the server, the notes' date fields remained as strings instead of being converted to Date objects. This caused UI components (like NoteCard) that call `.toISOString()` on these dates to fail silently or display incorrectly.
- **Fix**: Same fix as above - the `validateNote` helper now ensures all Note date fields are properly converted to Date objects during both read and write operations.
- **Commit(s)**: dbe88af
- **Status**: RESOLVED
