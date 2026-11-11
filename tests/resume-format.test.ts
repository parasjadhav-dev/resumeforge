import { describe, expect, it } from "vitest";
import {
  breakLongWordsDeep,
  cleanBullets,
  contactItems,
  formatDateRange,
  isResumeEmpty,
  skillLine,
  softBreakLongWords,
  visibleExperience,
} from "@/shared/resume-format";
import {
  createEmptyResume,
  newExperience,
  newSkillGroup,
  resumeContentSchema,
} from "@/shared/schema";

describe("formatDateRange", () => {
  it("joins start and end with an en dash", () => {
    expect(formatDateRange("Jun 2024", "Aug 2024")).toBe("Jun 2024 – Aug 2024");
  });

  it("uses Present for current roles and ignores the stored end date", () => {
    expect(formatDateRange("Jun 2024", "Aug 2024", true)).toBe("Jun 2024 – Present");
  });

  it("handles one-sided and empty ranges", () => {
    expect(formatDateRange("2021", "")).toBe("2021");
    expect(formatDateRange("", "2025")).toBe("2025");
    expect(formatDateRange("", "")).toBe("");
    expect(formatDateRange("  ", "  ")).toBe("");
  });
});

describe("contactItems", () => {
  it("keeps display order and skips empty values", () => {
    const { contact } = resumeContentSchema.parse({
      contact: { email: "a@b.co", location: "Pune", github: "github.com/a" },
    });
    expect(contactItems(contact)).toEqual(["a@b.co", "Pune", "github.com/a"]);
  });
});

describe("skillLine", () => {
  it("prefixes the category when present", () => {
    expect(skillLine({ ...newSkillGroup(), category: "Languages", items: ["TS", " Go "] })).toBe(
      "Languages: TS, Go",
    );
  });

  it("works without a category or without items", () => {
    expect(skillLine({ ...newSkillGroup(), items: ["TS"] })).toBe("TS");
    expect(skillLine({ ...newSkillGroup(), category: "Tools" })).toBe("Tools");
    expect(skillLine(newSkillGroup())).toBe("");
  });
});

describe("cleanBullets and visibility", () => {
  it("drops blank bullets and trims", () => {
    expect(cleanBullets(["  a ", "", "   ", "b"])).toEqual(["a", "b"]);
  });

  it("hides untouched blank entries", () => {
    const filled = { ...newExperience(), company: "Acme" };
    expect(visibleExperience([newExperience(), filled])).toEqual([filled]);
    expect(visibleExperience([{ ...newExperience(), bullets: ["   "] }])).toEqual([]);
  });
});

describe("isResumeEmpty", () => {
  it("is true for a new resume and false once anything is filled in", () => {
    const empty = createEmptyResume();
    expect(isResumeEmpty(empty)).toBe(true);
    expect(isResumeEmpty({ ...empty, summary: "Hi" })).toBe(false);
    expect(isResumeEmpty({ ...empty, experience: [newExperience()] })).toBe(true);
    expect(isResumeEmpty({ ...empty, contact: { ...empty.contact, fullName: "Asha" } })).toBe(
      false,
    );
  });
});

describe("softBreakLongWords", () => {
  it("leaves normal text and short words untouched", () => {
    expect(softBreakLongWords("Built a REST API at https://example.com/docs")).toBe(
      "Built a REST API at https://example.com/docs",
    );
    expect(softBreakLongWords("")).toBe("");
  });

  it("breaks over-long words, keeps every character, and respects the limit", () => {
    const url = `github.com/${"organisation-name/".repeat(8)}project`;
    const broken = softBreakLongWords(url, 60);
    expect(broken).toContain("\n");
    expect(broken.replace(/\n/g, "")).toBe(url);
    for (const line of broken.split("\n")) expect(line.length).toBeLessThanOrEqual(60);
  });

  it("breaks after a natural separator when one is near the limit", () => {
    const broken = softBreakLongWords(`${"a".repeat(40)}/${"b".repeat(80)}`, 60);
    expect(broken.split("\n")[0]).toBe(`${"a".repeat(40)}/`);
  });

  it("hard-breaks a word with no separators", () => {
    const broken = softBreakLongWords("x".repeat(150), 60);
    expect(broken.split("\n").map((l) => l.length)).toEqual([60, 60, 30]);
  });

  it("only touches the long word, not the text around it", () => {
    const word = "y".repeat(100);
    expect(softBreakLongWords(`see ${word} now`, 60)).toBe(
      `see ${"y".repeat(60)}\n${"y".repeat(40)} now`,
    );
  });
});

describe("breakLongWordsDeep", () => {
  it("breaks strings anywhere in a structure but never touches ids", () => {
    const long = "z".repeat(130);
    const id = "q".repeat(130);
    const out = breakLongWordsDeep({ id, a: [long, { b: long }], n: 5, ok: true });
    expect(out.id).toBe(id);
    expect(out.a[0]).toContain("\n");
    expect((out.a[1] as { b: string }).b).toContain("\n");
    expect(out.n).toBe(5);
    expect(out.ok).toBe(true);
  });
});
