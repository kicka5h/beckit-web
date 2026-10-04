import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*", "server"],
    coverage: {
      provider: "v8",
      // Core is the protected layer (STYLE.md): every line and branch must be tested.
      include: ["packages/core/src/**/*.ts"],
      exclude: ["**/*.test.ts", "packages/core/src/index.ts"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
      reporter: ["text"],
    },
  },
});
