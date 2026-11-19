import { defineConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync(".artifacts", { recursive: true });
const port = Number(process.env.QW_TEST_PORT || 3000);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    env: {
      QW_ENABLE_TEST_FIXTURES: "1",
      TURSO_DATABASE_URL: "file:.artifacts/playwright-" + process.pid + ".db",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
