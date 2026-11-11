import { z } from "zod";
import { resumeContentSchema, templateIdSchema } from "@/shared/schema";

export const MAX_RESUMES_PER_USER = 20;

const title = z.string().trim().min(1, "Title is required").max(100);

export const createResumeInput = z.object({
  title: title.default("Untitled resume"),
  content: resumeContentSchema.optional(),
});

export const updateResumeInput = z
  .object({
    title: title.optional(),
    templateId: templateIdSchema.optional(),
    content: resumeContentSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update",
  });

export const renameResumeInput = z.object({ title });

export type CreateResumeInput = z.input<typeof createResumeInput>;
export type UpdateResumeInput = z.input<typeof updateResumeInput>;
