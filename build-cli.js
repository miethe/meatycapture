/**
 * CLI Build Script
 *
 * Uses esbuild to bundle the CLI with all dependencies resolved.
 * This handles path alias resolution that TypeScript alone cannot do.
 */

import { build } from 'esbuild';
import { readFile, writeFile, chmod } from 'fs/promises';

async function buildCli() {
  try {
    // Bundle the CLI
    await build({
      entryPoints: ['src/cli/index.ts'],
      outfile: 'dist/cli/index.js',
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      sourcemap: true,
      minify: false,
      external: [
        // Don't bundle Node.js built-ins
        'node:*',
        // Don't bundle packages with dynamic requires
        'commander',
        'yaml',
        'chalk',
        'cli-table3',
      ],
      alias: {
        '@core/logging': './src/cli/logging-stub.ts',
        '@core': './src/core',
        '@adapters': './src/adapters',
      },
    });

    // Read the output file and prepend shebang
    const outputPath = 'dist/cli/index.js';
    const content = await readFile(outputPath, 'utf-8');

    // Add shebang if not present
    if (!content.startsWith('#!')) {
      const withShebang = `#!/usr/bin/env node\n${content}`;
      await writeFile(outputPath, withShebang, 'utf-8');
    }

    // Make executable
    await chmod(outputPath, 0o755);

    console.log('✓ CLI built successfully: dist/cli/index.js');
  } catch (error) {
    console.error('CLI build failed:');
    console.error(error);
    process.exit(1);
  }
}

buildCli();
