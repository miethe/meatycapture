/**
 * Environment Loader Unit Tests
 *
 * Tests for:
 * - parseLine: Line parsing with various formats
 * - loadEnvFile: File loading and environment variable setting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { parseLine, loadEnvFile } from '@cli/env-loader';
import { createTempDir, cleanupTempDir } from './helpers';

// ============================================================================
// parseLine Tests
// ============================================================================

describe('parseLine', () => {
  describe('valid lines', () => {
    it('parses simple KEY=VALUE format', () => {
      expect(parseLine('KEY=value')).toEqual(['KEY', 'value']);
    });

    it('trims whitespace from key and value', () => {
      expect(parseLine('  KEY  =  value  ')).toEqual(['KEY', 'value']);
    });

    it('handles values with equals signs', () => {
      expect(parseLine('KEY=value=with=equals')).toEqual(['KEY', 'value=with=equals']);
    });

    it('strips double quotes from values', () => {
      expect(parseLine('KEY="quoted value"')).toEqual(['KEY', 'quoted value']);
    });

    it('strips single quotes from values', () => {
      expect(parseLine("KEY='single quoted'")).toEqual(['KEY', 'single quoted']);
    });

    it('handles empty values', () => {
      expect(parseLine('KEY=')).toEqual(['KEY', '']);
    });

    it('handles numeric values', () => {
      expect(parseLine('PORT=3000')).toEqual(['PORT', '3000']);
    });

    it('handles URLs as values', () => {
      expect(parseLine('API_URL=http://localhost:3737')).toEqual([
        'API_URL',
        'http://localhost:3737',
      ]);
    });

    it('handles quoted URLs', () => {
      expect(parseLine('API_URL="http://localhost:3737/path?query=value"')).toEqual([
        'API_URL',
        'http://localhost:3737/path?query=value',
      ]);
    });
  });

  describe('lines to skip', () => {
    it('returns null for empty lines', () => {
      expect(parseLine('')).toBeNull();
    });

    it('returns null for whitespace-only lines', () => {
      expect(parseLine('   ')).toBeNull();
      expect(parseLine('\t\t')).toBeNull();
    });

    it('returns null for comment lines', () => {
      expect(parseLine('# This is a comment')).toBeNull();
    });

    it('returns null for comment lines with leading whitespace', () => {
      expect(parseLine('  # Indented comment')).toBeNull();
    });

    it('returns null for lines without equals sign', () => {
      expect(parseLine('INVALID_LINE')).toBeNull();
    });

    it('returns null for lines with empty key', () => {
      expect(parseLine('=value')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles quoted values with internal quotes', () => {
      // Only strips surrounding quotes, internal quotes remain
      expect(parseLine('KEY="value with "internal" quotes"')).toEqual([
        'KEY',
        'value with "internal" quotes',
      ]);
    });

    it('does not strip mismatched quotes', () => {
      expect(parseLine("KEY=\"mixed'")).toEqual(['KEY', "\"mixed'"]);
    });

    it('preserves whitespace inside quotes', () => {
      expect(parseLine('KEY="  spaced  "')).toEqual(['KEY', '  spaced  ']);
    });
  });
});

// ============================================================================
// loadEnvFile Tests
// ============================================================================

describe('loadEnvFile', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await createTempDir();
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    // Restore original environment
    process.env = originalEnv;
  });

  describe('file loading', () => {
    it('returns loaded: false when .env file does not exist', () => {
      const result = loadEnvFile(tempDir);

      expect(result.loaded).toBe(false);
      expect(result.variablesSet).toBe(0);
      expect(result.variablesSkipped).toBe(0);
      expect(result.path).toBeUndefined();
    });

    it('returns loaded: true when .env file exists', async () => {
      await fs.writeFile(join(tempDir, '.env'), 'TEST_VAR=test_value');

      const result = loadEnvFile(tempDir);

      expect(result.loaded).toBe(true);
      expect(result.path).toBe(join(tempDir, '.env'));
    });

    it('sets environment variables from .env file', async () => {
      const envContent = `
TEST_VAR_1=value1
TEST_VAR_2=value2
`;
      await fs.writeFile(join(tempDir, '.env'), envContent);

      // Ensure these don't exist
      delete process.env['TEST_VAR_1'];
      delete process.env['TEST_VAR_2'];

      const result = loadEnvFile(tempDir);

      expect(result.variablesSet).toBe(2);
      expect(process.env['TEST_VAR_1']).toBe('value1');
      expect(process.env['TEST_VAR_2']).toBe('value2');
    });

    it('does not overwrite existing environment variables', async () => {
      const envContent = 'EXISTING_VAR=new_value';
      await fs.writeFile(join(tempDir, '.env'), envContent);

      // Set existing value
      process.env['EXISTING_VAR'] = 'original_value';

      const result = loadEnvFile(tempDir);

      expect(result.variablesSkipped).toBe(1);
      expect(result.variablesSet).toBe(0);
      expect(process.env['EXISTING_VAR']).toBe('original_value');
    });

    it('counts both set and skipped variables', async () => {
      const envContent = `
NEW_VAR=new_value
EXISTING_VAR=should_be_skipped
`;
      await fs.writeFile(join(tempDir, '.env'), envContent);

      // Set existing value
      process.env['EXISTING_VAR'] = 'original';
      delete process.env['NEW_VAR'];

      const result = loadEnvFile(tempDir);

      expect(result.variablesSet).toBe(1);
      expect(result.variablesSkipped).toBe(1);
    });
  });

  describe('parsing integration', () => {
    it('skips comment lines and empty lines', async () => {
      const envContent = `
# This is a comment
KEY1=value1

# Another comment
KEY2=value2
`;
      await fs.writeFile(join(tempDir, '.env'), envContent);
      delete process.env['KEY1'];
      delete process.env['KEY2'];

      const result = loadEnvFile(tempDir);

      expect(result.variablesSet).toBe(2);
      expect(process.env['KEY1']).toBe('value1');
      expect(process.env['KEY2']).toBe('value2');
    });

    it('handles quoted values correctly', async () => {
      const envContent = `
QUOTED_DOUBLE="value with spaces"
QUOTED_SINGLE='another value'
`;
      await fs.writeFile(join(tempDir, '.env'), envContent);
      delete process.env['QUOTED_DOUBLE'];
      delete process.env['QUOTED_SINGLE'];

      loadEnvFile(tempDir);

      expect(process.env['QUOTED_DOUBLE']).toBe('value with spaces');
      expect(process.env['QUOTED_SINGLE']).toBe('another value');
    });

    it('handles MeatyCapture-specific variables', async () => {
      const envContent = `
MEATYCAPTURE_API_URL=http://localhost:3737
MEATYCAPTURE_CONFIG_DIR=/custom/config
MEATYCAPTURE_DATA_DIR=/custom/data
MEATYCAPTURE_DEFAULT_PROJECT_PATH=/projects
MEATYCAPTURE_AUTH_TOKEN=secret123
`;
      await fs.writeFile(join(tempDir, '.env'), envContent);

      // Clear these before test
      delete process.env['MEATYCAPTURE_API_URL'];
      delete process.env['MEATYCAPTURE_CONFIG_DIR'];
      delete process.env['MEATYCAPTURE_DATA_DIR'];
      delete process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH'];
      delete process.env['MEATYCAPTURE_AUTH_TOKEN'];

      const result = loadEnvFile(tempDir);

      expect(result.variablesSet).toBe(5);
      expect(process.env['MEATYCAPTURE_API_URL']).toBe('http://localhost:3737');
      expect(process.env['MEATYCAPTURE_CONFIG_DIR']).toBe('/custom/config');
      expect(process.env['MEATYCAPTURE_DATA_DIR']).toBe('/custom/data');
      expect(process.env['MEATYCAPTURE_DEFAULT_PROJECT_PATH']).toBe('/projects');
      expect(process.env['MEATYCAPTURE_AUTH_TOKEN']).toBe('secret123');
    });
  });

  describe('default directory', () => {
    it('uses process.cwd() when no directory specified', async () => {
      // This test just verifies the function doesn't throw when called without args
      // The actual cwd behavior depends on the test runner's working directory
      const result = loadEnvFile();

      // Result will be loaded: false if no .env in cwd, or loaded: true if there is
      expect(typeof result.loaded).toBe('boolean');
      expect(typeof result.variablesSet).toBe('number');
      expect(typeof result.variablesSkipped).toBe('number');
    });
  });
});
