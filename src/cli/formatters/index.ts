/**
 * CLI Output Formatters Module
 *
 * Provides multiple output formats for CLI commands:
 * - human: Colored terminal output with visual hierarchy
 * - json: Machine-parseable JSON with ISO 8601 dates
 * - csv: RFC 4180 compliant CSV for spreadsheet import
 * - yaml: YAML format for CI/CD and configuration
 * - table: ASCII tables for terminal display
 *
 * Usage:
 * ```typescript
 * import { formatOutput, OutputFormat } from '@cli/formatters';
 *
 * const data = await docStore.list(path);
 * const output = formatOutput(data, { format: 'table', color: true });
 * console.log(output);
 * ```
 *
 * Architecture:
 * - Each formatter is isolated in its own module
 * - Type guards ensure correct data handling
 * - formatOutput dispatcher provides unified API
 * - All dates serialized as ISO 8601 for consistency
 */

// Re-export types
export type {
  OutputFormat,
  FormatOptions,
  SearchMatch,
  MatchedField,
  FormattableData,
  Formatter,
} from './types.js';

export {
  DATE_FORMAT,
  serializeDate,
  isRequestLogDoc,
  isRequestLogDocArray,
  isDocMeta,
  isDocMetaArray,
  isRequestLogItem,
  isRequestLogItemArray,
  isSearchMatch,
  isSearchMatchArray,
  isEmptyArray,
  isProject,
  isProjectArray,
} from './types.js';

// Re-export individual formatters
export {
  formatAsJson,
  formatDocAsJson,
  formatDocsAsJson,
  formatDocMetaAsJson,
  formatDocMetasAsJson,
  formatItemAsJson,
  formatItemsAsJson,
  formatSearchMatchAsJson,
  formatSearchMatchesAsJson,
  formatProjectAsJson,
  formatProjectsAsJson,
} from './json.js';

export {
  formatAsYaml,
  formatDocAsYaml,
  formatDocsAsYaml,
  formatDocMetaAsYaml,
  formatDocMetasAsYaml,
  formatItemAsYaml,
  formatItemsAsYaml,
  formatSearchMatchAsYaml,
  formatSearchMatchesAsYaml,
  formatProjectAsYaml,
  formatProjectsAsYaml,
} from './yaml.js';

export {
  formatAsCsv,
  formatDocAsCsv,
  formatDocsAsCsv,
  formatDocMetaAsCsv,
  formatDocMetasAsCsv,
  formatItemAsCsv,
  formatItemsAsCsv,
  formatSearchMatchAsCsv,
  formatSearchMatchesAsCsv,
  formatProjectAsCsv,
  formatProjectsAsCsv,
} from './csv.js';

export {
  formatAsTable,
  formatDocAsTable,
  formatDocsAsTable,
  formatDocMetaAsTable,
  formatDocMetasAsTable,
  formatItemAsTable,
  formatItemsAsTable,
  formatSearchMatchAsTable,
  formatSearchMatchesAsTable,
  formatProjectAsTable,
  formatProjectsAsTable,
} from './table.js';

export {
  formatAsHuman,
  formatDocAsHuman,
  formatDocsAsHuman,
  formatDocMetaAsHuman,
  formatDocMetasAsHuman,
  formatItemAsHuman,
  formatItemsAsHuman,
  formatSearchMatchAsHuman,
  formatSearchMatchesAsHuman,
  formatProjectAsHuman,
  formatProjectsAsHuman,
} from './human.js';

// Import for dispatcher
import type { FormattableData, FormatOptions, OutputFormat } from './types.js';
import { formatAsJson } from './json.js';
import { formatAsYaml } from './yaml.js';
import { formatAsCsv } from './csv.js';
import { formatAsTable } from './table.js';
import { formatAsHuman } from './human.js';

/**
 * Main format dispatcher that routes to the appropriate formatter.
 *
 * Handles the format selection and delegates to specialized formatters.
 * Respects quiet mode by returning empty string when suppressing output.
 *
 * @param data - Any formattable data type (docs, items, search results)
 * @param options - Format options including format type, color, quiet mode
 * @returns Formatted string ready for output
 *
 * @example
 * ```typescript
 * // Format document list as table
 * const output = formatOutput(docs, { format: 'table' });
 *
 * // Format search results as JSON for piping
 * const json = formatOutput(matches, { format: 'json' });
 *
 * // Format items with colors for terminal
 * const human = formatOutput(items, { format: 'human', color: true });
 * ```
 */
export function formatOutput<T extends FormattableData>(
  data: T,
  options: FormatOptions
): string {
  // In quiet mode, suppress non-error output
  if (options.quiet) {
    return '';
  }

  const format: OutputFormat = options.format;

  switch (format) {
    case 'json':
      return formatAsJson(data);

    case 'yaml':
      return formatAsYaml(data);

    case 'csv':
      return formatAsCsv(data);

    case 'table':
      return formatAsTable(data);

    case 'human':
      return formatAsHuman(data, options);

    default: {
      // Exhaustive check - TypeScript ensures all formats handled
      const _exhaustive: never = format;
      throw new Error(`Unknown format: ${_exhaustive}`);
    }
  }
}

/**
 * Validates that a string is a valid OutputFormat.
 * Useful for CLI argument parsing.
 *
 * @param value - String to validate
 * @returns True if valid OutputFormat
 */
export function isValidFormat(value: string): value is OutputFormat {
  return ['human', 'json', 'csv', 'yaml', 'table'].includes(value);
}

/**
 * Parses format string with fallback to default.
 * Returns 'human' if format is invalid.
 *
 * @param value - Format string from CLI args
 * @param defaultFormat - Fallback format (default: 'human')
 * @returns Valid OutputFormat
 */
export function parseFormat(
  value: string | undefined,
  defaultFormat: OutputFormat = 'human'
): OutputFormat {
  if (!value) {
    return defaultFormat;
  }

  if (isValidFormat(value)) {
    return value;
  }

  return defaultFormat;
}

/**
 * Available output formats for CLI help text.
 */
export const AVAILABLE_FORMATS: readonly OutputFormat[] = [
  'human',
  'json',
  'csv',
  'yaml',
  'table',
] as const;

/**
 * Format descriptions for CLI help text.
 */
export const FORMAT_DESCRIPTIONS: Record<OutputFormat, string> = {
  human: 'Colored human-readable output (default)',
  json: 'Machine-parseable JSON with ISO 8601 dates',
  csv: 'RFC 4180 compliant CSV for spreadsheet import',
  yaml: 'YAML format for CI/CD and configuration',
  table: 'ASCII table format for terminal display',
} as const;
