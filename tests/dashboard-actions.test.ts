import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { resumeService } from "@/modules/resumes";

// The actions need a signed-in user and Next's request context; both are stood in for here.
const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/session", () => ({
  requireUser: async () => ({ id: session.userId }),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const { createResumeAction, deleteResumeAction, duplicateResumeAction, renameResumeAction } =
  await import("@/app/dashboard/actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

// Integration tests against the real database; skipped without DATABASE_URL (e.g. CI).
describe.skipIf(!process.env.DATABASE_URL)("dashboard actions", () => {
  const stamp = Date.now();
  let owner: string;
  let stranger: string;

  beforeAll(async () => {
    owner = (await db.user.create({ data: { email: `act-owner-${stamp}@example.com` } })).id;
    stranger = (await db.user.create({ data: { email: `act-stranger-${stamp}@example.com` } })).id;
  });
  beforeEach(() => {
    session.userId = owner;
  });
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
    await db.$disconnect();
  });

  it("rename confirms with the new title", async () => {
    const r = await resumeService.create(owner, { title: "Old" });
    const result = await renameResumeAction({}, form({ id: r.id, title: "  New name  " }));
    expect(result).toEqual({ message: 'Renamed to "New name".' });
    expect((await resumeService.get(owner, r.id)).title).toBe("New name");
  });

  it("rename reports an empty title as an error and changes nothing", async () => {
    const r = await resumeService.create(owner, { title: "Keep me" });
    const result = await renameResumeAction({}, form({ id: r.id, title: "   " }));
    expect(result.error).toBeTruthy();
    expect(result.message).toBeUndefined();
    expect((await resumeService.get(owner, r.id)).title).toBe("Keep me");
  });

  it("duplicate confirms with the copy's title", async () => {
    const r = await resumeService.create(owner, { title: "Original" });
    const result = await duplicateResumeAction({}, form({ id: r.id }));
    expect(result).toEqual({ message: 'Created "Original (copy)".' });
  });

  it("delete removes the resume and confirms with its title", async () => {
    const r = await resumeService.create(owner, { title: "Doomed" });
    const result = await deleteResumeAction({}, form({ id: r.id }));
    expect(result).toEqual({ message: 'Deleted "Doomed".' });
    await expect(resumeService.get(owner, r.id)).rejects.toThrow(/not found/i);
  });

  it("delete never reveals or removes another user's resume", async () => {
    const theirs = await resumeService.create(stranger, { title: "Private title" });
    const result = await deleteResumeAction({}, form({ id: theirs.id }));

    expect(result.error).toMatch(/not found/i);
    expect(result.message).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("Private title"); // not even its name leaks
    expect((await resumeService.get(stranger, theirs.id)).title).toBe("Private title"); // still there
  });

  it("rename and duplicate also refuse another user's resume", async () => {
    const theirs = await resumeService.create(stranger, { title: "Theirs" });
    expect(
      (await renameResumeAction({}, form({ id: theirs.id, title: "Mine now" }))).error,
    ).toMatch(/not found/i);
    expect((await duplicateResumeAction({}, form({ id: theirs.id }))).error).toMatch(/not found/i);
    expect((await resumeService.get(stranger, theirs.id)).title).toBe("Theirs");
  });

  it("deleting something that is already gone is a clear error, not a crash", async () => {
    const result = await deleteResumeAction({}, form({ id: "does-not-exist" }));
    expect(result.error).toMatch(/not found/i);
  });

  it("create opens the new resume in the editor", async () => {
    await expect(createResumeAction({}, form({ title: "Fresh start" }))).rejects.toThrow(
      /^REDIRECT:\/resumes\/[\w-]+\/edit$/,
    );
    const titles = (await resumeService.list(owner)).map((r) => r.title);
    expect(titles).toContain("Fresh start");
  });
});
