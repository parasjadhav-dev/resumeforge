import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClassicTemplate } from "@/components/templates/classic";
import { createEmptyResume, resumeContentSchema } from "@/shared/schema";

const render = (input: unknown) =>
  renderToStaticMarkup(<ClassicTemplate content={resumeContentSchema.parse(input)} />);

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

describe("ClassicTemplate", () => {
  it("shows a placeholder for an empty resume", () => {
    const html = renderToStaticMarkup(<ClassicTemplate content={createEmptyResume()} />);
    expect(html).toContain("preview appears here");
    expect(html).not.toContain("<h2");
  });

  it("renders standard section headings in a fixed order", () => {
    const html = render(full);
    const order = ["Summary", "Experience", "Education", "Projects", "Skills", "Certifications"];
    const positions = order.map((h) => html.indexOf(`>${h}</h2>`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("renders the right text for each part", () => {
    const html = render(full);
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
    const html = render({ contact: { fullName: "Asha Rao" }, experience: [full.experience[0]] });
    expect(html.match(/<li>/g)).toHaveLength(2);
    expect(html).toContain("Experience");
    expect(html).not.toContain("Education");
    expect(html).not.toContain("Skills");
    expect(html).not.toContain("Summary");
  });

  it("stays ATS-friendly: no tables, images, or icons", () => {
    const html = render(full);
    for (const tag of ["<table", "<img", "<svg", "<canvas"]) expect(html).not.toContain(tag);
  });

  it("escapes user text instead of injecting HTML", () => {
    const html = render({ summary: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
