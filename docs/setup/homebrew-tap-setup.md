---
title: Homebrew Tap Repository Setup
created: 2026-01-21
updated: 2026-01-21
status: planning
---

# Homebrew Tap Repository Setup

This document describes how to set up a self-hosted Homebrew tap repository for distributing MeatyCapture on macOS.

## Overview

A Homebrew tap is a third-party repository that extends the official Homebrew package registry. By creating a tap, users can install MeatyCapture with:

```bash
brew tap meatycapture/meatycapture
brew install meatycapture
```

Or in a single command:

```bash
brew install meatycapture/tap/meatycapture
```

## Repository Structure

The tap repository follows Homebrew conventions:

```
homebrew-meatycapture/
├── Formula/
│   └── meatycapture.rb       # Formula definition
├── README.md                  # Tap documentation
├── LICENSE                    # Repository license
└── .github/
    └── workflows/
        └── update-formula.yml # Automated formula updates
```

### Directory Descriptions

| Directory/File | Purpose |
|----------------|---------|
| `Formula/` | Contains Ruby formula files (required by Homebrew) |
| `meatycapture.rb` | Package definition with download URLs, checksums, dependencies |
| `README.md` | User-facing documentation for the tap |
| `.github/workflows/` | CI automation for formula updates |

## Setup Steps

### 1. Create GitHub Repository

Create a new GitHub repository with the name `homebrew-meatycapture`:

- **Repository name**: `homebrew-meatycapture` (the `homebrew-` prefix is required)
- **Visibility**: Public (required for Homebrew taps)
- **Initialize with**: README

The repository can be under a user account or organization:
- User: `github.com/miethe/homebrew-meatycapture`
- Organization: `github.com/meatycapture/homebrew-meatycapture`

### 2. Create Formula Directory

```bash
mkdir -p Formula
```

### 3. Add Placeholder Formula

Create `Formula/meatycapture.rb` with the initial template:

```ruby
class Meatycapture < Formula
  desc "Lightweight capture app for logging enhancements/bugs/ideas"
  homepage "https://github.com/miethe/meatycapture"
  version "0.1.0"
  license "MIT"

  # Platform-specific binary downloads
  # These URLs will be populated when releases are published

  on_macos do
    on_arm do
      url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-#{version}-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_ARM64"
    end
    on_intel do
      url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-#{version}-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER_SHA256_X64"
    end
  end

  def install
    bin.install "meatycapture"
  end

  test do
    assert_match "meatycapture", shell_output("#{bin}/meatycapture --version")
  end
end
```

### 4. Add README

Create `README.md` for the tap repository:

```markdown
# Homebrew Tap for MeatyCapture

This is the official Homebrew tap for [MeatyCapture](https://github.com/miethe/meatycapture).

## Installation

```bash
brew tap meatycapture/meatycapture
brew install meatycapture
```

Or install directly:

```bash
brew install meatycapture/tap/meatycapture
```

## Updating

```bash
brew update
brew upgrade meatycapture
```

## Troubleshooting

If you encounter issues:

```bash
# Remove and reinstall
brew uninstall meatycapture
brew untap meatycapture/meatycapture
brew tap meatycapture/meatycapture
brew install meatycapture
```

## License

MIT License - see [MeatyCapture](https://github.com/miethe/meatycapture) for details.
```

### 5. Add CI Workflow (Optional)

Create `.github/workflows/update-formula.yml` for automated formula updates:

