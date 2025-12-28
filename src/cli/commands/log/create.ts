/**
 * Log Create Command
 *
 * Creates a new request-log document from JSON input file.
 * Generates document ID, assigns item IDs, aggregates tags.
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { ItemDraft, RequestLogDoc } from '@core/models';
import { generateDocId } from '@core/validation';
import { aggregateTags, updateItemsIndex } from '@core/serializer';
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';
import { realClock } from '@adapters/clock';

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
 * Reads and parses JSON input file.
 *
 * @param jsonPath - Path to JSON file
 * @returns Parsed and validated CLI input
 * @throws Error if file not found, JSON parsing fails, or validation fails
 */
async function readCliInput(jsonPath: string): Promise<CreateCliInput> {
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content) as unknown;

    if (!isValidCliInput(data)) {
      throw new Error(
        'Invalid JSON structure. Expected format:\n' +
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

    return data;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Input file not found: ${jsonPath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${jsonPath}: ${error.message}`);
    }
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
  output?: string;
}

/**
 * Creates a new request-log document from JSON input.
 *
 * Steps:
 * 1. Read and validate JSON input
 * 2. Verify project exists (or use default path)
 * 3. Generate document ID and file path
 * 4. Create document with all items
 * 5. Write to filesystem
 */
export async function createAction(jsonPath: string, options: CreateOptions): Promise<void> {
  try {
    const input = await readCliInput(jsonPath);

    let outputPath: string;
    if (options.output) {
      outputPath = resolve(options.output);
    } else {
      const projectPath = await getProjectDocPath(input.project);
      const now = realClock.now();
      const docId = generateDocId(input.project, now);
      outputPath = join(projectPath, `${docId}.md`);
    }

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

    const docStore = createFsDocStore();
    await docStore.write(outputPath, doc);

    console.log(`Created document: ${outputPath}`);
    console.log(`  Doc ID: ${docId}`);
    console.log(`  Items: ${items.length}`);
    console.log(`  Tags: ${doc.tags.join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating document:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Registers the create command with a Commander program/command.
 */
export function registerCreateCommand(program: Command): void {
  program
    .command('create')
    .description('Create a new request-log document from JSON input')
    .argument('<json-file>', 'Path to JSON input file')
    .option('-o, --output <path>', 'Output path for the document (default: auto-generated)')
    .action(createAction);
}
