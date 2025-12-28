/**
 * Centralized CLI Error Handling
 *
 * Provides typed error classes, consistent formatting, and exit code mapping.
 * All CLI errors flow through this module for predictable scripting behavior.
 *
 * Error message format:
 * ```
 * Error: <brief message>
 *   -> <suggestion or next step>
 * ```
 *
 * Design decisions:
 * - Error messages capped at 200 chars for clean terminal output
 * - Suggestions guide users toward resolution
 * - Exit codes enable scripting without message parsing
 * - SIGINT handling ensures clean Ctrl+C behavior
 */

import { ExitCode, ExitCodes } from './exitCodes.js';

// ============================================================================
// Error Classes
// ============================================================================
// Each error class maps to a specific exit code and includes optional
// suggestions for resolution. This allows catch blocks to determine
// exit behavior based on error type.
// ============================================================================

/**
 * Base CLI error with exit code and optional suggestion
 *
 * All CLI-specific errors extend this class to ensure:
 * - Consistent exit code mapping
 * - Optional resolution suggestions
 * - Clean error message formatting
 */
export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'CliError';
    Error.captureStackTrace?.(this, CliError);
  }
}

/**
 * Validation or input format error
 *
 * Thrown when:
 * - JSON input is malformed or missing required fields
 * - Input values fail validation rules
 * - Data doesn't match expected schema
 *
 * Exit code: 1 (VALIDATION_ERROR)
 */
export class ValidationError extends CliError {
  constructor(message: string, suggestion?: string) {
    super(
      message,
      ExitCodes.VALIDATION_ERROR,
      suggestion ?? 'Check your input format and required fields'
    );
    this.name = 'ValidationError';
    Error.captureStackTrace?.(this, ValidationError);
  }
}

/**
 * File not found error
 *
 * Thrown when:
 * - Input file doesn't exist
 * - Document file is missing
 * - Directory doesn't exist
 *
 * Exit code: 2 (IO_ERROR)
 */
export class FileNotFoundError extends CliError {
  constructor(
    public readonly path: string,
    suggestion?: string
  ) {
    super(
      `File not found: ${path}`,
      ExitCodes.IO_ERROR,
      suggestion ?? 'Verify the file path exists and is accessible'
    );
    this.name = 'FileNotFoundError';
    Error.captureStackTrace?.(this, FileNotFoundError);
  }
}

/**
 * File permission error
 *
 * Thrown when:
 * - Cannot read from file (no read permission)
 * - Cannot write to file or directory (no write permission)
 * - Directory is read-only
 *
 * Exit code: 2 (IO_ERROR)
 */
export class PermissionError extends CliError {
  constructor(
    public readonly path: string,
    public readonly operation: 'read' | 'write',
    suggestion?: string
  ) {
    super(
      `Permission denied: cannot ${operation} ${path}`,
      ExitCodes.IO_ERROR,
      suggestion ?? 'Check file permissions and ownership'
    );
    this.name = 'PermissionError';
    Error.captureStackTrace?.(this, PermissionError);
  }
}

/**
 * Document parse error
 *
 * Thrown when:
 * - Markdown file has invalid frontmatter
 * - YAML parsing fails
 * - Document structure is malformed
 *
 * Exit code: 2 (IO_ERROR)
 */
export class ParseError extends CliError {
  constructor(
    public readonly path: string,
    public readonly reason: string,
    suggestion?: string
  ) {
    super(
      `Failed to parse ${path}: ${reason}`,
      ExitCodes.IO_ERROR,
      suggestion ?? 'Check the document format and fix any syntax errors'
    );
    this.name = 'ParseError';
    Error.captureStackTrace?.(this, ParseError);
  }
}

/**
 * Resource conflict error (application-level)
 *
 * Thrown when:
 * - Project ID already exists in registry
 * - Attempting to create duplicate resource
 * - Resource name/ID collision
 *
 * Exit code: 3 (RESOURCE_CONFLICT)
 */
export class ResourceConflictError extends CliError {
  constructor(
    public readonly resourceType: 'project' | 'document' | 'field',
    public readonly resourceId: string,
    suggestion?: string
  ) {
    super(
      `${capitalize(resourceType)} already exists: ${resourceId}`,
      ExitCodes.RESOURCE_CONFLICT,
      suggestion ?? `Use a different ID or remove the existing ${resourceType} first`
    );
    this.name = 'ResourceConflictError';
    Error.captureStackTrace?.(this, ResourceConflictError);
  }
}

/**
 * Resource not found error (application-level)
 *
 * Thrown when:
 * - Project ID doesn't exist in registry
 * - Document ID not found in project
 * - Referenced resource is missing
 *
 * Exit code: 4 (RESOURCE_NOT_FOUND)
 */
