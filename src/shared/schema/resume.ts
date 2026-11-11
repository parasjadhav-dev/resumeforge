import { z } from "zod";

/**
 * Single source of truth for resume content.
 * Used by the editor forms, DB validation, LLM output validation, and PDF templates.
 *
 * Conventions:
 * - Every field has a default, so partial data (e.g. from the LLM parser) still validates.
 * - Dates are free-form strings (e.g. "Jun 2024", "2024-06"); "Present" is represented by `current`.
 * - List items carry a stable `id` so reordering and tailoring diffs can address them.
 */

const shortText = z.string().trim().max(200).default("");
const longText = z.string().trim().max(2000).default("");
const bullet = z.string().trim().max(500);
const bullets = z.array(bullet).max(15).default([]);
const id = z
  .string()
  .min(1)
  .default(() => crypto.randomUUID());

const optionalEmail = z.union([z.literal(""), z.email().max(200)]).default("");
const optionalUrl = z.string().trim().max(300).default("");

export const contactSchema = z.object({
  fullName: shortText,
  email: optionalEmail,
  phone: shortText,
  location: shortText,
  linkedin: optionalUrl,
  github: optionalUrl,
  website: optionalUrl,
});

export const experienceSchema = z.object({
  id,
  company: shortText,
  title: shortText,
  location: shortText,
  startDate: shortText,
  endDate: shortText,
  current: z.boolean().default(false),
  bullets,
});

export const educationSchema = z.object({
  id,
  institution: shortText,
  degree: shortText,
  field: shortText,
  location: shortText,
  startDate: shortText,
  endDate: shortText,
  gpa: shortText,
  details: bullets,
});

export const projectSchema = z.object({
  id,
  name: shortText,
  link: optionalUrl,
  technologies: z.array(z.string().trim().max(60)).max(30).default([]),
  bullets,
});

export const skillGroupSchema = z.object({
  id,
  category: shortText,
  items: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
});

export const certificationSchema = z.object({
  id,
  name: shortText,
  issuer: shortText,
  date: shortText,
});

export const resumeContentSchema = z.object({
  contact: contactSchema.default(() => contactSchema.parse({})),
  summary: longText,
  experience: z.array(experienceSchema).max(20).default([]),
  education: z.array(educationSchema).max(10).default([]),
  projects: z.array(projectSchema).max(20).default([]),
  skills: z.array(skillGroupSchema).max(15).default([]),
  certifications: z.array(certificationSchema).max(20).default([]),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;
export type Certification = z.infer<typeof certificationSchema>;

/** Section keys that hold lists, used by the editor and diff view. */
export const LIST_SECTIONS = [
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
] as const;
export type ListSection = (typeof LIST_SECTIONS)[number];

/** A valid, empty resume. */
export function createEmptyResume(): ResumeContent {
  return resumeContentSchema.parse({});
}

/** Fresh blank items for the editor's "Add" buttons. */
export const newExperience = (): Experience => experienceSchema.parse({});
export const newEducation = (): Education => educationSchema.parse({});
export const newProject = (): Project => projectSchema.parse({});
export const newSkillGroup = (): SkillGroup => skillGroupSchema.parse({});
export const newCertification = (): Certification => certificationSchema.parse({});

/** Available templates; `classic` is the default. */
export const TEMPLATE_IDS = ["classic", "modern"] as const;
export const templateIdSchema = z.enum(TEMPLATE_IDS);
export type TemplateId = z.infer<typeof templateIdSchema>;
