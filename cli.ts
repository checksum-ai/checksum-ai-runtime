import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as childProcess from "child_process";
import { join } from "path";
import {
  CHECKSUM_ROOT_FOLDER,
  ChecksumConfig,
  TestSuiteSession,
} from "./types";

class ChecksumCLI {
  private readonly UPLOAD_AGENT_PATH = join(__dirname, "upload-agent.js");
  private readonly CHECKSUM_API_URL = "http://localhost:3000";

  private testSession: TestSuiteSession;
  private volatileChecksumConfig;
  private uploadAgent;
  private config: ChecksumConfig;

  private didFail = false;
  private mock = true;

  private completeIndicators = {
    upload: false,
    tests: false,
    report: false,
  };

  constructor() {}

  // rename install to init
  // rename run to test
  // rename import of playwright to our alias
  async execute() {
    switch (process.argv[2]) {
      case "init":
        this.install();
        break;
      case "test":
        if (process.argv?.[3] === "--help") {
          await this.printHelp("test");
          break;
        }
        await this.test(process.argv.slice(3));
        break;
      case "show-report":
        this.showReport(process.argv.slice(3));
        break;
      default:
        // should we simply forward to playwright in default case?
        await this.printHelp();
    }
    process.exit(0);
  }

  async execCmd(cmdString) {
    const child = await childProcess.spawn(cmdString, {
      shell: true,
      stdio: "inherit",
    });

    const exitPromise = new Promise((resolve, reject) => {
      child.on("exit", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Checsum failed execution with code: ${code} `));
        }
      });
    });

    return exitPromise;
  }

  async getCmdOutput(cmdString): Promise<string> {
    return new Promise<string>(function (resolve, reject) {
      childProcess.exec(cmdString, (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing command: ${error.message}`);
          return;
        }

        resolve(stdout);
      });
    });

    // return promise;
  }

  async printHelp(command?: string) {
    switch (command) {
      default:
        console.log(`
Checksum CLI
Usage: checksum [command] [options]

Commands:
init                            installs checksum files and folders
test [options] [test-filter...] runs checksum tests
help                            prints this help message
show-report [options] [report]  show HTML report
`);
        break;
      case "test":
        try {
          const cmd = `npx playwright test --help`;
          const testHelp = (await this.getCmdOutput(cmd))
            .replace(/npx playwright/g, "yarn checksum")
            .split("\n");
          testHelp
            .splice(
              5,
              0,
              "  --checksum-config=<config>   Checksum configuration in JSON format"
            )
            .join("\n");
          console.log(testHelp.join("\n"));
        } catch (e) {
          console.log("Error", e.message);
        }

        break;
    }
  }

  async showReport(args: string[]) {
    const cmd = `npx playwright show-report ${args.join(" ")}`;

    try {
      await this.execCmd(cmd);
    } catch (e) {
      console.log("Error showing report", e.message);
    }
  }

  async test(args: string[]) {
    // check for checksum config in command
    args = this.getChecksumConfigFromCommand(args);

    // load checksum config
    this.setChecksumConfig();

    // init new test session
    await this.getSession();

    // start upload agent
    let uploadAgentListeningPort;
    try {
      const { uuid, uploadURL } = this.testSession;
      // load upload agent, timout after 20 seconds
      uploadAgentListeningPort = await this.guardReturn(
        this.startUploadAgent(uuid, uploadURL),
        10_000,
        "Upload agent timeout"
      );
    } catch (e) {
      console.log(
        "Error starting upload agent. Test results will not be available on checksum."
      );
    }

    // write volatile config if set
    this.buildVolatileConfig();

    // build shell command
    const cmd = `${
      uploadAgentListeningPort
        ? `CHECKSUM_UPLOAD_AGENT_PORT=${uploadAgentListeningPort} `
        : ""
    } PWDEBUG=console npx playwright test --config ${this.getPlaywrightConfigFile()} ${args.join(
      " "
    )}`;

    try {
      // run tests
      await this.execCmd(cmd);
    } catch (e) {
      this.didFail = true;
      console.log("Error during test", e.message);
    } finally {
      const reportFile = this.getPlaywrightReportPath();
      if (!existsSync(reportFile)) {
        console.log(`Could not find report file at ${reportFile}`);
      } else {
        this.uploadAgent.stdin.write(`cli:report=${reportFile}`);
      }
      // upload report
      this.completeIndicators.tests = true;
      await this.handleCompleteMessage();
    }
  }

  getPlaywrightReportPath() {
    // default path
    let reportFolder = join(process.cwd(), "playwright-report");
    // check for playwright report path in config file
    // for now, ignore cases of multiple reporters
    const playwrightConfig = require(this.getPlaywrightConfigFile());
    const { reporter } = playwrightConfig;
    if (
      reporter instanceof Array &&
      reporter.length > 1 &&
      reporter[1]?.outputFolder
    ) {
      reportFolder = reporter[1]?.outputFolder;
    }

    // check for env variable
    if (process.env.PLAYWRIGHT_HTML_REPORT) {
      reportFolder = process.env.PLAYWRIGHT_HTML_REPORT;
    }

    return join(reportFolder, "index.html");
  }

  getPlaywrightConfigFile() {
    return join(this.getRootDirPath(), "playwright.config.ts");
  }

  startUploadAgent(sessionId: string, uploadURL: string) {
    return new Promise((resolve, reject) => {
      console.log("Starting upload agent");
      this.uploadAgent = childProcess.spawn("node", [
        this.UPLOAD_AGENT_PATH,
        JSON.stringify({
          sessionId,
          checksumApiURL: this.CHECKSUM_API_URL,
          apiKey: this.config.apiKey,
        }),
        ...(this.mock ? ["mock"] : []),
      ]);

      // Listen for messages from the upload agent
      this.uploadAgent.stdout.on("data", (data) => {
        const message = data.toString().trim();

        // if not a formatted message from upload agent - ignore
        if (!message.startsWith("upag:")) {
          //   console.log(`Message from upload agent: ${message}`); // remove
          return;
        }

        const [key, value] = message.substring(5).split("=");
        if (key === "port") {
          console.log("Received port from upload agent", value);
          resolve(value);
        } else {
          this.handleUploadAgentMessage(key, value);
        }
      });

      // Handle exit event
      this.uploadAgent.on("exit", (code, signal) => {
        console.log(
          `upload agent process exited with code ${code} and signal ${signal}`
        );
      });

      // Handle errors
      this.uploadAgent.on("error", (err) => {
        console.error(`Error starting upload agent: ${err.message}`);
      });
    });
  }

  private async handleUploadAgentMessage(key: any, value: any) {
    switch (key) {
      case "complete":
        // console.log("Received upload complete message from upload agent");
        this.sendUploadsComplete().then(() => {
          this.completeIndicators.upload = true;
        });
        break;
      case "report-uploaded":
        // console.log("Received report uploaded message from upload agent");
        const reportURL = await this.sendTestrunEnd();
        this.completeIndicators.report = true;
        if (reportURL) {
          console.log(
            `*******************\n* Checksum report URL: ${reportURL}\n*******************`
          );
        }
        break;

      default:
        console.warn(`Unhandled upload agent message: ${key}=${value}`);
    }
  }

  async handleCompleteMessage() {
    while (true) {
      if (
        Object.keys(this.completeIndicators).find(
          (key) => !this.completeIndicators[key]
        )
      ) {
        await this.awaitSleep(1000);
      } else {
        console.log("Tests complete");
        this.shutdown(this.didFail ? 1 : 0);
      }
    }
  }

  shutdown(code = 0) {
    this.cleanup();
    process.exit(code);
  }

  buildVolatileConfig() {
    // if no volatile config set - return
    if (!this.volatileChecksumConfig) {
      return;
    }

    const configPath = this.getVolatileConfigPath();
    const configString = `
    import { RunMode, getChecksumConfig } from "@checksum-ai/runtime";
    
    export default getChecksumConfig(${JSON.stringify(this.config, null, 2)});
    `;

    writeFileSync(configPath, configString);
  }

  cleanup() {
    this.deleteVolatileConfig();
    this.uploadAgent.stdin.write("cli:shutdown");
    this.uploadAgent.kill();
  }

  async getSession() {
    try {
      if (this.mock) {
        this.testSession = {
          uuid: "session-id-1234",
          uploadURL: "http://localhost:3000/upload",
        };
        return;
      }

      const apiKey = this.config.apiKey;
      if (!apiKey || apiKey === "<API key>") {
        console.error("No API key found in checksum config");
        this.shutdown(1);
      }

      const body = JSON.stringify(await this.getEnvInfo());
      const res = await fetch(`${this.CHECKSUM_API_URL}/client-api/test-runs`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ChecksumAppCode: apiKey,
        },
        body,
      });

      this.testSession = await res.json();
    } catch (e) {
      console.error("Error getting checksum test session", e);
      this.shutdown(1);
    }
  }

  async sendTestrunEnd() {
    try {
      if (this.mock) {
        return "https://mock.report.url";
      }
      const { uuid: id } = this.testSession;
      const body = JSON.stringify({
        failed: this.didFail ? 1 : 0,
        passed: 0,
        healed: 0,
        endedAt: Date.now(),
      });

      const { reportURL } = await this.updateTestRun(
        `${this.CHECKSUM_API_URL}/client-api/test-runs/${id}`,
        "PATCH",
        body
      );
      return reportURL;
    } catch (e) {
      console.log("Error sending test run end", e.message);
      return null;
    }
  }

  async sendUploadsComplete() {
    if (this.mock) {
      return;
    }
    try {
      const { uuid: id } = this.testSession;

      await this.updateTestRun(
        `${this.CHECKSUM_API_URL}/client-api/test-runs/${id}/uploads-completed`,
        "PATCH"
      );
    } catch (e) {
      console.log("Error sending test run uploads complete", e.message);
    }
  }

  /**
   * Sends update to the test run API
   *
   * @param url API endpoint
   * @param method HTTP method
   * @param body request body
   * @returns JSON response from API
   */
  async updateTestRun(
    url: string,
    method: string,
    body: string | undefined = undefined
  ) {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ChecksumAppCode: this.config.apiKey,
      },
      body,
    });

    return res.json();
  }

  async getEnvInfo() {
    const info = {
      commitHash: "",
      branch: "branch",
      environment: process.env.CI ? "CI" : "local",
      name: "name",
      startedAt: Date.now(),
    };

    try {
      info.commitHash = (await this.getCmdOutput(`git rev-parse HEAD`))
        .toString()
        .trim();
    } catch (e) {
      console.log("Error getting git hash", e.message);
    }

    try {
      info.branch = (await this.getCmdOutput(`git rev-parse --abbrev-ref HEAD`))
        .toString()
        .trim();
    } catch (e) {
      console.log("Error getting branch name", e.message);
    }

    return info;
  }

  getVolatileConfigPath() {
    return join(this.getRootDirPath(), "checksum.config.tmp.ts");
  }

  deleteVolatileConfig() {
    const configPath = this.getVolatileConfigPath();
    if (existsSync(configPath)) {
      rmSync(configPath);
    }
  }

  setChecksumConfig() {
    this.config = {
      ...(require(join(this.getRootDirPath(), "checksum.config.ts")).default ||
        {}),
      ...(this.volatileChecksumConfig || {}),
    };
  }

  /**
   * Search for checksum config in the command arguments.
   * If found, parse and remove from args.
   *
   * @param args arguments passed to the command
   * @returns args without checksum config
   */
  getChecksumConfigFromCommand(args) {
    // delete any old config if exists
    this.deleteVolatileConfig();

    for (const arg of args) {
      if (arg.startsWith("--checksum-config")) {
        try {
          this.volatileChecksumConfig = JSON.parse(arg.split("=")[1]);
          return args.filter((a) => a !== arg);
        } catch (e) {
          console.log("Error parsing checksum config", e.message);
          this.volatileChecksumConfig = undefined;
        }
      }
    }

    return args;
  }

  install() {
    console.log(
      "Creating Checksum directory and necessary files to run your tests"
    );

    const checksumRoot = this.getRootDirPath();

    if (!existsSync(this.getRootDirPath())) {
      mkdirSync(checksumRoot);
    }

    if (!existsSync(this.getChecksumRootOrigin())) {
      throw new Error(
        "Could not find checksum root directory, please install @checksum-ai/runtime package"
      );

      // automatically install?
    }

    // copy sources
    [
      "checksum.config.ts",
      "playwright.config.ts",
      "login.ts",
      "README.md",
    ].forEach((file) => {
      copyFileSync(
        join(this.getChecksumRootOrigin(), file),
        join(checksumRoot, file)
      );
    });

    // create tests folder
    mkdirSync(join(checksumRoot, "tests"), {
      recursive: true,
    });

    // create test data directories
    ["esra", "har", "trace", "log"].forEach((folder) => {
      mkdirSync(join(checksumRoot, "test-data", folder), {
        recursive: true,
      });
    });
  }

  getRootDirPath() {
    return join(process.cwd(), CHECKSUM_ROOT_FOLDER);
  }

  getChecksumRootOrigin() {
    return join(
      process.cwd(),
      "node_modules",
      "@checksum-ai",
      "runtime",
      "checksum-root"
    );
  }

  /**
   * Adds a timeout limit for a promise to resolve
   * Will throw an error if the promise does not resolve within the timeout limit
   *
   * @param promise promise to add timeout to
   * @param timeout timeout in milliseconds
   * @param errMessage error message to throw if timeout is reached
   * @returns promise that resolves if the original promise resolves within the timeout limit
   */
  guardReturn = async (
    promise,
    timeout = 1_000,
    errMessage = "action hang guard timed out"
  ) => {
    const timeoutStringIdentifier = "guard-timed-out";
    const guard = async () => {
      await this.awaitSleep(timeout + 1_000);
      return timeoutStringIdentifier;
    };

    const res = await Promise.race([promise, guard()]);
    if (typeof res === "string" && res === timeoutStringIdentifier) {
      throw new Error(errMessage);
    }
    return res;
  };

  awaitSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Trigger the main function
 */
(async () => {
  await new ChecksumCLI().execute();
})();
