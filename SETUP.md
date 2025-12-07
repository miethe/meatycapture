# MeatyCapture Setup Instructions

## Prerequisites

You need to have Node.js and pnpm installed on your system.

### Install Node.js

If Node.js is not installed, install it via one of these methods:

**Option 1: Using Homebrew (macOS)**
```bash
brew install node
```

**Option 2: Using nvm (recommended for version management)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js LTS
nvm install --lts
nvm use --lts
```

**Option 3: Download from nodejs.org**
Download from: https://nodejs.org/ (LTS version recommended)

### Install pnpm

Once Node.js is installed, install pnpm globally:

```bash
npm install -g pnpm
```

Or use the standalone installer:
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Project Installation

After prerequisites are installed:

```bash
# Navigate to project directory
cd /Users/miethe/dev/homelab/development/meatycapture

# Install dependencies
pnpm install

# Verify installation
pnpm typecheck
```

## Development

```bash
# Start dev server (http://localhost:3000)
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm typecheck

# Lint code
pnpm lint

# Format code
pnpm format
```

## Project Structure

```
meatycapture/
├── src/
│   ├── core/                 # Domain logic (UI-agnostic)
│   │   ├── models/           # Types: Project, FieldOption, ItemDraft, RequestLogDoc
│   │   ├── validation/       # Field validation, ID generation
│   │   ├── serializer/       # Markdown writer/parser
│   │   └── ports/            # Storage interfaces
│   ├── adapters/             # Port implementations
│   │   ├── fs-local/         # File system operations
│   │   └── config-local/     # Configuration management
│   ├── ui/                   # React components
│   ├── platform/             # Desktop shell (optional)
│   └── test/                 # Test utilities
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
└── eslint.config.js          # ESLint rules
```

## Next Steps

1. Install Node.js and pnpm (see above)
2. Run `pnpm install`
3. Start development with `pnpm dev`
4. Begin implementing core domain models as per the implementation plan

## Troubleshooting

### pnpm not found
- Ensure Node.js is installed: `node --version`
- Install pnpm globally: `npm install -g pnpm`
- Restart terminal after installation

### TypeScript errors
- Run `pnpm typecheck` to see all errors
- Ensure all dependencies are installed: `pnpm install`

### Port 3000 already in use
- Change port in vite.config.ts (server.port)
- Or kill process using port: `lsof -ti:3000 | xargs kill`
