/**
 * The PDF uses the built-in Helvetica font, which only covers the Windows-1252 character set
 * (English and Western European text). Anything outside it would be drawn as wrong glyphs,
 * silently corrupting the resume, so we detect it up front and tell the user instead.
 */

// Windows-1252 characters above Latin-1 (0x80–0x9F block), as Unicode code points.
const CP1252_EXTRAS = new Set(
  "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ".split("").map((c) => c.codePointAt(0)!),
);

export function isPdfSafeChar(char: string): boolean {
  const cp = char.codePointAt(0)!;
  if (cp === 0x09 || cp === 0x0a || cp === 0x0d) return true; // tab / newlines (layout only)
  if (cp >= 0x20 && cp <= 0x7e) return true; // printable ASCII
  if (cp >= 0xa1 && cp <= 0xff) return cp !== 0xad; // Latin-1 letters and symbols (not soft hyphen)
  if (cp === 0xa0) return true; // non-breaking space
  return CP1252_EXTRAS.has(cp);
}

/** Distinct characters in `text` the PDF font cannot render, in order of first appearance. */
export function findUnsupportedChars(text: string): string[] {
  const found = new Set<string>();
  for (const char of text) if (!isPdfSafeChar(char)) found.add(char);
  return [...found];
}

/** Collects every string value in a resume-shaped object (ids included; they are plain ASCII). */
function collectStrings(value: unknown, out: string[]) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

export function findUnsupportedInResume(content: unknown): string[] {
  const strings: string[] = [];
  collectStrings(content, strings);
  return findUnsupportedChars(strings.join("\n"));
}

/** Human-readable explanation, e.g. for a warning banner or an API error. */
export function unsupportedCharsMessage(chars: string[]): string {
  const shown = chars.slice(0, 8).join(" ");
  const more = chars.length > 8 ? ` and ${chars.length - 8} more` : "";
  return (
    `Your resume contains characters the PDF font cannot display (${shown}${more}). ` +
    "Replace them with English letters, for example a transliterated name, to download a PDF."
  );
}
