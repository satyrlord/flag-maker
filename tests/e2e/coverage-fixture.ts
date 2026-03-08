/**
 * Playwright coverage fixture.
 *
 * Collects Istanbul coverage data when E2E_COVERAGE=true.
 * vite-plugin-istanbul injects instrumentation into the build,
 * exposing window.__coverage__ which this fixture collects after
 * each test and writes to .temp/e2e-coverage/ as JSON.
 *
 * The global teardown (coverage-teardown.ts) feeds the JSON files
 * to monocart-coverage-reports, then enforces the repository's
 * per-file coverage thresholds.
 */

import { test as base, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// Re-export expect so test files can import both from one place.
export { expect };

const COVERAGE_DIR = path.resolve(".temp/e2e-coverage");
const collectCoverage = !!process.env.E2E_COVERAGE;

export const test = base.extend({
  /**
   * Auto-fixture: wraps every test to collect Istanbul coverage.
   * Writes JSON files to .temp/e2e-coverage/ for the teardown to process.
   */
  page: async ({ page }, use, testInfo) => {
    // Hand the page to the actual test.
    await use(page);

    if (!collectCoverage) return;

    // Collect Istanbul coverage from window.__coverage__
    const istanbulCoverage = await page.evaluate(
      () => (globalThis as Record<string, unknown>).__coverage__ ?? null,
    );
    if (istanbulCoverage) {
      const id = crypto.randomUUID();
      fs.mkdirSync(COVERAGE_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(COVERAGE_DIR, `istanbul-${testInfo.workerIndex}-${id}.json`),
        JSON.stringify(istanbulCoverage),
      );
    }
  },
});
