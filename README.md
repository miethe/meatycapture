# MeatyCapture

Lightweight CLI for logging enhancements, bugs, and ideas to structured markdown files with project-aware defaults and tag aggregation.

Perfect for teams that track work in Git repositories, want searchable local markdown documents, or need headless batch capture for CI/CD pipelines.

## Installation

```bash
npm install -g meatycapture
```

Or with pnpm:

```bash
pnpm install -g meatycapture
```

Verify the installation:

```bash
meatycapture --version
meatycapture --help
```

## Quick Start

Initialize configuration and create your first project:

```bash
# Set up default configuration
meatycapture config init

# Create a new project
meatycapture project add --interactive

# Create a request log document
meatycapture log create --interactive
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `meatycapture log create` | Create a new request log document |
| `meatycapture log append` | Add items to an existing document |
| `meatycapture log view` | View a request log document |
| `meatycapture log search` | Search across request logs |
| `meatycapture project add` | Register a new project |
| `meatycapture config set` | Configure API mode or storage |

## Usage Modes

**Local Mode (Default)**
Stores documents in `~/.meatycapture/`. No server required. Perfect for local development and Git-based workflows.

**API Mode**
Connect to a MeatyCapture server for centralized storage:

```bash
meatycapture config set api_url https://meatycapture.example.com
```

## Document Format

MeatyCapture generates structured markdown files with frontmatter:

```yaml
---
type: request-log
doc_id: REQ-20250121-meatycapture
item_count: 2
tags: [ux, api]
---

### REQ-20250121-meatycapture-01 - Feature title
**Type:** enhancement | **Priority:** medium | **Status:** triage
**Tags:** ux

- Description and details...
```

Documents are fully searchable and play nicely with Git-based workflows.

## Documentation

- **[Full CLI Documentation](https://github.com/miethe/meatycapture/tree/main/docs/user/cli)** - Complete command reference and examples
- **[Configuration Guide](https://github.com/miethe/meatycapture/tree/main/docs/user/cli/configuration.md)** - Environment variables and settings
- **[Usage Examples](https://github.com/miethe/meatycapture/tree/main/docs/user/cli/examples.md)** - Real-world usage patterns

## Requirements

- Node.js 18.0.0 or higher
- pnpm 8.0.0 or higher (if building from source)

## Development

MeatyCapture is built with TypeScript and includes both a CLI and optional React-based UI.

For development setup and full architecture information, see the [repository](https://github.com/miethe/meatycapture).

## License

See the LICENSE file in the repository.
