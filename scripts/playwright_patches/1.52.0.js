const fs = require("fs");
const { join } = require("path");

// Args
const on = process.argv[2] !== "off";

// -------- [Modifiers] -------- //

// Amends the file with the given entry point text and append text
// When "on" is true, the append text is added to the entry point,
// otherwise the append text is completely removed from the file
function amend(filePath, entryPointText, appendText) {
  const data = fs.readFileSync(filePath, "utf8");
  if (!data.includes(entryPointText)) {
    throw new Error("Entry point not found!", entryPointText);
  }
  // Ignore if the append text is already present
  if (on && data.includes(appendText)) {
    return;
  }
  // Add or clear according to on state
  const result = on
    ? data.replace(entryPointText, entryPointText + appendText)
    : data.replace(appendText, "");

  // Write
  fs.writeFileSync(filePath, result, "utf8");
}

// Replaces content.
// When "on" is true, the new content is written to the file replacing the original content,
// otherwise the original content is restored.
function replaceContent(filePath, originalContent, newContent) {
  // Read the file content
  const fileContent = fs.readFileSync(filePath, "utf8");

  // add a marker for newContent that can be later recognized for "off" state
  newContent = `/* checksumai */ ${newContent}`;

  if (on && fileContent.includes(newContent)) {
    return;
  }

  // Join the lines back into a single string
  const updatedContent = on
    ? fileContent.replace(originalContent, newContent)
    : fileContent.replace(newContent, originalContent);

  // Write the modified content back to the file
  fs.writeFileSync(filePath, updatedContent, "utf8");
}

function doesFileExist(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn("File not found", filePath);
    return false;
  }
  return true;
}

// -------- [Modifications] -------- //

// Remove conditions for injecting Playwright scripts
function alwaysInjectScripts(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright-core/lib/server/browserContext.js"
  );
  if (!doesFileExist(file)) {
    return;
  }
  // const originalContent =
  //   "if ((0, _debug.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);";

  // const newContent =
  //   "await this.extendInjectedScript(consoleApiSource.source);";

  const originalContent = 'if ((0, import_debug.debugMode)() === "console")';

  const newContent = "";

  replaceContent(file, originalContent, newContent);
}

// Add implementation for generateSelectorAndLocator and inject to Playwright console API
function addGenerateSelectorAndLocator(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright-core/lib/generated/consoleApiSource.js"
  );
  if (!doesFileExist(file)) {
    return;
  }
  const entryPointText1 = "this._generateLocator(element, language),\\n      ";
  const appendText1 =
    "generateSelectorAndLocator: (element, language) => this._generateSelectorAndLocator(element, language),\\n asLocator,\\n     ";
  amend(file, entryPointText1, appendText1);

  const entryPointText2 = `return asLocator(language || "javascript", selector);\\n  }\\n  `;
  const appendText2 =
    '_generateSelectorAndLocator(element, language) {\\n    if (!(element instanceof Element))\\n      throw new Error(`Usage: playwright.locator(element).`);\\n    const selector = this._injectedScript.generateSelectorSimple(element);\\n    return {selector, locator: asLocator(language || \\"javascript\\", selector)};\\n  }\\n  ';
  amend(file, entryPointText2, appendText2);
}

// -------- [Runtime modifications] -------- //

function expect(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright/lib/matchers/expect.js"
  );
  if (!doesFileExist(file)) {
    return;
  }
  let originalContent, newContent;

  // originalContent = `return (...args) => {
  //     const testInfo = (0, _globals.currentTestInfo)();`;
  // newContent = `return (...args) => {
  //     let noSoft = false;
  //     if (args.find(arg=>arg==='no-soft')){
  //       noSoft = true;
  //       args.pop();
  //     }
  //     const testInfo = (0, _globals.currentTestInfo)();`;
  // replaceContent(file, originalContent, newContent);

  // originalContent = `step.complete({
  //         error
  //       })`;
  // newContent = `step.complete({
  //         error,
  //         noSoft
  //       })`;
  // replaceContent(file, originalContent, newContent);

  // originalContent = `if (this._info.isSoft) testInfo._failWithError(error);else throw error;`;
  // newContent = `if (this._info.isSoft && !noSoft) testInfo._failWithError(error);else throw error;`;
  // replaceContent(file, originalContent, newContent);
}

function testInfo(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright/lib/worker/testInfo.js"
  );
  if (!doesFileExist(file)) {
    return;
  }
  let originalContent, newContent;
  let entryPointText, appendText;

  // originalContent = `const filteredStack = (0, _util.filteredStackTrace)((0, _utils.captureRawStack)());`;
  // newContent = `const filteredStack = (0, _util.filteredStackTrace)((0, _utils.captureRawStack)().filter(s=>!s.includes('@checksum-ai/runtime')));`;
  // replaceContent(file, originalContent, newContent);

  entryPointText = `data.location = data.location || filteredStack[0];`;
  appendText = `\nif (this._checksumInternal) {
      data.location = undefined;
      this._checksumInternal = false;
    }
    if (this._checksumNoLocation){
      data.location = undefined;
    }`;
  amend(file, entryPointText, appendText);

  originalContent = `if (!step.error) {`;
  newContent = `if (!step.error && !step.preventInfectParentStepsWithError) {`;
  replaceContent(file, originalContent, newContent);

  originalContent = `_failWithError(error) {`;
  newContent = `addError(error, message) {
    const serialized = (0, import_util2.testInfoError)(error);
    serialized.message = [message, serialized.message].join('\\n\\n');
    serialized.stack = [message, serialized.stack].join('\\n\\n');
    const step = error[stepSymbol];
    if (step && step.boxedStack) serialized.stack = \`\${error.name}: \${error.message}\\n\${(0, import_utils.stringifyStackFrames)(step.boxedStack).join('\\n')}\`;
    this.errors.push(serialized);
  }
  _failWithError(error) {`;
  replaceContent(file, originalContent, newContent);
}

