// To connect to a test run, in the test itself add test.use({
//     launchOptions: {
//         args: ['--remote-debugging-port=9222']
//     }
// });

const repl = require("repl");
const playwright = require("playwright");
const completions = [".help", ".exit", ".load", ".save", "playwright"];

const awaitSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// https://nodejs.org/api/readline.html#readline_use_of_the_completer_function
function completer(line) {
  const hits = completions.filter((c) => c.startsWith(line));
  return [hits.length ? hits : completions, line];
}

async function connect() {
  const port = "9222";
  const browser = await playwright.chromium.connectOverCDP(
    "http://127.0.0.1:" + port
  );
  const context = browser.contexts()[0];
  context.setDefaultTimeout(0);
  context.setDefaultNavigationTimeout(0);
  let page = context.pages()[0];
  while (!page) {
    await awaitSleep(1000);
    page = context.pages()[0];
  }
  return { browser, context, page };
}

async function start() {
  const props = await connect();
  console.log("Connected to test page");
  completions.push(...Object.keys(props));
  const r = repl.start({
    prompt: "> ",
    useColors: true,
    preview: true,
    completer,
  });
  Object.assign(r.context, props);
}

async function startWithRetry() {
  try {
    await start();
  } catch (e) {
    await awaitSleep(2000);
    await startWithRetry();
  }
}

(async () => {
  console.log("Connecting to test page and starting REPL...");
  await startWithRetry();
})();
