import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { STATE_DIR } from "./global-setup";

test.use({ storageState: `${STATE_DIR}/state-main.json` });

// Playwright applies the file-wide signed-in state to contexts made by hand too, so say "nobody" explicitly.
const SIGNED_OUT = { cookies: [], origins: [] };

const ids = (): Record<string, string> =>
  JSON.parse(readFileSync(`${STATE_DIR}/seed.json`, "utf8")).ids;

const POSTING =
  "Junior Backend Developer at Acme Corp. You will build and maintain REST APIs in Python and work " +
  "with a PostgreSQL database. Requirements: a bachelor's degree, 1+ years with Python, and Git. " +
  "Nice to have: experience with AWS and CI/CD pipelines.";

const MOCK = {
  jobTitle: "Junior Backend Developer",
  company: "Acme Corp",
  cached: false,
  analysis: {
    title: "Junior Backend Developer",
    company: "Acme Corp",
    seniority: "entry",
    educationRequired: "bachelor",
    minYearsExperience: 1,
    requiredSkills: ["Python", "REST APIs", "PostgreSQL", "Git"],
    preferredSkills: ["AWS", "CI/CD"],
    keywords: ["databases"],
    responsibilities: ["Build and maintain REST APIs"],
  },
};

/** Answers the analysis request itself, so these tests never spend a real AI call. */
const mockAnalysis = (page: Page, body: unknown = MOCK, status = 200) =>
  page.route("**/api/jobs/analyze", (route) => route.fulfill({ status, json: body }));

const open = async (page: Page, key = "classic") => {
  await page.goto(`/resumes/${ids()[key]}/tailor`);
  await expect(page.getByRole("heading", { level: 1, name: "Tailor to a job" })).toBeVisible();
};

