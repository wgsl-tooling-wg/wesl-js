import process from "node:process";
import { defineConfig, devices } from "@playwright/test";
import { testPort } from "./playwright.port.ts";

const port = process.env.PLAYWRIGHT_PORT || testPort;

export default defineConfig({
  webServer: {
    command: `pnpm run dev --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
  },

  testDir: "./src/test",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
