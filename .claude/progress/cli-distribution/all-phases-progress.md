---
# === CLI DISTRIBUTION PROGRESS TRACKING ===
# Multi-phase tracking for npm, binaries, and Homebrew distribution

type: progress
prd: "cli-distribution-v1"
phase: 1
title: "CLI Distribution & Packaging - All Phases"
status: "in_progress"
started: "2026-01-18"
completed: null

overall_progress: 25
completion_estimate: "on-track"

total_tasks: 24
completed_tasks: 6
in_progress_tasks: 0
blocked_tasks: 0
at_risk_tasks: 0

owners: ["devops-architect", "backend-typescript-architect"]
contributors: ["documentation-writer"]

# === PHASE 1: npm Publishing Foundation (8 pts) ===
phase_1:
  title: "npm Publishing Foundation"
  status: "completed"
  progress: 100
  completed_date: "2026-01-21"
  tasks:
    - id: "PKG-001"
      description: "Package.json publishing config (files, exports, type, engines)"
      status: "completed"
      assigned_to: ["backend-typescript-architect"]
      dependencies: []
      estimated_effort: "2 pts"
      priority: "high"
      notes: "npm pack produces 58.6KB tarball with correct files"

    - id: "PKG-002"
      description: "Build script audit - verify publishable output"
      status: "completed"
      assigned_to: ["backend-typescript-architect"]
      dependencies: []
      estimated_effort: "1 pt"
      priority: "medium"
      notes: "Shebang present, 755 permissions, CLI executes correctly"

    - id: "PKG-003"
      description: "npm scope decision - check @meatycapture availability"
      status: "completed"
      assigned_to: ["backend-typescript-architect"]
      dependencies: []
      estimated_effort: "1 pt"
      priority: "high"
      notes: "ADR-001 created; decided on unscoped 'meatycapture'"

    - id: "PKG-004"
      description: "Changesets setup for version management"
      status: "completed"
      assigned_to: ["devops-architect"]
      dependencies: []
      estimated_effort: "2 pts"
      priority: "high"
      notes: "@changesets/cli installed, config created, scripts added"

    - id: "PKG-005"
      description: "Version bump workflow - GitHub Action"
      status: "completed"
      assigned_to: ["devops-architect"]
      dependencies: ["PKG-004"]
      estimated_effort: "2 pts"
      priority: "high"
      notes: ".github/workflows/version-bump.yml created"

# === PHASE 2: npm Publish Workflow (6.5 pts) ===
phase_2:
  title: "npm Publish Workflow"
  status: "pending"
  progress: 0
  tasks:
    - id: "NPM-001"
      description: "Add NPM_TOKEN to GitHub Secrets"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["PKG-005"]
      estimated_effort: "0.5 pt"
      priority: "high"

    - id: "NPM-002"
      description: "Publish workflow - GitHub Action triggered on v* tags"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["NPM-001"]
      estimated_effort: "3 pts"
      priority: "critical"

    - id: "NPM-003"
      description: "Publish dry run flag for PRs"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["NPM-002"]
      estimated_effort: "1 pt"
      priority: "medium"

    - id: "NPM-004"
      description: "npm README display on package page"
      status: "pending"
      assigned_to: ["documentation-writer"]
      dependencies: ["NPM-002"]
      estimated_effort: "1 pt"
      priority: "medium"

    - id: "NPM-005"
      description: "First publish test - v0.1.0-beta"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["NPM-002"]
      estimated_effort: "1 pt"
      priority: "high"

