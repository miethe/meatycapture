/**
 * Request-Log Markdown Serializer
 *
 * Handles:
 * - Writing RequestLogDoc to markdown format with YAML frontmatter
 * - Parsing markdown files back to RequestLogDoc
 * - Tag aggregation (unique sorted list from all items)
 * - Item count auto-update
 * - Backup creation before writes
 * - Item-level update operations (notes, metadata)
 */

import type { RequestLogDoc, RequestLogItem, ItemIndexEntry, Note, NoteType } from '@core/models';
import { NOTE_TYPE_LABELS, isNoteType } from '@core/models';

// Re-export item update utilities
export {
  applyItemUpdate,
  applyNoteUpdate,
  findItem,
  getItemNotes,
  ItemNotFoundError,
  type ItemUpdateResult,
  type ItemFieldUpdates,
} from './item-update';

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
  // Default to false for backward compatibility with docs missing archived field
  const archived = parseBoolean(frontmatter.archived, false);

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
    archived,
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
  lines.push(`archived: ${doc.archived}`);
  lines.push('---');

  return lines.join('\n');
}

/**
 * Formats a Date to human-readable timestamp for notes.
 *
 * Output format: YYYY-MM-DD HH:mm
 *
 * @param date - Date to format
 * @returns Formatted timestamp string
 */
