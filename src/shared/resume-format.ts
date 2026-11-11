import type {
  Certification,
  Contact,
  Education,
  Experience,
  Project,
  ResumeContent,
  SkillGroup,
} from "./schema";

/**
 * Pure formatting rules shared by every renderer (HTML preview, PDF, ATS checks),
 * so all of them show the same text in the same order.
 */

const clean = (s: string) => s.trim();

export function cleanBullets(bullets: string[]): string[] {
  return bullets.map(clean).filter(Boolean);
}

/** "Jun 2024 – Present", "2021 – 2025", or just one side if the other is empty. */
export function formatDateRange(start: string, end: string, current = false): string {
  const s = clean(start);
  const e = current ? "Present" : clean(end);
  return s && e ? `${s} – ${e}` : s || e;
}

/** Contact details in display order, skipping empty ones. */
export function contactItems(contact: Contact): string[] {
  return [
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin,
    contact.github,
    contact.website,
  ]
    .map(clean)
    .filter(Boolean);
}

export function skillLine(group: SkillGroup): string {
  const items = group.items.map(clean).filter(Boolean).join(", ");
  const category = clean(group.category);
  return category && items ? `${category}: ${items}` : category || items;
}

// ---- Which entries are worth showing (ignore blank, untouched entries) ----

export const visibleExperience = (list: Experience[]) =>
  list.filter((e) => clean(e.title) || clean(e.company) || cleanBullets(e.bullets).length);

export const visibleEducation = (list: Education[]) =>
  list.filter((e) => clean(e.institution) || clean(e.degree) || cleanBullets(e.details).length);

export const visibleProjects = (list: Project[]) =>
  list.filter((p) => clean(p.name) || cleanBullets(p.bullets).length);

export const visibleSkills = (list: SkillGroup[]) => list.filter((g) => skillLine(g));

export const visibleCertifications = (list: Certification[]) =>
  list.filter((c) => clean(c.name) || clean(c.issuer));

/** True when there is nothing to render yet. */
export function isResumeEmpty(content: ResumeContent): boolean {
  return (
    !clean(content.contact.fullName) &&
    contactItems(content.contact).length === 0 &&
    !clean(content.summary) &&
    visibleExperience(content.experience).length === 0 &&
    visibleEducation(content.education).length === 0 &&
    visibleProjects(content.projects).length === 0 &&
    visibleSkills(content.skills).length === 0 &&
    visibleCertifications(content.certifications).length === 0
  );
}
