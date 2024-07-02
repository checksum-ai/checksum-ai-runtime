import {
  Expect,
  Page,
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from "@playwright/test";

interface ChecksumAIMethod {
  (title: string): IChecksumPage;
  <T>(title: string, body: () => T | Promise<T>): Promise<T>;
}

export interface IChecksumPage extends Page {
  checksumSelector: (id: string) => IChecksumPage;
  checksumAI: ChecksumAIMethod;
  resolveAssetsFolder: (assets: string[]) => string[];
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
  checksumAI: (thought: string) => IChecksumExpect<ExtendedMatchers>;
  <T = unknown>(
    actual: T,
    messageOrOptions?:
      | string
      | { message?: string; checksumAI?: boolean | string }
  ): ChecksumMakeMatchers<Apply_MakeMatchers<ExtendedMatchers, T>>;

  soft: <T = unknown>(
    actual: T,
    messageOrOptions?:
      | string
      | { message?: string; checksumAI?: boolean | string }
  ) => ChecksumMakeMatchers<Soft_MakeMatchers<ExtendedMatchers, T>>;

  poll: <T = unknown>(
    actual: () => T | Promise<T>,
    messageOrOptions?:
      | string
      | {
          message?: string;
          timeout?: number;
          intervals?: number[];
          checksumAI?: boolean | string;
        }
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

  environments?: ChecksumConfigEnvironment[];

  /**
   * The username/email that will be used
   * to login into your testing environment
   */
  username?: string;
  /**
   * The password that will be used
   * to login into your testing environment
   */
  password?: string;

  /**
   * The credentials of the users that will be used to login into your testing environment
   */
  users?: {
    role: string;
    username?: string;
    password?: string;
    default?: boolean;
  }[];

  /**
   * Checksum runtime options
   */
  options?: Partial<RuntimeOptions>;
};

export type ChecksumConfigEnvironment = {
  name: string;
  users?: EnvironmentUser[];
  baseURL: string;
  loginURL?: string;
  default?: boolean;
};

export type EnvironmentUser = {
  role: string;
  username?: string;
  password?: string;
  default?: boolean;
};

export function getLogin(): (
  page: Page,
  { role }: { role?: string } = {}
) => Promise<void>;

export function getChecksumConfig(
  config: Partial<ChecksumConfig>
): ChecksumConfig;

type ChecksumPlaywrightTestArgs = Omit<PlaywrightTestArgs, "page"> & {
  page: IChecksumPage;
};

type ChecksumTestType<TestArgs> = TestType<
  TestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

/**
 * Initialize Checksum runtime
 *
 * @param base
 */
export function init(base: ChecksumTestType<PlaywrightTestArgs>): {
  test: ChecksumTestType<ChecksumPlaywrightTestArgs>;
  login: ReturnType<typeof getLogin>;
  defineChecksumTest: (title: string, testId: string) => string;
  expect: IChecksumExpect;
  checksumAI: (description: string, testFunction: Function) => Promise<any>;
};
