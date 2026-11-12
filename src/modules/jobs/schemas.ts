import { z } from "zod";

// What the user submits is defined in shared/ (the form validates with the same rules).
export { analyzeJobInput, MAX_JOB_CHARS, MIN_JOB_CHARS } from "@/shared/job-input";
export type { AnalyzeJobInput } from "@/shared/job-input";

export const SENIORITY_LEVELS = [
  "intern",
  "entry",
  "mid",
  "senior",
  "lead",
  "unspecified",
] as const;
export const EDUCATION_LEVELS = ["none", "bachelor", "master", "doctorate", "unspecified"] as const;

/**
 * What a job posting asks for, as the model must return it. Every field is always present
 * (empty string, empty list, "unspecified", or 0 when the posting says nothing).
 */
export const jobAnalysisSchema = z.object({
  /** The role title as written in the posting. */
  title: z.string(),
  company: z.string(),
  seniority: z.enum(SENIORITY_LEVELS),
  /** Lowest education the posting asks for. */
  educationRequired: z.enum(EDUCATION_LEVELS),
  /** Years of experience the posting asks for as a minimum; 0 when it does not say. */
  minYearsExperience: z.number(),
  /** Skills, tools, and technologies the posting says are required. */
  requiredSkills: z.array(z.string()),
  /** Skills the posting calls preferred, a plus, or nice to have. */
  preferredSkills: z.array(z.string()),
  /** Other terms an applicant tracking system may look for: methods, domains, certifications. */
  keywords: z.array(z.string()),
  /** What the person in the role will do, as short phrases. */
  responsibilities: z.array(z.string()),
});

export type JobAnalysis = z.infer<typeof jobAnalysisSchema>;
