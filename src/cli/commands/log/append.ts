/**
 * Log Append Command
 *
 * Appends items from JSON input to an existing request-log document.
 * Updates document metadata (item_count, tags, updated_at).
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import type { ItemDraft, RequestLogDoc } from '@core/models';
import { createFsDocStore } from '@adapters/fs-local';
import { realClock } from '@adapters/clock';

/**
 * CLI input JSON structure for appending items.
 */
interface AppendCliInput {
  /** Project identifier (slug format) - used for validation */
  project: string;
  /** Array of items to append */
  items: ItemDraft[];
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
 * Type guard to validate append CLI input structure.
 */
function isValidAppendInput(obj: unknown): obj is AppendCliInput {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const input = obj as Partial<AppendCliInput>;

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

  return true;
}

/**
 * Reads and parses JSON input file for append operation.
 *
 * @param jsonPath - Path to JSON file
 * @returns Parsed and validated CLI input
 * @throws Error if file not found, JSON parsing fails, or validation fails
 */
async function readAppendInput(jsonPath: string): Promise<AppendCliInput> {
  try {
    const content = await fs.readFile(jsonPath, 'utf-8');
    const data = JSON.parse(content) as unknown;

    if (!isValidAppendInput(data)) {
      throw new Error(
        'Invalid JSON structure for append. Expected format:\n' +
          '{\n' +
          '  "project": "project-slug",\n' +
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
 * Appends items to an existing request-log document.
 *
 * Steps:
 * 1. Read and validate JSON input
 * 2. Verify document exists
 * 3. Append each item to the document
 * 4. Update aggregated metadata
 */
export async function appendAction(docPath: string, jsonPath: string): Promise<void> {
  try {
    const input = await readAppendInput(jsonPath);
    const resolvedDocPath = resolve(docPath);

    const docStore = createFsDocStore();
    let updatedDoc: RequestLogDoc | null = null;

    for (const item of input.items) {
      updatedDoc = await docStore.append(resolvedDocPath, item, realClock);
    }

    if (!updatedDoc) {
      throw new Error('No items were appended');
    }

    console.log(`Appended ${input.items.length} item(s) to: ${resolvedDocPath}`);
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
 * Registers the append command with a Commander program/command.
 */
export function registerAppendCommand(program: Command): void {
  program
    .command('append')
    .description('Append items to an existing request-log document')
    .argument('<doc-path>', 'Path to existing document')
    .argument('<json-file>', 'Path to JSON input file with items to append')
    .action(appendAction);
}
