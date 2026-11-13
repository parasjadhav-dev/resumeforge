import { stem } from "@/shared/grounding";

/**
 * Skill normalizer: reduces a skill or phrase to a canonical form so "JS", "javascript" and
 * "Java Script" compare equal, and "RESTful APIs" matches "REST API".
 */

/** Words left out when comparing sentences (not when comparing skills). */
export const STOPWORDS = new Set(
  (
    "a an and are as at be by for from has have in into is it of on or our that the their this " +
    "to we will with you your who work working ability able strong good new using use used " +
    "etc including such other also across within through"
  ).split(" "),
);

// Each line: canonical form <- spellings that mean the same thing.
const SYNONYMS: Record<string, string[]> = {
  javascript: ["js", "ecmascript", "java script"],
  typescript: ["ts"],
  node: ["nodejs", "node js", "node.js"],
  react: ["reactjs", "react js", "react.js"],
  vue: ["vuejs", "vue js", "vue.js"],
  angular: ["angularjs", "angular js", "angular.js"],
  nextjs: ["next js", "next.js"],
  express: ["expressjs", "express js", "express.js"],
  postgresql: ["postgres", "psql", "postgre sql"],
  mongodb: ["mongo", "mongo db"],
  mysql: ["my sql"],
  "sql server": ["mssql", "ms sql", "microsoft sql server"],
  kubernetes: ["k8s"],
  aws: ["amazon web services"],
  gcp: ["google cloud platform", "google cloud"],
  azure: ["microsoft azure"],
  "ci cd": [
    "cicd",
    "continuous integration",
    "continuous delivery",
    "continuous deployment",
    "continuous integration continuous deployment",
    "continuous integration continuous delivery",
  ],
  "machine learning": ["ml"],
  ai: ["artificial intelligence"],
  nlp: ["natural language processing"],
  llm: ["large language model", "large language models"],
  rest: ["restful"],
  go: ["golang"],
  "c#": ["c sharp", "csharp"],
  "c++": ["cpp"],
  net: ["dotnet", "dot net"],
  oop: ["object oriented programming", "object oriented"],
  html: ["html5"],
  css: ["css3"],
  ui: ["user interface"],
  ux: ["user experience"],
  tdd: ["test driven development"],
};

/** Words that should not be stemmed, because their last letter is part of the word. */
const KEEP = new Set(["aws", "ios", "js", "css", "sas", "gis", "mls", "nlp"]);

const canonicalWord = (w: string) => (KEEP.has(w) ? w : stem(w));

/** Lower-case words, keeping "c++", "c#" and "node.js" whole. */
function words(text: string): string[] {
  const raw = text.toLowerCase().match(/[\p{L}\p{N}]+(?:[+#]+|(?:\.[\p{L}\p{N}]+)+)?/gu) ?? [];
  return raw.map((w) => w.replace(/\.+$/, ""));
}

const toKey = (phrase: string) => words(phrase).map(canonicalWord).join(" ");

// Spelling (as a key) -> canonical key.
const ALIASES = new Map<string, string>();
for (const [canonical, spellings] of Object.entries(SYNONYMS)) {
  const target = toKey(canonical);
  for (const spelling of spellings) ALIASES.set(toKey(spelling), target);
}
const MAX_ALIAS_WORDS = Math.max(...[...ALIASES.keys()].map((k) => k.split(" ").length));

/** Canonical words for any text, with synonyms replaced (longest spelling first). */
export function canonicalWords(text: string): string[] {
  const ws = words(text).map(canonicalWord);
  const out: string[] = [];
  for (let i = 0; i < ws.length;) {
    let replaced = false;
    for (let n = Math.min(MAX_ALIAS_WORDS, ws.length - i); n >= 1; n--) {
      const target = ALIASES.get(ws.slice(i, i + n).join(" "));
      if (target !== undefined) {
        out.push(...target.split(" "));
        i += n;
        replaced = true;
        break;
      }
    }
    if (!replaced) out.push(ws[i++]);
  }
  return out;
}

/** The canonical form of one skill, ready for comparison. Brackets and what they hold are ignored. */
export const skillKey = (skill: string): string =>
  canonicalWords(skill.replace(/\([^)]*\)/g, " ")).join(" ");

/** Does the text contain this skill as whole words, in order? */
export function makeSkillFinder(text: string): (skill: string) => boolean {
  const haystack = ` ${canonicalWords(text).join(" ")} `;
  return (skill) => {
    const key = skillKey(skill);
    return key.length > 0 && haystack.includes(` ${key} `);
  };
}

/** Removes repeats (after normalizing), keeping the first spelling of each. */
export function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills) {
    const skill = raw.replace(/\s+/g, " ").trim();
    const key = skillKey(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }
  return out;
}

/** The meaningful words of a sentence, for comparing wording rather than exact skills. */
export const contentWords = (sentence: string): string[] =>
  canonicalWords(sentence).filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
