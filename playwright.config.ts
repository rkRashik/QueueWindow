import { config } from "dotenv";
import { defineConfig } from "@playwright/test";

config({ path: ".env.test.local", quiet: true });

const port = Number(process.env.QW_TEST_PORT || 3210);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    env: {
      APP_URL: baseURL,
      ...(process.env.QW_E2E_DATABASE_URL
        ? { DATABASE_URL: process.env.QW_E2E_DATABASE_URL }
        : {}),
    },
    timeout: 60_000,
  },
});
