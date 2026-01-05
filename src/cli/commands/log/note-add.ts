/**
 * Log Note Add Command
 *
 * Adds a new note to an existing request-log item.
 * Updates the item's modified_at timestamp and writes the document back.
 *
 * Features:
 * - Project-aware path resolution (REQ-YYYYMMDD-slug patterns)
 * - Multiple output formats (human, json, yaml)
 * - Optional backup skip with --no-backup
 * - Standardized exit codes for scripting
 *
 * Exit Codes:
 * - 0: Success
 * - 1: Validation error (missing content, invalid note type)
 * - 2: File not found or I/O error
 * - 4: Item not found in document
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path, { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { Note, NoteType, RequestLogDoc, RequestLogItem } from '@core/models';
import { NOTE_TYPES, isNoteType, NOTE_TYPE_OPTIONS } from '@core/models';
import { createAdapters } from '@adapters/factory';
import { serialize, parse } from '@core/serializer';
import type { OutputFormat } from '@cli/formatters';
import {
  withErrorHandling,
  ValidationError,
  FileNotFoundError,
  ParseError,
  ResourceNotFoundError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

/**
 * Command options for note add command.
 */
interface NoteAddOptions {
  /** Note content (required) */
  content: string;
  /** Note type (defaults to 'General') */
  type?: string;
  /** Output as JSON */
  json?: boolean;
  /** Output as YAML */
  yaml?: boolean;
  /** Suppress output */
  quiet?: boolean;
  /** Skip backup creation */
  noBackup?: boolean;
}

/**
 * Generates a unique note ID.
 *
 * Format: NOTE-{timestamp}-{random4chars}
 * Example: NOTE-1704067200000-a1b2
 *
 * Uses timestamp (milliseconds) + 4 random alphanumeric chars
 * for collision resistance.
 */
function generateNoteId(): string {
  const timestamp = Date.now();
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `NOTE-${timestamp}-${random}`;
}

/**
 * Gets the default document path for a project.
 *
 * Resolution order:
 * 1. Project's configured default_path
 * 2. MEATYCAPTURE_DEFAULT_PROJECT_PATH environment variable
 * 3. ~/.meatycapture/docs/<project-id>/
 */
async function getProjectDocPath(projectSlug: string): Promise<string> {
  const { projectStore } = await createAdapters();
  const project = await projectStore.get(projectSlug);

  if (project) {
    return project.default_path;
  }

  const envPath = process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
  if (envPath) {
    return join(envPath, projectSlug);
  }

  return join(homedir(), '.meatycapture', 'docs', projectSlug);
}

/**
 * Resolves a document path, handling both absolute paths and REQ pattern filenames.
 *
 * - Absolute paths are used directly
 * - REQ-YYYYMMDD-<slug> patterns extract the project slug for proper resolution
 * - Other relative paths resolve against CWD
 */
async function resolveDocPath(docPath: string): Promise<string> {
  if (path.isAbsolute(docPath)) {
    return docPath;
  }

  // Extract project slug from filename if it matches REQ pattern
  // Pattern: REQ-YYYYMMDD-<slug>.md or REQ-YYYYMMDD-<slug>-NN.md
  const match = docPath.match(/^REQ-\d{8}-([^-]+?)(?:-\d+)?\.md$/);
  if (match && match[1]) {
    const projectSlug = match[1];
    const projectPath = await getProjectDocPath(projectSlug);
    return join(projectPath, docPath);
  }

  return resolve(docPath);
}

/**
 * Finds an item by ID within a document.
 *
 * @param doc - The document to search
 * @param itemId - The item ID to find
 * @returns The item if found, undefined otherwise
 */
function findItemById(doc: RequestLogDoc, itemId: string): RequestLogItem | undefined {
  return doc.items.find((item) => item.id === itemId);
}

/**
 * Validates and normalizes the note type option.
 *
 * @param typeOption - The --type option value (may be undefined)
 * @returns Valid NoteType
 * @throws ValidationError if type is invalid
 */
