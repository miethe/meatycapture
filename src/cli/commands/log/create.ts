/**
 * Log Create Command
 *
 * Creates a new request-log document from JSON input file or stdin.
 * Generates document ID, assigns item IDs, aggregates tags.
 *
 * Supports multiple output formats for AI-agent pipelines and human consumption.
 * Uses standardized exit codes for reliable scripting.
 *
 * Usage:
 * ```bash
 * # From file
 * meatycapture log create input.json
 *
 * # From stdin (piped)
 * echo '{"project":"app","items":[...]}' | meatycapture log create -
 *
 * # With output format
 * meatycapture log create input.json --json
 * meatycapture log create input.json --yaml --no-backup
 * ```
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { ItemDraft, RequestLogDoc } from '@core/models';
import { generateDocId } from '@core/validation';
import { aggregateTags, updateItemsIndex } from '@core/serializer';
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';
import { realClock } from '@adapters/clock';
import { readInput, isStdinInput, StdinError } from '@cli/handlers/stdin';
import {
  withErrorHandling,
  ValidationError,
  PermissionError,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors';
import { ExitCodes } from '@cli/handlers/exitCodes';
import { formatOutput, type OutputFormat } from '@cli/formatters';
import {
  selectProject,
  promptItemDraft,
  confirm,
  prompt,
} from '@cli/interactive';

/**
 * CLI input JSON structure for creating documents.
 */
export interface CreateCliInput {
  /** Project identifier (slug format) */
  project: string;
  /** Optional document title */
  title?: string;
  /** Array of items to add to the document */
  items: ItemDraft[];
}

/**
 * Type guard to validate CLI input structure.
 *
 * Ensures the JSON input has the required fields and correct types.
 */
function isValidCliInput(obj: unknown): obj is CreateCliInput {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const input = obj as Partial<CreateCliInput>;

  if (!input.project || typeof input.project !== 'string') {
    return false;
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return false;
  }

  for (const item of input.items) {
    if (!isValidItemDraft(item)) {
      return false;
    }
  }

  if (input.title !== undefined && typeof input.title !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard to validate ItemDraft structure.
 */
function isValidItemDraft(obj: unknown): obj is ItemDraft {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const item = obj as Partial<ItemDraft>;

  return (
    typeof item.title === 'string' &&
    typeof item.type === 'string' &&
    typeof item.domain === 'string' &&
    typeof item.context === 'string' &&
    typeof item.priority === 'string' &&
    typeof item.status === 'string' &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === 'string') &&
    typeof item.notes === 'string'
  );
}

/**
 * Generates expected JSON structure hint for error messages.
 */
function getExpectedFormatHint(): string {
  return (
    '{\n' +
    '  "project": "project-slug",\n' +
    '  "title": "Optional doc title",\n' +
    '  "items": [{\n' +
    '    "title": "Item title",\n' +
    '    "type": "enhancement",\n' +
    '    "domain": "web",\n' +
    '    "context": "Context",\n' +
    '    "priority": "medium",\n' +
    '    "status": "triage",\n' +
    '    "tags": ["tag1"],\n' +
    '    "notes": "Description"\n' +
    '  }]\n' +
    '}'
  );
}

/**
 * Parses and validates JSON content from file or stdin.
 *
 * @param content - Raw JSON string content
 * @param source - Description of source for error messages (file path or 'stdin')
 * @returns Validated CLI input
 * @throws ValidationError if JSON parsing or validation fails
 */
function parseCliInput(content: string, source: string): CreateCliInput {
  let data: unknown;

  try {
    data = JSON.parse(content);
  } catch (error) {
    throw new ValidationError(
      `Invalid JSON in ${source}: ${error instanceof Error ? error.message : 'Parse error'}`,
      `Check for missing commas, quotes, or brackets. Expected format:\n${getExpectedFormatHint()}`
    );
  }

  if (!isValidCliInput(data)) {
    throw new ValidationError(
      `Invalid JSON structure in ${source}. Missing required fields or incorrect types.`,
      `Expected format:\n${getExpectedFormatHint()}`
    );
  }

  return data;
}

/**
 * Reads and parses JSON input from file or stdin.
 *
 * Handles both file paths and stdin (when inputPath is '-').
 * Maps underlying errors to appropriate CLI error types.
 *
 * @param inputPath - Path to JSON file or '-' for stdin
 * @returns Parsed and validated CLI input
 * @throws ValidationError for JSON/structure issues
 * @throws Error for file I/O issues (mapped by error handler)
 */
async function readCliInput(inputPath: string): Promise<CreateCliInput> {
  const source = isStdinInput(inputPath) ? 'stdin' : inputPath;

  try {
    const content = await readInput(inputPath);
    return parseCliInput(content, source);
  } catch (error) {
    // Re-throw ValidationError as-is
    if (error instanceof ValidationError) {
      throw error;
    }

    // Map stdin-specific errors
    if (error instanceof StdinError) {
      throw new ValidationError(
        `Failed to read from stdin: ${error.message}`,
        'Ensure data is piped correctly, e.g., echo \'{"project":"test",...}\' | meatycapture log create -'
      );
    }

    // Let other errors propagate (file not found, etc.) - they'll be mapped by error handler
    throw error;
  }
}

/**
 * Gets the default document path for a project.
 *
 * Resolution order:
 * 1. Project's configured default_path
 * 2. MEATYCAPTURE_DEFAULT_PROJECT_PATH environment variable
 * 3. ~/.meatycapture/docs/<project-id>/
 */
async function getProjectDocPath(projectId: string): Promise<string> {
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectId);

  if (project) {
    return project.default_path;
  }

  const envPath = process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
  if (envPath) {
    return join(envPath, projectId);
  }

  return join(homedir(), '.meatycapture', 'docs', projectId);
}

