---
# === CLI DISTRIBUTION CONTEXT ===
# Development notes and observations for CLI distribution feature

type: context
prd: "cli-distribution-v1"
title: "CLI Distribution & Packaging - Development Context"
status: "active"
created: "2026-01-18"
updated: "2026-01-18"

critical_notes_count: 2
implementation_decisions_count: 3
active_gotchas_count: 1
agent_contributors: ["planning-skill"]

agents:
  - { agent: "planning-skill", note_count: 6, last_contribution: "2026-01-18" }
---

# CLI Distribution & Packaging - Development Context

**Status**: Active Development
**Created**: 2026-01-18
**Last Updated**: 2026-01-18

> **Purpose**: This is a shared worknotes file for all AI agents working on CLI distribution. Add brief observations, decisions, gotchas, and implementation notes that future agents should know.

---

## Quick Reference

**Agent Notes**: 6 notes from 1 agent
**Critical Items**: 2 items requiring attention
**Last Contribution**: planning-skill on 2026-01-18

---

## Implementation Decisions

### 2026-01-18 - planning-skill - Separate package strategy

**Decision**: CLI, Web, and Desktop will be packaged separately rather than as a single monolithic distribution.

**Rationale**: Each has different distribution needs - CLI needs npm/brew/binaries, web is static deploy, desktop uses Tauri's native updater.

**Location**: PRD Section 10 and Implementation Plan "Decision" section

**Impact**: Simplifies build pipelines, allows independent versioning, but requires coordination for shared core updates.

---

### 2026-01-18 - planning-skill - Bun compile as primary binary bundler

**Decision**: Use Bun compile over pkg or Node.js SEA for standalone binary generation.

**Rationale**: Smaller binaries, faster compilation, modern toolchain. pkg as fallback if compatibility issues arise.

**Location**: Implementation Plan Phase 3 "Binary Bundler Evaluation"

**Impact**: Requires Bun installation in CI, but produces significantly smaller executables (~15-30MB vs 50-80MB with pkg).

---

### 2026-01-18 - planning-skill - Homebrew tap over core formula

**Decision**: Create self-hosted Homebrew tap (meatycapture/homebrew-tap) rather than submitting to homebrew-core.

**Rationale**: No review process delays, full control over formula, can update immediately on release.

**Location**: Implementation Plan Phase 4

**Impact**: Users must `brew tap meatycapture/tap` first, but avoids homebrew-core submission requirements.

---

## Gotchas & Observations

### 2026-01-18 - planning-skill - npm scope availability uncertain

**What**: The @meatycapture npm scope may or may not be available.

**Why**: npm scopes are first-come-first-served and the name hasn't been registered yet.

**Solution**: Task PKG-003 checks availability early. If unavailable, use unscoped `meatycapture-cli` or alternative scope like `@meaty/capture-cli`.

**Affects**: PKG-001, NPM-002, all documentation referencing package name

---

## Integration Notes

### 2026-01-18 - planning-skill - CLI build system

**From**: build-cli.js (esbuild)
**To**: npm publish / binary bundler
**Method**: esbuild produces dist/cli/index.js, then either npm pack (for npm) or Bun compile (for binaries)
**Notes**: The existing build-cli.js already handles shebang injection and chmod. Bun compile will need the built output or may compile directly from source.

---

### 2026-01-18 - planning-skill - Changesets to GitHub Releases

**From**: @changesets/cli
**To**: GitHub Releases workflow
**Method**: Changesets creates CHANGELOG.md entries, release workflow extracts notes for GitHub Release body
**Notes**: Use `changesets/action` GitHub Action for automated version bumps and changelog generation.

---

## Agent Handoff Notes

### 2026-01-18 - planning-skill -> devops-architect / backend-typescript-architect

**Completed**: PRD and Implementation Plan created with 4 phases and 24 tasks. Progress tracking artifacts created.

**Next**: Begin Phase 1 - PKG-001 through PKG-005. Parallel tasks: PKG-001, PKG-002, PKG-003, PKG-004 can all start simultaneously.

**Watch Out For**:
- Check npm scope availability early (PKG-003) - affects many downstream tasks
- build-cli.js already exists - audit it (PKG-002) before modifying package.json
- Changesets (PKG-004) should be configured before version bump workflow (PKG-005)

---

## References

**Related Files**:
- PRD: `docs/project_plans/PRDs/features/cli-distribution-v1.md`
- Implementation Plan: `docs/project_plans/implementation_plans/features/cli-distribution-v1.md`
- Progress Tracking: `.claude/progress/cli-distribution/all-phases-progress.md`
- Current CLI build: `build-cli.js`
- Current package.json: `package.json`

**External Docs**:
- [npm publishing guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Bun compile docs](https://bun.sh/docs/bundler/executables)
- [Changesets documentation](https://github.com/changesets/changesets)
- [Homebrew formula cookbook](https://docs.brew.sh/Formula-Cookbook)

---

## Critical Notes

### npm Token Security

**Severity**: Critical
**Note**: NPM_TOKEN must be stored as a GitHub Secret with minimal scope (publish only). Never commit tokens to the repository. Consider using npm automation tokens with IP restrictions.

### Version Coordination

**Severity**: High
**Note**: When CLI version changes, ensure Homebrew formula SHA256 updates automatically. The REL-006 task handles this via GitHub Action, but manual releases will require manual formula updates.
