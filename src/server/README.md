# MeatyCapture Server

Bun-based HTTP server that exposes MeatyCapture's file-based adapters via REST API.

## Quick Start

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Start server with defaults (port 3737)
bun run src/server/index.ts

# Start with custom configuration
PORT=8080 MEATYCAPTURE_DATA_DIR=/data bun run src/server/index.ts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listening port | `3737` |
| `MEATYCAPTURE_DATA_DIR` | Base data directory | `~/.meatycapture` |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity (debug, info, warn, error) | `info` |

## Endpoints

### Health Check

**GET /health**

Returns server status and metadata.

```bash
curl http://localhost:3737/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-08T12:00:00.000Z",
  "environment": "development",
  "uptime": 12345,
  "dataDir": "/Users/username/.meatycapture"
}
```

## Features

- **Bun.serve**: Native HTTP server (fast, lightweight, modern)
- **Graceful Shutdown**: Handles SIGTERM/SIGINT cleanly
- **Structured Logging**: JSON logs in production, pretty-print in development
- **Development Mode**: Enhanced error messages and hot reload support
- **Port Detection**: Detects EADDRINUSE and provides helpful error message
- **Path Expansion**: Automatically expands `~/` in MEATYCAPTURE_DATA_DIR

## Architecture

```
src/server/
├── index.ts          # Main entry point (this file)
├── middleware/       # HTTP middleware (auth, CORS, logging)
└── README.md         # This file
```

## Development

```bash
# Type check
pnpm typecheck

# Run tests (when implemented)
bun test src/server/

# Start with debug logging
LOG_LEVEL=debug bun run src/server/index.ts
```

## Production Deployment

```bash
# Set production environment
NODE_ENV=production PORT=3737 bun run src/server/index.ts

# Docker example
docker run -d \
  -p 3737:3737 \
  -v /data:/data \
  -e MEATYCAPTURE_DATA_DIR=/data \
  -e NODE_ENV=production \
  meatycapture-server
```

## Error Handling

### Port Already in Use

If port 3737 is in use, the server will exit with a clear error message:

```
ERROR: Port 3737 is already in use.
Please stop the other process or use a different port:
  PORT=8080 bun run src/server/index.ts
```

### Startup Failures

All startup errors are logged with full context and stack traces for debugging.

## Next Steps

Future endpoints to be implemented:
- `GET /api/docs/list` - List documents
- `GET /api/docs/read` - Read document
- `POST /api/docs/write` - Write document
- `POST /api/docs/append` - Append item
- `GET /api/projects/list` - List projects
- `GET /api/fields/global` - Get global field options

See `docs/project_plans/PRDs/features/server-storage-v1.md` for full API specification.
