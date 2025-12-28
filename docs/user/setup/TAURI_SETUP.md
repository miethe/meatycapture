# Tauri Desktop Setup - Quick Start

This guide will help you set up MeatyCapture as a native desktop application using Tauri v2.

## What Was Configured

The project now includes:

- ✅ Tauri v2 configuration and build files
- ✅ Platform-aware filesystem adapter (Node.js + Tauri)
- ✅ Desktop app configuration (800x600 window, resizable)
- ✅ File system permissions (full home directory access)
- ✅ npm scripts for development and building
- ✅ Automatic platform detection utilities
- ✅ Setup verification script

## Quick Start

### 1. Verify Prerequisites

```bash
pnpm verify:tauri
```

This will check if you have all required dependencies installed.

### 2. Install Rust (if needed)

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env
```

**Windows:**
Download and run [rustup-init.exe](https://rustup.rs/)

Verify installation:
```bash
rustc --version
cargo --version
```

### 3. Install Dependencies

```bash
pnpm install
```

This will install both Node.js and Tauri dependencies, including:
- `@tauri-apps/api` - Tauri JavaScript API
- `@tauri-apps/plugin-fs` - File system plugin
- `@tauri-apps/cli` - Tauri CLI tool

### 4. Start Development

```bash
pnpm tauri:dev
```

This will:
1. Start the Vite dev server
2. Build the Rust code
3. Open the app in a native window
4. Enable hot reload for React changes

**First run will take longer** as it downloads and compiles Rust dependencies.

### 5. Build for Production

```bash
pnpm tauri:build
```

Output locations:
- **macOS:** `src-tauri/target/release/bundle/dmg/`
- **Windows:** `src-tauri/target/release/bundle/msi/`
- **Linux:** `src-tauri/target/release/bundle/deb/`

## Project Structure

```
meatycapture/
├── src-tauri/                    # Tauri configuration
│   ├── tauri.conf.json          # App settings (window, permissions)
│   ├── Cargo.toml               # Rust dependencies
│   ├── src/
│   │   ├── main.rs              # Desktop app entry point
│   │   └── lib.rs               # Shared library code
│   └── icons/                   # App icons (todo)
├── src/
│   ├── platform/
│   │   └── index.ts             # Platform detection (isTauri, etc.)
│   └── adapters/fs-local/
│       ├── index.ts             # Node.js filesystem adapter
│       ├── tauri-fs-adapter.ts  # Tauri filesystem adapter
│       └── platform-factory.ts  # Auto-selects correct adapter
└── verify-tauri-setup.js        # Setup verification script
```

## How It Works

### Platform Detection

The app automatically detects whether it's running in Tauri:

```typescript
import { isTauri } from '@platform';

if (isTauri()) {
  // Running in desktop app
} else {
  // Running in web browser
}
```

### Filesystem Adapters

The correct filesystem adapter is selected automatically:

```typescript
import { createDocStore } from '@adapters/fs-local/platform-factory';

// Automatically uses:
// - TauriDocStore in desktop app
// - FsDocStore in Node.js/CLI
const store = createDocStore();

// Now use the store
const docs = await store.list('~/meatycapture');
```

### File System Permissions

The desktop app has read/write access to:
- ✅ Entire home directory (`$HOME/**`)

This is configured in `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "fs": {
      "scope": {
        "allow": ["$HOME/**"]
      }
    }
  }
}
```

## Development Workflow

### Web Development (No Rust Required)

```bash
pnpm dev
```

Works exactly as before - pure web app in browser.

### Desktop Development (Rust Required)

```bash
pnpm tauri:dev
```

Opens native window with:
- Full filesystem access
- Native performance
- OS integration

### Code Changes

**React/TypeScript changes:**
- Auto hot-reload in both web and desktop

**Rust changes:**
- Requires app restart (`Ctrl+C` then `pnpm tauri:dev` again)

## Troubleshooting

### "rustc not found"

Install Rust (see step 2 above).

### "No such file or directory: 'cargo'"

Add Cargo to your PATH:
```bash
source $HOME/.cargo/env
```

### Build hangs or takes very long

First build downloads and compiles all Rust dependencies. This can take 5-10 minutes.
Subsequent builds are much faster (incremental compilation).

### "Failed to load resource" in Tauri window

Make sure Vite dev server is running on port 3000. If port is in use, update `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "devUrl": "http://localhost:YOUR_PORT"
  }
}
```

### Window won't open

Check the terminal for error messages. Common issues:
- Vite dev server not running
- Port 3000 already in use
- Missing Rust dependencies

## Platform-Specific Notes

### macOS

- Requires Xcode Command Line Tools
- First app launch may show security warning (allow in System Preferences)
- Built `.dmg` requires code signing for distribution

### Windows

- Requires Visual Studio C++ Build Tools
- Built `.msi` requires code signing for distribution
- Windows Defender may scan first run

### Linux

- Requires WebKit2GTK and other dependencies (see `src-tauri/README.md`)
- Built `.deb`/`.AppImage` ready for distribution

## Next Steps

1. **Add App Icons**
   - Place 1024x1024 PNG in `src-tauri/icons/`
   - Run `pnpm tauri icon icons/icon.png` to generate all formats

2. **Update App Metadata**
   - Edit `src-tauri/tauri.conf.json`
   - Update version, description, authors

3. **Configure Auto-Updates** (Optional)
   - Set up GitHub releases
   - Add Tauri updater plugin
   - Configure automatic update checks

4. **Code Signing** (For Distribution)
   - macOS: Apple Developer certificate
   - Windows: Code signing certificate
   - Prevents security warnings on first launch

## Documentation

- [Full Tauri Setup Guide](./src-tauri/README.md)
- [Filesystem Adapters](./src/adapters/fs-local/README.md)
- [Tauri v2 Docs](https://v2.tauri.app/)
- [Rust Installation](https://www.rust-lang.org/tools/install)

## Support

If you encounter issues:

1. Run verification: `pnpm verify:tauri`
2. Check [src-tauri/README.md](./src-tauri/README.md) for detailed troubleshooting
3. Review Tauri docs: https://v2.tauri.app/
4. Check GitHub issues

---

**Remember:** The web version (`pnpm dev`) still works without Rust. Desktop app is an optional enhancement for native filesystem access.
