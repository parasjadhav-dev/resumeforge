import { expect, test } from "@playwright/test";
import { STATE_DIR } from "./global-setup";

test.describe("landing page", () => {
  test("is served as a static page with the product headline", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("gets past the robots");
    await expect(page).toHaveTitle(/ResumeForge/);
  });

  test("a visitor who clicks Get started lands on create-account", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your free account");
    await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeVisible();
  });

  test("See how it works scrolls to the explanation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See how it works" }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.getByRole("heading", { name: "How it works" })).toBeInViewport();
  });

  test("the template pictures fit their frames on a phone (no sideways scrolling)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // No picture may cut off its resume: every frame is at least as tall as its content.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[aria-hidden="true"][class*="aspect-"]')].map(
        (el) => el.scrollHeight - el.clientHeight,
      ),
    );
    expect(clipped).toHaveLength(3);
    for (const extra of clipped) expect(extra).toBeLessThanOrEqual(1);
  });

  test("someone already signed in goes straight through to their resumes", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
      storageState: `${STATE_DIR}/state-main.json`,
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your resumes" })).toBeVisible();
    await context.close();
  });
});
