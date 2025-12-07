/**
 * Validation & ID Generation Tests
 *
 * Tests for:
 * - generateDocId: Document ID generation with various slugs and dates
 * - generateItemId: Item ID generation with validation
 * - parseDocId: Document ID parsing and validation
 * - parseItemId: Item ID parsing and validation
 * - slugify: Text to URL-safe slug conversion
 * - isValidDocId: Document ID validation
 * - isValidItemId: Item ID validation
 * - getNextItemNumber: Next item number calculation
 */

import { describe, it, expect } from 'vitest';
import {
  generateDocId,
  generateItemId,
  parseDocId,
  parseItemId,
  slugify,
  isValidDocId,
  isValidItemId,
  getNextItemNumber,
} from './index';

describe('generateDocId', () => {
  it('should generate valid doc ID with provided date', () => {
    // Use local date to avoid timezone issues
    const date = new Date(2025, 11, 3); // Dec 3, 2025 (month is 0-indexed)
    const docId = generateDocId('meatycapture', date);
    expect(docId).toBe('REQ-20251203-meatycapture');
  });

  it('should generate valid doc ID with current date when not provided', () => {
    const docId = generateDocId('test-project');
    expect(docId).toMatch(/^REQ-\d{8}-test-project$/);
  });

  it('should normalize slug with spaces', () => {
    const date = new Date(2025, 11, 3); // Dec 3, 2025
    const docId = generateDocId('My Project Name', date);
    expect(docId).toBe('REQ-20251203-my-project-name');
  });

  it('should normalize slug with special characters', () => {
    const date = new Date(2025, 11, 3); // Dec 3, 2025
    const docId = generateDocId('Special!@#$%Characters', date);
    expect(docId).toBe('REQ-20251203-specialcharacters');
  });

  it('should normalize slug with underscores', () => {
    const date = new Date(2025, 11, 3); // Dec 3, 2025
    const docId = generateDocId('under_score_text', date);
    expect(docId).toBe('REQ-20251203-under-score-text');
  });

  it('should handle single digit month and day', () => {
    const date = new Date(2025, 0, 5); // Jan 5, 2025
    const docId = generateDocId('test', date);
    expect(docId).toBe('REQ-20250105-test');
  });

  it('should handle double digit month and day', () => {
    const date = new Date(2025, 10, 25); // Nov 25, 2025
    const docId = generateDocId('test', date);
    expect(docId).toBe('REQ-20251125-test');
  });

  it('should throw error for empty slug', () => {
    expect(() => generateDocId('')).toThrow();
  });

  it('should throw error for non-string slug', () => {
    // @ts-expect-error Testing runtime validation
    expect(() => generateDocId(123)).toThrow('Project slug is required and must be a string');
  });

  it('should throw error for slug with only special characters', () => {
    expect(() => generateDocId('!@#$%')).toThrow('Invalid project slug');
  });
});

describe('generateItemId', () => {
  it('should generate valid item ID with single digit number', () => {
    const itemId = generateItemId('REQ-20251203-capture-app', 1);
    expect(itemId).toBe('REQ-20251203-capture-app-01');
  });

  it('should generate valid item ID with double digit number', () => {
    const itemId = generateItemId('REQ-20251203-capture-app', 15);
    expect(itemId).toBe('REQ-20251203-capture-app-15');
  });

  it('should zero-pad single digit numbers', () => {
    const itemId = generateItemId('REQ-20251203-capture-app', 5);
    expect(itemId).toBe('REQ-20251203-capture-app-05');
  });

  it('should handle maximum item number (99)', () => {
    const itemId = generateItemId('REQ-20251203-capture-app', 99);
    expect(itemId).toBe('REQ-20251203-capture-app-99');
  });

  it('should throw error for invalid doc ID', () => {
    expect(() => generateItemId('INVALID-ID', 1)).toThrow('Invalid document ID');
  });

  it('should throw error for item number less than 1', () => {
    expect(() => generateItemId('REQ-20251203-capture-app', 0)).toThrow(
      'Item number must be an integer between 1 and 99'
    );
  });

  it('should throw error for item number greater than 99', () => {
    expect(() => generateItemId('REQ-20251203-capture-app', 100)).toThrow(
      'Item number must be an integer between 1 and 99'
    );
  });

  it('should throw error for non-integer item number', () => {
    expect(() => generateItemId('REQ-20251203-capture-app', 1.5)).toThrow(
      'Item number must be an integer between 1 and 99'
    );
  });

  it('should throw error for negative item number', () => {
    expect(() => generateItemId('REQ-20251203-capture-app', -1)).toThrow(
      'Item number must be an integer between 1 and 99'
    );
  });
});