# === PHASE 3: Standalone Binary Generation (12.5 pts) ===
phase_3:
  title: "Standalone Binary Generation"
  status: "pending"
  progress: 0
  tasks:
    - id: "BIN-001"
      description: "Bundler evaluation - test Bun compile with CLI"
      status: "pending"
      assigned_to: ["backend-typescript-architect"]
      dependencies: ["PKG-002"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "BIN-002"
      description: "Local binary build script"
      status: "pending"
      assigned_to: ["backend-typescript-architect"]
      dependencies: ["BIN-001"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "BIN-003"
      description: "Build matrix config - 5 platforms"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["BIN-002"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "BIN-004"
      description: "macOS builds (darwin-arm64, darwin-x64)"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["BIN-003"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "BIN-005"
      description: "Linux builds (linux-x64, linux-arm64)"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["BIN-003"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "BIN-006"
      description: "Windows build (win32-x64)"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["BIN-003"]
      estimated_effort: "2 pts"
      priority: "medium"

    - id: "BIN-007"
      description: "Binary naming convention"
      status: "pending"
      assigned_to: ["backend-typescript-architect"]
      dependencies: ["BIN-004"]
      estimated_effort: "0.5 pt"
      priority: "low"

# === PHASE 4: GitHub Releases & Homebrew (12 pts) ===
phase_4:
  title: "GitHub Releases & Homebrew"
  status: "pending"
  progress: 0
  tasks:
    - id: "REL-001"
      description: "Release workflow - GitHub Action creates release on tag"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["NPM-002"]
      estimated_effort: "3 pts"
      priority: "critical"

    - id: "REL-002"
      description: "Asset upload - attach binaries to release"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["REL-001", "BIN-006"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "REL-003"
      description: "Release notes generation from changesets"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["REL-001"]
      estimated_effort: "1 pt"
      priority: "medium"

    - id: "REL-004"
      description: "Homebrew tap repository creation"
      status: "completed"
      assigned_to: ["devops-architect"]
      dependencies: []
      estimated_effort: "1 pt"
      priority: "high"
      notes: "docs/setup/homebrew-tap-setup.md created with setup guide"

    - id: "REL-005"
      description: "Formula creation - meatycapture.rb"
      status: "pending"
      assigned_to: ["documentation-writer"]
      dependencies: ["REL-004"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "REL-006"
      description: "Formula auto-update on release"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["REL-005"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "REL-007"
      description: "Brew install integration test"
      status: "pending"
      assigned_to: ["devops-architect"]
      dependencies: ["REL-006"]
      estimated_effort: "1 pt"
      priority: "high"

# === DOCUMENTATION (4.5 pts) ===
documentation:
  title: "Documentation"
  status: "pending"
  progress: 0
  tasks:
    - id: "DOC-001"
      description: "Installation guide - all 4 methods"
      status: "pending"
      assigned_to: ["documentation-writer"]
      dependencies: ["NPM-005"]
      estimated_effort: "2 pts"
      priority: "high"

    - id: "DOC-002"
      description: "Troubleshooting guide"
      status: "pending"
      assigned_to: ["documentation-writer"]
      dependencies: ["REL-007"]
      estimated_effort: "1 pt"
      priority: "medium"

    - id: "DOC-003"
      description: "Contributing guide - development and release"
      status: "pending"
      assigned_to: ["documentation-writer"]
      dependencies: ["REL-007"]
      estimated_effort: "1 pt"
      priority: "medium"

    - id: "DOC-004"
      description: "Uninstall instructions per method"
      status: "pending"
      assigned_to: ["documentation-writer"]
      dependencies: ["DOC-001"]
      estimated_effort: "0.5 pt"
      priority: "low"

# Parallelization Strategy
parallelization:
  batch_1: ["PKG-001", "PKG-002", "PKG-003", "PKG-004", "REL-004"]
  batch_2: ["PKG-005", "BIN-001"]
  batch_3: ["NPM-001", "BIN-002"]
  batch_4: ["NPM-002", "BIN-003"]
  batch_5: ["NPM-003", "NPM-004", "NPM-005", "BIN-004", "BIN-005", "BIN-006", "REL-005"]
  batch_6: ["DOC-001", "BIN-007", "REL-001"]
  batch_7: ["REL-002", "REL-003", "REL-006"]
  batch_8: ["REL-007", "DOC-002", "DOC-003"]
  batch_9: ["DOC-004"]
  critical_path: ["PKG-004", "PKG-005", "NPM-001", "NPM-002", "REL-001", "REL-002", "REL-006", "REL-007"]
  estimated_total_time: "2-3 sprints"

blockers: []

success_criteria:
  - { id: "SC-1", description: "npm install -g @meatycapture/cli works", status: "pending" }
  - { id: "SC-2", description: "Binaries execute without Node.js", status: "pending" }
  - { id: "SC-3", description: "brew install meatycapture works", status: "pending" }
  - { id: "SC-4", description: "CLI persists after restart", status: "pending" }
  - { id: "SC-5", description: "meatycapture --version shows correct version", status: "pending" }

files_modified: []
---

# CLI Distribution & Packaging - Progress Tracking

**YAML frontmatter is the source of truth for tasks, status, and assignments.** Do not duplicate in markdown.

Use CLI to update progress:

```bash
python .claude/skills/artifact-tracking/scripts/update-status.py -f .claude/progress/cli-distribution/all-phases-progress.md -t PKG-001 -s completed
```

---

## Objective

Implement multi-channel distribution for MeatyCapture CLI enabling installation via npm global, Homebrew, and standalone binaries. Eliminates the need for `npm link` after restarts.

---

## Phase Overview

| Phase | Title | Tasks | Points | Status |
|-------|-------|-------|--------|--------|
| 1 | npm Publishing Foundation | 5 | 8 | Pending |
| 2 | npm Publish Workflow | 5 | 6.5 | Pending |
| 3 | Standalone Binary Generation | 7 | 12.5 | Pending |
| 4 | GitHub Releases & Homebrew | 7 | 12 | Pending |
| - | Documentation | 4 | 4.5 | Pending |
| **Total** | | **28** | **43.5** | |

---

## Quick Reference: Task Execution

### Phase 1: npm Publishing Foundation

```bash
Task(subagent_type="backend-typescript-architect", prompt="PKG-001: Configure package.json for npm publishing. Add files, exports, type:module, engines fields. Verify npm pack creates valid tarball with bin, dist, package.json.")

Task(subagent_type="devops-architect", prompt="PKG-004: Setup @changesets/cli for semantic versioning. Configure .changeset/config.json. Document pnpm changeset workflow.")
```

### Phase 2: npm Publish Workflow

```bash
Task(subagent_type="devops-architect", prompt="NPM-002: Create GitHub Action workflow for npm publishing. Trigger on v* tags. Include build, test, publish steps. Handle NPM_TOKEN secret.")
```

### Phase 3: Standalone Binaries

```bash
Task(subagent_type="backend-typescript-architect", prompt="BIN-001: Evaluate Bun compile for CLI binary generation. Test with meatycapture CLI. Document size, performance, compatibility.")

Task(subagent_type="devops-architect", prompt="BIN-003: Configure 5-platform build matrix in GitHub Actions. Platforms: darwin-arm64, darwin-x64, linux-x64, linux-arm64, win32-x64.")
```

### Phase 4: GitHub Releases & Homebrew

```bash
Task(subagent_type="devops-architect", prompt="REL-001: Create GitHub Release workflow. Trigger on tags. Generate release notes from changesets. Create draft release.")

Task(subagent_type="documentation-writer", prompt="REL-005: Write Homebrew formula meatycapture.rb. Support macOS arm64/x64 and linux x64. Download from GitHub Releases.")
```

---

## Implementation Notes

### Architectural Decisions

- **Bun compile over pkg**: Smaller binaries, faster builds, modern toolchain
- **Separate packages**: CLI as npm package, web as deploy artifact, desktop via Tauri
- **Homebrew tap**: Self-hosted tap (meatycapture/homebrew-tap) vs core formula

### Key Dependencies

- Phase 2 depends on Phase 1 (package config before publishing)
- Phase 3 can parallel Phase 2 after PKG-002 (build audit)
- Phase 4 depends on both Phase 2 and Phase 3

### Known Gotchas

- npm scope availability - check early (PKG-003)
- Windows binary testing limited - rely on CI
- Homebrew formula SHA256 must update on each release

---

## Completion Notes

(Fill in when phases complete)

### Phase 1 Complete: [DATE]

- What was built:
- Key learnings:
- Issues encountered:

### Phase 2 Complete: [DATE]

- First npm publish:
- Install verification:

### Phase 3 Complete: [DATE]

- Binary sizes:
- Platform compatibility:

### Phase 4 Complete: [DATE]

- Homebrew formula URL:
- Full distribution test:
