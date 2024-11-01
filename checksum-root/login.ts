import { 
  ChecksumConfig, 
  IChecksumPage,
  ChecksumConfigEnvironment,
  EnvironmentUser 
} from "@checksum-ai/runtime";
import { expect, request } from "@playwright/test";

export default async function login(
  page: IChecksumPage,
  config: ChecksumConfig,
  environmentInfo: { environment: ChecksumConfigEnvironment; user: EnvironmentUser }
) {
  /**
   * This code provides examples of how to write functions for different login scenarios.
   * See README for more details
   *
   * Example with Seed Function:
   */
  // const apiContext = await request.newContext();
  // const response = await apiContext.get("https://example.com/createseed");
  // const { username, password } = await response.json();
  // await page.goto("/login");
  // await page.getByPlaceholder("Email...").fill(process.env.username);
  // await page.getByPlaceholder("Password...").fill(process.env.password);
  // await page.getByText("Login").click();
  // await expect(page.getByText("Login Successful")).toBeVisible();

  /**
   * Example with Default Username and Password:
   * This example demonstrates how to log in to a page using a predefined username and password from a config file.
   */
  // await page.goto("/login");
  // await page.getByPlaceholder("Email...").fill(config.username);
  // await page.getByPlaceholder("Password...").fill(config.password);
  // await page.getByText("Login").click();
  // await expect(page.getByText("Login Successful")).toBeVisible();
}