function formatTimestamp(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Serializes an array of notes to markdown format.
 *
 * Output format for each note:
 * ```
 * **Note 1: General** (Created: 2026-01-01 10:00)
 *
 * Note content here with **markdown** formatting.
 *
 * ```
 *
 * Notes are sorted by created_at ascending (oldest first).
 * Updated timestamp is only shown if different from created.
 *
 * @param notes - Array of Note objects to serialize
 * @returns Markdown string, or empty string if no notes
 */
function serializeNotes(notes: Note[] | undefined): string {
  if (!notes || notes.length === 0) {
    return '';
  }

  // Sort notes by created_at ascending (oldest first)
  const sortedNotes = [...notes].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

  const lines: string[] = ['', '#### Notes', ''];

  sortedNotes.forEach((note, index) => {
    const noteNum = index + 1;
    const typeLabel = NOTE_TYPE_LABELS[note.type] || note.type;
    const createdStr = formatTimestamp(note.created_at);

    // Include updated only if different from created
    const updatedStr =
      note.updated_at.getTime() !== note.created_at.getTime()
        ? `, Updated: ${formatTimestamp(note.updated_at)}`
        : '';

    lines.push(`**Note ${noteNum}: ${typeLabel}** (Created: ${createdStr}${updatedStr})`);
    lines.push('');
    lines.push(note.content);
    lines.push('');
  });

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
 * **Subdomain:** auth, database
 * **Context:** This bug occurs when users try to login with expired sessions
 * **Tags:** ux, enhancement
 * **Modified:** 2025-12-03T14:30:00Z
 *
 * #### Notes
 *
 * **Note 1: General** (Created: 2026-01-01 10:00)
 *
 * Users need dark mode for better readability at night.
 *
 * ```
 *
 * Note: **Subdomain:** line is only included when subdomain array is non-empty.
 * Note: **Context:** line is only included when context string is non-empty.
 * Note: **Tags:** line is only included when tags array is non-empty.
 * Note: **Modified:** line is only included when modified_at is present (optional field).
 * Notes section is only included if there are notes attached to the item.
 *
 * @param item - The RequestLogItem to serialize
 * @returns Markdown section string
 */
function serializeItem(item: RequestLogItem): string {
  const lines = [
    `## ${item.id} - ${item.title}`,
    '',
    `**Type:** ${item.type} | **Domain:** ${item.domain.join(', ')} | **Priority:** ${item.priority} | **Status:** ${item.status}`,
  ];

  // Include subdomain if non-empty array
  if (item.subdomain.length > 0) {
    lines.push(`**Subdomain:** ${item.subdomain.join(', ')}`);
  }

  // Include context if non-empty string
  if (item.context && item.context.trim().length > 0) {
    lines.push(`**Context:** ${item.context}`);
  }

  // Include feature if non-empty array (optional for backward compatibility)
  if (item.feature && item.feature.length > 0) {
    lines.push(`**Feature:** ${item.feature.join(', ')}`);
  }

  // Include tags if non-empty array
  if (item.tags.length > 0) {
    lines.push(`**Tags:** ${item.tags.join(', ')}`);
  }

  // Include modified_at if present (optional field for backward compatibility)
  if (item.modified_at) {
    lines.push(`**Modified:** ${item.modified_at.toISOString()}`);
  }

  // Serialize notes section (only if notes exist)
  const notesSection = serializeNotes(item.notes);
  if (notesSection) {
    lines.push(notesSection);
  }

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
          // Extract content after the hyphen
          const restOfLine = listLine.trim().substring(1).trim(); // Remove leading "-"

          if (restOfLine) {
            const propColonIndex = restOfLine.indexOf(':');
            if (propColonIndex !== -1) {
              // This is a key: value pair - start a new object and add the property
              // e.g., "- id: value" for items_index entries
              listItems.push({});
              const propKey = restOfLine.substring(0, propColonIndex).trim();
              const propValue = restOfLine.substring(propColonIndex + 1).trim();
              const lastItem = listItems[listItems.length - 1];
              if (lastItem) {
                lastItem[propKey] = propValue;
              }
            } else {
              // Simple string value without colon - push as string directly
              // e.g., "- tag1" for tags in hyphenated list format
              (listItems as unknown[]).push(restOfLine);
            }
          } else {
            // Empty list item line (just "-"), push empty object for subsequent properties
            listItems.push({});
          }
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
    const domainStr = metadataMatch[2]?.trim() || '';
    const domain = domainStr
      ? domainStr
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d.length > 0)
      : [];
    const priority = metadataMatch[3]?.trim() || '';
    const status = metadataMatch[4]?.trim() || '';

    // Parse tags line
    const tagsMatch = content.match(/\*\*Tags:\*\*\s*([^\n]+)/);
    const tagsStr = tagsMatch?.[1]?.trim() || '';
    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Parse modified_at line (optional - may not exist in older docs)
    const modifiedMatch = content.match(/\*\*Modified:\*\*\s*([^\n]+)/);
    const modifiedStr = modifiedMatch?.[1]?.trim();

    // Parse subdomain line (array of comma-separated values)
    const subdomainMatch = content.match(/\*\*Subdomain:\*\*\s*([^\n]+)/);
    const subdomainStr = subdomainMatch?.[1]?.trim() || '';
    const subdomain = subdomainStr
      ? subdomainStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

    // Parse context line (free-form text string, optional)
    const contextMatch = content.match(/\*\*Context:\*\*\s*([^\n]+)/);
    const contextStr = contextMatch?.[1]?.trim();
    // context is optional string - only set if non-empty
    const context = contextStr && contextStr.length > 0 ? contextStr : undefined;

    // Parse feature line (array of comma-separated values, optional for backward compatibility)
    const featureMatch = content.match(/\*\*Feature:\*\*\s*([^\n]+)/);
    const featureStr = featureMatch?.[1]?.trim() || '';
    const feature = featureStr
      ? featureStr
          .split(',')
          .map((f) => f.trim())
          .filter((f) => f.length > 0)
      : [];

    // Extract created_at from item ID (REQ-YYYYMMDD-...)
    // For MVP, use a default timestamp if not parseable
    const dateMatch = id.match(/REQ-(\d{8})-/);
    const dateStr = dateMatch?.[1];
    const created_at = dateStr ? parseDateFromId(dateStr) : new Date();

    // Parse modified_at, defaulting to created_at for backward compatibility
    const modified_at = modifiedStr ? (parseDate(modifiedStr) ?? created_at) : created_at;

    // Parse structured notes from #### Notes section
    // Returns empty array if no notes section exists (backward compatibility)
    const parsedNotes = parseNotes(content, id);

    // Build item object - only include optional fields if present (exactOptionalPropertyTypes)
    const item: RequestLogItem = {
      id,
      title,
      type,
      domain,
      subdomain,
      priority,
      status,
      tags,
      created_at,
      modified_at,
    };

    // Add context only if present (avoids undefined assignment with exactOptionalPropertyTypes)
    if (context !== undefined) {
      item.context = context;
    }

    // Add feature only if present (avoids undefined assignment with exactOptionalPropertyTypes)
    if (feature.length > 0) {
      item.feature = feature;
    }

    // Add notes only if present (avoids undefined assignment with exactOptionalPropertyTypes)
    if (parsedNotes.length > 0) {
      item.notes = parsedNotes;
    }

    items.push(item);
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

/**
 * Parses a boolean value from frontmatter.
 *
 * Handles:
 * - true/false (boolean)
 * - "true"/"false" (string)
 * - undefined/null (returns defaultValue)
 *
 * @param value - Value to parse
 * @param defaultValue - Default if value is undefined/null
 * @returns Parsed boolean
 */
function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
}

/**
 * Maps a display label back to NoteType.
 *
 * Used during parsing to convert human-readable labels (e.g., "Bug Fix Attempt")
 * back to NoteType values.
 *
 * @param label - The display label from markdown
 * @returns The corresponding NoteType or null if not found
 */
