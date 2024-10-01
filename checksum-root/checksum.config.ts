import { RunMode, getChecksumConfig } from "@checksum-ai/runtime";
import { resolve } from "path";
require("dotenv").config({ path: resolve(__dirname, ".env") });

export default getChecksumConfig({
  /**
   * Checksum Run mode. See Readme for more info
   */
  runMode: RunMode.Normal,

  /**
   * Insert here your Checksum API key. You can find it in https://app.checksum.ai/#/settings/
   */
  apiKey: "<API key>",

  /**
   * This is the base URL of the tested app. E.g. https://example.com. URLs in the tests will be relative to the base URL.
   */
  baseURL: "<base URL>",

  /**
   * Insert the account's username that will be used
   * to login into your testing environment
   */
  username: "<username>",

  /**
   * Insert the account's password that will be used
   * to login into your testing environment
   */
  password: "<password>",

  /**
   * The credentials of the users that will be used to login into your testing environment
   * Uncomment if you require support for multiple users
   */
  // users: [
  //   {
  //     role: "host",
  //     username: "<host username>",
  //     password: "<host password>",
  //   },
  //   {
  //     role: "guest",
  //     username: "<guest username>",
  //     password: "<guest password>",
  //   },
  // ],

  options: {
    /**
     * Whether to use Checksum Smart Selector in order to recover from failing to locate an element for an action (see README)
     */
    useChecksumSelectors: true,
    /**
     * Whether to use Checksum AI in order to recover from a failed action or assertion (see README)
     */
    useChecksumAI: { actions: true, assertions: false },
    /**
     * Whether to use mock API data when running your tests (see README)
     */
    useMockData: false,
    /**
     * Whether to Upload HTML test reports to app.checksum.ai so they can be viewed through the UI. Only relevant if Playwright reporter config is set to HTML
     * Reports will be saved locally either way (according to Playwright Configs) and can be viewed using the CLI command show-reports.
     */
    hostReports: !!process.env.CI,
    /**
     * Whether to create a PR with healed tests. Only relevant when in Heal mode.
     */
    autoHealPRs: !!process.env.CI,
  },
});
