const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

try {
  console.log("Adding checksum scripts to package.json");
  const packageJsonPath = path.resolve(__dirname, "../../../package.json");
  if (!fs.existsSync(packageJsonPath)) {
    console.log("No package.json found, will not add checksum script");
    process.exit(1);
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

  // verify that the package.json has a scripts section
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  packageJson.scripts["checksum"] =
    "ts-node --esm --skipIgnore ./node_modules/@checksum-ai/runtime/cli.js";

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
} catch (e) {
  console.log("Failed adding checksum scripts to package.json, ", e);
}

async function installPlaywright() {
  try {
    function run() {
      return new Promise((resolve, reject) => {
        exec("npx playwright install", (error, stdout, stderr) => {
          if (error) {
            reject(`Error: ${error.message}`);
            return;
          }
          if (stderr) {
            reject(`Stderr: ${stderr}`);
            return;
          }
          resolve(stdout);
        });
      });
    }

    console.log("Installing playwright");
    await run();
    console.log("Playwright installed successfully");
  } catch (e) {
    console.error("Playwright installation failed", e);
  }
}

(async () => {
  await installPlaywright();
})();
