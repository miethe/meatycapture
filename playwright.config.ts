/**
 * Playwright Configuration
 *
 * E2E testing configuration for MeatyCapture.
 * Focuses on mobile viewer user journeys with device emulation.
 *
 * Run tests with:
 *   pnpm exec playwright test tests/e2e/viewer-mobile.spec.ts
 *
 * Run with UI mode:
 *   pnpm exec playwright test --ui
 *
 * Run specific test:
 *   pnpm exec playwright test -g "Journey 1"
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Maximum timeout for each test
  timeout: 30000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI (use 50% of available CPUs when not in CI)
  workers: process.env.CI ? 1 : '50%',

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the dev server
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'on-first-retry',
  },

  // Configure projects for different mobile devices and orientations
  projects: [
    {
      name: 'Mobile iPhone 12 Portrait',
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'Mobile iPhone 12 Landscape',
      use: {
        ...devices['iPhone 12 landscape'],
      },
    },
    {
      name: 'Mobile Pixel 5 Portrait',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Pixel 5 Landscape',
      use: {
        ...devices['Pixel 5 landscape'],
      },
    },
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
