/**
 * Request Validation Middleware Tests
 *
 * Comprehensive test suite for validation utilities and schema validators.
 * Tests all validation functions, error handling, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateEnum,
  validateOptional,
  validateStringArray,
  parseJsonBody,
  extractQueryParam,
  extractPathParam,
  validateObject,
} from './validation.js';
import { ValidationError } from './error-handler.js';

// ============================================================================
// validateRequired
// ============================================================================

describe('validateRequired', () => {
  it('should pass for valid values', () => {
    expect(() => validateRequired('value', 'field')).not.toThrow();
    expect(() => validateRequired(0, 'field')).not.toThrow();
    expect(() => validateRequired(false, 'field')).not.toThrow();
    expect(() => validateRequired([], 'field')).not.toThrow();
    expect(() => validateRequired({}, 'field')).not.toThrow();
  });

  it('should throw for null', () => {
    expect(() => validateRequired(null, 'field')).toThrow(ValidationError);
  });

  it('should throw for undefined', () => {
    expect(() => validateRequired(undefined, 'field')).toThrow(ValidationError);
  });

  it('should throw for empty string', () => {
    expect(() => validateRequired('', 'field')).toThrow(ValidationError);
  });

  it('should include field name in error', () => {
    try {
      validateRequired(null, 'username');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      expect(validationError.details).toEqual({
        fields: { username: 'Required field' },
      });
    }
  });
});

// ============================================================================
// validateString
// ============================================================================

describe('validateString', () => {
  it('should return valid string', () => {
    expect(validateString('hello', 'field')).toBe('hello');
    expect(validateString('  world  ', 'field')).toBe('  world  ');
  });

  it('should throw for null/undefined/empty', () => {
    expect(() => validateString(null, 'field')).toThrow(ValidationError);
    expect(() => validateString(undefined, 'field')).toThrow(ValidationError);
    expect(() => validateString('', 'field')).toThrow(ValidationError);
  });

  it('should throw for whitespace-only string', () => {
    expect(() => validateString('   ', 'field')).toThrow(ValidationError);
    expect(() => validateString('\t\n', 'field')).toThrow(ValidationError);
  });

  it('should throw for non-string types', () => {
    expect(() => validateString(123, 'field')).toThrow(ValidationError);
    expect(() => validateString(true, 'field')).toThrow(ValidationError);
    expect(() => validateString({}, 'field')).toThrow(ValidationError);
    expect(() => validateString([], 'field')).toThrow(ValidationError);
  });
});

// ============================================================================
// validateNumber
// ============================================================================

describe('validateNumber', () => {
  it('should return valid number', () => {
    expect(validateNumber(42, 'field')).toBe(42);
    expect(validateNumber(0, 'field')).toBe(0);
    expect(validateNumber(-3.14, 'field')).toBe(-3.14);
  });

  it('should convert numeric strings', () => {
    expect(validateNumber('42', 'field')).toBe(42);
    expect(validateNumber('3.14', 'field')).toBe(3.14);
    expect(validateNumber('-100', 'field')).toBe(-100);
  });

  it('should throw for null/undefined', () => {
    expect(() => validateNumber(null, 'field')).toThrow(ValidationError);
    expect(() => validateNumber(undefined, 'field')).toThrow(ValidationError);
  });

  it('should throw for NaN', () => {
    expect(() => validateNumber(NaN, 'field')).toThrow(ValidationError);
    expect(() => validateNumber('not a number', 'field')).toThrow(ValidationError);
  });

  it('should throw for non-numeric types', () => {
    expect(() => validateNumber(true, 'field')).toThrow(ValidationError);
    expect(() => validateNumber({}, 'field')).toThrow(ValidationError);
    expect(() => validateNumber([], 'field')).toThrow(ValidationError);
  });
});

// ============================================================================
// validateBoolean
// ============================================================================

describe('validateBoolean', () => {
  it('should return valid boolean', () => {
    expect(validateBoolean(true, 'field')).toBe(true);
    expect(validateBoolean(false, 'field')).toBe(false);
  });

  it('should convert boolean strings', () => {
    expect(validateBoolean('true', 'field')).toBe(true);
    expect(validateBoolean('false', 'field')).toBe(false);
    expect(validateBoolean('TRUE', 'field')).toBe(true);
    expect(validateBoolean('FALSE', 'field')).toBe(false);
  });

  it('should throw for null/undefined', () => {
    expect(() => validateBoolean(null, 'field')).toThrow(ValidationError);
    expect(() => validateBoolean(undefined, 'field')).toThrow(ValidationError);
  });

  it('should throw for invalid strings', () => {
    expect(() => validateBoolean('yes', 'field')).toThrow(ValidationError);
    expect(() => validateBoolean('1', 'field')).toThrow(ValidationError);
    expect(() => validateBoolean('', 'field')).toThrow(ValidationError);
  });

  it('should throw for non-boolean types', () => {
    expect(() => validateBoolean(1, 'field')).toThrow(ValidationError);
    expect(() => validateBoolean(0, 'field')).toThrow(ValidationError);
    expect(() => validateBoolean({}, 'field')).toThrow(ValidationError);
  });
});

// ============================================================================
// validateEnum
// ============================================================================

describe('validateEnum', () => {
  const allowed = ['red', 'green', 'blue'] as const;

  it('should return valid enum value', () => {
    expect(validateEnum('red', 'field', allowed)).toBe('red');
    expect(validateEnum('green', 'field', allowed)).toBe('green');
    expect(validateEnum('blue', 'field', allowed)).toBe('blue');
  });

  it('should throw for invalid enum value', () => {
    expect(() => validateEnum('yellow', 'field', allowed)).toThrow(ValidationError);
    expect(() => validateEnum('RED', 'field', allowed)).toThrow(ValidationError);
  });

  it('should throw for null/undefined', () => {
    expect(() => validateEnum(null, 'field', allowed)).toThrow(ValidationError);
    expect(() => validateEnum(undefined, 'field', allowed)).toThrow(ValidationError);
  });

  it('should include allowed values in error message', () => {
    try {
      validateEnum('yellow', 'color', allowed);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      const details = validationError.details as { fields: { color: string } };
      expect(details.fields.color).toContain('red, green, blue');
    }
  });
});

// ============================================================================
// validateOptional
// ============================================================================

describe('validateOptional', () => {
  it('should return undefined for null/undefined/empty', () => {
    expect(validateOptional(null, (v) => validateString(v, 'field'))).toBeUndefined();
    expect(validateOptional(undefined, (v) => validateString(v, 'field'))).toBeUndefined();
    expect(validateOptional('', (v) => validateString(v, 'field'))).toBeUndefined();
  });

  it('should apply validator for present values', () => {
    expect(validateOptional('hello', (v) => validateString(v, 'field'))).toBe('hello');
    expect(validateOptional(42, (v) => validateNumber(v, 'field'))).toBe(42);
    expect(validateOptional(true, (v) => validateBoolean(v, 'field'))).toBe(true);
  });

  it('should throw if validator fails', () => {
    expect(() => validateOptional('   ', (v) => validateString(v, 'field'))).toThrow(
      ValidationError
    );
    expect(() => validateOptional('not a number', (v) => validateNumber(v, 'field'))).toThrow(
      ValidationError
    );
  });
});

// ============================================================================
// validateStringArray
// ============================================================================

describe('validateStringArray', () => {
  it('should return valid string array', () => {
    expect(validateStringArray(['a', 'b', 'c'], 'field')).toEqual(['a', 'b', 'c']);
    expect(validateStringArray([], 'field')).toEqual([]);
  });

  it('should throw for null/undefined', () => {
    expect(() => validateStringArray(null, 'field')).toThrow(ValidationError);
    expect(() => validateStringArray(undefined, 'field')).toThrow(ValidationError);
  });

  it('should throw for non-array', () => {
    expect(() => validateStringArray('not array', 'field')).toThrow(ValidationError);
    expect(() => validateStringArray({}, 'field')).toThrow(ValidationError);
  });

  it('should throw for non-string elements', () => {
    expect(() => validateStringArray(['a', 123, 'c'], 'field')).toThrow(ValidationError);
    expect(() => validateStringArray(['a', null, 'c'], 'field')).toThrow(ValidationError);
    expect(() => validateStringArray([true, false], 'field')).toThrow(ValidationError);
  });

  it('should throw for empty string elements', () => {
    expect(() => validateStringArray(['a', '', 'c'], 'field')).toThrow(ValidationError);
    expect(() => validateStringArray(['a', '   ', 'c'], 'field')).toThrow(ValidationError);
  });

  it('should include element index in error', () => {
    try {
      validateStringArray(['a', 123, 'c'], 'tags');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      const validationError = error as ValidationError;
      const details = validationError.details as { fields: { tags: string } };
      expect(details.fields.tags).toContain('index 1');
    }
  });
});

// ============================================================================
// parseJsonBody
// ============================================================================

describe('parseJsonBody', () => {
  it('should parse and validate JSON body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test', value: 42 }),
    });

    const result = await parseJsonBody(req, (body: unknown) => {
      const obj = body as Record<string, unknown>;
      return {
        name: validateString(obj.name, 'name'),
        value: validateNumber(obj.value, 'value'),
      };
    });

    expect(result).toEqual({ name: 'test', value: 42 });
  });

  it('should throw for missing content-type', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });

    await expect(
      parseJsonBody(req, (body) => body)
    ).rejects.toThrow(ValidationError);
  });

  it('should throw for invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'invalid json',
    });

    await expect(
      parseJsonBody(req, (body) => body)
    ).rejects.toThrow(ValidationError);
  });

  it('should throw if validator fails', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    await expect(
      parseJsonBody(req, (body: unknown) => {
        const obj = body as Record<string, unknown>;
        return { name: validateString(obj.name, 'name') };
      })
    ).rejects.toThrow(ValidationError);
  });
});

// ============================================================================
// extractQueryParam
// ============================================================================

describe('extractQueryParam', () => {
  it('should extract existing query parameter', () => {
    const url = new URL('http://localhost?name=test&value=42');
    expect(extractQueryParam(url, 'name')).toBe('test');
    expect(extractQueryParam(url, 'value')).toBe('42');
  });

  it('should return undefined for missing parameter', () => {
    const url = new URL('http://localhost?name=test');
    expect(extractQueryParam(url, 'missing')).toBeUndefined();
  });

  it('should throw for required missing parameter', () => {
    const url = new URL('http://localhost');
    expect(() => extractQueryParam(url, 'required', true)).toThrow(ValidationError);
  });

  it('should not throw for required present parameter', () => {
    const url = new URL('http://localhost?required=value');
    expect(extractQueryParam(url, 'required', true)).toBe('value');
  });

  it('should return undefined for empty parameter', () => {
    const url = new URL('http://localhost?name=');
    expect(extractQueryParam(url, 'name')).toBeUndefined();
  });
});

// ============================================================================
// extractPathParam
// ============================================================================

describe('extractPathParam', () => {
  it('should extract path parameter', () => {
    const pattern = /^\/api\/projects\/([^/]+)$/;
    expect(extractPathParam('/api/projects/myproject', pattern)).toBe('myproject');
    expect(extractPathParam('/api/projects/test-123', pattern)).toBe('test-123');
  });

  it('should return undefined for no match', () => {
    const pattern = /^\/api\/projects\/([^/]+)$/;
    expect(extractPathParam('/api/users/123', pattern)).toBeUndefined();
    expect(extractPathParam('/api/projects', pattern)).toBeUndefined();
  });

  it('should extract different capture groups', () => {
    const pattern = /^\/api\/docs\/([^/]+)\/items\/([^/]+)$/;
    expect(extractPathParam('/api/docs/doc1/items/item1', pattern, 1)).toBe('doc1');
    expect(extractPathParam('/api/docs/doc1/items/item1', pattern, 2)).toBe('item1');
  });

  it('should handle complex patterns', () => {
    const pattern = /^\/api\/fields\/([^/]+)$/;
    expect(extractPathParam('/api/fields/type', pattern)).toBe('type');
    expect(extractPathParam('/api/fields/priority', pattern)).toBe('priority');
  });
});

// ============================================================================
// validateObject
// ============================================================================

describe('validateObject', () => {
  it('should return valid object', () => {
    const obj = { name: 'test', value: 42 };
    expect(validateObject(obj, 'field')).toEqual(obj);
    expect(validateObject({}, 'field')).toEqual({});
  });

  it('should throw for null/undefined', () => {
    expect(() => validateObject(null, 'field')).toThrow(ValidationError);
    expect(() => validateObject(undefined, 'field')).toThrow(ValidationError);
  });

  it('should throw for non-object types', () => {
    expect(() => validateObject('string', 'field')).toThrow(ValidationError);
    expect(() => validateObject(123, 'field')).toThrow(ValidationError);
    expect(() => validateObject(true, 'field')).toThrow(ValidationError);
  });

  it('should throw for array', () => {
    expect(() => validateObject([], 'field')).toThrow(ValidationError);
    expect(() => validateObject(['a', 'b'], 'field')).toThrow(ValidationError);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Complex validation scenarios', () => {
  it('should validate nested object with multiple fields', () => {
    const data = {
      name: 'Project',
      enabled: true,
      priority: 'high',
      tags: ['tag1', 'tag2'],
      metadata: { key: 'value' },
    };

    const obj = validateObject(data, 'data');
    expect(validateString(obj.name, 'name')).toBe('Project');
    expect(validateBoolean(obj.enabled, 'enabled')).toBe(true);
    expect(validateEnum(obj.priority, 'priority', ['low', 'high'] as const)).toBe('high');
    expect(validateStringArray(obj.tags, 'tags')).toEqual(['tag1', 'tag2']);
  });

  it('should validate optional nested fields', () => {
    const data = {
      name: 'Project',
      repo_url: 'https://github.com/test/repo',
      description: null,
    };

    const obj = validateObject(data, 'data');
    expect(validateString(obj.name, 'name')).toBe('Project');
    expect(
      validateOptional(obj.repo_url, (v) => {
        if (typeof v !== 'string') throw new Error('Must be string');
        return v;
      })
    ).toBe('https://github.com/test/repo');
    expect(
      validateOptional(obj.description, (v) => {
        if (typeof v !== 'string') throw new Error('Must be string');
        return v;
      })
    ).toBeUndefined();
  });

  it('should accumulate validation errors from multiple fields', () => {
    const data = {
      name: '',
      value: 'not a number',
      tags: ['valid', 123, 'also valid'],
    };

    const errors: string[] = [];
    const obj = validateObject(data, 'data');

    try {
      validateString(obj.name, 'name');
    } catch {
      errors.push('name failed');
    }

    try {
      validateNumber(obj.value, 'value');
    } catch {
      errors.push('value failed');
    }

    try {
      validateStringArray(obj.tags, 'tags');
    } catch {
      errors.push('tags failed');
    }

    expect(errors).toEqual(['name failed', 'value failed', 'tags failed']);
  });
});
