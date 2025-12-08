/**
 * Error Handler Tests
 *
 * Validates error handling middleware behavior:
 * - Custom error classes
 * - Error-to-response mapping
 * - Request wrapper functionality
 * - Production sanitization
 * - Logging integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  PermissionError,
  mapErrorToResponse,
  withErrorHandling,
  type ErrorResponse,
} from './error-handler.js';
import { logger } from '../../core/logging/index.js';

describe('Custom Error Classes', () => {
  it('should create NotFoundError with proper name and message', () => {
    const error = new NotFoundError('Resource not found');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Resource not found');
    expect(error.stack).toBeDefined();
  });

  it('should create ValidationError with details', () => {
    const details = { field: 'name', error: 'Required' };
    const error = new ValidationError('Validation failed', details);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual(details);
    expect(error.stack).toBeDefined();
  });

  it('should create ValidationError without details', () => {
    const error = new ValidationError('Validation failed');

    expect(error.details).toBeUndefined();
  });

  it('should create ConflictError with proper name and message', () => {
    const error = new ConflictError('Resource already exists');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Resource already exists');
    expect(error.stack).toBeDefined();
  });

  it('should create PermissionError with proper name and message', () => {
    const error = new PermissionError('Access denied');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(PermissionError);
    expect(error.name).toBe('PermissionError');
    expect(error.message).toBe('Access denied');
    expect(error.stack).toBeDefined();
  });
});

describe('mapErrorToResponse', () => {
  describe('Custom Error Classes', () => {
    it('should map NotFoundError to 404', () => {
      const error = new NotFoundError('Document not found');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        error: 'NotFound',
        message: 'Document not found',
      });
    });

    it('should map ValidationError to 400 without details', () => {
      const error = new ValidationError('Invalid input');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        error: 'ValidationError',
        message: 'Invalid input',
      });
    });

    it('should map ValidationError to 400 with details', () => {
      const details = { fields: { name: 'Required', age: 'Must be positive' } };
      const error = new ValidationError('Validation failed', details);
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        error: 'ValidationError',
        message: 'Validation failed',
        details,
      });
    });

    it('should map ConflictError to 409', () => {
      const error = new ConflictError('Project already exists');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(409);
      expect(result.body).toEqual({
        error: 'Conflict',
        message: 'Project already exists',
      });
    });

    it('should map PermissionError to 403', () => {
      const error = new PermissionError('Permission denied');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(403);
      expect(result.body).toEqual({
        error: 'Forbidden',
        message: 'Permission denied',
      });
    });
  });

  describe('Node.js File System Errors', () => {
    it('should map ENOENT error to 404', () => {
      const error = { code: 'ENOENT', message: 'File not found' };
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        error: 'NotFound',
        message: 'File not found',
      });
    });

    it('should map ENOENT error to 404 with default message', () => {
      const error = { code: 'ENOENT' };
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        error: 'NotFound',
        message: 'Resource not found',
      });
    });

    it('should map EACCES error to 403', () => {
      const error = { code: 'EACCES', message: 'Permission denied' };
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(403);
      expect(result.body).toEqual({
        error: 'Forbidden',
        message: 'Permission denied',
      });
    });

    it('should map EACCES error to 403 with default message', () => {
      const error = { code: 'EACCES' };
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(403);
      expect(result.body).toEqual({
        error: 'Forbidden',
        message: 'Permission denied',
      });
    });

    it('should map EEXIST error to 409', () => {
      const error = { code: 'EEXIST', message: 'File already exists' };
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(409);
      expect(result.body).toEqual({
        error: 'Conflict',
        message: 'File already exists',
      });
    });

    it('should map EEXIST error to 409 with default message', () => {
      const error = { code: 'EEXIST' };
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(409);
      expect(result.body).toEqual({
        error: 'Conflict',
        message: 'Resource already exists',
      });
    });
  });

  describe('Generic Errors', () => {
    it('should map generic Error to 500 in development', () => {
      const error = new Error('Something went wrong');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        error: 'InternalServerError',
        message: 'Something went wrong',
      });
    });

    it('should map unknown error to 500 in development', () => {
      const error = 'Unknown error string';
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      });
    });

    it('should sanitize 500 errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database connection failed');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(500);
      expect(result.body).toEqual({
        error: 'InternalServerError',
        message: 'An internal server error occurred. Please try again later.',
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should NOT sanitize custom errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new NotFoundError('Document not found');
      const result = mapErrorToResponse(error);

      expect(result.status).toBe(404);
      expect(result.body).toEqual({
        error: 'NotFound',
        message: 'Document not found', // Should preserve message
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('withErrorHandling', () => {
  // Mock logger to verify logging behavior
  beforeEach(() => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return successful response when handler succeeds', async () => {
    const handler = async () => Response.json({ success: true });
    const response = await withErrorHandling(handler);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should catch NotFoundError and return 404 response', async () => {
    const handler = async () => {
      throw new NotFoundError('Document not found');
    };

    const response = await withErrorHandling(handler);
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(404);
    expect(body).toEqual({
      error: 'NotFound',
      message: 'Document not found',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Request handler error',
      expect.objectContaining({
        errorName: 'NotFoundError',
        errorMessage: 'Document not found',
      })
    );
  });

  it('should catch ValidationError and return 400 response with details', async () => {
    const details = { field: 'name', error: 'Required' };
    const handler = async () => {
      throw new ValidationError('Validation failed', details);
    };

    const response = await withErrorHandling(handler);
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'ValidationError',
      message: 'Validation failed',
      details,
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Request handler error',
      expect.objectContaining({
        errorName: 'ValidationError',
        errorMessage: 'Validation failed',
        validationDetails: details,
      })
    );
  });

  it('should catch ConflictError and return 409 response', async () => {
    const handler = async () => {
      throw new ConflictError('Project already exists');
    };

    const response = await withErrorHandling(handler);
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: 'Conflict',
      message: 'Project already exists',
    });
  });

  it('should catch PermissionError and return 403 response', async () => {
    const handler = async () => {
      throw new PermissionError('Access denied');
    };

    const response = await withErrorHandling(handler);
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: 'Forbidden',
      message: 'Access denied',
    });
  });

  it('should catch generic errors and return 500 response', async () => {
    const handler = async () => {
      throw new Error('Unexpected error');
    };

    const response = await withErrorHandling(handler);
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'InternalServerError',
      message: 'Unexpected error',
    });
  });

  it('should log request context when provided', async () => {
    const handler = async () => {
      throw new NotFoundError('Resource not found');
    };

    const context = {
      method: 'GET',
      path: '/api/docs/REQ-20251208-test',
    };

    await withErrorHandling(handler, context);

    expect(logger.error).toHaveBeenCalledWith(
      'Request handler error',
      expect.objectContaining({
        request: {
          method: 'GET',
          path: '/api/docs/REQ-20251208-test',
        },
      })
    );
  });

  it('should log stack trace in debug mode', async () => {
    const handler = async () => {
      throw new Error('Test error');
    };

    await withErrorHandling(handler);

    expect(logger.debug).toHaveBeenCalledWith(
      'Error stack trace',
      expect.objectContaining({
        stack: expect.stringContaining('Error: Test error'),
      })
    );
  });

  it('should set Content-Type header to application/json', async () => {
    const handler = async () => {
      throw new NotFoundError('Not found');
    };

    const response = await withErrorHandling(handler);

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should handle synchronous responses', async () => {
    const handler = () => Response.json({ message: 'Sync response' });
    const response = await withErrorHandling(handler);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: 'Sync response' });
  });

  it('should handle non-Error thrown values', async () => {
    const handler = async () => {
      // Testing non-Error throw - intentionally violating best practices
      throw 'String error';
    };

    const response = await withErrorHandling(handler);
    const body = (await response.json()) as ErrorResponse;

    expect(response.status).toBe(500);
    expect(body.error).toBe('InternalServerError');
    expect(logger.error).toHaveBeenCalledWith(
      'Request handler error',
      expect.objectContaining({
        errorName: 'Error',
        errorMessage: 'Unknown error',
      })
    );
  });
});
