---
title: Version Bump Workflow
created: 2026-01-21
updated: 2026-01-21
status: active
---

# Version Bump Workflow

This document describes the automated version bumping workflow using Changesets and GitHub Actions.

## Overview

MeatyCapture uses [Changesets](https://github.com/changesets/changesets) for version management. When changesets are merged to main, the GitHub Action automatically creates a "Version Bump" pull request that:

1. Consumes pending changesets
2. Updates `package.json` version
3. Updates/creates `CHANGELOG.md`

## Workflow File

**Location:** `.github/workflows/version-bump.yml`

The workflow triggers on every push to `main` and checks for pending changesets. If changesets exist, it creates or updates a release PR.

## How It Works

### 1. Developer Flow

```bash
# Make changes to the codebase
# ...

# Add a changeset describing your changes
pnpm changeset

# Follow prompts:
# - Select bump type (patch/minor/major)
# - Describe the change

# Commit the changeset with your changes
git add .
git commit -m "feat: add new feature"
git push
```

### 2. PR Merge to Main

When a PR with changesets merges to main:

1. GitHub Action triggers
2. Detects pending changesets
3. Runs `pnpm run version` which:
   - Bumps version in `package.json`
   - Updates `CHANGELOG.md`
   - Deletes consumed changeset files
4. Creates/updates "Version Bump" PR

### 3. Release PR

The automated PR contains:
- Version bump in `package.json`
- Aggregated changelog entries
- Commit message: `chore: version bump`

Maintainers review and merge this PR to complete the version bump.

## Changeset Types

| Type | When to Use | Example |
|------|-------------|---------|
| `patch` | Bug fixes, documentation | Fix typo in help text |
| `minor` | New features (backward compatible) | Add new CLI command |
| `major` | Breaking changes | Change command syntax |

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm changeset` | Create a new changeset (interactive) |
| `pnpm changeset status` | View pending changesets |
| `pnpm run version` | Apply changesets locally (usually done by CI) |
| `pnpm changeset add --empty` | Add empty changeset for no-release changes |

## Configuration

**File:** `.changeset/config.json`

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.2/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Key settings:
- `baseBranch`: `main` - Release PR targets main branch
- `access`: `public` - Package will be published publicly
- `commit`: `false` - CI handles commits, not the CLI

## Workflow Permissions

The workflow requires:
- `contents: write` - To push version changes
- `pull-requests: write` - To create/update release PRs

These permissions are scoped to the workflow and use `GITHUB_TOKEN`.

## Concurrency

The workflow uses concurrency controls:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

This ensures:
- Only one version bump runs at a time
- Rapid successive pushes cancel in-progress runs

## Troubleshooting

### No PR Created

If the workflow runs but no PR appears:
1. Check if changesets exist: `pnpm changeset status`
2. Verify workflow permissions in repository settings
3. Check GitHub Actions logs for errors

### Version Not Updated

If version stays the same:
1. Ensure changeset files are in `.changeset/` directory
2. Verify changeset format (YAML frontmatter with package name)
3. Check that changeset specifies correct package (`meatycapture`)

### Changelog Missing Entries

If changelog does not include expected changes:
1. Verify changeset was committed before PR merge
2. Check changeset content has description text
3. Ensure changeset was not already consumed

## Related Documentation

- [Homebrew Tap Setup](/docs/setup/homebrew-tap-setup.md)
- [ADR-001: npm Package Naming](/docs/decisions/ADR-001-cli-npm-scope.md)
- [Changesets Documentation](https://github.com/changesets/changesets)

## Next Steps

After version bump completes:

1. **NPM-002**: Automated npm publish (separate workflow)
2. **REL-001**: GitHub release creation
3. **REL-005**: Homebrew formula update
