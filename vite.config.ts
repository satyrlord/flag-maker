/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { spawnSync } from "node:child_process";
import istanbul from "vite-plugin-istanbul";

/**
 * Last commit from upstream mohadian/flag-maker before this fork began.
 * Used to count only fork-local commits for the version string.
 *
 * To update: run `git log --oneline <upstream-remote>/main | tail -1` to find
 * the last upstream commit, then replace this value with that commit SHA.
 */
const FORK_POINT = "0c76266";
// Validate at startup so a mis-typed SHA is caught immediately rather than silently producing wrong version numbers.
if (!/^[0-9a-f]{7,40}$/i.test(FORK_POINT)) {
  throw new Error(`[vite] FORK_POINT "${FORK_POINT}" is not a valid git commit SHA.`);
}

/**
 * Returns the number of git commits since the fork point.
 * Called once synchronously at config evaluation time (every dev server start
 * and every build). spawnSync completes in <10 ms on a local checkout;
 * falls back to 0 if git is unavailable (shallow clone, Docker, CI without git, etc.).
 */
function getCommitCount(): number {
  // Use spawnSync with an explicit arg array -- no shell expansion, no injection risk.
  try {
    // Verify FORK_POINT actually exists in this repository before counting.
    // A hex string that passes the regex but is not a real commit would silently count from the wrong base.
    const verify = spawnSync("git", ["rev-parse", "--verify", FORK_POINT], { encoding: "utf-8" });
    if (verify.error || verify.status !== 0) {
      console.warn(`[vite] FORK_POINT "${FORK_POINT}" was not found in the repository; __COMMIT_COUNT__ will be 0.`);
      return 0;
    }
    const result = spawnSync("git", ["rev-list", "--count", `${FORK_POINT}..HEAD`], { encoding: "utf-8" });
    if (!result.error && result.status === 0) {
      return Number(result.stdout.trim());
    }
  } catch {
    // ignore
  }
  // git unavailable (shallow clone, Docker, etc.) -- version will show 0
  console.warn("[vite] Could not read git commit count; __COMMIT_COUNT__ will be 0.");
  return 0;
}

export default defineConfig({
  base: "/flag-maker/",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // Inject git commit count as a compile-time constant for version display in the topbar.
  define: {
    __COMMIT_COUNT__: JSON.stringify(getCommitCount()),
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  build: {
    sourcemap: process.env.E2E_COVERAGE === "true",
  },
  plugins: [
    ...(process.env.E2E_COVERAGE === "true"
      ? [
          istanbul({
            include: "src/**/*.ts",
            exclude: ["node_modules", "tests"],
            extension: [".ts"],
            forceBuildInstrument: true,
          }),
        ]
      : []),
  ],
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts", "src/index.css", "src/types.ts"],
      reporter: ["text", "lcov"],
      thresholds: {
        perFile: true,
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
