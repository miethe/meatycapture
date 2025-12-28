/**
 * Interactive Mode Module
 *
 * Re-exports all interactive prompt functionality for guided CLI workflows.
 *
 * Usage:
 * ```typescript
 * import { prompt, confirm, selectFromList } from '@cli/interactive';
 * ```
 */

// Core prompts
export {
  prompt,
  promptWithDefault,
  confirm,
  selectFromList,
  promptWithValidation,
  promptMultiValue,
  UserInterruptError,
} from './prompts.js';

// Validators
export {
  validateNonEmpty,
  validateProjectId,
  validatePath,
  validateUrl,
  validateFieldName,
  validateFieldScope,
  validateYesNo,
  validateNumber,
  createEnumValidator,
} from './validators.js';

// Utilities
export {
  selectProject,
  promptFieldValue,
  promptTags,
  promptItemDraft,
  formatList,
  showSuccess,
  showError,
} from './utils.js';
