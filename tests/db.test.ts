import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createEmptyResume, resumeContentSchema } from "@/shared/schema";

// Integration test against the real database; skipped when DATABASE_URL is absent (e.g. CI).
describe.skipIf(!process.env.DATABASE_URL)("database", () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it("round-trips a resume through Postgres JSON", async () => {
    const user = await db.user.create({ data: { email: `test-${Date.now()}@example.com` } });
    try {
      const content = resumeContentSchema.parse({
        contact: { fullName: "Asha Rao" },
        experience: [{ company: "Acme", bullets: ["Built an API"] }],
      });
      const created = await db.resume.create({
        data: { userId: user.id, title: "Test", content },
      });
      const found = await db.resume.findUniqueOrThrow({ where: { id: created.id } });
      expect(resumeContentSchema.parse(found.content)).toEqual(content);
      expect(found.templateId).toBe("classic");
      expect(createEmptyResume().experience).toEqual([]);
    } finally {
      await db.user.delete({ where: { id: user.id } }); // cascades to resumes
    }
  });
});
