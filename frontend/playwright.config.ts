import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://maintchain.vercel.app';

export default defineConfig({
  testDir: './tests/smoke',
  testMatch: '*.browser.test.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'tests/smoke/playwright-report.json' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium-smoke',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