describe('parseDocId', () => {
  it('should parse valid doc ID', () => {
    const parsed = parseDocId('REQ-20251203-capture-app');
    expect(parsed).toEqual({
      date: new Date(2025, 11, 3), // Month is 0-indexed
      projectSlug: 'capture-app',
    });
  });

  it('should parse doc ID with complex slug', () => {
    const parsed = parseDocId('REQ-20251203-my-long-project-name-123');
    expect(parsed).toEqual({
      date: new Date(2025, 11, 3),
      projectSlug: 'my-long-project-name-123',
    });
  });

  it('should parse doc ID with single digit month and day', () => {
    const parsed = parseDocId('REQ-20250105-test');
    expect(parsed).toEqual({
      date: new Date(2025, 0, 5),
      projectSlug: 'test',
    });
  });

  it('should return null for empty string', () => {
    expect(parseDocId('')).toBeNull();
  });

  it('should return null for non-string input', () => {
    // @ts-expect-error Testing runtime validation
    expect(parseDocId(123)).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseDocId('INVALID-ID')).toBeNull();
  });

  it('should return null for wrong prefix', () => {
    expect(parseDocId('TASK-20251203-project')).toBeNull();
  });

  it('should return null for invalid date format', () => {
    expect(parseDocId('REQ-2025-capture-app')).toBeNull();
  });

  it('should return null for invalid month (13)', () => {
    expect(parseDocId('REQ-20251301-project')).toBeNull();
  });

  it('should return null for invalid month (00)', () => {
    expect(parseDocId('REQ-20250001-project')).toBeNull();
  });

  it('should return null for invalid day (32)', () => {
    expect(parseDocId('REQ-20250132-project')).toBeNull();
  });

  it('should return null for invalid day (00)', () => {
    expect(parseDocId('REQ-20250100-project')).toBeNull();
  });

  it('should return null for invalid date (Feb 31)', () => {
    expect(parseDocId('REQ-20250231-project')).toBeNull();
  });

  it('should return null for missing slug', () => {
    expect(parseDocId('REQ-20251203-')).toBeNull();
  });

  it('should return null for slug with uppercase', () => {
    expect(parseDocId('REQ-20251203-Project')).toBeNull();
  });
});

describe('parseItemId', () => {
  it('should parse valid item ID', () => {
    const parsed = parseItemId('REQ-20251203-capture-app-01');
    expect(parsed).toEqual({
      docId: 'REQ-20251203-capture-app',
      itemNumber: 1,
      date: new Date(2025, 11, 3),
      projectSlug: 'capture-app',
    });
  });

  it('should parse item ID with double digit number', () => {
    const parsed = parseItemId('REQ-20251203-capture-app-99');
    expect(parsed).toEqual({
      docId: 'REQ-20251203-capture-app',
      itemNumber: 99,
      date: new Date(2025, 11, 3),
      projectSlug: 'capture-app',
    });
  });

  it('should parse item ID with complex slug', () => {
    const parsed = parseItemId('REQ-20251203-my-long-project-name-123-05');
    expect(parsed).toEqual({
      docId: 'REQ-20251203-my-long-project-name-123',
      itemNumber: 5,
      date: new Date(2025, 11, 3),
      projectSlug: 'my-long-project-name-123',
    });
  });

  it('should return null for empty string', () => {
    expect(parseItemId('')).toBeNull();
  });

  it('should return null for non-string input', () => {
    // @ts-expect-error Testing runtime validation
    expect(parseItemId(123)).toBeNull();
  });

  it('should return null for invalid format', () => {
    expect(parseItemId('INVALID-ID')).toBeNull();
  });

  it('should return null for doc ID without item number', () => {
    expect(parseItemId('REQ-20251203-capture-app')).toBeNull();
  });

  it('should return null for invalid date in item ID', () => {
    expect(parseItemId('REQ-20251301-project-01')).toBeNull();
  });

  it('should return null for single digit item number', () => {
    expect(parseItemId('REQ-20251203-project-1')).toBeNull();
  });

  it('should return null for three digit item number', () => {
    expect(parseItemId('REQ-20251203-project-100')).toBeNull();
  });
});

describe('slugify', () => {
  it('should convert text to lowercase', () => {
    expect(slugify('MyProjectName')).toBe('myprojectname');
  });

  it('should replace spaces with hyphens', () => {
    expect(slugify('My Project Name')).toBe('my-project-name');
  });

  it('should replace underscores with hyphens', () => {
    expect(slugify('under_score_text')).toBe('under-score-text');
  });

  it('should remove special characters', () => {
    expect(slugify('Special!@#$%Characters')).toBe('specialcharacters');
  });

  it('should collapse multiple hyphens', () => {
    expect(slugify('multiple---hyphens')).toBe('multiple-hyphens');
  });

  it('should trim leading and trailing spaces', () => {
    expect(slugify('  trimmed  ')).toBe('trimmed');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(slugify('-leading-and-trailing-')).toBe('leading-and-trailing');
  });

  it('should handle multiple spaces', () => {
    expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
  });

  it('should handle mixed case with numbers', () => {
    expect(slugify('Mixed-CASE_Text 123')).toBe('mixed-case-text-123');
  });

  it('should return empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    // @ts-expect-error Testing runtime validation
    expect(slugify(123)).toBe('');
  });

  it('should return empty string for only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
  });

  it('should preserve alphanumeric and hyphens', () => {
    expect(slugify('valid-slug-123')).toBe('valid-slug-123');
  });

  it('should handle unicode characters by removing them', () => {
    expect(slugify('unicode-テスト-text')).toBe('unicode-text');
  });
});

