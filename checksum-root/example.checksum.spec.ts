import { init } from "@checksum-ai/runtime";
const { test, defineChecksumTest, login, expect, checksumAI } = init();

test.describe("Example test", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test(
    defineChecksumTest("Navigate to home page", "TEST_ID"),
    async ({ page }) => {
      await page.goto("/");
    }
  );
});
