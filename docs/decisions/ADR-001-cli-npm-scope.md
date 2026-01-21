# ADR-001: npm Package Naming for MeatyCapture CLI

**Status:** Proposed
**Date:** 2026-01-21
**Decision Makers:** MeatyCapture maintainers

## Context

MeatyCapture CLI requires an npm package name for global installation via `npm install -g`. The package name affects:

- User experience (typing the install command)
- Brand recognition and discoverability
- Future extensibility for additional packages
- Namespace conflicts with other packages

### Availability Check (2026-01-21)

| Package Name | Status |
|-------------|--------|
| `@meatycapture/cli` | **Available** (scoped) |
| `meatycapture` | **Available** (unscoped) |
| `meatycapture-cli` | **Available** (unscoped) |

All three options are currently available on the npm registry.

## Options Evaluated

### Option 1: `@meatycapture/cli` (Scoped)

| Pros | Cons |
|------|------|
| Clear organizational namespace | Requires creating npm organization |
| Extensible (`@meatycapture/core`, `@meatycapture/viewer`) | Slightly longer install command |
| Zero conflict risk with existing packages | Org management overhead |
| Professional appearance for multi-package projects | May feel heavyweight for single CLI |
| Follows pattern of major CLI tools (`@angular/cli`, `@nestjs/cli`) | |

**Install command:** `npm install -g @meatycapture/cli`

### Option 2: `meatycapture` (Unscoped, Short)

| Pros | Cons |
|------|------|
| Shortest install command | Name squatting risk if abandoned |
| Simple, memorable | No namespace for future packages |
| Direct brand association | Less clear it's a CLI specifically |
| Lower barrier to entry | Potential confusion if core library needed |

**Install command:** `npm install -g meatycapture`

### Option 3: `meatycapture-cli` (Unscoped, Explicit)

| Pros | Cons |
|------|------|
| Clear purpose in name | Longer than necessary |
| No npm org required | Inconsistent if adding `meatycapture-core` later |
| Common convention (`vercel-cli`, `netlify-cli`) | Hyphenated names less elegant |
| Distinguishes from potential library package | No namespace protection |

**Install command:** `npm install -g meatycapture-cli`

## Decision

**Recommended: `meatycapture`** (Option 2)

### Rationale

1. **Simplicity wins for CLI tools.** Users type `npm install -g meatycapture` and immediately get the tool. No mental overhead parsing scopes or suffixes.

2. **Binary name alignment.** The CLI binary will be `mc` (for quick access) with `meatycapture` as the full command. Having `npm install -g meatycapture` then running `meatycapture` creates perfect symmetry.

3. **Current scope is single-package.** MeatyCapture is a focused capture tool. The architecture (headless core in same repo) doesn't require separate npm packages. YAGNI applies.

4. **Migration path exists.** If future needs require multiple packages, we can:
   - Create `@meatycapture` org later
   - Deprecate `meatycapture` pointing to `@meatycapture/cli`
   - This is a well-established pattern (see `create-react-app` evolution)

5. **Name is distinctive.** "MeatyCapture" is unique enough that conflicts are unlikely. It's not a generic term like "capture" or "logger".

### Rejected Alternatives

- **`@meatycapture/cli`**: Over-engineering for current needs. Adds npm org management complexity without clear benefit. Can migrate to this later if needed.

- **`meatycapture-cli`**: The `-cli` suffix is redundant when the package IS the CLI. No separate library package exists or is planned.

## Consequences

### Positive

- Minimal friction for installation
- Clean command-line experience
- No npm organization setup required
- Matches project's YAGNI philosophy

### Negative

- Must monitor for potential name squatting if project pauses
- If multi-package architecture needed later, migration required
- No explicit namespace reservation

### Neutral

- Binary will still be `mc` (short) and `meatycapture` (full)
- Package.json `name` field will be `meatycapture`

## Implementation Notes

- PKG-001 task will set `"name": "meatycapture"` in package.json
- Binary names configured in `"bin"` field: `{"mc": "./dist/cli.js", "meatycapture": "./dist/cli.js"}`
- Consider adding npm org `@meatycapture` reservation in future if project grows

## References

- [npm scoped packages documentation](https://docs.npmjs.com/cli/v10/using-npm/scope)
- [npm naming rules](https://docs.npmjs.com/package-name-guidelines)
