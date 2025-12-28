/**
 * YAML Output Formatter
 *
 * Produces valid YAML output using the 'yaml' package.
 * Suitable for CI/CD pipelines and human-readable configuration files.
 *
 * Design:
 * - Uses yaml package for standards-compliant output
 * - Custom date handling for ISO 8601 format
 * - Preserves all data fields without transformation
 */

import { stringify as yamlStringify } from 'yaml';
import type { RequestLogDoc, RequestLogItem, Project } from '@core/models';
import type { DocMeta } from '@core/ports';
import type { SearchMatch, FormattableData } from './types.js';
import { serializeDate } from './types.js';

/**
 * Recursively transforms Date objects to ISO 8601 strings.
 * The yaml package would otherwise format dates inconsistently.
 */
function transformDates<T>(data: T): T {
  if (data instanceof Date) {
    return serializeDate(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map(transformDates) as unknown as T;
  }

  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = transformDates(value);
    }
    return result as T;
  }

  return data;
}

/**
 * YAML stringify options for consistent output.
 */
const YAML_OPTIONS = {
  indent: 2,
  lineWidth: 120,
  defaultStringType: 'PLAIN' as const,
  defaultKeyType: 'PLAIN' as const,
};

/**
 * Formats a single RequestLogDoc as YAML.
 */
export function formatDocAsYaml(doc: RequestLogDoc): string {
  return yamlStringify(transformDates(doc), YAML_OPTIONS);
}

/**
 * Formats an array of RequestLogDocs as YAML.
 */
export function formatDocsAsYaml(docs: RequestLogDoc[]): string {
  return yamlStringify(transformDates(docs), YAML_OPTIONS);
}

/**
 * Formats a single DocMeta as YAML.
 */
export function formatDocMetaAsYaml(meta: DocMeta): string {
  return yamlStringify(transformDates(meta), YAML_OPTIONS);
}

/**
 * Formats an array of DocMeta as YAML.
 */
export function formatDocMetasAsYaml(metas: DocMeta[]): string {
  return yamlStringify(transformDates(metas), YAML_OPTIONS);
}

/**
 * Formats a single RequestLogItem as YAML.
 */
export function formatItemAsYaml(item: RequestLogItem): string {
  return yamlStringify(transformDates(item), YAML_OPTIONS);
}

/**
 * Formats an array of RequestLogItems as YAML.
 */
export function formatItemsAsYaml(items: RequestLogItem[]): string {
  return yamlStringify(transformDates(items), YAML_OPTIONS);
}

/**
 * Formats a single SearchMatch as YAML.
 */
export function formatSearchMatchAsYaml(match: SearchMatch): string {
  return yamlStringify(transformDates(match), YAML_OPTIONS);
}

/**
 * Formats an array of SearchMatches as YAML.
 */
export function formatSearchMatchesAsYaml(matches: SearchMatch[]): string {
  return yamlStringify(transformDates(matches), YAML_OPTIONS);
}

/**
 * Formats a single Project as YAML.
 */
export function formatProjectAsYaml(project: Project): string {
  return yamlStringify(transformDates(project), YAML_OPTIONS);
}

/**
 * Formats an array of Projects as YAML.
 */
export function formatProjectsAsYaml(projects: Project[]): string {
  return yamlStringify(transformDates(projects), YAML_OPTIONS);
}

/**
 * Generic YAML formatter that handles all formattable data types.
 * Produces valid YAML with ISO 8601 dates.
 *
 * @param data - Any formattable data type
 * @returns YAML string
 */
export function formatAsYaml<T extends FormattableData>(data: T): string {
  return yamlStringify(transformDates(data), YAML_OPTIONS);
}
