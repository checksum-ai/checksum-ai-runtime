const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

try {
  console.log("Adding checksum scripts to package.json");
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

  packageJson.scripts["checksum"] =
    "node ./node_modules/@checksum-ai/runtime/cli.js";

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
} catch (e) {
  console.log("Failed adding checksum scripts to package.json, ", e);
  process.exit(1);
}

(async () => {
  try {
    console.log("Installing checksum files and folders");
    await execCmd("npm run checksum install");
  } catch (e) {
    console.log("Failed installing checksum files and folders, ", e);
    process.exit(1);
  }
})();

async function execCmd(cmdString) {
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
