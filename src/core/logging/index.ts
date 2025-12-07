/**
 * Logging Module
 *
 * Simple structured logger for MeatyCapture operations.
 * No external dependencies - uses console methods in browser environment.
 *
 * Features:
 * - Four log levels: debug, info, warn, error
 * - Structured JSON output with timestamp, level, message, context
 * - Configurable log level filtering
 * - Type-safe context objects
 * - Browser-compatible (console.log/warn/error)
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Log level names for display and configuration
 */
export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry format
 * All logs include timestamp, level, message, and optional context
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level name */
  level: LogLevelName;
  /** Primary log message */
  message: string;
  /** Additional structured context data */
  context?: Record<string, unknown>;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum level to log (filters out lower severity) */
  minLevel: LogLevel;
  /** Enable pretty-printing in development (false for JSON in production) */
  prettyPrint: boolean;
}

/**
 * Default logger configuration
 * Can be overridden via environment variables or explicit config
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  prettyPrint: typeof process !== 'undefined' && process.env.NODE_ENV !== 'production',
};

/**
 * Logger class providing structured logging with level filtering
 *
 * Design decisions:
 * - Singleton pattern for consistent configuration across app
 * - Browser-compatible (no fs writes, just console)
 * - Zero dependencies beyond TypeScript stdlib
 * - JSON-serializable for future transport to logging service
 *
 * @example
 * ```typescript
 * import { logger } from '@core/logging';
 *
 * logger.info('Document written', { path: '/path/to/doc.md', size: 1024 });
 * logger.error('Write failed', { path: '/path/to/doc.md', error: err.message });
 * ```
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update logger configuration at runtime
   * Useful for dynamic log level changes
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current logger configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Log at DEBUG level
   * Used for detailed diagnostic information during development
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'debug', message, context);
  }

  /**
   * Log at INFO level
   * Used for general informational messages about normal operation
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'info', message, context);
  }

  /**
   * Log at WARN level
   * Used for potentially problematic situations that don't prevent operation
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'warn', message, context);
  }

  /**
   * Log at ERROR level
   * Used for error conditions that prevent operation from completing
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'error', message, context);
  }

  /**
   * Internal log method that handles filtering, formatting, and output
   * Routes to appropriate console method based on level
   */
  private log(
    level: LogLevel,
    levelName: LogLevelName,
    message: string,
    context?: Record<string, unknown>
  ): void {
    // Filter based on configured minimum level
    if (level < this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      ...(context && { context }),
    };

    // Output to console based on level
    if (this.config.prettyPrint) {
      // Pretty print for development
      const prefix = `[${entry.timestamp}] ${entry.level.toUpperCase()}:`;
      const logFn = this.getConsoleFn(levelName);

      if (context) {
        logFn(prefix, message, context);
      } else {
        logFn(prefix, message);
      }
    } else {
      // JSON output for production
      const logFn = this.getConsoleFn(levelName);
      logFn(JSON.stringify(entry));
    }
  }

  /**
   * Map log level to appropriate console method
   * Ensures colored output in browser dev tools
   */
  private getConsoleFn(level: LogLevelName): typeof console.log {
    switch (level) {
      case 'debug':
        return console.log;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
    }
  }
}

/**
 * Parse log level from string name
 * Used for environment variable configuration
 */
export function parseLogLevel(levelName: string): LogLevel {
  const normalized = levelName.toLowerCase();

  switch (normalized) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'info':
      return LogLevel.INFO;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Get log level from environment variable or default
 * Supports both browser (Vite env) and Node (process.env)
 */
function getEnvLogLevel(): LogLevel {
  // Check Node environment variable (for tests, scripts, etc.)
  if (typeof process !== 'undefined' && process.env.LOG_LEVEL) {
    return parseLogLevel(process.env.LOG_LEVEL);
  }

  // Check Vite environment variable (browser build)
  // This is safe - Vite will replace import.meta.env at build time
  if (import.meta.env?.VITE_LOG_LEVEL) {
    return parseLogLevel(import.meta.env.VITE_LOG_LEVEL);
  }

  return LogLevel.INFO;
}

/**
 * Singleton logger instance
 * Configured from environment variables on initialization
 *
 * Environment variables:
 * - VITE_LOG_LEVEL or LOG_LEVEL: debug | info | warn | error
 * - NODE_ENV: production disables pretty printing
 */
export const logger = new Logger({
  minLevel: getEnvLogLevel(),
});

/**
 * Create a new logger instance with custom configuration
 * Useful for testing or isolated components
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