export class ResourceNotFoundError extends CliError {
  constructor(
    public readonly resourceType: 'project' | 'document' | 'field',
    public readonly resourceId: string,
    suggestion?: string
  ) {
    super(
      `${capitalize(resourceType)} not found: ${resourceId}`,
      ExitCodes.RESOURCE_NOT_FOUND,
      suggestion ?? `Run 'meatycapture list' to see available ${resourceType}s`
    );
    this.name = 'ResourceNotFoundError';
    Error.captureStackTrace?.(this, ResourceNotFoundError);
  }
}

/**
 * Command line syntax error
 *
 * Thrown when:
 * - Invalid flag or option provided
 * - Missing required argument
 * - Conflicting options used together
 *
 * Exit code: 64 (COMMAND_LINE_ERROR)
 */
export class CommandLineError extends CliError {
  constructor(message: string, suggestion?: string) {
    super(
      message,
      ExitCodes.COMMAND_LINE_ERROR,
      suggestion ?? "Run 'meatycapture --help' for usage information"
    );
    this.name = 'CommandLineError';
    Error.captureStackTrace?.(this, CommandLineError);
  }
}

/**
 * User interrupt error (Ctrl+C)
 *
 * Thrown when:
 * - User presses Ctrl+C during a prompt
 * - SIGINT signal received during operation
 *
 * Exit code: 130 (USER_INTERRUPTED)
 */
export class UserInterruptError extends CliError {
  constructor() {
    super('Operation cancelled', ExitCodes.USER_INTERRUPTED);
    this.name = 'UserInterruptError';
    Error.captureStackTrace?.(this, UserInterruptError);
  }
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Maximum error message length for clean terminal output
 */
const MAX_MESSAGE_LENGTH = 200;

/**
 * Truncate message to max length with ellipsis
 */
function truncateMessage(message: string): string {
  if (message.length <= MAX_MESSAGE_LENGTH) {
    return message;
  }
  return message.slice(0, MAX_MESSAGE_LENGTH - 3) + '...';
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format error for console output
 *
 * Produces consistent format:
 * ```
 * Error: <message>
 *   -> <suggestion>
 * ```
 *
 * @param error - Error to format
 * @returns Formatted error string for stderr
 */
export function formatError(error: CliError): string {
  const message = truncateMessage(error.message);
  let output = `Error: ${message}`;

  if (error.suggestion) {
    output += `\n  -> ${error.suggestion}`;
  }

  return output;
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Map unknown errors to CliError with appropriate exit code
 *
 * Handles:
 * - CliError subclasses (pass through)
 * - Node.js file system errors (ENOENT, EACCES, etc.)
 * - Generic Error instances
 * - Unknown thrown values
 *
 * @param error - Any thrown value
 * @param defaultExitCode - Fallback exit code for unmapped errors
 * @returns CliError with appropriate exit code and suggestion
 */
export function mapToCliError(
  error: unknown,
  defaultExitCode: ExitCode = ExitCodes.VALIDATION_ERROR
): CliError {
  // Already a CliError - return as-is
  if (error instanceof CliError) {
    return error;
  }

  // Handle Node.js file system errors
  if (isNodeError(error)) {
    switch (error.code) {
      case 'ENOENT':
        return new FileNotFoundError(error.path ?? 'unknown path');

      case 'EACCES':
      case 'EPERM':
        return new PermissionError(error.path ?? 'unknown path', 'read');

      case 'EROFS':
        return new PermissionError(
          error.path ?? 'unknown path',
          'write',
          'File system is read-only'
        );

      case 'ENOTDIR':
        return new ValidationError(
          `Not a directory: ${error.path ?? 'unknown'}`,
          'Provide a valid directory path'
        );

      case 'EISDIR':
        return new ValidationError(
          `Is a directory: ${error.path ?? 'unknown'}`,
          'Provide a file path, not a directory'
        );

      default:
        // Other I/O errors
        return new CliError(error.message || 'I/O error', ExitCodes.IO_ERROR);
    }
  }

  // Handle JSON parse errors
  if (error instanceof SyntaxError) {
    return new ValidationError(
      `Invalid JSON: ${error.message}`,
      'Check for missing commas, quotes, or brackets'
    );
  }

  // Generic Error
  if (error instanceof Error) {
    return new CliError(error.message, defaultExitCode);
  }

  // Unknown thrown value
  return new CliError(String(error), defaultExitCode);
}

/**
 * Type guard for Node.js system errors
 */
interface NodeError extends Error {
  code: string;
  path?: string;
  syscall?: string;
}

function isNodeError(error: unknown): error is NodeError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as NodeError).code === 'string'
  );
}

