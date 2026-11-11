import { describe, expect, it } from "vitest";
import {
  createEmptyResume,
  newExperience,
  resumeContentSchema,
  type ResumeContent,
} from "@/shared/schema";

describe("resume schema", () => {
  it("creates a valid empty resume", () => {
    const empty = createEmptyResume();
    expect(resumeContentSchema.safeParse(empty).success).toBe(true);
    expect(empty.experience).toEqual([]);
    expect(empty.contact.fullName).toBe("");
    expect(empty.summary).toBe("");
  });

  it("fills defaults for partial input", () => {
    const parsed = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao" },
      experience: [{ company: "Acme" }],
    });
    expect(parsed.contact.email).toBe("");
    expect(parsed.experience[0].bullets).toEqual([]);
    expect(parsed.experience[0].current).toBe(false);
    expect(parsed.experience[0].id).toBeTruthy();
  });

  it("generates unique ids for new items", () => {
    expect(newExperience().id).not.toBe(newExperience().id);
  });

  it("round-trips through JSON unchanged", () => {
    const resume: ResumeContent = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao", email: "asha@example.com" },
      summary: "Final-year CS student.",
      experience: [{ company: "Acme", title: "Intern", bullets: ["Built an API"] }],
      skills: [{ category: "Languages", items: ["TypeScript", "Python"] }],
    });
    const again = resumeContentSchema.parse(JSON.parse(JSON.stringify(resume)));
    expect(again).toEqual(resume);
  });

  it("trims whitespace", () => {
    const parsed = resumeContentSchema.parse({ contact: { fullName: "  Asha  " } });
    expect(parsed.contact.fullName).toBe("Asha");
  });

  it("accepts an empty email but rejects an invalid one", () => {
    expect(resumeContentSchema.safeParse({ contact: { email: "" } }).success).toBe(true);
    expect(resumeContentSchema.safeParse({ contact: { email: "not-an-email" } }).success).toBe(
      false,
    );
  });

  it("rejects oversized fields and wrong types", () => {
    expect(resumeContentSchema.safeParse({ summary: "x".repeat(2001) }).success).toBe(false);
    expect(resumeContentSchema.safeParse({ experience: "nope" }).success).toBe(false);
    expect(
      resumeContentSchema.safeParse({ experience: [{ bullets: ["x".repeat(501)] }] }).success,
    ).toBe(false);
  });
});
