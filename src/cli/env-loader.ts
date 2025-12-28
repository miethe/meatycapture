/**
 * Environment File Loader
 *
 * Provides .env file loading for CLI configuration. Loads environment variables
 * from a .env file in the current working directory at CLI startup.
 *
 * Features:
 * - Simple KEY=VALUE parsing (no external dependencies)
 * - Comment support (lines starting with #)
 * - Quoted value support (strips surrounding quotes)
 * - Environment variable precedence (existing env vars are not overwritten)
 * - Silent failure (missing .env is not an error)
 *
 * Supported MeatyCapture environment variables:
 * - MEATYCAPTURE_API_URL: API server URL for remote mode
 * - MEATYCAPTURE_CONFIG_DIR: Custom configuration directory
 * - MEATYCAPTURE_DATA_DIR: Custom data directory
 * - MEATYCAPTURE_DEFAULT_PROJECT_PATH: Default path for new projects
 * - MEATYCAPTURE_AUTH_TOKEN: Authentication token for API requests
 *
 * @example
 * ```typescript
 * import { loadEnvFile } from './env-loader.js';
 *
 * // Load at CLI startup (before any config reads)
 * loadEnvFile();
 *
 * // Now process.env contains values from .env
 * console.log(process.env.MEATYCAPTURE_API_URL);
 * ```
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Result of loading an environment file
 */
export interface EnvLoadResult {
  /** Whether the .env file was found and loaded */
  loaded: boolean;
  /** Number of variables successfully set */
  variablesSet: number;
  /** Number of variables skipped (already set in environment) */
  variablesSkipped: number;
  /** Path to the .env file (if found) */
  path?: string;
}

/**
 * Parses a single line from an .env file.
 *
 * Handles:
 * - Empty lines (returns null)
 * - Comment lines starting with # (returns null)
 * - KEY=VALUE format (returns [key, value])
 * - Quoted values with single or double quotes (strips quotes)
 * - Whitespace trimming on both key and value
 * - Lines without = (returns null)
 *
 * @param line - A single line from the .env file
 * @returns Tuple of [key, value] or null if line should be skipped
 *
 * @example
 * ```typescript
 * parseLine('# Comment');                    // null
 * parseLine('');                             // null
 * parseLine('KEY=value');                    // ['KEY', 'value']
 * parseLine('  KEY = value  ');              // ['KEY', 'value']
 * parseLine('KEY="quoted value"');           // ['KEY', 'quoted value']
 * parseLine("KEY='single quoted'");          // ['KEY', 'single quoted']
 * parseLine('INVALID_LINE');                 // null
 * ```
 */
export function parseLine(line: string): [string, string] | null {
  // Trim leading/trailing whitespace
  const trimmed = line.trim();

  // Skip empty lines
  if (trimmed === '') {
    return null;
  }

  // Skip comment lines
  if (trimmed.startsWith('#')) {
    return null;
  }

  // Find first = sign (ignore lines without it)
  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) {
    return null;
  }

  // Extract and trim key
  const key = trimmed.slice(0, equalsIndex).trim();

  // Skip if key is empty
  if (key === '') {
    return null;
  }

  // Extract value (everything after first =)
  let value = trimmed.slice(equalsIndex + 1).trim();

  // Strip surrounding quotes if present (single or double)
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

/**
 * Loads environment variables from a .env file in the current working directory.
 *
 * This function should be called early in CLI initialization, before any
 * configuration reads occur. It sets process.env values for any keys found
 * in the .env file that are not already set in the environment.
 *
 * Environment precedence:
 * - Existing environment variables take precedence over .env values
 * - This allows runtime overrides: `MEATYCAPTURE_API_URL=... meatycapture ...`
 *
 * Error handling:
 * - Missing .env file is silently ignored (common case)
 * - Parse errors on individual lines are silently skipped
 * - Only file read errors (permissions, etc.) are treated as failures
 *
 * @param cwd - Current working directory (defaults to process.cwd())
 * @returns Result object indicating what was loaded
 *
 * @example
 * ```typescript
 * // Basic usage at CLI startup
 * loadEnvFile();
 *
 * // Check what was loaded
 * const result = loadEnvFile();
 * if (result.loaded) {
 *   console.log(`Loaded ${result.variablesSet} variables from ${result.path}`);
 * }
 *
 * // Custom directory (for testing)
 * loadEnvFile('/path/to/project');
 * ```
 */
export function loadEnvFile(cwd?: string): EnvLoadResult {
  const workingDir = cwd ?? process.cwd();
  const envPath = join(workingDir, '.env');

  let content: string;
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch {
    // File doesn't exist or can't be read - not an error
    // This is the common case when no .env file is present
    return {
      loaded: false,
      variablesSet: 0,
      variablesSkipped: 0,
    };
  }

  let variablesSet = 0;
  let variablesSkipped = 0;

  // Parse each line
  const lines = content.split('\n');
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed === null) {
      continue;
    }

    const [key, value] = parsed;

    // Only set if not already defined (env vars take precedence)
    if (process.env[key] === undefined) {
      process.env[key] = value;
      variablesSet++;
    } else {
      variablesSkipped++;
    }
  }

  return {
    loaded: true,
    variablesSet,
    variablesSkipped,
    path: envPath,
  };
}
