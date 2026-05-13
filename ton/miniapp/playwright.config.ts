import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 6_000 },
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3015",
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone 13 — mobile-first
    locale: "en-US",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["iPhone 13"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
