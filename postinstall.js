const fs = require("fs");
const path = require("path");

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
  process.exit(1);
}
