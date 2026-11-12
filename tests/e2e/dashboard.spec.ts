import { expect, test, type Page } from "@playwright/test";
import { STATE_DIR } from "./global-setup";

test.use({ storageState: `${STATE_DIR}/state-main.json` });

const card = (page: Page, title: string) =>
  page.getByRole("listitem").filter({ has: page.getByRole("link", { name: title, exact: true }) });

test("duplicate, rename, then delete a resume, with a dialog and a toast for each step", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(card(page, "Fresher Resume")).toBeVisible();
  const before = await page.getByRole("listitem").count();

  // Duplicate: the user is told, and the copy appears.
  await card(page, "Fresher Resume").getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByText('Created "Fresher Resume (copy)".')).toBeVisible();
  await expect(card(page, "Fresher Resume (copy)")).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(before + 1);

  // Rename in place.
  await card(page, "Fresher Resume (copy)").getByRole("button", { name: "Rename" }).click();
  // While renaming, the card's title link is replaced by a text box, so find it by that instead.
  const editing = page.getByRole("listitem").filter({ has: page.getByLabel("Resume title") });
  await editing.getByLabel("Resume title").fill("Throwaway resume");
  await editing.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText('Renamed to "Throwaway resume".')).toBeVisible();
  await expect(card(page, "Throwaway resume")).toBeVisible();

  // Delete, step 1: the dialog names the resume, and Escape backs out without deleting.
  const throwaway = card(page, "Throwaway resume");
  await throwaway.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Delete “Throwaway resume”?");
  await expect(dialog).toContainText("cannot be undone");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(throwaway).toBeVisible();

  // Delete, step 2: confirming removes it and says so.
  await throwaway.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete resume" }).click();
  await expect(page.getByText('Deleted "Throwaway resume".')).toBeVisible();
  await expect(throwaway).toHaveCount(0);
  await expect(page.getByRole("listitem")).toHaveCount(before);

  // The seeded resumes were never touched.
  await expect(card(page, "Fresher Resume")).toBeVisible();
});

test("the delete dialog is usable by keyboard alone and returns focus when closed", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const target = card(page, "Blank Resume");
  const deleteButton = target.getByRole("button", { name: "Delete" });

  await deleteButton.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();

  // Focus is moved into the dialog, so Tab cannot wander onto the page behind it.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(deleteButton).toBeFocused();
  await expect(target).toBeVisible(); // nothing was deleted
});

test("the dialog and toast are readable in dark mode too", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3100",
    colorScheme: "dark",
    storageState: `${STATE_DIR}/state-main.json`,
  });
  const page = await context.newPage();
  await page.goto("/dashboard");
  await card(page, "Blank Resume").getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();

  const colours = await dialog.evaluate((el) => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(colours.background).not.toBe(colours.text); // not invisible text
  expect(colours.background).not.toBe("rgba(0, 0, 0, 0)"); // not see-through
  await page.keyboard.press("Escape");
  await context.close();
});
