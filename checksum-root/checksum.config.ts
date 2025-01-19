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
   * Define your test run environments and test users within each environment.
   * The environments must be aligned with those set here:
   * https://app.checksum.ai/#/settings/
   */
  environments: [
    {
      name: "<The name of the environment>",
      baseURL:
        "<The base URL of the tested app. e.g. https://example.com. URLs in the tests will be relative to the base URL>",
      loginURL: "<The URL of the login page>",
      default: true,
      users: [
        {
          role: "<The role of the user, may be undefined in case of single user>",
          username: "<username>",
          password: "<password>",
          default: true,
        },
      ],
    },
  ],

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
