---
title: "Implementation Plan: CLI Distribution & Packaging"
description: "Detailed phased implementation for multi-channel CLI distribution with npm, Homebrew, and standalone binaries"
audience: [ai-agents, developers]
tags: [implementation, planning, phases, distribution, devops, packaging]
created: 2026-01-18
updated: 2026-01-18
category: "product-planning"
status: draft
related:
  - /docs/project_plans/PRDs/features/cli-distribution-v1.md
  - /docs/project_plans/PRDs/features/cli-v1.md
---

# Implementation Plan: CLI Distribution & Packaging

**Plan ID**: `IMPL-2026-01-18-CLI-DISTRIBUTION`
**Date**: 2026-01-18
**Author**: Planning Skill
**Related Documents**:
- **PRD**: `/docs/project_plans/PRDs/features/cli-distribution-v1.md`

**Complexity**: Large
**Total Estimated Effort**: 34 story points
**Target Timeline**: 4 phases over ~2-3 sprints

## Executive Summary

This plan implements a comprehensive distribution strategy for MeatyCapture CLI, enabling installation via npm global install, Homebrew, and standalone binaries. The implementation follows a layered approach: first establishing npm publishing infrastructure, then building standalone binaries, automating GitHub Releases, and finally creating Homebrew distribution. Each phase is independently valuable and deployable.

## Implementation Strategy

### Architecture Sequence

Unlike typical feature development (DB → API → UI), this infrastructure feature follows:

1. **Package Configuration** - Prepare package.json for publishing
2. **Version Management** - Semantic versioning with changesets
3. **npm Publishing** - CI/CD workflow for npm registry
4. **Binary Generation** - Cross-platform standalone executables
5. **Release Automation** - GitHub Releases with assets
6. **Homebrew Distribution** - Formula and tap management

### Parallel Work Opportunities

- Phase 1-2 (npm + versioning) must be sequential
- Phase 3 (binaries) can start once Phase 1 package config is done
- Phase 4 (Homebrew) depends on Phase 3 completion
- Documentation can be written in parallel throughout

### Critical Path

```
Package Config → Version Setup → npm Workflow → Binary Builds → Release Workflow → Homebrew
```

### Decision: CLI vs Web vs Desktop Packaging

**Recommendation: Separate Packages**

| Component | Package Strategy | Distribution Channel |
|-----------|-----------------|---------------------|
| CLI | `@meatycapture/cli` on npm | npm, brew, GitHub binaries |
| Core | Internal dependency (not published) | Bundled into CLI/web |
| Web | Static deploy artifact | Vercel/Netlify/self-host |
| Desktop | Tauri app (future) | GitHub Releases, auto-update |

**Rationale:**
- CLI needs Node.js package ecosystem integration
- Web is static HTML/JS, doesn't need npm package
- Desktop uses Tauri's native updater, separate from npm
- Core shared logic bundled into each at build time

---

## Phase Breakdown

### Phase 1: npm Publishing Foundation

**Duration**: 5-8 story points
**Dependencies**: None
**Assigned Subagent(s)**: backend-typescript-architect, devops-architect

#### Objective
Configure package.json and build system for npm publishing. CLI becomes installable via `npm install -g @meatycapture/cli`.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| PKG-001 | Package.json Publishing Config | Add files, exports, type, engines fields | `npm pack` creates valid tarball | 2 pts | backend-typescript-architect | None |
| PKG-002 | Build Script Audit | Verify build-cli.js produces publishable output | dist/cli/index.js has shebang, is executable | 1 pt | backend-typescript-architect | None |
| PKG-003 | npm Scope Decision | Check @meatycapture availability, decide scope | Scope documented in ADR | 1 pt | backend-typescript-architect | None |
| PKG-004 | Changesets Setup | Add @changesets/cli for version management | `pnpm changeset` creates changeset | 2 pts | devops-architect | None |
| PKG-005 | Version Bump Workflow | GitHub Action to apply changesets on merge | Version bumps automatically | 2 pts | devops-architect | PKG-004 |

**Phase 1 Quality Gates:**
- [ ] `npm pack` produces tarball with correct files
- [ ] `tar -tf *.tgz` shows bin, dist, package.json
- [ ] `pnpm changeset` workflow documented
- [ ] npm scope decision recorded

