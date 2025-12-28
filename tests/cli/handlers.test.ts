/**
 * CLI Handlers Unit Tests
 *
 * Tests for:
 * - stdin: File vs stdin detection, timeout handling, encoding
 * - errors: Error classification, exit code mapping, error formatting
 * - exitCodes: Exit code constants and utilities
 * - search: Query parsing, matching logic, context extraction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  createTempDir,
  cleanupTempDir,
  createMockDoc,
  createMockItem,
  mockConsole,
  restoreConsole,
  clearCapturedOutput,
} from './helpers';

// Stdin Handler
import {
  isStdinInput,
  isStdinAvailable,
  readInput,
  StdinError,
} from '@cli/handlers/stdin';

// Error Handler
import {
  CliError,
  ValidationError,
  FileNotFoundError,
  PermissionError,
  ParseError,
  ResourceNotFoundError,
  CommandLineError,
  UserInterruptError,
  formatError,
  mapToCliError,
  withErrorHandling,
  setQuietMode,
  isQuietMode,
  createError,
} from '@cli/handlers/errors';

// Exit Codes
import {
  ExitCodes,
  ExitCodeDescriptions,
  isSuccessCode,
  isUserError,
} from '@cli/handlers/exitCodes';

// Search Handler
import {
  parseQuery,
  parseMatchMode,
  searchDocument,
  searchDocuments,
  DEFAULT_SEARCH_OPTIONS,
} from '@cli/handlers/search';

describe('Stdin Handler', () => {
  describe('isStdinInput', () => {
    it('should return true for "-"', () => {
      expect(isStdinInput('-')).toBe(true);
    });

    it('should return false for file paths', () => {
      expect(isStdinInput('./file.json')).toBe(false);
      expect(isStdinInput('data.json')).toBe(false);
      expect(isStdinInput('/absolute/path.json')).toBe(false);
    });

    it('should return false for "--" (different from "-")', () => {
      expect(isStdinInput('--')).toBe(false);
    });
  });

  describe('isStdinAvailable', () => {
    it('should detect if stdin is TTY', () => {
      // In test environment, this depends on how tests are run
      // We just verify it returns a boolean
      const result = isStdinAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('readInput - file mode', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it('should read content from file', async () => {
      const content = '{"test": "data"}';
      const filePath = join(tempDir, 'test.json');
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await readInput(filePath);
      expect(result).toBe(content);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = join(tempDir, 'nonexistent.json');

      await expect(readInput(filePath)).rejects.toThrow('not found');
    });

    it('should throw error for directory path', async () => {
      await expect(readInput(tempDir)).rejects.toThrow('directory');
    });

    it('should read with specified encoding', async () => {
      const content = 'Hello World';
      const filePath = join(tempDir, 'test.txt');
      await fs.writeFile(filePath, content, 'utf-8');

      const result = await readInput(filePath, { encoding: 'utf-8' });
      expect(result).toBe(content);
    });
  });

  describe('StdinError', () => {
    it('should have name and code properties', () => {
      const error = new StdinError('Test message', 'TIMEOUT');

      expect(error.name).toBe('StdinError');
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe('Test message');
    });

    it('should support all error codes', () => {
      const codes = ['NOT_PIPED', 'TIMEOUT', 'INVALID_ENCODING', 'PIPE_BROKEN', 'READ_ERROR'];

      for (const code of codes) {
        const error = new StdinError('Test', code as any);
        expect(error.code).toBe(code);
      }
    });
  });
});

describe('Error Handler', () => {
  beforeEach(() => {
    setQuietMode(false);
    mockConsole();
  });

  afterEach(() => {
    restoreConsole();
    clearCapturedOutput();
  });

  describe('Error Classes', () => {
    describe('CliError', () => {
      it('should store exit code and suggestion', () => {
        const error = new CliError('Test message', ExitCodes.VALIDATION_ERROR, 'Try this');

        expect(error.message).toBe('Test message');
        expect(error.exitCode).toBe(ExitCodes.VALIDATION_ERROR);
        expect(error.suggestion).toBe('Try this');
        expect(error.name).toBe('CliError');
      });

      it('should work without suggestion', () => {
        const error = new CliError('Test', ExitCodes.IO_ERROR);

        expect(error.suggestion).toBeUndefined();
      });
    });

    describe('ValidationError', () => {
      it('should have VALIDATION_ERROR exit code', () => {
        const error = new ValidationError('Invalid input');

        expect(error.exitCode).toBe(ExitCodes.VALIDATION_ERROR);
        expect(error.name).toBe('ValidationError');
      });

      it('should provide default suggestion', () => {
        const error = new ValidationError('Invalid input');

        expect(error.suggestion).toBeDefined();
        expect(error.suggestion).toContain('input format');
      });

      it('should accept custom suggestion', () => {
        const error = new ValidationError('Invalid input', 'Custom suggestion');

        expect(error.suggestion).toBe('Custom suggestion');
      });
    });

    describe('FileNotFoundError', () => {
      it('should have IO_ERROR exit code', () => {
        const error = new FileNotFoundError('/path/to/file');

        expect(error.exitCode).toBe(ExitCodes.IO_ERROR);
        expect(error.name).toBe('FileNotFoundError');
        expect(error.path).toBe('/path/to/file');
      });

      it('should include path in message', () => {
        const error = new FileNotFoundError('/test/path.md');

        expect(error.message).toContain('/test/path.md');
      });
    });

    describe('PermissionError', () => {
      it('should include operation type', () => {
        const readError = new PermissionError('/path', 'read');
        const writeError = new PermissionError('/path', 'write');

        expect(readError.operation).toBe('read');
        expect(readError.message).toContain('read');
        expect(writeError.operation).toBe('write');
        expect(writeError.message).toContain('write');
      });

      it('should have IO_ERROR exit code', () => {
        const error = new PermissionError('/path', 'read');

        expect(error.exitCode).toBe(ExitCodes.IO_ERROR);
      });
    });

    describe('ParseError', () => {
      it('should include path and reason', () => {
        const error = new ParseError('/doc.md', 'Missing frontmatter');

        expect(error.path).toBe('/doc.md');
        expect(error.reason).toBe('Missing frontmatter');
        expect(error.message).toContain('/doc.md');
        expect(error.message).toContain('Missing frontmatter');
      });

      it('should have IO_ERROR exit code', () => {
        const error = new ParseError('/doc.md', 'Parse failed');

        expect(error.exitCode).toBe(ExitCodes.IO_ERROR);
      });
    });

    describe('ResourceNotFoundError', () => {
      it('should include resource type and ID', () => {
        const error = new ResourceNotFoundError('project', 'my-project');

        expect(error.resourceType).toBe('project');
        expect(error.resourceId).toBe('my-project');
        expect(error.message).toContain('Project');
        expect(error.message).toContain('my-project');
      });

      it('should have RESOURCE_NOT_FOUND exit code', () => {
        const error = new ResourceNotFoundError('document', 'doc-id');

        expect(error.exitCode).toBe(ExitCodes.RESOURCE_NOT_FOUND);
      });

      it('should support document and field types', () => {
        const docError = new ResourceNotFoundError('document', 'doc-id');
        const fieldError = new ResourceNotFoundError('field', 'field-id');

        expect(docError.message).toContain('Document');
        expect(fieldError.message).toContain('Field');
      });
    });

    describe('CommandLineError', () => {
      it('should have COMMAND_LINE_ERROR exit code', () => {
        const error = new CommandLineError('Invalid flag');

        expect(error.exitCode).toBe(ExitCodes.COMMAND_LINE_ERROR);
        expect(error.name).toBe('CommandLineError');
      });
    });

    describe('UserInterruptError', () => {
      it('should have USER_INTERRUPTED exit code', () => {
        const error = new UserInterruptError();

        expect(error.exitCode).toBe(ExitCodes.USER_INTERRUPTED);
        expect(error.message).toBe('Operation cancelled');
      });
    });
  });

  describe('formatError', () => {
    it('should format error with message', () => {
      const error = new ValidationError('Test error message');
      const output = formatError(error);

      expect(output).toContain('Error:');
      expect(output).toContain('Test error message');
    });

    it('should include suggestion when present', () => {
      const error = new ValidationError('Test error', 'Try this instead');
      const output = formatError(error);

      expect(output).toContain('->');
      expect(output).toContain('Try this instead');
    });

    it('should truncate long messages', () => {
      const longMessage = 'A'.repeat(300);
      const error = new CliError(longMessage, ExitCodes.VALIDATION_ERROR);
      const output = formatError(error);

      expect(output.length).toBeLessThan(350);
      expect(output).toContain('...');
    });
  });

  describe('mapToCliError', () => {
    it('should pass through CliError subclasses', () => {
      const original = new ValidationError('Test');
      const mapped = mapToCliError(original);

      expect(mapped).toBe(original);
    });

    it('should map ENOENT to FileNotFoundError', () => {
      const nodeError = Object.assign(new Error('File not found'), {
        code: 'ENOENT',
        path: '/test/path',
      });
      const mapped = mapToCliError(nodeError);

      expect(mapped).toBeInstanceOf(FileNotFoundError);
      expect(mapped.exitCode).toBe(ExitCodes.IO_ERROR);
    });

    it('should map EACCES to PermissionError', () => {
      const nodeError = Object.assign(new Error('Permission denied'), {
        code: 'EACCES',
        path: '/test/path',
      });
      const mapped = mapToCliError(nodeError);

      expect(mapped).toBeInstanceOf(PermissionError);
    });

    it('should map EPERM to PermissionError', () => {
      const nodeError = Object.assign(new Error('Not permitted'), {
        code: 'EPERM',
        path: '/test/path',
      });
      const mapped = mapToCliError(nodeError);

      expect(mapped).toBeInstanceOf(PermissionError);
    });

    it('should map SyntaxError to ValidationError', () => {
      const jsonError = new SyntaxError('Unexpected token');
      const mapped = mapToCliError(jsonError);

      expect(mapped).toBeInstanceOf(ValidationError);
      expect(mapped.message).toContain('JSON');
    });

    it('should wrap generic Error', () => {
      const genericError = new Error('Something went wrong');
      const mapped = mapToCliError(genericError);

      expect(mapped).toBeInstanceOf(CliError);
      expect(mapped.message).toBe('Something went wrong');
    });

    it('should handle non-Error values', () => {
      const mapped = mapToCliError('string error');

      expect(mapped).toBeInstanceOf(CliError);
      expect(mapped.message).toBe('string error');
    });

    it('should use custom default exit code', () => {
      const error = new Error('Test');
      const mapped = mapToCliError(error, ExitCodes.IO_ERROR);

      expect(mapped.exitCode).toBe(ExitCodes.IO_ERROR);
    });
  });

  describe('setQuietMode / isQuietMode', () => {
    it('should track quiet mode state', () => {
      setQuietMode(false);
      expect(isQuietMode()).toBe(false);

      setQuietMode(true);
      expect(isQuietMode()).toBe(true);

      setQuietMode(false);
      expect(isQuietMode()).toBe(false);
    });
  });

  describe('withErrorHandling', () => {
    it('should call handler normally on success', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandling(handler);

      await wrapped('arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should catch and handle errors', async () => {
      const handler = vi.fn().mockRejectedValue(new ValidationError('Test error'));
      const wrapped = withErrorHandling(handler);

      // handleError calls process.exit, which we need to mock
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit');
      });

      await expect(wrapped()).rejects.toThrow('exit');

      expect(mockExit).toHaveBeenCalledWith(ExitCodes.VALIDATION_ERROR);
      mockExit.mockRestore();
    });
  });

  describe('createError factory', () => {
    it('should create ValidationError', () => {
      const error = createError.validation('Invalid input', 'Fix it');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.suggestion).toBe('Fix it');
    });

    it('should create FileNotFoundError', () => {
      const error = createError.file('/path/to/file');

      expect(error).toBeInstanceOf(FileNotFoundError);
      expect(error.path).toBe('/path/to/file');
    });

    it('should create PermissionError', () => {
      const error = createError.permission('/path', 'write', 'Check permissions');

      expect(error).toBeInstanceOf(PermissionError);
      expect(error.path).toBe('/path');
      expect(error.operation).toBe('write');
    });

    it('should create ParseError', () => {
      const error = createError.parse('/doc.md', 'Invalid YAML');

      expect(error).toBeInstanceOf(ParseError);
      expect(error.path).toBe('/doc.md');
      expect(error.reason).toBe('Invalid YAML');
    });

    it('should create ResourceNotFoundError', () => {
      const error = createError.resource('project', 'my-project');

      expect(error).toBeInstanceOf(ResourceNotFoundError);
      expect(error.resourceType).toBe('project');
      expect(error.resourceId).toBe('my-project');
    });

    it('should create CommandLineError', () => {
      const error = createError.cli('Invalid flag');

      expect(error).toBeInstanceOf(CommandLineError);
    });

    it('should create generic CliError', () => {
      const error = createError.generic('Custom error', ExitCodes.IO_ERROR);

      expect(error).toBeInstanceOf(CliError);
      expect(error.exitCode).toBe(ExitCodes.IO_ERROR);
    });
  });
});

describe('Exit Codes', () => {
  describe('ExitCodes constants', () => {
    it('should define SUCCESS as 0', () => {
      expect(ExitCodes.SUCCESS).toBe(0);
    });

    it('should define VALIDATION_ERROR as 1', () => {
      expect(ExitCodes.VALIDATION_ERROR).toBe(1);
    });

    it('should define IO_ERROR as 2', () => {
      expect(ExitCodes.IO_ERROR).toBe(2);
    });

    it('should define RESOURCE_CONFLICT as 3', () => {
      expect(ExitCodes.RESOURCE_CONFLICT).toBe(3);
    });

    it('should define RESOURCE_NOT_FOUND as 4', () => {
      expect(ExitCodes.RESOURCE_NOT_FOUND).toBe(4);
    });

    it('should define COMMAND_LINE_ERROR as 64', () => {
      expect(ExitCodes.COMMAND_LINE_ERROR).toBe(64);
    });

    it('should define USER_INTERRUPTED as 130', () => {
      expect(ExitCodes.USER_INTERRUPTED).toBe(130);
    });
  });

  describe('ExitCodeDescriptions', () => {
    it('should have descriptions for all exit codes', () => {
      expect(ExitCodeDescriptions[ExitCodes.SUCCESS]).toBeDefined();
      expect(ExitCodeDescriptions[ExitCodes.VALIDATION_ERROR]).toBeDefined();
      expect(ExitCodeDescriptions[ExitCodes.IO_ERROR]).toBeDefined();
      expect(ExitCodeDescriptions[ExitCodes.RESOURCE_CONFLICT]).toBeDefined();
      expect(ExitCodeDescriptions[ExitCodes.RESOURCE_NOT_FOUND]).toBeDefined();
      expect(ExitCodeDescriptions[ExitCodes.COMMAND_LINE_ERROR]).toBeDefined();
      expect(ExitCodeDescriptions[ExitCodes.USER_INTERRUPTED]).toBeDefined();
    });
  });

  describe('isSuccessCode', () => {
    it('should return true for 0', () => {
      expect(isSuccessCode(0)).toBe(true);
    });

    it('should return false for non-zero', () => {
      expect(isSuccessCode(1)).toBe(false);
      expect(isSuccessCode(2)).toBe(false);
      expect(isSuccessCode(130)).toBe(false);
    });
  });

  describe('isUserError', () => {
    it('should return true for user-recoverable errors', () => {
      expect(isUserError(ExitCodes.VALIDATION_ERROR)).toBe(true);
      expect(isUserError(ExitCodes.RESOURCE_NOT_FOUND)).toBe(true);
      expect(isUserError(ExitCodes.COMMAND_LINE_ERROR)).toBe(true);
    });

    it('should return false for non-user errors', () => {
      expect(isUserError(ExitCodes.SUCCESS)).toBe(false);
      expect(isUserError(ExitCodes.IO_ERROR)).toBe(false);
      expect(isUserError(ExitCodes.USER_INTERRUPTED)).toBe(false);
    });
  });
});

describe('Search Handler', () => {
  describe('parseQuery', () => {
    it('should parse plain text as text component', () => {
      const components = parseQuery('login bug');

      expect(components).toHaveLength(2);
      expect(components[0]).toEqual({ type: 'text', value: 'login' });
      expect(components[1]).toEqual({ type: 'text', value: 'bug' });
    });

    it('should parse tag: prefix', () => {
      const components = parseQuery('tag:api');

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'tag', value: 'api' });
    });

    it('should parse tags: prefix (plural)', () => {
      const components = parseQuery('tags:ux');

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'tag', value: 'ux' });
    });

    it('should parse type: prefix', () => {
      const components = parseQuery('type:enhancement');

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'item_type', value: 'enhancement' });
    });

    it('should parse status: prefix', () => {
      const components = parseQuery('status:triage');

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'status', value: 'triage' });
    });

    it('should parse mixed query components', () => {
      const components = parseQuery('tag:api login type:bug');

      expect(components).toHaveLength(3);
      expect(components[0]).toEqual({ type: 'tag', value: 'api' });
      expect(components[1]).toEqual({ type: 'text', value: 'login' });
      expect(components[2]).toEqual({ type: 'item_type', value: 'bug' });
    });

    it('should handle quoted strings', () => {
      const components = parseQuery('"multi word query"');

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'text', value: 'multi word query' });
    });

    it('should handle single quotes', () => {
      const components = parseQuery("'another phrase'");

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'text', value: 'another phrase' });
    });

    it('should return empty array for empty query', () => {
      expect(parseQuery('')).toEqual([]);
      expect(parseQuery('   ')).toEqual([]);
    });

    it('should preserve case in values', () => {
      const components = parseQuery('tag:API type:BUG');

      expect(components[0]?.value).toBe('API');
      expect(components[1]?.value).toBe('BUG');
    });

    it('should ignore empty prefix values', () => {
      const components = parseQuery('tag: type:bug');

      expect(components).toHaveLength(1);
      expect(components[0]).toEqual({ type: 'item_type', value: 'bug' });
    });
  });

  describe('parseMatchMode', () => {
    it('should return "contains" as default', () => {
      expect(parseMatchMode(undefined)).toBe('contains');
      expect(parseMatchMode('')).toBe('contains');
    });

    it('should parse valid modes', () => {
      expect(parseMatchMode('full')).toBe('full');
      expect(parseMatchMode('starts')).toBe('starts');
      expect(parseMatchMode('contains')).toBe('contains');
    });

    it('should be case-insensitive', () => {
      expect(parseMatchMode('FULL')).toBe('full');
      expect(parseMatchMode('Starts')).toBe('starts');
      expect(parseMatchMode('CONTAINS')).toBe('contains');
    });

    it('should default to contains for invalid modes', () => {
      expect(parseMatchMode('invalid')).toBe('contains');
      expect(parseMatchMode('partial')).toBe('contains');
    });
  });

  describe('searchDocument', () => {
    it('should find text matches in title', () => {
      const doc = createMockDoc({
        items: [createMockItem({ title: 'Login bug fix' })],
      });
      const components = parseQuery('login');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.matched_fields[0]?.field).toBe('title');
    });

    it('should find text matches in notes', () => {
      const doc = createMockDoc({
        items: [createMockItem({ notes: 'Fix the login form validation' })],
      });
      const components = parseQuery('validation');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.matched_fields[0]?.field).toBe('notes');
    });

    it('should find tag matches', () => {
      const doc = createMockDoc({
        items: [createMockItem({ tags: ['api', 'ux', 'enhancement'] })],
      });
      const components = parseQuery('tag:api');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.matched_fields[0]?.field).toBe('tags');
    });

    it('should find type matches', () => {
      const doc = createMockDoc({
        items: [createMockItem({ type: 'enhancement' })],
      });
      const components = parseQuery('type:enhancement');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.matched_fields[0]?.field).toBe('type');
    });

    it('should find status matches', () => {
      const doc = createMockDoc({
        items: [createMockItem({ status: 'triage' })],
      });
      const components = parseQuery('status:triage');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(1);
      expect(matches[0]?.matched_fields[0]?.field).toBe('status');
    });

    it('should require all components to match (AND logic)', () => {
      const doc = createMockDoc({
        items: [createMockItem({ title: 'Login bug', tags: ['api'] })],
      });
      const components = parseQuery('tag:api tag:ux'); // item only has 'api', not 'ux'

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(0);
    });

    it('should respect limit option', () => {
      const doc = createMockDoc({
        items: [
          createMockItem({ title: 'Match 1' }),
          createMockItem({ id: 'REQ-20251203-test-02', title: 'Match 2' }),
          createMockItem({ id: 'REQ-20251203-test-03', title: 'Match 3' }),
        ],
      });
      const components = parseQuery('Match');

      const matches = searchDocument(doc, '/test/doc.md', components, {
        matchMode: 'contains',
        limit: 2,
      });

      expect(matches).toHaveLength(2);
    });

    it('should include match context in results', () => {
      const doc = createMockDoc({
        items: [createMockItem({ title: 'Login bug in authentication' })],
      });
      const components = parseQuery('authentication');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches[0]?.matched_fields[0]?.match_text).toBeTruthy();
    });

    it('should return empty array for empty query', () => {
      const doc = createMockDoc();
      const components = parseQuery('');

      const matches = searchDocument(doc, '/test/doc.md', components);

      expect(matches).toHaveLength(0);
    });

    describe('match modes', () => {
      it('should use contains mode by default', () => {
        const doc = createMockDoc({
          items: [createMockItem({ title: 'Authentication problem' })],
        });
        const components = parseQuery('auth');

        const matches = searchDocument(doc, '/test/doc.md', components);

        expect(matches).toHaveLength(1);
      });

      it('should support starts mode', () => {
        const doc = createMockDoc({
          items: [createMockItem({ title: 'Authentication problem' })],
        });
        const components = parseQuery('auth');

        const matches = searchDocument(doc, '/test/doc.md', components, {
          matchMode: 'starts',
          limit: 0,
        });

        expect(matches).toHaveLength(1);

        // Should not match when query is in middle
        const doc2 = createMockDoc({
          items: [createMockItem({ title: 'Problem with auth' })],
        });
        const matches2 = searchDocument(doc2, '/test/doc.md', components, {
          matchMode: 'starts',
          limit: 0,
        });

        expect(matches2).toHaveLength(0);
      });

      it('should support full mode', () => {
        const doc = createMockDoc({
          items: [createMockItem({ type: 'enhancement' })],
        });
        const components = parseQuery('type:enhancement');

        const fullMatches = searchDocument(doc, '/test/doc.md', components, {
          matchMode: 'full',
          limit: 0,
        });

        expect(fullMatches).toHaveLength(1);

        // Should not match partial
        const components2 = parseQuery('type:enhance');
        const partialMatches = searchDocument(doc, '/test/doc.md', components2, {
          matchMode: 'full',
          limit: 0,
        });

        expect(partialMatches).toHaveLength(0);
      });
    });
  });

  describe('searchDocuments', () => {
    it('should search across multiple documents', () => {
      const docs = [
        { doc: createMockDoc({ items: [createMockItem({ title: 'Login fix' })] }), path: '/doc1.md' },
        { doc: createMockDoc({ items: [createMockItem({ title: 'Other task' })] }), path: '/doc2.md' },
        { doc: createMockDoc({ items: [createMockItem({ title: 'Login bug' })] }), path: '/doc3.md' },
      ];

      const matches = searchDocuments(docs, 'login');

      expect(matches).toHaveLength(2);
    });

    it('should respect overall limit across documents', () => {
      const docs = [
        {
          doc: createMockDoc({
            items: [
              createMockItem({ title: 'Match 1' }),
              createMockItem({ id: 'REQ-20251203-test-02', title: 'Match 2' }),
            ],
          }),
          path: '/doc1.md',
        },
        {
          doc: createMockDoc({
            items: [createMockItem({ title: 'Match 3' })],
          }),
          path: '/doc2.md',
        },
      ];

      const matches = searchDocuments(docs, 'Match', { matchMode: 'contains', limit: 2 });

      expect(matches).toHaveLength(2);
    });

    it('should return empty array for empty query', () => {
      const docs = [{ doc: createMockDoc(), path: '/doc.md' }];

      const matches = searchDocuments(docs, '');

      expect(matches).toHaveLength(0);
    });

    it('should include correct doc_path in matches', () => {
      const docs = [
        { doc: createMockDoc({ items: [createMockItem({ title: 'Test' })] }), path: '/specific/path.md' },
      ];

      const matches = searchDocuments(docs, 'Test');

      expect(matches[0]?.doc_path).toBe('/specific/path.md');
    });
  });

  describe('DEFAULT_SEARCH_OPTIONS', () => {
    it('should have contains as default match mode', () => {
      expect(DEFAULT_SEARCH_OPTIONS.matchMode).toBe('contains');
    });

    it('should have 0 as default limit (unlimited)', () => {
      expect(DEFAULT_SEARCH_OPTIONS.limit).toBe(0);
    });
  });
});
