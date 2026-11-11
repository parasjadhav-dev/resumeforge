import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResumeTemplate } from "@/components/templates/resume-template";
import {
  createEmptyResume,
  resumeContentSchema,
  TEMPLATE_IDS,
  type TemplateId,
} from "@/shared/schema";
import { DEFAULT_TEMPLATE_ID, resolveTemplateId, TEMPLATES } from "@/shared/templates";

const render = (input: unknown, templateId: TemplateId) =>
  renderToStaticMarkup(
    <ResumeTemplate content={resumeContentSchema.parse(input)} templateId={templateId} />,
  );

const full = {
  contact: {
    fullName: "Asha Rao",
    email: "asha@example.com",
    location: "Pune",
    github: "github.com/asha",
  },
  summary: "Final-year CS student.",
  experience: [
    {
      title: "Intern",
      company: "Acme",
      startDate: "Jun 2024",
      current: true,
      bullets: ["Built an API", "  ", "Wrote tests"],
    },
  ],
  education: [{ institution: "PICT", degree: "B.E.", field: "Computer Engineering", gpa: "9.1" }],
  projects: [
    { name: "ResumeForge", technologies: ["Next.js", "Postgres"], bullets: ["Shipped it"] },
  ],
  skills: [{ category: "Languages", items: ["TypeScript", "Python"] }],
  certifications: [{ name: "AWS CCP", issuer: "Amazon", date: "Mar 2025" }],
};

describe("template registry", () => {
  it("lists every template id exactly once", () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it("falls back to the default for unknown ids", () => {
    expect(resolveTemplateId("modern")).toBe("modern");
    expect(resolveTemplateId("classic")).toBe("classic");
    expect(resolveTemplateId("fancy")).toBe(DEFAULT_TEMPLATE_ID);
    expect(resolveTemplateId(undefined)).toBe(DEFAULT_TEMPLATE_ID);
    expect(resolveTemplateId(null)).toBe(DEFAULT_TEMPLATE_ID);
  });
});

describe.each(TEMPLATE_IDS)("%s template", (templateId) => {
  it("shows a placeholder for an empty resume", () => {
    const html = renderToStaticMarkup(
      <ResumeTemplate content={createEmptyResume()} templateId={templateId} />,
    );
    expect(html).toContain("preview appears here");
    expect(html).not.toContain("<h2");
  });

  it("renders standard section headings in a fixed order", () => {
    const html = render(full, templateId);
    const order = ["Summary", "Experience", "Education", "Projects", "Skills", "Certifications"];
    const positions = order.map((h) => html.indexOf(`>${h}</h2>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("renders the right text for each part", () => {
    const html = render(full, templateId);
    expect(html).toContain("Asha Rao");
    expect(html).toContain("asha@example.com  |  Pune  |  github.com/asha");
    expect(html).toContain("Intern, Acme");
    expect(html).toContain("Jun 2024 – Present");
    expect(html).toContain("Languages: TypeScript, Python");
    expect(html).toContain("B.E., Computer Engineering | GPA: 9.1");
    expect(html).toContain("Next.js, Postgres");
    expect(html).toContain("AWS CCP, Amazon | Mar 2025");
  });

  it("drops blank bullets and hides empty sections", () => {
    const html = render(
      { contact: { fullName: "Asha Rao" }, experience: [full.experience[0]] },
      templateId,
    );
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain("Experience");
    for (const hidden of ["Education", "Skills", "Summary"]) expect(html).not.toContain(hidden);
  });

  it("stays ATS-friendly: no tables, images, or icons", () => {
    const html = render(full, templateId);
    for (const tag of ["<table", "<img", "<svg", "<canvas"]) expect(html).not.toContain(tag);
  });

  it("escapes user text instead of injecting HTML", () => {
    const html = render({ summary: "<script>alert(1)</script>" }, templateId);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("templates differ in look, not content", () => {
  const strip = (html: string) => html.replace(/<[^>]*>/g, "|").replace(/\|+/g, "|");

  it("produce the same text in the same order", () => {
    expect(strip(render(full, "classic"))).toBe(strip(render(full, "modern")));
  });

  it("use different styling", () => {
    const classic = render(full, "classic");
    const modern = render(full, "modern");
    expect(classic).not.toBe(modern);
    expect(classic).toContain("text-center");
    expect(modern).toContain("text-left");
    expect(modern).toContain("text-blue-900");
    expect(classic).not.toContain("text-blue-900");
  });
});
