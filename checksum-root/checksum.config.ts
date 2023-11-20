import { RunMode, getChecksumConfig } from "@checksum-ai/runtime";

export default getChecksumConfig({
  /**
   * Checksum runtime running mode -
   * normal -   tests run normally
   * heal -     checksum will attempt to heal tests that failed using fallback
   * refactor - checksum will attempt to refactor and improve your tests
   */
  runMode: RunMode.Normal,

  /**
   * Insert here your Checksum API key
   */
  apiKey: "<API key>",

  /**
   * This is the base URL of the tested app
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
     * Whether to fallback to ESRA if the action selector is not found
     */
    actionsESRAfallback: true,

    /**
     * Whether to use LLM fallback if action selector is not found
     */
    actionsLLMFallback: true,

    /**
     * Whether to use mock API data when running your tests
     */
    useMockData: false,

    /**
     * Print runtime logs.
     * Use for debug only
     */
    printLogs: false,
  },
});