**Phase 1 Deliverables:**
- Updated package.json with publishing config
- Changesets configuration (.changeset/config.json)
- GitHub Action: version-bump.yml
- ADR for npm scope decision

---

### Phase 2: npm Publish Workflow

**Duration**: 5-7 story points
**Dependencies**: Phase 1 complete
**Assigned Subagent(s)**: devops-architect

#### Objective
Automate npm publishing on version tags. Push a tag, npm package updates automatically.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| NPM-001 | npm Token Secret | Add NPM_TOKEN to GitHub Secrets | Secret configured in repo settings | 0.5 pt | devops-architect | PKG-005 |
| NPM-002 | Publish Workflow | GitHub Action triggered on v* tags | npm publish executes on tag push | 3 pts | devops-architect | NPM-001 |
| NPM-003 | Publish Dry Run | Add --dry-run flag for PRs | PR CI shows what would publish | 1 pt | devops-architect | NPM-002 |
| NPM-004 | npm README | Ensure README displays on npm page | npm package page shows docs | 1 pt | documentation-writer | NPM-002 |
| NPM-005 | First Publish Test | Manual test publish of v0.1.0-beta | Package installable from npm | 1 pt | devops-architect | NPM-002 |

**Phase 2 Quality Gates:**
- [ ] `npm install -g @meatycapture/cli` works (after publish)
- [ ] CLI available as `meatycapture` command
- [ ] Version shown via `meatycapture --version`
- [ ] npm package page shows README content

**Phase 2 Deliverables:**
- GitHub Action: npm-publish.yml
- NPM_TOKEN configured in secrets
- First beta version published

---

### Phase 3: Standalone Binary Generation

**Duration**: 10-12 story points
**Dependencies**: Phase 1 package config (can parallel with Phase 2)
**Assigned Subagent(s)**: backend-typescript-architect, devops-architect

#### Objective
Generate standalone binaries that run without Node.js. Support 5 platforms: macOS (arm64, x64), Linux (x64, arm64), Windows (x64).

#### Binary Bundler Evaluation

| Tool | Pros | Cons | Recommendation |
|------|------|------|----------------|
| **Bun compile** | Fast, small output, modern | Bun runtime, less mature | Recommended |
| **pkg** | Mature, well-documented | Large binaries, Node.js baggage | Fallback |
| **Node.js SEA** | Official, no extra deps | Complex, experimental | Not recommended |
| **esbuild + custom** | Full control | Significant work | Not recommended |

**Decision: Use Bun compile as primary, evaluate during implementation**

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| BIN-001 | Bundler Evaluation | Test Bun compile with CLI | Decision documented, POC works | 2 pts | backend-typescript-architect | PKG-002 |
| BIN-002 | Local Binary Build | Script to build single-platform binary | `bun build --compile` produces executable | 2 pts | backend-typescript-architect | BIN-001 |
| BIN-003 | Build Matrix Config | Configure 5-platform build matrix | Matrix defined in workflow YAML | 2 pts | devops-architect | BIN-002 |
| BIN-004 | macOS Builds | CI builds for darwin-arm64, darwin-x64 | Both binaries execute on respective arch | 2 pts | devops-architect | BIN-003 |
| BIN-005 | Linux Builds | CI builds for linux-x64, linux-arm64 | Both binaries execute on respective arch | 2 pts | devops-architect | BIN-003 |
| BIN-006 | Windows Build | CI build for win32-x64 | Binary executes on Windows | 2 pts | devops-architect | BIN-003 |
| BIN-007 | Binary Naming Convention | Consistent naming: meatycapture-{os}-{arch} | All binaries follow convention | 0.5 pt | backend-typescript-architect | BIN-004 |

**Phase 3 Quality Gates:**
- [ ] All 5 binaries generated in CI
- [ ] Binaries execute without Node.js installed
- [ ] Binary size < 50MB each
- [ ] `--version` flag works on all platforms
- [ ] Core CLI commands functional in binaries

**Phase 3 Deliverables:**
- build-binary.js or Bun build script
- GitHub Action: build-binaries.yml (matrix job)
- 5 platform-specific binaries

---

### Phase 4: GitHub Releases & Homebrew

**Duration**: 10-12 story points
**Dependencies**: Phase 2 & Phase 3 complete
**Assigned Subagent(s)**: devops-architect, documentation-writer

