---
paths: src/cli/**/*.ts, src/adapters/api-client/**/*.ts, src/core/ports/**/*.ts, src/server/**/*.ts
---

# Documentation Sync: CLI and API Reference

When modifying CLI commands or API-related code, update the corresponding documentation.

## CLI Documentation

**File:** `docs/user/cli/cli-usage.md`

Update when:
- Adding new CLI commands or subcommands
- Changing command options or flags
- Modifying command behavior or output format
- Adding new exit codes or error messages

Sections to update:
- Command reference (usage, options, examples)
- JSON input format (if changed)
- Error handling section
- Automation examples (if relevant)

## API Reference Documentation

**File:** `docs/dev/architecture/api-reference.md`

Update when:
- Modifying port interfaces (`src/core/ports/`)
- Adding/changing API endpoints (`src/server/`)
- Updating adapter implementations (`src/adapters/api-client/`)
- Changing request/response schemas
- Adding new error types or codes

Sections to update:
- Port interface definitions
- HTTP API endpoints table
- Error handling patterns
- Data models (if changed)

## Feature Parity Matrix

**File:** `docs/dev/architecture/feature-parity-matrix.md`

Update when:
- Adding new capabilities to CLI or API
- Removing deprecated features
- Changing feature behavior significantly

## Checklist

Before committing CLI or API changes:
- [ ] CLI usage guide reflects new/changed commands
- [ ] API reference reflects interface changes
- [ ] Feature parity matrix updated if capability added/removed
- [ ] Examples in docs still work with changes
