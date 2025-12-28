---
title: Logging and Backup System
created: 2025-12-07
updated: 2025-12-07
status: implemented
---

# Logging and Backup System

## Overview

MeatyCapture implements a robust logging and backup system for file operations. This provides:

1. **Structured Logging** - JSON-formatted logs with configurable levels
2. **Automatic Backups** - File backups before write/append operations
3. **Error Recovery** - Failed writes preserve original files via backups

## Architecture

### Logging Module

Location: `/src/core/logging/index.ts`

The logging module provides a simple, zero-dependency structured logger suitable for both browser and Node.js environments.

#### Key Features

- **Four log levels**: debug, info, warn, error
- **Structured output**: JSON format with timestamp, level, message, context
- **Configurable filtering**: Set minimum log level to reduce noise
- **Environment-aware**: Reads log level from env variables
- **Browser-compatible**: Uses console methods (no fs writes)
- **Type-safe**: Full TypeScript types for all operations

#### Log Levels

| Level | Value | Usage |
|-------|-------|-------|
| DEBUG | 0 | Detailed diagnostic information for development |
| INFO | 1 | General informational messages about normal operation |
| WARN | 2 | Potentially problematic situations (non-blocking) |
| ERROR | 3 | Error conditions that prevent operation completion |

#### Log Entry Format

```typescript
{
  timestamp: string;     // ISO 8601 format
  level: string;         // 'debug' | 'info' | 'warn' | 'error'
  message: string;       // Primary log message
  context?: object;      // Additional structured data
}
```

### Backup Strategy

Location: `/src/adapters/fs-local/index.ts`

The fs-local adapter implements automatic file backups before write operations.

#### Backup Behavior

1. **Before write/append**: Create backup at `<filename>.bak`
2. **If write succeeds**: Backup remains for manual cleanup
3. **If write fails**: Original file intact, backup available for recovery
4. **Maximum 1 backup**: New backup overwrites old backup

#### When Backups Occur

