import { RunMode, getChecksumConfig } from "@checksum-ai/runtime";

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

  options: {
    /**
     * Whether to use Checksum Smart Selector when an action fails (see README)
     */
    useChecksumSelectors: true,
    /**
     * Whether to use Checksum AI when an action fails (see README)
     */
    useChecksumAI: true,
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
