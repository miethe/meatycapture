/**
 * Logging Module Tests
 *
 * Tests for structured logger functionality:
 * - Log level filtering
 * - Configuration updates
 * - Console output routing
 * - Environment variable parsing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogLevel, parseLogLevel, createLogger } from './index';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore console methods
    consoleSpy.log.mockRestore();
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Log Level Filtering', () => {
    it('should filter logs below minimum level', () => {
      const logger = createLogger({ minLevel: LogLevel.WARN });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('should log all levels when minLevel is DEBUG', () => {
      const logger = createLogger({ minLevel: LogLevel.DEBUG });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Console Method Routing', () => {
    it('should route debug to console.log', () => {
      const logger = createLogger({ minLevel: LogLevel.DEBUG });

      logger.debug('test');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('should route info to console.info', () => {
      const logger = createLogger({ minLevel: LogLevel.INFO });

      logger.info('test');

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it('should route warn to console.warn', () => {
      const logger = createLogger({ minLevel: LogLevel.WARN });

      logger.warn('test');

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it('should route error to console.error', () => {
      const logger = createLogger({ minLevel: LogLevel.ERROR });

      logger.error('test');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Context Logging', () => {
    it('should include context in log output (pretty print)', () => {
      const logger = createLogger({
        minLevel: LogLevel.INFO,
        prettyPrint: true,
      });

      logger.info('test message', { foo: 'bar', baz: 42 });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO:'),
        'test message',
        { foo: 'bar', baz: 42 }
      );
    });

    it('should output JSON when prettyPrint is false', () => {
      const logger = createLogger({
        minLevel: LogLevel.INFO,
        prettyPrint: false,
      });

      logger.info('test message', { foo: 'bar' });

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"message":"test message"')
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('"context":{"foo":"bar"}')
      );
    });

    it('should handle logs without context', () => {
      const logger = createLogger({
        minLevel: LogLevel.INFO,
        prettyPrint: true,
      });

      logger.info('simple message');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('INFO:'),
        'simple message'
      );
    });
  });

  describe('Configuration', () => {
    it('should allow runtime configuration updates', () => {
      const logger = createLogger({ minLevel: LogLevel.ERROR });

      logger.info('should not log');
      expect(consoleSpy.info).not.toHaveBeenCalled();

      logger.configure({ minLevel: LogLevel.INFO });

      logger.info('should log');
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    });

    it('should return current configuration', () => {
      const logger = createLogger({
        minLevel: LogLevel.WARN,
        prettyPrint: false,
      });

      const config = logger.getConfig();

      expect(config.minLevel).toBe(LogLevel.WARN);
      expect(config.prettyPrint).toBe(false);
    });
  });

  describe('parseLogLevel', () => {
    it('should parse valid log level names', () => {
      expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('info')).toBe(LogLevel.INFO);
      expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
      expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
    });

    it('should be case insensitive', () => {
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('Info')).toBe(LogLevel.INFO);
      expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('ErRoR')).toBe(LogLevel.ERROR);
    });

    it('should default to INFO for invalid input', () => {
      expect(parseLogLevel('invalid')).toBe(LogLevel.INFO);
      expect(parseLogLevel('')).toBe(LogLevel.INFO);
      expect(parseLogLevel('trace')).toBe(LogLevel.INFO);
    });
  });

  describe('createLogger', () => {
    it('should create independent logger instances', () => {
      const logger1 = createLogger({ minLevel: LogLevel.DEBUG });
      const logger2 = createLogger({ minLevel: LogLevel.ERROR });

      logger1.debug('test');
      logger2.debug('test');

      // logger1 should log (DEBUG level)
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);

      logger1.error('test');
      logger2.error('test');

      // Both should log errors
      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });
  });
});
