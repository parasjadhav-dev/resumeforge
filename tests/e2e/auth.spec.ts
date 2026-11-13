import { expect, test } from "@playwright/test";
import { STATE_DIR } from "./global-setup";

// Nobody is signed in unless a test says so.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("sign in and create account", () => {
  test("sign in offers Google, and a link to create an account", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Sign in/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("create account says so, and links back to sign in", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveTitle(/Create your account/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your free account");
    await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeVisible();

    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("where the visitor was headed survives the move between the two pages", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Fresumes%2Fabc%2Ftailor");
    await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/signup?callbackUrl=%2Fresumes%2Fabc%2Ftailor",
    );
    await expect(page.locator('input[name="redirectTo"]')).toHaveValue("/resumes/abc/tailor");
  });

  test("an unsafe callback address is ignored", async ({ page }) => {
    await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example%2F");
    await expect(page.locator('input[name="redirectTo"]')).toHaveValue("/dashboard");
    await page.goto("/signup?callbackUrl=%2F%2Fevil.example");
    await expect(page.locator('input[name="redirectTo"]')).toHaveValue("/dashboard");
  });

  test("a failed sign-in explains itself in plain words", async ({ page }) => {
    await page.goto("/login?error=AccessDenied");
    await expect(
      page.getByRole("alert").filter({ hasText: "Google did not let us sign you in" }),
    ).toBeVisible();

    await page.goto("/login?error=SomethingNew");
    await expect(
      page.getByRole("alert").filter({ hasText: "We could not sign you in" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });

  test("no error message shows on a normal visit", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: /sign you in/ })).toHaveCount(0);
  });

  test("the brand panel shows on a wide screen and is replaced by a logo on a phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/signup");
    await expect(page.getByText("A resume that stays true to you.")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByText("A resume that stays true to you.")).toBeHidden();
    await expect(page.getByRole("main").getByText("ResumeForge")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the home link goes to the landing page", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("a signed-in visitor is sent on to the app from both pages", async ({ browser }) => {
    for (const path of ["/login", "/signup"]) {
      const context = await browser.newContext({
        baseURL: "http://localhost:3100",
        storageState: `${STATE_DIR}/state-main.json`,
      });
      const page = await context.newPage();
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
      await context.close();
    }
  });
});
