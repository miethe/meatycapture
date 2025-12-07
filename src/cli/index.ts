#!/usr/bin/env node
/**
 * MeatyCapture CLI
 *
 * Headless batch document creation and management for request-log documents.
 * Provides commands for creating, appending, and listing documents without UI.
 *
 * Commands:
 * - create <json-file>: Create new doc from JSON input
 * - append <doc-path> <json-file>: Append items to existing doc
 * - list [project]: List docs for a project
 *
 * JSON Input Format:
 * {
 *   "project": "my-project",
 *   "title": "Optional document title",
 *   "items": [
 *     {
 *       "title": "Item title",
 *       "type": "enhancement",
 *       "domain": "web",
 *       "context": "Additional context",
 *       "priority": "medium",
 *       "status": "triage",
 *       "tags": ["tag1", "tag2"],
 *       "notes": "Problem/goal description"
 *     }
 *   ]
 * }
 */

import { Command } from 'commander';
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
 * CLI input JSON structure for creating/appending documents.
 */
interface CliInput {
  /** Project identifier (slug format) */
  project: string;
  /** Optional document title (for create command) */
  title?: string;
  /** Array of items to add to the document */
  items: ItemDraft[];
}

/**
 * Type guard to validate CLI input structure.
 *
 * Ensures the JSON input has the required fields and correct types.
 *
 * @param obj - Object to validate
 * @returns True if valid CliInput, false otherwise
 */
function isValidCliInput(obj: unknown): obj is CliInput {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const input = obj as Partial<CliInput>;

  // Validate project field
  if (!input.project || typeof input.project !== 'string') {
    return false;
  }

  // Validate items array
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return false;
  }

  // Validate each item
  for (const item of input.items) {
    if (!isValidItemDraft(item)) {
      return false;
    }
  }

  // Validate optional title
  if (input.title !== undefined && typeof input.title !== 'string') {
    return false;
  }

  return true;
}

/**
 * Type guard to validate ItemDraft structure.
 *
 * @param obj - Object to validate
 * @returns True if valid ItemDraft, false otherwise
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
async function readCliInput(jsonPath: string): Promise<CliInput> {
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
 *
 * @param projectId - Project identifier
 * @returns Resolved document path
 */
async function getProjectDocPath(projectId: string): Promise<string> {
  const projectStore = createProjectStore();
  const project = await projectStore.get(projectId);

  if (project) {
    return project.default_path;
  }

  // Fallback to environment variable or default
  const envPath = process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
  if (envPath) {
    return join(envPath, projectId);
  }

  return join(homedir(), '.meatycapture', 'docs', projectId);
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
 *
 * @param jsonPath - Path to JSON input file
 * @param options - Command options
 */
async function createCommand(jsonPath: string, options: { output?: string }): Promise<void> {
  try {
    // Read and validate input
    const input = await readCliInput(jsonPath);

    // Determine output path
    let outputPath: string;
    if (options.output) {
      outputPath = resolve(options.output);
    } else {
      // Generate default path
      const projectPath = await getProjectDocPath(input.project);
      const now = realClock.now();
      const docId = generateDocId(input.project, now);
      outputPath = join(projectPath, `${docId}.md`);
    }

    // Create document
    const now = realClock.now();
    const docId = generateDocId(input.project, now);

    // Convert ItemDrafts to RequestLogItems with IDs
    const items = input.items.map((itemDraft, index) => {
      const itemNumber = index + 1;
      const itemId = `${docId}-${String(itemNumber).padStart(2, '0')}`;

      return {
        ...itemDraft,
        id: itemId,
        created_at: now,
      };
    });

    // Build the document
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

    // Write document
    const docStore = createFsDocStore();
    await docStore.write(outputPath, doc);

    console.log(`✓ Created document: ${outputPath}`);
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
 * Appends items to an existing request-log document.
 *
 * Steps:
 * 1. Read and validate JSON input
 * 2. Verify document exists
 * 3. Append each item to the document
 * 4. Update aggregated metadata
 *
 * @param docPath - Path to existing document
 * @param jsonPath - Path to JSON input file
 */
async function appendCommand(docPath: string, jsonPath: string): Promise<void> {
  try {
    // Read and validate input
    const input = await readCliInput(jsonPath);

    // Resolve document path
    const resolvedDocPath = resolve(docPath);

    // Append items
    const docStore = createFsDocStore();
    let updatedDoc: RequestLogDoc | null = null;

    for (const item of input.items) {
      updatedDoc = await docStore.append(resolvedDocPath, item, realClock);
    }

    if (!updatedDoc) {
      throw new Error('No items were appended');
    }

    console.log(`✓ Appended ${input.items.length} item(s) to: ${resolvedDocPath}`);
    console.log(`  Doc ID: ${updatedDoc.doc_id}`);
    console.log(`  Total Items: ${updatedDoc.item_count}`);
    console.log(`  Tags: ${updatedDoc.tags.join(', ')}`);

    process.exit(0);
  } catch (error) {
    console.error('Error appending to document:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Lists request-log documents for a project.
 *
 * If project is specified, lists docs in that project's directory.
 * Otherwise, lists all docs in the default documents directory.
 *
 * @param projectId - Optional project identifier
 * @param options - Command options
 */
async function listCommand(
  projectId: string | undefined,
  options: { path?: string }
): Promise<void> {
  try {
    // Determine search path
    let searchPath: string;
    if (options.path) {
      searchPath = resolve(options.path);
    } else if (projectId) {
      searchPath = await getProjectDocPath(projectId);
    } else {
      // Default: list all docs in ~/.meatycapture/docs/
      searchPath = join(homedir(), '.meatycapture', 'docs');
    }

    // List documents
    const docStore = createFsDocStore();
    const docs = await docStore.list(searchPath);

    if (docs.length === 0) {
      console.log(`No documents found in: ${searchPath}`);
      process.exit(0);
      return;
    }

    console.log(`Found ${docs.length} document(s) in: ${searchPath}\n`);

    // Display each document
    for (const doc of docs) {
      console.log(`${doc.doc_id}`);
      console.log(`  Title: ${doc.title}`);
      console.log(`  Path: ${doc.path}`);
      console.log(`  Items: ${doc.item_count}`);
      console.log(`  Updated: ${doc.updated_at.toISOString()}`);
      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error listing documents:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('meatycapture')
  .description('Headless batch document creation for MeatyCapture request-logs')
  .version('0.1.0');

program
  .command('create')
  .description('Create a new request-log document from JSON input')
  .argument('<json-file>', 'Path to JSON input file')
  .option('-o, --output <path>', 'Output path for the document (default: auto-generated)')
  .action(createCommand);

program
  .command('append')
  .description('Append items to an existing request-log document')
  .argument('<doc-path>', 'Path to existing document')
  .argument('<json-file>', 'Path to JSON input file with items to append')
  .action(appendCommand);

program
  .command('list')
  .description('List request-log documents for a project')
  .argument('[project]', 'Project identifier (optional)')
  .option('-p, --path <path>', 'Custom path to search for documents')
  .action(listCommand);

// Parse command line arguments
program.parse();
