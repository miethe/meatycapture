# Bug Fixes - December 2025

## 2025-12-17: Viewer Tab Blank Screen (Select.Item Empty Value)

**Symptom**: Clicking on the Viewer tab showed a blank screen despite documents loading correctly. Console error: `A <Select.Item /> must have a value prop that is not an empty string.`

**Root Cause**: In `DocumentFilters.tsx`, the "All Projects" Select.Item used `value=""` which Radix UI Select explicitly prohibits. Empty strings are reserved for clearing selections.

**Fix**: Replaced empty string with sentinel value `__all__`:
- Added constant: `const ALL_PROJECTS_VALUE = '__all__';`
- Updated handler to check for sentinel instead of empty string
- Updated Select.Root value using nullish coalescing (`??`)
- Updated Select.Item value prop

**Files Changed**: `src/ui/viewer/DocumentFilters.tsx`

**Commit**: (see git log)
