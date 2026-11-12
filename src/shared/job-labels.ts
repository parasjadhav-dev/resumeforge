/** Plain-language labels for the values in a job analysis. */

export const SENIORITY_LABELS = {
  intern: "Internship",
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead or manager",
  unspecified: "Level not stated",
} as const;

export const EDUCATION_LABELS = {
  none: "No degree required",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  doctorate: "Doctorate",
  unspecified: "Education not stated",
} as const;

export function experienceLabel(years: number): string {
  return years > 0
    ? `${years}+ ${years === 1 ? "year" : "years"} of experience`
    : "Experience not stated";
}
