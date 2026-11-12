import {
  visibleCertifications,
  visibleEducation,
  visibleExperience,
  visibleProjects,
  visibleSkills,
} from "./resume-format";
import type { ResumeContent } from "./schema";

/** The sections of the editor, in page order. */
export const EDITOR_SECTIONS = [
  { key: "template", label: "Template" },
  { key: "contact", label: "Contact" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "certifications", label: "Certifications" },
] as const;

export type EditorSectionKey = (typeof EDITOR_SECTIONS)[number]["key"];

export type SectionMeta = {
  /** Has useful content. Drives the status dot beside each section. */
  done: boolean;
  /** One line describing what is in the section, shown when it is collapsed. */
  summary: string;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const trim = (s: string) => s.trim();

function clip(text: string, max = 70) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Status and summary line for every editor section. */
export function sectionMeta(
  content: ResumeContent,
  templateName: string,
): Record<EditorSectionKey, SectionMeta> {
  const { contact } = content;
  const experience = visibleExperience(content.experience).length;
  const education = visibleEducation(content.education).length;
  const projects = visibleProjects(content.projects).length;
  const certifications = visibleCertifications(content.certifications).length;
  const skills = visibleSkills(content.skills);
  const skillCount = skills.reduce((n, g) => n + g.items.filter((i) => trim(i)).length, 0);

  const contactBits = [trim(contact.fullName), trim(contact.email)].filter(Boolean);
  const count = (n: number, noun: string, many?: string) =>
    n > 0 ? plural(n, noun, many) : "None yet";

  return {
    template: { done: true, summary: templateName },
    contact: {
      done: Boolean(trim(contact.fullName) && trim(contact.email)),
      summary: contactBits.length ? contactBits.join(" · ") : "Not started",
    },
    summary: {
      done: Boolean(trim(content.summary)),
      summary: trim(content.summary) ? clip(content.summary) : "Not started",
    },
    experience: { done: experience > 0, summary: count(experience, "entry", "entries") },
    education: { done: education > 0, summary: count(education, "entry", "entries") },
    projects: { done: projects > 0, summary: count(projects, "project") },
    skills: {
      done: skillCount > 0,
      summary:
        skillCount > 0
          ? `${plural(skills.length, "group")}, ${plural(skillCount, "skill")}`
          : "None yet",
    },
    certifications: { done: certifications > 0, summary: count(certifications, "certification") },
  };
}

export type Requirement = { key: string; label: string; done: boolean };

/**
 * What a complete resume needs. Work history may be experience or projects, so students
 * with no jobs yet can still finish.
 */
export function computeProgress(content: ResumeContent) {
  const meta = sectionMeta(content, "");
  const requirements: Requirement[] = [
    { key: "contact", label: "Name and email", done: meta.contact.done },
    { key: "summary", label: "Summary", done: meta.summary.done },
    {
      key: "work",
      label: "Experience or projects",
      done: meta.experience.done || meta.projects.done,
    },
    { key: "education", label: "Education", done: meta.education.done },
    { key: "skills", label: "Skills", done: meta.skills.done },
  ];
  const done = requirements.filter((r) => r.done).length;
  return {
    requirements,
    done,
    total: requirements.length,
    percent: Math.round((done / requirements.length) * 100),
  };
}
