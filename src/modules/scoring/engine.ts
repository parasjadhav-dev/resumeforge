import type { ResumeContent } from "@/shared/schema";
import { canonicalWords, contentWords, makeSkillFinder, uniqueSkills } from "./normalize";
import {
  EDUCATION_RANK,
  highestEducation,
  resumeEvidenceText,
  yearsOfExperience,
} from "./resume-facts";
import type { ComponentId, JobRequirements, ScoreComponent, ScoreResult } from "./types";

/** Weights from the plan. They add up to 100. */
export const WEIGHTS: Record<ComponentId, number> = {
  required: 40,
  preferred: 15,
  keywords: 20,
  experience: 15,
  education: 10,
};

const LABELS: Record<ComponentId, string> = {
  required: "Required skills",
  preferred: "Preferred skills",
  keywords: "Keywords and responsibilities",
  experience: "Experience level",
  education: "Education",
};

/** Years a posting implicitly expects when it names a level but no number of years. */
const IMPLIED_YEARS = { intern: 0, entry: 0, mid: 3, senior: 5, lead: 8, unspecified: 0 } as const;

/** A responsibility counts as covered when this share of its meaningful words is in the resume. */
const RESPONSIBILITY_OVERLAP = 0.6;

type Draft = Omit<ScoreComponent, "effectiveWeight" | "score" | "applicable"> & {
  /** 0 to 1, or null when the job gives nothing to measure. */
  ratio: number | null;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function skillsDraft(
  id: "required" | "preferred",
  skills: string[],
  hasSkill: (s: string) => boolean,
): Draft {
  const items = uniqueSkills(skills);
  const matched = items.filter(hasSkill);
  const missing = items.filter((s) => !hasSkill(s));
  return {
    id,
    label: LABELS[id],
    weight: WEIGHTS[id],
    matched,
    missing,
    ratio: items.length ? matched.length / items.length : null,
    summary: items.length
      ? `Your resume shows ${matched.length} of ${plural(items.length, "skill")} the job ${
          id === "required" ? "requires" : "prefers"
        }.`
      : `The job lists no ${id} skills, so this is not counted.`,
  };
}

function keywordsDraft(
  job: JobRequirements,
  text: string,
  hasSkill: (s: string) => boolean,
): Draft {
  const resumeWords = new Set(canonicalWords(text));
  const keywords = uniqueSkills(job.keywords);
  const duties = [
    ...new Set(job.responsibilities.map((r) => r.replace(/\s+/g, " ").trim())),
  ].filter(Boolean);

  const dutyCovered = (duty: string) => {
    const words = contentWords(duty);
    if (words.length === 0) return false;
    return words.filter((w) => resumeWords.has(w)).length / words.length >= RESPONSIBILITY_OVERLAP;
  };

  const matched = [...keywords.filter(hasSkill), ...duties.filter(dutyCovered)];
  const missing = [
    ...keywords.filter((k) => !hasSkill(k)),
    ...duties.filter((d) => !dutyCovered(d)),
  ];
  const total = matched.length + missing.length;
  return {
    id: "keywords",
    label: LABELS.keywords,
    weight: WEIGHTS.keywords,
    matched,
    missing,
    ratio: total ? matched.length / total : null,
    summary: total
      ? `Your resume echoes ${matched.length} of ${plural(
          total,
          "keyword or responsibility",
          "keywords and responsibilities",
        )} from the job.`
      : "The job lists no extra keywords or responsibilities, so this is not counted.",
  };
}

function experienceDraft(job: JobRequirements, years: number): Draft {
  const stated = job.minYearsExperience > 0;
  const needed = stated ? job.minYearsExperience : IMPLIED_YEARS[job.seniority];
  const base = { id: "experience" as const, label: LABELS.experience, weight: WEIGHTS.experience };

  if (!stated && job.seniority === "unspecified") {
    return {
      ...base,
      matched: [],
      missing: [],
      ratio: null,
      summary: "The job names no level or years of experience, so this is not counted.",
    };
  }
  if (needed === 0) {
    return {
      ...base,
      matched: [],
      missing: [],
      ratio: 1,
      summary: "The job is open to people without prior experience.",
    };
  }
  const source = stated ? "asks for" : `expects about (for a ${job.seniority}-level role)`;
  return {
    ...base,
    matched: [],
    missing: [],
    ratio: Math.min(1, years / needed),
    summary: `The job ${source} ${plural(needed, "year")}; your dates add up to ${years}.`,
  };
}

function educationDraft(job: JobRequirements, resume: ResumeContent): Draft {
  const base = { id: "education" as const, label: LABELS.education, weight: WEIGHTS.education };
  const required = job.educationRequired;
  if (required === "unspecified" || required === "none") {
    return {
      ...base,
      matched: [],
      missing: [],
      ratio: null,
      summary: "The job does not require a degree, so this is not counted.",
    };
  }
  const have = highestEducation(resume);
  const gap = EDUCATION_RANK[required] - EDUCATION_RANK[have];
  // One level short earns half; a missing or two-levels-short degree earns nothing.
  const ratio = gap <= 0 ? 1 : gap === 1 && have !== "none" ? 0.5 : 0;
  const name = (level: string) => (level === "none" ? "no degree" : `a ${level} degree`);
  return {
    ...base,
    matched: [],
    missing: [],
    ratio,
    summary: `The job asks for ${name(required)}; your resume shows ${name(have)}.`,
  };
}

/**
 * Scores a resume against a job. Pure: the same inputs give the same result.
 *
 * Five parts are weighted 40/15/20/15/10. A part the job says nothing about is left out and the
 * rest share its weight, so a posting without preferred skills does not cap the score at 85.
 * Nothing is guessed: a skill counts only if the resume says it (or a known alias of it).
 */
export function scoreResume(
  resume: ResumeContent,
  job: JobRequirements,
  options: { now?: Date } = {},
): ScoreResult {
  const text = resumeEvidenceText(resume);
  const hasSkill = makeSkillFinder(text);
  const years = yearsOfExperience(resume, options.now ?? new Date());

  const drafts: Draft[] = [
    skillsDraft("required", job.requiredSkills, hasSkill),
    skillsDraft("preferred", job.preferredSkills, hasSkill),
    keywordsDraft(job, text, hasSkill),
    experienceDraft(job, years),
    educationDraft(job, resume),
  ];

  const applicableWeight = drafts.reduce((sum, d) => sum + (d.ratio === null ? 0 : d.weight), 0);
  const components: ScoreComponent[] = drafts.map(({ ratio, ...d }) => ({
    ...d,
    applicable: ratio !== null,
    score: ratio === null ? null : Math.round(ratio * 100),
    effectiveWeight:
      ratio === null || applicableWeight === 0
        ? 0
        : Math.round((d.weight / applicableWeight) * 1000) / 10,
  }));

  const weighted = drafts.reduce((sum, d) => sum + (d.ratio ?? 0) * d.weight, 0);
  const [required, preferred, keywords] = components;

  return {
    score: applicableWeight === 0 ? null : Math.round((weighted / applicableWeight) * 100),
    components,
    matched: {
      required: required.matched,
      preferred: preferred.matched,
      keywords: keywords.matched,
    },
    missing: {
      required: required.missing,
      preferred: preferred.missing,
      keywords: keywords.missing,
    },
    yearsOfExperience: years,
    educationLevel: highestEducation(resume),
  };
}