function validateNoteType(typeOption: string | undefined): NoteType {
  if (!typeOption) {
    return NOTE_TYPES.General;
  }

  // Try exact match first
  if (isNoteType(typeOption)) {
    return typeOption;
  }

  // Try case-insensitive match against NOTE_TYPES keys
  const normalizedInput = typeOption.toLowerCase().replace(/\s+/g, '');
  for (const [key, value] of Object.entries(NOTE_TYPES)) {
    if (key.toLowerCase() === normalizedInput || value.toLowerCase().replace(/\s+/g, '') === normalizedInput) {
      return value as NoteType;
    }
  }

  throw new ValidationError(
    `Invalid note type: "${typeOption}"`,
    `Valid types: ${NOTE_TYPE_OPTIONS.join(', ')}`
  );
}

/**
 * Determines output format from command options.
 */
function getOutputFormat(options: NoteAddOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Serializes a Note to JSON with proper date formatting.
 */
function noteToJson(note: Note): string {
  return JSON.stringify(
    {
      id: note.id,
      type: note.type,
      content: note.content,
      created_at: note.created_at.toISOString(),
      updated_at: note.updated_at.toISOString(),
    },
    null,
    2
  );
}

/**
 * Serializes a Note to YAML format.
 */
function noteToYaml(note: Note): string {
  const lines = [
    `id: "${note.id}"`,
    `type: "${note.type}"`,
    `content: "${note.content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
    `created_at: "${note.created_at.toISOString()}"`,
    `updated_at: "${note.updated_at.toISOString()}"`,
  ];
  return lines.join('\n');
}

/**
 * Formats note output based on the selected format.
 */
function formatNoteOutput(note: Note, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return noteToJson(note);
    case 'yaml':
      return noteToYaml(note);
    case 'human':
    default:
      return formatHumanOutput(note);
  }
}

/**
 * Formats human-readable output for the created note.
 */
function formatHumanOutput(note: Note): string {
  const lines = [
    `Created note: ${note.id}`,
    `  Type: ${note.type}`,
    `  Content: ${note.content.length > 50 ? note.content.substring(0, 47) + '...' : note.content}`,
    `  Created: ${note.created_at.toISOString()}`,
  ];
  return lines.join('\n');
}

/**
 * Adds a note to an item without creating a backup.
 *
 * Reads the document, finds the item, adds the note, and writes back.
 * Used when --no-backup is specified.
 */
async function addNoteWithoutBackup(
  docPath: string,
  itemId: string,
  note: Note
): Promise<{ doc: RequestLogDoc; item: RequestLogItem }> {
  // Read existing document
  let content: string;
  try {
    content = await fs.readFile(docPath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new FileNotFoundError(docPath);
    }
    throw error;
  }

  // Parse document
  let doc: RequestLogDoc;
  try {
    doc = parse(content);
  } catch (error) {
    throw new ParseError(
      docPath,
      error instanceof Error ? error.message : 'Unknown parse error',
      'Check the document format and fix any syntax errors in the frontmatter'
    );
  }

  // Find the item
  const item = findItemById(doc, itemId);
  if (!item) {
    throw new ResourceNotFoundError(
      'document',
      itemId,
      `Item '${itemId}' not found in document. Run 'meatycapture log view ${docPath}' to see available items.`
    );
  }

  // Initialize notes array if undefined (backward compatibility)
  if (!item.notes) {
    item.notes = [];
  }

  // Add the note
  item.notes.push(note);

  // Update item's modified_at
  item.modified_at = note.created_at;

  // Update document's updated_at
  doc.updated_at = note.created_at;

  // Write back without backup
  const serialized = serialize(doc);
  await fs.writeFile(docPath, serialized, 'utf-8');

  return { doc, item };
}

/**
 * Adds a note to an item with backup creation.
 *
 * Uses the standard docStore pattern which creates backups before modification.
 */
async function addNoteWithBackup(
  docPath: string,
  itemId: string,
  note: Note
): Promise<{ doc: RequestLogDoc; item: RequestLogItem }> {
  const { docStore } = await createAdapters();

  // Read document through docStore
  let doc: RequestLogDoc;
  try {
    doc = await docStore.read(docPath);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        throw new FileNotFoundError(docPath);
      }
      if (
        error.message.includes('Invalid') ||
        error.message.includes('Missing') ||
        error.message.includes('malformed')
      ) {
        throw new ParseError(docPath, error.message);
      }
    }
    throw error;
  }

  // Find the item
  const item = findItemById(doc, itemId);
  if (!item) {
    throw new ResourceNotFoundError(
      'document',
      itemId,
      `Item '${itemId}' not found in document. Run 'meatycapture log view ${docPath}' to see available items.`
    );
  }

  // Initialize notes array if undefined (backward compatibility)
  if (!item.notes) {
    item.notes = [];
  }

  // Add the note
  item.notes.push(note);

  // Update item's modified_at
  item.modified_at = note.created_at;

  // Update document's updated_at
  doc.updated_at = note.created_at;

  // Write back through docStore (which handles backup)
  await docStore.write(docPath, doc);

  return { doc, item };
}

/**
 * Main action handler for the note add command.
 *
 * Steps:
 * 1. Validate content option (required)
 * 2. Resolve document path (project-aware)
 * 3. Read document
 * 4. Find item by ID
 * 5. Generate note ID and create Note object
 * 6. Add note to item and update timestamps
 * 7. Write document back
 * 8. Output the created note
 */
export async function noteAddAction(
  docPath: string,
  itemId: string,
  options: NoteAddOptions
): Promise<void> {
  // Validate required content option
  if (!options.content || typeof options.content !== 'string' || options.content.trim() === '') {
    throw new ValidationError(
      'Note content is required',
      'Use --content "Your note text..." to specify the note content'
    );
  }

  // Validate note type
  const noteType = validateNoteType(options.type);

  // Resolve the document path
  const resolvedPath = await resolveDocPath(docPath);

  // Create the note object
  const now = new Date();
  const note: Note = {
    id: generateNoteId(),
    type: noteType,
    content: options.content.trim(),
    created_at: now,
    updated_at: now,
  };

  // Add note with or without backup
  if (options.noBackup) {
    await addNoteWithoutBackup(resolvedPath, itemId, note);
  } else {
    await addNoteWithBackup(resolvedPath, itemId, note);
  }

  // Output result
  if (!options.quiet) {
    const format = getOutputFormat(options);
    const output = formatNoteOutput(note, format);
    console.log(output);
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Wrapped action handler with standardized error handling.
 */
const wrappedNoteAddAction = withErrorHandling(noteAddAction);

/**
 * Registers the note add command with a Commander program/command.
 */
export function registerNoteAddCommand(program: Command): void {
  program
    .command('note')
    .command('add')
    .description('Add a note to an existing request-log item')
    .argument('<doc-path>', 'Path to the request-log document')
    .argument('<item-id>', 'ID of the item to add the note to')
    .requiredOption('-c, --content <text>', 'Note content (required)')
    .option('-t, --type <type>', 'Note type (General, Bug Fix Attempt, Validation, Other)', 'General')
    .option('--json', 'Output created note as JSON')
    .option('--yaml', 'Output created note as YAML')
    .option('-q, --quiet', 'Suppress output')
    .option('--no-backup', 'Skip backup creation before modification')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture log note add ./docs/REQ-20251203-app.md REQ-20251203-app-01 -c "Fixed the auth issue"
  meatycapture log note add doc.md REQ-20251203-app-01 -c "Testing..." -t "Bug Fix Attempt"
  meatycapture log note add doc.md REQ-20251203-app-01 -c "Validated OK" --type Validation --json

Note Types:
  General          Default type for general observations
  Bug Fix Attempt  Tracking debugging and fix attempts
  Validation       Test/validation results
  Other            Miscellaneous notes

Exit Codes:
  0  Success
  1  Validation error (missing content, invalid type)
  2  File not found or I/O error
  4  Item not found in document
`
    )
    .action(wrappedNoteAddAction);
}
