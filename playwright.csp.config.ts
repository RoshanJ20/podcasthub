/**
 * Playwright config for the CSP Phase B regression suite.
 *
 * Drives an already-running production build (`node .next/standalone/server.js`
 * on port 3103) — does NOT spawn the dev server. Use this when verifying that
 * the strict per-request, nonce-based CSP works end-to-end against the
 * standalone bundle.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: /(csp-phase-b\.spec|auth\.setup)\.ts/,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    // Trailing slash matters: relative paths like 'admin' resolve to
    // http://localhost:3103/auditbrief/admin. Without the slash, the
    // basePath segment is treated as a file and stripped on join.
    baseURL: 'http://localhost:3103/auditbrief/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
