"use server";

import { ZodError } from "zod";
import { requireUser } from "@/lib/session";
import { NotFoundError, resumeService } from "@/modules/resumes";
import type { TemplateId } from "@/shared/schema";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Saves editor state. It comes from the browser, so the service re-validates everything. */
export async function saveResumeAction(
  id: string,
  payload: { content: unknown; templateId: unknown },
): Promise<SaveResult> {
  const user = await requireUser();
  try {
    await resumeService.update(user.id, id, {
      content: payload.content as object,
      templateId: payload.templateId as TemplateId, // checked at runtime by the service
    });
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
