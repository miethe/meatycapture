---
type: quick-feature-plan
feature_slug: filter-bar-overhaul
request_log_id: null
status: completed
created: 2026-01-31T00:00:00Z
completed_at: 2026-01-31T16:00:00Z
estimated_scope: medium
---

# Filter Bar Overhaul - Visual + Functional Fix

## Scope

Fix the Viewer tab filter bar: visual layout issues (dropdowns hidden behind scroll, truncated text, cramped fields) and wire up non-functional filters (Type, Domain, Priority, Status, Tags). Add missing filter fields (Feature, Subdomain) with project-aware conditional display.

## Problems Identified

### Visual Issues
1. Filter controls cramped with `min-width: 5rem` and `max-width: 8rem` - too small
2. `overflow-x: auto` on `.viewer-filters-row` causes dropdowns to require scrolling
3. Dropdown menus positioned inside scroll container, not portaled properly
4. Text truncation due to tight spacing

### Functional Issues
1. `extractFilterOptions()` in `@core/catalog/utils.ts` only populates `projects` - all other fields empty
2. FilterState/FilterOptions missing `subdomain` and `feature` fields
3. No project-aware field visibility (domain/feature/tags should only show after project selected)

## Affected Files

| File | Change |
|------|--------|
| `src/core/catalog/types.ts` | Add `subdomains`, `features` to FilterOptions; add to FilterState |
| `src/core/catalog/utils.ts` | Fix `extractFilterOptions()` to extract all fields from documents |
| `src/ui/viewer/DocumentFilters.tsx` | Add Subdomain/Feature filters; project-aware visibility; layout fixes |
| `src/ui/viewer/viewer.css` | Fix filter sizing, overflow, dropdown positioning |
| `src/ui/viewer/FilterDropdown.tsx` | Use portal for dropdown menu to escape scroll container |

## Implementation Steps

1. **Fix FilterOptions extraction** → @backend-typescript-architect
   - Update `src/core/catalog/types.ts`: Add `subdomains: string[]`, `features: string[]` to FilterOptions and FilterState
   - Update `src/core/catalog/utils.ts`: Implement proper `extractFilterOptions()` that reads documents and extracts unique values for all fields

2. **Fix CSS layout issues** → @ui-engineer-enhanced
   - Remove `overflow-x: auto` from `.viewer-filters-row`
   - Use CSS Grid for better control
   - Increase min-width for filter controls
   - Use responsive wrapping with `flex-wrap: wrap`

3. **Portal dropdown menus** → @ui-engineer-enhanced
   - Update `FilterDropdown.tsx` to use Radix UI Portal or React Portal
   - Ensure dropdowns render outside scroll container
   - Fix z-index stacking

4. **Add Subdomain/Feature filters** → @ui-engineer-enhanced
   - Add FilterDropdown components for subdomain and feature
   - Wire up onChange handlers
   - Add to FilterState consumption

5. **Project-aware field visibility** → @ui-engineer-enhanced
   - Domain, Subdomain, Feature, Tags filters hidden until project selected
   - Show conditional message or collapse

## Testing

- Visual: Filter bar displays all fields without scrolling at 1024px viewport
- Visual: Dropdown menus visible and positioned correctly
- Functional: Type/Domain/Priority/Status filters populate with values from documents
- Functional: Selecting filters actually filters the catalog
- Functional: Project-specific fields appear only after project selection

## Completion Criteria

- [x] All filter dropdowns populate with extracted values
- [x] Layout responsive without horizontal scroll
- [x] Dropdowns render above other content (using fixed positioning)
- [x] Project-aware conditional fields work (Domain/Subdomain/Feature show only when project selected)
- [x] Tests pass (137 focused tests, typecheck clean)
- [x] Build succeeds

## Changes Made

### Core Types (`src/core/catalog/types.ts`)
- Added `subdomains: string[]` and `features: string[]` to `FilterOptions`
- Added `subdomains: string[]` and `features: string[]` to `FilterState`
- Updated `createEmptyFilter()`, `createEmptyFilterOptions()`, `isFilterEmpty()`, `getActiveFilterCount()`

### Filter Extraction (`src/core/catalog/utils.ts`)
- Updated `extractFilterOptions()` to accept optional `documentCache` parameter
- Now extracts all filter values (types, domains, subdomains, features, priorities, statuses, tags) from cached documents

### ViewerContainer (`src/ui/viewer/ViewerContainer.tsx`)
- Passes document cache to `extractFilterOptions()` after preloading documents
- Filter dropdowns now populate with actual values

### CSS Layout (`src/ui/viewer/viewer.css`)
- Changed `flex-wrap: nowrap` to `flex-wrap: wrap` for responsive layout
- Removed `overflow-x: auto` that was clipping dropdowns
- Increased `min-width` from `5rem` to `8rem` and `max-width` from `8rem` to `12rem`
- Changed dropdown menu to `position: fixed` with `z-index: 1000`
- Added responsive breakpoint for mobile (2 filters per row)

### FilterDropdown (`src/ui/viewer/FilterDropdown.tsx`)
- Added position calculation for fixed dropdown menus
- Calculates `top`/`left`/`width` based on trigger button's bounding rect

### DocumentFilters (`src/ui/viewer/DocumentFilters.tsx`)
- Added Subdomain filter with `Component1Icon`
- Added Feature filter with `StackIcon`
- Wrapped Domain/Subdomain/Feature in `{filterState.project_id && ...}` conditionals
- Added filter badges for subdomains and features
- Updated `hasActiveFilters` to include new fields
