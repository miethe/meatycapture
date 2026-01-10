/**
 * Log Item Update Command
 *
 * Updates fields on an existing item within a request-log document.
 * Supports updating status, priority, type, title, domain, context, and tags.
 *
 * Features:
 * - Multiple output formats (human, json, yaml)
 * - Tag manipulation: replace, add, or remove
 * - Project-aware path resolution (same as view.ts)
 * - Optional backup skip with --no-backup
 * - Automatic doc metadata recalculation (tags, items_index)
 *
 * Exit Codes:
 * - 0: Success
 * - 1: Validation error (no update options provided)
 * - 2: File not found or I/O error
 * - 4: Item not found in document
 */

import { Command } from 'commander';
import path, { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { promises as fs } from 'node:fs';
import type { RequestLogDoc, RequestLogItem } from '@core/models';
import { createAdapters } from '@adapters/factory';
import { aggregateTags, updateItemsIndex, serialize, parse } from '@core/serializer';
import {
  formatItemAsJson,
  formatItemAsYaml,
  formatItemAsHuman,
} from '@cli/formatters/index.js';
import type { OutputFormat, FormatOptions } from '@cli/formatters/index.js';
import {
  withErrorHandling,
  ValidationError,
  FileNotFoundError,
  ResourceNotFoundError,
  ParseError,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';
import { updateIndexAfterWrite } from '@cli/indexing/auto-update.js';

/**
 * Command options for item update command.
 */
export interface ItemUpdateOptions {
  /** Update status field */
  status?: string;
  /** Update priority field */
  priority?: string;
  /** Update type field */
  type?: string;
  /** Update title field */
  title?: string;
  /** Replace all tags (comma-separated) */
  tags?: string;
  /** Add to existing tags (comma-separated) */
  addTags?: string;
  /** Remove from existing tags (comma-separated) */
  removeTags?: string;
  /** Update domains (comma-separated) */
  domain?: string;
  /** Update subdomains (comma-separated) */
  subdomain?: string;
  /** Update context (free-form text) */
  context?: string;
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
 * Resolves the document path intelligently.
 *
 * - Absolute paths are used directly
 * - REQ-YYYYMMDD-<slug> patterns extract the project slug for proper resolution
 * - Other relative paths resolve against CWD (fallback)
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
 * Determines output format from command options.
 * Default is 'human' if no format flag specified.
 */
function getOutputFormat(options: ItemUpdateOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

/**
 * Creates format options from command options.
 */
function createFormatOptions(options: ItemUpdateOptions): FormatOptions {
  return {
    format: getOutputFormat(options),
    quiet: options.quiet ?? false,
    color: process.stdout.isTTY ?? false,
  };
}

/**
 * Parses comma-separated string into array of trimmed, non-empty strings.
 */
function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Checks if any update option is provided.
 */
function hasUpdateOption(options: ItemUpdateOptions): boolean {
  return !!(
    options.status ||
    options.priority ||
    options.type ||
    options.title ||
    options.tags ||
    options.addTags ||
    options.removeTags ||
    options.domain ||
    options.subdomain ||
    options.context
  );
}

/**
 * Finds an item by ID in the document.
 *
 * @param doc - The document to search
 * @param itemId - The item ID to find
 * @returns The found item or undefined
 */
function findItemById(doc: RequestLogDoc, itemId: string): RequestLogItem | undefined {
  return doc.items.find((item) => item.id === itemId);
}

/**
 * Applies tag updates to an item.
 *
 * Tag update priority:
 * 1. --tags replaces all tags (if specified)
 * 2. --add-tags adds to existing/replaced tags
 * 3. --remove-tags removes from existing/added tags
 *
 * @param currentTags - Current tags on the item
 * @param options - Command options with tag updates
 * @returns Updated tags array
 */
function applyTagUpdates(currentTags: string[], options: ItemUpdateOptions): string[] {
  let tags = [...currentTags];

  // Replace all tags if --tags is specified
  if (options.tags !== undefined) {
    tags = parseCommaSeparated(options.tags);
  }

  // Add tags if --add-tags is specified
  if (options.addTags) {
    const toAdd = parseCommaSeparated(options.addTags);
    const tagsSet = new Set(tags);
    for (const tag of toAdd) {
      tagsSet.add(tag);
    }
    tags = Array.from(tagsSet);
  }

  // Remove tags if --remove-tags is specified
  if (options.removeTags) {
    const toRemove = new Set(parseCommaSeparated(options.removeTags));
    tags = tags.filter((tag) => !toRemove.has(tag));
  }

  return tags.sort();
}

/**
 * Applies all updates to an item.
 *
 * @param item - The item to update (mutated in place)
 * @param options - Command options with field updates
 */
function applyUpdates(item: RequestLogItem, options: ItemUpdateOptions): void {
  // Simple field updates
  if (options.status) {
    item.status = options.status;
  }
  if (options.priority) {
    item.priority = options.priority;
  }
  if (options.type) {
    item.type = options.type;
  }
  if (options.title) {
    item.title = options.title;
  }

  // Array field updates (comma-separated)
  if (options.domain) {
    item.domain = parseCommaSeparated(options.domain);
  }
  if (options.subdomain) {
    item.subdomain = parseCommaSeparated(options.subdomain);
  }
  // Context is now a free-form string field
  // With exactOptionalPropertyTypes, we need to delete the property to unset it
  if (options.context !== undefined) {
    const trimmed = options.context.trim();
    if (trimmed) {
      item.context = trimmed;
    } else {
      delete item.context;
    }
  }

  // Tag updates (replace, add, remove)
  item.tags = applyTagUpdates(item.tags, options);

  // Update modified timestamp
  item.modified_at = new Date();
}

/**
 * Updates an item in a document without creating a backup.
 *
 * @param docPath - Path to the document
 * @param itemId - ID of the item to update
 * @param options - Update options
 * @returns Updated item
 */
async function updateWithoutBackup(
  docPath: string,
  itemId: string,
  options: ItemUpdateOptions
): Promise<RequestLogItem> {
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

  // Find item by ID
  const item = findItemById(doc, itemId);
  if (!item) {
    throw new ResourceNotFoundError(
      'document',
      itemId,
      `Item not found in document. Use 'meatycapture log view ${docPath} --items-only' to list available items`
    );
  }

  // Apply updates to item
  applyUpdates(item, options);

  // Recalculate doc-level metadata
  doc.tags = aggregateTags(doc.items);
  doc.updated_at = new Date();
  doc.items_index = updateItemsIndex(doc.items);

  // Write without backup
  const serialized = serialize(doc);
  await fs.writeFile(docPath, serialized, 'utf-8');

  return item;
}

/**
 * Updates an item in a document with backup creation.
 *
 * @param docPath - Path to the document
 * @param itemId - ID of the item to update
 * @param options - Update options
 * @returns Updated item
 */
async function updateWithBackup(
  docPath: string,
  itemId: string,
  options: ItemUpdateOptions
): Promise<RequestLogItem> {
  const { docStore } = await createAdapters();

  // Read existing document
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

  // Find item by ID
  const item = findItemById(doc, itemId);
  if (!item) {
    throw new ResourceNotFoundError(
      'document',
      itemId,
      `Item not found in document. Use 'meatycapture log view ${docPath} --items-only' to list available items`
    );
  }

  // Apply updates to item
  applyUpdates(item, options);

  // Recalculate doc-level metadata
  doc.tags = aggregateTags(doc.items);
  doc.updated_at = new Date();
  doc.items_index = updateItemsIndex(doc.items);

  // Write with backup (docStore.write creates backups)
  await docStore.write(docPath, doc);

  return item;
}

/**
 * Formats human-readable success output for item update operation.
 * Used when no structured output format is specified.
 */
function formatHumanOutput(itemId: string, item: RequestLogItem): string {
  const lines = [
    `Updated item: ${itemId}`,
    `  Title: ${item.title}`,
    `  Type: ${item.type}`,
    `  Status: ${item.status}`,
    `  Priority: ${item.priority}`,
    `  Domain: ${item.domain.join(', ') || '(none)'}`,
    `  Subdomain: ${item.subdomain.join(', ') || '(none)'}`,
    `  Context: ${item.context || '(none)'}`,
    `  Tags: ${item.tags.join(', ') || '(none)'}`,
  ];
  return lines.join('\n');
}

/**
 * Formats item output based on format option.
 */
function formatItemOutput(item: RequestLogItem, options: ItemUpdateOptions): string {
  const format = getOutputFormat(options);
  const formatOptions = createFormatOptions(options);

  switch (format) {
    case 'json':
      return formatItemAsJson(item);
    case 'yaml':
      return formatItemAsYaml(item);
    case 'human':
    default:
      return formatItemAsHuman(item, formatOptions);
  }
}

/**
 * Updates a specific item within a request-log document.
 *
 * Steps:
 * 1. Validate at least one update option is provided
 * 2. Resolve document path (project-aware)
 * 3. Read and parse document
 * 4. Find item by ID
 * 5. Apply updates to item fields
 * 6. Recalculate doc-level metadata
 * 7. Write document back (with optional backup)
 * 8. Output updated item
 */
export async function itemUpdateAction(
  docPath: string,
  itemId: string,
  options: ItemUpdateOptions
): Promise<void> {
  // Validate at least one update option is provided
  if (!hasUpdateOption(options)) {
    throw new ValidationError(
      'No update options provided',
      'Specify at least one field to update: --status, --priority, --type, --title, --tags, --add-tags, --remove-tags, --domain, --subdomain, --context'
    );
  }

  // Resolve document path
  const resolvedPath = await resolveDocPath(docPath);

  // Update item with or without backup
  const updatedItem = options.noBackup
    ? await updateWithoutBackup(resolvedPath, itemId, options)
    : await updateWithBackup(resolvedPath, itemId, options);
  const { docStore } = await createAdapters();
  const updatedDoc = await docStore.read(resolvedPath);
  await updateIndexAfterWrite(docStore, resolvedPath, updatedDoc);

  // Output result
  if (!options.quiet) {
    const format = getOutputFormat(options);

    if (format === 'human') {
      console.log(formatHumanOutput(itemId, updatedItem));
    } else {
      const output = formatItemOutput(updatedItem, options);
      if (output) {
        console.log(output);
      }
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Wrapped action handler with standardized error handling.
 */
const wrappedItemUpdateAction = withErrorHandling(itemUpdateAction);

/**
 * Creates and configures the item subcommand group.
 *
 * Returns a Commander Command that can be added to the log command.
 * The 'update' subcommand is registered under 'item'.
 */
export function createItemCommand(): Command {
  const item = new Command('item')
    .description('Manage items within request-log documents')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture log item update doc.md REQ-20251203-app-01 --status in-progress
  meatycapture log item update doc.md REQ-20251203-app-01 --priority high --tags "ux,urgent"
`
    );

  // Register the update subcommand
  item
    .command('update')
    .description('Update fields on an existing item within a request-log document')
    .argument('<doc-path>', 'Path to the request-log document')
    .argument('<item-id>', 'ID of the item to update (e.g., REQ-20251203-app-01)')
    .option('--status <status>', 'Update status field')
    .option('--priority <priority>', 'Update priority field')
    .option('--type <type>', 'Update type field')
    .option('--title <title>', 'Update title field')
    .option('--tags <tags>', 'Replace all tags (comma-separated)')
    .option('--add-tags <tags>', 'Add to existing tags (comma-separated)')
    .option('--remove-tags <tags>', 'Remove from existing tags (comma-separated)')
    .option('--domain <domains>', 'Update domains (comma-separated)')
    .option('--subdomain <subdomains>', 'Update subdomains (comma-separated)')
    .option('--context <text>', 'Update context (free-form text)')
    .option('--json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .option('-q, --quiet', 'Suppress output')
    .option('--no-backup', 'Skip backup creation before modification')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture log item update ./docs/REQ-20251203-app.md REQ-20251203-app-01 --status in-progress
  meatycapture log item update doc.md REQ-20251203-app-01 --priority high --type bug
  meatycapture log item update doc.md REQ-20251203-app-01 --tags "urgent,blocker"
  meatycapture log item update doc.md REQ-20251203-app-01 --add-tags security --remove-tags draft
  meatycapture log item update doc.md REQ-20251203-app-01 --domain "api,backend" --subdomain "auth"
  meatycapture log item update doc.md REQ-20251203-app-01 --context "Background info for this item"
  meatycapture log item update doc.md REQ-20251203-app-01 --status done --json

Exit Codes:
  0  Success
  1  Validation error (no update options)
  2  File not found or I/O error
  4  Item not found in document
`
    )
    .action(wrappedItemUpdateAction);

  return item;
}
