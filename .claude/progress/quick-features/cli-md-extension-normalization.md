---
type: quick-feature-plan
feature_slug: cli-md-extension-normalization
request_log_id: null
status: completed
created: 2026-01-29T00:00:00Z
completed_at: 2026-01-29T00:00:00Z
estimated_scope: small
---

# CLI .md Extension Normalization

## Scope

Refactor the CLI to support request log file references with or without the `.md` extension. Users can now use `REQ-20251215-myproject` or `REQ-20251215-myproject.md` interchangeably.

## Affected Files

- `src/cli/handlers/path-resolver.ts`: **NEW** - Centralized path resolution utility
- `src/cli/commands/log/view.ts`: Replace local `resolveDocPath` with shared utility
- `src/cli/commands/log/note-add.ts`: Replace local `resolveDocPath` with shared utility
- `src/cli/commands/log/item-update.ts`: Replace local `resolveDocPath` with shared utility
- `src/cli/commands/log/delete.ts`: Add REQ pattern support using shared utility
- `src/cli/handlers/path-resolver.test.ts`: **NEW** - Unit tests for path resolver

## Implementation Steps

1. Create centralized `resolveDocPath` utility with extension normalization → @backend-typescript-architect
2. Update all CLI commands to use shared utility → @backend-typescript-architect
3. Add comprehensive unit tests → @backend-typescript-architect

## Testing

- Unit tests for path resolver: with/without `.md`, absolute paths, REQ pattern matching
- Integration: verify CLI commands accept both forms

## Completion Criteria

- [x] Centralized path-resolver.ts created
- [x] All CLI log commands use shared utility
- [x] Extension normalization works (add `.md` if missing)
- [x] Tests pass (34/34)
- [ ] Build succeeds (blocked by pre-existing TypeScript errors)
