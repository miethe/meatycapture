/**
 * Type definitions for Bun runtime APIs
 *
 * Provides minimal type coverage for Bun.serve and related APIs
 * used in the server implementation. This allows TypeScript to
 * type-check server code without requiring full @types/bun package.
 *
 * Note: These are simplified types covering only what we use.
 * For full Bun API types, install @types/bun.
 */

declare global {
  /**
   * Bun runtime namespace
   */
  namespace Bun {
    /**
     * Server configuration options for Bun.serve
     */
    interface ServeOptions {
      /** Port to listen on */
      port: number;
      /** Enable development mode features (hot reload, better error messages) */
      development?: boolean;
      /** Request handler function */
      fetch: (request: Request) => Response | Promise<Response>;
      /** Hostname to bind to (default: '0.0.0.0') */
      hostname?: string;
      /** Enable SSL/TLS with certificate and key */
      tls?: {
        cert: string;
        key: string;
      };
    }

    /**
     * Server instance returned by Bun.serve
     */
    interface Server {
      /** Port the server is listening on */
      port: number;
      /** Hostname the server is bound to */
      hostname: string;
      /** Stop accepting new connections and close the server */
      stop(): void;
      /** Upgrade an HTTP connection to WebSocket */
      upgrade(req: Request): boolean;
    }

    /**
     * Creates an HTTP server using Bun's native implementation
     *
     * @param options - Server configuration
     * @returns Server instance
     *
     * @example
     * ```typescript
     * const server = Bun.serve({
     *   port: 3000,
     *   fetch(req) {
     *     return new Response('Hello World');
     *   },
     * });
     * ```
     */
    function serve(options: ServeOptions): Server;
  }
}

export {};
