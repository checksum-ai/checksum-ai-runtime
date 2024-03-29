import { Expect, Page } from "@playwright/test";

export interface IChecksumPage extends Page {
  checksumSelector: (id: string) => IChecksumPage;
  checksumAI: (thought: string, testFunction?: () => void) => IChecksumPage;
}

class Wrapper<ExtendedMatchers, T> {
  expecter: Expect<ExtendedMatchers>;
  apply(e: T) {
    return this.expecter<T>(e);
  }
  soft(e: T) {
    return this.expecter.soft<T>(e);
  }
  poll(e: T) {
    return this.expecter.poll<T>(() => e);
  }
}

type Apply_MakeMatchers<ExtendedMatchers, T> = ReturnType<
  Wrapper<ExtendedMatchers, T>["apply"]
>;
type Soft_MakeMatchers<ExtendedMatchers, T> = ReturnType<
  Wrapper<ExtendedMatchers, T>["soft"]
>;
type Poll_MakeMatchers<ExtendedMatchers, T> = ReturnType<
  Wrapper<ExtendedMatchers, T>["poll"]
>;

type ChecksumMakeMatchers<MakeMatchers> = MakeMatchers & {
  checksumAI: (thought: string) => MakeMatchers;
};

export interface IChecksumExpect<ExtendedMatchers = {}>
  extends Expect<ExtendedMatchers> {
  <T = unknown>(
    actual: T,
    messageOrOptions?: string | { message?: string }
  ): ChecksumMakeMatchers<Apply_MakeMatchers<ExtendedMatchers, T>>;

  soft: <T = unknown>(
    actual: T,
    messageOrOptions?: string | { message?: string }
  ) => ChecksumMakeMatchers<Soft_MakeMatchers<ExtendedMatchers, T>>;

  poll: <T = unknown>(
    actual: () => T | Promise<T>,
    messageOrOptions?:
      | string
      | { message?: string; timeout?: number; intervals?: number[] }
  ) => ChecksumMakeMatchers<Poll_MakeMatchers<ExtendedMatchers, T>>;
}

export enum RunMode {
  Normal = "normal",
  Heal = "heal",
  Refactor = "refactor",
}

export type RuntimeOptions = {
  /**
   * Whether to use Checksum Smart Selector when trying to locate an element to perform an action
   */
  useChecksumSelectors: boolean;
  /**
   * Whether to use Checksum AI when trying to perform an action or an assertion
   */
  useChecksumAI: boolean | { actions: boolean; assertions: boolean };
  /**
   * Add new assertions
   */
  newAssertionsEnabled: boolean;
  /**
   * Use mocked data
   */
  useMockData: boolean;
  /**
   * Print logs to console
   */
  printLogs: boolean;
  /**
   * Save reports on checksum hosting servers
   */
  hostReports?: boolean;
  /**
   * Create a new PR for auto healed tests
   */
  autoHealPRs?: boolean;
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

  /**
   * Checksum runtime options
   */
  options?: Partial<RuntimeOptions>;
};

export function getLogin(): (page: Page) => Promise<void>;

export function getChecksumConfig(
  config: Partial<ChecksumConfig>
): ChecksumConfig;

/**
 * Initialize Checksum runtime
 *
 * @param base
 */
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
  defineChecksumTest: (title: string, testId: string) => string;
  expect: IChecksumExpect;
};
