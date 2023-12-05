var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/lib/runtime/cli.ts
var import_fs = require("fs");
var childProcess = __toESM(require("child_process"));
var import_path = require("path");

// src/lib/runtime/types.ts
var CHECKSUM_ROOT_FOLDER = "checksum";

// src/lib/runtime/cli.ts
var ChecksumCLI = class {
  constructor() {
    this.UPLOAD_AGENT_PATH = (0, import_path.join)(__dirname, "upload-agent.js");
    this.CHECKSUM_API_URL = "http://localhost:3000";
    this.didFail = false;
    this.mock = true;
    this.completeIndicators = {
      upload: false,
      tests: false,
      report: false
    };
    /**
     * Adds a timeout limit for a promise to resolve
     * Will throw an error if the promise does not resolve within the timeout limit
     *
     * @param promise promise to add timeout to
     * @param timeout timeout in milliseconds
     * @param errMessage error message to throw if timeout is reached
     * @returns promise that resolves if the original promise resolves within the timeout limit
     */
    this.guardReturn = async (promise, timeout = 1e3, errMessage = "action hang guard timed out") => {
      const timeoutStringIdentifier = "guard-timed-out";
      const guard = /* @__PURE__ */ __name(async () => {
        await this.awaitSleep(timeout + 1e3);
        return timeoutStringIdentifier;
      }, "guard");
      const res = await Promise.race([promise, guard()]);
      if (typeof res === "string" && res === timeoutStringIdentifier) {
        throw new Error(errMessage);
      }
      return res;
    };
    this.awaitSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  }
  async execute() {
    if (process.argv.find((arg) => arg === "--help" || arg === "-h")) {
      await this.printHelp(process.argv[2]);
      process.exit(0);
    }
    switch (process.argv[2]) {
      case "init":
        this.install();
        break;
      case "test":
        await this.test(process.argv.slice(3));
        break;
      case "show-report":
        this.showReport(process.argv.slice(3));
        break;
      default:
        await this.printHelp();
    }
    process.exit(0);
  }
  async execCmd(cmdString) {
    const child = await childProcess.spawn(cmdString, {
      shell: true,
      stdio: "inherit"
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
  async getCmdOutput(cmdString) {
    return new Promise(function(resolve, reject) {
      childProcess.exec(cmdString, (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing command: ${error.message}`);
          return;
        }
        resolve(stdout);
      });
    });
  }
  async printHelp(command) {
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
          const testHelp = (await this.getCmdOutput(cmd)).replace(/npx playwright/g, "yarn checksum").split("\n");
          testHelp.splice(
            5,
            0,
            "  --checksum-config=<config>   Checksum configuration in JSON format"
          ).join("\n");
          console.log(testHelp.join("\n"));
        } catch (e) {
          console.log("Error", e.message);
        }
        break;
      case "show-report":
        try {
          const cmd = `npx playwright show-report --help`;
          const showReportHelp = (await this.getCmdOutput(cmd)).replace(
            /npx playwright/g,
            "yarn checksum"
          );
          console.log(showReportHelp);
        } catch (e) {
          console.log("Error", e.message);
        }
        break;
    }
  }
  async showReport(args) {
    const cmd = `npx playwright show-report ${args.join(" ")}`;
    try {
      await this.execCmd(cmd);
    } catch (e) {
      console.log("Error showing report", e.message);
    }
  }
  async test(args) {
    args = this.getChecksumConfigFromCommand(args);
    this.setChecksumConfig();
    await this.getSession();
    let uploadAgentListeningPort;
    try {
      const { uuid, uploadURL } = this.testSession;
      uploadAgentListeningPort = await this.guardReturn(
        this.startUploadAgent(uuid, uploadURL),
        1e4,
        "Upload agent timeout"
      );
    } catch (e) {
      console.log(
        "Error starting upload agent. Test results will not be available on checksum."
      );
    }
    this.buildVolatileConfig();
    const cmd = `${uploadAgentListeningPort ? `CHECKSUM_UPLOAD_AGENT_PORT=${uploadAgentListeningPort} ` : ""} PWDEBUG=console npx playwright test --config ${this.getPlaywrightConfigFile()} ${args.join(
      " "
    )}`;
    try {
      await this.execCmd(cmd);
    } catch (e) {
      this.didFail = true;
      console.log("Error during test", e.message);
    } finally {
      const reportFile = this.getPlaywrightReportPath();
      if (!(0, import_fs.existsSync)(reportFile)) {
        console.log(`Could not find report file at ${reportFile}`);
      } else {
        this.uploadAgent.stdin.write(`cli:report=${reportFile}`);
      }
      this.completeIndicators.tests = true;
      await this.handleCompleteMessage();
    }
  }
  getPlaywrightReportPath() {
    var _a, _b;
    let reportFolder = (0, import_path.join)(process.cwd(), "playwright-report");
    const playwrightConfig = require(this.getPlaywrightConfigFile());
    const { reporter } = playwrightConfig;
    if (reporter instanceof Array && reporter.length > 1 && ((_a = reporter[1]) == null ? void 0 : _a.outputFolder)) {
      reportFolder = (_b = reporter[1]) == null ? void 0 : _b.outputFolder;
    }
    if (process.env.PLAYWRIGHT_HTML_REPORT) {
      reportFolder = process.env.PLAYWRIGHT_HTML_REPORT;
    }
    return (0, import_path.join)(reportFolder, "index.html");
  }
  getPlaywrightConfigFile() {
    return (0, import_path.join)(this.getRootDirPath(), "playwright.config.ts");
  }
  startUploadAgent(sessionId, uploadURL) {
    return new Promise((resolve, reject) => {
      console.log("Starting upload agent");
      this.uploadAgent = childProcess.spawn("node", [
        this.UPLOAD_AGENT_PATH,
        JSON.stringify({
          sessionId,
          checksumApiURL: this.CHECKSUM_API_URL,
          apiKey: this.config.apiKey
        }),
        ...this.mock ? ["mock"] : []
      ]);
      this.uploadAgent.stdout.on("data", (data) => {
        const message = data.toString().trim();
        if (!message.startsWith("upag:")) {
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
      this.uploadAgent.on("exit", (code, signal) => {
        console.log(
          `upload agent process exited with code ${code} and signal ${signal}`
        );
      });
      this.uploadAgent.on("error", (err) => {
        console.error(`Error starting upload agent: ${err.message}`);
      });
    });
  }
  async handleUploadAgentMessage(key, value) {
    switch (key) {
      case "complete":
        this.sendUploadsComplete().then(() => {
          this.completeIndicators.upload = true;
        });
        break;
      case "report-uploaded":
        const reportURL = await this.sendTestrunEnd();
        this.completeIndicators.report = true;
        if (reportURL) {
          console.log(
            `*******************
* Checksum report URL: ${reportURL}
*******************`
          );
        }
        break;
      default:
        console.warn(`Unhandled upload agent message: ${key}=${value}`);
    }
  }
  async handleCompleteMessage() {
    while (true) {
      if (Object.keys(this.completeIndicators).find(
        (key) => !this.completeIndicators[key]
      )) {
        await this.awaitSleep(1e3);
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
    if (!this.volatileChecksumConfig) {
      return;
    }
    const configPath = this.getVolatileConfigPath();
    const configString = `
    import { RunMode, getChecksumConfig } from "@checksum-ai/runtime";
    
    export default getChecksumConfig(${JSON.stringify(this.config, null, 2)});
    `;
    (0, import_fs.writeFileSync)(configPath, configString);
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
          uploadURL: "http://localhost:3000/upload"
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
          ChecksumAppCode: apiKey
        },
        body
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
        endedAt: Date.now()
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
  async updateTestRun(url, method, body = void 0) {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ChecksumAppCode: this.config.apiKey
      },
      body
    });
    return res.json();
  }
  async getEnvInfo() {
    const info = {
      commitHash: "",
      branch: "branch",
      environment: process.env.CI ? "CI" : "local",
      name: "name",
      startedAt: Date.now()
    };
    try {
      info.commitHash = (await this.getCmdOutput(`git rev-parse HEAD`)).toString().trim();
    } catch (e) {
      console.log("Error getting git hash", e.message);
    }
    try {
      info.branch = (await this.getCmdOutput(`git rev-parse --abbrev-ref HEAD`)).toString().trim();
    } catch (e) {
      console.log("Error getting branch name", e.message);
    }
    return info;
  }
  getVolatileConfigPath() {
    return (0, import_path.join)(this.getRootDirPath(), "checksum.config.tmp.ts");
  }
  deleteVolatileConfig() {
    const configPath = this.getVolatileConfigPath();
    if ((0, import_fs.existsSync)(configPath)) {
      (0, import_fs.rmSync)(configPath);
    }
  }
  setChecksumConfig() {
    this.config = {
      ...require((0, import_path.join)(this.getRootDirPath(), "checksum.config.ts")).default || {},
      ...this.volatileChecksumConfig || {}
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
    this.deleteVolatileConfig();
    for (const arg of args) {
      if (arg.startsWith("--checksum-config")) {
        try {
          this.volatileChecksumConfig = JSON.parse(arg.split("=")[1]);
          return args.filter((a) => a !== arg);
        } catch (e) {
          console.log("Error parsing checksum config", e.message);
          this.volatileChecksumConfig = void 0;
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
    if (!(0, import_fs.existsSync)(this.getRootDirPath())) {
      (0, import_fs.mkdirSync)(checksumRoot);
    }
    if (!(0, import_fs.existsSync)(this.getChecksumRootOrigin())) {
      throw new Error(
        "Could not find checksum root directory, please install @checksum-ai/runtime package"
      );
    }
    [
      "checksum.config.ts",
      "playwright.config.ts",
      "login.ts",
      "README.md"
    ].forEach((file) => {
      (0, import_fs.copyFileSync)(
        (0, import_path.join)(this.getChecksumRootOrigin(), file),
        (0, import_path.join)(checksumRoot, file)
      );
    });
    (0, import_fs.mkdirSync)((0, import_path.join)(checksumRoot, "tests"), {
      recursive: true
    });
    ["esra", "har", "trace", "log"].forEach((folder) => {
      (0, import_fs.mkdirSync)((0, import_path.join)(checksumRoot, "test-data", folder), {
        recursive: true
      });
    });
  }
  getRootDirPath() {
    return (0, import_path.join)(process.cwd(), CHECKSUM_ROOT_FOLDER);
  }
  getChecksumRootOrigin() {
    return (0, import_path.join)(
      process.cwd(),
      "node_modules",
      "@checksum-ai",
      "runtime",
      "checksum-root"
    );
  }
};
__name(ChecksumCLI, "ChecksumCLI");
(async () => {
  await new ChecksumCLI().execute();
})();
//# sourceMappingURL=cli.js.map
