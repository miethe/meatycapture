# Homebrew Formula Implementation Notes

This document describes the MeatyCapture Homebrew formula implementation and the automation required for releases.

## Formula Overview

The formula (`Formula/meatycapture.rb`) is a Homebrew package definition that allows users to install MeatyCapture via Homebrew:

```bash
brew tap miethe/meatycapture
brew install meatycapture
```

## Binary Distribution Model

### Raw Binaries vs Archives

Unlike many Homebrew formulas that download `.tar.gz` archives, MeatyCapture formula downloads **raw executable binaries** directly:

- **Downloaded as:** Raw binary (e.g., `meatycapture-darwin-arm64`)
- **Installed as:** `/usr/local/bin/meatycapture`
- **Advantages:**
  - Smaller download size (no compression overhead for users)
  - Faster installation
  - Direct binary deployment

### Binary Naming Convention

The build system produces binaries with platform-specific names:

| Platform | Binary Name |
|----------|------------|
| macOS ARM64 | `meatycapture-darwin-arm64` |
| macOS x64 | `meatycapture-darwin-x64` |
| Linux x64 | `meatycapture-linux-x64` |
| Linux ARM64 | `meatycapture-linux-arm64` |
| Windows x64 | `meatycapture-windows-x64.exe` |

**Note:** The Homebrew formula only covers macOS and Linux (not Windows). Windows users should download directly from GitHub Releases or use other package managers.

## Formula Structure

### Platform Detection

```ruby
on_macos do
  on_arm do
    url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-darwin-arm64"
    sha256 "UPDATE_ON_RELEASE_ARM64"
  end
  on_intel do
    url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-darwin-x64"
    sha256 "UPDATE_ON_RELEASE_X64"
  end
end

on_linux do
  on_arm do
    url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-linux-arm64"
    sha256 "UPDATE_ON_RELEASE_LINUX_ARM64"
  end
  on_intel do
    url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-linux-x64"
    sha256 "UPDATE_ON_RELEASE_LINUX_X64"
  end
end
```

Homebrew automatically detects the user's OS and architecture, then downloads the appropriate binary.

### Installation Method

```ruby
def install
  bin.install Dir.glob("meatycapture*").first => "meatycapture"
end
```

- `Dir.glob("meatycapture*").first` - Matches the platform-specific binary name
- `=> "meatycapture"` - Renames it to a standard name without platform suffix
- `bin.install` - Places it in the user's PATH

### Test Block

```ruby
test do
  assert_match version.to_s, shell_output("#{bin}/meatycapture --version")
end
```

After installation, Homebrew runs `meatycapture --version` and verifies the output contains the version number.

## Release Automation

### Pre-Release Checklist

Before publishing a release, ensure:

1. ✓ All tests pass locally
2. ✓ Version bumped in `package.json`
3. ✓ Changelog updated
4. ✓ Git tag created (e.g., `v0.1.0`)

### Build and Release Process

1. **Tag Push** → Triggers `build-binaries.yml` workflow
2. **Binary Build** → Compiles binaries for all platforms
3. **Binary Upload** → Artifacts uploaded to GitHub Releases
4. **SHA256 Calculation** → Need to get checksums for each binary
5. **Formula Update** → Update version and SHA256 in `meatycapture.rb`
6. **Tap Repository Commit** → Push updated formula to homebrew-meatycapture

### Automation via CI/CD (REL-006)

REL-006 will automate steps 4-6 with a GitHub Actions workflow:

```yaml
# In homebrew-meatycapture tap repository
name: Update Formula on Release

on:
  repository_dispatch:
    types: [release-published]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      # 1. Download binaries from meatycapture releases
      # 2. Calculate SHA256 for each binary
      # 3. Update Formula/meatycapture.rb with new version and checksums
      # 4. Create PR with the changes
```

### Manual Update Process

If automation is not available, manually update the formula:

```bash
# 1. Download a binary from GitHub Releases
VERSION="0.1.0"
curl -LO https://github.com/miethe/meatycapture/releases/download/v${VERSION}/meatycapture-darwin-arm64

# 2. Calculate SHA256
shasum -a 256 meatycapture-darwin-arm64
# Output: abc123def456...

# 3. Edit Formula/meatycapture.rb
# Update:
# - version "0.1.0"
# - sha256 "abc123def456..." (for each platform)

# 4. Test locally
brew install --build-from-source ./Formula/meatycapture.rb

# 5. Commit and push
git add Formula/meatycapture.rb
git commit -m "Update meatycapture to v0.1.0"
git push
```

## SHA256 Placeholder Strategy

In the formula, SHA256 values are set to placeholders:

```ruby
sha256 "UPDATE_ON_RELEASE_ARM64"
sha256 "UPDATE_ON_RELEASE_X64"
sha256 "UPDATE_ON_RELEASE_LINUX_ARM64"
sha256 "UPDATE_ON_RELEASE_LINUX_X64"
```

