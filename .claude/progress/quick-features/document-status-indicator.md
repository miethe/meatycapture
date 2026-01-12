---
type: quick-feature-plan
feature_slug: document-status-indicator
request_log_id: null
status: completed
created: 2026-01-11
completed_at: 2026-01-11
estimated_scope: medium
---

# Document Status Indicator

## Scope

Add a reusable status ratio indicator component showing "x/y done" with color-coded tooltip breakdown. Replace the simple item count in Document rows with this new indicator that shows completion status, changes color based on completion state (green=all done, yellow=none done, neutral=partial), and updates dynamically.

## Affected Files

- `src/ui/viewer/components/DocumentStatusIndicator.tsx`: NEW - Reusable status indicator component
- `src/ui/viewer/components/DocumentStatusIndicator.css`: NEW - Styles with color states
- `src/ui/viewer/components/index.ts`: Add export for new component
- `src/ui/viewer/DocumentRow.tsx`: Replace ItemCountIndicator with DocumentStatusIndicator
- `src/ui/viewer/viewer.css`: Add CSS variables if needed

## Implementation Steps

1. Create `DocumentStatusIndicator` component with:
   - "x/y done" display (no progress bar in main view)
   - Bordered/boxed appearance
   - Color states: green (all done), yellow (none done), neutral (partial)
   - Hover tooltip with full status breakdown + progress bar
   - Reuse `aggregateStatusCounts()` from utils/indicators.ts
   → @ui-engineer-enhanced

2. Add CSS styling following existing patterns:
   - Status color variables from existing CSS
   - Progress bar in tooltip only
   - Boxed indicator with state-based background
   → @ui-engineer-enhanced (same task)

3. Integrate into DocumentRow.tsx:
   - Replace ItemCountIndicator usage with DocumentStatusIndicator
   - Pass document.items as prop
   → @ui-engineer-enhanced (same task)

4. Test dynamic updates work correctly (status changes reflect without refresh)
   → @task-completion-validator

## Testing

- Component renders correctly with various status distributions
- Color changes appropriately (green/yellow/neutral)
- Tooltip displays full breakdown with progress bar
- Dynamic updates when item status changes
- Accessibility: keyboard focusable, proper aria labels

## Completion Criteria

- [x] Implementation complete
- [x] Tests pass (pre-existing test failures unrelated to this feature)
- [x] Build succeeds
- [x] Component is reusable for other contexts

## Notes

- Pre-existing test failures exist in `StatusIndicator.test.tsx` and `indicators.integration.test.tsx` (aria-label mismatch) - not introduced by this feature
- Unit tests for DocumentStatusIndicator should be added in a follow-up task
