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

// src/lib/runtime/utils.ts
var LOG_TO_CONSOLE = false;
function setLogToConsole(logToConsole) {
  LOG_TO_CONSOLE = logToConsole;
}
__name(setLogToConsole, "setLogToConsole");
function log(...args) {
  if (LOG_TO_CONSOLE) {
    console.log(...args);
  }
}
__name(log, "log");
function getRuntimeFiles({
  isInit,
  excludeLogin
}) {
  return [
    ...isInit ? ["example.checksum.spec.ts", "github-actions.example.yml"] : [],
    ...excludeLogin ? [] : ["login.ts"],
    "checksum.config.ts",
    "playwright.config.ts",
    "README.md",
    ".gitignore.example"
  ];
}
__name(getRuntimeFiles, "getRuntimeFiles");

// src/lib/runtime/cli.ts
var ChecksumCLI = class {
  constructor() {
    this.MAX_COMPLETION_WAIT = 10 * 60 * 1e3;
    // 10 minutes
    this.TEST_RUN_MONITOR_PATH = (0, import_path.join)(
      __dirname,
      "test-run-monitor.js"
    );
    this.checksumApiUrl = "https://api.checksum.ai";
    this.checksumAppUrl = "https://app.checksum.ai";
    this.didFail = false;
    this.isolationMode = false;
    this.debugMode = false;
    this.completeIndicators = {
      upload: false,
      tests: false,
      report: false
    };
    this.uploadProgress = 0;
    /**
     * Adds a timeout limit for a promise to resolve
     * Will throw an error if the promise does not resolve within the timeout limit
     *
     * @param promise promise to add timeout to
     * @param timeout timeout in milliseconds
     * @param errMessage error message to throw if timeout is reached
     * @returns promise that resolves if the original promise resolves within the timeout limit
     */
    this.guardReturn = async (promise, timeout = 1e3, errMessage = "guardReturnTimedOut") => {
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
    this.awaitSleep = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms));
    this.printError = (message) => {
      console.log("\x1B[31m%s\x1B[0m", message);
    };
  }
  async execute() {
    if (process.argv.find((arg) => arg === "--help" || arg === "-h")) {
      await this.printHelp(process.argv[2]);
      process.exit(0);
    }
    if (process.argv.find((arg) => arg === "--clidebug")) {
      this.debugMode = true;
      setLogToConsole(true);
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
  async execCmd(cmdString, envVars = {}) {
    const env = {
      ...process.env,
      ...envVars
    };
    const child = await childProcess.spawn(cmdString, {
      env,
      shell: true,
      stdio: "inherit"
    });
    const exitPromise = new Promise((resolve2, reject) => {
      child.on("exit", (code) => {
        if (code === 0) {
          resolve2(true);
        } else {
          reject(new Error(`Checksum failed execution with code: ${code} `));
        }
      });
    });
    return exitPromise;
  }
  async getCmdOutput(cmdString) {
    return new Promise(function(resolve2, reject) {
      childProcess.exec(cmdString, (error, stdout, stderr) => {
        if (error) {
          reject(`Error executing command: ${error.message}`);
          return;
        }
        resolve2(stdout);
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
    this.locateChecksumLibs();
    this.processChecksumArguments(args);
    this.setChecksumConfig();
    if (!await this.getSession()) {
      return;
    }
    let testRunMonitorListeningPort;
    try {
      testRunMonitorListeningPort = await this.guardReturn(
        this.startTestRunMonitor(this.testSession),
        1e4,
        "test run monitor timeout"
      );
    } catch (e) {
      console.log(
        "Error starting test run monitor. Test results will not be available on checksum."
      );
    }
    this.buildVolatileConfig();
    const envVars = { CHECKSUM_ROOT_FOLDER: this.checksumRoot };
    if (testRunMonitorListeningPort) {
      envVars["CHECKSUM_UPLOAD_AGENT_PORT"] = testRunMonitorListeningPort;
    }
    if (this.config.options.hostReports) {
      envVars["PW_TEST_HTML_REPORT_OPEN"] = "never";
    }
    const cmd = `npx playwright test --config ${this.getPlaywrightConfigFile()} ${args.map((arg) => `"${arg}"`).join(" ")}`;
    await this.patchPlaywright();
    try {
      await this.execCmd(cmd, envVars);
      console.log("Tests execution finished");
    } catch (e) {
      this.didFail = true;
      console.log("Error during test", e.message);
    } finally {
      if (!this.isolationMode) {
        console.log("Waiting for test files to upload to Checksum...");
      }
      this.sendReportUploadRequest();
      await this.patchPlaywright(true);
      this.completeIndicators.tests = true;
      await this.handleCompleteMessage();
    }
  }
  sendReportUploadRequest() {
    const reportFile = this.getPlaywrightReportPath();
    if (!(0, import_fs.existsSync)(reportFile)) {
      console.log(`Could not find report file at ${reportFile}`);
      this.completeIndicators.report = true;
      return;
    }
    log("Sending report upload request", reportFile);
    this.testRunMonitorProcess.stdin.write(`cli:report=${reportFile}`);
  }
  async patchPlaywright(off = false) {
    log("Patching playwright", off);
    const cmd = `node ${(0, import_path.join)(__dirname, "scripts/patch.js")}${off ? " off" : ""}`;
    try {
      await this.execCmd(cmd, { PROJECT_ROOT: this.projectRootDirectory });
    } catch (e) {
      console.log("Error patching playwright", e.message);
    }
  }
  getPlaywrightReportPath() {
    var _a;
    const makeFilePath = /* @__PURE__ */ __name((reportFolder) => {
      log("Using report folder", reportFolder);
      return (0, import_path.join)(reportFolder, "index.html");
    }, "makeFilePath");
    if (process.env.PLAYWRIGHT_HTML_REPORT) {
      return makeFilePath(process.env.PLAYWRIGHT_HTML_REPORT);
    }
    const playwrightConfig = ((_a = require(this.getPlaywrightConfigFile())) == null ? void 0 : _a.default) || {};
    const { reporter } = playwrightConfig;
    if (reporter instanceof Array) {
      const htmlReportersWithOptions = reporter.filter(
        (r) => r instanceof Array && r[0] === "html"
      );
      const htmlReporterWithOutputFolder = htmlReportersWithOptions.find(
        (r) => {
          var _a2;
          return (_a2 = r[1]) == null ? void 0 : _a2.outputFolder;
        }
      );
      if (htmlReporterWithOutputFolder) {
        return makeFilePath(
          (0, import_path.join)(this.checksumRoot, htmlReporterWithOutputFolder[1].outputFolder)
        );
      }
    }
    return makeFilePath((0, import_path.join)(this.projectRootDirectory, "playwright-report"));
  }
  getPlaywrightConfigFile() {
    return (0, import_path.join)(this.checksumRoot, "playwright.config.ts");
  }
  startTestRunMonitor(sessionId) {
    return new Promise((resolve2) => {
      console.log("Starting test run monitor");
      this.testRunMonitorProcess = childProcess.spawn("node", [
        this.TEST_RUN_MONITOR_PATH,
        JSON.stringify({
          sessionId,
          checksumApiURL: this.checksumApiUrl,
          apiKey: this.config.apiKey
        }),
        ...this.isolationMode ? ["isolated"] : []
      ]);
      this.testRunMonitorProcess.stdout.on("data", (data) => {
        const message = data.toString().trim();
        log("[trm] " + message);
        if (!message.startsWith("monitor" /* Monitor */)) {
          return;
        }
        const [key, value] = message.substring(message.indexOf(":") + 1).split("=");
        if (key === "port") {
          resolve2(value);
        } else {
          this.handleTestRunMonitorMessage(key, value);
        }
      });
      this.testRunMonitorProcess.on("exit", (code, signal) => {
        console.log(
          `test run monitor process exited with code ${code} and signal ${signal}`
        );
      });
      this.testRunMonitorProcess.on("error", (err) => {
        console.error(`Error starting test run monitor: ${err.message}`);
      });
    });
  }
  async handleTestRunMonitorMessage(key, value) {
    log(
      `Handling test run monitor message ${this.isolationMode ? "(isolation mode)" : ""}`,
      key,
      value
    );
    switch (key) {
      case "complete-with-errors":
        console.log("Error uploading test files to Checksum");
        this.sendProcessingError().then(() => {
          this.completeIndicators.upload = true;
        });
        break;
      case "complete":
        if (!this.isolationMode) {
          console.log("Test files uploaded successfully");
        }
        this.sendUploadsComplete().then(() => {
          this.completeIndicators.upload = true;
        });
        break;
      case "report-complete": {
        if (this.isolationMode) {
          this.completeIndicators.report = true;
          break;
        }
        const success = value.slice(0, value.indexOf(":")) === "true";
        const statsJSON = value.slice(value.indexOf(":") + 1);
        let stats = {};
        try {
          stats = JSON.parse(statsJSON);
        } catch (e) {
          console.log("Error parsing stats", e.message);
        }
        await this.sendTestRunEnd(stats);
        this.completeIndicators.report = true;
        if (success) {
          const reportMessage = `Checksum report URL: ${this.checksumAppUrl}/#/test-runs/${this.testSession}`;
          const asterisksLine = "*".repeat(reportMessage.length);
          console.log(`${asterisksLine}
${reportMessage}
${asterisksLine}`);
        } else {
          console.log(
            "An error occurred while uploading the test report to Checksum"
          );
        }
        break;
      }
      case "upload-progress":
        {
          const newProgress = parseInt(value);
          if (newProgress < this.uploadProgress || // in case new file joined and progress dropped
          newProgress >= this.uploadProgress + 10 || newProgress === 100 && this.uploadProgress !== 100) {
            this.uploadProgress = newProgress;
            console.log(`[ Uploads progress: ${this.uploadProgress}% ]`);
          }
        }
        break;
      case "log":
        console.log(value);
        break;
      default:
        console.warn(`Unhandled test run monitor message: ${key}=${value}`);
    }
  }
  async handleCompleteMessage() {
    const startTime = Date.now();
    while (true) {
      if (Date.now() - startTime > this.MAX_COMPLETION_WAIT) {
        console.log(
          "An error occurred and Checksum wasn't able to complete processing and uploading the test run files."
        );
        this.shutdown(1);
        return;
      }
      if (Object.keys(this.completeIndicators).find(
        (key) => !this.completeIndicators[key]
      )) {
        log(this.completeIndicators);
        await this.awaitSleep(1e3);
      } else {
        console.log("Checksum test run complete");
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
    var _a, _b;
    this.deleteVolatileConfig();
    (_a = this.testRunMonitorProcess) == null ? void 0 : _a.stdin.write("cli:shutdown");
    (_b = this.testRunMonitorProcess) == null ? void 0 : _b.kill();
  }
  async getSession() {
    try {
      if (!this.config.options.hostReports) {
        this.setIsolatedMode();
        return true;
      }
      const apiKey = this.config.apiKey;
      if (!apiKey || apiKey === "<API key>") {
        this.printError(
          "No API key found in checksum config - please set it in the config file - checksum.config.ts"
        );
        this.shutdown(1);
        return false;
      }
      const body = JSON.stringify(await this.getEnvInfo());
      const res = await fetch(`${this.checksumApiUrl}/client-api/test-runs`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ChecksumAppCode: apiKey
        },
        body
      });
      this.testSession = (await res.json()).uuid;
      return true;
    } catch (e) {
      console.log(
        "Error connecting to Checksum, the report will not be hosted"
      );
      this.setIsolatedMode();
      return true;
    }
  }
  setIsolatedMode() {
    this.isolationMode = true;
    this.testSession = "isolated-session";
  }
  async sendTestRunEnd(stats) {
    if (this.isolationMode) {
      return;
    }
    try {
      log("Sending test run end", stats);
      const body = JSON.stringify({
        ...stats,
        endedAt: Date.now()
      });
      await this.updateTestRun(
        `${this.checksumApiUrl}/client-api/test-runs/${this.testSession}`,
        "PATCH",
        body
      );
    } catch (e) {
      console.log("Error sending test run end", e.message);
      return null;
    }
  }
  async sendUploadsComplete() {
    if (this.isolationMode) {
      return;
    }
    try {
      await this.updateTestRun(
        `${this.checksumApiUrl}/client-api/test-runs/${this.testSession}/uploads-completed`,
        "PATCH"
      );
    } catch (e) {
      console.log("Error sending test run uploads complete", e.message);
    }
  }
  async sendProcessingError() {
    if (this.isolationMode) {
      return;
    }
    try {
      await this.updateTestRun(
        `${this.checksumApiUrl}/client-api/test-runs/${this.testSession}/process-error`,
        "PATCH"
      );
    } catch (e) {
      console.log("Error sending test run processing error", e.message);
    }
  }
  /**
   * Sends update to the test run API
   *
   * @param url API endpoint
   * @param method HTTP method
   * @param body request body
   * @returns Response from API
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
    log("Received update test run response from url:", url);
    await this.logApiResponse(res);
    return res;
  }
  async logApiResponse(response) {
    try {
      if (!response.ok) {
        log("HTTP Error:", response.status, response.statusText);
        const errorText = await response.text();
        log("Error Details:", errorText);
        return;
      }
      const contentType = response.headers.get("Content-Type");
      if (contentType.includes("application/json")) {
        response.json().then((data) => {
          log("API Response:", data);
        });
      } else {
        response.text().then((text) => {
          log("API Response:", text);
        });
      }
    } catch (e) {
      log("Error logging API response", e.message);
    }
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
      console.log("Error getting branch", e.message);
    }
    try {
      info.name = (await this.getCmdOutput(`git log -1 --pretty=%B`)).toString().trim();
    } catch (e) {
      console.log("Error getting name", e.message);
    }
    return info;
  }
  getVolatileConfigPath() {
    return (0, import_path.join)(this.checksumRoot, "checksum.config.tmp.ts");
  }
  deleteVolatileConfig() {
    const configPath = this.getVolatileConfigPath();
    if ((0, import_fs.existsSync)(configPath)) {
      (0, import_fs.rmSync)(configPath);
    }
  }
  setChecksumConfig() {
    this.config = {
      ...require((0, import_path.join)(this.checksumRoot, "checksum.config.ts")).default || {},
      ...this.volatileChecksumConfig || {}
    };
    if (this.debugMode) {
      this.config.options.printLogs = true;
    }
    if (this.config.apiURL) {
      this.checksumApiUrl = this.config.apiURL;
    }
  }
  /**
   * Search for checksum config in the command arguments.
   * If found, process and remove from args.
   *
   * @param args arguments passed to the command
   */
  processChecksumArguments(args) {
    this.deleteVolatileConfig();
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith("--checksum-config")) {
        try {
          this.volatileChecksumConfig = JSON.parse(arg.split("=")[1]);
          args.splice(i, 1);
        } catch (e) {
          console.log("Error parsing checksum config", e.message);
          this.volatileChecksumConfig = void 0;
        }
      }
      if (arg === "--clidebug") {
        args.splice(i, 1);
      }
    }
  }
  install() {
    console.log(
      "Creating Checksum directory and necessary files to run your tests"
    );
    try {
      this.findChecksumRootOrigin();
    } catch (e) {
      console.log(e.message);
      process.exit(1);
    }
    const checksumRoot = (0, import_path.join)(process.cwd(), CHECKSUM_ROOT_FOLDER);
    if (!(0, import_fs.existsSync)(checksumRoot)) {
      (0, import_fs.mkdirSync)(checksumRoot);
    }
    if (!(0, import_fs.existsSync)(this.getChecksumRootOrigin())) {
      throw new Error(
        "Could not find checksum root directory, please install @checksum-ai/runtime package"
      );
    }
    const configExists = (0, import_fs.existsSync)((0, import_path.join)(checksumRoot, "checksum.config.ts"));
    getRuntimeFiles({ isInit: !configExists }).forEach((file) => {
      const target = (0, import_path.join)(checksumRoot, file);
      if (!(0, import_fs.existsSync)(target)) {
        (0, import_fs.copyFileSync)((0, import_path.join)(this.getChecksumRootOrigin(), file), target);
      }
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
  getChecksumRootOrigin() {
    return (0, import_path.join)(
      this.projectRootDirectory,
      "node_modules",
      "@checksum-ai",
      "runtime",
      "checksum-root"
    );
  }
  locateChecksumLibs() {
    try {
      this.findChecksumRootOrigin();
      this.findChecksumRoot();
      log("Project root found at", this.projectRootDirectory);
      log("Checksum root found at", this.checksumRoot);
    } catch (e) {
      console.log(e.message);
      process.exit(1);
    }
  }
  /**
   * Finds checksum root origin directory from npm package.
   * Will search for npm package location from current directory
   */
  findChecksumRootOrigin() {
    let currentDir = process.cwd();
    for (let i = 0; i < 6; i++) {
      const candidate = (0, import_path.join)(
        currentDir,
        "node_modules",
        "@checksum-ai",
        "runtime",
        "checksum-root"
      );
      if ((0, import_fs.existsSync)(candidate)) {
        this.projectRootDirectory = currentDir;
        return;
      }
      if ((0, import_path.parse)(currentDir).root === currentDir) {
        break;
      }
      currentDir = (0, import_path.join)(currentDir, "..");
    }
    throw new Error("Could not resolve checksum root origins");
  }
  /**
   * Search and sets project's checksum root folder
   */
  findChecksumRoot() {
    const containsChecksumConfig = /* @__PURE__ */ __name((dirPath) => {
      try {
        const files = (0, import_fs.readdirSync)(dirPath);
        return files.includes("checksum.config.ts");
      } catch (e) {
        return false;
      }
    }, "containsChecksumConfig");
    const directoriesToCheck = [this.projectRootDirectory];
    while (directoriesToCheck.length) {
      const currentDir = directoriesToCheck.pop();
      const filesAndDirs = (0, import_fs.readdirSync)(currentDir, {
        withFileTypes: true
      });
      for (const candidateFileOrDir of filesAndDirs) {
        const fullPath = (0, import_path.join)(currentDir, candidateFileOrDir.name);
        let directoryCandidatePath = fullPath;
        if (candidateFileOrDir.isSymbolicLink()) {
          const symbolicLinkPath = (0, import_fs.readlinkSync)(fullPath);
          if (!(0, import_fs.lstatSync)(symbolicLinkPath).isDirectory()) {
            continue;
          }
          directoryCandidatePath = symbolicLinkPath;
        } else if (!candidateFileOrDir.isDirectory()) {
          continue;
        }
        if (candidateFileOrDir.name === CHECKSUM_ROOT_FOLDER) {
          if (containsChecksumConfig(directoryCandidatePath)) {
            this.checksumRoot = directoryCandidatePath;
            return;
          }
        } else {
          directoriesToCheck.push(fullPath);
        }
      }
    }
    throw new Error(
      "Could not find checksum root folder. Run `npx checksumai init` to create one."
    );
  }
};
__name(ChecksumCLI, "ChecksumCLI");
(async () => {
  await new ChecksumCLI().execute();
})();
