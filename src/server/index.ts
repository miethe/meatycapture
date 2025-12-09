/* eslint-disable no-undef */
// ^ Bun global is provided by runtime, not recognized by ESLint

/**
 * Bun HTTP Server Entry Point
 *
 * Main entry point for MeatyCapture's REST API server.
 * Exposes existing file-based adapters (FsDocStore, LocalProjectStore, LocalFieldCatalogStore)
 * via HTTP endpoints for remote access from web/mobile clients.
 *
 * Features:
 * - Bun.serve native HTTP server (fast, lightweight)
 * - Configurable port via MEATYCAPTURE_SERVER_PORT env var (default: 3737)
 * - Health check endpoint for monitoring
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Structured logging via core logger
 * - Development vs production mode
 *
 * Environment Variables:
 * - PORT: HTTP listening port (default: 3737)
 * - MEATYCAPTURE_DATA_DIR: Base data directory (default: ~/.meatycapture)
 * - NODE_ENV: Environment mode (production | development)
 * - LOG_LEVEL: Logging verbosity (debug | info | warn | error)
 *
 * @example
 * ```bash
 * # Start server with defaults
 * bun run src/server/index.ts
 *
 * # Start with custom config
 * PORT=8080 MEATYCAPTURE_DATA_DIR=/data bun run src/server/index.ts
 * ```
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { logger, LogLevel } from '@core/logging';
import { createFsDocStore } from '@adapters/fs-local';
import { realClock } from '@adapters/clock';
import { createDocsRouter } from './routes/docs.js';
import { createDefaultCorsMiddleware } from './middleware/cors.js';

/**
 * Server configuration resolved from environment variables.
 *
 * Provides centralized access to all server settings with
 * sensible defaults and environment-aware behavior.
 */
interface ServerConfig {
  /** HTTP listening port */
  port: number;
  /** Base data directory for file storage */
  dataDir: string;
  /** Whether running in development mode */
  isDevelopment: boolean;
  /** Node environment string */
  environment: string;
}

/**
 * Health check response payload.
 *
 * Returns server status and metadata for monitoring/debugging.
 * Included in GET /health endpoint response.
 */
interface HealthCheckResponse {
  /** Always 'ok' if server is running */
  status: 'ok';
  /** ISO 8601 timestamp of the health check */
  timestamp: string;
  /** Server environment (production | development) */
  environment: string;
  /** Server uptime in milliseconds since start */
  uptime: number;
  /** Data directory being used */
  dataDir: string;
}

/**
 * Resolves server configuration from environment variables.
 *
 * Priority order for each setting:
 * 1. Explicit environment variable
 * 2. Default value
 *
 * @returns Resolved server configuration
 */
function getServerConfig(): ServerConfig {
  const port = Number(process.env.PORT) || 3737;
  const dataDir = process.env.MEATYCAPTURE_DATA_DIR || join(homedir(), '.meatycapture');
  const environment = process.env.NODE_ENV || 'development';
  const isDevelopment = environment !== 'production';

  return {
    port,
    dataDir,
    isDevelopment,
    environment,
  };
}

/**
 * Expands tilde (~) in path to user's home directory.
 *
 * Required because Node's fs methods don't expand ~ automatically.
 * Safe to call multiple times - already expanded paths are returned as-is.
 *
 * @param path - Path that may contain ~
 * @returns Path with ~ expanded to full home directory
 *
 * @example
 * ```typescript
 * expandPath('~/.meatycapture') // → '/Users/username/.meatycapture'
 * expandPath('/absolute/path')   // → '/absolute/path'
 * ```
 */
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return join(homedir(), path.slice(1));
  }
  return path;
}

/**
 * Main server initialization and startup.
 *
 * Responsibilities:
 * - Configure logging based on environment
 * - Resolve configuration from environment variables
 * - Initialize Bun HTTP server with routing
 * - Register signal handlers for graceful shutdown
 * - Log startup information
 * - Handle startup errors (port in use, etc.)
 */
