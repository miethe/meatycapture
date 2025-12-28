/**
 * Stdin Handler for CLI Piped Input
 *
 * Enables AI-agent workflows by supporting piped input via `-` argument.
 * Handles both sync and async reading patterns with proper timeout and
 * error handling for robustness in automated pipelines.
 *
 * Usage patterns:
 * ```bash
 * # Direct pipe
 * echo '{"project":"test","items":[...]}' | meatycapture log create -
 *
 * # jq integration
 * jq '.capture' data.json | meatycapture log create -
 *
 * # Batch operations
 * jq -c '.captures[]' batch.json | while read -r capture; do
 *   echo "$capture" | meatycapture log create - --quiet
 * done
 * ```
 */

import { promises as fs } from 'node:fs';

/**
 * Supported text encodings for input reading.
 * Mirrors Node.js BufferEncoding for compatibility.
 */
export type TextEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

/**
 * Options for reading input from file or stdin
 */
export interface ReadInputOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Encoding (default: 'utf-8') */
  encoding?: TextEncoding;
}

/**
 * Error thrown when stdin operations fail
 */
export class StdinError extends Error {
  constructor(
    message: string,
    public readonly code: StdinErrorCode
  ) {
    super(message);
    this.name = 'StdinError';
  }
}

/**
 * Error codes for stdin-related failures
 */
export type StdinErrorCode =
  | 'NOT_PIPED'
  | 'TIMEOUT'
  | 'INVALID_ENCODING'
  | 'PIPE_BROKEN'
  | 'READ_ERROR';

/**
 * Default timeout for stdin reads (30 seconds).
 * Generous timeout for AI agents that may have slow output.
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Default encoding for text input
 */
const DEFAULT_ENCODING: TextEncoding = 'utf-8';

/**
 * Sentinel value indicating stdin input
 */
const STDIN_SENTINEL = '-';

/**
 * Check if input should come from stdin.
 *
 * The conventional Unix pattern uses `-` to indicate stdin.
 *
 * @param filePath - File path argument from CLI
 * @returns True if input should be read from stdin
 *
 * @example
 * ```typescript
 * isStdinInput('-')         // true
 * isStdinInput('./file.json') // false
 * isStdinInput('data.json')   // false
 * ```
 */
export function isStdinInput(filePath: string): boolean {
  return filePath === STDIN_SENTINEL;
}

/**
 * Check if stdin is available and has piped data.
 *
 * Determines if the process was invoked with piped input by checking
 * if stdin is a TTY (interactive terminal). Non-TTY stdin indicates
 * data is being piped in.
 *
 * @returns True if stdin has piped data available
 */
export function isStdinAvailable(): boolean {
  // process.stdin.isTTY is undefined when stdin is piped
  // It's true when running in an interactive terminal
  return !process.stdin.isTTY;
}

/**
 * Read all data from stdin with timeout handling.
 *
 * Collects chunks from stdin until EOF, with a configurable timeout
 * to prevent hanging on pipes that never close.
 *
 * @param options - Read options including timeout and encoding
 * @returns Promise resolving to the complete stdin content
 * @throws StdinError if stdin is not piped, times out, or pipe breaks
 *
 * @example
 * ```typescript
 * // Basic usage - read with defaults
 * const content = await readStdin();
 *
 * // With custom timeout for slow producers
 * const content = await readStdin({ timeout: 60000 });
 * ```
 */
