---
type: quick-feature-plan
feature_slug: context-subdomain-refactor
request_log_id: null
status: completed
created: 2026-01-06T18:30:00Z
completed_at: 2026-01-06T22:10:00Z
estimated_scope: medium
---

# Refactor Context Field: Add Free-Form Context + Rename Multi-Select to Subdomain

## Scope

The current `context: string[]` field is semantically misused - it's a multi-select categorical field but named "context" which implies free-form explanation. This refactor:
1. Renames current `context: string[]` → `subdomain: string[]` (categorical multi-select)
2. Adds new `context: string` (free-form single text field for actual context/background)

## Affected Files

### Core Layer
- `src/core/models/index.ts`: Update ItemDraft, RequestLogItem types; update FieldName; update type guards
- `src/core/serializer/index.ts`: Add context text serialization, rename context→subdomain serialization
- `src/core/serializer/item-update.ts`: Update updateItem to handle new context field
- `src/core/ports/index.ts`: Update FieldName if exported there

### Adapters
- Field option stores may need updates for new field name

### UI Layer
- `src/ui/wizard/ItemStep.tsx`: Add context text input; rename context→subdomain multiselect
- `src/ui/viewer/ItemCard.tsx`: Add context display; rename subdomain
- `src/ui/viewer/ItemEditForm.tsx`: Add context text field; rename subdomain

### CLI Layer
- `src/cli/commands/log/create.ts`: Accept new context field
- `src/cli/commands/log/append.ts`: Accept new context field
- `src/cli/interactive/validators.ts`: Add subdomain as valid field name

### Tests
- `src/core/models/models.test.ts`: Update type guard tests
- `src/core/serializer/serializer.test.ts`: Update serialization tests
- UI test files: Update to use new field names

## Implementation Steps

1. Update core models (types, type guards) → @backend-typescript-architect
2. Update serializer (serialize/parse for both fields) → @backend-typescript-architect
3. Update CLI commands → @backend-typescript-architect
4. Update UI components (wizard, viewer) → @ui-engineer-enhanced
5. Update tests → @backend-typescript-architect + @ui-engineer-enhanced
6. Run quality gates → verify all pass

## Testing

- Unit tests: Type guards, serializer parsing/writing
- Integration tests: Full wizard flow with both fields
- Snapshot tests: Markdown output format

## Completion Criteria

- [x] Core types updated (context: string, subdomain: string[])
- [x] Serializer handles both fields correctly
- [x] UI displays/edits both fields
- [x] CLI accepts both fields
- [x] All tests pass
- [x] Build succeeds
- [x] Typecheck passes

## Field Specification

### `subdomain` (renamed from context)
- Type: `string[]`
- Component: `MultiSelectCombobox`
- Purpose: Categorical classification within a domain (e.g., "authentication", "database", "api")
- Serialization: `**Subdomain:** value1, value2`

### `context` (new)
- Type: `string`
- Component: Single-line text input or textarea
- Purpose: Free-form explanation of the context/background for this item
- Serialization: `**Context:** Free form text here`
- Position in markdown: After Subdomain, before Tags
