import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as childProcess from "child_process";
import { join } from "path";

const ROOT_DIR_NAME = "checksum";

class ChecksumCLI {
  checksumConfig = undefined;

  constructor() {}

  async execute() {
    switch (process.argv[2]) {
      case "install":
        this.install();
        break;
      case "run":
        if (process.argv?.[3] === "--help") {
          await this.printHelp("run");
          break;
        }
        await this.run(process.argv.slice(3));
        break;
      default:
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
          reject(
            new Error(
              `Checsum failed execution with code: ${code} for command: "${cmdString}`
            )
          );
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
install         installs checksum files and folders
run             runs checksum tests
help            prints this help message
`);
        break;
      case "run":
        try {
          const cmd = `npx playwright test --help`;
          const testHelp: string = await this.getCmdOutput(cmd);
          console.log(
            testHelp.replace(/npx playwright test/g, "yarn checksum run")
          );
        } catch (e) {
          console.log("Error", e.message);
        }

        break;
    }
  }

  async run(args: string[]) {
    args = this.getChecksumConfig(args);
    // run shell command and pipe output rhe response to console
    const cmd = `npx playwright test --config ${join(
      this.getRootDirPath(),
      "playwright.config.ts"
    )} ${args.join(" ")}`;

    try {
      this.buildVolatileConfig();
      return this.execCmd(cmd);
    } catch (e) {
      console.log("Error", e.message);
    } finally {
      this.cleanup();
    }
  }

  buildVolatileConfig() {
    if (!this.checksumConfig) {
      return;
    }

    const configPath = this.getVolatileConfigPath();
    const configString = `
    import { RunMode, getChecksumConfig } from "@checksum-ai/runtime";
    
    export default getChecksumConfig(${JSON.stringify(
      this.checksumConfig,
      null,
      2
    )});
    `;

    writeFileSync(configPath, configString);
  }

  cleanup() {
    const configPath = this.getVolatileConfigPath();
    if (existsSync(configPath)) {
      rmSync(configPath);
    }
  }

  getVolatileConfigPath() {
    return join(this.getRootDirPath(), "checksum.config.tmp.ts");
  }

  getChecksumConfig(args) {
    for (const arg of args) {
      if (arg.startsWith("--checksum-config")) {
        try {
          this.checksumConfig = JSON.parse(arg.split("=")[1]);
          return args.filter((a) => a !== arg);
        } catch (e) {
          console.log("Error parsing checksum config", e.message);
          this.checksumConfig = undefined;
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
    return join(process.cwd(), ROOT_DIR_NAME);
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
}

/**
 * Trigger the main function
 */
(async () => {
  await new ChecksumCLI().execute();
})();
