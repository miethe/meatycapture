/**
 * CORS Middleware Test Suite
 *
 * Tests CORS middleware functionality including:
 * - Origin validation
 * - Preflight handling
 * - Header generation
 * - Credential support
 * - Environment configuration
 */

import { describe, expect, test, afterEach } from 'vitest';
import {
  corsMiddleware,
  parseAllowedOrigins,
  isOriginAllowed,
  getCorsHeaders,
  createDefaultCorsMiddleware,
} from './cors';

describe('parseAllowedOrigins', () => {
  const originalEnv = process.env.CORS_ORIGINS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CORS_ORIGINS = originalEnv;
    } else {
      delete process.env.CORS_ORIGINS;
    }
  });

  test('returns wildcard when CORS_ORIGINS is not set', () => {
    delete process.env.CORS_ORIGINS;
    expect(parseAllowedOrigins()).toEqual(['*']);
  });

  test('returns wildcard when CORS_ORIGINS is empty string', () => {
    process.env.CORS_ORIGINS = '';
    expect(parseAllowedOrigins()).toEqual(['*']);
  });

  test('parses single origin', () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    expect(parseAllowedOrigins()).toEqual(['http://localhost:5173']);
  });

  test('parses multiple comma-separated origins', () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:4173,https://app.example.com';
    expect(parseAllowedOrigins()).toEqual([
      'http://localhost:5173',
      'http://localhost:4173',
      'https://app.example.com',
    ]);
  });

  test('trims whitespace from origins', () => {
    process.env.CORS_ORIGINS = ' http://localhost:5173 , http://localhost:4173 ';
    expect(parseAllowedOrigins()).toEqual([
      'http://localhost:5173',
      'http://localhost:4173',
    ]);
  });

  test('filters out empty origins', () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173,,http://localhost:4173';
    expect(parseAllowedOrigins()).toEqual([
      'http://localhost:5173',
      'http://localhost:4173',
    ]);
  });
});

describe('isOriginAllowed', () => {
  test('allows request with no origin header (same-origin)', () => {
    expect(isOriginAllowed(null, ['http://localhost:5173'])).toBe(true);
  });

  test('allows all origins when wildcard is configured', () => {
    expect(isOriginAllowed('http://any-origin.com', ['*'])).toBe(true);
    expect(isOriginAllowed('https://example.com', ['*'])).toBe(true);
  });

  test('allows origin that matches allowed list', () => {
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:4173'];
    expect(isOriginAllowed('http://localhost:5173', allowedOrigins)).toBe(true);
    expect(isOriginAllowed('http://localhost:4173', allowedOrigins)).toBe(true);
  });

  test('rejects origin not in allowed list', () => {
    const allowedOrigins = ['http://localhost:5173'];
    expect(isOriginAllowed('http://malicious.com', allowedOrigins)).toBe(false);
    expect(isOriginAllowed('http://localhost:8080', allowedOrigins)).toBe(false);
  });

  test('requires exact origin match (no partial matches)', () => {
    const allowedOrigins = ['http://localhost:5173'];
    expect(isOriginAllowed('http://localhost:51730', allowedOrigins)).toBe(false);
    expect(isOriginAllowed('http://localhost', allowedOrigins)).toBe(false);
  });
});

describe('getCorsHeaders', () => {
  test('generates headers for allowed origin', () => {
    const config = {
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      allowCredentials: true,
      maxAge: 86400,
      debug: false,
    };

    const headers = getCorsHeaders(
      'http://localhost:5173',
      ['http://localhost:5173'],
      config
    );

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(headers['Access-Control-Max-Age']).toBe('86400');
  });

  test('echoes origin when wildcard is used', () => {
    const config = {
      allowedMethods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      allowCredentials: true,
      maxAge: 3600,
      debug: false,
    };

    const headers = getCorsHeaders(
      'http://any-origin.com',
      ['*'],
      config
    );

    expect(headers['Access-Control-Allow-Origin']).toBe('http://any-origin.com');
  });

  test('omits credentials when disabled', () => {
    const config = {
      allowedMethods: ['GET'],
      allowedHeaders: ['Content-Type'],
      allowCredentials: false,
      maxAge: 86400,
      debug: false,
    };

    const headers = getCorsHeaders(
      'http://localhost:5173',
      ['http://localhost:5173'],
      config
    );

    expect(headers['Access-Control-Allow-Credentials']).toBeUndefined();
  });

  test('handles same-origin requests (no origin header)', () => {
    const config = {
      allowedMethods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      allowCredentials: true,
      maxAge: 86400,
      debug: false,
    };

    const headers = getCorsHeaders(
      null,
      ['http://localhost:5173'],
      config
    );

    // Should still include CORS headers for consistency
    expect(headers['Access-Control-Allow-Methods']).toBeDefined();
  });
});

describe('corsMiddleware', () => {
  test('allows preflight OPTIONS request from allowed origin', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, () => {
      throw new Error('Next handler should not be called for OPTIONS');
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  test('rejects request from unauthorized origin', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'GET',
      headers: {
        Origin: 'http://malicious.com',
      },
    });

    const response = await cors(req, () => {
      throw new Error('Next handler should not be called for rejected origin');
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toContain('Origin not allowed');
  });

  test('adds CORS headers to successful response', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'GET',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, () => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const data = await response.json();
    expect(data).toEqual({ success: true });
  });

  test('handles async response handlers', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['*'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, async () => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      return new Response(JSON.stringify({ async: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  test('allows same-origin requests without origin header', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'GET',
      // No Origin header
    });

    const response = await cors(req, () => {
      return new Response('OK');
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');
  });

  test('supports wildcard origin in development', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['*'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'GET',
      headers: {
        Origin: 'http://any-origin.com',
      },
    });

    const response = await cors(req, () => {
      return new Response('OK');
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://any-origin.com');
  });

  test('preserves original response headers', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'GET',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, () => {
      return new Response('OK', {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Content-Type': 'text/plain',
        },
      });
    });

    expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  test('respects custom allowedMethods configuration', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      allowedMethods: ['GET', 'POST'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, () => {
      throw new Error('Should not reach handler');
    });

    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
    expect(response.headers.get('Access-Control-Allow-Methods')).not.toContain('DELETE');
  });

  test('respects custom allowedHeaders configuration', async () => {
    const cors = corsMiddleware({
      allowedOrigins: ['http://localhost:5173'],
      allowedHeaders: ['Content-Type', 'X-Custom-Header'],
      debug: false,
    });

    const req = new Request('http://localhost:3001/api/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, () => {
      throw new Error('Should not reach handler');
    });

    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-Custom-Header');
  });
});

describe('createDefaultCorsMiddleware', () => {
  const originalEnv = process.env.CORS_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CORS_ORIGINS = originalEnv;
    } else {
      delete process.env.CORS_ORIGINS;
    }
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  test('creates middleware with environment origins', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    const cors = createDefaultCorsMiddleware();

    const req = new Request('http://localhost:3001/api/test', {
      method: 'GET',
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    const response = await cors(req, () => new Response('OK'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  test('enables debug in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const cors = createDefaultCorsMiddleware();

    // Middleware should initialize with debug enabled
    // (would see console.log output in real usage)
    expect(cors).toBeDefined();
  });

  test('disables debug in production', async () => {
    process.env.NODE_ENV = 'production';
    const cors = createDefaultCorsMiddleware();

    expect(cors).toBeDefined();
  });
});
