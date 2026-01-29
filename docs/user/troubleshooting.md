---
title: MeatyCapture CLI Troubleshooting Guide
description: Comprehensive troubleshooting guide for MeatyCapture CLI installation, configuration, and runtime issues across all platforms
audience: users, developers
tags: [troubleshooting, faq, installation, configuration, support]
created: 2025-01-25
updated: 2025-01-25
category: user-guide
status: published
related:
  - docs/user/installation.md
  - docs/user/cli/index.md
  - docs/user/cli/configuration.md
---

# MeatyCapture CLI Troubleshooting Guide

Comprehensive troubleshooting guide for MeatyCapture CLI. Use this guide to diagnose and resolve common issues across all installation methods and platforms.

---

## Quick Troubleshooting Reference

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| "meatycapture: command not found" | Binary not in PATH or not installed | [See Installation Issues](#installation-issues) |
| "Permission denied" when running binary | Binary not executable or permission issue | `chmod +x meatycapture` or use sudo |
| Configuration not found | Wrong config directory or not initialized | Run `meatycapture config init` |
| "Cannot write to file" | Directory not writable or no permissions | Check directory permissions with `ls -la` |
| "Invalid project path" | Path doesn't exist or not writable | Create directory or update project path |
| Command hangs or freezes | Corrupted config or API connection issue | Check file permissions, API URL |
| Projects not found | projects.json missing or corrupted | Reinitialize with `meatycapture config init --force` |
| Duplicate items in document | Parse error on append | Check markdown formatting in existing document |
| Wrong architecture binary | Downloaded for wrong CPU type | Check `uname -m`, reinstall correct binary |
| API mode not working | Server not running or URL incorrect | Verify server is running, check `MEATYCAPTURE_API_URL` |

---

## Installation Issues

### npm Install Issues

#### "npm: command not found"

**Cause:** Node.js is not installed or npm is not in your PATH.

**Solution:**

```bash
# Verify Node.js installation
node --version

# If not installed:
# Visit https://nodejs.org/ and install Node.js 18.0.0 or higher
# (npm comes with Node.js)

# Verify npm installation
npm --version
```

#### "meatycapture: command not found" (after npm install)

**Cause:** npm's global bin directory is not in your PATH.

**Solution:**

Check where npm installs global packages:

```bash
# Check npm global prefix
npm config get prefix

# Example output: /usr/local/bin or /home/user/.npm-global
```

Then verify the binary exists:

```bash
# Check if binary exists in npm's bin directory
ls -la $(npm config get prefix)/bin/ | grep meatycapture

# Or verify directly
which meatycapture
```

**Fix options:**

**Option 1:** Reinstall MeatyCapture (may require sudo)

```bash
npm uninstall -g meatycapture
npm install -g meatycapture
```

**Option 2:** Add npm global bin to PATH (recommended)

Determine your npm global prefix:

```bash
NPM_PREFIX=$(npm config get prefix)
echo "export PATH=$NPM_PREFIX/bin:$PATH" >> ~/.bashrc
source ~/.bashrc
```

For **zsh**, use `~/.zshrc` instead of `~/.bashrc`:

```bash
NPM_PREFIX=$(npm config get prefix)
echo "export PATH=$NPM_PREFIX/bin:$PATH" >> ~/.zshrc
source ~/.zshrc
```

**Option 3:** Reconfigure npm to use a user directory (avoid sudo)

```bash
# Create local npm directory
mkdir -p ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall
npm install -g meatycapture
```

#### "Permission denied" during npm install

**Cause:** Attempting to install to system directory without sudo, or conflicting permission settings.

**Solution:**

**Option 1:** Use sudo (quick but less recommended)

```bash
sudo npm install -g meatycapture
```

**Option 2:** Reconfigure npm to avoid permissions (recommended)

```bash
# Create local npm directory
mkdir -p ~/.npm-global

# Configure npm
npm config set prefix '~/.npm-global'

# Add to PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Install without sudo
npm install -g meatycapture
```

**Option 3:** Fix npm directory permissions

```bash
# Fix permissions
sudo chown -R $(whoami) /usr/local/lib/node_modules
sudo chown -R $(whoami) /usr/local/bin

# Then install
npm install -g meatycapture
```

#### "Multiple Node.js versions installed" or version mismatch

**Cause:** You have multiple Node.js versions installed (via nvm, asdf, Homebrew, etc.) and the wrong version is active.

**Solution:**

Check active Node.js version:

```bash
node --version
# Should be v18.0.0 or higher
```

**If using nvm:**

```bash
# List installed versions
nvm list

# Use version 18 or higher
nvm use 18

# Set as default
nvm alias default 18
```

**If using asdf:**

```bash
# List installed versions
asdf list nodejs

# Set local version
asdf local nodejs 18.x.x

# Or set global
asdf global nodejs 18.x.x
```

**If using Homebrew:**

```bash
# Check installed version
brew list --versions node

# Unlink old version
brew unlink node@16

# Link newer version
brew link node
```

#### npm cache corruption

**Cause:** Corrupted npm cache preventing clean install.

**Solution:**

```bash
# Clear npm cache
npm cache clean --force

# Uninstall
npm uninstall -g meatycapture

# Reinstall
npm install -g meatycapture
```

---

### Homebrew Install Issues

#### "Tap not found: meatycapture/tap"

**Cause:** The tap hasn't been added yet, or the tap URL is incorrect.

**Solution:**

```bash
# Add the tap
brew tap meatycapture/tap

# Verify tap was added
brew tap-info meatycapture/tap

# If tap-info fails, try:
brew tap-info meatycapture/tap 2>&1
```

#### "No available formula for meatycapture"

**Cause:** Formula not found in the tap, or tap not properly added.

**Solution:**

```bash
# Verify Homebrew is up to date
brew update

# Try adding tap again
brew untap meatycapture/tap
brew tap meatycapture/tap

# List available formulas in tap
brew formulas | grep meatycapture

# Try installing again
brew install meatycapture
```

#### "Checksum mismatch" or "SHA256 verification failed"

**Cause:** Downloaded file doesn't match expected checksum (corrupted download or formula issue).

**Solution:**

```bash
# Clear Homebrew cache
brew cleanup

# Try installing again
brew install meatycapture

# If still fails, force download
brew install --no-cache meatycapture
```

#### "Wrong architecture installed" (e.g., x86 on Apple Silicon)

**Cause:** Homebrew installed the wrong architecture binary.

**Solution:**

Check your system architecture:

```bash
# Check CPU architecture
uname -m

# On Apple Silicon M1/M2/M3: outputs arm64
# On Intel: outputs x86_64
```

Fix the installation:

```bash
# Uninstall current version
brew uninstall meatycapture

# Clear cache
brew cleanup

# Reinstall (Homebrew should detect correct architecture)
brew install meatycapture

# Verify correct binary installed
file $(which meatycapture)
```

#### "meatycapture: command not found" (after Homebrew install)

**Cause:** Binary installed but not in PATH.

**Solution:**

```bash
# Check where Homebrew installed it
brew list meatycapture

# Verify it's in PATH
which meatycapture

# If not found, try:
brew link meatycapture

# Or find it manually
find /usr/local/Cellar -name meatycapture 2>/dev/null
```

---

### Standalone Binary Issues

#### "meatycapture: command not found" (after downloading and moving)

**Cause:** Binary not in PATH or PATH not updated.

**Solution:**

Verify the binary location:

```bash
# Check if file exists
ls -la /usr/local/bin/meatycapture

# Or wherever you moved it
ls -la ~/.local/bin/meatycapture
```

Check your PATH:

```bash
# List directories in PATH
echo $PATH | tr ':' '\n'

# Verify location is in PATH
echo $PATH | grep /usr/local/bin
```

**Fix options:**

**Option 1:** Move binary to directory already in PATH

```bash
# System-wide (requires sudo)
sudo mv meatycapture /usr/local/bin/

# Or user-local
mkdir -p ~/.local/bin
mv meatycapture ~/.local/bin/
```

**Option 2:** Add binary directory to PATH

```bash
# Add to .bashrc
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Or for zsh
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Verify
echo $PATH
```

#### "Permission denied" when running binary

**Cause:** Binary is not executable.

**Solution:**

```bash
# Check current permissions
ls -la meatycapture

# Make executable
chmod +x meatycapture

# Verify it's executable (should show 'x')
ls -la meatycapture
# Example: -rwxr-xr-x

# Try running
./meatycapture --version
```

#### "Mach-O 64-bit executable image not valid" (macOS)

**Cause:** Downloaded the wrong architecture binary for your CPU.

**Solution:**

Check your system architecture:

```bash
# Check CPU type
uname -m

# Apple Silicon M1/M2/M3: arm64 → download meatycapture-macos-arm64
# Intel Mac: x86_64 → download meatycapture-macos-x64
```

Download the correct binary:

```bash
# For Apple Silicon
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-macos-arm64 \
  -o meatycapture

# For Intel
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-macos-x64 \
  -o meatycapture

# Make executable
chmod +x meatycapture

# Move to PATH
sudo mv meatycapture /usr/local/bin/

# Verify
meatycapture --version
```

#### "ELF 64-bit LSB executable, x86-64, dynamic" (Linux on wrong architecture)

**Cause:** Downloaded x86-64 binary on ARM system (or vice versa).

**Solution:**

Check your system architecture:

```bash
# Check CPU architecture
uname -m

# x86-64: x86_64 → download meatycapture-linux-x64
# ARM64 (Raspberry Pi 4+): aarch64 → download meatycapture-linux-arm64
```

Download the correct binary:

```bash
# For x86-64
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-linux-x64 \
  -o meatycapture

# For ARM64
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-linux-arm64 \
  -o meatycapture

# Make executable
chmod +x meatycapture

# Move to PATH
sudo mv meatycapture /usr/local/bin/

# Verify
meatycapture --version
```

#### Binary works from PATH but not from current directory

**Cause:** Current directory not in PATH (security feature).

**Solution:**

Use explicit relative path:

```bash
# Instead of:
meatycapture --version  # May fail

# Use:
./meatycapture --version  # Works

# Or full path:
/usr/local/bin/meatycapture --version
```

Or move binary to a directory in PATH:

```bash
sudo mv meatycapture /usr/local/bin/
meatycapture --version
```

---

### Build from Source Issues

#### "Git not found"

**Cause:** Git is not installed.

**Solution:**

Install Git:

**macOS:**
```bash
brew install git
```

**Ubuntu/Debian:**
```bash
sudo apt-get install git
```

**Fedora/RHEL:**
```bash
sudo dnf install git
```

**Windows:**
Download from https://git-scm.com/download/win

#### "Node.js version too old"

**Cause:** Node.js version is below 18.0.0.

**Solution:**

Update Node.js:

```bash
# Check current version
node --version

# Install newer version (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

Or download from https://nodejs.org (v18.0.0 or higher)

#### "pnpm not found" or "pnpm version too old"

**Cause:** pnpm is not installed or version is below 8.0.0.

**Solution:**

Install or upgrade pnpm:

```bash
# Check version
pnpm --version

# Install/upgrade (using npm)
npm install -g pnpm

# Or using Homebrew
brew install pnpm

# Verify
pnpm --version  # Should be 8.0.0 or higher
```

#### Build fails with "ENOENT: no such file or directory"

**Cause:** Missing dependencies or corrupted node_modules.

**Solution:**

```bash
# Clean up
rm -rf node_modules pnpm-lock.yaml

# Reinstall dependencies
pnpm install

# Try building again
pnpm build:cli
```

#### "Command pnpm link not found" or linking fails

**Cause:** pnpm global bin directory not in PATH.

**Solution:**

```bash
# Check pnpm home directory
pnpm config get dir

# Add to PATH
echo 'export PATH=$(pnpm config get dir)/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify
which pnpm

# Try linking again
pnpm link --global
```

---

## Runtime Issues

### "meatycapture: command not found"

This is the most common error. It means the binary is either not installed or not in your PATH.

**Diagnosis:**

```bash
# Check if installed
which meatycapture

# If not found:
echo $PATH

# Check installation method
npm list -g meatycapture       # For npm install
brew list meatycapture         # For Homebrew
ls -la /usr/local/bin/meatycapture  # For binary install
```

**Solution:**

See [Installation Issues](#installation-issues) above for your installation method.

### "Permission denied"

**Cause:** Binary is not executable, or you don't have read/execute permissions.

**Solution:**

```bash
# Check file permissions
ls -la $(which meatycapture)

# Make executable
chmod +x $(which meatycapture)

# If using sudo isn't ideal, check permissions
sudo chown $(whoami) $(which meatycapture)
```

---

## Configuration Issues

### Configuration file not found

**Cause:** Configuration directory doesn't exist or is set to wrong location.

**Solution:**

Check configuration directory:

```bash
# Show current configuration
meatycapture config show

# If error, check environment variable
echo $MEATYCAPTURE_CONFIG_DIR

# Initialize if missing
meatycapture config init
```

### "Config directory does not exist" error

**Cause:** MEATYCAPTURE_CONFIG_DIR points to non-existent directory.

**Solution:**

```bash
# Check what directory is configured
meatycapture config show --config-dir

# Create it if missing
mkdir -p $(meatycapture config show --config-dir)

# Or reinitialize
meatycapture config init
```

### "projects.json not found"

**Cause:** Configuration not initialized yet.

**Solution:**

```bash
# Initialize configuration
meatycapture config init

# Verify projects.json was created
test -f ~/.meatycapture/projects.json && echo "Found" || echo "Missing"

# Create your first project
meatycapture project add --interactive
```

### "fields.json not found or corrupted"

**Cause:** Configuration directory damaged or incomplete.

**Solution:**

```bash
# Reinitialize (overwrites existing files)
meatycapture config init --force

# Verify
ls -la ~/.meatycapture/*.json
```

### Environment variable not being applied

**Cause:** Variable not exported, or shell doesn't inherit it.

**Solution:**

Check if variable is exported:

```bash
# Check if set
echo $MEATYCAPTURE_CONFIG_DIR

# If empty, set and export it
export MEATYCAPTURE_CONFIG_DIR=/path/to/config
echo $MEATYCAPTURE_CONFIG_DIR

# Verify in subshell
bash -c 'echo $MEATYCAPTURE_CONFIG_DIR'
```

Make permanent by adding to shell profile:

```bash
# For bash
echo 'export MEATYCAPTURE_CONFIG_DIR=/path/to/config' >> ~/.bashrc
source ~/.bashrc

# For zsh
echo 'export MEATYCAPTURE_CONFIG_DIR=/path/to/config' >> ~/.zshrc
source ~/.zshrc
```

---

## Project and File Issues

### "Invalid project path"

**Cause:** Project path doesn't exist or is not writable.

**Solution:**

```bash
# List projects
meatycapture project list

# Check the problematic project's path
meatycapture project list --json | jq '.[] | {id, default_path}'

# Verify path exists
ls -la /path/to/project

# If missing, create it
mkdir -p /path/to/project

# Update project if path changed
meatycapture project update project-id --path /new/path
```

### "Cannot write to file" or "Permission denied"

**Cause:** Directory is not writable by current user.

**Solution:**

Check permissions:

```bash
# Check current permissions
ls -la ~/.meatycapture/

# Check specific project directory
ls -la /path/to/project

# Fix permissions
chmod 755 ~/.meatycapture
chmod 755 /path/to/project

# Verify
touch /path/to/project/test.txt && rm /path/to/project/test.txt && echo "Writable"
```

### "Document file already exists"

**Cause:** You're trying to create a document that already exists without overwrite flag.

**Solution:**

```bash
# Append to existing document instead
meatycapture log append /path/to/existing.md input.json

# Or create with different date/project
meatycapture log create input.json --output /path/to/new-name.md

# Or force overwrite (with backup)
meatycapture log create input.json --force
```

### Corrupted request-log file or parse errors

**Cause:** Markdown file is malformed or has invalid YAML frontmatter.

**Solution:**

**Step 1:** Verify the file format:

```bash
# View the file
meatycapture log view /path/to/document.md

# Or view with cat to see raw content
cat /path/to/document.md | head -20
```

**Step 2:** Check YAML frontmatter:

The file should start with:

```yaml
---
type: request-log
doc_id: REQ-YYYYMMDD-project-id
item_count: N
tags: [tag1, tag2]
items_index: [...]
---
```

**Step 3:** Restore from backup:

```bash
# Check for backup
ls -la /path/to/document.md*

# Restore if backup exists
cp /path/to/document.md.bak /path/to/document.md

# Verify
meatycapture log view /path/to/document.md
```

**Step 4:** Recreate if necessary:

```bash
# Move corrupted file
mv /path/to/document.md /path/to/document.md.corrupted

# Verify backup was created
ls -la /path/to/document.md.bak

# Restore
cp /path/to/document.md.bak /path/to/document.md
```

### Duplicate items when appending

**Cause:** Document parsing error causing items to be read twice.

**Solution:**

```bash
# View the document
meatycapture log view /path/to/document.md

# Restore from backup
cp /path/to/document.md.bak /path/to/document.md

# Try appending again with explicit format
meatycapture log append /path/to/document.md input.json --verbose
```

---

## Platform-Specific Issues

### macOS

#### "Cannot open meatycapture because the developer cannot be verified" (Gatekeeper)

**Cause:** macOS Gatekeeper blocks unverified developers (code signing issue).

**Solution:**

**Option 1:** Bypass Gatekeeper for this file

```bash
# Check the binary
xattr -d com.apple.quarantine /usr/local/bin/meatycapture

# Verify
spctl --assess --type execute /usr/local/bin/meatycapture
```

**Option 2:** Allow in System Preferences

1. Open System Preferences → Security & Privacy
2. Under "General" tab, click "Open Anyway" next to MeatyCapture
3. Click "Open"

**Option 3:** Disable Gatekeeper (not recommended)

```bash
# Temporarily disable
sudo spctl --master-disable

# Re-enable after
sudo spctl --master-enable
```

#### "dyld: Library not loaded" (missing dependencies)

**Cause:** Required system library is missing.

**Solution:**

```bash
# Find missing library
dyld -V meatycapture 2>&1 | grep "not found"

# Install missing dependency
brew install library-name

# Reinstall meatycapture
brew reinstall meatycapture
```

#### Homebrew formula not found for Apple Silicon

**Cause:** Formula not available for ARM64 architecture.

**Solution:**

```bash
# Check available architectures
brew info meatycapture

# Try installing with architecture flag
arch -arm64 brew install meatycapture

# Or try x86-64 emulation
arch -x86_64 brew install meatycapture
```

---

### Linux

#### "cannot execute binary file: Exec format error"

**Cause:** Binary not compatible with your Linux system (wrong architecture or libc version).

**Solution:**

Check your system:

```bash
# Check CPU architecture
uname -m       # x86_64, aarch64, armv7l, etc.

# Check glibc version
ldd --version | head -1

# Check if file is actually a binary
file meatycapture
```

Download the correct binary:

```bash
# For x86-64
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-linux-x64 \
  -o meatycapture

# For ARM64 (aarch64)
curl -L https://github.com/miethe/meatycapture/releases/download/v{version}/meatycapture-linux-arm64 \
  -o meatycapture

# Make executable and move
chmod +x meatycapture
sudo mv meatycapture /usr/local/bin/
```

#### "error while loading shared libraries: libstdc++.so.6"

**Cause:** Missing libstdc++ library.

**Solution:**

Install the required library:

**Ubuntu/Debian:**
```bash
sudo apt-get install libstdc++6
```

**Fedora/RHEL:**
```bash
sudo dnf install libstdc++
```

**Alpine:**
```bash
apk add libstdc++
```

#### musl vs glibc compatibility

**Cause:** Binary built for glibc but system uses musl (e.g., Alpine Linux).

**Solution:**

Check your libc:

```bash
# Check which libc is used
ldd --version

# musl doesn't work well with glibc binaries
# Try installing via npm instead
npm install -g meatycapture

# Or build from source
git clone https://github.com/miethe/meatycapture.git
cd meatycapture
pnpm install
pnpm build:cli
pnpm link --global
```

---

### Windows

#### "Command not found" in PowerShell or CMD

**Cause:** Binary not in PATH or not installed.

**Solution:**

Check if binary is installed:

```powershell
# In PowerShell
Get-Command meatycapture

# Or try full path
C:\Users\YourUsername\AppData\Local\bin\meatycapture --version
```

Add to PATH:

1. Right-click "This PC" or "My Computer" → Properties
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", find "Path" and click Edit
5. Click "New" and add the folder where meatycapture is located
6. Click OK and restart PowerShell

Verify PATH:

```powershell
# In PowerShell
$env:Path

# Add temporarily for current session
$env:Path += ";C:\Users\YourUsername\AppData\Local\bin"

# Make permanent by editing system environment variables
```

#### "Access Denied" or permission errors

**Cause:** File permissions or antivirus blocking.

**Solution:**

Try running as Administrator:

```powershell
# Right-click PowerShell and select "Run as Administrator"
meatycapture --version
```

Check if antivirus is blocking:

```powershell
# Temporarily disable antivirus and try again
# Then add meatycapture.exe to whitelist
```

#### WSL2 Issues

If using Windows Subsystem for Linux:

```bash
# You're in a Linux environment, follow Linux troubleshooting instead
uname -a
```

---

## API Mode Issues

### "Connection refused" or "Cannot reach server"

**Cause:** API server is not running or URL is incorrect.

**Solution:**

```bash
# Check API URL configuration
meatycapture config show

# Or check environment variable
echo $MEATYCAPTURE_API_URL

# Verify server is running and accessible
curl -I http://localhost:3737

# If server is not running, start it
meatycapture serve --port 3737

# Then in another terminal
export MEATYCAPTURE_API_URL=http://localhost:3737
meatycapture project list
```

### "Invalid API URL"

**Cause:** API URL format is incorrect or unreachable.

**Solution:**

```bash
# Set correct API URL
meatycapture config set api_url http://localhost:3737

# Verify
meatycapture config show

# Test connection
curl http://localhost:3737/health
```

### API mode commands fail but local mode works

**Cause:** Server configuration or network issue.

**Solution:**

```bash
# Check if API mode is enabled
meatycapture config show | grep adapter_mode

# Temporarily disable API mode
meatycapture config set api_url ''

# Or test with environment variable
MEATYCAPTURE_API_URL='' meatycapture project list

# Check server logs for errors
# (depends on how server is running)
```

---

## Getting Diagnostic Information

When reporting issues, gather this information:

### Version Information

```bash
# MeatyCapture version
meatycapture --version

# Node.js version (if installed via npm)
node --version
npm --version
pnpm --version

# Operating system
uname -a              # macOS/Linux
systeminfo            # Windows
```

### Configuration

```bash
# Show configuration
meatycapture config show --json

# Show all files
ls -la ~/.meatycapture/
```

### Error Details

```bash
# Run command with verbose output
meatycapture log list my-project --verbose

# Or capture full error
meatycapture log list my-project 2>&1 | tee error.log
```

### File Information

```bash
# Check specific file
file meatycapture

# Check installed location
which meatycapture

# Check permissions
ls -la $(which meatycapture)

# Check PATH
echo $PATH
```

---

## Getting Help

### Check Documentation

- [Quick Start Guide](cli/index.md) - Get started in 5 minutes
- [Installation Guide](installation.md) - Detailed installation instructions
- [Configuration Guide](cli/configuration.md) - Configuration options
- [Commands Reference](cli/commands-reference.md) - All available commands

### Search Existing Issues

Visit [GitHub Issues](https://github.com/miethe/meatycapture/issues) and search for your error message.

### Report a New Issue

When creating a new issue, include:

1. **Title:** Concise description of the problem
2. **OS:** macOS / Linux / Windows (and version)
3. **Installation Method:** npm / Homebrew / Binary / From Source
4. **Installation Output:** `meatycapture --version`
5. **Error Message:** Full error text from the command
6. **Steps to Reproduce:** Commands that trigger the issue
7. **Configuration:** Output of `meatycapture config show --json`
8. **Environment:** Output of relevant env vars

Example issue:

```
Title: npm install fails with EACCES permission error

OS: macOS 13.1 (Apple Silicon)
Installation Method: npm
Node version: v18.14.0
npm version: 9.3.1

Error Message:
npm ERR! code EACCES
npm ERR! syscall mkdir
npm ERR! path /usr/local/lib/node_modules/meatycapture
npm ERR! errno -13

Steps to Reproduce:
1. npm install -g meatycapture

Expected: Installation succeeds
Actual: Permission denied error
```

---

## Frequently Asked Questions (FAQ)

### Can I have multiple installations?

**Q:** Can I install MeatyCapture via npm and also use a standalone binary?

**A:** Yes, but this is not recommended. If you have multiple installations:
- Verify which one is in PATH: `which meatycapture`
- Use the one you prefer and uninstall the others
- If they conflict, use absolute paths: `/usr/local/bin/meatycapture` vs `~/.local/bin/meatycapture`

### How do I uninstall MeatyCapture?

**npm:**
```bash
npm uninstall -g meatycapture
```

**Homebrew:**
```bash
brew uninstall meatycapture
brew untap meatycapture/tap
```

**Standalone Binary:**
```bash
rm /usr/local/bin/meatycapture   # Or wherever it's installed
```

**From Source:**
```bash
pnpm unlink --global meatycapture
cd ..
rm -rf meatycapture
```

### How do I update MeatyCapture?

**npm:**
```bash
npm update -g meatycapture
```

**Homebrew:**
```bash
brew upgrade meatycapture
```

**Standalone Binary:**
Download new version from [GitHub Releases](https://github.com/miethe/meatycapture/releases) and replace the old binary.

**From Source:**
```bash
cd meatycapture
git pull origin main
pnpm install
pnpm build:cli
```

### Can I use MeatyCapture offline?

**Local Mode:** Yes, completely offline. No server required.

**API Mode:** No, requires network access to the server.

Switch to local mode:
```bash
meatycapture config set api_url ''
```

### How do I back up my documents?

```bash
# Backup entire configuration directory
cp -r ~/.meatycapture ~/.meatycapture.backup

# Or backup specific project
cp -r /path/to/project /path/to/project.backup

# Automatic backups are created before overwriting documents
ls -la /path/to/document.md*
```

### Can I move my configuration to a new computer?

Yes:

```bash
# On old computer
cp -r ~/.meatycapture ~/.meatycapture.backup
tar -czf meatycapture-config.tar.gz ~/.meatycapture.backup

# Transfer file to new computer, then:
tar -xzf meatycapture-config.tar.gz
mv meatycapture-config ~/.meatycapture
```

---

## Still Having Issues?

If this guide doesn't solve your problem:

1. **Check logs** - Look for error messages in command output
2. **Try verbose mode** - Add `--verbose` flag to commands
3. **Search GitHub** - See if someone reported similar issue
4. **Create new issue** - Include diagnostic information from the section above
5. **Ask community** - Check discussions or community channels

Most issues are related to PATH configuration or missing installation steps. Double-check:

- Is the binary actually installed? (`which meatycapture`)
- Is it executable? (`ls -la $(which meatycapture)`)
- Is configuration initialized? (`ls -la ~/.meatycapture/`)
- Is the project created? (`meatycapture project list`)

---

## Related Documentation

- [Installation Guide](installation.md) - Complete installation instructions
- [Quick Start Guide](cli/index.md) - Get up and running
- [Configuration Guide](cli/configuration.md) - Configuration options
- [Commands Reference](cli/commands-reference.md) - Available commands
- [GitHub Issues](https://github.com/miethe/meatycapture/issues) - Report problems
