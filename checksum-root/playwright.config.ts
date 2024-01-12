import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
require("dotenv").config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "..",
  /* Set test timeout to 10 minutes (relatively long) as Checksum implements its own timeout mechanism */
  timeout: 1000 * 60 * 10,
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [["html", { open: "never", outputFolder: "test-results" }], ["line"]]
    : "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on",
    video: "on",
    screenshot: "on",
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
    permissions: ["clipboard-read"],
    actionTimeout: 1000 * 5, // set action timeout for 5 seconds. When an action times out, checksum's Autonomus Agent kicks in and attempts to fix the test.
    navigationTimeout: 1000 * 30, 

  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.05, maxDiffPixels: 200 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      testMatch: /checksum.spec/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
