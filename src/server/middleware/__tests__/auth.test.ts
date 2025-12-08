import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkAuth, authMiddleware } from '../auth';

describe('Authentication Middleware', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    // Restore original environment
    process.env = ORIGINAL_ENV;
  });

  describe('checkAuth', () => {
    describe('when MEATYCAPTURE_AUTH_TOKEN is not set', () => {
      beforeEach(() => {
        delete process.env.MEATYCAPTURE_AUTH_TOKEN;
      });

      it('should allow all requests without authentication', () => {
        const req = new Request('http://localhost:3000/api/projects');
        const result = checkAuth(req);

        expect(result.authenticated).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.authenticated).toBe(false); // Auth was skipped
        expect(result.errorResponse).toBeUndefined();
      });

      it('should allow requests even with Authorization header', () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: 'Bearer some-random-token',
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(true);
      });
    });

    describe('when MEATYCAPTURE_AUTH_TOKEN is set', () => {
      const VALID_TOKEN = 'test-secret-token-12345';

      beforeEach(() => {
        process.env.MEATYCAPTURE_AUTH_TOKEN = VALID_TOKEN;
      });

      it('should authenticate valid bearer token', () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: `Bearer ${VALID_TOKEN}`,
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.authenticated).toBe(true);
        expect(result.user?.token).toBe(VALID_TOKEN);
        expect(result.errorResponse).toBeUndefined();
      });

      it('should reject request with missing Authorization header', async () => {
        const req = new Request('http://localhost:3000/api/projects');
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);
        expect(result.user).toBeUndefined();
        expect(result.errorResponse).toBeDefined();

        const response = result.errorResponse!;
        expect(response.status).toBe(401);
        expect(response.headers.get('Content-Type')).toBe('application/json');
        expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');

        const body = await response.json();
        expect(body.error).toBe('Unauthorized');
        expect(body.message).toBe('Missing Authorization header');
      });

      it('should reject request with invalid token', async () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: 'Bearer wrong-token',
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);
        expect(result.errorResponse).toBeDefined();

        const body = await result.errorResponse!.json();
        expect(body.error).toBe('Unauthorized');
        expect(body.message).toBe('Invalid bearer token');
      });

      it('should reject malformed Authorization header (no Bearer prefix)', async () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: VALID_TOKEN, // Missing "Bearer " prefix
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);

        const body = await result.errorResponse!.json();
        expect(body.message).toContain('Invalid Authorization header format');
      });

      it('should reject malformed Authorization header (Basic auth)', async () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: `Basic ${btoa('user:pass')}`,
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);

        const body = await result.errorResponse!.json();
        expect(body.message).toContain('Invalid Authorization header format');
      });

      it('should handle Bearer with different casing', () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: `bearer ${VALID_TOKEN}`, // lowercase
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(true);
      });

      it('should handle token with trailing whitespace (auto-trimmed by Request API)', () => {
        // Note: The Request API automatically trims header values per HTTP spec (RFC 7230)
        // So trailing/leading whitespace is stripped before our middleware sees it
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: `Bearer ${VALID_TOKEN} `, // trailing space gets auto-trimmed
          },
        });
        const result = checkAuth(req);

        // Should pass because Request API strips the trailing space
        expect(result.authenticated).toBe(true);
        expect(req.headers.get('Authorization')).toBe(`Bearer ${VALID_TOKEN}`);
      });

      it('should use timing-safe comparison (length mismatch)', async () => {
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: 'Bearer short',
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);
      });

      it('should use timing-safe comparison (different content)', async () => {
        // Token with same length but different content
        const wrongToken = 'X'.repeat(VALID_TOKEN.length);
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: `Bearer ${wrongToken}`,
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string token in environment', async () => {
        process.env.MEATYCAPTURE_AUTH_TOKEN = '';
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: 'Bearer anything',
          },
        });
        const result = checkAuth(req);

        // Empty token should be treated as "not configured"
        expect(result.authenticated).toBe(true);
        expect(result.user?.authenticated).toBe(false);
      });

      it('should handle empty Authorization header value', async () => {
        process.env.MEATYCAPTURE_AUTH_TOKEN = 'test-token';
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: '',
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);
      });

      it('should handle whitespace-only Authorization header', async () => {
        process.env.MEATYCAPTURE_AUTH_TOKEN = 'test-token';
        const req = new Request('http://localhost:3000/api/projects', {
          headers: {
            Authorization: '   ',
          },
        });
        const result = checkAuth(req);

        expect(result.authenticated).toBe(false);
      });
    });
  });

  describe('authMiddleware', () => {
    it('should be an alias for checkAuth', () => {
      delete process.env.MEATYCAPTURE_AUTH_TOKEN;
      const req = new Request('http://localhost:3000/api/projects');

      const checkAuthResult = checkAuth(req);
      const middlewareResult = authMiddleware(req);

      expect(middlewareResult.authenticated).toBe(checkAuthResult.authenticated);
      expect(middlewareResult.user).toEqual(checkAuthResult.user);
    });
  });

  describe('error response format', () => {
    it('should return properly formatted JSON error', async () => {
      process.env.MEATYCAPTURE_AUTH_TOKEN = 'test-token';
      const req = new Request('http://localhost:3000/api/projects');
      const result = checkAuth(req);

      expect(result.errorResponse).toBeDefined();
      const response = result.errorResponse!;

      // Check response properties
      expect(response.status).toBe(401);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');

      // Check JSON body structure
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('message');
      expect(body.error).toBe('Unauthorized');
      expect(typeof body.message).toBe('string');
    });

    it('should return valid JSON that can be parsed', async () => {
      process.env.MEATYCAPTURE_AUTH_TOKEN = 'test-token';
      const req = new Request('http://localhost:3000/api/projects');
      const result = checkAuth(req);

      const response = result.errorResponse!;
      const text = await response.text();

      // Should be valid JSON
      expect(() => JSON.parse(text)).not.toThrow();

      const parsed = JSON.parse(text);
      expect(parsed.error).toBe('Unauthorized');
    });
  });
});
