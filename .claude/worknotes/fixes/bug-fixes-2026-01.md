# Bug Fixes - January 2026

## Feature Field Persistence Fixes

**Date Fixed**: 2026-01-20
**Severity**: high
**Component**: viewer, server/schemas

### Issue

The Feature field was not persisting correctly in request log documents:
1. Feature values set during creation or editing were lost on document save
2. Feature field options created in the edit flow were not persisted to the project's field catalog
3. Creation and edit flows maintained separate field options lists instead of sharing a universal project-level catalog

### Root Causes

**Root Cause 1: Server Validation Stripping Feature Field**
- Location: `src/server/schemas/docs.ts:validateRequestLogItem()`
- The `validateRequestLogItem` function did not include the `feature` field in its result object
- When documents were written via `POST /api/docs/:doc_id`, items lost their `feature` field during validation

**Root Cause 2: Missing Field Options in Edit Flow**
- Location: `src/ui/viewer/DocumentDetail.tsx`, `src/ui/viewer/ItemCard.tsx`
- The `DocumentDetail` component was not passing `fieldOptions` to `ItemCard`
- `ItemCard` fell back to using only the current item's values instead of the project's full field catalog
- Users could only select from feature values that already existed on that item

**Root Cause 3: No Field Option Persistence from Edit Flow**
- Location: `src/ui/viewer/ItemCard.tsx`, `src/ui/viewer/ViewerContainer.tsx`
- When users added new field options during editing, they were only stored in local React state
- The `fieldCatalogStore.addOption()` was never called from the edit flow
- New options were lost on refresh/reload

### Fix

**Fix 1: Add Feature Field to Server Validation**
Added feature field preservation in validateRequestLogItem().

**Fix 2: Pass Field Options Through Component Chain**
- Added `fieldCatalogStore` prop to `ViewerContainerProps`
- `ViewerContainer` loads field options per project using `fieldCatalogStore.getForProject()`
- Field options flow: `ViewerContainer` -> `DocumentCatalog` -> `DocumentRow` -> `DocumentDetail` -> `ItemCard`

**Fix 3: Persist New Field Options from Edit Flow**
- Added `onAddFieldOption` callback prop through the component chain
- When users add new field values in `ItemCard`, the callback calls `fieldCatalogStore.addOption()`
- New options are persisted to the project's field catalog and become available in both flows

### Files Modified

- `src/server/schemas/docs.ts` - Added feature field to validateRequestLogItem
- `src/ui/viewer/types.ts` - Added FieldOptions interface and fieldCatalogStore prop
- `src/ui/viewer/ViewerContainer.tsx` - Load and manage project field options
- `src/ui/viewer/DocumentCatalog.tsx` - Pass fieldOptions and callback props
- `src/ui/viewer/DocumentRow.tsx` - Pass fieldOptions and callback to DocumentDetail
- `src/ui/viewer/DocumentDetail.tsx` - Pass fieldOptions and callback to ItemCard
- `src/ui/viewer/ItemCard.tsx` - Call onAddFieldOption when adding new options
- `src/App.tsx` - Pass fieldCatalogStore to ViewerContainer

### Testing

- TypeScript type checking passes
- Serializer tests pass (99 tests)
- Docs route tests pass (26 tests)
- Fields route tests pass (32 tests)
- Item update tests pass (33 tests)

### Status

RESOLVED
