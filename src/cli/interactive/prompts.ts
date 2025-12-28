/**
 * Interactive Prompts Module
 *
 * Provides simple readline-based prompts for guided CLI workflows.
 * Uses Node.js built-in readline module - no external dependencies.
 *
 * Features:
 * - Text input with optional default values
 * - Yes/no confirmation prompts
 * - List selection (number-based)
 * - Ctrl+C handling (exit 130)
 * - Input trimming and validation
 */

import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

/**
 * User interrupt error thrown on Ctrl+C.
 * Should result in exit code 130 (128 + SIGINT=2).
 */
export class UserInterruptError extends Error {
  constructor() {
    super('User interrupted');
    this.name = 'UserInterruptError';
  }
}

/**
 * Creates a readline interface with Ctrl+C handling.
 * Throws UserInterruptError on SIGINT.
 */
function createInterface(): readline.Interface {
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    rl.close();
    throw new UserInterruptError();
  });

  return rl;
}

/**
 * Prompts for a text input.
 *
 * @param question - The question to display
 * @returns User's input (trimmed)
 * @throws UserInterruptError on Ctrl+C
 *
 * @example
 * const name = await prompt('Project name: ');
 */
export async function prompt(question: string): Promise<string> {
  const rl = createInterface();

  return new Promise((resolve, reject) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });

    rl.on('SIGINT', () => {
      rl.close();
      reject(new UserInterruptError());
    });
  });
}

/**
 * Prompts for text input with a default value shown in brackets.
 *
 * @param question - The question to display
 * @param defaultValue - Default value if user presses Enter without input
 * @returns User's input or default value (trimmed)
 * @throws UserInterruptError on Ctrl+C
 *
 * @example
 * const path = await promptWithDefault('Path', './docs');
 * // Displays: Path [./docs]:
 */
export async function promptWithDefault(
  question: string,
  defaultValue: string
): Promise<string> {
  const displayQuestion = `${question} [${defaultValue}]: `;
  const answer = await prompt(displayQuestion);

  return answer || defaultValue;
}

/**
 * Prompts for a yes/no confirmation.
 *
 * @param message - The confirmation message
 * @param defaultYes - Whether default is yes (true) or no (false)
 * @returns true if confirmed, false otherwise
 * @throws UserInterruptError on Ctrl+C
 *
 * @example
 * const confirmed = await confirm('Continue?', true);
 * // Displays: Continue? [Y/n]:
 *
 * const denied = await confirm('Delete?', false);
 * // Displays: Delete? [y/N]:
 */
export async function confirm(
  message: string,
  defaultYes = false
): Promise<boolean> {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const displayQuestion = `${message} ${suffix}: `;

  const answer = await prompt(displayQuestion);
  const normalized = answer.toLowerCase();

  if (!normalized) {
    return defaultYes;
  }

  return normalized === 'y' || normalized === 'yes';
}

/**
 * Prompts user to select from a list of items.
 *
 * Displays numbered list and accepts either:
 * - Number selection (1, 2, 3, etc.)
 * - Arrow key navigation (future enhancement - for now just numbers)
 *
 * @param items - Array of items to select from
 * @param labelFn - Function to extract display label from item
 * @param promptText - Prompt text to display above list
 * @returns Selected item
 * @throws UserInterruptError on Ctrl+C
 * @throws Error if invalid selection
 *
 * @example
 * const projects = [{id: 'a', name: 'Project A'}, {id: 'b', name: 'Project B'}];
 * const selected = await selectFromList(
 *   projects,
 *   p => p.name,
 *   'Select project:'
 * );
 */
export async function selectFromList<T>(
  items: T[],
  labelFn: (item: T) => string,
  promptText: string
): Promise<T> {
  if (items.length === 0) {
    throw new Error('Cannot select from empty list');
  }

  // Display the list
  console.log(`${promptText}`);
  items.forEach((item, index) => {
    const label = labelFn(item);
    console.log(`  ${index + 1}. ${label}`);
  });

  // Prompt for selection
  const answer = await prompt('> ');
  const selection = parseInt(answer, 10);

  if (isNaN(selection) || selection < 1 || selection > items.length) {
    throw new Error(
      `Invalid selection: ${answer}. Please enter a number between 1 and ${items.length}`
    );
  }

  const selectedItem = items[selection - 1];
  if (!selectedItem) {
    throw new Error('Invalid selection');
  }
  return selectedItem;
}

/**
 * Prompts for text input with validation and retry on invalid input.
 *
 * Continues prompting until valid input is provided or user cancels (Ctrl+C).
 *
 * @param question - The question to display
 * @param validator - Validation function (returns error message if invalid, null if valid)
 * @param defaultValue - Optional default value
 * @returns Valid user input
 * @throws UserInterruptError on Ctrl+C
 *
 * @example
 * const id = await promptWithValidation(
 *   'Project ID',
 *   (value) => /^[a-z0-9-]+$/.test(value) ? null : 'Must be kebab-case',
 *   'my-project'
 * );
 */
export async function promptWithValidation(
  question: string,
  validator: (value: string) => string | null,
  defaultValue?: string
): Promise<string> {
  let isValid = false;
  let value = '';

  while (!isValid) {
    value = defaultValue
      ? await promptWithDefault(question, defaultValue)
      : await prompt(`${question}: `);

    const error = validator(value);
    if (!error) {
      isValid = true;
    } else {
      // Show error and retry
      console.error(`Error: ${error}`);
    }
  }

  return value;
}

/**
 * Prompts for multiple text inputs from a multi-line paste.
 *
 * User can enter multiple values separated by newlines.
 * Useful for tags or multi-value fields.
 *
 * @param question - The question to display
 * @param separator - Separator to split input (default: comma or newline)
 * @returns Array of trimmed, non-empty values
 * @throws UserInterruptError on Ctrl+C
 *
 * @example
 * const tags = await promptMultiValue('Tags (comma-separated)');
 * // User enters: "api, web, urgent"
 * // Returns: ['api', 'web', 'urgent']
 */
export async function promptMultiValue(
  question: string,
  separator: string | RegExp = /[,\n]/
): Promise<string[]> {
  const answer = await prompt(`${question}: `);

  return answer
    .split(separator)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}
