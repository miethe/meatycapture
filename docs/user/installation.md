---
title: Installation Guide
description: Complete installation guide for MeatyCapture CLI with four installation methods
audience: users
tags: [installation, getting-started, cli]
created: 2025-01-25
updated: 2025-01-25
category: user-guide
status: published
related:
  - docs/user/cli/index.md
  - docs/user/setup/SETUP.md
---

# Installation Guide

MeatyCapture CLI can be installed using four different methods. Choose the one that best fits your workflow.

## Quick Install (Recommended Methods)

The easiest ways to get started:

**macOS/Linux with npm:**
```bash
npm install -g meatycapture
```

**macOS/Linux with Homebrew:**
```bash
brew tap meatycapture/tap
brew install meatycapture
```

**Verify installation:**
```bash
meatycapture --version
```

---

## npm Install (Recommended for Node.js Users)

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (comes with Node.js)

### Installation

Install MeatyCapture globally using npm:

```bash
npm install -g meatycapture
```

**Or using pnpm** (if you prefer pnpm):

```bash
pnpm install -g meatycapture
```

### Verification

Verify the installation was successful:

```bash
# Check version
meatycapture --version

# View help
meatycapture --help

# Test by initializing config
meatycapture config init
```

### Updating

Keep MeatyCapture up to date:

```bash
npm update -g meatycapture
```

Or check for updates manually:

```bash
npm outdated -g meatycapture
```

### Troubleshooting npm Install

**"Command not found: meatycapture"**
- Verify Node.js is installed: `node --version`
- Check npm global prefix: `npm config get prefix`
- Try reinstalling: `npm uninstall -g meatycapture && npm install -g meatycapture`
- On macOS, you may need to add npm's bin directory to your PATH

**"Permission denied"**
- Try installing with `sudo`: `sudo npm install -g meatycapture`
- Or reconfigure npm to avoid permissions issues: `mkdir ~/.npm-global && npm config set prefix '~/.npm-global'`

**"Multiple Node.js versions installed"**
- If you use nvm, ensure correct Node version is active: `nvm use 18`
- If you use asdf, set the version: `asdf local nodejs 18.x.x`

---

## Homebrew Install (macOS and Linux)

### Prerequisites

- **Homebrew**: Latest version
- **Supported**: macOS 10.15+ and Linux with Homebrew

### Installation

1. Add the MeatyCapture tap:

```bash
brew tap meatycapture/tap
```

2. Install MeatyCapture:

```bash
brew install meatycapture
```

### Platform Support

The Homebrew formula supports multiple architectures:

- **macOS ARM64** (Apple Silicon - M1, M2, M3)
- **macOS x64** (Intel)
- **Linux x64**
- **Linux ARM64**

Homebrew automatically detects and installs the correct version for your system.

### Verification

Verify the installation:

```bash
meatycapture --version
```

### Updating

Update to the latest version:

```bash
brew upgrade meatycapture
```

### Uninstalling

If you need to remove MeatyCapture:

```bash
brew uninstall meatycapture
brew untap meatycapture/tap
```

### Troubleshooting Homebrew Install

**"Tap not found"**
- Ensure the tap is added: `brew tap meatycapture/tap`
- Check tap status: `brew tap-info meatycapture/tap`

**"No available formula"**
- Update Homebrew: `brew update`
- Re-add the tap: `brew untap meatycapture/tap && brew tap meatycapture/tap`

**"Wrong architecture installed"**
- Check your system: `uname -m`
- Uninstall and reinstall: `brew uninstall meatycapture && brew install meatycapture`

---

## Standalone Binary

### What is a Standalone Binary?

The standalone binary contains everything needed to run MeatyCapture. No Node.js or npm required. Perfect for:
- CI/CD pipelines
- Minimal deployments
- Users without Node.js
- Easy distribution across machines

### Prerequisites

None. The binary is completely self-contained.

### Download and Install

