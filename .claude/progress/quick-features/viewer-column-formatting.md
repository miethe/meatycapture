# Quick Feature: Viewer Tab Column Formatting

**Status:** completed
**Created:** 2026-01-13
**Estimated Complexity:** Medium (single session)

## Feature Description

Update the Viewer tab's document table to improve column formatting:
1. Replace Document ID column with an info icon that shows tooltip on hover and copies ID on click
2. Expand Title column into the space saved
3. Split Metadata column into individual columns: Item Status, Modified Date, Tags
4. Item Status column should have fixed width/position for consistent alignment
5. Tags column should use remaining space with truncation and hover tooltip for full list

## Files Affected

| File | Changes |
|------|---------|
| `src/ui/viewer/DocumentCatalog.tsx` | Update column definitions |
| `src/ui/viewer/DocumentRow.tsx` | Implement new cell renderers |
| `src/ui/viewer/viewer.css` | Column width/styling updates |

## Implementation Plan

### Phase 1: Column Structure Changes

1. **DocumentCatalog.tsx** - Update column definitions:
   - Remove `doc_id` column (replace with `docInfo` icon column)
   - Keep `title` column (will expand automatically)
   - Split `metadata` into: `itemStatus`, `modifiedDate`, `tags`
   - Set fixed widths: `docInfo: 40px`, `itemStatus: 80px`, `modifiedDate: 100px`

2. **DocumentRow.tsx** - New cell renderers:
   - `DocInfoCell`: Info icon with Tooltip (shows doc_id) + copy-on-click
   - `ItemStatusCell`: StatusIndicator component (already exists as `x/y done`)
   - `ModifiedDateCell`: Calendar icon + formatted date
   - `TagsCell`: Tag chips with ellipsis overflow + Tooltip for full list

### Phase 2: Styling Updates

3. **viewer.css** - Column widths and styling:
   - Fixed width for docInfo icon column (narrow)
   - Fixed width for itemStatus column (consistent alignment)
   - Fixed width for modifiedDate column
   - Flex/remaining width for Title and Tags columns
   - Tooltip styling for tags overflow

### Existing Patterns to Reuse

- `Tooltip` component from `src/ui/shared/Tooltip.tsx`
- `copyToClipboard` utility from `src/ui/shared/browserCompat.ts`
- Copy feedback pattern from `ItemCard.tsx`
- `StatusIndicator` component already used in DocumentRow

## Quality Gates

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

## Completion Criteria

- [x] Info icon replaces Document ID column
- [x] Info icon shows doc_id on hover
- [x] Clicking info icon copies doc_id to clipboard with feedback
- [x] Title column uses expanded space
- [x] Item Status column has fixed position
- [x] Modified Date column displays correctly
- [x] Tags column truncates with tooltip for full list
- [x] All changed file tests pass (45/45 DocumentRow tests)
- [x] TypeScript compiles without errors
- [x] Build succeeds

## Quality Gate Results

| Check | Status | Notes |
|-------|--------|-------|
| `pnpm typecheck` | ✅ Pass | No errors |
| `pnpm build` | ✅ Pass | Built in 1.45s |
| `pnpm test DocumentRow` | ✅ Pass | 45/45 tests |
| `pnpm lint` | ⚠️ Pre-existing issues | 7 errors unrelated to changes |

Note: Pre-existing test failures in `notes-viewer.integration.test.tsx` (16 tests) confirmed to fail on main branch before changes.
