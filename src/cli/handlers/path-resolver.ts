/**
 * CLI Path Resolver
 *
 * Centralized path resolution for CLI commands. Handles document paths with
 * intelligent resolution of REQ pattern filenames to their project directories.
 *
 * Features:
 * - Absolute path passthrough
 * - REQ pattern detection (REQ-YYYYMMDD-<slug>.md or REQ-YYYYMMDD-<slug>-NN.md)
 * - Automatic .md extension normalization
 * - Project-aware path resolution via project registry
 *
 * Used by:
 * - log view: Display document contents
 * - log note add: Add notes to items
 * - log item update: Update item fields
 * - log delete: Delete documents
 */

import path, { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { createAdapters } from '@adapters/factory';

/**
 * REQ pattern regex for document and item filenames.
 *
 * Matches:
 * - REQ-YYYYMMDD-<slug>.md (document)
 * - REQ-YYYYMMDD-<slug>-NN.md (item reference, resolves to document)
 *
 * Captures:
 * - Group 1: Project slug (e.g., 'meatycapture', 'my-project')
 *
 * The optional -NN suffix (exactly 2 digits) allows item-level references
 * to resolve to their parent document location.
 *
 * Pattern breakdown:
 * - ^REQ-\d{8}-       : Prefix with 8-digit date
 * - (.+?)             : Project slug (non-greedy, allows hyphens)
 * - (?:-\d{2})?       : Optional item suffix (exactly 2 digits)
 * - \.md$             : File extension
 */
const REQ_PATTERN = /^REQ-\d{8}-(.+?)(?:-\d{2})?\.md$/;

/**
 * Gets the default document path for a project.
 *
 * Resolution order:
 * 1. Project's configured default_path (from projects.json)
 * 2. MEATYCAPTURE_DEFAULT_PROJECT_PATH environment variable + project slug
 * 3. Default: ~/.meatycapture/docs/<project-slug>/
 *
 * @param projectSlug - The project identifier to resolve
 * @returns Absolute path to the project's document directory
 *
 * @example
 * ```typescript
 * // Project 'meatycapture' configured with default_path: '~/docs/mc'
 * const path = await getProjectDocPath('meatycapture');
 * // Returns: '/Users/name/docs/mc'
 *
 * // Unknown project falls back to default location
 * const path = await getProjectDocPath('unknown');
 * // Returns: '/Users/name/.meatycapture/docs/unknown'
 * ```
 */
export async function getProjectDocPath(projectSlug: string): Promise<string> {
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
 * Normalizes a document path by adding .md extension if missing.
 *
 * Only adds extension if the path doesn't already end with .md
 * (case-insensitive check for robustness).
 *
 * @param docPath - Path to normalize
 * @returns Path with .md extension guaranteed
 *
 * @example
 * ```typescript
 * normalizeExtension('REQ-20251215-project')     // 'REQ-20251215-project.md'
 * normalizeExtension('REQ-20251215-project.md')  // 'REQ-20251215-project.md'
 * normalizeExtension('doc.MD')                   // 'doc.MD' (already has extension)
 * ```
 */
export function normalizeExtension(docPath: string): string {
  if (docPath.toLowerCase().endsWith('.md')) {
    return docPath;
  }
  return `${docPath}.md`;
}

/**
 * Extracts project slug from a REQ pattern filename.
 *
 * @param filename - Filename to parse (must have .md extension)
 * @returns Project slug if pattern matches, null otherwise
 *
 * @example
 * ```typescript
 * extractProjectSlug('REQ-20251215-meatycapture.md')     // 'meatycapture'
 * extractProjectSlug('REQ-20251215-my-project-01.md')    // 'my-project'
 * extractProjectSlug('random-file.md')                   // null
 * ```
 */
export function extractProjectSlug(filename: string): string | null {
  const match = filename.match(REQ_PATTERN);
  return match?.[1] ?? null;
}

/**
 * Resolves a document path, handling:
 * - Absolute paths (returned as-is)
 * - REQ pattern paths (e.g., REQ-20251215-project or REQ-20251215-project.md)
 * - Relative paths
 *
 * Automatically adds .md extension if missing before pattern matching.
 *
 * Resolution logic:
 * 1. If absolute path, return unchanged
 * 2. Normalize extension (add .md if missing)
 * 3. If matches REQ pattern, resolve against project's document path
 * 4. Otherwise resolve against current working directory
 *
 * @param docPath - Path to resolve (can be absolute, REQ pattern, or relative)
 * @returns Resolved absolute path to the document
 *
 * @example
 * ```typescript
 * // Absolute paths pass through unchanged
 * await resolveDocPath('/absolute/path/doc.md')
 * // Returns: '/absolute/path/doc.md'
 *
 * // REQ patterns resolve to project directory
 * await resolveDocPath('REQ-20251215-meatycapture.md')
 * // Returns: '~/.meatycapture/docs/meatycapture/REQ-20251215-meatycapture.md'
 *
 * // Missing .md extension is normalized
 * await resolveDocPath('REQ-20251215-meatycapture')
 * // Returns: '~/.meatycapture/docs/meatycapture/REQ-20251215-meatycapture.md'
 *
 * // Item-level patterns resolve to document location
 * await resolveDocPath('REQ-20251215-meatycapture-01.md')
 * // Returns: '~/.meatycapture/docs/meatycapture/REQ-20251215-meatycapture-01.md'
 *
 * // Relative paths resolve against CWD
 * await resolveDocPath('./docs/my-file.md')
 * // Returns: '/current/working/dir/docs/my-file.md'
 * ```
 */
export async function resolveDocPath(docPath: string): Promise<string> {
  // Step 1: Absolute paths are returned unchanged
  if (path.isAbsolute(docPath)) {
    return docPath;
  }

  // Step 2: Normalize extension (add .md if missing)
  const normalizedPath = normalizeExtension(docPath);

  // Step 3: Check for REQ pattern and resolve against project path
  const projectSlug = extractProjectSlug(normalizedPath);
  if (projectSlug) {
    const projectPath = await getProjectDocPath(projectSlug);
    return join(projectPath, normalizedPath);
  }

  // Step 4: Fall back to CWD resolution
  return resolve(normalizedPath);
}
