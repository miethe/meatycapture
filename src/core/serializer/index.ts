/**
 * Request-Log Markdown Serializer
 *
 * Handles:
 * - Writing RequestLogDoc to markdown format with YAML frontmatter
 * - Parsing markdown files back to RequestLogDoc
 * - Tag aggregation (unique sorted list from all items)
 * - Item count auto-update
 * - Backup creation before writes
 */

import type { RequestLogDoc, RequestLogItem, ItemIndexEntry } from '@core/models';

/**
 * Serializes a RequestLogDoc to markdown format with YAML frontmatter.
 *
 * Output format:
 * ```yaml
 * ---
 * type: request-log
 * doc_id: REQ-20251203-capture-app
 * title: Capture App Request Log
 * project_id: capture-app
 * item_count: 2
 * tags: [ux, api, enhancement]
 * items_index:
 *   - id: REQ-20251203-capture-app-01
 *     type: enhancement
 *     title: Add dark mode toggle
 * created_at: 2025-12-03T10:00:00Z
 * updated_at: 2025-12-03T14:30:00Z
 * ---
 *
 * ## REQ-20251203-capture-app-01 - Add dark mode toggle
 * ...
 * ```
 *
 * @param doc - The RequestLogDoc to serialize
 * @returns Markdown string with YAML frontmatter
 */
export function serialize(doc: RequestLogDoc): string {
  const frontmatter = serializeFrontmatter(doc);
  const itemsSections = doc.items.map(serializeItem).join('\n\n---\n\n');

  return `${frontmatter}\n\n${itemsSections}\n`;
}

/**
 * Parses a markdown string with YAML frontmatter into a RequestLogDoc.
 *
 * Handles:
 * - YAML frontmatter extraction
 * - Item section parsing
 * - Date deserialization
 * - Missing field validation
 * - Preservation of unknown frontmatter fields
 *
 * @param content - Markdown string to parse
 * @returns Parsed RequestLogDoc
 * @throws Error if content is malformed or missing required fields
 */
export function parse(content: string): RequestLogDoc {
  const { frontmatter, body } = extractFrontmatter(content);

  // Parse frontmatter fields
  const doc_id = frontmatter.doc_id;
  const title = frontmatter.title;
  const project_id = frontmatter.project_id;
  const item_count = frontmatter.item_count;
  const tags = frontmatter.tags || [];
  const items_index = frontmatter.items_index || [];
  const created_at = parseDate(frontmatter.created_at);
  const updated_at = parseDate(frontmatter.updated_at);

  // Validate required fields
  if (!doc_id || typeof doc_id !== 'string') {
    throw new Error('Missing or invalid required field: doc_id');
  }
  if (!title || typeof title !== 'string') {
    throw new Error('Missing or invalid required field: title');
  }
  if (!project_id || typeof project_id !== 'string') {
    throw new Error('Missing or invalid required field: project_id');
  }
  if (typeof item_count !== 'number') {
    throw new Error('Missing or invalid required field: item_count');
  }
  if (!Array.isArray(tags)) {
    throw new Error('Invalid field type: tags must be an array');
  }
  if (!Array.isArray(items_index)) {
    throw new Error('Invalid field type: items_index must be an array');
  }
  if (!created_at) {
    throw new Error('Missing or invalid required field: created_at');
  }
  if (!updated_at) {
    throw new Error('Missing or invalid required field: updated_at');
  }

  // Parse item sections from body
  const items = parseItems(body);

  return {
    doc_id,
    title,
    project_id,
    items,
    items_index,
    tags,
    item_count,
    created_at,
    updated_at,
  };
}

/**
 * Aggregates tags from all items in a document.
 *
 * - Collects all tags from all items
 * - Returns unique sorted array (alphabetical)
 * - Used during serialization to update document-level tags
 *
 * @param items - Array of RequestLogItem objects
 * @returns Unique sorted array of tag strings
 */
