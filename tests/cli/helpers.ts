/**
 * CLI Test Helpers
 *
 * Provides utilities for CLI testing:
 * - Temp directory management for file I/O isolation
 * - Mock stdin for piped input tests
 * - Test data factories for consistent test fixtures
 * - Process.exit mocking for exit code verification
 */

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ItemDraft, RequestLogDoc, RequestLogItem } from '@core/models';
import type { DocMeta } from '@core/ports';
import { serialize } from '@core/serializer';
import type { SearchMatch, MatchedField } from '@cli/formatters/types';

// ============================================================================
// Temp Directory Management
// ============================================================================

/**
 * Creates an isolated temporary directory for test file operations.
 * Returns the absolute path to the created directory.
 */
export async function createTempDir(): Promise<string> {
  const prefix = 'meatycapture-test-';
  const dir = await fs.mkdtemp(join(tmpdir(), prefix));
  return dir;
}

/**
 * Recursively removes a temporary directory and all its contents.
 * Safe to call on non-existent directories.
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore errors - directory may already be deleted
  }
}

/**
 * Creates a test document file in the specified directory.
 * Returns the full path to the created file.
 */
export async function createTestDoc(
  dir: string,
  doc?: Partial<RequestLogDoc>,
  filename?: string
): Promise<string> {
  const fullDoc = createMockDoc(doc);
  const content = serialize(fullDoc);
  const fname = filename ?? `${fullDoc.doc_id}.md`;
  const filePath = join(dir, fname);

  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Creates multiple test documents in a directory.
 * Returns array of created file paths.
 */
export async function createTestDocs(
  dir: string,
  count: number,
  baseDoc?: Partial<RequestLogDoc>
): Promise<string[]> {
  const paths: string[] = [];

  for (let i = 0; i < count; i++) {
    const doc = {
      ...baseDoc,
      doc_id: `REQ-2025120${3 + i}-test-project`,
      title: `Test Document ${i + 1}`,
    };
    const path = await createTestDoc(dir, doc);
    paths.push(path);
  }

  return paths;
}

// ============================================================================
// Mock Stdin
// ============================================================================

// Store original stdin properties
let originalIsTTY: boolean | undefined;

/**
 * Mocks stdin with the provided content.
 * Call restoreStdin() after test to clean up.
 */
export function mockStdin(content: string): void {
  // Save original state
  originalIsTTY = process.stdin.isTTY;

  // Make stdin appear as piped
  Object.defineProperty(process.stdin, 'isTTY', {
    value: undefined,
    writable: true,
    configurable: true,
  });

  // Create a readable stream from content
  const { Readable } = require('stream');
  const mockStream = new Readable({
    read() {
      this.push(content);
      this.push(null);
    },
  });

  // Replace stdin methods with mock stream methods
  process.stdin.on = mockStream.on.bind(mockStream);
  process.stdin.once = mockStream.once.bind(mockStream);
  process.stdin.removeListener = mockStream.removeListener.bind(mockStream);
  process.stdin.resume = mockStream.resume.bind(mockStream);
  process.stdin.setEncoding = mockStream.setEncoding.bind(mockStream);

  Object.defineProperty(process.stdin, 'isPaused', {
    value: () => mockStream.isPaused(),
    configurable: true,
  });
}

/**
 * Restores stdin to its original state after mocking.
 */
export function restoreStdin(): void {
  if (originalIsTTY !== undefined) {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  }
}

// ============================================================================
// Process Exit Mocking
// ============================================================================

/** Captured exit code from mocked process.exit */
let capturedExitCode: number | undefined;

/** Original process.exit function */
let originalProcessExit: typeof process.exit;

/**
 * Mocks process.exit to capture exit codes instead of terminating.
 * Throws an error to prevent continued execution.
 */
export function mockProcessExit(): void {
  capturedExitCode = undefined;
  originalProcessExit = process.exit;

  process.exit = ((code?: number) => {
    capturedExitCode = code ?? 0;
    throw new MockExitError(capturedExitCode);
  }) as typeof process.exit;
}

/**
 * Restores process.exit to its original behavior.
 */
export function restoreProcessExit(): void {
  if (originalProcessExit) {
    process.exit = originalProcessExit;
  }
}

/**
 * Gets the captured exit code from the last mocked exit call.
 */
export function getCapturedExitCode(): number | undefined {
  return capturedExitCode;
}

/**
 * Custom error thrown when mocked process.exit is called.
 * Allows tests to catch and verify exit behavior.
 */
export class MockExitError extends Error {
  constructor(public readonly exitCode: number) {
    super(`Process exited with code ${exitCode}`);
    this.name = 'MockExitError';
  }
}

// ============================================================================
// Console Mocking
// ============================================================================

/** Captured console output */
let capturedLogs: string[] = [];
let capturedErrors: string[] = [];

/** Original console methods */
let originalConsoleLog: typeof console.log;
let originalConsoleError: typeof console.error;

/**
 * Mocks console.log and console.error to capture output.
 */
export function mockConsole(): void {
  capturedLogs = [];
  capturedErrors = [];

  originalConsoleLog = console.log;
  originalConsoleError = console.error;

  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(' '));
  };

  console.error = (...args: unknown[]) => {
    capturedErrors.push(args.map(String).join(' '));
  };
}

