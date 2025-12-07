/**
 * Logging Module Demo
 *
 * Quick demonstration of the logging functionality.
 * Run with: pnpm tsx src/core/logging/demo.ts
 */

import { logger, createLogger, LogLevel } from './index';

console.log('=== Logging Module Demo ===\n');

// Default logger (INFO level)
console.log('1. Default logger (INFO level):');
logger.debug('This debug message will not appear');
logger.info('This info message will appear');
logger.warn('This warning message will appear');
logger.error('This error message will appear');

console.log('\n2. Logger with context:');
logger.info('Document written successfully', {
  path: '/path/to/doc.md',
  doc_id: 'REQ-20251207-test',
  item_count: 3,
  backup_created: true,
});

console.log('\n3. Error logging with context:');
logger.error('Failed to write document', {
  path: '/path/to/doc.md',
  error: 'EACCES: permission denied',
});

console.log('\n4. Custom logger (DEBUG level):');
const debugLogger = createLogger({ minLevel: LogLevel.DEBUG });
debugLogger.debug('This debug message will appear');
debugLogger.info('This info message will appear');

console.log('\n5. Runtime configuration change:');
logger.configure({ minLevel: LogLevel.DEBUG });
logger.debug('Now debug messages appear!');

console.log('\n6. JSON output (production mode):');
const prodLogger = createLogger({
  minLevel: LogLevel.INFO,
  prettyPrint: false,
});
prodLogger.info('Machine-readable JSON output', {
  operation: 'backup',
  duration_ms: 42,
});

console.log('\n=== Demo Complete ===');
