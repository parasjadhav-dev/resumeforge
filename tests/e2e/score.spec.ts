import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { STATE_DIR } from "./global-setup";

test.use({ storageState: `${STATE_DIR}/state-main.json` });

const SIGNED_OUT = { cookies: [], origins: [] };
const classic = () => JSON.parse(readFileSync(`${STATE_DIR}/seed.json`, "utf8")).ids.classic;

const ANALYSIS = {
  title: "Backend Developer",
  company: "Acme",
  seniority: "entry",
  educationRequired: "bachelor",
  minYearsExperience: 0,
  requiredSkills: ["Node.js", "Kubernetes"],
  preferredSkills: ["Git"],
  keywords: [],
  responsibilities: [],
};

test.describe("POST /api/resumes/:id/score", () => {
  test("requires sign-in", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
      storageState: SIGNED_OUT,
    });
    const response = await context.request.post(`/api/resumes/${classic()}/score`, {
      data: { analysis: ANALYSIS },
    });
    expect(response.status()).toBe(401);
    await context.close();
  });

  test("scores a saved resume with a breakdown and matched/missing terms", async ({ page }) => {
    const response = await page.request.post(`/api/resumes/${classic()}/score`, {
      data: { analysis: ANALYSIS },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.matched.required).toEqual(["Node.js"]); // the sample resume builds REST APIs in Node.js
    expect(body.missing.required).toEqual(["Kubernetes"]);
    expect(body.components).toHaveLength(5);
    expect(body.score).toBeGreaterThan(0);
    expect(body.score).toBeLessThanOrEqual(100);
  });

  test("rejects a body that is not a job analysis", async ({ page }) => {
    for (const data of [{}, { analysis: {} }, { analysis: { ...ANALYSIS, seniority: "god" } }]) {
      const response = await page.request.post(`/api/resumes/${classic()}/score`, { data });
      expect(response.status(), JSON.stringify(data)).toBe(400);
    }
  });

  test("another user's resume is not found", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3100",
      storageState: `${STATE_DIR}/state-empty.json`,
    });
    const response = await context.request.post(`/api/resumes/${classic()}/score`, {
      data: { analysis: ANALYSIS },
    });
    expect(response.status()).toBe(404);
    await context.close();
  });
});