- `write()` - Always creates backup if file exists
- `append()` - Creates backup before modification (via write)
- New files - No backup needed (file doesn't exist yet)

## Usage

### Basic Logging

```typescript
import { logger } from '@core/logging';

// Simple messages
logger.info('Operation completed');
logger.warn('Performance degraded');
logger.error('Operation failed');

// With structured context
logger.info('Document written', {
  path: '/path/to/doc.md',
  doc_id: 'REQ-20251207-app',
  item_count: 5,
  backup_created: true,
});

logger.error('Write failed', {
  path: '/path/to/doc.md',
  error: 'EACCES: permission denied',
});
```

### Custom Logger

```typescript
import { createLogger, LogLevel } from '@core/logging';

// Create logger with custom config
const debugLogger = createLogger({
  minLevel: LogLevel.DEBUG,
  prettyPrint: true,
});

debugLogger.debug('Detailed diagnostic info', {
  operation: 'parse',
  duration_ms: 42,
});
```

### Runtime Configuration

```typescript
import { logger, LogLevel } from '@core/logging';

// Update logger configuration at runtime
logger.configure({ minLevel: LogLevel.DEBUG });

// Check current configuration
const config = logger.getConfig();
console.log('Current log level:', config.minLevel);
```

### Environment Configuration

The logger reads configuration from environment variables:

**Browser (Vite):**
```bash
VITE_LOG_LEVEL=debug pnpm dev
```

**Node.js (tests, scripts):**
```bash
LOG_LEVEL=debug pnpm test
```

**Supported values:** `debug`, `info`, `warn`, `error` (case-insensitive)

### File Operations with Logging

The fs-local adapter automatically logs all operations:

```typescript
import { createFsDocStore } from '@adapters/fs-local';

const store = createFsDocStore();

// Logs: "Reading document" (debug), "Document read successfully" (info)
const doc = await store.read('/path/to/doc.md');

// Logs: "Writing document" (debug), "Backup created" (debug),
//       "Document written successfully" (info)
await store.write('/path/to/doc.md', updatedDoc);

// Logs: "Appending item" (debug), [read/write logs],
//       "Item appended successfully" (info)
await store.append('/path/to/doc.md', newItem, clock);
```

## Logged Operations

### DocStore Operations

| Operation | Logs Generated |
|-----------|----------------|
| `list()` | debug: Listing, Found files; info: Listed successfully |
| `read()` | debug: Reading; info: Read successfully; error: Not found/Failed |
| `write()` | debug: Writing, Backup created; info: Written successfully; error: Failed |
| `append()` | debug: Appending; info: Appended successfully; error: Failed |
| `backup()` | debug: Creating backup; info: Created successfully; error: Failed |
| `isWritable()` | debug: Checking, result (writable/not writable) |

### Context Fields

Common context fields included in logs:

- `path` - File or directory path
- `doc_id` - Document identifier
- `item_count` - Number of items in document
- `item_id` - Individual item identifier
- `item_type` - Item type (enhancement, bug, etc.)
- `backup` - Backup file path
- `backup_created` - Boolean indicating backup creation
- `error` - Error message from caught exceptions
- `count` - Count of items (files, documents, etc.)

## Log Output Modes

### Pretty Print (Development)

Default for development (`NODE_ENV !== 'production'`):

```
[2025-12-07T15:30:45.123Z] INFO: Document written successfully {
  path: '/path/to/doc.md',
  doc_id: 'REQ-20251207-app',
  item_count: 5,
  backup_created: true
}
```

### JSON (Production)

Enabled when `prettyPrint: false`:

```json
{"timestamp":"2025-12-07T15:30:45.123Z","level":"info","message":"Document written successfully","context":{"path":"/path/to/doc.md","doc_id":"REQ-20251207-app","item_count":5,"backup_created":true}}
```

## Error Handling

### Backup Failures

If backup creation fails, the write operation is aborted:

```typescript
try {
  await store.write('/path/to/doc.md', doc);
} catch (error) {
  // Original file remains intact
  // Error logged with context
  // Exception thrown to caller
}
```

### Parse Failures

Non-request-log files are skipped during `list()` with warnings:

```typescript
// Logs: warn: "Skipping file - parse failed"
// Does not throw - returns partial results
const docs = await store.list('/path/to/docs');
```

### Read Failures

Missing files or parse errors throw with detailed logging:

```typescript
try {
  const doc = await store.read('/nonexistent.md');
} catch (error) {
  // Logs: error: "Document not found"
  // Exception thrown to caller
}
```

## Testing

### Logger Tests

Location: `/src/core/logging/logging.test.ts`

Tests cover:
- Log level filtering
- Console method routing
- Context logging
- Configuration updates
- Environment parsing

Run tests:
```bash
pnpm test src/core/logging/logging.test.ts
```

### Demo Script

Location: `/src/core/logging/demo.ts`

Interactive demonstration of logging features:

```bash
pnpm tsx src/core/logging/demo.ts
```

## Best Practices

### When to Log

**DO log:**
- File I/O operations (read, write, append)
- Backup creation
- Parse failures (warnings)
- Error conditions
- Important state changes

**DON'T log:**
- Every function call (too verbose)
- User input (privacy concerns)
- Secrets or credentials
- High-frequency operations (performance)

### Log Levels Guide

**DEBUG:**
- Detailed operation flow
- File paths and sizes
- Intermediate state
- Development diagnostics

**INFO:**
- Operation start/completion
- Success confirmations
- Summary statistics
- Normal business events

**WARN:**
- Skipped files
- Degraded performance
- Recoverable errors
- Configuration issues

**ERROR:**
- Operation failures
- Missing files
- Permission denied
- Unrecoverable errors

### Context Best Practices

**Good context:**
```typescript
logger.info('Document written', {
  path: '/path/to/doc.md',
  doc_id: 'REQ-20251207-app',
  item_count: 5,
  backup_created: true,
});
```

**Bad context:**
```typescript
// Too vague
logger.info('Success');

// Too verbose
logger.info('Operation', {
  entire_document: doc,  // Huge object
  all_items: items,      // Large array
  buffer: fileBuffer,    // Binary data
});
```

## Performance Considerations

### Log Filtering

Logs below minimum level are filtered early (before JSON serialization):

```typescript
// No overhead if level < minLevel
logger.debug('Expensive operation', {
  result: expensiveCalculation(),  // Never called if DEBUG filtered
});
```

### Production Configuration

For production, use:
- `minLevel: LogLevel.WARN` or `LogLevel.ERROR`
- `prettyPrint: false` (JSON output)
- Forward logs to logging service (future enhancement)

### Backup Performance

Backup creation uses `fs.copyFile()` which is optimized for:
- Large files (streaming copy)
- Same filesystem (fast copy)
- Atomic operation (no corruption)

Typical overhead: 1-5ms for small markdown files (<100KB)

## Future Enhancements

Potential improvements not in MVP:

1. **Log Transport** - Send logs to external service (e.g., Sentry, LogRocket)
2. **Log Rotation** - Automatic backup cleanup after N days
3. **Structured Errors** - Error classes with context preservation
4. **Performance Tracing** - Timing information for operations
5. **Audit Trail** - Track who changed what and when

## Related Documentation

- [File System Adapter](/docs/adapters/fs-local.md)
- [Error Handling Strategy](/docs/error-handling.md)
- [Testing Guide](/docs/testing.md)
