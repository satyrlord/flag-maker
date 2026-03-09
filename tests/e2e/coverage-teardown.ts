/**
 * Playwright global teardown for e2e coverage.
 *
 * Reads Istanbul coverage JSON files from .temp/e2e-coverage/,
 * merges them via monocart-coverage-reports, and produces
 * console-details + lcov reports in coverage/e2e/.
 *
 * Only runs when E2E_COVERAGE=true.
 *
 * Pure domain-logic files (geometry.ts, utils.ts) are excluded
 * because their functions are not exercisable through the UI.
 * Those files are fully covered by vitest unit tests instead.
 * leftbarConfig.ts is also excluded: it contains pure validation logic that
 * is fully covered by vitest integration tests and does not execute through
 * the Playwright UI, so it would appear uncovered in any e2e report.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { CoverageReport } from "monocart-coverage-reports";

/**
 * Files excluded from e2e coverage.
 *
 * - geometry.ts, utils.ts: pure domain logic not exercisable through the UI;
 *   fully covered by vitest unit tests.
 * - leftbarConfig.ts: data-only module.
 */
const E2E_EXCLUDE = ["geometry.ts", "utils.ts", "leftbarConfig.ts"];
const COVERAGE_THRESHOLD = 80;

const COVERAGE_DIR = path.resolve(".temp/e2e-coverage");
const OUTPUT_DIR = path.resolve("coverage/e2e");

interface IstanbulFileCoverage {
  path?: string;
  statementMap: Record<string, { start: { line: number } }>;
  fnMap: Record<string, unknown>;
  branchMap: Record<string, unknown>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

interface CoverageSummary {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

function cloneFileCoverage(data: IstanbulFileCoverage): IstanbulFileCoverage {
  return {
    ...data,
    statementMap: { ...data.statementMap },
    fnMap: { ...data.fnMap },
    branchMap: { ...data.branchMap },
    s: { ...data.s },
    f: { ...data.f },
    b: Object.fromEntries(
      Object.entries(data.b).map(([key, values]) => [key, [...values]]),
    ),
  };
}

function mergeFileCoverage(
  target: IstanbulFileCoverage,
  source: IstanbulFileCoverage,
): void {
  for (const [key, value] of Object.entries(source.s)) {
    target.s[key] = (target.s[key] ?? 0) + value;
  }
  for (const [key, value] of Object.entries(source.f)) {
    target.f[key] = (target.f[key] ?? 0) + value;
  }
  for (const [key, values] of Object.entries(source.b)) {
    const existing = target.b[key] ?? Array.from({ length: values.length }).fill(0);
    target.b[key] = values.map((value, index) => (existing[index] ?? 0) + value);
  }
}

function toPercent(covered: number, total: number): number {
  return total === 0 ? 100 : (covered / total) * 100;
}

function summarizeCoverage(data: IstanbulFileCoverage): CoverageSummary {
  const statementHits = Object.values(data.s);
  const functionHits = Object.values(data.f);
  const branchHits = Object.values(data.b).flat();

  const lineHits = new Map<number, number>();
  for (const [statementId, location] of Object.entries(data.statementMap)) {
    const line = location.start.line;
    const hits = data.s[statementId] ?? 0;
    lineHits.set(line, Math.max(lineHits.get(line) ?? 0, hits));
  }

  return {
    statements: toPercent(
      statementHits.filter((hits) => hits > 0).length,
      statementHits.length,
    ),
    branches: toPercent(
      branchHits.filter((hits) => hits > 0).length,
      branchHits.length,
    ),
    functions: toPercent(
      functionHits.filter((hits) => hits > 0).length,
      functionHits.length,
    ),
    lines: toPercent(
      Array.from(lineHits.values()).filter((hits) => hits > 0).length,
      lineHits.size,
    ),
  };
}

function assertCoverageThresholds(
  mergedCoverage: Record<string, IstanbulFileCoverage>,
): void {
  const failures: string[] = [];

  for (const [filePath, coverage] of Object.entries(mergedCoverage)) {
    const summary = summarizeCoverage(coverage);
    const failingMetrics = Object.entries(summary)
      .filter(([, percent]) => percent < COVERAGE_THRESHOLD)
      .map(([metric, percent]) => `${metric} ${percent.toFixed(2)}%`);

    if (failingMetrics.length > 0) {
      failures.push(`${path.relative(process.cwd(), filePath)}: ${failingMetrics.join(", ")}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      [
        `E2E coverage threshold failure: each file must reach ${COVERAGE_THRESHOLD}% for statements, branches, functions, and lines.`,
        ...failures,
      ].join("\n"),
    );
  }
}

export default async function globalTeardown(): Promise<void> {
  if (!process.env.E2E_COVERAGE) return;
  if (!fs.existsSync(COVERAGE_DIR)) return;

  const files = fs
    .readdirSync(COVERAGE_DIR)
    .filter((f) => f.endsWith(".json") && f.startsWith("istanbul-"));

  if (files.length === 0) return;

  const report = new CoverageReport({
    name: "E2E Coverage",
    outputDir: OUTPUT_DIR,
    reports: [["console-details"], ["lcovonly", { file: "lcov.info" }]],
    cleanCache: true,
  });
  const mergedCoverage: Record<string, IstanbulFileCoverage> = {};

  for (const file of files) {
    const raw = fs.readFileSync(path.join(COVERAGE_DIR, file), "utf-8");
    const data = JSON.parse(raw) as Record<string, IstanbulFileCoverage>;
    // Remove excluded files from Istanbul coverage data
    for (const key of Object.keys(data)) {
      if (E2E_EXCLUDE.some((name) => key.endsWith(name))) {
        delete data[key];
      }
    }

    for (const [filePath, fileCoverage] of Object.entries(data)) {
      if (!mergedCoverage[filePath]) {
        mergedCoverage[filePath] = cloneFileCoverage(fileCoverage);
      } else {
        mergeFileCoverage(mergedCoverage[filePath], fileCoverage);
      }
    }

    if (Object.keys(data).length > 0) {
      await report.add(data);
    }
  }

  await report.generate();
  assertCoverageThresholds(mergedCoverage);

  // Clean up temp coverage files
  fs.rmSync(COVERAGE_DIR, { recursive: true, force: true });
}
