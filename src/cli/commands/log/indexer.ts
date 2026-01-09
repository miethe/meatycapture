/**
 * Log Index Command
 *
 * Builds or updates the request-log catalog index and optional text index.
 */

import type { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'yaml';
import { createAdapters } from '@adapters/factory';
import {
  rebuildCatalog,
  updateCatalog,
  getIndexPaths,
  type CatalogChanges,
  type CatalogUpdateResult,
} from '@cli/indexing/catalog.js';
import { buildTextIndex, writeTextIndex } from '@cli/indexing/text-index.js';
import {
  withErrorHandling,
  ResourceNotFoundError,
  setQuietMode,
  isQuietMode,
} from '@cli/handlers/errors.js';
import { ExitCodes } from '@cli/handlers/exitCodes.js';

interface IndexOptions {
  path?: string;
  rebuild?: boolean;
  update?: boolean;
  text?: boolean;
  json?: boolean;
  yaml?: boolean;
  quiet?: boolean;
}

type OutputFormat = 'human' | 'json' | 'yaml';

interface IndexSummary {
  mode: 'rebuild' | 'update';
  project_path: string;
  catalog_path: string;
  text_index_path?: string | undefined;
  doc_count: number;
  record_count: number;
  updated: boolean;
  changes?: CatalogChanges | undefined;
  text_index_built: boolean;
}

function resolveFormat(options: IndexOptions): OutputFormat {
  if (options.json) return 'json';
  if (options.yaml) return 'yaml';
  return 'human';
}

async function getProjectDocPath(projectId: string): Promise<string> {
  const { projectStore } = await createAdapters();
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

async function projectExists(projectId: string): Promise<boolean> {
  const { projectStore } = await createAdapters();
  const project = await projectStore.get(projectId);
  return project !== null;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.stat(path);
    return true;
  } catch {
    return false;
  }
}

function formatSummary(summary: IndexSummary, format: OutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  if (format === 'yaml') {
    return yaml.stringify(summary);
  }

  const lines = [
    `Index mode: ${summary.mode}`,
    `Project path: ${summary.project_path}`,
    `Catalog: ${summary.catalog_path}`,
    `Docs indexed: ${summary.doc_count}`,
    `Items indexed: ${summary.record_count}`,
  ];

  if (summary.changes) {
    lines.push(
      `Changes: +${summary.changes.added.length} ~${summary.changes.changed.length} -${summary.changes.removed.length}`
    );
  }

  if (summary.text_index_built) {
    lines.push(`Text index: ${summary.text_index_path ?? 'built'}`);
  }

  return lines.join('\n');
}

async function indexActionImpl(
  projectId: string | undefined,
  options: IndexOptions
): Promise<void> {
  if (options.quiet) {
    setQuietMode(true);
  }

  const format = resolveFormat(options);
  const mode: 'rebuild' | 'update' = options.rebuild || !options.update ? 'rebuild' : 'update';

  let projectPath: string;
  if (options.path) {
    projectPath = resolve(options.path);
  } else if (projectId) {
    const exists = await projectExists(projectId);
    if (!exists) {
      throw new ResourceNotFoundError(
        'project',
        projectId,
        "Run 'meatycapture project list' to see available projects"
      );
    }
    projectPath = await getProjectDocPath(projectId);
  } else {
    projectPath = join(homedir(), '.meatycapture', 'docs');
  }

  const { docStore } = await createAdapters();

  const result =
    mode === 'rebuild'
      ? await rebuildCatalog(docStore, projectPath)
      : await updateCatalog(docStore, projectPath);

  const paths = getIndexPaths(projectPath);
  const textIndexExists = await fileExists(paths.textIndexPath);
  const catalogUpdated =
    mode === 'rebuild' ? true : (result as CatalogUpdateResult).updated;
  const shouldBuildText = options.text || (catalogUpdated && textIndexExists);

  let textIndexBuilt = false;
  if (shouldBuildText) {
    await fs.mkdir(paths.indexDir, { recursive: true });
    const textIndex = await buildTextIndex(docStore, projectPath);
    await writeTextIndex(textIndex, paths.textIndexPath);
    textIndexBuilt = true;
  }

  const summary: IndexSummary = {
    mode,
    project_path: projectPath,
    catalog_path: paths.catalogPath,
    text_index_path: shouldBuildText ? paths.textIndexPath : undefined,
    doc_count: result.doc_count,
    record_count: result.records.length,
    updated: mode === 'rebuild' ? true : (result as CatalogUpdateResult).updated,
    changes: mode === 'update' ? (result as CatalogUpdateResult).changes : undefined,
    text_index_built: textIndexBuilt,
  };

  if (!isQuietMode()) {
    console.log(formatSummary(summary, format));
  }

  process.exit(ExitCodes.SUCCESS);
}

export const indexAction = withErrorHandling(indexActionImpl);

export function registerIndexCommand(program: Command): void {
  program
    .command('index')
    .description('Build or update the request-log catalog index')
    .argument('[project]', 'Project identifier (optional)')
    .option('-p, --path <path>', 'Custom path to index')
    .option('--rebuild', 'Force full rebuild of the catalog')
    .option('--update', 'Incrementally update the catalog (default: rebuild)')
    .option('--text', 'Build or rebuild the BM25 text index')
    .option('--json', 'Output summary as JSON')
    .option('--yaml', 'Output summary as YAML')
    .option('-q, --quiet', 'Suppress non-error output')
    .addHelpText(
      'after',
      `
Examples:
  meatycapture log index my-project
  meatycapture log index --update my-project
  meatycapture log index --rebuild --text my-project
  meatycapture log index --path ./docs --json
`
    )
    .action(indexAction);
}
