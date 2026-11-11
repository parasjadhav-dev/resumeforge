"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUser, UnauthorizedError } from "@/lib/session";
import { LimitReachedError, NotFoundError, resumeService } from "@/modules/resumes";

export type ActionState = { error?: string };

/** Auth + error mapping shared by every dashboard action. */
async function run(fn: (userId: string) => Promise<void>): Promise<ActionState> {
  try {
    const user = await requireUser();
    await fn(user.id);
    revalidatePath("/dashboard");
    return {};
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
    await resumeService.rename(userId, text(formData, "id"), text(formData, "title"));
  });
}

export async function duplicateResumeAction(_: ActionState, formData: FormData) {
  return run(async (userId) => {
    await resumeService.duplicate(userId, text(formData, "id"));
  });
}

export async function deleteResumeAction(_: ActionState, formData: FormData) {
  return run(async (userId) => {
    await resumeService.remove(userId, text(formData, "id"));
  });
}