/**
 * Command options for create command.
 */
interface CreateOptions {
  /** Output path for the document (default: auto-generated) */
  output?: string;
  /** Output as JSON */
  json?: boolean;
  /** Output as YAML */
  yaml?: boolean;
  /** Output as CSV */
  csv?: boolean;
  /** Output as table */
  table?: boolean;
  /** Suppress non-error output */
  quiet?: boolean;
  /** Skip backup creation (via --no-backup flag) */
  backup?: boolean;
  /** Interactive mode */
  interactive?: boolean;
}

/**
 * Determines the output format from command options.
 * Flags take precedence in order: json > yaml > csv > table > human (default)
 */
function getOutputFormat(options: CreateOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  if (options.csv) return 'csv';
  if (options.table) return 'table';
  return 'human';
}

/**
 * Collects log data interactively via prompts.
 *
 * @returns CreateCliInput with project, title, and items
 */
async function interactiveLogCreate(): Promise<CreateCliInput> {
  console.log('--- Create Request Log ---\n');

  // Select project
  const project = await selectProject();

  // Optional document title
  const title = await prompt('Document title (optional): ');

  // Collect items
  const items: ItemDraft[] = [];
  let addMore = true;

  while (addMore) {
    const item = await promptItemDraft(project.id);
    items.push(item);

    if (items.length === 1) {
      addMore = await confirm('Add another item?', false);
    } else {
      addMore = await confirm(`Add another item? (currently ${items.length})`, false);
    }
  }

  const result: CreateCliInput = {
    project: project.id,
    items,
  };

  if (title) {
    result.title = title;
  }

  return result;
}

/**
 * Creates a new request-log document from JSON input.
 *
 * Steps:
 * 1. Read and validate JSON input (from file or stdin)
 * 2. Verify project exists (or use default path)
 * 3. Generate document ID and file path
 * 4. Create document with all items
 * 5. Write to filesystem (with optional backup)
 * 6. Output result in specified format
 */
async function createActionImpl(
  inputPath: string | undefined,
  options: CreateOptions
): Promise<void> {
  // Handle quiet mode globally
  if (options.quiet) {
    setQuietMode(true);
  }

  const format = getOutputFormat(options);
  const shouldBackup = options.backup !== false; // Default to true, --no-backup sets to false

  // Read and validate input
  let input: CreateCliInput;

  if (options.interactive) {
    // Interactive mode
    input = await interactiveLogCreate();
  } else {
    // Non-interactive mode - require input path
    if (!inputPath) {
      throw new ValidationError(
        'Input file path is required in non-interactive mode',
        'Provide a JSON file path or use --interactive for guided prompts'
      );
    }
    input = await readCliInput(inputPath);
  }

  // Determine output path
  let outputPath: string;
  if (options.output) {
    outputPath = resolve(options.output);
  } else {
    const projectPath = await getProjectDocPath(input.project);
    const now = realClock.now();
    const docId = generateDocId(input.project, now);
    outputPath = join(projectPath, `${docId}.md`);
  }

  // Generate document
  const now = realClock.now();
  const docId = generateDocId(input.project, now);

  const items = input.items.map((itemDraft, index) => {
    const itemNumber = index + 1;
    const itemId = `${docId}-${String(itemNumber).padStart(2, '0')}`;

    return {
      ...itemDraft,
      id: itemId,
      created_at: now,
    };
  });

  const doc: RequestLogDoc = {
    doc_id: docId,
    title: input.title || `Request Log - ${input.project}`,
    project_id: input.project,
    items,
    items_index: updateItemsIndex(items),
    tags: aggregateTags(items),
    item_count: items.length,
    created_at: now,
    updated_at: now,
  };

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch {
    throw new PermissionError(
      outputDir,
      'write',
      'Ensure the directory exists and you have write permissions'
    );
  }

  // Handle backup if file exists and backup is enabled
  const docStore = createFsDocStore();

  if (shouldBackup) {
    try {
      // Check if file exists before backup attempt
      await fs.access(outputPath);
      await docStore.backup(outputPath);
    } catch {
      // File doesn't exist yet or backup not needed - continue
    }
  }

  // Write document (use lower-level write to bypass automatic backup in docStore)
  // We handle backup manually above to respect --no-backup flag
  await docStore.write(outputPath, doc);

  // Format and output result
  if (!isQuietMode()) {
    const output = formatOutput(doc, { format, quiet: false });

    if (output) {
      console.log(output);
    }

    // For human format, also show the path
    if (format === 'human') {
      console.log(`\nCreated: ${outputPath}`);
    }
  }

  process.exit(ExitCodes.SUCCESS);
}

/**
 * Wrapped action handler with standardized error handling.
 * Maps all errors to appropriate exit codes.
 */
export const createAction = withErrorHandling(createActionImpl);

/**
 * Registers the create command with a Commander program/command.
 */
export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Create a new request-log document from JSON input or interactively')
    .argument('[json-file]', 'Path to JSON input file, or "-" for stdin (not required with --interactive)')
    .option('-i, --interactive', 'Interactive guided prompts')
    .option('-o, --output <path>', 'Output path for the document (default: auto-generated)')
    .option('--json', 'Output as JSON')
    .option('--yaml', 'Output as YAML')
    .option('--csv', 'Output as CSV')
    .option('--table', 'Output as table')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('--no-backup', 'Skip backup creation')
    .addHelpText(
      'after',
      `
Examples:
  # Interactive mode (guided prompts)
  meatycapture log create --interactive

  # From JSON file
  meatycapture log create input.json

  # From stdin
  echo '{"project":"app","items":[...]}' | meatycapture log create -

  # With custom output path
  meatycapture log create input.json --output /custom/path/REQ-20251228.md
`
    )
    .action(createAction);
}
