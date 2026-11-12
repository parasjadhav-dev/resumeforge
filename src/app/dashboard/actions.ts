"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { LimitReachedError, NotFoundError, resumeService } from "@/modules/resumes";

/** `error` explains a failure; `message` is a short confirmation of success (shown as a toast). */
export type ActionState = { error?: string; message?: string };

/** Auth + error mapping shared by every dashboard action. The action may return a success message. */
async function run(fn: (userId: string) => Promise<string | void>): Promise<ActionState> {
  try {
    const user = await requireUser();
    const message = await fn(user.id);
    revalidatePath("/dashboard");
    return message ? { message } : {};
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");
    if (err instanceof NotFoundError || err instanceof LimitReachedError) {
      return { error: err.message };
    }
    if (err instanceof ZodError) return { error: err.issues[0]?.message ?? "Invalid input" };
    throw err;
  }
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function createResumeAction(_: ActionState, formData: FormData) {
  const title = text(formData, "title").trim();
  let newId: string | undefined;
  const result = await run(async (userId) => {
    newId = (await resumeService.create(userId, title ? { title } : {})).id;
  });
  if (newId) redirect(`/resumes/${newId}/edit`); // redirect throws, so it stays outside run()'s try
  return result;
}

export async function renameResumeAction(_: ActionState, formData: FormData) {
  return run(async (userId) => {
    const renamed = await resumeService.rename(
      userId,
      text(formData, "id"),
      text(formData, "title"),
    );
    return `Renamed to "${renamed.title}".`;
  });
}

export async function duplicateResumeAction(_: ActionState, formData: FormData) {
  return run(async (userId) => {
    const copy = await resumeService.duplicate(userId, text(formData, "id"));
    return `Created "${copy.title}".`;
  });
}

export async function deleteResumeAction(_: ActionState, formData: FormData) {
  return run(async (userId) => {
    const id = text(formData, "id");
    const { title } = await resumeService.get(userId, id); // for the confirmation message
    await resumeService.remove(userId, id);
    return `Deleted "${title}".`;
  });
}
