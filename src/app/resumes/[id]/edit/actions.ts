"use server";

import { ZodError } from "zod";
import { requireUser } from "@/lib/session";
import { NotFoundError, resumeService } from "@/modules/resumes";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Saves editor content. The content comes from the browser, so the service re-validates it. */
export async function saveResumeAction(id: string, content: unknown): Promise<SaveResult> {
  const user = await requireUser();
  try {
    await resumeService.update(user.id, id, { content: content as object });
    return { ok: true };
  } catch (err) {
    if (err instanceof NotFoundError) return { ok: false, error: "This resume no longer exists." };
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      const where = issue?.path.join(".");
      return {
        ok: false,
        error: `Invalid content${where ? ` (${where})` : ""}: ${issue?.message}`,
      };
    }
    throw err;
  }
}
