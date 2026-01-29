# Homebrew Tap for MeatyCapture

This is the official Homebrew tap repository for [MeatyCapture](https://github.com/miethe/meatycapture) - a lightweight capture app for logging enhancements, bugs, and ideas to request-log markdown files.

## Installation

### Add the Tap and Install

```bash
brew tap miethe/meatycapture
brew install meatycapture
```

### Verify Installation

```bash
meatycapture --version
```

## Supported Platforms

- **macOS ARM64** (Apple Silicon / M1, M2, M3, etc.)
- **macOS x64** (Intel Macs)
- **Linux x64**
- **Linux ARM64**

The formula automatically downloads the correct binary for your platform.

## Usage

After installation, you can use MeatyCapture from the command line:

```bash
# Capture a new item
meatycapture

# Show version
meatycapture --version

# Show help
meatycapture --help
```

## Updating

To update MeatyCapture to the latest version:

```bash
brew update
brew upgrade meatycapture
```

## Uninstalling

To remove MeatyCapture:

```bash
brew uninstall meatycapture
```

To remove the tap repository:

```bash
brew untap miethe/meatycapture
```

## Troubleshooting

### Tap not found

If you encounter the error:
```
Error: miethe/meatycapture was not found in a brew tap
```

Make sure you've added the tap correctly:
```bash
brew tap miethe/meatycapture
```

### Formula not found

If the formula cannot be found:
```bash
# Clear Homebrew cache and update
brew update

# Try installing again
brew install meatycapture
```

### Permission denied

If you get permission errors when running the binary:
```bash
# Homebrew should handle this automatically, but you can manually fix it:
chmod +x $(which meatycapture)
```

### Reinstall from scratch

To perform a clean reinstall:

```bash
# Uninstall
brew uninstall meatycapture

# Remove the tap
brew untap miethe/meatycapture

# Clean cache
brew cleanup

# Reinstall
brew tap miethe/meatycapture
brew install meatycapture

# Verify
meatycapture --version
```

## Documentation

For more information about MeatyCapture, visit the main project repository:
- [MeatyCapture GitHub](https://github.com/miethe/meatycapture)
- [Project Documentation](https://github.com/miethe/meatycapture/docs)

## License

MeatyCapture is licensed under the MIT License. See the [main repository](https://github.com/miethe/meatycapture) for details.

## Support

For bug reports and feature requests, please visit:
[GitHub Issues](https://github.com/miethe/meatycapture/issues)

---

**Tap Repository:** [homebrew-meatycapture](https://github.com/miethe/homebrew-meatycapture)
