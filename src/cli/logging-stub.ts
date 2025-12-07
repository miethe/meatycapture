/**
 * Logging Stub for CLI
 *
 * Minimal logger implementation that matches the interface of @core/logging
 * but doesn't depend on Vite-specific features like import.meta.env.
 *
 * This stub is used only in CLI builds via tsconfig path alias.
 * The main application uses the full logging module from @core/logging.
 */

/**
 * Log levels (matching core logging module)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Simple console logger for CLI
 *
 * Logs warnings and errors to stderr.
 * Debug and info logs are silent by default to avoid polluting CLI output.
 */
export const logger = {
  debug(_message: string, _context?: Record<string, unknown>): void {
    // Silent in CLI mode
  },

  info(_message: string, _context?: Record<string, unknown>): void {
    // Silent in CLI mode
  },

  warn(message: string, context?: Record<string, unknown>): void {
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console.error(`WARN: ${message}${contextStr}`);
  },

  error(message: string, context?: Record<string, unknown>): void {
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console.error(`ERROR: ${message}${contextStr}`);
  },
};
