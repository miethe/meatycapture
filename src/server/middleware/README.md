# Server Middleware

Authentication, CORS, and request processing middleware for the MeatyCapture HTTP server.

## Authentication Middleware

### Overview

The `auth.ts` middleware provides bearer token authentication for API endpoints. In v1, this is a simple token comparison stub that can be extended later with more sophisticated auth mechanisms (JWT, OAuth, session management, etc.).

### Usage

```typescript
import { checkAuth } from './middleware/auth';

// In your route handler
export async function handleRequest(req: Request): Promise<Response> {
  const authResult = checkAuth(req);

  if (!authResult.authenticated) {
    return authResult.errorResponse!;
  }

  // Continue with authenticated request
  const user = authResult.user!;
  // ... handle request
}
```

### Configuration

Set the `MEATYCAPTURE_AUTH_TOKEN` environment variable to enable authentication:

```bash
# Enable auth with a bearer token
export MEATYCAPTURE_AUTH_TOKEN="your-secret-token-here"

# Or disable auth entirely (not recommended for production)
unset MEATYCAPTURE_AUTH_TOKEN
```

**Security Notes:**
- Use a strong, randomly generated token (minimum 32 characters)
- Never commit tokens to version control
- Rotate tokens regularly in production
- Use HTTPS in production to prevent token interception

### Behavior

#### When `MEATYCAPTURE_AUTH_TOKEN` is set:

- Validates `Authorization: Bearer {token}` header
- Returns 401 Unauthorized if token is missing or invalid
- Attaches user context to successful authentication

#### When `MEATYCAPTURE_AUTH_TOKEN` is NOT set:

- All requests are allowed (auth is disabled)
- Logs warning in non-production environments
- User context indicates auth was skipped

### API Reference

#### `checkAuth(req: Request): AuthResult`

Primary authentication function.

**Parameters:**
- `req` - Incoming HTTP request

**Returns:** `AuthResult`
```typescript
interface AuthResult {
  authenticated: boolean;
  user?: UserContext;
  errorResponse?: Response;
}
```

**Example:**
```typescript
const result = checkAuth(request);
if (!result.authenticated) {
  return result.errorResponse!; // Returns 401 response
}
```

#### `authMiddleware(req: Request): AuthResult`

Alias for `checkAuth()`. Can be used with frameworks expecting traditional middleware signature.

#### `UserContext`

User authentication context attached to successful auth:

```typescript
interface UserContext {
  authenticated: boolean; // true if token validated, false if auth skipped
  token?: string;         // The validated bearer token (if auth enabled)
}
```

### Error Responses

All authentication errors return a standardized 401 response:

```json
{
  "error": "Unauthorized",
  "message": "Specific error message here"
}
```

**Headers:**
- `Content-Type: application/json`
- `WWW-Authenticate: Bearer`

**Common error messages:**
- `"Missing Authorization header"` - No Authorization header provided
- `"Invalid Authorization header format. Expected: Bearer {token}"` - Header format incorrect
- `"Invalid bearer token"` - Token doesn't match configured value

### Security Features

#### Timing-Safe Comparison

The middleware uses constant-time string comparison to prevent timing attacks. This ensures attackers cannot infer the correct token through timing analysis.

```typescript
// Instead of:
if (providedToken === configuredToken) { ... } // VULNERABLE

// We use:
if (timingSafeEqual(providedToken, configuredToken)) { ... } // SECURE
```

#### No Token Leakage

Tokens are never logged or included in error responses. Error messages are generic to prevent information disclosure.

### Testing

Run the middleware tests:

```bash
bun test src/server/middleware/__tests__/auth.test.ts
```

**Test coverage includes:**
- Valid token authentication
- Missing Authorization header
- Invalid token format
- Malformed headers
- Timing-safe comparison
- Auth disabled mode
- Edge cases (empty tokens, whitespace, etc.)

### Future Extensions

This stub can be extended with:

1. **JWT Support**: Replace bearer tokens with signed JWTs
   ```typescript
   import { verify } from 'jsonwebtoken';
   const payload = verify(token, secret);
   ```

2. **OAuth Integration**: Add OAuth2/OIDC flows
   ```typescript
   const tokenInfo = await validateOAuthToken(token);
   ```

3. **Role-Based Access Control**: Add user roles and permissions
   ```typescript
   interface UserContext {
     authenticated: boolean;
     token?: string;
     roles?: string[];
     permissions?: string[];
   }
   ```

4. **Session Management**: Add session tracking and refresh tokens

5. **Rate Limiting**: Integrate with rate limiting middleware

### Migration Path

When upgrading authentication:

