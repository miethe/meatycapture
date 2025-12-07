# MeatyCapture

Lightweight capture app for logging enhancements/bugs/ideas to request-log markdown files with project-aware defaults and tag aggregation.

## Architecture

```
meatycapture/
├── core/                 # Headless domain logic (UI-agnostic)
│   ├── models/           # Domain types
│   ├── validation/       # Field validation, ID generation
│   ├── serializer/       # Request-log markdown writer/parser
│   └── ports/            # Storage interfaces
├── adapters/             # Port implementations
│   ├── fs-local/         # File system read/write
│   └── config-local/     # Projects + field catalogs
├── ui/                   # React components
└── platform/             # Optional desktop shell
```

## Tech Stack

- TypeScript 5.x
- React 18.x
- Vite (build tool)
- Vitest (testing)
- CSS (glass/x-morphism design)

## Development

### Web Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### Desktop Application (Tauri)

**Prerequisites:** Install [Rust](https://www.rust-lang.org/tools/install) first.

```bash
# Install dependencies
pnpm install

# Start desktop app in dev mode (with hot reload)
pnpm tauri:dev

# Build desktop app for production
pnpm tauri:build
```

See [src-tauri/README.md](./src-tauri/README.md) for detailed Tauri setup instructions and platform-specific dependencies.

## Project Status

Phase: Pre-implementation (scaffolding)

See [CLAUDE.md](./CLAUDE.md) for detailed project documentation and architecture.
