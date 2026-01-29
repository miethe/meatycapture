---
title: "Homebrew Installation Testing Guide"
description: "Manual testing procedures for Homebrew formula validation and post-release installation verification"
audience: [developers, release-managers, qa-engineers]
tags: [testing, homebrew, installation, release, macos, linux]
created: 2026-01-25
updated: 2026-01-25
category: "testing-guide"
status: active
---

# Homebrew Installation Testing Guide

Manual testing procedures for validating the MeatyCapture Homebrew formula and verifying post-release installations.

**Document Purpose:** Provide step-by-step testing instructions for Homebrew formula validation before and after releases, including syntax checks, installation verification, and troubleshooting guidance.

**Testing Scope:** Formula syntax validation, SHA256 verification, installation testing, CLI functionality verification, and end-to-end release validation.

**Related Files:**
- Formula: `homebrew/Formula/meatycapture.rb`
- Update workflow: `.github/workflows/update-homebrew.yml`
- Tap setup guide: `docs/setup/homebrew-tap-setup.md`

---

## Overview

Since full Homebrew integration testing requires a published tap repository and real release binaries, most testing must be performed manually after releases. This guide covers:

1. Pre-release formula validation (syntax, style)
2. Post-release installation testing
3. CLI functionality verification
4. Troubleshooting common issues

---

## Pre-Release Testing

### Formula Syntax Validation

Before any release, validate the formula has correct Ruby syntax.

#### Ruby Syntax Check

```bash
# Basic Ruby syntax validation
ruby -c homebrew/Formula/meatycapture.rb
```

**Expected output:**
```
Syntax OK
```

**If syntax errors occur:**
- Check for missing `end` statements
- Verify string quoting is balanced
- Ensure all blocks are properly closed

#### Homebrew Style Check (Optional)

If you have Homebrew installed locally with developer tools:

```bash
# Install Homebrew developer tools if needed
brew tap homebrew/core

# Run style checker
brew style homebrew/Formula/meatycapture.rb
```

**Note:** `brew style` requires the full Homebrew development environment. It may not be available in all setups.

### Pre-Release Checklist

Before publishing a release, verify:

- [ ] Formula Ruby syntax is valid (`ruby -c`)
- [ ] Version placeholder matches expected format
- [ ] SHA256 placeholders are present for all platforms:
  - [ ] `darwin-arm64` (macOS Apple Silicon)
  - [ ] `darwin-x64` (macOS Intel)
  - [ ] `linux-arm64` (Linux ARM)
  - [ ] `linux-x64` (Linux x64)
- [ ] Download URLs use correct version interpolation (`#{version}`)
- [ ] `install` block correctly renames binary
- [ ] `test` block verifies version output

---

## Post-Release Testing

After a release is published and the `update-homebrew` workflow completes, perform these verification steps.

### Step 1: Verify Workflow Completion

1. Go to GitHub Actions for this repository
2. Find the "Update Homebrew Formula" workflow run
3. Verify it completed successfully
4. Check the workflow summary for SHA256 values

### Step 2: Verify Formula Updates

```bash
# Pull latest changes
git pull origin main

# Verify version was updated
grep 'version "' homebrew/Formula/meatycapture.rb

# Verify SHA256 values are no longer placeholders
grep 'sha256 "' homebrew/Formula/meatycapture.rb
```

**Expected:** Version matches release tag, SHA256 values are 64-character hex strings (not "UPDATE_ON_RELEASE_*").

### Step 3: Verify Download URLs Are Accessible

```bash
# Replace VERSION with the released version (e.g., 0.1.0)
VERSION="0.1.0"

# Test each binary URL
curl -fsSL -I "https://github.com/miethe/meatycapture/releases/download/v${VERSION}/meatycapture-darwin-arm64"
curl -fsSL -I "https://github.com/miethe/meatycapture/releases/download/v${VERSION}/meatycapture-darwin-x64"
curl -fsSL -I "https://github.com/miethe/meatycapture/releases/download/v${VERSION}/meatycapture-linux-arm64"
curl -fsSL -I "https://github.com/miethe/meatycapture/releases/download/v${VERSION}/meatycapture-linux-x64"
```

**Expected:** HTTP 200 OK or 302 redirect for each URL.

### Step 4: Verify SHA256 Checksums

Download a binary and verify the checksum matches the formula:

