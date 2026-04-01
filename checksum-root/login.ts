import { ChecksumLoginFunction } from "@checksum-ai/runtime";

const login: ChecksumLoginFunction = async (
  page,
  { environment, user, config }
) => {
  // environment contains the selected environment from checksum.config.ts.
  // Use environment.baseURL for app navigation and environment.loginURL for a dedicated login route.
  // user contains the selected credentials for that environment, for example user.username and user.password.
  // config is the loaded checksum.config.ts object if you need shared runtime settings elsewhere.
  // If you define multiple environments or roles, helpers like
  // login(page, { environment, role }) and getEnvironment({ name, userRole })
  // decide which environment and user reach this function.
  // const loginUrl = environment.loginURL ?? "/login";
  // await page.goto(loginUrl);
  // await page.getByPlaceholder("Email").fill(user.username ?? "");
  // await page.getByPlaceholder("Password").fill(user.password ?? "");
  // await page.getByRole("button", { name: "Log in" }).click();
  // await page.waitForURL(new URL("/", environment.baseURL).toString());
};

export default login;
