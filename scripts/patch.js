const fs = require("fs");

// Args
const on = process.argv[2] !== "off";
const fromRoot = process.argv[3] === "root";

// Amends the file with the given entry point text and append text
// When "on" is true, the append text is added to the entry point,
// otherwise the append text is completely removed from the file
function amend(filePath, entryPointText, appendText) {
  filePath = fromRoot ? `backend/${filePath}` : filePath;
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

// Replaces the content of the specified line in the file.
// When "on" is true, the new line is written to the file,
// otherwise the original line is restored.
function replaceLine(filePath, lineNumber, originalLine, newLine) {
  // Read the file content
  const fileContent = fs.readFileSync(filePath, "utf8");

  // Split the content into an array of lines
  const lines = fileContent.split(/\r?\n/);

  // Check if the line number is within the range of the file's line count
  if (lineNumber < 1 || lineNumber > lines.length) {
    throw new Error("Line number out of range");
  }

  // Replace the content of the specified line
  lines[lineNumber - 1] = on ? newLine : originalLine;

  // Join the lines back into a single string
  const updatedContent = lines.join("\n");

  // Write the modified content back to the file
  fs.writeFileSync(filePath, updatedContent, "utf8");
}

// Replaces the content of the specified line in the file.
// When "on" is true, the new line is written to the file,
// otherwise the original line is restored.
function replaceContent(filePath, originalContent, newContent) {
  // Read the file content
  const fileContent = fs.readFileSync(filePath, "utf8");

  // add a marker for newContent that can be later recognized for "off" state
  newContent = `/* checksumai */ ${newContent}`;

  // Split the content into an array of lines
  const lines = fileContent.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (on) {
      if (line.includes(originalContent)) {
        lines[index] = line.replace(originalContent, newContent);
      }
    } else {
      if (line.includes(newContent)) {
        lines[index] = line.replace(newContent, originalContent);
      }
    }
  });

  // Join the lines back into a single string
  const updatedContent = lines.join("\n");

  // Write the modified content back to the file
  fs.writeFileSync(filePath, updatedContent, "utf8");
}

// Remove conditions for injecting Playwright scripts
function alwaysInjectScripts() {
  const file = "node_modules/playwright-core/lib/server/browserContext.js";
  const originalContent =
    "if ((0, _utils.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);";

  const newContent =
    "await this.extendInjectedScript(consoleApiSource.source);";

  replaceContent(file, originalContent, newContent);
}

// Add implementation for generateSelectorAndLocator and inject to Playwright console API
function addGenerateSelectorAndLocator() {
  const file = "node_modules/playwright-core/lib/generated/consoleApiSource.js";

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

alwaysInjectScripts();
addGenerateSelectorAndLocator();

// function alwaysInjectScriptsOld() {
//   const file = "node_modules/playwright-core/lib/server/browserContext.js";
//   const lineNumber = 108;
//   const originalLine =
//     "    if ((0, _utils.debugMode)() === 'console') await this.extendInjectedScript(consoleApiSource.source);";
//   const newLine =
//     "    await this.extendInjectedScript(consoleApiSource.source);";
//   replaceLine(file, lineNumber, originalLine, newLine);
// }