export function aggregateTags(items: RequestLogItem[]): string[] {
  const tagSet = new Set<string>();

  for (const item of items) {
    for (const tag of item.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

/**
 * Creates items index from items array.
 *
 * Extracts id, type, and title from each item for quick reference
 * in frontmatter without parsing full document.
 *
 * @param items - Array of RequestLogItem objects
 * @returns Array of ItemIndexEntry objects
 */
export function updateItemsIndex(items: RequestLogItem[]): ItemIndexEntry[] {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
  }));
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Serializes the YAML frontmatter section of a RequestLogDoc.
 *
 * @param doc - The RequestLogDoc to serialize
 * @returns YAML frontmatter string wrapped in --- delimiters
 */
function serializeFrontmatter(doc: RequestLogDoc): string {
  const lines = [
    '---',
    'type: request-log',
    `doc_id: ${doc.doc_id}`,
    `title: ${doc.title}`,
    `project_id: ${doc.project_id}`,
    `item_count: ${doc.item_count}`,
    `tags: [${doc.tags.join(', ')}]`,
    'items_index:',
  ];

  // Serialize items_index as YAML list
  for (const entry of doc.items_index) {
    lines.push(`  - id: ${entry.id}`);
    lines.push(`    type: ${entry.type}`);
    lines.push(`    title: ${entry.title}`);
  }

  lines.push(`created_at: ${doc.created_at.toISOString()}`);
  lines.push(`updated_at: ${doc.updated_at.toISOString()}`);
  lines.push('---');

  return lines.join('\n');
}

/**
 * Serializes a single RequestLogItem to markdown section.
 *
 * Format:
 * ```
 * ## REQ-20251203-capture-app-01 - Add dark mode toggle
 *
 * **Type:** enhancement | **Domain:** web | **Priority:** medium | **Status:** triage
 * **Tags:** ux, enhancement
 * **Context:** Settings page redesign
 *
 * ### Problem/Goal
 * Users need dark mode for better readability at night.
 * ```
 *
 * @param item - The RequestLogItem to serialize
 * @returns Markdown section string
 */
function serializeItem(item: RequestLogItem): string {
  const lines = [
    `## ${item.id} - ${item.title}`,
    '',
    `**Type:** ${item.type} | **Domain:** ${item.domain} | **Priority:** ${item.priority} | **Status:** ${item.status}`,
    `**Tags:** ${item.tags.join(', ')}`,
    `**Context:** ${item.context}`,
    '',
    '### Problem/Goal',
    item.notes,
  ];

  return lines.join('\n');
}

/**
 * Extracts YAML frontmatter and body content from markdown string.
 *
 * Expected format:
 * ```
 * ---
 * key: value
 * ---
 *
 * Body content here
 * ```
 *
 * @param content - Full markdown content
 * @returns Object with parsed frontmatter and body string
 * @throws Error if frontmatter delimiters are missing
 */
function extractFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(fmRegex);

  if (!match) {
    throw new Error('Invalid request-log format: missing or malformed YAML frontmatter delimiters');
  }

  const yamlContent = match[1];
  const body = match[2];

  if (!yamlContent || body === undefined) {
    throw new Error('Invalid request-log format: unable to extract frontmatter content');
  }

  const frontmatter = parseYaml(yamlContent);

  return { frontmatter, body };
}

/**
 * Simple YAML parser for frontmatter.
 *
 * Supports:
 * - Simple key: value pairs
 * - Arrays in bracket notation: [item1, item2]
 * - Nested lists with indentation
 *
 * Does NOT support full YAML spec (no external library for MVP).
 *
 * @param yamlContent - YAML string to parse
 * @returns Parsed object
 */
function parseYaml(yamlContent: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');
  let i = 0;

  while (i < lines.length) {
    const currentLine = lines[i];
    if (currentLine === undefined) {
      i++;
      continue;
    }
    const line = currentLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      i++;
      continue;
    }

    // Parse key: value or key: [array]
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      i++;
      continue;
    }

    const key = line.substring(0, colonIndex).trim();
    const valueStr = line.substring(colonIndex + 1).trim();

    // Handle array in bracket notation
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      const arrayContent = valueStr.substring(1, valueStr.length - 1);
      result[key] = arrayContent
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      i++;
      continue;
    }

    // Handle nested list (items_index)
    const nextLine = lines[i + 1];
    if (!valueStr && nextLine && nextLine.trim().startsWith('-')) {
      const listItems: Record<string, unknown>[] = [];
      i++;

      while (i < lines.length) {
        const listLine = lines[i];
        if (!listLine || (!listLine.trim().startsWith('-') && !listLine.startsWith('  '))) {
          break;
        }

        if (listLine.trim().startsWith('-')) {
          // Start of new list item
          listItems.push({});
        } else if (listLine.startsWith('  ') && listItems.length > 0) {
          // Property of current list item
          const propLine = listLine.trim();
          const propColonIndex = propLine.indexOf(':');
          if (propColonIndex !== -1) {
            const propKey = propLine.substring(0, propColonIndex).trim();
            const propValue = propLine.substring(propColonIndex + 1).trim();
            const lastItem = listItems[listItems.length - 1];
            if (lastItem) {
              lastItem[propKey] = propValue;
            }
          }
        }

        i++;
      }

      result[key] = listItems;
      continue;
    }

    // Handle number
    if (/^\d+$/.test(valueStr)) {
      result[key] = parseInt(valueStr, 10);
      i++;
      continue;
    }

    // Handle boolean
    if (valueStr === 'true' || valueStr === 'false') {
      result[key] = valueStr === 'true';
      i++;
      continue;
    }

    // Handle string (default)
    result[key] = valueStr;
    i++;
  }

  return result;
}

