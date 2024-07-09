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
  const originalContent =
    "if ((0, _utils.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);";

  const newContent =
    "await this.extendInjectedScript(consoleApiSource.source);";

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

  const entryPointText2 =
    'return asLocator(language || \\"javascript\\", selector);\\n  }\\n  ';
  const appendText2 =
    '_generateSelectorAndLocator(element, language) {\\n    if (!(element instanceof Element))\\n      throw new Error(`Usage: playwright.locator(element).`);\\n    const selector = this._injectedScript.generateSelector(element);\\n    return {selector, locator: asLocator(language || \\"javascript\\", selector)};\\n  }\\n  ';
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

  originalContent = `return (...args) => {
      const testInfo = (0, _globals.currentTestInfo)();`;
  newContent = `return (...args) => {
      let noSoft = false;
      if (args[args.length-1]==='no-soft'){
        noSoft = true;
        args.pop();
      }
      const testInfo = (0, _globals.currentTestInfo)();`;
  replaceContent(file, originalContent, newContent);

  originalContent = `const rawStack = (0, _utils.captureRawStack)();`;
  newContent = `const rawStack = (0, _utils.captureRawStack)().filter(s=>!s.includes('@checksum-ai/runtime'));`;
  replaceContent(file, originalContent, newContent);

  originalContent = `step.complete({
          error
        })`;
  newContent = `step.complete({
          error,
          noSoft
        })`;
  replaceContent(file, originalContent, newContent);

  originalContent = `if (!this._info.isSoft) throw error;`;
  newContent = `if (!this._info.isSoft || noSoft) throw error;`;
  replaceContent(file, originalContent, newContent);
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

  originalContent = `const rawStack = (0, _utils.captureRawStack)();`;
  newContent = `let rawStack = (0, _utils.captureRawStack)();`;
  replaceContent(file, originalContent, newContent);

  entryPointText = `if (!parentStep) parentStep = _utils.zones.zoneData('stepZone', rawStack) || undefined;`;
  appendText = `\nrawStack = rawStack.filter(s=>!s.includes('@checksum-ai/runtime'));`;
  amend(file, entryPointText, appendText);

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

  originalContent = `_failWithError(error, isHardError) {`;
  newContent = `addError(error, message) {
    const serialized = (0, _util.serializeError)(error);
    serialized.message = [message, serialized.message].join('\\n\\n');
    serialized.stack = [message, serialized.stack].join('\\n\\n');
    const step = error[stepSymbol];
    if (step && step.boxedStack) serialized.stack = \`\${error.name}: \${error.message}\\n\${(0, _utils.stringifyStackFrames)(step.boxedStack).join('\\n')}\`;
    this.errors.push(serialized);
  }
  _failWithError(error, isHardError) {`;
  replaceContent(file, originalContent, newContent);

  originalContent = `if (step.isSoft && result.error) this._failWithError`;
  newContent = `if (!result.noSoft && step.isSoft && result.error) this._failWithError`;
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

  let originalContent, newContent;

  originalContent = `}, async () => {
      // Make sure that internal "step" is not leaked to the user callback.
      return await body();
    });`;
  newContent = `}, async (step) => {
      if (options.obtainStep){
        options.obtainStep(step);
      }
      // Make sure that internal "step" is not leaked to the user callback.
      return await body();
    });`;
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

  entryPointText = `async _wrapApiCall(func, isInternal = false) {`;
  appendText = `\nif (this._checksumInternal){
      isInternal = true;
    }`;
  amend(file, entryPointText, appendText);

  originalContent = `const stack = (0, _stackTrace.captureRawStack)();`;
  newContent = `const stack = (0, _stackTrace.captureRawStack)().filter(s=>!s.includes('@checksum-ai/runtime'));`;
  replaceContent(file, originalContent, newContent);

  entryPointText = `let apiName = stackTrace.apiName;`;
  appendText = `\nif (!isInternal && this._checksumTitle){
      apiName = this._checksumTitle;
      this._checksumTitle = undefined;
    }`;
  amend(file, entryPointText, appendText);
}

// -------- [Run] -------- //

const isRuntime = true || process.env.RUNTIME === "true";
const projectRootFromEnv = process.env.PROJECT_ROOT;

const projectPaths = projectRootFromEnv
  ? [projectRootFromEnv]
  : [
      ".",
      "../checksum-ai-libs/lib",
      "../backend",
      "../libs/lib",
      "../frontend",
      "../runtime",
    ].map((project) => join(process.cwd(), project));

for (const projectPath of projectPaths) {
  try {
    if (fs.existsSync(projectPath)) {
      alwaysInjectScripts(projectPath);
      addGenerateSelectorAndLocator(projectPath);
      if (isRuntime) {
        expect(projectPath);
        testInfo(projectPath);
        testType(projectPath);
        channelOwner(projectPath);
      }
    } else {
      // console.warn("Project path not found", projectPath);
    }
  } catch (e) {
    // ignore
  }
}

// function alwaysInjectScriptsOld() {
//   const file = "node_modules/playwright-core/lib/server/browserContext.js";
//   const lineNumber = 108;
//   const originalLine =
//     "    if ((0, _utils.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);";
//   const newLine =
//     "    await this.extendInjectedScript(consoleApiSource.source);";
//   replaceLine(file, lineNumber, originalLine, newLine);
// }

// // Replaces the content of the specified line in the file.
// // When "on" is true, the new line is written to the file,
// // otherwise the original line is restored.
// function replaceLine(filePath, lineNumber, originalLine, newLine) {
//   // Read the file content
//   const fileContent = fs.readFileSync(filePath, "utf8");

//   // Split the content into an array of lines
//   const lines = fileContent.split(/\r?\n/);

//   // Check if the line number is within the range of the file's line count
//   if (lineNumber < 1 || lineNumber > lines.length) {
//     throw new Error("Line number out of range");
//   }

//   // Replace the content of the specified line
//   lines[lineNumber - 1] = on ? newLine : originalLine;

//   // Join the lines back into a single string
//   const updatedContent = lines.join("\n");

//   // Write the modified content back to the file
//   fs.writeFileSync(filePath, updatedContent, "utf8");
// }

// // Replaces the content of the specified line in the file.
// // When "on" is true, the new line is written to the file,
// // otherwise the original line is restored.
// function replaceContent(filePath, originalContent, newContent) {
//   // Read the file content
//   const fileContent = fs.readFileSync(filePath, "utf8");

//   // add a marker for newContent that can be later recognized for "off" state
//   newContent = `/* checksumai */ ${newContent}`;

//   // Split the content into an array of lines
//   const lines = fileContent.split(/\r?\n/);

//   lines.forEach((line, index) => {
//     if (on) {
//       if (line.includes(originalContent)) {
//         lines[index] = line.replace(originalContent, newContent);
//       }
//     } else {
//       if (line.includes(newContent)) {
//         lines[index] = line.replace(newContent, originalContent);
//       }
//     }
//   });

//   // Join the lines back into a single string
//   const updatedContent = lines.join("\n");

//   // Write the modified content back to the file
//   fs.writeFileSync(filePath, updatedContent, "utf8");
// }
