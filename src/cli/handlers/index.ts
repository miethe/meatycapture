/**
 * CLI Handlers Module
 *
 * Centralized CLI utilities including:
 * - Input handling (stdin, file reading)
 * - Error handling and exit codes
 * - Interrupt handling (Ctrl+C)
 *
 * @example
 * ```typescript
 * import {
 *   readInput,
 *   ExitCodes,
 *   ValidationError,
 *   handleError,
 *   withErrorHandling,
 *   setupInterruptHandler,
 * } from '@cli/handlers';
 *
 * // Setup Ctrl+C handling
 * setupInterruptHandler();
 *
 * // Wrap command handler
 * const action = withErrorHandling(async (args) => {
 *   const input = await readInput(args.file);
 *   // ... command logic
 * });
 * ```
 */

// ============================================================================
// Input Handlers
// ============================================================================

export {
  readInput,
  readStdin,
  isStdinInput,
  isStdinAvailable,
  StdinError,
  type ReadInputOptions,
  type StdinErrorCode,
  type TextEncoding,
} from './stdin.js';

// ============================================================================
// Exit Codes
// ============================================================================

export {
  ExitCodes,
  ExitCodeDescriptions,
  isSuccessCode,
  isUserError,
  type ExitCode,
} from './exitCodes.js';

// ============================================================================
// Error Classes
// ============================================================================

export {
  CliError,
  ValidationError,
  FileNotFoundError,
  PermissionError,
  ParseError,
  ResourceConflictError,
  ResourceNotFoundError,
  CommandLineError,
  UserInterruptError,
} from './errors.js';

// ============================================================================
// Error Handling Utilities
// ============================================================================

export {
  formatError,
  mapToCliError,
  handleError,
  withErrorHandling,
  createError,
} from './errors.js';

// ============================================================================
// Interrupt Handling
// ============================================================================

export { setupInterruptHandler } from './errors.js';

// ============================================================================
// Output Mode
// ============================================================================

export { setQuietMode, isQuietMode } from './errors.js';

// ============================================================================
// Search Handlers
// ============================================================================

export {
  parseQuery,
  parseMatchMode,
  searchDocument,
  searchDocuments,
  DEFAULT_SEARCH_OPTIONS,
  type MatchMode,
  type QueryComponent,
  type SearchOptions,
} from './search.js';

// ============================================================================
// Project Handlers
// ============================================================================

export {
  validateProjectId,
  validatePathExists,
  validatePathWritable,
  generateProjectIdFromName,
} from './project.js';
