/**
 * Search Handler Module
 *
 * Provides query parsing and matching logic for the log search command.
 * Supports text search across title/notes and special prefix syntax
 * for tags, type, and status filtering.
 *
 * Query Syntax:
 * - Plain text: searches in title and notes (case-insensitive)
 * - tag:<name>: matches items with the specified tag
 * - type:<type>: matches items with the specified type
 * - status:<status>: matches items with the specified status
 *
 * Multiple query terms are combined with AND logic.
 *
 * Match Modes:
 * - contains: substring match (default)
 * - starts: prefix match
 * - full: exact match
 */

import type { RequestLogItem, RequestLogDoc } from '@core/models';
import type { SearchMatch, MatchedField } from '@cli/formatters';

/**
 * Match mode for search operations.
 *
 * - full: exact match required
 * - starts: value must start with query
 * - contains: value contains query anywhere (default)
 */
export type MatchMode = 'full' | 'starts' | 'contains';

/**
 * Parsed query component.
 *
 * Query strings are parsed into components for efficient matching.
 * Special prefixes (tag:, type:, status:) target specific fields.
 */
export interface QueryComponent {
  /** Type of query component */
  type: 'text' | 'tag' | 'item_type' | 'status';
  /** Value to search for */
  value: string;
}

/**
 * Search configuration options.
 */
export interface SearchOptions {
  /** Match mode for text comparisons */
  matchMode: MatchMode;
  /** Maximum results to return (0 = unlimited) */
  limit: number;
}

/**
 * Default search options.
 */
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchMode: 'contains',
  limit: 0,
};

// ============================================================================
// Query Parsing
// ============================================================================

/**
 * Parses a search query string into components.
 *
 * Recognizes special prefixes:
 * - tag: or tags: - search tags
 * - type: - search item type
 * - status: - search item status
 *
 * All other text is treated as plain text search.
 * Quoted strings preserve spaces within queries.
 *
 * @param query - Raw query string
 * @returns Array of parsed query components
 *
 * @example
 * ```typescript
 * parseQuery('tag:api login bug')
 * // Returns:
 * // [
 * //   { type: 'tag', value: 'api' },
 * //   { type: 'text', value: 'login' },
 * //   { type: 'text', value: 'bug' }
 * // ]
 * ```
 */
export function parseQuery(query: string): QueryComponent[] {
  const components: QueryComponent[] = [];
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return components;
  }

  // Tokenize respecting quoted strings
  const tokens = tokenize(trimmedQuery);

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    // Check for prefix patterns
    if (lowerToken.startsWith('tag:') || lowerToken.startsWith('tags:')) {
      const colonIndex = token.indexOf(':');
      const value = token.slice(colonIndex + 1);
      if (value) {
        components.push({ type: 'tag', value });
      }
    } else if (lowerToken.startsWith('type:')) {
      const value = token.slice(5);
      if (value) {
        components.push({ type: 'item_type', value });
      }
    } else if (lowerToken.startsWith('status:')) {
      const value = token.slice(7);
      if (value) {
        components.push({ type: 'status', value });
      }
    } else {
      // Plain text search
      components.push({ type: 'text', value: token });
    }
  }

  return components;
}

/**
 * Tokenizes a query string, respecting quoted strings.
 *
 * Handles both single and double quotes for multi-word queries.
 *
 * @param query - Query string to tokenize
 * @returns Array of tokens
 */