describe('isValidDocId', () => {
  it('should return true for valid doc ID', () => {
    expect(isValidDocId('REQ-20251203-capture-app')).toBe(true);
  });

  it('should return true for valid doc ID with complex slug', () => {
    expect(isValidDocId('REQ-20251203-my-long-project-name-123')).toBe(true);
  });

  it('should return false for invalid format', () => {
    expect(isValidDocId('INVALID-ID')).toBe(false);
  });

  it('should return false for wrong prefix', () => {
    expect(isValidDocId('TASK-20251203-project')).toBe(false);
  });

  it('should return false for invalid date', () => {
    expect(isValidDocId('REQ-20251301-project')).toBe(false);
  });

  // Note: The regex pattern for doc IDs is permissive and also matches item ID format.
  // This is by design - the format validation doesn't distinguish between them.
  // Use parseItemId vs parseDocId for semantic distinction.
  it('should validate item ID format as valid doc ID (format-wise)', () => {
    // 'capture-app-01' is a valid slug, so this passes format validation
    expect(isValidDocId('REQ-20251203-capture-app-01')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidDocId('')).toBe(false);
  });

  it('should return false for slug with uppercase', () => {
    expect(isValidDocId('REQ-20251203-Project')).toBe(false);
  });
});

describe('isValidItemId', () => {
  it('should return true for valid item ID', () => {
    expect(isValidItemId('REQ-20251203-capture-app-01')).toBe(true);
  });

  it('should return true for valid item ID with double digit number', () => {
    expect(isValidItemId('REQ-20251203-capture-app-99')).toBe(true);
  });

  it('should return false for invalid format', () => {
    expect(isValidItemId('INVALID-ID')).toBe(false);
  });

  it('should return false for doc ID without item number', () => {
    expect(isValidItemId('REQ-20251203-capture-app')).toBe(false);
  });

  it('should return false for invalid date', () => {
    expect(isValidItemId('REQ-20251301-project-01')).toBe(false);
  });

  it('should return false for single digit item number', () => {
    expect(isValidItemId('REQ-20251203-project-1')).toBe(false);
  });

  it('should return false for three digit item number', () => {
    expect(isValidItemId('REQ-20251203-project-100')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isValidItemId('')).toBe(false);
  });
});

describe('getNextItemNumber', () => {
  it('should return 1 for empty array', () => {
    expect(getNextItemNumber([])).toBe(1);
  });

  it('should return next number for single item', () => {
    const items = [{ id: 'REQ-20251203-capture-app-01' }];
    expect(getNextItemNumber(items)).toBe(2);
  });

  it('should return next number for multiple sequential items', () => {
    const items = [
      { id: 'REQ-20251203-capture-app-01' },
      { id: 'REQ-20251203-capture-app-02' },
      { id: 'REQ-20251203-capture-app-03' },
    ];
    expect(getNextItemNumber(items)).toBe(4);
  });

  it('should return max + 1 for non-sequential items', () => {
    const items = [
      { id: 'REQ-20251203-capture-app-01' },
      { id: 'REQ-20251203-capture-app-05' },
      { id: 'REQ-20251203-capture-app-03' },
    ];
    expect(getNextItemNumber(items)).toBe(6);
  });

  it('should ignore invalid item IDs', () => {
    const items = [
      { id: 'INVALID-ID' },
      { id: 'REQ-20251203-capture-app-03' },
      { id: 'ANOTHER-INVALID' },
    ];
    expect(getNextItemNumber(items)).toBe(4);
  });

  it('should return 1 when all items have invalid IDs', () => {
    const items = [{ id: 'INVALID-ID' }, { id: 'ANOTHER-INVALID' }];
    expect(getNextItemNumber(items)).toBe(1);
  });

  it('should handle items with different doc IDs', () => {
    const items = [
      { id: 'REQ-20251203-project-a-01' },
      { id: 'REQ-20251203-project-b-02' },
      { id: 'REQ-20251203-project-a-05' },
    ];
    // Should find max across all items (5) and return 6
    expect(getNextItemNumber(items)).toBe(6);
  });

  it('should handle item number 99', () => {
    const items = [{ id: 'REQ-20251203-capture-app-99' }];
    expect(getNextItemNumber(items)).toBe(100);
  });

  it('should return 1 for non-array input', () => {
    // @ts-expect-error Testing runtime validation
    expect(getNextItemNumber(null)).toBe(1);
  });
});
