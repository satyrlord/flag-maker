/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import istanbul from "vite-plugin-istanbul";

export default defineConfig({
  base: "/flag-maker/",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
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
        statements: 82,
        branches: 82,
        functions: 82,
        lines: 82,
      },
    },
  },
});
