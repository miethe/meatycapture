/**
 * CLI Exit Codes
 *
 * Standardized exit codes for scripting compatibility.
 * Follows Unix conventions with extended codes for specific error categories.
 *
 * Exit code ranges:
 * - 0: Success
 * - 1-63: Application errors (validation, logic, resources)
 * - 64-78: Command line usage errors (BSD sysexits.h)
 * - 126-128: Shell reserved (permission, command not found)
 * - 130+: Signal-based exits (128 + signal number)
 */

/**
 * Exit code constants
 *
 * These values enable scripting tools to distinguish between error types
 * without parsing error messages. Common pattern:
 *
 * ```bash
 * meatycapture create input.json
 * case $? in
 *   0) echo "Success" ;;
 *   1) echo "Invalid input - check JSON format" ;;
 *   2) echo "File system error - check paths" ;;
 *   3) echo "Resource not found - check project/doc exists" ;;
 *   64) echo "Command syntax error - run --help" ;;
 *   130) echo "Cancelled by user" ;;
 * esac
 * ```
 */
export const ExitCodes = {
  /**
   * Command completed successfully
   */
  SUCCESS: 0,

  /**
   * Validation or logic error
   * Examples: Invalid JSON, missing required field, malformed data
   */
  VALIDATION_ERROR: 1,

  /**
   * I/O or file system error
   * Examples: File not found, permission denied, parse failure
   */
  IO_ERROR: 2,

  /**
   * Resource not found (application-level)
   * Examples: Project doesn't exist, document not registered
   */
  RESOURCE_NOT_FOUND: 3,

  /**
   * Command line usage error (BSD sysexits.h EX_USAGE)
   * Examples: Invalid flag, missing required argument, bad syntax
   */
  COMMAND_LINE_ERROR: 64,

  /**
   * User interrupted execution (128 + SIGINT)
   * Triggered by Ctrl+C during prompts or long operations
   */
  USER_INTERRUPTED: 130,
} as const;

/**
 * Type representing valid exit code values
 */
export type ExitCode = (typeof ExitCodes)[keyof typeof ExitCodes];

/**
 * Human-readable descriptions for exit codes
 * Used in help output and debugging
 */
export const ExitCodeDescriptions: Record<ExitCode, string> = {
  [ExitCodes.SUCCESS]: 'Command completed successfully',
  [ExitCodes.VALIDATION_ERROR]: 'Validation or input error',
  [ExitCodes.IO_ERROR]: 'File system or I/O error',
  [ExitCodes.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ExitCodes.COMMAND_LINE_ERROR]: 'Invalid command line usage',
  [ExitCodes.USER_INTERRUPTED]: 'User interrupted',
};

/**
 * Check if an exit code indicates success
 */
export function isSuccessCode(code: number): code is typeof ExitCodes.SUCCESS {
  return code === ExitCodes.SUCCESS;
}

/**
 * Check if an exit code indicates a user-recoverable error
 * (validation, resource not found, command line errors)
 */
export function isUserError(code: number): boolean {
  return (
    code === ExitCodes.VALIDATION_ERROR ||
    code === ExitCodes.RESOURCE_NOT_FOUND ||
    code === ExitCodes.COMMAND_LINE_ERROR
  );
}