**Why placeholders?**
- Allows formula to exist in the tap repository before any releases
- Automation script can easily find and replace these markers
- Prevents accidental installation attempts with invalid checksums

**Updating placeholders:**

The CI/CD automation (REL-006) will:

1. Download each binary from GitHub Releases
2. Calculate SHA256 checksums
3. Replace placeholders with actual values using sed:
   ```bash
   sed -i "s/UPDATE_ON_RELEASE_ARM64/${SHA256_ARM64}/" Formula/meatycapture.rb
   sed -i "s/UPDATE_ON_RELEASE_X64/${SHA256_X64}/" Formula/meatycapture.rb
   # ... etc for each platform
   ```

## Testing the Formula

### Local Testing

Before pushing to the tap repository:

```bash
# Test on macOS ARM64
brew install --build-from-source ./Formula/meatycapture.rb

# Verify installation
meatycapture --version
meatycapture --help

# Uninstall for next test
brew uninstall meatycapture
```

### CI Testing

When the formula is in the tap repository, Homebrew Community can test it:

```bash
# Pull request validation
brew tap-new test/tap
brew install ./Formula/meatycapture.rb
brew test meatycapture
```

## Troubleshooting Common Issues

### Binary not executable

**Error:** `Permission denied`

**Solution:** Homebrew automatically makes binaries executable. If this fails:
```ruby
def install
  bin.install Dir.glob("meatycapture*").first => "meatycapture"
  bin.chmod(0755, "meatycapture")  # Make executable
end
```

### SHA256 mismatch

**Error:** `Error: SHA256 mismatch`

**Solution:** Recalculate the correct SHA256:
```bash
shasum -a 256 meatycapture-darwin-arm64
```

Then update the formula with the correct value.

### Wrong binary downloaded

**Issue:** Formula downloads wrong binary for the architecture

**Cause:** Homebrew's `on_arm` / `on_intel` detection failed

**Solution:** Add debugging to the formula:
```ruby
def install
  puts "Architecture detected: #{Hardware::CPU.arch}"
  # ... rest of install
end
```

### Test fails after installation

**Error:** `assert_match version.to_s, shell_output(...)`

**Cause:** Binary doesn't output the version number correctly

**Solution:** Verify the `--version` output:
```bash
meatycapture --version
# Should output something like: "meatycapture 0.1.0" or "v0.1.0"
```

The test uses a regex match, so the version just needs to appear somewhere in the output.

## Version Management

### Updating Version

When releasing a new version:

```ruby
version "0.2.0"  # Update this
```

Use semantic versioning: `MAJOR.MINOR.PATCH`

The version is referenced in URLs:
```ruby
url "https://github.com/miethe/meatycapture/releases/download/v#{version}/meatycapture-darwin-arm64"
```

So `version "0.2.0"` becomes `v0.2.0` in the URL (e.g., `v0.2.0`).

## Integration with Main Repository

### Files in Main Repo

- `homebrew/Formula/meatycapture.rb` - Formula definition
- `homebrew/README.md` - Installation instructions for users
- `homebrew/IMPLEMENTATION_NOTES.md` - This file

### Files in Tap Repository

The `homebrew-meatycapture` tap repository (separate GitHub repo) will contain:

```
homebrew-meatycapture/
├── Formula/
│   └── meatycapture.rb  # Copied from main repo, updated with SHA256
├── README.md             # User-facing installation guide
└── .github/workflows/
    └── update-formula.yml # Automation to update formula
```

### Sync Strategy

1. **Initial Setup:** Copy files from `meatycapture/homebrew/` to `homebrew-meatycapture/`
2. **On Each Release:** Automated CI updates the formula in the tap repo
3. **Formula Changes:** Update in main repo, manually copy to tap (or add sync workflow)

## Next Steps

### REL-006: Automate Formula Updates

Create GitHub Actions workflow that:
- Listens for release events from meatycapture repo
- Downloads all binaries
- Calculates SHA256 for each
- Updates formula with version and checksums
- Creates PR in homebrew-meatycapture tap

### REL-007: End-to-End Testing

Test the complete flow:
1. Push a tag from main repository
2. Binary build workflow runs
3. Formula update workflow runs
4. Test installation via Homebrew
5. Verify binary works correctly

## References

- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [Homebrew DSL](https://docs.brew.sh/Formula-Cookbook#types-of-usage)
- [Platform Detection](https://docs.brew.sh/Formula-Cookbook#specifying-the-download-url-explicitly)
- [Binary Downloads](https://docs.brew.sh/Formula-Cookbook#binary-packages)
- [SHA256 Calculation](https://docs.brew.sh/Formula-Cookbook#verifying-checksums)
