import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const SYNC_APP_PORT = 4174;
const SYNC_SERVER_PORT = 8787;
const DEV_TOKEN = "e2e";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // The sync tests share one in-memory server, so test files run one at a time.
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Set where a browser is preinstalled outside Playwright's cache.
    launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE },
  },
  projects: [
    {
      name: "device",
      testIgnore: /sync\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${String(PORT)}` },
    },
    {
      name: "sync",
      testMatch: /sync\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${String(SYNC_APP_PORT)}` },
    },
  ],
  // The offline tests need the production build: the service worker exists only there. The sync
  // tests use a second build that syncs with a local server through a fixed development token.
  webServer: [
    {
      command: `pnpm build && pnpm preview --port ${String(PORT)} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm exec vite build --outDir dist-sync && pnpm exec vite preview --outDir dist-sync --port ${String(SYNC_APP_PORT)} --strictPort`,
      port: SYNC_APP_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_SYNC_URL: `http://localhost:${String(SYNC_SERVER_PORT)}`,
        VITE_DEV_TOKEN: DEV_TOKEN,
      },
    },
    {
      command: "pnpm --filter @beckit/server dev",
      port: SYNC_SERVER_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(SYNC_SERVER_PORT),
        DEV_TOKEN,
        ALLOWED_ORIGINS: `http://localhost:${String(SYNC_APP_PORT)}`,
      },
    },
  ],
});
