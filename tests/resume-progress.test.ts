import { describe, expect, it } from "vitest";
import { computeProgress, EDITOR_SECTIONS, sectionMeta } from "@/shared/resume-progress";
import { createEmptyResume, resumeContentSchema } from "@/shared/schema";

const full = resumeContentSchema.parse({
  contact: { fullName: "Asha Rao", email: "asha@example.com" },
  summary: "Final-year student.",
  experience: [{ title: "Intern", company: "Acme", bullets: ["Built an API"] }],
  education: [{ institution: "PICT", degree: "B.E." }],
  skills: [{ category: "Languages", items: ["TypeScript", "Python"] }],
});

describe("EDITOR_SECTIONS", () => {
  it("lists every section once, in page order", () => {
    expect(EDITOR_SECTIONS.map((s) => s.key)).toEqual([
      "template",
      "contact",
      "summary",
      "experience",
      "education",
      "projects",
      "skills",
      "certifications",
    ]);
  });
});

describe("sectionMeta", () => {
  it("marks an empty resume as not started, except the template", () => {
    const meta = sectionMeta(createEmptyResume(), "Classic");
    expect(meta.template).toEqual({ done: true, summary: "Classic" });
    for (const key of ["contact", "summary"] as const) {
      expect(meta[key]).toEqual({ done: false, summary: "Not started" });
    }
    for (const key of [
      "experience",
      "education",
      "projects",
      "skills",
      "certifications",
    ] as const) {
      expect(meta[key]).toEqual({ done: false, summary: "None yet" });
    }
  });

  it("describes a filled-in resume", () => {
    const meta = sectionMeta(full, "Modern");
    expect(meta.contact).toEqual({ done: true, summary: "Asha Rao · asha@example.com" });
    expect(meta.summary).toEqual({ done: true, summary: "Final-year student." });
    expect(meta.experience).toEqual({ done: true, summary: "1 entry" });
    expect(meta.education).toEqual({ done: true, summary: "1 entry" });
    expect(meta.skills).toEqual({ done: true, summary: "1 group, 2 skills" });
  });

  it("needs both a name and an email for contact to be done", () => {
    const nameOnly = resumeContentSchema.parse({ contact: { fullName: "Asha" } });
    expect(sectionMeta(nameOnly, "").contact).toEqual({ done: false, summary: "Asha" });
    const emailOnly = resumeContentSchema.parse({ contact: { email: "a@b.co" } });
    expect(sectionMeta(emailOnly, "").contact.done).toBe(false);
  });

  it("pluralises counts correctly", () => {
    const many = resumeContentSchema.parse({
      experience: [{ company: "A" }, { company: "B" }, { company: "C" }],
      projects: [{ name: "P1" }, { name: "P2" }],
      certifications: [{ name: "C1" }],
    });
    const meta = sectionMeta(many, "");
    expect(meta.experience.summary).toBe("3 entries");
    expect(meta.projects.summary).toBe("2 projects");
    expect(meta.certifications.summary).toBe("1 certification");
  });

  it("ignores blank, untouched entries", () => {
    const blanks = resumeContentSchema.parse({
      experience: [{}, {}],
      education: [{}],
      skills: [{ category: "Languages", items: [] }],
    });
    const meta = sectionMeta(blanks, "");
    expect(meta.experience).toEqual({ done: false, summary: "None yet" });
    expect(meta.education.done).toBe(false);
    expect(meta.skills.done).toBe(false);
  });

  it("shortens a long summary to one line", () => {
    const long = resumeContentSchema.parse({ summary: `${"word ".repeat(60)}\nsecond line` });
    const line = sectionMeta(long, "").summary.summary;
    expect(line.length).toBeLessThanOrEqual(70);
    expect(line.endsWith("…")).toBe(true);
    expect(line).not.toContain("\n");
  });
});

describe("computeProgress", () => {
  it("is 0% for an empty resume and 100% for a complete one", () => {
    const empty = computeProgress(createEmptyResume());
    expect(empty).toMatchObject({ done: 0, total: 5, percent: 0 });
    expect(computeProgress(full)).toMatchObject({ done: 5, total: 5, percent: 100 });
  });

  it("counts projects as work history, so students with no jobs can finish", () => {
    const student = resumeContentSchema.parse({
      contact: { fullName: "Rohan", email: "r@example.com" },
      summary: "Student.",
      projects: [{ name: "Campus app" }],
      education: [{ institution: "MU" }],
      skills: [{ category: "Skills", items: ["Python"] }],
    });
    const progress = computeProgress(student);
    expect(progress.percent).toBe(100);
    expect(progress.requirements.find((r) => r.key === "work")?.done).toBe(true);
  });

  it("does not require certifications", () => {
    expect(computeProgress(full).requirements.map((r) => r.key)).not.toContain("certifications");
  });

  it("reports partial progress with the right items outstanding", () => {
    const partial = resumeContentSchema.parse({
      contact: { fullName: "Asha", email: "a@b.co" },
      summary: "Hello",
    });
    const progress = computeProgress(partial);
    expect(progress).toMatchObject({ done: 2, total: 5, percent: 40 });
    expect(progress.requirements.filter((r) => !r.done).map((r) => r.key)).toEqual([
      "work",
      "education",
      "skills",
    ]);
  });
});