function testType(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright/lib/common/testType.js"
  );
  if (!doesFileExist(file)) {
    return;
  }

  entryPointText = `return await (0, import_utils.currentZone)().with("stepZone", step).run(async () => {`;
  // entryPointText = `return await _utils.zones.run('stepZone', step, async () => {`;
  appendText = `\nif (options.obtainStep){
        options.obtainStep(step);
      }`;
  amend(file, entryPointText, appendText);
}

function indexContent(projectRoot) {
  const file = join(projectRoot, "node_modules/playwright/lib/index.js");
  if (!doesFileExist(file)) {
    return;
  }
  let originalContent, newContent;
  originalContent = `const browser = await playwright[browserName].launch();`;
  newContent = `
    let browser = playwright[browserName];
    try {
      const { playwrightExtra } = testInfo?.project?.use || {};
      if (playwrightExtra && playwrightExtra?.length) {
        const pw = require("playwright-extra")
        const PupeteerExtraPlugin = require("puppeteer-extra-plugin").PuppeteerExtraPlugin
        const chromium = pw.chromium;
        
        playwrightExtra.forEach((plugin, i) => {
          try {
            if(!(plugin instanceof PupeteerExtraPlugin)){
              console.warn(\`Plugin at index \${i} is not an instance of PupeteerExtraPlugin\`);
            }
            chromium.use(plugin);
          } catch (e) {
            console.warn(e);
          }
        });
        browser = chromium;
      }
    } catch (e) {
      console.warn(
        "CHECKSUM: Failed to load Playwright Extra, using Playwright instead.",
        e
      );
    }
    browser = await browser.launch();
  `;
  replaceContent(file, originalContent, newContent);
}

function channelOwner(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright-core/lib/client/channelOwner.js"
  );
  if (!doesFileExist(file)) {
    return;
  }
  let originalContent, newContent;
  let entryPointText, appendText;

  entryPointText = `async _wrapApiCall(func, isInternal) {`;
  // entryPointText = `async _wrapApiCall(func, isInternal = false) {`;

  appendText = `\nif (this._checksumInternal){
      isInternal = true;
    }`;
  amend(file, entryPointText, appendText);

  // entryPointText = `const apiZone = {
  //   apiName: stackTrace.apiName,
  //   frames: stackTrace.frames,
  //   isInternal,
  //   reported: false,
  //   userData: undefined,
  //   stepId: undefined
  // };`;
  entryPointText = `const apiZone = { apiName: stackTrace.apiName, frames: stackTrace.frames, isInternal, reported: false, userData: void 0, stepId: void 0 };`;

  appendText = `\nif (!isInternal && this._checksumTitle){
      apiZone.apiName = this._checksumTitle;
      this._checksumTitle = undefined;
    }
    if (!apiZone.apiName){
      isInternal = true;
      apiZone.isInternal = true;
      apiZone.reported = true;
    }
    if (apiZone.apiName && apiZone.apiName.startsWith('proxy')) {
      apiZone.apiName = apiZone.apiName.replace('proxy', 'page');
    }`;
  amend(file, entryPointText, appendText);
}

function stackTrace(projectRoot) {
  const file = join(
    projectRoot,
    "node_modules/playwright-core/lib/utils/isomorphic/stackTrace.js"
  );
  if (!doesFileExist(file)) {
    return;
  }

  let originalContent, newContent;

  // Create a regex for getting a file for each line in the stacktrace that overrides the original regex
  // This regex is only used for getting files, the original regex is sitll used for the rest of the content
  originalContent = `let file = match[7];`;
  const fileRe = /(\/.*?\.[a-zA-Z0-9]+)(?=:\d+:\d+)/;
  newContent = `
  const fileRe = new RegExp(${JSON.stringify(fileRe.source)}, "${
    fileRe.flags
  }");
  const m = fileRe.exec(match[0] ?? "");
  let file = m ? m[1] : undefined;
  `;
  replaceContent(file, originalContent, newContent);

  // Filter out checksum-ai/runtime from stack traces
  originalContent = `return stack.split("\\n");`;
  newContent = `return stack.split("\\n").filter(s=>!s.includes('@checksum-ai/runtime'));`;
  replaceContent(file, originalContent, newContent);
}

// -------- [Run] -------- //

const isRuntime = true || process.env.RUNTIME === "true";

function run(projectPath) {
  try {
    if (fs.existsSync(projectPath)) {
      alwaysInjectScripts(projectPath);
      addGenerateSelectorAndLocator(projectPath);
      if (isRuntime) {
        expect(projectPath);
        testInfo(projectPath);
        testType(projectPath);
        channelOwner(projectPath);
        stackTrace(projectPath);
        indexContent(projectPath);
      }
    } else {
      console.warn("Project path not found", projectPath);
    }
  } catch (e) {
    // ignore
    console.error(e);
  }
}

module.exports = run;
