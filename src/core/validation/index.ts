/**
 * Validation & ID Generation
 *
 * Handles:
 * - Field validation (required fields, formats)
 * - ID generation patterns (doc_id, item_id)
 * - Path validation (writability, format)
 * - Business rule enforcement
 */

/**
 * Parsed document ID structure
 * Extracted from format: REQ-YYYYMMDD-<project-slug>
 */
export interface ParsedDocId {
  /** Parsed date from the document ID */
  date: Date;
  /** Extracted project slug */
  projectSlug: string;
}

/**
 * Parsed item ID structure
 * Extracted from format: REQ-YYYYMMDD-<project-slug>-XX
 */
export interface ParsedItemId {
  /** Parent document ID (without item number) */
  docId: string;
  /** Item number (1-based) */
  itemNumber: number;
  /** Parsed date from the item ID */
  date: Date;
  /** Extracted project slug */
  projectSlug: string;
}

/**
 * Object with an id field for item number calculation
 */
export interface ItemWithId {
  id: string;
}

// ID format constants
const DOC_ID_PREFIX = 'REQ';
const DOC_ID_PATTERN = /^REQ-(\d{8})-([a-z0-9-]+)$/;
const ITEM_ID_PATTERN = /^REQ-(\d{8})-([a-z0-9-]+)-(\d{2})$/;

/**
 * Generates a document ID from a project slug and date.
 *
 * Format: REQ-YYYYMMDD-<project-slug>
 * Example: REQ-20251203-capture-app
 *
 * @param projectSlug - The project identifier (must be a valid slug)
 * @param date - The date to use for the ID (defaults to current date)
 * @returns The generated document ID
 *
 * @example
 * ```typescript
 * const docId = generateDocId('meatycapture', new Date('2025-12-03'));
 * // Returns: 'REQ-20251203-meatycapture'
 * ```
 */
export function generateDocId(projectSlug: string, date: Date = new Date()): string {
  if (!projectSlug || typeof projectSlug !== 'string') {
    throw new Error('Project slug is required and must be a string');
  }

  // Ensure the slug is properly formatted
  const normalizedSlug = slugify(projectSlug);
  if (!normalizedSlug) {
    throw new Error(`Invalid project slug: "${projectSlug}"`);
  }

  // Format date as YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  return `${DOC_ID_PREFIX}-${dateStr}-${normalizedSlug}`;
}

/**
 * Generates an item ID from a document ID and item number.
 *
 * Format: REQ-YYYYMMDD-<project-slug>-XX
 * Example: REQ-20251203-capture-app-01
 *
 * @param docId - The parent document ID
 * @param itemNumber - The item number (1-based, will be zero-padded to 2 digits)
 * @returns The generated item ID
 * @throws Error if docId is invalid or itemNumber is out of range
 *
 * @example
 * ```typescript
 * const itemId = generateItemId('REQ-20251203-capture-app', 1);
 * // Returns: 'REQ-20251203-capture-app-01'
 *
 * const itemId2 = generateItemId('REQ-20251203-capture-app', 15);
 * // Returns: 'REQ-20251203-capture-app-15'
 * ```
 */
export function generateItemId(docId: string, itemNumber: number): string {
  if (!isValidDocId(docId)) {
    throw new Error(`Invalid document ID: "${docId}"`);
  }

  if (!Number.isInteger(itemNumber) || itemNumber < 1 || itemNumber > 99) {
    throw new Error(`Item number must be an integer between 1 and 99, got: ${itemNumber}`);
  }

  const paddedNumber = String(itemNumber).padStart(2, '0');
  return `${docId}-${paddedNumber}`;
}

/**
 * Parses a document ID into its constituent parts.
 *
 * Extracts the date and project slug from a document ID.
 * Returns null if the ID format is invalid.
 *
 * @param docId - The document ID to parse
 * @returns Parsed components or null if invalid
 *
 * @example
 * ```typescript
 * const parsed = parseDocId('REQ-20251203-capture-app');
 * // Returns: {
 * //   date: Date('2025-12-03'),
 * //   projectSlug: 'capture-app'
 * // }
 *
 * const invalid = parseDocId('INVALID-ID');
 * // Returns: null
 * ```
 */