1. **Download** the appropriate binary for your system from [GitHub Releases](https://github.com/miethe/meatycapture/releases)

2. **Make it executable**:

```bash
chmod +x meatycapture
```

3. **Move to a directory in your PATH**:

```bash
# Option 1: System-wide (requires sudo)
sudo mv meatycapture /usr/local/bin/

# Option 2: User-local (no sudo needed)
mkdir -p ~/.local/bin
mv meatycapture ~/.local/bin/

# For Option 2, add to your shell profile (~/.bashrc, ~/.zshrc, or ~/.profile):
# export PATH="$HOME/.local/bin:$PATH"
```

4. **Verify installation**:

```bash
meatycapture --version
```

### Platform-Specific Instructions

#### macOS (Intel/x64)

```bash
# Download
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-macos-x64 \
  -o meatycapture

# Make executable and move to PATH
chmod +x meatycapture
sudo mv meatycapture /usr/local/bin/

# Verify
meatycapture --version
```

#### macOS (Apple Silicon/ARM64)

```bash
# Download
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-macos-arm64 \
  -o meatycapture

# Make executable and move to PATH
chmod +x meatycapture
sudo mv meatycapture /usr/local/bin/

# Verify
meatycapture --version
```

#### Linux (x64)

```bash
# Download
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-linux-x64 \
  -o meatycapture

# Make executable and move to PATH
chmod +x meatycapture
sudo mv meatycapture /usr/local/bin/

# Verify
meatycapture --version
```

#### Linux (ARM64)

```bash
# Download (for ARM64 systems like Raspberry Pi 4+)
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-linux-arm64 \
  -o meatycapture

# Make executable and move to PATH
chmod +x meatycapture
sudo mv meatycapture /usr/local/bin/

# Verify
meatycapture --version
```

#### Windows (x64)

1. **Download** `meatycapture-windows-x64.exe` from [GitHub Releases](https://github.com/miethe/meatycapture/releases)

2. **Move the file** to a folder in your PATH (e.g., `C:\Users\YourUsername\AppData\Local\bin\`)

3. **Add to PATH** (if not already in PATH):
   - Right-click "This PC" or "My Computer" → Properties
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "User variables", find "Path" and click Edit
   - Click "New" and add the folder path
   - Click OK and restart your terminal

4. **Verify installation**:

```bash
meatycapture --version
```

### Updating Standalone Binary

To update to a newer version:

1. Download the new binary from [GitHub Releases](https://github.com/miethe/meatycapture/releases)
2. Replace the old binary: `sudo mv meatycapture /usr/local/bin/` (or wherever it's installed)
3. Verify: `meatycapture --version`

### Troubleshooting Standalone Binary

**"Permission denied" after downloading**
- Make sure you ran `chmod +x meatycapture`
- Check file permissions: `ls -la meatycapture`

**"Command not found" after moving to PATH**
- Verify the file is in PATH: `echo $PATH`
- Check it's executable: `file meatycapture` (should show "executable")
- Try absolute path to test: `/usr/local/bin/meatycapture --version`

**"Mach-O 64-bit executable image not valid"** (on macOS)
- You downloaded the wrong architecture
- For Apple Silicon: use `meatycapture-macos-arm64`
- For Intel: use `meatycapture-macos-x64`
- Check your system: `uname -m`

---

## Building from Source

### Prerequisites

- **Git**: For cloning the repository
- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher
- **Optional**: Bun runtime (for faster builds)

### Prerequisites Check

Verify your environment:

```bash
# Check Node.js
node --version      # Should be v18.0.0 or higher

# Check pnpm
pnpm --version      # Should be 8.0.0 or higher

# Check Git
git --version       # Should be 2.0 or higher
```

If you're missing any prerequisites, install them:
- **Node.js**: https://nodejs.org (includes npm)
- **pnpm**: `npm install -g pnpm`

### Installation Steps

1. **Clone the repository**:

```bash
git clone https://github.com/miethe/meatycapture.git
cd meatycapture
```

2. **Install dependencies**:

```bash
pnpm install
```

3. **Build the CLI**:

```bash
pnpm build:cli
```

4. **Link globally** (optional, makes `meatycapture` available in PATH):

```bash
pnpm link --global
```

Or without the global link, run the CLI directly:

```bash
./dist/cli/index.js --version
```

5. **Verify installation**:

```bash
meatycapture --version
meatycapture --help
```

### Development Setup

If you're contributing to MeatyCapture, use the development mode:

```bash
# Start the development server
pnpm dev

# Or run the dev CLI with watching
pnpm build:cli && pnpm link --global

# Watch for changes
pnpm build:cli --watch
```

### Building Standalone Binaries

To build platform-specific binaries:

```bash
# Build for current platform
pnpm build:binary

# Build for all platforms
pnpm build:binary:all
```

Binaries will be created in the `dist/binary/` directory.

### Updating from Source

To update an existing source installation:

```bash
cd meatycapture
git pull origin main
pnpm install
pnpm build:cli
```

### Uninstalling from Source

If you linked the CLI globally:

```bash
pnpm unlink --global meatycapture
```

Then remove the cloned directory:

```bash
cd ..
rm -rf meatycapture
```

---

## Installation Summary

| Method | Best For | Speed | Dependencies | Effort |
|--------|----------|-------|--------------|--------|
| npm | Node.js developers | Medium | Node.js 18+ | Low |
| Homebrew | macOS/Linux users | Fast | Homebrew | Low |
| Standalone Binary | CI/CD, minimal environments | Fastest | None | Low |
| From Source | Contributors, custom builds | Slowest | Node.js, pnpm, Git | High |

---

## Requirements by Installation Method

### npm Install
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher (included with Node.js)

### Homebrew Install
- Homebrew (latest version)
- macOS 10.15+ or Linux with Homebrew

### Standalone Binary
- No dependencies
- Supported on: macOS (Intel/ARM64), Linux (x64/ARM64), Windows (x64)

### Building from Source
- Git
- Node.js 18.0.0 or higher
- pnpm 8.0.0 or higher

---

## Uninstalling

If you need to remove MeatyCapture, follow the instructions for the installation method you used.

### npm Uninstall

If you installed MeatyCapture using npm or pnpm:

```bash
# With npm
npm uninstall -g meatycapture

# Or with pnpm
pnpm remove -g meatycapture
```

**Note:** This removes the CLI binary but does not remove configuration files or request-log documents.

### Homebrew Uninstall

If you installed MeatyCapture using Homebrew:

```bash
# Remove the meatycapture package
brew uninstall meatycapture

# Optionally remove the tap
brew untap meatycapture/tap
```

### Standalone Binary Uninstall

If you installed the standalone binary, remove it from its installation location:

```bash
# If installed to /usr/local/bin/
sudo rm /usr/local/bin/meatycapture

# If installed to ~/.local/bin/
rm ~/.local/bin/meatycapture

# If installed elsewhere, replace /path/to/ with the actual location
rm /path/to/meatycapture
```

**Windows:** Delete the executable file from your installation directory (usually `C:\Users\YourUsername\AppData\Local\bin\` or similar) and remove the directory from your PATH.

### From Source Uninstall

If you built MeatyCapture from source:

```bash
# Remove the global link (if you created one)
pnpm unlink --global

# Delete the cloned directory
cd ..
rm -rf meatycapture/
```

### Removing Configuration Data

To completely remove MeatyCapture configuration and settings:

```bash
# Remove the MeatyCapture config directory
rm -rf ~/.meatycapture/
```

**Warning:** This removes:
- Project configurations
- Field catalogs
- All stored settings and preferences

**Note:** Request-log markdown files stored in other project directories are NOT affected by this command and will remain intact.

### Complete Uninstall Checklist

| Component | Location | Safe to Remove? | Impact |
|-----------|----------|-----------------|--------|
| CLI binary | `/usr/local/bin/meatycapture` | Yes | Removes the command |
| CLI binary | `~/.local/bin/meatycapture` | Yes | Removes the command |
| Config directory | `~/.meatycapture/` | Yes | Removes all settings |
| Request logs | Project directories | User choice | Preserves your data |

---

## Next Steps

Once installed, initialize MeatyCapture:

```bash
# Set up your configuration
meatycapture config init

# Create your first project
meatycapture project add --interactive
```

For more information, see:
- **[Quick Start Guide](../cli/index.md)** - Get up and running in 5 minutes
- **[CLI Reference](../cli/commands-reference.md)** - Full command documentation
- **[Configuration Guide](../cli/configuration.md)** - Customize your setup

---

## Troubleshooting

### General Issues

**"meatycapture: command not found"**
- Verify installation completed without errors
- Check that the binary location is in your PATH: `echo $PATH`
- On Linux/macOS, restart your terminal or run: `source ~/.bashrc` or `source ~/.zshrc`

**"Version mismatch"**
- Some methods may cache older versions
- Clear caches:
  - **npm**: `npm cache clean --force` then reinstall
  - **Homebrew**: `brew cleanup` then reinstall

**Permissions issues**
- Ensure you have write permissions to the installation directory
- Use `sudo` carefully, or install to a user directory instead

### Platform-Specific Help

**macOS with Apple Silicon**
- Ensure you downloaded the ARM64 binary or use Homebrew (auto-detects)
- Check your architecture: `uname -m` (should be `arm64`)

**Linux on ARM (Raspberry Pi, etc.)**
- Verify your system is 64-bit: `uname -m` (should be `aarch64`)
- Use the ARM64 binary if available

**Windows**
- Add the installation directory to PATH
- Restart PowerShell or Command Prompt after adding to PATH
- If using WSL2, follow Linux instructions instead

---

## Getting Help

If you encounter issues:

1. **Check the [troubleshooting section](#troubleshooting)** above
2. **Review [FAQ](../cli/index.md#faq)** in the Quick Start guide
3. **Check [existing issues](https://github.com/miethe/meatycapture/issues)** on GitHub
4. **Open a new issue** with:
   - Installation method used
   - Output of `meatycapture --version`
   - Output of `node --version` (if applicable)
   - Your operating system and architecture
   - Complete error message
