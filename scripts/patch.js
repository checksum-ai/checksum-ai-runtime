const fs = require("fs");
const path = require("path");
const { join, resolve } = require("path");

function getPlaywrightPatchesDirectory() {
  return join(__dirname, "playwright_patches");
}

const availablePatchVersions = fs
  .readdirSync(getPlaywrightPatchesDirectory())
  .map((patchFile) => path.basename(patchFile, ".js"))
  .sort();

// console.log("patchVersions", availablePatchVersions);

function findSuitablePatchVersion(version) {
  let suitablePatchVersion = availablePatchVersions[0];
  for (const patchVersion of availablePatchVersions) {
    if (version >= patchVersion) {
      suitablePatchVersion = patchVersion;
    } else {
      break;
    }
  }
  return suitablePatchVersion;
}

const projectRootFromEnv = process.env.PROJECT_ROOT;
const projectPaths = projectRootFromEnv
  ? [projectRootFromEnv]
  : [".", "../", "../.."].map((project) => join(process.cwd(), project));

for (const projectPath of projectPaths) {
  try {
    if (fs.existsSync(join(projectPath, "node_modules", "playwright"))) {
      const absolutePathToPackageJSON = resolve(
        join(projectPath, "node_modules", "playwright", "package.json")
      );
      const packageJSON = require(absolutePathToPackageJSON);
      const playwrightVersion = packageJSON.version;
      const patchVersion = findSuitablePatchVersion(playwrightVersion);
      // console.log(
      //   "Found installed version",
      //   playwrightVersion,
      //   "and will use patch for version",
      //   patchVersion
      // );
      const patchPath = resolve(
        join(getPlaywrightPatchesDirectory(), `${patchVersion}.js`)
      );
      require(patchPath)(projectPath);
    } else {
      // console.warn("Project path not found", projectPath);
    }
  } catch (e) {
    // ignore for now although we might want to notify users that patching wasn't successful
  }
}
