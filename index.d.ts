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

// import { ExpectWrapper } from "./index.helpers";
interface ChecksumAIMethod {
  (title: string): IChecksumPage;
  <T>(title: string, body: () => T | Promise<T>): Promise<T>;
}

type EnumValues<T> = T[keyof T];

export interface IVariableStore {
  [key: string]: any;
}
// backward compatibility
export type IVariablesStore = IVariableStore;

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

type Apply_MakeMatchers<ExtendedMatchers, T> = ReturnType<
  ExpectWrapper<ExtendedMatchers, T>["apply"]
>;
type Soft_MakeMatchers<ExtendedMatchers, T> = ReturnType<
  ExpectWrapper<ExtendedMatchers, T>["soft"]
>;
type Poll_MakeMatchers<ExtendedMatchers, T> = ReturnType<
  ExpectWrapper<ExtendedMatchers, T>["poll"]
>;

type ChecksumMakeMatchers<MakeMatchers> = MakeMatchers & {
  checksumAI: (thought: string) => MakeMatchers;
  withChecksumAI: () => Promise<void>;
};

export interface IChecksumExpect<ExtendedMatchers = {}>
  extends Expect<ExtendedMatchers> {
  checksumAI: (thought: string) => IChecksumExpect<ExtendedMatchers>;
  skipAIFallback: <T = unknown>(
    actual: T,
    messageOrOptions?: string | { message?: string }
  ) => MakeMatchers<void, T, ExtendedMatchers>;

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
export enum AutoRecoveryMode {
  Regular = "regular",
  Fast = "fast",
  ExtraFast = "extra_fast",
}
export type RuntimeOptions = {
  /**
   * Whether to use Checksum Smart Selector when trying to locate an element to perform an action
   */
  useChecksumSelectors: boolean;
  /**
   * Whether to use Checksum AI when trying to perform an action or an assertion
   * @param arVersion - Whether to use the new auto recovery system. If not provided, it will use the old AR system.
   * 1- basic AR, 2 - new AR
   */
  useChecksumAI:
    | boolean
    | {
        actions: boolean;
        assertions: boolean;
        visualComparison?: boolean;
        arMode?: AutoRecoveryMode; 
        arVersion?: 1|2;
      };
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

  /**
   * Model configuration
   */
  modelConfig?: Partial<{
    skipCompleteOriginHeaderOnDisableWebSecurity?: boolean;
    browserArgs?: Partial<{
      skipDisableWebSecurity?: boolean;
      skipAllowFileAccessFromFiles?: boolean;
      skipDisableSiteIsolationTrials?: boolean;
      skipAllowRunningInsecureContent?: boolean;
    }>;
  }>;

  /**
   * Time to wait before adding the browser script [ms]
   */
  browserScriptAddWait?: number;

  /**
   * Time to wait before initializing the browser script [ms]
   */
  browserScriptInitWait?: number;
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

  environments?: ChecksumConfigEnvironment[];

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

export type ChecksumLoginFunctionParams<PayloadType = any> = {
  environment: ChecksumConfigEnvironment;
  user: EnvironmentUser;
  config?: ChecksumConfig;
  payload?: PayloadType;
};

export type ChecksumLoginFunction<PayloadType = any> = (
  page: IChecksumPage,
  params: ChecksumLoginFunctionParams<PayloadType>
) => Promise<void>;

export function getLogin(): (
  page: Page | IChecksumPage,
  { role, environment }?: { role?: string; environment?: string }
) => Promise<void>;

export function getChecksumConfig(
  config: Partial<ChecksumConfig>
): ChecksumConfig;
export type ExecuteCodeCallback = (err: any, result: any) => void;

export type ExecuteCodeListener = (
  code: string,
  callback: ExecuteCodeCallback
) => void;

export interface IVisualTestGenerator {
  eval: (listener: ExecuteCodeListener) => Promise<void>;
}
type ChecksumPlaywrightTestArgs = Omit<PlaywrightTestArgs, "page"> & {
  page: IChecksumPage;
  variablesStore: IVariableStore;
  variableStore: IVariableStore;
  vs: IVariableStore;
  vtg: IVisualTestGenerator;
};

type ChecksumTestType<TestArgs> = TestType<
  TestArgs & PlaywrightTestOptions,
  PlaywrightWorkerArgs & PlaywrightWorkerOptions
>;
export type ChecksumAIOptions = {
  withDialog?: boolean;
  skipAIFallback?: boolean;
};
export type ChecksumAI = {
  (description: string, testFunction: Function): Promise<any>;
} & {
  [K in keyof ChecksumAIOptions]: ChecksumAI;
};

interface DefineChecksumIdMethod {
  (title: string, testId: undefined, flowId: string): string;
  (title: string, testId: string, flowId?: string): string;
}
/**
 * Initialize Checksum runtime
 *
 * @param base
 */
export function init(base?: ChecksumTestType<PlaywrightTestArgs>): {
  test: ChecksumTestType<ChecksumPlaywrightTestArgs>;
  login: ReturnType<typeof getLogin>;
  defineChecksumTest: DefineChecksumIdMethod;
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

export class ExpectWrapper<ExtendedMatchers, T> {
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

declare global {
  const repl: (cliMode?: boolean, messageFileSuffix?: string) => string;
}
