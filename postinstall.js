const fs = require("fs");
const path = require("path");

try {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));

  packageJson.scripts["checksum"] =
    "node ./node_modules/@checksum-ai/runtime/cli.js";

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
} catch (e) {
  console.log("Failed adding checksum scripts to package.json, ", e);
  process.exit(1);
}
