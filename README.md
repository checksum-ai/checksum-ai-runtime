# Checksum.ai Tests

## Quick Start

1. Run `npm i @checksum-ai/runtime`
2. Navigate to the directory you want to add Checksum tests and run `npm run checksum init`
3. Run `npx playwright install --with-deps` to install Playwright dependencies.
4. Update `checksum.config.ts`. At the very least you need to add:
   1. apiKey
   2. baseURL
   3. username
   4. password
5. Update `login.ts` with your login function using Playwright (see bellow)
6. Run `npm run checksum test` to run the example test and make sure login is successful
7. If you haven't already done so, go to [app.checksum.ai](https://app.checksum.ai) finish the configuration and generate a test. Then wait for the PR to be created and approve it.

## Login Function

1. This function will be run at the beginning of each test.
2. We recommend using a consistent seeded user for each test. For example, before each test, call a webhook that creates a user, seeds it with data and returns the username and password. Doing so will keep tests reliable and allow running tests in parallel. If you do use a webhook, make sure to configure it [in your project](https://app.checksum.ai/#/settings/wizard) as well so test generation runs in the same context.
3. After login-in, assert that the login was successful. Playwright waits for assertions to be correct, so adding an assertion assures that the page is ready fo interaction before returning.
4. If you'd like to reuse authentication state between tests, follow Playwright guide https://playwright.dev/docs/auth. Then, check at the beginning of the login function if user is already authenticated and if so return.

## Checksum AI Magic

The tests Checksum generates are Playwright tests. However, when executed using Checksum CLI with an API key, Checksum extends Playwright functionality to improve test reliability and automatically maintain tests.

### Autonomous Test Agent

Checksum runs your Playwright tests regularly, but we added a few extra features to make tests more reliable. All of the features can be turned on/off through `checksum.config.ts`

**Smart Selectors**
when the test is generated, Checksum stores vast metadata for every action (see test-data folder). When a classic selector fails, we use the metadata to fix it. For example, if a test identifies an element by its ID, but the ID changed, Checksum looks at hundreds of other data points (eg element class, text, parents) to find the element. To connect an action to its metadata, we use the `checksumSelector("<id>")` method. Do not change the IDs.

**Checksum AI**
If Smart Selectors fail as well, Checksum can use our custom-trained model to completely regenerate the failed section. In that case, the model might add, remove of take different actions to complete the same goals. The model will not change the assertions and the assumption is that as long as the assertions pass, the model has fixed the test. `.checksumAI("<natural language description of the test>")` method is used to instruct the model on how to fix the test.

You can edit the description as needed to help inform our model. You can also add steps with only ChecksumAI descriptions so our model will generate the Playwright code. For example, adding `await page.checksumAI("Click on 'New Task' button")` without the actual action will have our model generate the Playwright code for this action. You can even author full tests this way.

### Run Modes

Checksum has three run modes:

1. Normal - tests are run using the Autonomous Test Agent as defined in the config file.
2. Heal - If the Autonomous Test Agent corrects a test, we create a new test file with the fix. By default the test file will be created locally, but you can also have the Agent open a PR to your github repo by setting `autoHealPRs` to true
3. Refactor (wip) - Checksum Autonomous Test Agent will run the test and for each action, regenerate a regular Playwright selector, a Smart Selector and a Checksum AI description.

### Mock Data

When Checksum generates the test, we record all of the Backend responses so you can run the tests with exactly the same Backend context. Its useful when debugging a test, or when running it for the first time, especially if your testing DB/context is different then the one used for test generation. If your Backend response format, changes the Mocked data might not work as expected anymore.

### CLI Commands (Needs to be updated)

1. `init` - initialize Checksum directory and configs
2. `test` - Run Checksum tests. Accepts all [Playwright command line flags](https://playwright.dev/docs/test-cli). To override the`checksum.config.ts` you can pass full or partial json as a string. E.g. `--checksum-config='{"baseURL" = "https://example.com"}'`