// ============================================================================
// Central Error Handler
// ============================================================================

/**
 * Global quiet mode flag
 * When true, suppresses non-error output
 */
let quietMode = false;

/**
 * Set quiet mode for CLI output
 * When enabled, only errors are written to stderr
 */
export function setQuietMode(enabled: boolean): void {
  quietMode = enabled;
}

/**
 * Check if quiet mode is enabled
 */
export function isQuietMode(): boolean {
  return quietMode;
}

/**
 * Central error handler - formats message and exits process
 *
 * This is the single exit point for all CLI errors.
 * Ensures consistent formatting and exit code behavior.
 *
 * @param error - Any error value
 * @param defaultExitCode - Fallback for unmapped errors (default: VALIDATION_ERROR)
 */
export function handleError(
  error: unknown,
  defaultExitCode: ExitCode = ExitCodes.VALIDATION_ERROR
): never {
  const cliError = mapToCliError(error, defaultExitCode);

  // Always write errors to stderr, even in quiet mode
  console.error(formatError(cliError));

  process.exit(cliError.exitCode);
}

// ============================================================================
// SIGINT Handler
// ============================================================================

/**
 * Flag to prevent duplicate handler registration
 */
let interruptHandlerRegistered = false;

/**
 * Setup SIGINT (Ctrl+C) handler for graceful interruption
 *
 * When user presses Ctrl+C:
 * 1. Prints cancellation message
 * 2. Exits with code 130 (128 + SIGINT)
 *
 * Safe to call multiple times - only registers once.
 */
export function setupInterruptHandler(): void {
  if (interruptHandlerRegistered) {
    return;
  }

  process.on('SIGINT', () => {
    // Print newline to clear partial input line
    console.error('');
    console.error('Cancelled');
    process.exit(ExitCodes.USER_INTERRUPTED);
  });

  interruptHandlerRegistered = true;
}

// ============================================================================
// Command Handler Wrapper
// ============================================================================

/**
 * Wrap async command handler with error handling
 *
 * Catches all errors, maps them to CLI errors, and exits with
 * appropriate exit code. Use this to wrap all command action handlers.
 *
 * @param handler - Async function implementing the command
 * @returns Wrapped function that handles errors and exits
 *
 * @example
 * ```typescript
 * program
 *   .command('create')
 *   .argument('<json-file>')
 *   .action(withErrorHandling(async (jsonFile, options) => {
 *     const input = await readInput(jsonFile);
 *     await createDocument(input);
 *     console.log('Created successfully');
 *   }));
 * ```
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T): Promise<void> => {
    try {
      await handler(...args);
    } catch (error) {
      handleError(error);
    }
  };
}

/**
 * Error factory for creating typed CLI errors
 *
 * Provides type-safe factory methods for creating specific error types.
 * Prefer direct class instantiation for simple cases; use this factory
 * when you want a consistent interface across error types.
 *
 * @example
 * ```typescript
 * throw createError.validation('Title is required', 'Add a title field');
 * throw createError.resource('project', 'my-project');
 * throw createError.file('/path/to/file.json');
 * ```
 */
export const createError = {
  /**
   * Create a validation error
   */
  validation(message: string, suggestion?: string): ValidationError {
    return new ValidationError(message, suggestion);
  },

  /**
   * Create a file not found error
   */
  file(path: string, suggestion?: string): FileNotFoundError {
    return new FileNotFoundError(path, suggestion);
  },

  /**
   * Create a permission error
   */
  permission(
    path: string,
    operation: 'read' | 'write',
    suggestion?: string
  ): PermissionError {
    return new PermissionError(path, operation, suggestion);
  },

  /**
   * Create a parse error
   */
  parse(path: string, reason: string, suggestion?: string): ParseError {
    return new ParseError(path, reason, suggestion);
  },

  /**
   * Create a resource conflict error
   */
  conflict(
    resourceType: 'project' | 'document' | 'field',
    resourceId: string,
    suggestion?: string
  ): ResourceConflictError {
    return new ResourceConflictError(resourceType, resourceId, suggestion);
  },

  /**
   * Create a resource not found error
   */
  resource(
    resourceType: 'project' | 'document' | 'field',
    resourceId: string,
    suggestion?: string
  ): ResourceNotFoundError {
    return new ResourceNotFoundError(resourceType, resourceId, suggestion);
  },

  /**
   * Create a command line error
   */
  cli(message: string, suggestion?: string): CommandLineError {
    return new CommandLineError(message, suggestion);
  },

  /**
   * Create a generic CLI error with custom exit code
   */
  generic(message: string, exitCode: ExitCode, suggestion?: string): CliError {
    return new CliError(message, exitCode, suggestion);
  },
};
