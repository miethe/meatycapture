#!/usr/bin/env bun
/**
 * Binary Build Script
 *
 * Compiles MeatyCapture CLI into standalone executables using Bun compile.
 * Supports cross-compilation for all major platforms from any host.
 *
 * Usage:
 *   bun run build-binary.ts                    # Build for current platform
 *   bun run build-binary.ts --all              # Build for all platforms
 *   bun run build-binary.ts --target darwin-arm64  # Build specific target
 *   bun run build-binary.ts --target linux-x64,windows-x64  # Multiple targets
 *
 * Output: dist/bin/meatycapture-{os}-{arch}[.exe]
 */

import { spawn } from 'bun';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

// ============================================================================
// Configuration
// ============================================================================

const CLI_ENTRY = 'src/cli/index.ts';
const OUTPUT_DIR = 'dist/bin';

/**
 * Supported build targets mapped to Bun's target identifiers
 * Binary naming: meatycapture-{os}-{arch}
 */
const TARGETS = {
  'darwin-arm64': { bunTarget: 'bun-darwin-arm64', ext: '' },
  'darwin-x64': { bunTarget: 'bun-darwin-x64', ext: '' },
  'linux-x64': { bunTarget: 'bun-linux-x64', ext: '' },
  'linux-arm64': { bunTarget: 'bun-linux-arm64', ext: '' },
  'windows-x64': { bunTarget: 'bun-windows-x64', ext: '.exe' },
};

/**
 * Detect current platform target identifier
 */
function getCurrentTarget(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
  if (platform === 'darwin' && arch === 'x64') return 'darwin-x64';
  if (platform === 'linux' && arch === 'x64') return 'linux-x64';
  if (platform === 'linux' && arch === 'arm64') return 'linux-arm64';
  if (platform === 'win32' && arch === 'x64') return 'windows-x64';

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

// ============================================================================
// Build Functions
// ============================================================================

interface BuildResult {
  target: string;
  outputPath: string;
  success: boolean;
  error?: string;
  timeMs: number;
}

/**
 * Build a standalone binary for a specific target
 */
async function buildTarget(target: string): Promise<BuildResult> {
  const config = TARGETS[target as keyof typeof TARGETS];
  if (!config) {
    return {
      target,
      outputPath: '',
      success: false,
      error: `Unknown target: ${target}. Valid targets: ${Object.keys(TARGETS).join(', ')}`,
      timeMs: 0,
    };
  }

  const outputPath = join(OUTPUT_DIR, `meatycapture-${target}${config.ext}`);
  const startTime = performance.now();

  try {
    // Use spawn for bun build --compile since Bun.build() doesn't support compile option yet
    const proc = spawn(
      [
        'bun',
        'build',
        '--compile',
        '--minify',
        `--target=${config.bunTarget}`,
        CLI_ENTRY,
        `--outfile=${outputPath}`,
      ],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );

    const exitCode = await proc.exited;
    const timeMs = Math.round(performance.now() - startTime);

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      return {
        target,
        outputPath,
        success: false,
        error: stderr || `Build failed with exit code ${exitCode}`,
        timeMs,
      };
    }

    return { target, outputPath, success: true, timeMs };
  } catch (error) {
    const timeMs = Math.round(performance.now() - startTime);
    return {
      target,
      outputPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timeMs,
    };
  }
}

/**
 * Ensure output directory exists and is clean
 */
async function prepareOutputDir(): Promise<void> {
  if (existsSync(OUTPUT_DIR)) {
    await rm(OUTPUT_DIR, { recursive: true });
  }
  await mkdir(OUTPUT_DIR, { recursive: true });
}

// ============================================================================
// CLI Interface
// ============================================================================

function printUsage(): void {
  console.log(`
MeatyCapture Binary Builder

Usage:
  bun run build-binary.ts [options]

Options:
  --all                Build binaries for all platforms
  --target <targets>   Comma-separated list of targets to build
  --clean              Clean output directory before building (default: true)
  --no-clean           Don't clean output directory
  --help               Show this help message

Available targets:
  ${Object.keys(TARGETS).join(', ')}

Examples:
  bun run build-binary.ts                        # Current platform only
  bun run build-binary.ts --all                  # All platforms
  bun run build-binary.ts --target linux-x64     # Specific target
  bun run build-binary.ts --target darwin-arm64,linux-x64  # Multiple targets
`);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      all: { type: 'boolean', default: false },
      target: { type: 'string' },
      clean: { type: 'boolean', default: true },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  // Determine which targets to build
  let targets: string[];

  if (values.all) {
    targets = Object.keys(TARGETS);
  } else if (values.target) {
    targets = values.target.split(',').map((t) => t.trim());
  } else {
    targets = [getCurrentTarget()];
  }

  console.log('MeatyCapture Binary Builder');
  console.log('===========================\n');
  console.log(`Targets: ${targets.join(', ')}`);
  console.log(`Output:  ${OUTPUT_DIR}/\n`);

  // Prepare output directory
  if (values.clean) {
    await prepareOutputDir();
  } else if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Build each target
  const results: BuildResult[] = [];

  for (const target of targets) {
    process.stdout.write(`Building ${target}... `);
    const result = await buildTarget(target);
    results.push(result);

    if (result.success) {
      console.log(`done (${result.timeMs}ms)`);
    } else {
      console.log(`FAILED`);
      console.error(`  Error: ${result.error}`);
    }
  }

  // Summary
  console.log('\n---');
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log(`\nSuccessfully built ${successful.length} binary(ies):`);
    for (const r of successful) {
      console.log(`  ${r.outputPath}`);
    }
  }

  if (failed.length > 0) {
    console.log(`\nFailed to build ${failed.length} binary(ies):`);
    for (const r of failed) {
      console.log(`  ${r.target}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
