/**
 * Playwright global setup for e2e coverage.
 *
 * Clears the Istanbul coverage temp directory before each run so that
 * stale JSON files from previous runs do not contaminate the merged report.
 *
 * Only runs when E2E_COVERAGE=true.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const COVERAGE_DIR = path.resolve(".temp/e2e-coverage");

export default async function globalSetup(): Promise<void> {
  if (!process.env.E2E_COVERAGE) return;
  if (fs.existsSync(COVERAGE_DIR)) {
    fs.rmSync(COVERAGE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}
