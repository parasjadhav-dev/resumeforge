import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SHOTS_DIR, STATE_DIR } from "./global-setup";
import { IMPORT_REVIEW, IMPORT_SOURCE_TEXT } from "./seed-data";

/**
 * Visual + accessibility review of every screen.
 *
 * Writes a screenshot of each screen at desktop and mobile widths to ui-shots/latest/, and an
 * accessibility report (axe, WCAG 2.1 A/AA) to ui-shots/latest/a11y-report.json. By default the
 * report only informs; set A11Y_STRICT=1 to fail on serious or critical problems.
 */

const STRICT = process.env.A11Y_STRICT === "1";
const BASE_URL = "http://localhost:3100";

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

type Auth = "main" | "empty" | "none";
type Seed = Record<string, string>;
type Screen = {
  name: string;
  auth: Auth;
  path: (ids: Seed) => string;
  /** Text that proves the screen has finished rendering. */
  ready: string | RegExp;
  prepare?: (page: Page, ids: Seed) => Promise<void>;
  /** Runs once the screen is ready, to put it into the state worth photographing. */
  interact?: (page: Page) => Promise<void>;
  /** Photograph only what fits on screen. Needed for overlays: a full-page capture misplaces them. */
  viewportOnly?: boolean;
};

const seed = (): Seed => JSON.parse(readFileSync(`${STATE_DIR}/seed.json`, "utf8")).ids;

const SCREENS: Screen[] = [
  { name: "landing", auth: "none", path: () => "/", ready: "Get started free" },
  { name: "login", auth: "none", path: () => "/login", ready: "Continue with Google" },
  { name: "signup", auth: "none", path: () => "/signup", ready: "Sign up with Google" },
  {
    name: "login-error",
    auth: "none",
    path: () => "/login?error=AccessDenied",
    ready: "Google did not let us sign you in",
  },
  { name: "dashboard", auth: "main", path: () => "/dashboard", ready: "Software Engineer Resume" },
  { name: "dashboard-empty", auth: "empty", path: () => "/dashboard", ready: "No resumes yet" },
  {
    name: "dashboard-delete-dialog",
    auth: "main",
    path: () => "/dashboard",
    ready: "Blank Resume",
    viewportOnly: true,
    interact: async (page) => {
      await page
        .getByRole("listitem")
        .filter({ has: page.getByRole("link", { name: "Blank Resume", exact: true }) })
        .getByRole("button", { name: "Delete" })
        .click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
    },
  },
  {
    name: "editor-classic",
    auth: "main",
    path: (s) => `/resumes/${s.classic}/edit`,
    ready: "Contact",
  },
  {
    name: "editor-modern",
    auth: "main",
    path: (s) => `/resumes/${s.modern}/edit`,
    ready: "Contact",
  },
  {
    name: "editor-fresher",
    auth: "main",
    path: (s) => `/resumes/${s.fresher}/edit`,
    ready: "Contact",
  },
  { name: "editor-blank", auth: "main", path: (s) => `/resumes/${s.blank}/edit`, ready: "Contact" },
  {
    name: "editor-unsupported-characters",
    auth: "main",
    path: (s) => `/resumes/${s.unsupported}/edit`,
    ready: "PDF font cannot display",
  },
  {
    name: "editor-imported-review",
    auth: "main",
    path: (s) => `/resumes/${s.imported}/edit?imported=1&check=1`,
    ready: "Imported from your file",
    // Same data the import form leaves in the browser tab after a real import.
    prepare: async (page, s) => {
      await page.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [
        `rf-import:${s.imported}`,
        JSON.stringify({ review: IMPORT_REVIEW, sourceText: IMPORT_SOURCE_TEXT }),
      ] as const);
    },
  },
  {
    name: "tailor-empty",
    auth: "main",
    path: (s) => `/resumes/${s.classic}/tailor`,
    ready: "Analyze job",
  },
  {
    name: "tailor-result",
    auth: "main",
    path: (s) => `/resumes/${s.classic}/tailor`,
    ready: "Analyze job",
    // The analysis is mocked so the screenshot is always the same and no AI call is made.
    prepare: async (page) => {
      await page.route("**/api/jobs/analyze", (route) =>
        route.fulfill({
          json: {
            jobTitle: "Junior Backend Developer",
            company: "Acme Corp",
            cached: false,
            analysis: {
              title: "Junior Backend Developer",
              company: "Acme Corp",
              seniority: "entry",
              educationRequired: "bachelor",
              minYearsExperience: 1,
              requiredSkills: ["Python", "REST APIs", "PostgreSQL", "Git", "Docker"],
              preferredSkills: ["AWS", "CI/CD"],
              keywords: ["automated testing", "code review"],
              responsibilities: [
                "Build and maintain REST APIs",
                "Write automated tests for new features",
              ],
            },
          },
        }),
      );
    },
    interact: async (page) => {
      await page.getByLabel("Job description").fill("x".repeat(120));
      await page.getByRole("button", { name: "Analyze job" }).click();
      await expect(page.getByTestId("analysis-result")).toBeVisible();
    },
  },
  {
    name: "editor-not-found",
    auth: "main",
    path: () => "/resumes/does-not-exist/edit",
    ready: /not found|404/i,
  },
];

