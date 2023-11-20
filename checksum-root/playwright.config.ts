import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  timeout: 120000,
  testMatch: [/.*.[.]checksum.spec.ts/],
  testDir: ".",
  /* disable parallel test runs */
  workers: 1,
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on",
    video: "on",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "checksumpage",
      use: { ...devices["Desktop Chrome"] },
      testDir: "./src/lib/runtime",
    },
  ],
});
