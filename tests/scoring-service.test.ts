import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { scoringService } from "@/modules/scoring";
import type { JobRequirements } from "@/modules/scoring";
import { NotFoundError, resumeService } from "@/modules/resumes";

// Integration tests against the real database; skipped without DATABASE_URL (e.g. CI).
describe.skipIf(!process.env.DATABASE_URL)("scoringService", () => {
  const stamp = Date.now();
  let owner: string;
  let stranger: string;
  let resumeId: string;

  const job: JobRequirements = {
    seniority: "unspecified",
    educationRequired: "unspecified",
    minYearsExperience: 0,
    requiredSkills: ["Python", "Docker"],
    preferredSkills: [],
    keywords: [],
    responsibilities: [],
  };

  beforeAll(async () => {
    owner = (await db.user.create({ data: { email: `score-a-${stamp}@example.com` } })).id;
    stranger = (await db.user.create({ data: { email: `score-b-${stamp}@example.com` } })).id;
    const created = await resumeService.create(owner, {
      title: "Scored",
      content: {
        skills: [{ id: "s1", category: "Languages", items: ["Python"] }],
      },
    });
    resumeId = created.id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
    await db.$disconnect();
  });

  it("scores the owner's saved resume", async () => {
    const result = await scoringService.score(owner, resumeId, job);
    expect(result.score).toBe(50);
    expect(result.matched.required).toEqual(["Python"]);
    expect(result.missing.required).toEqual(["Docker"]);
  });

  it("reads the saved content, so an edit changes the score", async () => {
    await resumeService.update(owner, resumeId, {
      content: { skills: [{ id: "s1", category: "Tools", items: ["Python", "Docker"] }] },
    });
    expect((await scoringService.score(owner, resumeId, job)).score).toBe(100);
  });

  it("will not score someone else's resume, and does not say it exists", async () => {
    await expect(scoringService.score(stranger, resumeId, job)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(scoringService.score(owner, "no-such-id", job)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
