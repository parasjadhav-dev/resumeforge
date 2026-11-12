import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { STATE_DIR } from "./global-setup";

test.use({ storageState: `${STATE_DIR}/state-main.json` });

const ids = (): Record<string, string> =>
  JSON.parse(readFileSync(`${STATE_DIR}/seed.json`, "utf8")).ids;

const open = async (page: Page, key = "classic") => {
  await page.goto(`/resumes/${ids()[key]}/edit`);
  await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
};

const sectionButton = (page: Page, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${name}`) });

const box = async (locator: ReturnType<Page["locator"]>) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error("element has no box (is it hidden?)");
  return b;
};

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("every section starts open and can be collapsed to a one-line summary", async ({ page }) => {
    await open(page);
    await expect(sectionButton(page, "Experience")).toHaveAttribute("aria-expanded", "true");

    await sectionButton(page, "Experience").click();
    await expect(sectionButton(page, "Experience")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("2 entries")).toBeVisible();
    await expect(page.getByLabel("Job title").first()).toBeHidden();

    await sectionButton(page, "Experience").click();
    await expect(page.getByLabel("Job title").first()).toBeVisible();
  });

  test("the whole header row is clickable, not just the title text", async ({ page }) => {
    await open(page);
    await sectionButton(page, "Summary").scrollIntoViewIfNeeded(); // coordinates only exist on screen
    const header = await box(sectionButton(page, "Summary"));
    const section = await box(page.locator("#section-summary"));
    // On the empty part of the header row, well to the right of the title and left of the chevron.
    const x = section.x + section.width - 60;
    const y = header.y + header.height / 2;

    const hit = await page.evaluate(
      ([px, py]) => {
        const el = document.elementFromPoint(px, py);
        return el ? `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}` : "nothing";
      },
      [x, y],
    );
    await page.mouse.click(x, y);
    await expect(
      sectionButton(page, "Summary"),
      `clicked ${hit} at (${Math.round(x)}, ${Math.round(y)})`,
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("works from the keyboard: Enter and Space toggle a focused section", async ({ page }) => {
    await open(page);
    const button = sectionButton(page, "Skills");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-expanded", "true");
  });

  test("the jump bar stays pinned directly under the header while scrolling", async ({ page }) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 1500));
    const header = await box(page.locator("header").first());
    const nav = await box(page.getByRole("navigation", { name: "Jump to section" }));
    expect(nav.y).toBeGreaterThanOrEqual(header.y + header.height - 2); // not hidden behind the header
    expect(nav.y - (header.y + header.height)).toBeLessThanOrEqual(2); // and no gap above it
  });

  test("jumping to a section lands it fully below the pinned bars, with focus on its heading", async ({
    page,
  }) => {
    await open(page);
    await page
      .getByRole("navigation", { name: "Jump to section" })
      .getByRole("link", { name: /Certifications/ })
      .click();
    await expect(sectionButton(page, "Certifications")).toBeFocused();

    await page.waitForTimeout(700); // let the smooth scroll settle
    const nav = await box(page.getByRole("navigation", { name: "Jump to section" }));
    const target = await box(page.locator("#section-certifications"));
    expect(target.y).toBeGreaterThanOrEqual(nav.y + nav.height - 2); // not tucked under the jump bar
  });

  test("progress reflects the resume and reacts to edits", async ({ page }) => {
    await open(page, "blank");
    const bar = page.getByRole("progressbar", { name: "Resume progress" });
    await expect(bar).toHaveAttribute("aria-valuenow", "0");

    await page.getByLabel("Full name").fill("Asha Rao");
    await page.getByLabel("Email").fill("asha@example.com");
    await expect(bar).toHaveAttribute("aria-valuenow", "20");
    await expect(page.getByText("1 of 5 essentials done")).toBeVisible();
  });

  test("the preview is page-shaped and fills its column", async ({ page }) => {
    await open(page);
    const paper = await box(page.getByLabel("Resume preview").locator(".aspect-\\[210\\/297\\]"));
    expect(paper.height / paper.width).toBeGreaterThan(1.35); // A4 is 1.414
    expect(paper.width).toBeGreaterThan(450);
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("opens as an overview: every section collapsed, with summaries", async ({ page }) => {
    await open(page);
    for (const name of ["Contact", "Summary", "Experience", "Education", "Skills"]) {
      await expect(sectionButton(page, name)).toHaveAttribute("aria-expanded", "false");
    }
    await expect(page.getByText("Asha Rao · asha.rao@example.com")).toBeVisible();
    await expect(page.getByText("2 entries")).toBeVisible();
    // The whole form fits in a few screens instead of one very long scroll.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(height).toBeLessThan(2400);
  });

  test("the header is one compact row plus the Edit / Preview switch", async ({ page }) => {
    await open(page);
    const header = await box(page.locator("header").first());
    expect(header.height).toBeLessThan(115); // it used to wrap onto several rows
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
  });

  test("the jump bar sits exactly under the taller phone header (my measured offset is right)", async ({
    page,
  }) => {
    await open(page);
    await page.evaluate(() => window.scrollTo(0, 400));
    const header = await box(page.locator("header").first());
    const nav = await box(page.getByRole("navigation", { name: "Jump to section" }));
    const gap = nav.y - (header.y + header.height);
    expect(
      Math.abs(gap),
      `header is ${header.height}px tall, jump bar starts at ${nav.y}px`,
    ).toBeLessThanOrEqual(3);
  });

  test("tapping a section opens it; the Preview tab shows the resume and hides the form", async ({
    page,
  }) => {
    await open(page);
    await sectionButton(page, "Contact").tap();
    await expect(page.getByLabel("Full name")).toBeVisible();

    await page.getByRole("button", { name: "Preview" }).tap();
    await expect(page.getByLabel("Resume preview")).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeHidden();
    await expect(page.getByLabel("Resume preview")).toContainText("Asha Rao");

    await page.getByRole("button", { name: "Edit" }).tap();
    await expect(page.getByLabel("Full name")).toHaveValue("Asha Rao"); // nothing was lost
  });

  test("edits made on the form appear in the preview tab", async ({ page }) => {
    await open(page, "blank");
    await sectionButton(page, "Summary").tap();
    await page.getByLabel("Professional summary").fill("Written on a phone.");
    await page.getByRole("button", { name: "Preview" }).tap();
    await expect(page.getByLabel("Resume preview")).toContainText("Written on a phone.");
  });

  test("nothing scrolls sideways", async ({ page }) => {
    await open(page);
    await sectionButton(page, "Experience").tap();
    const { overflow, offenders } = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > width + 1)
        .slice(0, 6)
        .map(
          (el) =>
            `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} right=${Math.round(el.getBoundingClientRect().right)}`,
        );
      return { overflow: document.documentElement.scrollWidth - width, offenders };
    });
    expect(
      overflow,
      `elements wider than the screen: ${offenders.join(" || ")}`,
    ).toBeLessThanOrEqual(0);
  });

  test("the theme can be changed from the account menu", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Account menu" }).tap();
    await page.getByRole("menuitemradio", { name: "Dark" }).tap();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
