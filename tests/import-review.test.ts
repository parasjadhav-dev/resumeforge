import { describe, expect, it, vi } from "vitest";
import type { LlmClient } from "@/lib/llm";
import {
  groundParsedResume,
  parseResumeText,
  parsedResumeSchema,
  toImportReview,
  toResumeContent,
  type ParsedResume,
} from "@/modules/import/parse";
import { countReviewItems, importSessionSchema } from "@/shared/import-review";

const SOURCE = `Asha Rao
asha@example.com | Pune, India
SUMMARY
Final-year computer engineering student who builds full-stack web applications.
EXPERIENCE
Software Engineering Intern, Acme Corp  Jun 2024 - Aug 2024
Built a REST API in Node.js that reduced report generation time by 40%.
Wrote integration tests that raised coverage from 55% to 82%.
Web Developer, Campus Club  2023
Maintained the club website used by 800+ students.
EDUCATION
Pune Institute of Computer Technology 2021 - 2025
B.E., Computer Engineering
SKILLS
Languages: TypeScript, Python, SQL`;

const entry = {
  title: "Software Engineering Intern",
  company: "Acme Corp",
  location: "",
  startDate: "Jun 2024",
  endDate: "Aug 2024",
  current: false,
  bullets: ["Built a REST API in Node.js that reduced report generation time by 40%."],
};

const base = (): ParsedResume =>
  parsedResumeSchema.parse({
    contact: {
      fullName: "Asha Rao",
      email: "asha@example.com",
      phone: "",
      location: "Pune, India",
      linkedin: "",
      github: "",
      website: "",
    },
    summary: "Final-year computer engineering student who builds full-stack web applications.",
    experience: [entry],
    education: [
      {
        institution: "Pune Institute of Computer Technology",
        degree: "B.E.",
        field: "Computer Engineering",
        location: "",
        startDate: "2021",
        endDate: "2025",
        gpa: "",
        details: [],
      },
    ],
    projects: [],
    skills: [{ category: "Languages", items: ["TypeScript", "Python", "SQL"] }],
    certifications: [],
  });

describe("review flags", () => {
  it("flags nothing when the model was faithful and complete", () => {
    const { flags } = groundParsedResume(base(), SOURCE);
    expect(flags.contact).toEqual([]);
    expect(flags.summary).toEqual([]);
    expect(flags.experience).toEqual([[]]);
    expect(flags.education).toEqual([[]]);
    expect(flags.skills).toEqual([[]]);
  });

  it("explains what is missing from an entry", () => {
    const p = base();
    p.experience = [
      {
        ...entry,
        title: "",
        company: "",
        startDate: "",
        endDate: "",
        bullets: ["Built a REST API in Node.js that reduced report generation time by 40%."],
      },
    ];
    const { flags } = groundParsedResume(p, SOURCE);
    expect(flags.experience[0]).toEqual([
      "No job title was found.",
      "No company was found.",
      "No dates were found.",
    ]);
  });

  it("does not complain about dates for a role that is still current", () => {
    const p = base();
    p.experience = [{ ...entry, startDate: "", endDate: "", current: true }];
    expect(groundParsedResume(p, SOURCE).flags.experience[0]).not.toContain("No dates were found.");
  });

  it("notes when something was removed because the file does not contain it", () => {
    const p = base();
    p.experience[0].company = "Globex International";
    const { flags, dropped } = groundParsedResume(p, SOURCE);
    expect(dropped).toContain("experience[0].company");
    expect(flags.experience[0]).toContain(
      "Something here was not found in your file, so it was left out.",
    );
    expect(flags.experience[0]).toContain("No company was found.");
  });

  it("notes wording that differs a little from the file, without removing it", () => {
    const p = base();
    // 8 of 9 words are in the file: kept (>= 70%), but worth a look.
    p.experience[0].bullets = [
      "Built a REST API in Node.js that reduced report generation time quickly.",
    ];
    const { parsed, flags, dropped } = groundParsedResume(p, SOURCE);
    expect(dropped).toEqual([]);
    expect(parsed.experience[0].bullets).toHaveLength(1);
    expect(flags.experience[0]).toEqual(["The wording differs a little from your file."]);
  });

  it("flags missing contact basics and a reworded summary", () => {
    const p = base();
    p.contact.fullName = "";
    p.contact.email = "";
    p.summary =
      "Final-year computer engineering student who builds full-stack web applications for startups.";
    const { flags } = groundParsedResume(p, SOURCE);
    expect(flags.contact).toEqual(["No name was found.", "No email was found."]);
    expect(flags.summary).toEqual(["The wording differs a little from your file."]);
  });

  it("flags an education entry with no school or degree", () => {
    const p = base();
    p.education = [{ ...p.education[0], institution: "", degree: "", field: "" }];
    p.education[0].details = ["B.E., Computer Engineering"];
    const { flags } = groundParsedResume(p, SOURCE);
    expect(flags.education[0]).toEqual(["No school was found.", "No degree was found."]);
  });

  it("keeps flags aligned with entries after blank entries are filtered out", () => {
    const p = base();
    const blank = { ...entry, title: "", company: "", startDate: "", endDate: "", bullets: [] };
    const second = {
      ...entry,
      title: "Web Developer",
      company: "Campus Club",
      startDate: "",
      endDate: "2023",
      bullets: ["Maintained the club website used by 800+ students."],
    };
    p.experience = [blank, entry, blank, { ...second, endDate: "" }];

    const { parsed, flags } = groundParsedResume(p, SOURCE);
    expect(parsed.experience.map((e) => e.company)).toEqual(["Acme Corp", "Campus Club"]);
    expect(flags.experience).toHaveLength(2);
    expect(flags.experience[0]).toEqual([]); // the intern role is fine
    expect(flags.experience[1]).toEqual(["No dates were found."]); // the flag stayed with Campus Club
  });

  it("caps the number of reasons shown per entry", () => {
    const p = base();
    p.experience = [{ ...entry, title: "", company: "", startDate: "", endDate: "", bullets: [] }];
    p.experience[0].bullets = ["Wrote integration tests that raised coverage from 55% to 82%."];
    const { flags } = groundParsedResume(p, SOURCE);
    expect(flags.experience[0].length).toBeLessThanOrEqual(3);
  });
});