#### Objective
Automate GitHub Releases with binary assets. Create Homebrew tap for macOS/Linux installation.

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| REL-001 | Release Workflow | GitHub Action creates release on tag | Release created with changelog | 3 pts | devops-architect | NPM-002 |
| REL-002 | Asset Upload | Attach binaries to GitHub Release | All 5 binaries downloadable | 2 pts | devops-architect | REL-001, BIN-006 |
| REL-003 | Release Notes Gen | Auto-generate notes from changesets | Release has meaningful description | 1 pt | devops-architect | REL-001 |
| REL-004 | Homebrew Tap Repo | Create meatycapture/homebrew-tap | Tap repo exists with README | 1 pt | devops-architect | None |
| REL-005 | Formula Creation | Write meatycapture.rb formula | Formula syntax valid | 2 pts | documentation-writer | REL-004 |
| REL-006 | Formula Auto-Update | Action to update formula on release | Formula SHA256 updates automatically | 2 pts | devops-architect | REL-005 |
| REL-007 | Brew Install Test | Test `brew install meatycapture/tap/meatycapture` | CLI installs and runs | 1 pt | devops-architect | REL-006 |

**Homebrew Formula Structure:**
```ruby
class Meatycapture < Formula
  desc "Lightweight capture app for logging enhancements/bugs/ideas"
  homepage "https://github.com/user/meatycapture"
  version "1.0.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/.../releases/download/v1.0.0/meatycapture-darwin-arm64"
      sha256 "..."
    else
      url "https://github.com/.../releases/download/v1.0.0/meatycapture-darwin-x64"
      sha256 "..."
    end
  end

  on_linux do
    url "https://github.com/.../releases/download/v1.0.0/meatycapture-linux-x64"
    sha256 "..."
  end

  def install
    bin.install "meatycapture-*" => "meatycapture"
  end
end
```

**Phase 4 Quality Gates:**
- [ ] GitHub Release created automatically on tag
- [ ] All 5 binaries attached to release
- [ ] `brew tap meatycapture/tap` works
- [ ] `brew install meatycapture` installs CLI
- [ ] Release notes generated from changesets

**Phase 4 Deliverables:**
- GitHub Action: release.yml (combined workflow)
- meatycapture/homebrew-tap repository
- meatycapture.rb formula
- GitHub Action in tap: update-formula.yml

---

## Documentation Tasks

Documentation runs parallel to all phases:

| Task ID | Task Name | Description | Acceptance Criteria | Estimate | Subagent(s) | Dependencies |
|---------|-----------|-------------|-------------------|----------|-------------|--------------|
| DOC-001 | Installation Guide | All 4 install methods documented | README updated | 2 pts | documentation-writer | NPM-005 |
| DOC-002 | Troubleshooting Guide | Common issues and solutions | Troubleshooting section added | 1 pt | documentation-writer | REL-007 |
| DOC-003 | Contributing Guide | How to develop and release | CONTRIBUTING.md updated | 1 pt | documentation-writer | REL-007 |
| DOC-004 | Uninstall Instructions | Removal instructions per method | Documented in README | 0.5 pt | documentation-writer | DOC-001 |

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| Bun compile compatibility issues | High | Medium | Fallback to pkg, test early |
| npm scope unavailable | Medium | Low | Use unscoped or alternative |
| Binary size bloat | Low | Medium | Profile and tree-shake |
| Windows binary issues | Medium | Medium | Test in Windows CI runner |

### Schedule Risks

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|------------|-------------------|
| CI runner availability | Low | Low | Use self-hosted runners if needed |
| npm registry issues | Medium | Low | Retry logic in workflow |
| Homebrew review delays | Low | Medium | Use tap (no review needed) |

---

## Resource Requirements

### Agents by Phase

| Phase | Primary Agent | Secondary Agent | Documentation |
|-------|---------------|-----------------|---------------|
| Phase 1 | backend-typescript-architect | devops-architect | - |
| Phase 2 | devops-architect | - | documentation-writer |
| Phase 3 | backend-typescript-architect | devops-architect | - |
| Phase 4 | devops-architect | documentation-writer | documentation-writer |

### External Resources

