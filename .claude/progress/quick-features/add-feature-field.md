# Quick Feature: Add Feature Field to Request Log Items

**Status:** completed
**Date:** 2026-01-11
**Type:** Enhancement

## Overview

Added a new optional multi-select "Feature" field to request log items for linking items to features, PRDs, epics, etc.

## Requirements

- Add optional `feature: string[]` field to ItemDraft and RequestLogItem models
- Support backward compatibility (old items without feature field should parse correctly)
- Add UI component in wizard for selecting/adding feature values
- Support field options catalog for feature values
- Serialize/deserialize feature field in markdown format

## Implementation Summary

### 1. Core Model Updates ✅

**File:** `src/core/models/index.ts`

- Added `'feature'` to `FieldName` type (line 41)
- Added `feature: string[]` to `ItemDraft` interface (line 111)
- Added `feature?: string[]` to `RequestLogItem` interface (line 144, optional for backward compatibility)
- Updated `isFieldOption` type guard to include 'feature' (line 460)
- Updated `isItemDraft` type guard to validate feature array (line 492-493)
- Updated `isRequestLogItem` type guard with backward-compatible feature validation (lines 515-517, 530)

### 2. Serializer Updates ✅

**File:** `src/core/serializer/index.ts`

**Serialization (lines 315-318):**
```typescript
// Include feature if non-empty array (optional for backward compatibility)
if (item.feature && item.feature.length > 0) {
  lines.push(`**Feature:** ${item.feature.join(', ')}`);
}
```

**Parsing (lines 596-604):**
```typescript
// Parse feature line (array of comma-separated values, optional for backward compatibility)
const featureMatch = content.match(/\*\*Feature:\*\*\s*([^\n]+)/);
const featureStr = featureMatch?.[1]?.trim() || '';
const feature = featureStr
  ? featureStr
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0)
  : [];
```

**Item Building (lines 639-641):**
```typescript
// Add feature only if present (avoids undefined assignment with exactOptionalPropertyTypes)
if (feature.length > 0) {
  item.feature = feature;
}
```

### 3. UI Components ✅

**File:** `src/ui/wizard/ItemStep.tsx`

- Added `featureOptions` memoization (lines 91-94)
- Added feature select/remove/add handlers (lines 175-198)
- Added MultiSelectCombobox component for Feature field (lines 428-439)
  - Positioned after Context and before Priority
  - Label: "Feature"
  - Helper text: "Linked features (PRD, Epic, etc.)"
  - Tooltip: "Link this item to one or more features, PRDs, or epics for tracking"

**File:** `src/ui/wizard/WizardFlow.tsx`

- Updated EMPTY_DRAFT with `feature: []` (line 85)
- Added `feature: []` to fieldOptions state initialization (line 136)
- Added `feature: []` to field options grouping (line 261)

### 4. Test Updates ✅

Fixed all ItemDraft initializations across test files:
- `src/adapters/api-client/api-doc-store.test.ts` (2 occurrences)
- `src/cli/interactive/utils.ts` (1 occurrence)
- `src/core/models/models.test.ts` (4 occurrences)
- `src/server/routes/docs.test.ts` (1 occurrence)
- `src/server/schemas/docs.ts` (1 occurrence with validation)
- `tests/cli/helpers.ts` (1 occurrence)

## Quality Gates

✅ **TypeCheck:** Passes with no errors
✅ **Build:** Successful compilation
🔄 **Tests:** Running (all modified test files passed during development)
⚠️ **Lint:** Pre-existing errors unrelated to this change

## Backward Compatibility

The implementation ensures full backward compatibility:

1. **Parsing:** Old documents without `**Feature:**` line are parsed successfully with empty feature array
2. **Serialization:** Feature line only written when array is non-empty
3. **Type Guards:** `isRequestLogItem` accepts items with or without feature field (optional)
4. **UI:** Empty feature array is valid state

## Markdown Format

### New Item with Feature:
```markdown
## REQ-20260111-project-01 - Item Title

**Type:** enhancement | **Domain:** web, api | **Priority:** medium | **Status:** triage
**Subdomain:** auth, security
**Context:** Background information
**Feature:** User Auth PRD, Login Epic
**Tags:** security, ux
```

### Old Item (still valid):
```markdown
## REQ-20251231-project-01 - Old Item

**Type:** bug | **Domain:** web | **Priority:** high | **Status:** done
**Tags:** bugfix
```

## Field Options Integration

The feature field integrates with the existing field options catalog system:
- Supports global and project-scoped options
- Users can add new feature values inline via the "Add+" button
- Feature values are stored in `fields.json` alongside other field options
- Admin UI will automatically show feature options for management

## Usage

1. **Wizard Flow:** Select/add features in the Item Details step
2. **Field Options:** Manage feature catalog in Admin UI (existing functionality)
3. **Markdown:** Feature field appears after Context, before Tags
4. **Multi-select:** Users can link items to multiple features

## Files Modified

1. `src/core/models/index.ts` - Model definitions and type guards
2. `src/core/serializer/index.ts` - Parsing and serialization
3. `src/ui/wizard/ItemStep.tsx` - UI component and handlers
4. `src/ui/wizard/WizardFlow.tsx` - State initialization
5. Multiple test files - Test data updates

## Notes

- Feature field follows the same pattern as domain/subdomain/tags
- Uses `MultiSelectCombobox` component for consistent UX
- No database migrations needed (file-based storage)
- No breaking changes to existing functionality
