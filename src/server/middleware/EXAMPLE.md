# Auth Middleware Usage Examples

## Basic Usage with Bun HTTP Server

```typescript
import { checkAuth } from './middleware/auth';

// Simple route handler
async function handleGetProjects(req: Request): Promise<Response> {
  // Check authentication
  const authResult = checkAuth(req);

  if (!authResult.authenticated) {
    return authResult.errorResponse!;
  }

  // User is authenticated, proceed with request
  const projects = await getProjects();
  return new Response(JSON.stringify(projects), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Start server
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/projects') {
      return handleGetProjects(req);
    }

    return new Response('Not Found', { status: 404 });
  },
});
```

## With Router Pattern

```typescript
import { checkAuth, type UserContext } from './middleware/auth';

interface AuthenticatedRequest extends Request {
  user: UserContext;
}

// Higher-order function to wrap authenticated routes
function requireAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const authResult = checkAuth(req);

    if (!authResult.authenticated) {
      return authResult.errorResponse!;
    }

    // Attach user context to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = authResult.user!;

    return handler(authenticatedReq);
  };
}

// Use it with routes
const getProjects = requireAuth(async (req) => {
  console.log('User authenticated:', req.user.authenticated);
  console.log('Token used:', req.user.token);

  const projects = await fetchProjects();
  return Response.json(projects);
});

const createProject = requireAuth(async (req) => {
  const body = await req.json();
  const project = await createNewProject(body);
  return Response.json(project, { status: 201 });
});

// Router
Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/projects') {
      return getProjects(req);
    }

    if (req.method === 'POST' && url.pathname === '/api/projects') {
      return createProject(req);
    }

    return new Response('Not Found', { status: 404 });
  },
});
```

## Mixed Public/Private Routes

```typescript
import { checkAuth } from './middleware/auth';

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Public routes (no auth required)
  if (url.pathname === '/health') {
    return Response.json({ status: 'ok' });
  }

  if (url.pathname === '/api/docs') {
    return Response.json({ docs: 'API documentation' });
  }

  // Protected routes (auth required)
  const authResult = checkAuth(req);

  if (!authResult.authenticated) {
    return authResult.errorResponse!;
  }

  // Handle authenticated routes
  if (url.pathname === '/api/projects') {
    return handleProjects(req);
  }

  if (url.pathname === '/api/items') {
    return handleItems(req);
  }

  return new Response('Not Found', { status: 404 });
}

Bun.serve({
  port: 3000,
  fetch: handleRequest,
});
```

## Configuration Examples

### Development (Auth Disabled)

```bash
# Don't set MEATYCAPTURE_AUTH_TOKEN
# All requests will be allowed
bun src/server/index.ts
```

### Production (Auth Enabled)

```bash
# Generate a strong token
MEATYCAPTURE_AUTH_TOKEN=$(openssl rand -hex 32) bun src/server/index.ts

# Or use a specific token
export MEATYCAPTURE_AUTH_TOKEN="your-secret-token-here"
bun src/server/index.ts
```

### Docker

```dockerfile
FROM oven/bun:latest

WORKDIR /app
COPY . .

# Set auth token from build arg
ARG AUTH_TOKEN
ENV MEATYCAPTURE_AUTH_TOKEN=$AUTH_TOKEN

CMD ["bun", "src/server/index.ts"]
```

```bash
# Build with token
docker build --build-arg AUTH_TOKEN="$(openssl rand -hex 32)" -t meatycapture .

# Run
docker run -e MEATYCAPTURE_AUTH_TOKEN="your-token" meatycapture
```

## Client Examples

### curl

```bash
# Without auth token (if auth disabled)
curl http://localhost:3000/api/projects

# With auth token
curl -H "Authorization: Bearer your-secret-token" \
  http://localhost:3000/api/projects

# Create project
curl -X POST \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "path": "/path/to/project"}' \
  http://localhost:3000/api/projects
```

### fetch (Browser/Node)

```typescript
const API_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-secret-token';

// GET request
async function getProjects() {
  const response = await fetch(`${API_URL}/api/projects`, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// POST request
async function createProject(data) {
  const response = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Usage
try {
  const projects = await getProjects();
  console.log('Projects:', projects);
} catch (error) {
  console.error('Failed to fetch projects:', error.message);
}
```

### axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${process.env.MEATYCAPTURE_AUTH_TOKEN}`,
  },
});

// GET request
const response = await api.get('/projects');
console.log(response.data);

// POST request
const newProject = await api.post('/projects', {
  name: 'My Project',
  path: '/path/to/project',
});
console.log('Created:', newProject.data);

// Error handling
try {
  const response = await api.get('/projects');
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Unauthorized:', error.response.data.message);
  } else {
    console.error('Request failed:', error.message);
  }
}
```

## Error Handling

```typescript
import { checkAuth } from './middleware/auth';

async function handleRequest(req: Request): Promise<Response> {
  try {
    const authResult = checkAuth(req);

    if (!authResult.authenticated) {
      // authResult.errorResponse is already a proper Response object
      return authResult.errorResponse!;
    }

    // Process authenticated request
    const data = await processRequest(req);
    return Response.json(data);

  } catch (error) {
    console.error('Request error:', error);

    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

## Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { checkAuth } from './middleware/auth';

describe('My API Route', () => {
  beforeEach(() => {
    process.env.MEATYCAPTURE_AUTH_TOKEN = 'test-token';
  });

  it('should require authentication', () => {
    const req = new Request('http://localhost/api/projects');
    const authResult = checkAuth(req);

    expect(authResult.authenticated).toBe(false);
    expect(authResult.errorResponse?.status).toBe(401);
  });

  it('should accept valid token', () => {
    const req = new Request('http://localhost/api/projects', {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
    const authResult = checkAuth(req);

    expect(authResult.authenticated).toBe(true);
    expect(authResult.user?.token).toBe('test-token');
  });
});
```

## Security Best Practices

### DO:
- Use HTTPS in production to encrypt tokens in transit
- Generate strong tokens: `openssl rand -hex 32`
- Rotate tokens regularly (monthly recommended)
- Store tokens in environment variables, never in code
- Use different tokens for different environments
- Log authentication failures for security monitoring

### DON'T:
- Don't commit tokens to version control
- Don't log or expose tokens in error messages
- Don't use weak tokens like "password" or "123456"
- Don't reuse tokens across multiple services
- Don't send tokens in URL query parameters
- Don't disable auth in production

### Example: Secure Token Generation

```bash
# Generate a cryptographically secure token
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using Bun
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