- npm registry account with publishing rights
- GitHub repository secrets (NPM_TOKEN)
- Homebrew tap repository (separate repo)
- macOS/Linux/Windows CI runners (GitHub provides)

### Skills Required

- GitHub Actions workflow authoring
- npm publishing ecosystem
- Shell scripting (bash)
- Ruby basics (Homebrew formula)
- Cross-platform build systems

---

## Success Metrics

### Delivery Metrics

| Metric | Target |
|--------|--------|
| All 4 phases complete | Yes |
| npm package published | Yes |
| 5 platform binaries | Yes |
| Homebrew formula working | Yes |
| Documentation complete | Yes |

### User Experience Metrics

| Metric | Target |
|--------|--------|
| Install time (any method) | < 30 seconds |
| Post-restart availability | 100% |
| `--version` accuracy | 100% |
| Binary execution without Node | Yes |

---

## Required Skillsets & Specialized Agents

### Agent Capabilities Matrix

| Agent | npm Publishing | CI/CD | Binary Bundling | Homebrew | Priority |
|-------|---------------|-------|-----------------|----------|----------|
| **devops-architect** | Medium | High | Medium | Medium | Primary |
| **backend-typescript-architect** | High | Medium | High | Low | Primary |
| **documentation-writer** | Low | Low | Low | Medium | Supporting |

### Capability Gaps & Recommendations

**Gap 1: npm Publishing Expertise**
- Current agents have general knowledge but not deep npm expertise
- **Mitigation**: Use npm documentation, test in private registry first

**Gap 2: Homebrew Formula Authoring**
- No existing agent specializes in Ruby/Homebrew DSL
- **Mitigation**: Formula is ~30 lines, follow templates from similar projects (fnm, volta)

**Gap 3: Cross-Platform Binary Testing**
- Limited ability to test Windows binaries
- **Mitigation**: Rely on CI, add Windows user testing

### Skills vs Agents Mapping

| Skill | Best Agent | Alternative |
|-------|-----------|-------------|
| package.json optimization | backend-typescript-architect | devops-architect |
| GitHub Actions authoring | devops-architect | backend-typescript-architect |
| Binary bundler selection | backend-typescript-architect | spike-writer (research) |
| Homebrew formula writing | documentation-writer + templates | devops-architect |
| Release notes generation | changelog-generator | devops-architect |

### Potential New Skills to Create

| Skill Name | Purpose | Files to Include |
|------------|---------|------------------|
| `npm-publish` | npm publishing workflow templates | workflow examples, common issues |
| `binary-bundler` | Cross-platform binary generation | bun vs pkg comparison, build scripts |
| `homebrew-formula` | Homebrew tap and formula management | formula template, update workflow |

---

## Post-Implementation

### Maintenance Tasks

- Monitor npm download metrics
- Update binaries with CLI updates
- Rotate npm tokens annually
- Address security advisories

### Future Enhancements

- [ ] Self-update command in CLI
- [ ] Windows installer (.msi)
- [ ] Linux package managers (apt, yum)
- [ ] Docker image
- [ ] Code signing (macOS notarization, Windows Authenticode)

---

## Quick Reference: Task Execution

```bash
# Phase 1: npm Publishing Foundation
Task(subagent_type="backend-typescript-architect", prompt="PKG-001: Configure package.json for npm publishing...")
Task(subagent_type="devops-architect", prompt="PKG-004: Setup changesets for version management...")

# Phase 2: npm Publish Workflow
Task(subagent_type="devops-architect", prompt="NPM-002: Create GitHub Action for npm publish on tags...")

# Phase 3: Standalone Binaries
Task(subagent_type="backend-typescript-architect", prompt="BIN-001: Evaluate Bun compile for CLI binary generation...")
Task(subagent_type="devops-architect", prompt="BIN-003: Configure 5-platform build matrix in GitHub Actions...")

# Phase 4: GitHub Releases & Homebrew
Task(subagent_type="devops-architect", prompt="REL-001: Create GitHub Release workflow triggered on tags...")
Task(subagent_type="documentation-writer", prompt="REL-005: Write Homebrew formula meatycapture.rb...")
```

---

**Progress Tracking:**

See `.claude/progress/cli-distribution/all-phases-progress.md`

---

**Implementation Plan Version**: 1.0
**Last Updated**: 2026-01-18