```bash
# Download binary (example for macOS ARM64)
VERSION="0.1.0"
curl -fsSL -o meatycapture-darwin-arm64 \
  "https://github.com/miethe/meatycapture/releases/download/v${VERSION}/meatycapture-darwin-arm64"

# Calculate SHA256
shasum -a 256 meatycapture-darwin-arm64

# Compare with formula value
grep -A1 'darwin-arm64' homebrew/Formula/meatycapture.rb | grep sha256

# Clean up
rm meatycapture-darwin-arm64
```

---

## Installation Testing

### Local Formula Installation (Pre-Tap)

Before the tap is published, test installation from the local formula file:

```bash
# Install from local formula (verbose for debugging)
brew install --verbose homebrew/Formula/meatycapture.rb

# Or force build from source
brew install --build-from-source homebrew/Formula/meatycapture.rb
```

**Note:** This may fail if the download URLs point to a release that does not exist yet.

### Tap Installation (Post-Tap Setup)

Once the tap repository is published:

```bash
# Add the tap
brew tap miethe/meatycapture https://github.com/miethe/meatycapture.git

# Install from tap
brew install meatycapture

# Verify installation path
which meatycapture
```

**Expected:** Binary installed to Homebrew prefix (typically `/opt/homebrew/bin/meatycapture` on Apple Silicon or `/usr/local/bin/meatycapture` on Intel Macs).

### Installation Test Checklist

After installation, verify these items:

- [ ] Binary is installed in Homebrew bin directory
- [ ] Binary has execute permissions
- [ ] `meatycapture --version` displays correct version
- [ ] `meatycapture --help` displays help text
- [ ] Basic CLI commands execute without errors

---

## CLI Functionality Verification

After installation, run through basic CLI functionality:

### Version Check

```bash
meatycapture --version
```

**Expected:** Version string matching the release (e.g., `meatycapture 0.1.0`).

### Help Display

```bash
meatycapture --help
```

**Expected:** Help text with available commands and options.

### Basic Command Execution

```bash
# List projects (should work even with no projects configured)
meatycapture list

# Show configuration path
meatycapture config --path
```

**Expected:** Commands execute without errors. Empty results are acceptable if no projects are configured.

### CLI Functionality Checklist

| Test | Command | Expected Result |
|------|---------|-----------------|
| Version display | `meatycapture --version` | Shows version number |
| Help display | `meatycapture --help` | Shows help text |
| List projects | `meatycapture list` | Lists projects or empty |
| Config path | `meatycapture config --path` | Shows config directory |
| Invalid command | `meatycapture invalid` | Shows error with suggestions |

---

## Upgrade Testing

Test the upgrade flow for users with existing installations:

```bash
# Check current version
meatycapture --version

# Update tap and upgrade
brew update
brew upgrade meatycapture

# Verify new version
meatycapture --version
```

**Expected:** Version updates to latest release without errors.

---

## Uninstall Testing

Verify clean uninstallation:

```bash
# Uninstall package
brew uninstall meatycapture

# Verify removal
which meatycapture  # Should return nothing or "not found"

# Optionally remove tap
brew untap miethe/meatycapture
```

**Expected:** Binary is removed, no orphan files remain.

---

## Troubleshooting

### SHA256 Mismatch Error

**Error:**
```
Error: SHA256 mismatch
Expected: abc123...
Actual: def456...
```

**Causes:**
1. Binary was re-uploaded after formula was updated
2. Download was corrupted
3. Wrong binary version downloaded

**Solutions:**
```bash
# Clear Homebrew cache
brew cleanup -s

# Re-download fresh
brew fetch --force meatycapture

# Or manually verify SHA256
curl -fsSL -o binary "DOWNLOAD_URL"
shasum -a 256 binary
```

If the SHA256 genuinely changed, trigger the `update-homebrew` workflow manually to recalculate checksums.

### Download Failures

**Error:**
```
Error: Failed to download resource "meatycapture"
```

**Causes:**
1. Release not yet published
2. Binary not attached to release
3. Network/firewall issues
4. GitHub rate limiting

**Solutions:**
```bash
# Verify URL is accessible
curl -fsSL -I "DOWNLOAD_URL"

# Check GitHub release page directly
open "https://github.com/miethe/meatycapture/releases"

# If rate limited, authenticate with GitHub
export HOMEBREW_GITHUB_API_TOKEN="your_token"
brew install meatycapture
```

### Permission Issues

**Error:**
```
Error: Permission denied @ rb_sysopen
```

