import { z } from "zod";

/** Rules for the job description a user submits. Shared by the form and the server. */
export const MIN_JOB_CHARS = 100;
export const MAX_JOB_CHARS = 20_000;

export const analyzeJobInput = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(MIN_JOB_CHARS, `Paste the full job description (at least ${MIN_JOB_CHARS} characters).`)
    .max(
      MAX_JOB_CHARS,
      `That is too long. The limit is ${MAX_JOB_CHARS.toLocaleString("en-US")} characters.`,
    ),
  jobTitle: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
});

export type AnalyzeJobInput = z.input<typeof analyzeJobInput>;
