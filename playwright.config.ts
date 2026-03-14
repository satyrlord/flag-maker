import { defineConfig, devices } from "@playwright/test";

const collectCoverage = !!process.env.E2E_COVERAGE;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 10,
  reporter: "list",
  /* Per-test timeout (default 30 s is too tight for mobile emulation). */
  timeout: 60_000,
  /* Global suite timeout. */
  globalTimeout: 300_000,
  ...(collectCoverage && {
    globalSetup: "./tests/e2e/coverage-setup.ts",
    globalTeardown: "./tests/e2e/coverage-teardown.ts",
  }),
  use: {
    baseURL: "http://localhost:5174/flag-maker/",
    /* Collect trace on first retry for CI debugging. */
    trace: "on-first-retry",
    /* Capture a full-page screenshot on test failure. */
    screenshot: "only-on-failure",
    /* Per-action timeout (click, fill, etc.). */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: collectCoverage
      ? "npx cross-env E2E_COVERAGE=true npm run build && npx vite preview --port 5174"
      : "npm run build && npx vite preview --port 5174",
    port: 5174,
    reuseExistingServer: !collectCoverage,
  },
  projects: [
    {
      name: "desktop-headless",
      use: {
        browserName: "chromium",
        channel: undefined,
        viewport: { width: 1400, height: 800 },
      },
    },
    {
      name: "mobile-android",
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 915, height: 412 },
      },
    },
  ],
});