export async function readStdin(options: ReadInputOptions = {}): Promise<string> {
  const { timeout = DEFAULT_TIMEOUT_MS, encoding = DEFAULT_ENCODING } = options;

  // Validate encoding before attempting read
  if (!isValidEncoding(encoding)) {
    throw new StdinError(`Invalid encoding: ${encoding}`, 'INVALID_ENCODING');
  }

  // Check if stdin is actually piped
  if (!isStdinAvailable()) {
    throw new StdinError(
      'No input piped to stdin. When using "-" for input, data must be piped (e.g., echo \'{"data": ...}\' | meatycapture ...)',
      'NOT_PIPED'
    );
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let resolved = false;

    /**
     * Cleanup function to remove listeners and clear timeout
     */
    const cleanup = (): void => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      process.stdin.removeListener('data', onData);
      process.stdin.removeListener('end', onEnd);
      process.stdin.removeListener('error', onError);
      process.stdin.removeListener('close', onClose);
    };

    /**
     * Resolve the promise with accumulated data
     */
    const finalize = (): void => {
      if (resolved) return;
      resolved = true;
      cleanup();

      try {
        const buffer = Buffer.concat(chunks);
        const content = buffer.toString(encoding);
        resolve(content);
      } catch (err) {
        reject(
          new StdinError(
            `Failed to decode stdin content: ${err instanceof Error ? err.message : 'Unknown error'}`,
            'INVALID_ENCODING'
          )
        );
      }
    };

    /**
     * Handle incoming data chunks
     */
    const onData = (chunk: Buffer): void => {
      chunks.push(chunk);
    };

    /**
     * Handle stdin end (EOF)
     */
    const onEnd = (): void => {
      finalize();
    };

    /**
     * Handle stdin close
     * Close can occur without end in some edge cases
     */
    const onClose = (): void => {
      finalize();
    };

    /**
     * Handle read errors
     */
    const onError = (err: Error): void => {
      if (resolved) return;
      resolved = true;
      cleanup();

      // Determine appropriate error code based on error type
      const code: StdinErrorCode = isPipeBrokenError(err) ? 'PIPE_BROKEN' : 'READ_ERROR';

      reject(
        new StdinError(
          `Failed to read from stdin: ${err.message}`,
          code
        )
      );
    };

    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();

        // Destroy stdin to stop any pending reads
        process.stdin.destroy();

        reject(
          new StdinError(
            `Stdin read timed out after ${timeout}ms. Ensure the piped command completes in a timely manner.`,
            'TIMEOUT'
          )
        );
      }, timeout);
    }

    // Register event listeners
    process.stdin.on('data', onData);
    process.stdin.on('end', onEnd);
    process.stdin.on('error', onError);
    process.stdin.on('close', onClose);

    // Ensure stdin is readable and flowing
    // This handles cases where stdin might be paused
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }

    // Set encoding on the stream for proper string handling
    process.stdin.setEncoding(encoding);
  });
}

/**
 * Read input from file path or stdin (when path is '-').
 *
 * This is the primary entry point for CLI commands that support
 * both file and piped input. It abstracts away the source of input
 * while providing consistent error handling.
 *
 * @param filePath - File path or '-' for stdin
 * @param options - Read options
 * @returns Content as string
 * @throws Error on read failure or timeout
 *
 * @example
 * ```typescript
 * // Read from file
 * const content = await readInput('./data.json');
 *
 * // Read from stdin (piped)
 * const content = await readInput('-');
 *
 * // With options
 * const content = await readInput('-', { timeout: 60000 });
 * ```
 */
export async function readInput(
  filePath: string,
  options: ReadInputOptions = {}
): Promise<string> {
  const { encoding = DEFAULT_ENCODING } = options;

  if (isStdinInput(filePath)) {
    return readStdin(options);
  }

  // Read from file
  try {
    const content = await fs.readFile(filePath, { encoding });
    return content;
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      const nodeError = error as Error & { code?: string };

      if (nodeError.code === 'ENOENT') {
        throw new Error(`Input file not found: ${filePath}`);
      }

      if (nodeError.code === 'EACCES') {
        throw new Error(`Permission denied reading file: ${filePath}`);
      }

      if (nodeError.code === 'EISDIR') {
        throw new Error(`Expected file but got directory: ${filePath}`);
      }
    }

    throw new Error(
      `Failed to read input file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if an encoding string is valid for Buffer operations.
 *
 * @param encoding - Encoding to validate
 * @returns True if encoding is supported
 */
function isValidEncoding(encoding: string): encoding is TextEncoding {
  const validEncodings: readonly string[] = [
    'ascii',
    'utf8',
    'utf-8',
    'utf16le',
    'ucs2',
    'ucs-2',
    'base64',
    'base64url',
    'latin1',
    'binary',
    'hex',
  ];

  return validEncodings.includes(encoding.toLowerCase());
}

/**
 * Check if an error indicates a broken pipe.
 *
 * Broken pipe occurs when the writing end of the pipe closes
 * before reading completes, typically from SIGPIPE or EPIPE.
 *
 * @param error - Error to check
 * @returns True if error indicates broken pipe
 */
function isPipeBrokenError(error: Error): boolean {
  if ('code' in error) {
    const code = (error as Error & { code?: string }).code;
    return code === 'EPIPE' || code === 'ECONNRESET';
  }
  return error.message.toLowerCase().includes('pipe');
}
