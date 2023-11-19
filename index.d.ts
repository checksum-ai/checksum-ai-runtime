import { Page } from "@playwright/test";

export interface IChecksumPage extends Page {
  initWithTest: (testInfo) => Promise<void>;
  checksumId: (id: string) => IChecksumPage;
  checksumStep: (thought: string, testFunction?: () => void) => IChecksumPage;
  testId: (testId: string) => void;
}

export enum RunMode {
  Normal = "normal",
  Heal = "heal",
  Refactor = "refactor",
}

export type RuntimeOptions = {
  /**
   * fallback to ESRA if the action selector is not found
   */
  actionsESRAfallback: boolean;
  /**
   * use LLM fallback if action selector is not found
   */
  actionsLLMFallback: boolean;
  /**
   * add new assertions
   */
  newAssertionsEnabled: boolean;
  /**
   * use mocked data
   */
  useMockData: boolean;
  /**
   * print logs to console
   */
  printLogs: boolean;
};

export type ChecksumConfig = {
  /**
   * Checksum runtime running mode -
   * normal -   tests run normally
   * heal -     checksum will attempt to heal tests that failed using fallback
   * refactor - checksum will attempt to refactor and improve your tests
   */
  runMode: RunMode;
  /**
   * Checksum API key
   */
  apiKey: string;
  /**
   * Base URL of the tested app (i.e http://staging.example.com)
   */
  baseURL: string;

  apiURL: string;
  /**
   * Account's username that will be used
   * to login into your testing environment
   */
  username?: string;
  /**
   * Account's password that will be used
   * to login into your testing environment
   */
  password?: string;
  options?: Partial<RuntimeOptions>;
};

export function getLogin(): (page: Page) => Promise<void>;

export function getChecksumConfig(
  config: Partial<ChecksumConfig>
): ChecksumConfig;

export function init(
  base: TestType<
    PlaywrightTestArgs & PlaywrightTestOptions,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >
): {
  test: TestType<
    PlaywrightTestArgs & PlaywrightTestOptions,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >;
  login: ReturnType<typeof getLogin>;
};
