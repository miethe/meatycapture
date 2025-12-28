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

## CLI Installation & Usage

The MeatyCapture CLI provides headless batch document creation and management—ideal for automation, scripting, and CI/CD pipelines.

### Prerequisites

- Node.js 18.0.0 or higher
- pnpm 8.0.0 or higher

### Installation (From Source)

```bash
# Clone the repository
git clone https://github.com/your-org/meatycapture.git
cd meatycapture

# Install dependencies
pnpm install

# Build the CLI
pnpm build:cli

# Link globally (makes 'meatycapture' command available system-wide)
npm link
```

### Verify Installation

```bash
meatycapture --version
meatycapture --help
```

### Quick Start

```bash
# Initialize configuration
meatycapture config init

# Verify your configuration and current mode
meatycapture config show

# Create your first project (interactive mode)
meatycapture project add --interactive

# Create a request log document
meatycapture log create --interactive

# Or from JSON file
meatycapture log create input.json
```

### Configuration

The CLI can operate in two modes:

**Local Mode (Default)**
Uses local filesystem storage at `~/.meatycapture/`. No server required.

**API Mode**
Connects to a MeatyCapture server for centralized storage. Set the API URL:

```bash
# Set API URL persistently
meatycapture config set api_url http://localhost:3737

# View current configuration and mode
meatycapture config show

# Clear API URL to return to local mode
meatycapture config set api_url ''
```

**Configuration Priority:**
1. `MEATYCAPTURE_API_URL` environment variable (highest)
2. `api_url` in `~/.meatycapture/config.json`
3. Local filesystem (default)

### Command Groups

| Group     | Description                                      |
| --------- | ------------------------------------------------ |
| `log`     | Create, append, view, search, list documents     |
| `project` | Manage project configurations                    |
| `field`   | Manage field catalogs (type, domain, priority)   |
| `config`  | Manage global configuration                      |

### Documentation

For complete CLI documentation:

- [CLI Overview](docs/user/cli/index.md) - Quick start and overview
- [Commands Reference](docs/user/cli/commands-reference.md) - All 19 commands
- [Examples](docs/user/cli/examples.md) - Common usage patterns
- [Configuration](docs/user/cli/configuration.md) - Environment and settings

## Project Status

Phase: Pre-implementation (scaffolding)

See [CLAUDE.md](./CLAUDE.md) for detailed project documentation and architecture.
