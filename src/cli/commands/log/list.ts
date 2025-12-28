/**
 * Log List Command
 *
 * Lists request-log documents for a project or directory.
 * Displays document metadata including ID, title, item count, and timestamps.
 */

import type { Command } from 'commander';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createFsDocStore } from '@adapters/fs-local';
import { createProjectStore } from '@adapters/config-local';

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
 * Command options for list command.
 */
interface ListOptions {
  path?: string;
}

/**
 * Lists request-log documents for a project.
 *
 * If project is specified, lists docs in that project's directory.
 * Otherwise, lists all docs in the default documents directory.
 */
export async function listAction(
  projectId: string | undefined,
  options: ListOptions
): Promise<void> {
  try {
    let searchPath: string;
    if (options.path) {
      searchPath = resolve(options.path);
    } else if (projectId) {
      searchPath = await getProjectDocPath(projectId);
    } else {
      searchPath = join(homedir(), '.meatycapture', 'docs');
    }

    const docStore = createFsDocStore();
    const docs = await docStore.list(searchPath);

    if (docs.length === 0) {
      console.log(`No documents found in: ${searchPath}`);
      process.exit(0);
      return;
    }

    console.log(`Found ${docs.length} document(s) in: ${searchPath}\n`);

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

/**
 * Registers the list command with a Commander program/command.
 */
export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List request-log documents for a project')
    .argument('[project]', 'Project identifier (optional)')
    .option('-p, --path <path>', 'Custom path to search for documents')
    .action(listAction);
}
