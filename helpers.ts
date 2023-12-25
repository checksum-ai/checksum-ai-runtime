import { Page } from "@playwright/test";

export async function simulateDate(datetime: string, page: Page) {
  const simulatedDate = new Date(datetime).valueOf();

  await page.addInitScript(`{
      // Extend Date constructor to default to fakeNow
      Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super(${simulatedDate});
          } else {
            super(...args);
          }
        }
      }
      // Override Date.now() to start from fakeNow
      const __DateNowOffset = ${simulatedDate} - Date.now();
      const __DateNow = Date.now;
      Date.now = () => __DateNow() + __DateNowOffset;
    }`);
}