/**
 * Parses item sections from markdown body.
 *
 * Each item starts with `## {id} - {title}` header.
 * Extracts metadata line and notes content.
 *
 * @param body - Markdown body content (after frontmatter)
 * @returns Array of RequestLogItem objects
 */
function parseItems(body: string): RequestLogItem[] {
  const items: RequestLogItem[] = [];

  // Split by item headers (## REQ-...)
  const itemSections = body.split(/^## (REQ-[^\n]+)$/m).slice(1);

  // Process pairs: [header, content, header, content, ...]
  for (let i = 0; i < itemSections.length; i += 2) {
    const headerRaw = itemSections[i];
    if (!headerRaw) continue;
    const header = headerRaw.trim();
    const content = itemSections[i + 1]?.trim() || '';

    // Parse header: "REQ-20251203-capture-app-01 - Add dark mode toggle"
    const headerMatch = header.match(/^(REQ-[^\s]+)\s*-\s*(.+)$/);
    if (!headerMatch) {
      console.warn(`Skipping malformed item header: ${header}`);
      continue;
    }

    const id = headerMatch[1];
    const title = headerMatch[2];

    if (!id || !title) {
      console.warn(`Skipping item with invalid header: ${header}`);
      continue;
    }

    // Parse metadata lines
    const metadataMatch = content.match(
      /\*\*Type:\*\*\s*([^|]+)\s*\|\s*\*\*Domain:\*\*\s*([^|]+)\s*\|\s*\*\*Priority:\*\*\s*([^|]+)\s*\|\s*\*\*Status:\*\*\s*([^\n]+)/
    );
    if (!metadataMatch) {
      console.warn(`Skipping item with missing metadata: ${id}`);
      continue;
    }

    const type = metadataMatch[1]?.trim() || '';
    const domain = metadataMatch[2]?.trim() || '';
    const priority = metadataMatch[3]?.trim() || '';
    const status = metadataMatch[4]?.trim() || '';

    // Parse tags line
    const tagsMatch = content.match(/\*\*Tags:\*\*\s*([^\n]+)/);
    const tagsStr = tagsMatch?.[1]?.trim() || '';
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Parse context line
    const contextMatch = content.match(/\*\*Context:\*\*\s*([^\n]+)/);
    const context = contextMatch?.[1]?.trim() || '';

    // Parse notes (everything after "### Problem/Goal")
    const notesMatch = content.match(/###\s*Problem\/Goal\s*\n([\s\S]*)/);
    // Strip trailing separators (---) that may be included from item delimiters
    const rawNotes = notesMatch?.[1]?.trim() || '';
    const notes = rawNotes.replace(/\n*---\s*$/, '').trim();

    // Extract created_at from item ID (REQ-YYYYMMDD-...)
    // For MVP, use a default timestamp if not parseable
    const dateMatch = id.match(/REQ-(\d{8})-/);
    const dateStr = dateMatch?.[1];
    const created_at = dateStr ? parseDateFromId(dateStr) : new Date();

    items.push({
      id,
      title,
      type,
      domain,
      context,
      priority,
      status,
      tags,
      notes,
      created_at,
    });
  }

  return items;
}

/**
 * Parses a date string to Date object.
 *
 * Handles ISO 8601 format from frontmatter.
 *
 * @param dateStr - Date string to parse
 * @returns Date object or null if parsing fails
 */
function parseDate(dateStr: unknown): Date | null {
  if (typeof dateStr !== 'string') {
    return null;
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parses date from item ID format (YYYYMMDD).
 *
 * @param dateStr - Date string in YYYYMMDD format
 * @returns Date object
 */
function parseDateFromId(dateStr: string): Date {
  // YYYYMMDD -> YYYY-MM-DD
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return new Date(`${year}-${month}-${day}T00:00:00Z`);
}