async function main(): Promise<void> {
  // Configure logging for development vs production
  const config = getServerConfig();

  if (config.isDevelopment) {
    logger.configure({
      minLevel: LogLevel.DEBUG,
      prettyPrint: true,
    });
  }

  // Expand tilde in data directory path
  const expandedDataDir = expandPath(config.dataDir);

  logger.info('Starting MeatyCapture API server', {
    port: config.port,
    dataDir: expandedDataDir,
    environment: config.environment,
  });

  // Track server start time for uptime calculation
  const startTime = Date.now();

  // Initialize adapters and routers
  const docStore = createFsDocStore();
  const docsRouter = createDocsRouter(docStore, realClock);

  // Initialize CORS middleware
  const cors = createDefaultCorsMiddleware();

  let server: ReturnType<typeof Bun.serve> | null = null;

  try {
    server = Bun.serve({
      port: config.port,
      development: config.isDevelopment,

      /**
       * Request handler - routes incoming HTTP requests.
       *
       * Routes:
       * - GET /health - Health check endpoint
       * - /api/docs/* - DocStore operations (IMPLEMENTED)
       * - /api/projects/* - ProjectStore operations (TODO)
       * - /api/fields/* - FieldCatalogStore operations (TODO)
       *
       * @param req - Incoming HTTP request
       * @returns HTTP response
       */
      async fetch(req: Request): Promise<Response> {
        return cors(req, async () => {
        const url = new URL(req.url);
        const method = req.method;
        const path = url.pathname;

        // Log incoming request (debug level to avoid spam in production)
        logger.debug('Incoming request', {
          method,
          path,
          query: Object.fromEntries(url.searchParams),
        });

        // Health check endpoint
        if (method === 'GET' && path === '/health') {
          const uptime = Date.now() - startTime;

          const response: HealthCheckResponse = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: config.environment,
            uptime,
            dataDir: expandedDataDir,
          };

          logger.debug('Health check', { uptime });

          return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // DocStore routes
        if (path.startsWith('/api/docs')) {
          // GET /api/docs - List documents
          if (method === 'GET' && path === '/api/docs') {
            return await docsRouter.list(req);
          }

          // GET /api/docs/:doc_id - Read document
          if (method === 'GET' && /^\/api\/docs\/[^/]+$/.test(path)) {
            return await docsRouter.read(req);
          }

          // POST /api/docs/:doc_id - Write document
          if (method === 'POST' && /^\/api\/docs\/[^/]+$/.test(path)) {
            return await docsRouter.write(req);
          }

          // PATCH /api/docs/:doc_id/items - Append item
          if (method === 'PATCH' && /^\/api\/docs\/[^/]+\/items$/.test(path)) {
            return await docsRouter.appendItem(req);
          }

          // POST /api/docs/:doc_id/backup - Create backup
          if (method === 'POST' && /^\/api\/docs\/[^/]+\/backup$/.test(path)) {
            return await docsRouter.backup(req);
          }

          // HEAD /api/docs/:doc_id - Check writability
          if (method === 'HEAD' && /^\/api\/docs\/[^/]+$/.test(path)) {
            return await docsRouter.checkWritable(req);
          }
        }

        // 404 for unmatched routes
        const errorResponse = {
          error: 'Not Found',
          path,
          method,
        };

        logger.debug('Route not found', { method, path });

        return new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        });
      },
    });

    logger.info('Server started successfully', {
      port: config.port,
      url: `http://localhost:${config.port}`,
      dataDir: expandedDataDir,
    });

    logger.info('Health check available at', {
      endpoint: `http://localhost:${config.port}/health`,
    });
  } catch (error) {
    // Handle port already in use error
    if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
      logger.error('Failed to start server: Port already in use', {
        port: config.port,
        error: error.message,
      });
      console.error(`\nERROR: Port ${config.port} is already in use.`);
      console.error(`Please stop the other process or use a different port:\n`);
      console.error(`  PORT=8080 bun run src/server/index.ts\n`);
      process.exit(1);
    }

    // Handle other startup errors
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error('\nERROR: Failed to start server');
    console.error(error);
    process.exit(1);
  }

  /**
   * Graceful shutdown handler.
   *
   * Called on SIGTERM or SIGINT (Ctrl+C).
   * Ensures the server stops cleanly without dropping active connections.
   *
   * @param signal - Signal name that triggered shutdown
   */
  function gracefulShutdown(signal: string): void {
    logger.info('Received shutdown signal', { signal });

    if (server) {
      logger.info('Closing server...');

      // Stop accepting new connections
      server.stop();

      logger.info('Server closed successfully');
    }

    logger.info('Shutdown complete', { signal });
    process.exit(0);
  }

  // Register shutdown handlers for graceful termination
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Prevent process from exiting immediately
  // The server will run until a shutdown signal is received
}

// Start the server when this file is executed directly
// (as opposed to being imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Unhandled error in main', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });
}

// Export main function for testing purposes
export { main, getServerConfig, expandPath };