```yaml
name: Update Formula

on:
  repository_dispatch:
    types: [release-published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to update to (e.g., 0.1.0)'
        required: true
      sha256_arm64:
        description: 'SHA256 for darwin-arm64 archive'
        required: true
      sha256_x64:
        description: 'SHA256 for darwin-x64 archive'
        required: true

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update formula version
        run: |
          VERSION="${{ github.event.inputs.version || github.event.client_payload.version }}"
          SHA256_ARM64="${{ github.event.inputs.sha256_arm64 || github.event.client_payload.sha256_arm64 }}"
          SHA256_X64="${{ github.event.inputs.sha256_x64 || github.event.client_payload.sha256_x64 }}"

          # Update version
          sed -i "s/version \".*\"/version \"${VERSION}\"/" Formula/meatycapture.rb

          # Update SHA256 checksums
          sed -i "s/sha256 \".*\" # arm64/sha256 \"${SHA256_ARM64}\" # arm64/" Formula/meatycapture.rb
          sed -i "s/sha256 \".*\" # x64/sha256 \"${SHA256_X64}\" # x64/" Formula/meatycapture.rb

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: "Update meatycapture to v${{ github.event.inputs.version || github.event.client_payload.version }}"
          title: "Update meatycapture to v${{ github.event.inputs.version || github.event.client_payload.version }}"
          body: "Automated formula update for new release."
          branch: "update-formula-v${{ github.event.inputs.version || github.event.client_payload.version }}"
```

## User Installation Instructions

### First-time Installation

```bash
# Add the tap to Homebrew
brew tap meatycapture/meatycapture

# Install the formula
brew install meatycapture

# Verify installation
meatycapture --version
```

### Single-command Installation

```bash
brew install meatycapture/tap/meatycapture
```

### Updating

```bash
# Update Homebrew and all taps
brew update

# Upgrade meatycapture
brew upgrade meatycapture
```

### Uninstalling

```bash
# Remove the package
brew uninstall meatycapture

# Remove the tap (optional)
brew untap meatycapture/meatycapture
```

## Formula Update Process

When a new release is published:

1. **Build release artifacts** - CI builds platform-specific binaries
2. **Calculate checksums** - Generate SHA256 for each archive
3. **Update formula** - Modify version and checksums in `meatycapture.rb`
4. **Test locally** - Run `brew install --build-from-source meatycapture`
5. **Commit and push** - Update the tap repository

### Manual Formula Update

```bash
# Clone the tap repository
git clone https://github.com/meatycapture/homebrew-meatycapture.git
cd homebrew-meatycapture

# Edit the formula
vim Formula/meatycapture.rb

# Update version and SHA256 checksums
# version "0.2.0"
# sha256 "abc123..." # for each platform

# Test the formula
brew install --build-from-source ./Formula/meatycapture.rb

# Commit and push
git add Formula/meatycapture.rb
git commit -m "Update meatycapture to v0.2.0"
git push
```

### Calculating SHA256 Checksums

```bash
# Download the release archive
curl -LO https://github.com/miethe/meatycapture/releases/download/v0.1.0/meatycapture-0.1.0-darwin-arm64.tar.gz

# Calculate SHA256
shasum -a 256 meatycapture-0.1.0-darwin-arm64.tar.gz
```

## Naming Conventions

| Convention | Example |
|------------|---------|
| Tap repository | `homebrew-meatycapture` |
| Tap reference | `meatycapture/meatycapture` or `miethe/meatycapture` |
| Formula file | `Formula/meatycapture.rb` |
| Class name | `Meatycapture` (CamelCase, no hyphens) |
| Install command | `brew install meatycapture/tap/meatycapture` |

## Troubleshooting

### Common Issues

**Tap not found:**
```bash
Error: meatycapture/meatycapture was not found
```
Solution: Verify the repository exists and is public.

**Formula not found:**
```bash
Error: No available formula with the name "meatycapture"
```
Solution: Ensure `Formula/meatycapture.rb` exists in the tap repository.

**Checksum mismatch:**
```bash
Error: SHA256 mismatch
```
Solution: Recalculate and update the SHA256 in the formula.

**Permission denied:**
```bash
Error: Permission denied @ rb_sysopen
```
Solution: Check file permissions in the release archive.

## Related Documentation

- [CLI Distribution Overview](/docs/setup/cli-distribution.md)
- [Release Process](/docs/ops/deployment/release-process.md)
- [Homebrew Formula Reference](https://docs.brew.sh/Formula-Cookbook)

## Next Steps

After creating the tap repository:

1. **REL-005**: Write complete formula with platform detection
2. **REL-006**: Integrate formula updates into CI/CD pipeline
3. **REL-007**: Test end-to-end installation flow
