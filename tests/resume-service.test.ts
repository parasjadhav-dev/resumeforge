import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { db } from "@/lib/db";
import {
  LimitReachedError,
  MAX_RESUMES_PER_USER,
  NotFoundError,
  resumeService as svc,
} from "@/modules/resumes";

// Integration tests against the real database; skipped without DATABASE_URL (e.g. CI).
describe.skipIf(!process.env.DATABASE_URL)("resumeService", () => {
  const stamp = Date.now();
  let a: string;
  let b: string;

  beforeAll(async () => {
    a = (await db.user.create({ data: { email: `a-${stamp}@example.com` } })).id;
    b = (await db.user.create({ data: { email: `b-${stamp}@example.com` } })).id;
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [a, b] } } }); // cascades to resumes
    await db.$disconnect();
  });

  it("creates with defaults and lists newest-updated first", async () => {
    const first = await svc.create(a);
    expect(first.title).toBe("Untitled resume");
    expect(first.templateId).toBe("classic");
    expect(first.content.experience).toEqual([]);

    const second = await svc.create(a, { title: "  Backend  " });
    expect(second.title).toBe("Backend");

    await svc.rename(a, first.id, "Renamed"); // bumps updatedAt
    const list = await svc.list(a);
    expect(list.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(list[0]).not.toHaveProperty("content");
  });

  it("updates content and rejects invalid input", async () => {
    const r = await svc.create(a, { title: "Edit me" });
    const updated = await svc.update(a, r.id, {
      content: { ...r.content, summary: "Hello" },
      templateId: "modern",
    });
    expect(updated.content.summary).toBe("Hello");
    expect(updated.templateId).toBe("modern");

    await expect(svc.update(a, r.id, {})).rejects.toBeInstanceOf(ZodError);
    await expect(svc.rename(a, r.id, "   ")).rejects.toBeInstanceOf(ZodError);
    await expect(svc.update(a, r.id, { templateId: "nope" as "classic" })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("duplicates a resume as an independent copy", async () => {
    const r = await svc.create(a, { title: "Original" });
    await svc.update(a, r.id, { content: { ...r.content, summary: "Keep me" } });

    const copy = await svc.duplicate(a, r.id);
    expect(copy.id).not.toBe(r.id);
    expect(copy.title).toBe("Original (copy)");
    expect(copy.content.summary).toBe("Keep me");

    await svc.rename(a, copy.id, "Changed");
    expect((await svc.get(a, r.id)).title).toBe("Original");
  });

  it("deletes a resume", async () => {
    const r = await svc.create(a, { title: "Delete me" });
    await svc.remove(a, r.id);
    await expect(svc.get(a, r.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.remove(a, r.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("never exposes one user's resume to another", async () => {
    const r = await svc.create(a, { title: "Private" });

    await expect(svc.get(b, r.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.update(b, r.id, { title: "Hacked" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.rename(b, r.id, "Hacked")).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.duplicate(b, r.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.remove(b, r.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await svc.list(b)).toEqual([]);

    expect((await svc.get(a, r.id)).title).toBe("Private"); // untouched
  });

  it("enforces the per-user resume limit", async () => {
    const existing = (await svc.list(b)).length;
    await db.resume.createMany({
      data: Array.from({ length: MAX_RESUMES_PER_USER - existing }, (_, i) => ({
        userId: b,
        title: `Seed ${i}`,
        content: {},
      })),
    });
    await expect(svc.create(b)).rejects.toBeInstanceOf(LimitReachedError);
    const [any] = await svc.list(b);
    await expect(svc.duplicate(b, any.id)).rejects.toBeInstanceOf(LimitReachedError);
  });
});
