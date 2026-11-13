import type { ResumeContent } from "@/shared/schema";
import type { ScoreResult } from "./types";

/** Everything in the resume that can show a skill, as one block of text. Contact details are left out. */
export function resumeEvidenceText(r: ResumeContent): string {
  return [
    r.summary,
    ...r.skills.flatMap((g) => [g.category, ...g.items]),
    ...r.experience.flatMap((e) => [e.title, ...e.bullets]),
    ...r.projects.flatMap((p) => [p.name, ...p.technologies, ...p.bullets]),
    ...r.education.flatMap((e) => [e.degree, e.field, ...e.details]),
    ...r.certifications.map((c) => c.name),
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- years of experience ----------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const NOW_WORDS = /\b(present|current|currently|now|ongoing|today|till date|to date)\b/i;

/** Months since year 0 for a date like "Jun 2024", "06/2024", "2024-06" or "2024"; null if unreadable. */
function parseMonth(text: string, fallbackMonth: number): number | null {
  const year = text.match(/\b(19|20)\d{2}\b/);
  if (!year) return null;
  const y = Number(year[0]);
  const name = MONTHS.findIndex((m) => new RegExp(String.raw`\b${m}`, "i").test(text));
  if (name >= 0) return y * 12 + name;
  const numeric =
    text.match(/\b(0?[1-9]|1[0-2])\s*[/-]\s*(?:19|20)\d{2}\b/) ??
    text.match(/\b(?:19|20)\d{2}\s*[/-]\s*(0?[1-9]|1[0-2])\b/);
  if (numeric) return y * 12 + Number(numeric[1]) - 1;
  return y * 12 + fallbackMonth; // only a year: assume the middle of it
}

/** Total time worked, in years, counting overlapping jobs once. */
export function yearsOfExperience(r: ResumeContent, now: Date): number {
  const nowMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const spans: Array<[number, number]> = [];

  for (const job of r.experience) {
    const start = parseMonth(job.startDate, 6);
    if (start === null) continue;
    const toNow = job.current || NOW_WORDS.test(job.endDate);
    let end = toNow ? nowMonth : parseMonth(job.endDate, 6);
    if (end === null) continue;
    end = Math.min(end, nowMonth);
    if (end < start) continue;
    if (end === start) end = start + 3; // a single-month or single-year entry still counts for something
    spans.push([start, end]);
  }

  spans.sort((a, b) => a[0] - b[0]);
  let months = 0;
  let [from, to] = spans[0] ?? [0, 0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= to) to = Math.max(to, e);
    else {
      months += to - from;
      [from, to] = [s, e];
    }
  }
  months += to - from;
  return Math.round((months / 12) * 10) / 10;
}

// ---------- education ----------

type Level = ScoreResult["educationLevel"];
export const EDUCATION_RANK: Record<Level, number> = {
  none: 0,
  associate: 1,
  bachelor: 2,
  master: 3,
  doctorate: 4,
};

// Matched on the degree with dots and spaces removed, so "B.Tech", "B. Tech" and "btech" agree.
const DEGREE_PATTERNS: Array<[Level, RegExp]> = [
  ["doctorate", /(doctor|phd|dphil|\bdba\b|\bedd\b)/],
  ["master", /(master|^m(sc|s|a|tech|e|ca|com|eng|phil)\b|\bm(sc|tech|ca|com)\b|mba)/],
  ["bachelor", /(bachelor|^b(sc|s|a|tech|e|ca|com|eng|ba|bm)\b|\bb(sc|tech|ca|com)\b)/],
  ["associate", /(associate|diploma|^a(a|s|as)\b)/],
];

export function degreeLevel(degree: string): Level {
  const text = degree.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  // "B. Tech" becomes "b tech" once the dot is gone; also try it joined up as "btech".
  const joined = text.replace(/^([a-z]) ([a-z])/, "$1$2");
  for (const [level, pattern] of DEGREE_PATTERNS) {
    if (pattern.test(text) || pattern.test(joined)) return level;
  }
  return "none";
}

/** The highest degree level written in the resume's education section. */
export function highestEducation(r: ResumeContent): Level {
  let best: Level = "none";
  for (const e of r.education) {
    const level = degreeLevel(e.degree);
    if (EDUCATION_RANK[level] > EDUCATION_RANK[best]) best = level;
  }
  return best;
}