1. Keep `checkAuth` signature stable
2. Extend `UserContext` interface (don't break existing fields)
3. Add new env vars without removing `MEATYCAPTURE_AUTH_TOKEN`
4. Provide backwards compatibility for simple bearer tokens

Example:

```typescript
export function checkAuth(req: Request): AuthResult {
  // Try JWT first
  if (process.env.MEATYCAPTURE_JWT_SECRET) {
    return checkJWT(req);
  }

  // Fall back to bearer token
  if (process.env.MEATYCAPTURE_AUTH_TOKEN) {
    return checkBearerToken(req);
  }

  // Auth disabled
  return { authenticated: true, user: { authenticated: false } };
}
```

## Best Practices

1. **Always check authentication first** in route handlers
2. **Return error responses immediately** - don't continue processing
3. **Use TypeScript guards** to ensure user context exists:
   ```typescript
   if (!authResult.authenticated || !authResult.user) {
     return authResult.errorResponse!;
   }
   const user = authResult.user; // TypeScript knows user is defined
   ```
4. **Log authentication failures** for security monitoring (but never log tokens)
5. **Use HTTPS** in production - bearer tokens are sensitive credentials

---

## CORS Middleware

### Overview

The CORS middleware handles cross-origin resource sharing for web app access from different ports during development and production. It provides origin validation, preflight handling, and credential support.

### Quick Start

```typescript
import { createDefaultCorsMiddleware } from './middleware/cors';

// Create middleware with environment defaults
const cors = createDefaultCorsMiddleware();

// Use in Bun server
Bun.serve({
  port: 3001,
  fetch(req) {
    return cors(req, () => handleRequest(req));
  }
});
```

### Configuration

Configure allowed origins via environment variable:

```bash
# Allow specific origins (production)
CORS_ORIGINS="https://app.example.com,https://staging.example.com"

# Allow all origins (development only - not secure)
CORS_ORIGINS="*"

# Allow localhost on multiple ports
CORS_ORIGINS="http://localhost:5173,http://localhost:4173"
```

### Custom Configuration

```typescript
import { corsMiddleware } from './middleware/cors';

const cors = corsMiddleware({
  allowedOrigins: ['http://localhost:5173', 'http://localhost:4173'],
  allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
  debug: process.env.NODE_ENV !== 'production'
});
```

### Features

- **Origin Validation**: Validates request origin against configured allow list
- **Preflight Handling**: Automatically handles OPTIONS preflight requests
- **Credential Support**: Enables cookies and authorization headers
- **Flexible Configuration**: Environment-based or programmatic configuration
- **Debug Logging**: Optional logging for rejected origins and preflight requests
- **Wildcard Support**: Use '*' for development (echoes specific origin for credentials)

### Security Considerations

1. **Never use wildcard ('*') in production** - Always specify exact origins
2. **Use HTTPS origins in production** - HTTP origins are insecure
3. **Minimize allowed methods** - Only include methods your API actually uses
4. **Restrict allowed headers** - Only include headers your API requires
5. **Monitor rejected requests** - Enable debug logging to detect unauthorized access attempts

### Usage Examples

#### Example 1: Single Page Application

```typescript
// Development: Allow Vite dev server
const cors = corsMiddleware({
  allowedOrigins: ['http://localhost:5173'],
  allowCredentials: true,
  debug: true
});

// Production: Allow production domain
const cors = corsMiddleware({
  allowedOrigins: ['https://app.example.com'],
  allowCredentials: true,
  debug: false
});
```

#### Example 2: Multiple Frontend Environments

```typescript
const cors = corsMiddleware({
  allowedOrigins: [
    'http://localhost:5173',   // Vite dev
    'http://localhost:4173',   // Vite preview
    'https://staging.example.com',
    'https://app.example.com'
  ],
  allowCredentials: true
});
```

#### Example 3: API Routes with Different CORS Policies

```typescript
// Public API - allow all origins
const publicCors = corsMiddleware({
  allowedOrigins: ['*'],
  allowCredentials: false
});

// Authenticated API - restrict origins
const authCors = corsMiddleware({
  allowedOrigins: ['https://app.example.com'],
  allowCredentials: true
});

Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/api/public')) {
      return publicCors(req, () => handlePublicRequest(req));
    }

    if (url.pathname.startsWith('/api/auth')) {
      return authCors(req, () => handleAuthRequest(req));
    }

    return new Response('Not Found', { status: 404 });
  }
});
```

### Testing

Run the CORS middleware tests:

```bash
pnpm test src/server/middleware/cors.test.ts
```

**Test coverage includes:**
- Origin validation (allowed/rejected)
- Preflight OPTIONS handling
- CORS header generation
- Wildcard origin support
- Credential handling
- Same-origin requests
- Environment configuration parsing
- Custom configuration options
- Async handler support

### API Reference

#### `corsMiddleware(config?: Partial<CorsConfig>)`

Creates a CORS middleware function.

**Parameters:**
- `config.allowedOrigins`: Array of allowed origins (default: from `CORS_ORIGINS` env var or `['*']`)
- `config.allowedMethods`: Array of allowed HTTP methods (default: `['GET', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']`)
- `config.allowedHeaders`: Array of allowed headers (default: `['Content-Type', 'Authorization', 'X-Requested-With']`)
- `config.allowCredentials`: Enable credentials support (default: `true`)
- `config.maxAge`: Preflight cache duration in seconds (default: `86400`)
- `config.debug`: Enable debug logging (default: `true` in development)

**Returns:** Middleware function `(req: Request, next: () => Response | Promise<Response>) => Response | Promise<Response>`

**Example:**
```typescript
const cors = corsMiddleware({
  allowedOrigins: ['http://localhost:5173'],
  debug: true
});

const response = await cors(req, () => {
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

#### `createDefaultCorsMiddleware()`

Creates CORS middleware with defaults from environment.

**Returns:** Configured middleware function

**Example:**
```typescript
const cors = createDefaultCorsMiddleware();
```

#### `parseAllowedOrigins()`

Parses `CORS_ORIGINS` environment variable into array of allowed origins.

**Returns:** Array of allowed origins

**Example:**
```typescript
// CORS_ORIGINS="http://localhost:5173,http://localhost:4173"
const origins = parseAllowedOrigins();
// Returns: ['http://localhost:5173', 'http://localhost:4173']
```

#### `isOriginAllowed(origin: string | null, allowedOrigins: string[])`

Validates if a request origin is allowed based on CORS configuration.

**Parameters:**
- `origin`: Origin header from request (null for same-origin)
- `allowedOrigins`: List of allowed origins

**Returns:** `true` if allowed, `false` otherwise

**Example:**
```typescript
const allowed = isOriginAllowed('http://localhost:5173', ['http://localhost:5173']);
// Returns: true
```

#### `getCorsHeaders(origin: string | null, allowedOrigins: string[], config: CorsConfig)`

Generates CORS headers for a given request origin.

**Parameters:**
- `origin`: Origin header from request
- `allowedOrigins`: List of allowed origins
- `config`: CORS configuration object

**Returns:** Headers object with appropriate CORS headers

**Example:**
```typescript
const headers = getCorsHeaders('http://localhost:5173', ['http://localhost:5173'], config);
// Returns: { 'Access-Control-Allow-Origin': 'http://localhost:5173', ... }
```

### Error Handling

#### 403 Forbidden - Origin Not Allowed

When a request comes from an unauthorized origin:

```json
Response: "CORS policy: Origin not allowed"
Status: 403 Forbidden
Headers: { "Content-Type": "text/plain" }
```

Debug logging will show:
```
[CORS] Rejected request from unauthorized origin: http://malicious.com
[CORS] Allowed origins: ['http://localhost:5173']
```

#### 204 No Content - Preflight Success

OPTIONS preflight requests from allowed origins return:

```
Status: 204 No Content
Headers: {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400"
}
```

### Combining with Authentication

CORS middleware should be applied before authentication to handle preflight requests:

```typescript
import { createDefaultCorsMiddleware } from './middleware/cors';
import { checkAuth } from './middleware/auth';

const cors = createDefaultCorsMiddleware();

Bun.serve({
  port: 3001,
  fetch(req) {
    return cors(req, () => {
      // CORS handled, now check auth
      const authResult = checkAuth(req);
      if (!authResult.authenticated) {
        return authResult.errorResponse!;
      }

      // Both CORS and auth passed
      return handleRequest(req, authResult.user!);
    });
  }
});
```

### Environment Variables Reference

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ORIGINS` | string | `*` | Comma-separated list of allowed origins |
| `NODE_ENV` | string | - | Controls debug logging (disabled in production) |

### Performance Considerations

1. **Preflight Caching**: The `maxAge` setting controls browser caching of preflight responses. Default is 24 hours (86400 seconds).

2. **Origin List Size**: Origin validation is O(n) where n is the number of allowed origins. Keep the list small for best performance.

3. **Wildcard Performance**: Using '*' is fastest as it bypasses origin validation, but should only be used in development.

4. **Header Overhead**: CORS headers add ~200-300 bytes to each response. This is negligible for most applications.