**Causes:**
1. Binary not executable
2. Homebrew prefix permissions incorrect
3. macOS Gatekeeper blocking unsigned binary

**Solutions:**
```bash
# Fix Homebrew permissions
sudo chown -R $(whoami) $(brew --prefix)/*

# For Gatekeeper issues (unsigned binaries)
xattr -d com.apple.quarantine $(which meatycapture)

# Or allow in System Preferences > Security & Privacy
```

### Formula Syntax Errors

**Error:**
```
Error: meatycapture.rb: syntax error, unexpected end-of-input
```

**Solutions:**
```bash
# Validate syntax
ruby -c homebrew/Formula/meatycapture.rb

# Check for common issues:
# - Missing 'end' statements
# - Unbalanced quotes
# - Invalid Ruby syntax
```

### Binary Not Found After Install

**Error:**
```
zsh: command not found: meatycapture
```

**Causes:**
1. Homebrew bin not in PATH
2. Shell not refreshed after install
3. Installation failed silently

**Solutions:**
```bash
# Check installation location
brew list meatycapture
ls -la $(brew --prefix)/bin/meatycapture

# Ensure Homebrew is in PATH
echo $PATH | grep -q "$(brew --prefix)/bin" || echo "Add Homebrew to PATH"

# Refresh shell
exec $SHELL
```

---

## CI Integration (Future)

Full automated integration testing is not possible until:

1. A real tap repository is published and accessible
2. Real releases with binaries are available
3. CI runners have Homebrew installed

### Planned CI Testing Steps

Once prerequisites are met, add these tests to CI:

```yaml
# Future: .github/workflows/test-homebrew.yml
name: Test Homebrew Installation

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  test-install:
    runs-on: macos-latest
    steps:
      - name: Tap repository
        run: brew tap miethe/meatycapture https://github.com/miethe/meatycapture.git

      - name: Install formula
        run: brew install meatycapture

      - name: Verify version
        run: |
          INSTALLED_VERSION=$(meatycapture --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
          EXPECTED_VERSION="${{ github.event.release.tag_name }}"
          EXPECTED_VERSION="${EXPECTED_VERSION#v}"
          if [ "$INSTALLED_VERSION" != "$EXPECTED_VERSION" ]; then
            echo "Version mismatch: installed=$INSTALLED_VERSION expected=$EXPECTED_VERSION"
            exit 1
          fi

      - name: Test CLI commands
        run: |
          meatycapture --help
          meatycapture list || true
```

### Current Limitations

| Limitation | Reason | Workaround |
|------------|--------|------------|
| No CI install tests | Tap not published | Manual testing post-release |
| No pre-release binary tests | Binaries built at release time | Test after release workflow |
| No cross-platform CI tests | macOS runners only | Manual Linux testing |

---

## Complete Post-Release Verification Procedure

After publishing a release, follow this complete verification sequence:

### 1. Verify Release Artifacts (5 min)

- [ ] GitHub Release page shows all 6 binaries attached
- [ ] Release notes are complete
- [ ] Version tag matches expected format (v0.x.x)

### 2. Verify Workflow Execution (5 min)

- [ ] "Update Homebrew Formula" workflow triggered automatically
- [ ] Workflow completed successfully
- [ ] Workflow summary shows valid SHA256 values

### 3. Verify Formula Updates (5 min)

- [ ] Pull latest main branch
- [ ] Version in formula matches release
- [ ] All 4 SHA256 values are valid hex strings
- [ ] No placeholder values remain

### 4. Test Installation (10 min)

- [ ] `brew tap miethe/meatycapture` succeeds
- [ ] `brew install meatycapture` succeeds
- [ ] Binary is in PATH
- [ ] `meatycapture --version` shows correct version

### 5. Verify CLI Functionality (5 min)

- [ ] `meatycapture --help` works
- [ ] `meatycapture list` works
- [ ] No startup errors or warnings

### 6. Test Cleanup (2 min)

- [ ] `brew uninstall meatycapture` succeeds
- [ ] Binary is removed from system

**Total estimated time:** 30 minutes

---

## Related Documentation

- [CLI Distribution Overview](/docs/setup/cli-distribution.md)
- [Homebrew Tap Setup Guide](/docs/setup/homebrew-tap-setup.md)
- [Release Process](/docs/ops/deployment/release-process.md)
- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [Homebrew Testing Guide](https://docs.brew.sh/Formula-Cookbook#test-block)
