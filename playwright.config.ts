import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Test Configuration
 *
 * IMPORTANT: E2E tests run on a separate port (3001) with mock auth enabled.
 * This allows normal development on port 3000 to use real authentication.
 *
 * The E2E test user ID must exist in the database for tests to work.
 * See: docs/current/e2e-testing.md
 */

// E2E test user - must exist in the database
const E2E_TEST_USER_ID = '0b86d7e4-68ae-4da4-b30f-3f47da723f84';

// Use separate port for E2E tests to avoid conflicting with dev server
const E2E_PORT = 3001;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  /* Snapshot settings for visual regression tests */
  snapshotDir: './e2e/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      /* Allow small pixel differences (anti-aliasing, subpixel rendering) */
      maxDiffPixelRatio: 0.01,
      /* Animation threshold - account for minor timing differences */
      animations: 'disabled',
    },
  },
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
    /* Disable animations for consistent screenshots */
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    // Reuse server if available (helps with repeated test runs)
    reuseExistingServer: true,
    // Set E2E test mode env vars - this enables auth bypass
    env: {
      NEXT_PUBLIC_E2E_TEST_USER_ID: E2E_TEST_USER_ID,
    },
    // Give the server more time to start (Next.js can be slow on first compile)
    timeout: 120000,
  },
});
