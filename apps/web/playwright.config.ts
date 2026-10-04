import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    // Set where a browser is preinstalled outside Playwright's cache.
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The offline tests need the production build: the service worker exists only there.
  webServer: {
    command: `pnpm build && pnpm preview --port ${String(PORT)} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
