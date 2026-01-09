---
type: quick-feature-plan
feature_slug: viewer-polish-fixes
request_log_id: null
status: completed
completed_at: 2026-01-09T00:00:00Z
created: 2026-01-09T00:00:00Z
estimated_scope: medium
---

# Viewer Polish Fixes

## Scope

Polish fixes for the Viewer tab following the viewer-indicators-v1 implementation:
1. Fix horizontal overflow caused by excessive padding/margins
2. Reposition TypeDistributionIndicator to immediate left of Document ID column
3. Enable preloading of document data so indicators display without user interaction
4. Update tooltip styling for single-line display

## Root Cause Analysis

### Issue 1: Horizontal Overflow
- `.viewer-metadata-cell` has `min-width: 20rem` (320px minimum)
- `.doc-row-metadata` uses `gap: 1rem` (16px between all items)
- TypeDistributionIndicator badges use `white-space: nowrap`
- No flex-wrap on `.doc-row-metadata` prevents responsive behavior

### Issue 2: TypeDistributionIndicator Position
- Currently positioned after tags inside `.doc-row-metadata` (rightmost)
- Should be moved to immediately left of Document ID column for visibility
- Requires restructuring DocumentRow layout

### Issue 3: Indicators Not Visible Without Expansion
- Indicators conditionally render only when `document?.items` exists
- Documents are loaded on-demand only when row is expanded
- ProjectGroupRow uses `getProjectDocuments()` which only returns cached docs
- Need to preload documents on page load for indicators to display

### Issue 4: Multi-line Tooltips
- `.tooltip-content` has `white-space: normal` and `max-width: 16rem`
- Need `white-space: nowrap` for single-line tooltips
- May need to remove or increase max-width

## Affected Files
- `src/ui/viewer/viewer.css`: Reduce padding/margins, fix tooltip styling
- `src/ui/viewer/DocumentRow.tsx`: Restructure to move TypeDistributionIndicator
- `src/ui/viewer/DocumentCatalog.tsx`: Implement document preloading
- `src/ui/viewer/ViewerContainer.tsx`: Add preload logic on catalog load
- `src/ui/shared/Tooltip.css`: Update for single-line display

## Implementation Steps
1. Fix horizontal overflow in viewer.css → @ui-engineer-enhanced
2. Move TypeDistributionIndicator in DocumentRow.tsx → @ui-engineer-enhanced
3. Add document preloading in ViewerContainer/DocumentCatalog → @ui-engineer-enhanced
4. Update tooltip CSS for single-line display → @ui-engineer-enhanced

## Testing
- Visual verification of layout on different viewport widths
- Verify indicators display immediately on page load
- Verify tooltips appear on single line
- Run existing tests to ensure no regressions

## Completion Criteria
- [x] No horizontal scrolling required on Viewer tab
- [x] TypeDistributionIndicator visible to left of Document ID
- [x] All indicators visible immediately without expanding documents
- [x] Tooltips display on single line
- [x] All relevant tests pass (pre-existing failures unrelated to changes)
- [x] Build succeeds
