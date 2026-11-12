/**
 * Grounding: checking that text an AI model produced really comes from the source document.
 * Used wherever the AI extracts information (resume import, job analysis), so that anything it
 * invents can be detected and dropped instead of reaching the user as fact.
 */

/** Lower-cased words and numbers, ignoring punctuation and case. */
export const tokenize = (s: string): string[] => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** "APIs" and "API", "skills" and "skill" count as the same word. Deliberately crude. */
export function stem(word: string): string {
  if (word.length > 3 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

type Options = {
  /** Treat plural and singular forms as equal. Useful for skills and phrases. */
  stem?: boolean;
};

/** What share (0 to 1) of a text's words appear in the source document. */
export function makeGroundingRatio(source: string, { stem: useStem = false }: Options = {}) {
  const normalise = (words: string[]) => (useStem ? words.map(stem) : words);
  const known = new Set(normalise(tokenize(source)));
  return (value: string): number => {
    const tokens = normalise(tokenize(value));
    if (tokens.length === 0) return 1;
    return tokens.filter((t) => known.has(t)).length / tokens.length;
  };
}

/**
 * Returns a checker: is this text actually present in the source document?
 * Short values (names, skills) must match fully; longer text may differ slightly
 * (the model may repair line breaks), so most of its words must appear in the source.
 */
export function makeGrounder(source: string, options: Options = {}) {
  const ratio = makeGroundingRatio(source, options);
  return (value: string): boolean => {
    const tokens = tokenize(value);
    if (tokens.length === 0) return true;
    return tokens.length <= 3 ? ratio(value) === 1 : ratio(value) >= 0.7;
  };
}
