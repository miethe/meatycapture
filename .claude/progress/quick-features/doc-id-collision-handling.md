---
type: quick-feature-plan
feature_slug: doc-id-collision-handling
request_log_id: null
status: completed
completed_at: 2026-02-07
created: 2026-02-07
estimated_scope: small
---

# Doc ID Collision Handling

## Scope
When creating a new document, if a file already exists at the generated path (REQ-YYYYMMDD-slug.md), automatically resolve the collision by appending a sequential suffix like `-a`, `-b`, etc. to both the doc_id and filename. This must work transparently across CLI, web UI, and desktop without user interaction.

## Design Decision
- New function `resolveUniqueDocPath(basePath, docStore)` in core/validation
- Scans directory for existing files matching the base doc_id pattern
- Returns next available suffix: base (no suffix), then `-a`, `-b`, `-c`... `-z`
- Also returns the resolved doc_id for use in the document
- Updates DOC_ID_PATTERN and ITEM_ID_PATTERN to accept optional letter suffix
- Suffix pattern: `-[a-z]` appended after slug, before item number

## Affected Files
- `src/core/validation/index.ts`: Update patterns, add `resolveUniqueDocId` function
- `src/cli/commands/log/create.ts`: Use collision resolution when generating output path
- `src/ui/wizard/WizardFlow.tsx`: Use collision resolution when creating new docs
- `src/core/validation/validation.test.ts`: Add tests for new patterns and resolution
- `tests/cli/commands/log.test.ts`: Update CLI tests

## Implementation Steps
1. Update validation patterns & add resolveUniqueDocId → @backend-typescript-architect
2. Integrate into CLI create command → @backend-typescript-architect
3. Integrate into UI WizardFlow → @ui-engineer-enhanced
4. Add unit tests → @backend-typescript-architect

## Testing
- Unit tests for pattern changes and collision resolution
- Verify existing doc_id parsing still works
- Verify collision generates correct suffix sequence

## Completion Criteria
- [x] Implementation complete
- [x] Tests pass (91/91 validation tests, 2811/2813 total — 2 flaky pre-existing)
- [x] Build succeeds
- [x] Typecheck clean
