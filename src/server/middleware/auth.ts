/**
 * Authentication middleware for MeatyCapture HTTP server
 *
 * Provides bearer token authentication for API endpoints.
 * For v1, this is a simple token comparison stub that can be extended
 * later with proper auth mechanisms (JWT, OAuth, session management, etc.).
 */

/**
 * User authentication context attached to authenticated requests
 */
export interface UserContext {
  /** Whether the request was authenticated */
  authenticated: boolean;
  /** The validated bearer token (omitted if auth is disabled) */
  token?: string;
}

/**
 * Result of authentication check
 */
export interface AuthResult {
  /** Whether authentication succeeded */
  authenticated: boolean;
  /** User context if authenticated */
  user?: UserContext;
  /** Error response to return if authentication failed */
  errorResponse?: Response;
}

/**
 * Authentication error response body
 */
interface AuthErrorResponse {
  error: string;
  message: string;
}

/**
 * Check authentication for an incoming request
 *
 * Validates the Authorization header against the MEATYCAPTURE_AUTH_TOKEN
 * environment variable. If no token is configured, all requests are allowed.
 *
 * @param req - Incoming HTTP request
 * @returns AuthResult with authentication status and optional error response
 *
 * @example
 * ```typescript
 * const authResult = checkAuth(request);
 * if (!authResult.authenticated) {
 *   return authResult.errorResponse!;
 * }
 * // Continue with authenticated request
 * ```
 */
export function checkAuth(req: Request): AuthResult {
  const configuredToken = process.env.MEATYCAPTURE_AUTH_TOKEN;

  // If no auth token is configured, skip authentication (allow all requests)
  if (!configuredToken) {
    // Log warning in development/debug mode
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[AUTH] Warning: MEATYCAPTURE_AUTH_TOKEN not set. Authentication is disabled.'
      );
    }

    return {
      authenticated: true,
      user: {
        authenticated: false, // Indicates auth was skipped, not validated
      },
    };
  }

  // Extract Authorization header
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return {
      authenticated: false,
      errorResponse: createUnauthorizedResponse('Missing Authorization header'),
    };
  }

  // Validate Bearer token format
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!bearerMatch) {
    return {
      authenticated: false,
      errorResponse: createUnauthorizedResponse(
        'Invalid Authorization header format. Expected: Bearer {token}'
      ),
    };
  }

  const providedToken = bearerMatch[1];

  // Ensure token was captured (should always be true given regex match)
  if (!providedToken) {
    return {
      authenticated: false,
      errorResponse: createUnauthorizedResponse(
        'Invalid Authorization header format. Expected: Bearer {token}'
      ),
    };
  }

  // Compare tokens using timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(providedToken, configuredToken)) {
    return {
      authenticated: false,
      errorResponse: createUnauthorizedResponse('Invalid bearer token'),
    };
  }

  // Authentication successful
  return {
    authenticated: true,
    user: {
      authenticated: true,
      token: providedToken,
    },
  };
}

/**
 * Create a standardized 401 Unauthorized response
 *
 * @param message - Specific error message to include
 * @returns Response with 401 status and JSON error body
 */
function createUnauthorizedResponse(message: string): Response {
  const errorBody: AuthErrorResponse = {
    error: 'Unauthorized',
    message,
  };

  return new Response(JSON.stringify(errorBody, null, 2), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer',
    },
  });
}

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * Compares two strings in constant time regardless of where they differ.
 * This prevents attackers from inferring the correct token through timing analysis.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  // If lengths differ, still perform a comparison to maintain constant time
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);

  // Length check - but we still compare to maintain timing
  if (bufA.length !== bufB.length) {
    // Perform a dummy comparison with equal-length buffers to maintain constant time
    const dummyBuf = new Uint8Array(bufA.length);
    let _dummyResult = 1;
    for (let i = 0; i < bufA.length; i++) {
      // Non-null assertion safe: i is always < bufA.length
      _dummyResult |= (bufA[i] as number) ^ (dummyBuf[i] as number);
    }
    return false;
  }

  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    // Non-null assertion safe: i is always < bufA.length and lengths are equal
    result |= (bufA[i] as number) ^ (bufB[i] as number);
  }

  return result === 0;
}

/**
 * Express/Connect-style middleware wrapper for checkAuth
 *
 * Can be used with frameworks that expect traditional middleware signature.
 * For pure Bun usage, prefer checkAuth() directly.
 *
 * @example
 * ```typescript
 * app.use(authMiddleware);
 * ```
 */
export function authMiddleware(req: Request): AuthResult {
  return checkAuth(req);
}
