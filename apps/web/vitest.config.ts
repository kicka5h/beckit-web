import { defineProject } from "vitest/config";

export default defineProject({
  // e2e/ holds Playwright tests, which run in real browsers through `pnpm e2e`.
  test: { name: "web", environment: "happy-dom", include: ["src/**/*.test.{ts,tsx}"] },
});