/**
 * Restores console to original behavior.
 */
export function restoreConsole(): void {
  if (originalConsoleLog) {
    console.log = originalConsoleLog;
  }
  if (originalConsoleError) {
    console.error = originalConsoleError;
  }
}

/**
 * Gets captured console.log output.
 */
export function getCapturedLogs(): string[] {
  return [...capturedLogs];
}

/**
 * Gets captured console.error output.
 */
export function getCapturedErrors(): string[] {
  return [...capturedErrors];
}

/**
 * Clears captured console output.
 */
export function clearCapturedOutput(): void {
  capturedLogs = [];
  capturedErrors = [];
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Creates a mock ItemDraft with sensible defaults.
 * Override any field by passing partial object.
 */
export function createMockItemDraft(overrides?: Partial<ItemDraft>): ItemDraft {
  return {
    title: 'Test Item',
    type: 'enhancement',
    domain: 'web',
    context: 'Test Context',
    priority: 'medium',
    status: 'triage',
    tags: ['test'],
    notes: 'Test notes for this item.',
    ...overrides,
  };
}

/**
 * Creates a mock RequestLogItem with sensible defaults.
 */
export function createMockItem(overrides?: Partial<RequestLogItem>): RequestLogItem {
  const now = new Date('2025-12-03T10:00:00Z');
  return {
    id: 'REQ-20251203-test-project-01',
    title: 'Test Item',
    type: 'enhancement',
    domain: 'web',
    context: 'Test Context',
    priority: 'medium',
    status: 'triage',
    tags: ['test'],
    notes: 'Test notes for this item.',
    created_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock RequestLogDoc with sensible defaults.
 */
export function createMockDoc(overrides?: Partial<RequestLogDoc>): RequestLogDoc {
  const now = new Date('2025-12-03T10:00:00Z');
  const items = overrides?.items ?? [createMockItem()];

  return {
    doc_id: 'REQ-20251203-test-project',
    title: 'Test Request Log',
    project_id: 'test-project',
    items,
    items_index: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
    })),
    tags: [...new Set(items.flatMap((item) => item.tags))].sort(),
    item_count: items.length,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock DocMeta for list command testing.
 */
export function createMockDocMeta(overrides?: Partial<DocMeta>): DocMeta {
  const now = new Date('2025-12-03T10:00:00Z');
  return {
    path: '/test/docs/REQ-20251203-test-project.md',
    doc_id: 'REQ-20251203-test-project',
    title: 'Test Request Log',
    item_count: 1,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock MatchedField for search result testing.
 */
export function createMockMatchedField(overrides?: Partial<MatchedField>): MatchedField {
  return {
    field: 'title',
    match_text: 'test match',
    ...overrides,
  };
}

/**
 * Creates a mock SearchMatch for search command testing.
 */
export function createMockSearchMatch(overrides?: Partial<SearchMatch>): SearchMatch {
  return {
    item: createMockItem(),
    doc_id: 'REQ-20251203-test-project',
    doc_path: '/test/docs/REQ-20251203-test-project.md',
    matched_fields: [createMockMatchedField()],
    ...overrides,
  };
}

/**
 * Creates valid CLI input JSON for create command.
 */
export function createValidCliInput(
  project?: string,
  items?: ItemDraft[]
): { project: string; items: ItemDraft[] } {
  return {
    project: project ?? 'test-project',
    items: items ?? [createMockItemDraft()],
  };
}

/**
 * Creates a JSON file with CLI input for testing.
 */
export async function createJsonInputFile(
  dir: string,
  input: { project: string; items: ItemDraft[]; title?: string },
  filename?: string
): Promise<string> {
  const fname = filename ?? 'input.json';
  const filePath = join(dir, fname);
  await fs.writeFile(filePath, JSON.stringify(input), 'utf-8');
  return filePath;
}

// ============================================================================
// Quiet Mode Reset
// ============================================================================

/**
 * Resets the global quiet mode state.
 * Should be called in afterEach to ensure test isolation.
 */
export async function resetQuietMode(): Promise<void> {
  const { setQuietMode } = await import('@cli/handlers/errors');
  setQuietMode(false);
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Waits for a specified number of milliseconds.
 * Useful for testing timeout behavior.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely parses JSON, returning null on failure.
 */
export function safeJsonParse(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Checks if a string is valid JSON.
 */
export function isValidJson(str: string): boolean {
  return safeJsonParse(str) !== null;
}

/**
 * Checks if a string is valid YAML (basic check).
 */
export function isValidYaml(str: string): boolean {
  // Basic check: YAML should not throw when parsed
  // For tests, we just check it's not empty and doesn't start with error chars
  return str.trim().length > 0 && !str.startsWith('Error');
}

/**
 * Checks if a string is valid CSV (basic check).
 */
export function isValidCsv(str: string): boolean {
  const lines = str.trim().split('\n');
  if (lines.length === 0) return false;

  // Check header row exists
  const headerLine = lines[0];
  if (!headerLine) return false;
  const headerCols = headerLine.split(',').length;

  // All rows should have same number of columns
  for (const line of lines) {
    // Account for quoted fields with commas
    const cols = line.match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g)?.length ?? 0;
    if (cols !== headerCols) return false;
  }

  return true;
}
