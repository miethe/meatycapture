/**
 * CORS Middleware for MeatyCapture Bun HTTP Server
 *
 * Handles cross-origin resource sharing for web app access from different ports
 * during development and production. Supports configurable origin validation,
 * preflight requests, and credential-based requests.
 *
 * @module server/middleware/cors
 */

/**
 * Configuration for CORS middleware behavior
 */
export interface CorsConfig {
  /**
   * List of allowed origins. Use ['*'] to allow all origins (development only).
   * In production, specify exact origins like ['https://app.example.com']
   */
  allowedOrigins: string[];

  /**
   * HTTP methods allowed for CORS requests
   * @default ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
   */
  allowedMethods?: string[];

  /**
   * Headers allowed in CORS requests
   * @default ['Content-Type', 'Authorization']
   */
  allowedHeaders?: string[];

  /**
   * Whether to allow credentials (cookies, auth headers)
   * @default true
   */
  allowCredentials?: boolean;

  /**
   * How long (in seconds) to cache preflight responses
   * @default 86400 (24 hours)
   */
  maxAge?: number;

  /**
   * Enable debug logging for CORS rejections
   * @default true in development
   */
  debug?: boolean;
}

/**
 * Default CORS configuration values
 */
const DEFAULT_CONFIG: Required<Omit<CorsConfig, 'allowedOrigins'>> = {
  allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
  debug: process.env.NODE_ENV !== 'production',
};

/**
 * Parses CORS_ORIGINS environment variable into array of allowed origins
 *
 * @returns Array of allowed origins, defaults to ['*'] if not configured
 * @example
 * // CORS_ORIGINS="http://localhost:5173,http://localhost:4173"
 * // Returns: ['http://localhost:5173', 'http://localhost:4173']
 */
export function parseAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;

  if (!envOrigins || envOrigins.trim() === '') {
    // Default to wildcard in development for ease of use
    return ['*'];
  }

  return envOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * Validates if a request origin is allowed based on CORS configuration
 *
 * @param origin - Origin header from the request
 * @param allowedOrigins - List of allowed origins from configuration
 * @returns true if origin is allowed, false otherwise
 */
export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string[]
): boolean {
  // No origin header (same-origin request)
  if (!origin) {
    return true;
  }

  // Wildcard allows all origins
  if (allowedOrigins.includes('*')) {
    return true;
  }

  // Check exact match against allowed list
  return allowedOrigins.includes(origin);
}

/**
 * Generates CORS headers for a given request origin
 *
 * @param origin - Origin header from the request (null for same-origin)
 * @param allowedOrigins - List of allowed origins
 * @param config - CORS configuration
 * @returns Headers object with appropriate CORS headers
 */
export function getCorsHeaders(
  origin: string | null,
  allowedOrigins: string[],
  config: Required<Omit<CorsConfig, 'allowedOrigins'>>
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Determine which origin to echo back
  // If wildcard is used, echo the request origin (required for credentials)
  // Otherwise, use the matched origin from allowedOrigins
  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    if (allowedOrigins.includes('*')) {
      // When using wildcard with credentials, must echo specific origin
      headers['Access-Control-Allow-Origin'] = origin;
    } else {
      // Echo back the validated origin
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } else if (allowedOrigins.length === 1 && allowedOrigins[0] && allowedOrigins[0] !== '*') {
    // Single configured origin (no wildcard)
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  // Set allowed methods
  headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');

  // Set allowed headers
  headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');

  // Set credentials flag
  if (config.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Set preflight cache duration
  headers['Access-Control-Max-Age'] = config.maxAge.toString();

  return headers;
}

/**
 * Creates a CORS middleware function with the specified configuration
 *
 * @param userConfig - User-provided CORS configuration
 * @returns Middleware function that handles CORS for requests
 *
 * @example
 * ```typescript
 * const cors = corsMiddleware({
 *   allowedOrigins: ['http://localhost:5173', 'http://localhost:4173'],
 *   allowCredentials: true
 * });
 *
 * // In your request handler:
 * return cors(req, () => {
 *   return new Response(JSON.stringify({ data }), {
 *     headers: { 'Content-Type': 'application/json' }
 *   });
 * });
 * ```
 */
export function corsMiddleware(userConfig?: Partial<CorsConfig>) {
  // Merge user config with defaults
  const config: CorsConfig & Required<Omit<CorsConfig, 'allowedOrigins'>> = {
    allowedOrigins: userConfig?.allowedOrigins ?? parseAllowedOrigins(),
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  if (config.debug) {
    console.log('[CORS] Middleware initialized with origins:', config.allowedOrigins);
  }

  /**
   * CORS middleware handler function
   *
   * @param req - Incoming HTTP request
   * @param next - Next handler in the chain (actual route handler)
   * @returns Response with CORS headers applied
   */
  return function cors(
    req: Request,
    next: () => Response | Promise<Response>
  ): Response | Promise<Response> {
    const origin = req.headers.get('Origin');
    const method = req.method.toUpperCase();

    // Validate origin
    if (origin && !isOriginAllowed(origin, config.allowedOrigins)) {
      if (config.debug) {
        console.warn(`[CORS] Rejected request from unauthorized origin: ${origin}`);
        console.warn(`[CORS] Allowed origins:`, config.allowedOrigins);
      }

      // Return 403 Forbidden for unauthorized origins
      return new Response('CORS policy: Origin not allowed', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // Generate CORS headers for this request
    const corsHeaders = getCorsHeaders(origin, config.allowedOrigins, config);

    // Handle preflight OPTIONS request
    if (method === 'OPTIONS') {
      if (config.debug) {
        console.log(`[CORS] Handling preflight request from origin: ${origin || 'same-origin'}`);
      }

      return new Response(null, {
        status: 204, // No Content
        headers: corsHeaders,
      });
    }

    // Handle actual request - execute handler and add CORS headers to response
    const responseOrPromise = next();

    // Handle both sync and async responses
    if (responseOrPromise instanceof Promise) {
      return responseOrPromise.then(response => {
        return addCorsHeadersToResponse(response, corsHeaders);
      });
    }

    return addCorsHeadersToResponse(responseOrPromise, corsHeaders);
  };
}

/**
 * Adds CORS headers to an existing Response object
 *
 * Creates a new Response with CORS headers merged into existing headers.
 * This is necessary because Response headers are immutable.
 *
 * @param response - Original response from handler
 * @param corsHeaders - CORS headers to add
 * @returns New response with CORS headers included
 */
function addCorsHeadersToResponse(
  response: Response,
  corsHeaders: Record<string, string>
): Response {
  // Clone the response to avoid mutating the original
  const headers = new Headers(response.headers);

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Create new response with merged headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Convenience function to create CORS middleware with defaults from environment
 *
 * Reads CORS_ORIGINS from environment and creates middleware with sensible defaults.
 * Use this for quick setup without manual configuration.
 *
 * @returns Configured CORS middleware ready to use
 *
 * @example
 * ```typescript
 * const cors = createDefaultCorsMiddleware();
 *
 * Bun.serve({
 *   port: 3001,
 *   fetch(req) {
 *     return cors(req, () => handleRequest(req));
 *   }
 * });
 * ```
 */
export function createDefaultCorsMiddleware() {
  return corsMiddleware({
    allowedOrigins: parseAllowedOrigins(),
    debug: process.env.NODE_ENV !== 'production',
  });
}