export function parseDocId(docId: string): ParsedDocId | null {
  if (!docId || typeof docId !== 'string') {
    return null;
  }

  const match = docId.match(DOC_ID_PATTERN);
  if (!match) {
    return null;
  }

  const dateStr = match[1];
  const projectSlug = match[2];

  if (!dateStr || !projectSlug) {
    return null;
  }

  // Parse date: YYYYMMDD
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);

  // Validate date components
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  // Verify the date is valid (handles invalid dates like Feb 31)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return {
    date,
    projectSlug,
  };
}

/**
 * Parses an item ID into its constituent parts.
 *
 * Extracts the document ID, item number, date, and project slug.
 * Returns null if the ID format is invalid.
 *
 * @param itemId - The item ID to parse
 * @returns Parsed components or null if invalid
 *
 * @example
 * ```typescript
 * const parsed = parseItemId('REQ-20251203-capture-app-01');
 * // Returns: {
 * //   docId: 'REQ-20251203-capture-app',
 * //   itemNumber: 1,
 * //   date: Date('2025-12-03'),
 * //   projectSlug: 'capture-app'
 * // }
 *
 * const invalid = parseItemId('INVALID-ID');
 * // Returns: null
 * ```
 */
export function parseItemId(itemId: string): ParsedItemId | null {
  if (!itemId || typeof itemId !== 'string') {
    return null;
  }

  const match = itemId.match(ITEM_ID_PATTERN);
  if (!match) {
    return null;
  }

  const dateStr = match[1];
  const projectSlug = match[2];
  const itemNumStr = match[3];

  if (!dateStr || !projectSlug || !itemNumStr) {
    return null;
  }

  // Parse the document ID portion for reuse
  const docId = `${DOC_ID_PREFIX}-${dateStr}-${projectSlug}`;
  const docIdParsed = parseDocId(docId);

  if (!docIdParsed) {
    return null;
  }

  const itemNumber = parseInt(itemNumStr, 10);

  return {
    docId,
    itemNumber,
    date: docIdParsed.date,
    projectSlug: docIdParsed.projectSlug,
  };
}

/**
 * Converts text to a URL-safe slug.
 *
 * - Converts to lowercase
 * - Replaces spaces and underscores with hyphens
 * - Removes special characters except hyphens and alphanumerics
 * - Collapses multiple hyphens into one
 * - Trims leading/trailing hyphens
 *
 * @param text - The text to slugify
 * @returns The slugified text
 *
 * @example
 * ```typescript
 * slugify('My Project Name')        // 'my-project-name'
 * slugify('Special!@#$%Characters') // 'specialcharacters'
 * slugify('  Multiple   Spaces  ')  // 'multiple-spaces'
 * slugify('under_score_text')       // 'under-score-text'
 * slugify('Mixed-CASE_Text 123')    // 'mixed-case-text-123'
 * ```
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove all non-alphanumeric characters except hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Collapse multiple hyphens into one
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
  );
}

/**
 * Sanitizes a string for safe use as a path segment.
 *
 * Builds on slugify() with additional security measures to prevent
 * path traversal attacks and filesystem vulnerabilities.
 *
 * Security measures:
 * - Removes path separators (/, \)
 * - Removes path traversal patterns (.., .)
 * - Removes null bytes and control characters
 * - Only allows alphanumeric characters and hyphens
 *
 * @param text - The text to sanitize for path usage
 * @returns A safe path segment, or empty string if input is invalid
 *
 * @example
 * ```typescript
 * sanitizePathSegment('My Project')        // 'my-project'
 * sanitizePathSegment('../etc/passwd')     // 'etcpasswd'
 * sanitizePathSegment('project/../../bad') // 'projectbad'
 * ```
 */
