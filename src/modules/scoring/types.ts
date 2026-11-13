/**
 * What the scorer needs to know about a job. This is the same shape as a job analysis, declared
 * here so scoring stays independent of the jobs module.
 */
export type JobRequirements = {
  seniority: "intern" | "entry" | "mid" | "senior" | "lead" | "unspecified";
  educationRequired: "none" | "bachelor" | "master" | "doctorate" | "unspecified";
  minYearsExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  responsibilities: string[];
};

export const COMPONENT_IDS = [
  "required",
  "preferred",
  "keywords",
  "experience",
  "education",
] as const;
export type ComponentId = (typeof COMPONENT_IDS)[number];

export type ScoreComponent = {
  id: ComponentId;
  label: string;
  /** Its share of the overall score when every component applies (percent). */
  weight: number;
  /** False when the job says nothing for this component, so it is left out of the score. */
  applicable: boolean;
  /** Its share of the overall score once inapplicable components are left out (percent). */
  effectiveWeight: number;
  /** 0 to 100, or null when not applicable. */
  score: number | null;
  matched: string[];
  missing: string[];
  /** One plain sentence saying how this score came about. */
  summary: string;
};

export type ScoreResult = {
  /** 0 to 100, or null when the job gave nothing to compare against. */
  score: number | null;
  components: ScoreComponent[];
  /** Everything the resume covers and lacks, across the three term lists. */
  matched: { required: string[]; preferred: string[]; keywords: string[] };
  missing: { required: string[]; preferred: string[]; keywords: string[] };
  /** Years of experience worked out from the resume's dates. */
  yearsOfExperience: number;
  /** The highest degree level found in the resume's education section. */
  educationLevel: "none" | "associate" | "bachelor" | "master" | "doctorate";
};
