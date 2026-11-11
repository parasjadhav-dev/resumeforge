import { describe, expect, it } from "vitest";
import {
  cleanBullets,
  contactItems,
  formatDateRange,
  isResumeEmpty,
  skillLine,
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