type Finding = {
  screen: string;
  viewport: string;
  id: string;
  impact: string | null | undefined;
  help: string;
  count: number;
  example: string;
};
const findings: Finding[] = [];

const SCHEMES = ["light", "dark"] as const;

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
  for (const scheme of SCHEMES) {
    // "desktop", "mobile", "desktop.dark", "mobile.dark": used in test titles and file names.
    const variant = scheme === "light" ? viewportName : `${viewportName}.${scheme}`;
    test.describe(variant, () => {
      for (const screen of SCREENS) {
        test(`${screen.name}`, async ({ browser }) => {
          const ids = seed();
          const context = await browser.newContext({
            baseURL: BASE_URL,
            viewport,
            colorScheme: scheme,
            reducedMotion: "reduce",
            storageState:
              screen.auth === "none" ? undefined : `${STATE_DIR}/state-${screen.auth}.json`,
          });
          const page = await context.newPage();
          try {
            await screen.prepare?.(page, ids);
            await page.goto(screen.path(ids));
            await expect(page.getByText(screen.ready).first()).toBeVisible();
            await screen.interact?.(page);
            await page.waitForLoadState("networkidle");
            await page.evaluate(() => document.fonts.ready);

            mkdirSync(SHOTS_DIR, { recursive: true });
            await page.screenshot({
              path: `${SHOTS_DIR}/${screen.name}.${variant}.png`,
              fullPage: !screen.viewportOnly,
              animations: "disabled",
            });

            const result = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
              .analyze();
            for (const v of result.violations) {
              findings.push({
                screen: screen.name,
                viewport: variant,
                id: v.id,
                impact: v.impact,
                help: v.help,
                count: v.nodes.length,
                example: v.nodes[0]?.target.join(" ") ?? "",
              });
            }

            if (STRICT) {
              const blocking = result.violations.filter(
                (v) => v.impact === "serious" || v.impact === "critical",
              );
              expect(
                blocking.map((v) => `${v.id}: ${v.help}`),
                "serious or critical accessibility problems",
              ).toEqual([]);
            }
          } finally {
            await context.close();
          }
        });
      }
    });
  }
}

test.afterAll(() => {
  mkdirSync(SHOTS_DIR, { recursive: true });
  writeFileSync(`${SHOTS_DIR}/a11y-report.json`, JSON.stringify(findings, null, 2));

  const byRule = new Map<
    string,
    { impact: string; help: string; screens: Set<string>; nodes: number }
  >();
  for (const f of findings) {
    const entry = byRule.get(f.id) ?? {
      impact: f.impact ?? "?",
      help: f.help,
      screens: new Set(),
      nodes: 0,
    };
    entry.screens.add(`${f.screen}@${f.viewport}`);
    entry.nodes += f.count;
    byRule.set(f.id, entry);
  }
  const rows = [...byRule.entries()].sort((a, b) => b[1].nodes - a[1].nodes);
  console.log(`\nAccessibility (axe, WCAG 2.1 A/AA): ${rows.length} rule(s) violated`);
  for (const [id, r] of rows) {
    console.log(
      `  [${r.impact}] ${id}: ${r.help} (${r.nodes} element(s), ${r.screens.size} screen(s))`,
    );
  }
  console.log(`\nScreenshots and report: ${SHOTS_DIR}/`);
});
