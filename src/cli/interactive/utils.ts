/**
 * Interactive Utilities
 *
 * Helper functions for interactive prompt workflows.
 */

import type { Project, FieldOption, ItemDraft, FieldName } from '@core/models';
import { createAdapters } from '@adapters/factory';
import { confirm, selectFromList, promptWithValidation, promptMultiValue } from './prompts.js';
import { validateNonEmpty } from './validators.js';

/**
 * Prompts user to select a project from available projects.
 *
 * @returns Selected project
 * @throws Error if no projects available
 */
export async function selectProject(): Promise<Project> {
  const { projectStore } = await createAdapters();
  const projects = await projectStore.list();

  const enabledProjects = projects.filter((p) => p.enabled);

  if (enabledProjects.length === 0) {
    throw new Error(
      'No projects available. Create a project first with: meatycapture project add'
    );
  }

  return selectFromList(
    enabledProjects,
    (p) => `${p.name} (${p.id})`,
    'Select project:'
  );
}

/**
 * Prompts user to select or enter a field value with validation.
 *
 * Shows available options from field catalog and allows user to select
 * or enter a custom value.
 *
 * @param fieldName - Name of field (type, priority, etc.)
 * @param projectId - Optional project ID for project-scoped options
 * @param required - Whether field is required (default: true)
 * @returns Selected or entered value
 */
export async function promptFieldValue(
  fieldName: string,
  projectId?: string,
  required = true
): Promise<string> {
  const { fieldStore } = await createAdapters();

  // Get available options for this field
  let options: FieldOption[] = [];
  try {
    options = await fieldStore.getByField(fieldName as FieldName, projectId);
  } catch {
    // Ignore errors - proceed without options
    options = [];
  }

  // Show available options if any
  if (options.length > 0) {
    console.log(`\nAvailable ${fieldName} options:`);
    options.forEach((opt, index) => {
      console.log(`  ${index + 1}. ${opt.value}`);
    });
    console.log(`  Or enter a custom value\n`);
  }

  // Prompt for value
  const validator = required
    ? (v: string) => validateNonEmpty(v, fieldName)
    : () => null;

  return promptWithValidation(fieldName, validator);
}

/**
 * Prompts for tags with support for comma-separated input.
 *
 * @param projectId - Optional project ID for project-scoped tag options
 * @returns Array of tag strings
 */
export async function promptTags(projectId?: string): Promise<string[]> {
  const { fieldStore } = await createAdapters();

  // Get available tag options
  let options: FieldOption[] = [];
  try {
    options = await fieldStore.getByField('tags', projectId);
  } catch {
    // Ignore errors
    options = [];
  }

  // Show available tag options if any
  if (options.length > 0) {
    console.log('\nAvailable tags:');
    options.forEach((opt) => {
      console.log(`  - ${opt.value}`);
    });
    console.log();
  }

  const tags = await promptMultiValue('Tags (comma-separated)');
  return tags;
}

/**
 * Prompts for a complete item draft interactively.
 *
 * @param projectId - Project ID for field options
 * @returns Complete ItemDraft
 */
export async function promptItemDraft(projectId: string): Promise<ItemDraft> {
  console.log('\n--- Item Details ---\n');

  const title = await promptWithValidation(
    'Item title',
    (v) => validateNonEmpty(v, 'Title')
  );

  const type = await promptFieldValue('type', projectId);
  const domain = await promptFieldValue('domain', projectId);
  const context = await promptFieldValue('context', projectId);
  const priority = await promptFieldValue('priority', projectId);
  const status = await promptFieldValue('status', projectId);

  const tags = await promptTags(projectId);

  const addNotes = await confirm('Add notes?', false);
  let notes = '';
  if (addNotes) {
    notes = await promptWithValidation('Notes', (v) => validateNonEmpty(v, 'Notes'));
  }

  return {
    title,
    type,
    domain,
    context,
    priority,
    status,
    tags,
    notes,
  };
}

/**
 * Formats a list of items for display in numbered list.
 *
 * @param items - Array of items
 * @param labelFn - Function to get label from item
 * @returns Formatted string
 */
export function formatList<T>(items: T[], labelFn: (item: T) => string): string {
  return items.map((item, index) => `  ${index + 1}. ${labelFn(item)}`).join('\n');
}

/**
 * Displays a success message with checkmark.
 *
 * @param message - Success message
 */
export function showSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

/**
 * Displays an error message.
 *
 * @param message - Error message
 */
export function showError(message: string): void {
  console.error(`✗ ${message}`);
}