test.describe("the tailor page", () => {
  test("is reachable from the editor and links back to it", async ({ page }) => {
    await page.goto(`/resumes/${ids().classic}/edit`);
    await page.getByRole("link", { name: "Tailor to a job" }).click();
    await expect(page).toHaveURL(/\/tailor$/);
    await expect(page.getByLabel("Job description")).toBeVisible();

    await page
      .getByRole("navigation", { name: "Breadcrumb" })
      .getByRole("link", { name: "Software Engineer Resume" })
      .click();
    await expect(page).toHaveURL(/\/edit$/);
  });

  test("asks for a real description, and shows the analysis when given one", async ({ page }) => {
    await mockAnalysis(page);
    await open(page);

    await page.getByRole("button", { name: "Analyze job" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "at least 100 characters" }),
    ).toBeVisible();

    await page.getByLabel("Job description").fill(POSTING);
    await page.getByRole("button", { name: "Analyze job" }).click();

    const result = page.getByTestId("analysis-result");
    await expect(
      result.getByRole("heading", { level: 2, name: "Junior Backend Developer" }),
    ).toBeVisible();
    await expect(result.getByText("Entry level")).toBeVisible();
    await expect(
      result.getByRole("region", { name: /Required skills/ }).getByText("REST APIs"),
    ).toBeVisible();
    await expect(
      result.getByRole("region", { name: /Preferred skills/ }).getByText("AWS"),
    ).toBeVisible();
  });

  test("sends exactly what was typed, and keeps it when going back to edit", async ({ page }) => {
    let sent: Record<string, string> = {};
    await page.route("**/api/jobs/analyze", (route) => {
      sent = route.request().postDataJSON();
      return route.fulfill({ json: MOCK });
    });
    await open(page);
    await page.getByLabel("Job title (optional)").fill("Backend Dev");
    await page.getByLabel("Company (optional)").fill("Acme");
    await page.getByLabel("Job description").fill(POSTING);
    await page.getByRole("button", { name: "Analyze job" }).click();
    await expect(page.getByTestId("analysis-result")).toBeVisible();

    expect(sent).toEqual({ jobDescription: POSTING, jobTitle: "Backend Dev", company: "Acme" });

    await page.getByRole("button", { name: "Edit the job description" }).click();
    await expect(page.getByLabel("Job description")).toHaveValue(POSTING);
  });

  test("a reload does not lose a long pasted description", async ({ page }) => {
    await open(page);
    await page.getByLabel("Job description").fill(POSTING);
    await page.getByLabel("Company (optional)").fill("Acme");
    await page.reload();
    await expect(page.getByLabel("Job description")).toHaveValue(POSTING);
    await expect(page.getByLabel("Company (optional)")).toHaveValue("Acme");
  });

  test("shows a server error without losing the text", async ({ page }) => {
    await mockAnalysis(
      page,
      { error: "We couldn't analyse that job description just now. Please try again in a moment." },
      502,
    );
    await open(page);
    await page.getByLabel("Job description").fill(POSTING);
    await page.getByRole("button", { name: "Analyze job" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "couldn't analyse" })).toBeVisible();
    await expect(page.getByLabel("Job description")).toHaveValue(POSTING);
    await expect(page.getByRole("button", { name: "Analyze job" })).toBeEnabled();
  });

  test("shows progress while the AI works, and blocks edits meanwhile", async ({ page }) => {
    await page.route("**/api/jobs/analyze", async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.fulfill({ json: MOCK });
    });
    await open(page);
    await page.getByLabel("Job description").fill(POSTING);
    await page.getByRole("button", { name: "Analyze job" }).click();

    await expect(page.getByRole("button", { name: /reading the job description/i })).toBeDisabled();
    await expect(page.getByLabel("Job description")).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "5 to 15 seconds" })).toBeVisible();
    await expect(page.getByTestId("analysis-result")).toBeVisible();
  });

  test("another user's resume is not found, even for the tailor page", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
      storageState: `${STATE_DIR}/state-empty.json`,
    });
    const page = await context.newPage();
    await page.goto(`/resumes/${ids().classic}/tailor`);
    await expect(page.getByRole("heading", { name: /couldn.t find that page/i })).toBeVisible();
    await expect(page.getByText("Software Engineer Resume")).toHaveCount(0); // nothing about it leaks
    await context.close();
  });

  test("a signed-out visitor is sent to sign in", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
      storageState: SIGNED_OUT,
    });
    const page = await context.newPage();
    await page.goto(`/resumes/${ids().classic}/tailor`);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await context.close();
  });

  test("a long result fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAnalysis(page, {
      ...MOCK,
      analysis: {
        ...MOCK.analysis,
        requiredSkills: Array.from({ length: 24 }, (_, i) => `Distributed systems design ${i + 1}`),
        responsibilities: [
          "Design, implement, test, deploy, and operate highly available distributed backend services for millions of users",
        ],
      },
    });
    await open(page);
    await page.getByLabel("Job description").fill(POSTING);
    await page.getByRole("button", { name: "Analyze job" }).click();
    await expect(page.getByTestId("analysis-result")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("POST /api/jobs/analyze (validation, no AI involved)", () => {
  test("requires sign-in", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
      storageState: SIGNED_OUT,
    });
    const response = await context.request.post("/api/jobs/analyze", {
      data: { jobDescription: POSTING },
    });
    expect(response.status()).toBe(401);
    await context.close();
  });

  test("rejects a missing, empty, or too-short description with a clear message", async ({
    page,
  }) => {
    for (const data of [{}, { jobDescription: "" }, { jobDescription: "Python developer" }]) {
      const response = await page.request.post("/api/jobs/analyze", { data });
      expect(response.status(), JSON.stringify(data)).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid input");
      expect(JSON.stringify(body.issues)).toMatch(/at least 100 characters|expected string/i);
    }
  });

  test("rejects a description over the limit", async ({ page }) => {
    const response = await page.request.post("/api/jobs/analyze", {
      data: { jobDescription: "word ".repeat(4_500) },
    });
    expect(response.status()).toBe(400);
    expect(JSON.stringify(await response.json())).toContain("too long");
  });

  test("rejects malformed JSON", async ({ page }) => {
    const response = await page.request.post("/api/jobs/analyze", {
      headers: { "content-type": "application/json" },
      data: "{not json",
    });
    expect(response.status()).toBe(400);
  });

  test("rejects an enormous request before reading it", async ({ page }) => {
    const response = await page.request.post("/api/jobs/analyze", {
      data: { jobDescription: "x".repeat(300_000) },
    });
    expect(response.status()).toBe(413);
  });
});
