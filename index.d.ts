import {
  Expect,
  Page,
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  Locator,
  FrameLocator,
  Dialog,
} from "@playwright/test";

interface ChecksumAIMethod {
  (title: string): IChecksumPage;
  <T>(title: string, body: () => T | Promise<T>): Promise<T>;
}

type EnumValues<T> = T[keyof T];

export interface IVariablesStore {
  [key: string]: any;
}

type ModifyLocatorMethodToChecksumLocator<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Locator // Check if the property is a function returning Locator
    ? (...args: Parameters<T[K]>) => ChecksumLocator // Change its return type to ChecksumLocator
    : T[K]; // Keep the rest of the fields as they are
};
type ModifyFrameLocatorMethodToChecksumFrameLocator<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => FrameLocator // Check if the property is a function returning Locator
    ? (...args: Parameters<T[K]>) => ChecksumFrameLocator // Change its return type to ChecksumLocator
    : T[K]; // Keep the rest of the fields as they are
};

type ModifyPlaywrightLocatorMethods<T> =
  ModifyFrameLocatorMethodToChecksumFrameLocator<
    ModifyLocatorMethodToChecksumLocator<T>
  >;

export interface IChecksumPage
  extends ModifyPlaywrightLocatorMethods<Page>,
    CompoundSelectionInterface {
  checksumSelector: (id: string) => IChecksumPage;
  checksumAI: ChecksumAIMethod;

  resolveAssetsFolder: (assets: string[]) => string[];
  getPage(index: number): Promise<IChecksumPage>;
  reauthenticate: (role: string) => Promise<void>;
  waitForDialog: (timeout?: number) => Promise<Dialog>;
}

export interface CompoundSelectionInterface {
  /**
   * Will create a compound selection that selects elements by grouping multiple locators as anchors
   * and finding the target elements, if specified, from their common root parent.
   * If no target is provided, the compound selection will return a locator to the common parents that were calculated from the anchors.
   *
   * **Usage example**
   *
   * ```js
   * await page.compoundSelection(
   *  (base) => [base.getByText("<selector to first anchor>""), page.locator("selector to second anchor"), "<text content of third anchor>"],
   *  (base) => base.locator("<relative selector to target element>")
   * ]).first().click();
   * ```
   *
   * @param anchors Method that returns array of locators and/or text context, to group and calculate the common parent from.
   *                The method receives the base locator as an argument, which is the relative locator or page that the compound selection is called on.
   *                The method should return an array of locators or strings that point at the anchor elements.
   * @param target [optional] Method that returns the relative locator or string content that will point at the target element from the common parent
   *               that was calculated from the anchors.
   *               If no target is provided, the compound selection will return a locator pointing at the common parents.
   * @returns Locator to the common parent(s) or the target element(s) if specified.
   */
  compoundSelection(
    anchors: (base: Locator) => Array<Locator | string>,
    target?: (base: Locator) => Locator | string
  ): ChecksumLocator;

  /**
   * Will create a compound selection that selects elements by grouping multiple locators as anchors
   * and finding the target elements, if specified, from their common root parent.
   * If no target is provided, the compound selection will return a locator to the common parents that were calculated from the anchors.
   *
   * **Usage example**
   *
   * ```js
   * await page.compoundSelection({
   *    anchors: (base) => [base.getByText("<selector to first anchor>""), page.locator("selector to second anchor"), "<text content of third anchor>"],
   *    target?: (base) => base.locator("<relative selector to target element>")
   * }).first().click();
   * ```
   * @param selection
   * @returns Locator to the common parent(s) or the target element(s) if specified.
   */
  compoundSelection(selection: {
    /**
     * Method that returns array of locators and/or text context, to group and calculate the common parent from.
     * The method receives the base locator as an argument, which is the relative locator or page that the compound selection is called on.
     * The method should return an array of locators or strings that point at the anchor elements.
     *
     * @param base Base locator that the compound selection is called on.
     */
    anchors: (base: Locator) => Array<Locator | string>;
    /**
     * Method that returns the relative locator or string content that will point at the target element from the common parent
     * that was calculated from the anchors.
     * If the target is null, the compound selection will return a locator pointing at the common parents.
     *
     * @param base Base locator that the compound selection is called on.
     */
    target?: (base: Locator) => Locator | string;
  }): ChecksumLocator;
}

export interface ChecksumFrameLocator
  extends ModifyPlaywrightLocatorMethods<FrameLocator>,
    CompoundSelectionInterface {}

export interface ChecksumLocator
  extends ModifyPlaywrightLocatorMethods<Locator>,
    CompoundSelectionInterface {
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
  vs: IVariablesStore;
};

type ChecksumTestType<TestArgs> = TestType<
  TestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;

export type ChecksumAI = {
  (description: string, testFunction: Function): Promise<any>;
  withDialog: ChecksumAI;
};
/**
 * Initialize Checksum runtime
 *
 * @param base
 */
export function init(base?: ChecksumTestType<PlaywrightTestArgs>): {
  test: ChecksumTestType<ChecksumPlaywrightTestArgs>;
  login: ReturnType<typeof getLogin>;
  defineChecksumTest: (title: string, testId: string) => string;
  expect: IChecksumExpect;
  checksumAI: ChecksumAI;
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

// export type PWLocators = Pick<Locator, EnumValues<typeof Locators>>;
