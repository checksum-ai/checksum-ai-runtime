import {
  Expect,
  Page,
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  Locator,
} from "@playwright/test";

interface ChecksumAIMethod {
  (title: string): IChecksumPage;
  <T>(title: string, body: () => T | Promise<T>): Promise<T>;
}

type EnumValues<T> = T[keyof T];

export interface CompoundSelectorLocatorInterface extends PWLocators {}
export interface IVariablesStore {
  [key: string]: any;
}

export interface IChecksumPage extends Page {
  checksumSelector: (id: string) => IChecksumPage;
  checksumAI: ChecksumAIMethod;
  /**
   * Will create a compound selection that selects an element by grouping multiple locators
   * and find the target element from their common root parent
   *
   * * **Usage**
   *
   * ```js
   * await page.compoundSelection([
   *  page.getByText('My first anchor'),
   *  page.locator('selector to second anchor')
   * ]).locator("<relative selector to target element>").click();
   * ```
   *
   * @param locators Array of locators to group and calculate the common parent
   * @returns CompoundSelectorLocatorInterface - a locator that will expect a locator method to point the target element
   */
  compoundSelection: (locators: Locator[]) => CompoundSelectorLocatorInterface;
  resolveAssetsFolder: (assets: string[]) => string[];
  getPage(index: number): Promise<IChecksumPage>;
  reauthenticate: (role: string) => Promise<void>;
  locator(
    selector: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: string | RegExp;
      hasText?: string | RegExp;
    }
  ): ChecksumLocator;
}
export interface ChecksumLocator extends Locator {
  canvasClick: (canvasText: string, rectSizeIndex?: number) => Promise<void>;
}

declare class Wrapper<ExtendedMatchers, T> {
  expecter: Expect<ExtendedMatchers>;
  apply(e: T);
  soft(e: T);
  poll(e: T);
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
  withChecksumAI: () => Promise<void>;
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
  { role, environment }?: { role?: string; environment?: string }
) => Promise<void>;

export function getChecksumConfig(
  config: Partial<ChecksumConfig>
): ChecksumConfig;

type ChecksumPlaywrightTestArgs = Omit<PlaywrightTestArgs, "page"> & {
  page: IChecksumPage;
  variablesStore: IVariablesStore;
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
  getEnvironment: ({
    name,
    userRole,
  }: {
    name?: string;
    userRole?: string;
  }) => {
    environment: ChecksumConfigEnvironment;
    user: EnvironmentUser;
    login: ReturnType<typeof getLogin>;
  };
};

export enum Locators {
  Locator = "locator",
  GetByRole = "getByRole",
  GetByText = "getByText",
  GetByLabel = "getByLabel",
  GetByPlaceholder = "getByPlaceholder",
  GetByAltText = "getByAltText",
  GetByTitle = "getByTitle",
  GetByTestId = "getByTestId",
  FrameLocator = "frameLocator",
}

export type PWLocators = Pick<Locator, EnumValues<typeof Locators>>;