export function sanitizePathSegment(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and control characters first
  let sanitized = text.replace(/[\x00-\x1f\x7f]/g, '');

  // Remove path separators
  sanitized = sanitized.replace(/[/\\]/g, '');

  // Remove explicit traversal patterns
  sanitized = sanitized.replace(/\.\./g, '').replace(/^\.$/, '');

  // Apply slugify for final alphanumeric normalization
  return slugify(sanitized);
}

/**
 * Generates a default project path by substituting {name} placeholder.
 *
 * @param pattern - Path pattern with {name} placeholder (e.g., "~/projects/{name}")
 * @param projectName - The project name to substitute (will be sanitized)
 * @returns The generated path with sanitized project name
 *
 * @example
 * ```typescript
 * generateDefaultProjectPath('~/projects/{name}', 'My Project')
 * // Returns: '~/projects/my-project'
 * ```
 */
export function generateDefaultProjectPath(pattern: string, projectName: string): string {
  const safeName = sanitizePathSegment(projectName);
  if (!safeName) {
    return pattern.replace('{name}', 'untitled');
  }
  return pattern.replace('{name}', safeName);
}

/**
 * Validates a document ID format.
 *
 * Checks if the ID matches the expected pattern: REQ-YYYYMMDD-<project-slug>
 *
 * @param docId - The document ID to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidDocId('REQ-20251203-capture-app')  // true
 * isValidDocId('REQ-20251203-my-project')   // true
 * isValidDocId('INVALID-ID')                // false
 * isValidDocId('REQ-2025-capture-app')      // false (invalid date format)
 * isValidDocId('REQ-20251301-project')      // false (invalid month)
 * ```
 */
export function isValidDocId(docId: string): boolean {
  return parseDocId(docId) !== null;
}

/**
 * Validates an item ID format.
 *
 * Checks if the ID matches the expected pattern: REQ-YYYYMMDD-<project-slug>-XX
 *
 * @param itemId - The item ID to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidItemId('REQ-20251203-capture-app-01')  // true
 * isValidItemId('REQ-20251203-capture-app-99')  // true
 * isValidItemId('REQ-20251203-capture-app')     // false (missing item number)
 * isValidItemId('INVALID-ID')                   // false
 * isValidItemId('REQ-20251203-project-100')     // false (item number > 99)
 * ```
 */
export function isValidItemId(itemId: string): boolean {
  return parseItemId(itemId) !== null;
}

/**
 * Determines the next item number based on existing items.
 *
 * Finds the maximum item number from existing items and returns max + 1.
 * Returns 1 if no items exist or if item extraction fails.
 *
 * @param existingItems - Array of items with ID fields
 * @returns The next item number (1-based)
 *
 * @example
 * ```typescript
 * // No items
 * getNextItemNumber([])  // 1
 *
 * // With existing items
 * getNextItemNumber([
 *   { id: 'REQ-20251203-capture-app-01' },
 *   { id: 'REQ-20251203-capture-app-02' },
 * ])  // 3
 *
 * // Non-sequential items (returns max + 1)
 * getNextItemNumber([
 *   { id: 'REQ-20251203-capture-app-01' },
 *   { id: 'REQ-20251203-capture-app-05' },
 * ])  // 6
 *
 * // Invalid items are ignored
 * getNextItemNumber([
 *   { id: 'INVALID-ID' },
 *   { id: 'REQ-20251203-capture-app-03' },
 * ])  // 4
 * ```
 */
export function getNextItemNumber(existingItems: Array<ItemWithId>): number {
  if (!Array.isArray(existingItems) || existingItems.length === 0) {
    return 1;
  }

  // Extract all valid item numbers
  const itemNumbers = existingItems
    .map((item) => parseItemId(item.id))
    .filter((parsed): parsed is ParsedItemId => parsed !== null)
    .map((parsed) => parsed.itemNumber);

  if (itemNumbers.length === 0) {
    return 1;
  }

  const maxNumber = Math.max(...itemNumbers);
  return maxNumber + 1;
}