describe("toImportReview", () => {
  it("keys reasons by entry id, so they follow the entry if it moves", () => {
    const p = base();
    p.experience.push({
      ...entry,
      title: "Web Developer",
      company: "Campus Club",
      startDate: "",
      endDate: "2023",
      bullets: ["Maintained the club website used by 800+ students."],
    });
    p.experience[1].endDate = "";
    const grounded = groundParsedResume(p, SOURCE);
    const content = toResumeContent(grounded.parsed);
    const review = toImportReview(content, grounded.flags);

    expect(Object.keys(review.entries)).toEqual([content.experience[1].id]);
    expect(review.entries[content.experience[1].id]).toEqual(["No dates were found."]);
    expect(countReviewItems(review)).toBe(1);
  });

  it("ignores flags for entries that did not make it into the resume", () => {
    const content = toResumeContent(base());
    const review = toImportReview(content, {
      contact: [],
      summary: [],
      experience: [[], ["stale flag"]], // there is only one experience entry
      education: [],
      projects: [],
      skills: [],
      certifications: [],
    });
    expect(review.entries).toEqual({});
  });
});

describe("parseResumeText review", () => {
  const fakeLlm = (reply: unknown): LlmClient => ({
    generateJson: vi.fn(async ({ schema }) => schema.parse(reply)) as LlmClient["generateJson"],
  });

  it("returns review flags keyed by ids that exist in the resume", async () => {
    const p = base();
    p.experience[0].startDate = "";
    p.experience[0].endDate = "";
    const { content, review } = await parseResumeText(SOURCE, fakeLlm(p));
    const ids = Object.keys(review.entries);
    expect(ids).toEqual([content.experience[0].id]);
    expect(review.entries[ids[0]]).toEqual(["No dates were found."]);
  });

  it("produces a value the browser can store and read back", async () => {
    const { review } = await parseResumeText(SOURCE, fakeLlm(base()));
    const session = importSessionSchema.safeParse(
      JSON.parse(JSON.stringify({ review, sourceText: SOURCE })),
    );
    expect(session.success).toBe(true);
  });
});

describe("importSessionSchema", () => {
  it("rejects anything that is not the expected shape", () => {
    expect(importSessionSchema.safeParse({}).success).toBe(false);
    expect(
      importSessionSchema.safeParse({ review: { contact: "x" }, sourceText: "" }).success,
    ).toBe(false);
    expect(
      importSessionSchema.safeParse({
        review: { contact: [], summary: [], entries: { a: ["r"] } },
        sourceText: "t",
      }).success,
    ).toBe(true);
  });
});