function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (const char of query) {
    if (inQuote) {
      if (char === quoteChar) {
        // End of quoted string
        if (current) {
          tokens.push(current);
          current = '';
        }
        inQuote = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      // Start of quoted string
      if (current) {
        tokens.push(current);
        current = '';
      }
      inQuote = true;
      quoteChar = char;
    } else if (char === ' ' || char === '\t') {
      // Whitespace separator
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  // Don't forget the last token
  if (current) {
    tokens.push(current);
  }

  return tokens;
}

// ============================================================================
// Matching Logic
// ============================================================================

/**
 * Compares two strings according to the specified match mode.
 *
 * All comparisons are case-insensitive.
 *
 * @param haystack - String to search in
 * @param needle - String to search for
 * @param mode - Match mode
 * @returns True if match found
 */
function matchString(haystack: string, needle: string, mode: MatchMode): boolean {
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();

  switch (mode) {
    case 'full':
      return lowerHaystack === lowerNeedle;
    case 'starts':
      return lowerHaystack.startsWith(lowerNeedle);
    case 'contains':
      return lowerHaystack.includes(lowerNeedle);
  }
}

/**
 * Finds the match position in a string.
 *
 * Returns character offsets for highlighting.
 *
 * @param haystack - String to search in
 * @param needle - String to search for
 * @returns Start and end positions, or undefined if not found
 */
function findMatchPosition(
  haystack: string,
  needle: string
): { start: number; end: number } | undefined {
  const lowerHaystack = haystack.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const start = lowerHaystack.indexOf(lowerNeedle);

  if (start === -1) {
    return undefined;
  }

  return {
    start,
    end: start + needle.length,
  };
}

/**
 * Extracts context around a match position.
 *
 * Returns surrounding text for display with ellipsis if truncated.
 *
 * @param text - Full text
 * @param start - Match start position
 * @param end - Match end position
 * @param contextLength - Number of characters before/after to include
 * @returns Extracted context with ellipsis markers
 */
function extractContext(
  text: string,
  start: number,
  end: number,
  contextLength: number = 30
): string {
  const contextStart = Math.max(0, start - contextLength);
  const contextEnd = Math.min(text.length, end + contextLength);

  let context = text.slice(contextStart, contextEnd);

  // Add ellipsis markers
  if (contextStart > 0) {
    context = '...' + context;
  }
  if (contextEnd < text.length) {
    context = context + '...';
  }

  return context;
}

/**
 * Matches a single query component against an item.
 *
 * Returns matched field information if match found.
 *
 * @param item - Item to search
 * @param component - Query component to match
 * @param mode - Match mode
 * @returns Matched field info or null if no match
 */
function matchComponent(
  item: RequestLogItem,
  component: QueryComponent,
  mode: MatchMode
): MatchedField | null {
  switch (component.type) {
    case 'tag': {
      // Search in tags array
      const matchedTag = item.tags.find((tag) => matchString(tag, component.value, mode));
      if (matchedTag) {
        return {
          field: 'tags',
          match_text: matchedTag,
        };
      }
      return null;
    }

    case 'item_type': {
      // Match item type
      if (matchString(item.type, component.value, mode)) {
        return {
          field: 'type',
          match_text: item.type,
        };
      }
      return null;
    }

    case 'status': {
      // Match item status
      if (matchString(item.status, component.value, mode)) {
        return {
          field: 'status',
          match_text: item.status,
        };
      }
      return null;
    }

    case 'text': {
      // Search in title first
      if (matchString(item.title, component.value, mode)) {
        const pos = findMatchPosition(item.title, component.value);
        const result: MatchedField = {
          field: 'title',
          match_text: pos ? extractContext(item.title, pos.start, pos.end) : item.title,
        };
        if (pos) {
          result.start = pos.start;
          result.end = pos.end;
        }
        return result;
      }

      // Then search in notes
      if (matchString(item.notes, component.value, mode)) {
        const pos = findMatchPosition(item.notes, component.value);
        const result: MatchedField = {
          field: 'notes',
          match_text: pos ? extractContext(item.notes, pos.start, pos.end) : item.notes,
        };
        if (pos) {
          result.start = pos.start;
          result.end = pos.end;
        }
        return result;
      }

      return null;
    }
  }
}

/**
 * Matches all query components against an item.
 *
 * All components must match (AND logic).
 *
 * @param item - Item to search
 * @param components - Query components
 * @param mode - Match mode
 * @returns Array of matched fields if all components match, null otherwise
 */
function matchItem(
  item: RequestLogItem,
  components: QueryComponent[],
  mode: MatchMode
): MatchedField[] | null {
  if (components.length === 0) {
    return null;
  }

  const matchedFields: MatchedField[] = [];

  // All components must match (AND logic)
  for (const component of components) {
    const match = matchComponent(item, component, mode);
    if (!match) {
      return null; // One component didn't match, fail entire item
    }
    matchedFields.push(match);
  }

  return matchedFields;
}

// ============================================================================
// Search Execution
// ============================================================================

/**
 * Searches a single document for items matching the query.
 *
 * @param doc - Document to search
 * @param docPath - Filesystem path to the document
 * @param components - Parsed query components
 * @param options - Search options
 * @returns Array of search matches
 */
export function searchDocument(
  doc: RequestLogDoc,
  docPath: string,
  components: QueryComponent[],
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS
): SearchMatch[] {
  const matches: SearchMatch[] = [];

  for (const item of doc.items) {
    const matchedFields = matchItem(item, components, options.matchMode);

    if (matchedFields) {
      matches.push({
        item,
        doc_id: doc.doc_id,
        doc_path: docPath,
        matched_fields: matchedFields,
      });

      // Check limit
      if (options.limit > 0 && matches.length >= options.limit) {
        break;
      }
    }
  }

  return matches;
}

/**
 * Searches multiple documents for items matching the query.
 *
 * Combines results from all documents, respecting the overall limit.
 *
 * @param docs - Array of documents with their paths
 * @param query - Raw query string
 * @param options - Search options
 * @returns Array of all search matches
 */
export function searchDocuments(
  docs: Array<{ doc: RequestLogDoc; path: string }>,
  query: string,
  options: SearchOptions = DEFAULT_SEARCH_OPTIONS
): SearchMatch[] {
  const components = parseQuery(query);

  if (components.length === 0) {
    return [];
  }

  const allMatches: SearchMatch[] = [];

  for (const { doc, path } of docs) {
    // Adjust limit per document based on remaining slots
    const remainingLimit =
      options.limit > 0 ? options.limit - allMatches.length : 0;

    if (options.limit > 0 && remainingLimit <= 0) {
      break;
    }

    const docOptions: SearchOptions = {
      ...options,
      limit: remainingLimit,
    };

    const docMatches = searchDocument(doc, path, components, docOptions);
    allMatches.push(...docMatches);
  }

  return allMatches;
}

/**
 * Validates and normalizes match mode string.
 *
 * @param mode - Raw match mode string
 * @returns Valid MatchMode or default
 */
export function parseMatchMode(mode: string | undefined): MatchMode {
  if (!mode) {
    return 'contains';
  }

  const normalized = mode.toLowerCase();
  if (normalized === 'full' || normalized === 'starts' || normalized === 'contains') {
    return normalized;
  }

  return 'contains';
}
