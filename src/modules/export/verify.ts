import {
  cleanBullets,
  contactItems,
  formatDateRange,
  skillLine,
  visibleCertifications,
  visibleEducation,
  visibleExperience,
  visibleProjects,
  visibleSkills,
} from "@/shared/resume-format";
import type { ResumeContent } from "@/shared/schema";

/**
 * Text-extraction check for exported PDFs.
 *
 * Derives, from the resume itself, the text fragments that must appear in the PDF and the
 * order they must appear in (the reading order an ATS would see), then checks them against
 * the text extracted from the PDF. Used by the tests and for the "PDFs passing ATS text
 * extraction" metric.
 */

const join = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

/** Ordered fragments the extracted text must contain. */
export function expectedFragments(content: ResumeContent): string[] {
  const out: string[] = [];
  const add = (...texts: (string | undefined)[]) => {
    for (const t of texts) if (t?.trim()) out.push(t.trim());
  };

  add(content.contact.fullName, contactItems(content.contact).join("  |  "));

  if (content.summary.trim()) add("Summary", content.summary);

  const experience = visibleExperience(content.experience);
  if (experience.length) {
    add("Experience");
    for (const e of experience) {
      add(join(e.title, e.company), formatDateRange(e.startDate, e.endDate, e.current), e.location);
      add(...cleanBullets(e.bullets));
    }
  }

  const education = visibleEducation(content.education);
  if (education.length) {
    add("Education");
    for (const e of education) {
      add(e.institution, formatDateRange(e.startDate, e.endDate));
      add(
        [join(e.degree, e.field), e.gpa.trim() && `GPA: ${e.gpa.trim()}`]
          .filter(Boolean)
          .join(" | "),
        e.location,
      );
      add(...cleanBullets(e.details));
    }
  }

  const projects = visibleProjects(content.projects);
  if (projects.length) {
    add("Projects");
    for (const p of projects) {
      add(p.name, p.link, p.technologies.join(", "));
      add(...cleanBullets(p.bullets));
    }
  }

  const skills = visibleSkills(content.skills);
  if (skills.length) {
    add("Skills");
    add(...skills.map(skillLine));
  }

  const certifications = visibleCertifications(content.certifications);
  if (certifications.length) {
    add("Certifications");
    for (const c of certifications)
      add([join(c.name, c.issuer), c.date.trim()].filter(Boolean).join(" | "));
  }

  return out;
}

// Compare with all whitespace removed: lines wrap, and long words may break mid-word.
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export type VerifyResult = {
  ok: boolean;
  /** Fragments that do not appear anywhere in the extracted text. */
  missing: string[];
  /** Fragments that appear, but before something that should come earlier. */
  outOfOrder: string[];
};

export function verifyExtractedText(content: ResumeContent, extracted: string): VerifyResult {
  const haystack = squash(extracted);
  const missing: string[] = [];
  const outOfOrder: string[] = [];
  let cursor = 0;

  for (const fragment of expectedFragments(content)) {
    const needle = squash(fragment);
    const at = haystack.indexOf(needle, cursor);
    if (at >= 0) cursor = at + needle.length;
    else if (haystack.includes(needle)) outOfOrder.push(fragment);
    else missing.push(fragment);
  }

  return { ok: missing.length === 0 && outOfOrder.length === 0, missing, outOfOrder };
}
