import { Page } from "@playwright/test";

/**
 * Checksum runtime root folder
 */
export const CHECKSUM_ROOT_FOLDER = "checksum";

/**
 * Checksum runtime running mode -
 * normal -   tests run normally
 * heal -     checksum will attempt to heal tests that failed using fallback
 * refactor - checksum will attempt to refactor and improve your tests
 */
export enum RunMode {
  Normal = "normal",
  Heal = "heal",
  Refactor = "refactor",
}

export interface IChecksumPage extends Page {
  initWithTest: (testInfo) => Promise<void>;
  checksumId: (id: string) => IChecksumPage;
  checksumStep: (thought: string, testFunction?: () => void) => IChecksumPage;
  testId: (testId: string) => void;
}

export type RuntimeOptions = {
  /**
   * fallback to ESRA if the action selector is not found
   */
  actionsESRAfallback: boolean;
  actionsLLMFallback: boolean; // use LLM fallback if action selector is not found
  //   actionsChangeSelectors: boolean; // change the selector of the action if found better match
  //   existingAssertionsESRAfallback: boolean; // fallback to ESRA if the existing assertion selector is not found
  //   existingAssertionsChangeSelectors: boolean; // change the selector of existing assertion if found better match
  newAssertionsEnabled: boolean; // add new assertions
  writeTraceFile: boolean; // saves trace file at the end of the test
  useMockData: boolean; // use mocked data
  printLogs: boolean; // print logs to console
};

export type ChecksumConfig = {
  runMode: RunMode;
  apiKey: string;
  baseURL: string;
  username?: string;
  password?: string;
  options?: RuntimeOptions;

  apiURL: string;
  uploadAgentHOST: string;
  uploadAgentPort: number;
};

export type TestSuiteSession = {
  uuid: string;
  uploadURL: string;
};