function mapLabelToNoteType(label: string): NoteType | null {
  const trimmedLabel = label.trim();
  const entry = Object.entries(NOTE_TYPE_LABELS).find(
    ([_, displayLabel]) => displayLabel === trimmedLabel
  );
  if (entry && isNoteType(entry[0])) {
    return entry[0] as NoteType;
  }
  return null;
}

/**
 * Parses a timestamp string from note metadata.
 *
 * Handles format: "YYYY-MM-DD HH:mm"
 *
 * @param str - Timestamp string to parse
 * @returns Date object or null if parsing fails
 */
function parseNoteTimestamp(str: string): Date | null {
  const trimmed = str.trim();
  // Expected format: "YYYY-MM-DD HH:mm"
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (!match) {
    return null;
  }
  const [, datePart, timePart] = match;
  if (!datePart || !timePart) {
    return null;
  }
  const date = new Date(`${datePart}T${timePart}:00Z`);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extracts the item number from an item ID.
 *
 * @param itemId - Item ID (e.g., "REQ-20260101-meatycapture-01")
 * @returns The zero-padded item number (e.g., "01") or null if not found
 */
function extractItemNumber(itemId: string): string | null {
  const match = itemId.match(/-(\d+)$/);
  return match?.[1] ?? null;
}

/**
 * Formats a date as YYYYMMDD for ID generation.
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDateForId(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Extracts the project slug from an item ID.
 *
 * @param itemId - Item ID (e.g., "REQ-20260101-meatycapture-01")
 * @returns The project slug (e.g., "meatycapture") or null if not found
 */
function extractProjectSlug(itemId: string): string | null {
  // Pattern: REQ-YYYYMMDD-<project-slug>-NN
  const match = itemId.match(/^REQ-\d{8}-(.+)-\d+$/);
  return match?.[1] ?? null;
}

/**
 * Parses structured notes from item markdown content.
 *
 * Looks for "#### Notes" section and extracts individual note blocks.
 * Each note is expected in format:
 * **Note N: Type** (Created: YYYY-MM-DD HH:mm, Updated: YYYY-MM-DD HH:mm)
 *
 * Note content with markdown.
 *
 * @param content - The item content after metadata lines
 * @param itemId - Item ID for generating note IDs if missing
 * @returns Array of parsed Note objects
 */
function parseNotes(content: string, itemId: string): Note[] {
  // Find "#### Notes" section - content goes until end of item or next major section
  const notesMatch = content.match(/####\s*Notes\s*\n([\s\S]*?)(?=\n---\s*$|$)/);
  if (!notesMatch || !notesMatch[1]) {
    return [];
  }

  const notesContent = notesMatch[1];
  const notes: Note[] = [];
  const projectSlug = extractProjectSlug(itemId) || 'unknown';
  const itemNumber = extractItemNumber(itemId) || '00';

  // Parse each note block
  // Pattern: **Note N: Type** (Created: YYYY-MM-DD HH:mm) or with Updated
  // Content follows until next note or end
  const notePattern =
    /\*\*Note\s+(\d+):\s*([^*]+)\*\*\s*\(Created:\s*([^,)]+)(?:,\s*Updated:\s*([^)]+))?\)\s*\n\n?([\s\S]*?)(?=\n\*\*Note\s+\d+:|$)/g;

  let match;
  while ((match = notePattern.exec(notesContent)) !== null) {
    const [, numStr, typeLabel, createdStr, updatedStr, noteContent] = match;

    if (!numStr || !typeLabel || !createdStr) {
      console.warn(`Skipping malformed note in item ${itemId}: missing required fields`);
      continue;
    }

    // Map label back to NoteType
    const type = mapLabelToNoteType(typeLabel);
    if (!type) {
      console.warn(`Skipping note in item ${itemId}: unknown type "${typeLabel}"`);
      continue;
    }

    const created_at = parseNoteTimestamp(createdStr);
    if (!created_at) {
      console.warn(`Skipping note in item ${itemId}: invalid created timestamp "${createdStr}"`);
      continue;
    }

    const updated_at = updatedStr ? parseNoteTimestamp(updatedStr) : created_at;
    if (!updated_at) {
      console.warn(`Note in item ${itemId} has invalid updated timestamp, using created_at`);
    }

    // Generate note ID from item ID + note number
    const noteNum = numStr.padStart(2, '0');
    const id = `NOTE-${formatDateForId(created_at)}-${projectSlug}-${itemNumber}-${noteNum}`;

    // Handle empty or undefined note content
    const content = noteContent?.trim() ?? '';

    notes.push({
      id,
      type,
      content,
      created_at,
      updated_at: updated_at || created_at,
    });
  }

  return notes;
}
