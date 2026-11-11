import { PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";
import { renderResumePdf, verifyExtractedText } from "@/modules/export";
import { findUnsupportedChars, isPdfSafeChar } from "@/shared/pdf-charset";
import { resumeContentSchema, TEMPLATE_IDS, type ResumeContent } from "@/shared/schema";
import { randomResume } from "./helpers/random-resume";

// ---------- helpers ----------

/** Extracted text per page, with the parser's "-- 1 of 2 --" page markers removed. */
async function extractPages(pdf: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: new Uint8Array(pdf) });
  try {
    const { text } = await parser.getText();
    return text
      .split(/-- \d+ of \d+ --/)
      .map((page) => page.trim())
      .filter(Boolean);
  } finally {
    await parser.destroy();
  }
}

const exportAndVerify = async (content: ResumeContent, templateId: string) => {
  const pages = await extractPages(await renderResumePdf(content, { templateId }));
  return { pages, result: verifyExtractedText(content, pages.join("\n")) };
};

const HEADINGS = ["summary", "experience", "education", "projects", "skills", "certifications"];

/** A section heading stranded as the last line of a page (its content starts on the next page). */
function orphanedHeading(pages: string[]): string | undefined {
  for (const page of pages) {
    const lines = page
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const last = lines.at(-1)?.toLowerCase();
    if (last && HEADINGS.includes(last)) return last;
  }
  return undefined;
}

// ---------- the verifier itself must be able to fail ----------

describe("verifyExtractedText", () => {
  const content = resumeContentSchema.parse({
    contact: { fullName: "Asha Rao", email: "asha@example.com" },
    summary: "Final-year student.",
    experience: [
      { title: "Intern", company: "Acme", startDate: "2024", bullets: ["Built an API"] },
    ],
    skills: [{ category: "Languages", items: ["TypeScript"] }],
  });
  const good =
    "Asha Rao\nasha@example.com\nSUMMARY\nFinal-year student.\nEXPERIENCE\nIntern, Acme 2024\n• Built an API\nSKILLS\nLanguages: TypeScript";

  it("passes text in the right order, ignoring case and line wrapping", () => {
    expect(verifyExtractedText(content, good).ok).toBe(true);
    expect(verifyExtractedText(content, good.toLowerCase().replace(/ /g, "\n")).ok).toBe(true);
  });

  it("reports missing content", () => {
    const result = verifyExtractedText(content, good.replace("Built an API", ""));
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["Built an API"]);
  });

  it("reports content in the wrong order", () => {
    const swapped =
      "Asha Rao\nasha@example.com\nSKILLS\nLanguages: TypeScript\nSUMMARY\nFinal-year student.\nEXPERIENCE\nIntern, Acme 2024\n• Built an API";
    const result = verifyExtractedText(content, swapped);
    expect(result.ok).toBe(false);
    expect(result.outOfOrder.length).toBeGreaterThan(0);
  });
});

// ---------- reading order on hard inputs, for every template ----------

describe.each(TEMPLATE_IDS)("PDF text extraction, %s template", (templateId) => {
  it("extracts a typical resume completely and in order", async () => {
    const content = randomResume(1);
    const { result } = await exportAndVerify(content, templateId);
    expect(result).toEqual({ ok: true, missing: [], outOfOrder: [] });
  });

  it("handles special characters, symbols, and Western European accents", async () => {
    const content = resumeContentSchema.parse({
      contact: {
        fullName: "José Müller-O’Brien",
        email: "jose+test@example.com",
        location: "São Paulo",
      },
      summary:
        "R&D engineer — C++, C#, .NET; 50% faster “builds” for café & naïve users … résumé ‘ok’.",
      experience: [
        {
          title: "Développeur",
          company: "Société Générale & Co.",
          bullets: ["Cut cost by €1.2M (~30%) — see #42", "Wrote <script> tags & 5 > 3 tests"],
        },
      ],
      skills: [{ category: "Languages", items: ["C++", "C#", "F#", "Node.js", "SQL"] }],
    });
    const { result } = await exportAndVerify(content, templateId);
    expect(result).toEqual({ ok: true, missing: [], outOfOrder: [] });
  });

  it("keeps very long unbroken strings (URLs) intact", async () => {
    const url = `github.com/${"very-long-organisation-name/".repeat(6)}project`;
    const content = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao", website: url },
      projects: [
        { name: "Long link project", link: url, bullets: [`See ${url}/docs for details.`] },
      ],
    });
    const { result } = await exportAndVerify(content, templateId);
    expect(result.ok).toBe(true);
  });

  it("keeps multi-line summaries in order", async () => {
    const content = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao" },
      summary: "First paragraph about my background.\n\nSecond paragraph about my goals.",
      skills: [{ category: "Tools", items: ["Git"] }],
    });
    const { result } = await exportAndVerify(content, templateId);
    expect(result.ok).toBe(true);
  });

  it("handles a maximum-size resume across many pages", async () => {
    const line = (n: number) =>
      `Delivered measurable outcome number ${n} using TypeScript and PostgreSQL.`;
    const content = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao", email: "asha@example.com" },
      summary: "x ".repeat(900).trim(),
      experience: Array.from({ length: 20 }, (_, i) => ({
        title: `Role ${i + 1}`,
        company: `Company ${i + 1}`,
        startDate: "2010",
        endDate: "2011",
        bullets: Array.from({ length: 15 }, (_, j) => line(i * 100 + j)),
      })),
      skills: [{ category: "Languages", items: ["TypeScript", "Python"] }],
      certifications: [{ name: "AWS CCP", issuer: "Amazon", date: "Mar 2025" }],
    });
    const started = Date.now();
    const { pages, result } = await exportAndVerify(content, templateId);
    expect(pages.length).toBeGreaterThan(5);
    expect(result).toEqual({ ok: true, missing: [], outOfOrder: [] });
    expect(Date.now() - started).toBeLessThan(20_000);
  }, 60_000);

  it("copes with minimal resumes", async () => {
    for (const input of [
      { contact: { fullName: "Asha Rao" } },
      { summary: "Only a summary." },
      { skills: [{ category: "", items: ["Python"] }] },
    ]) {
      const { result } = await exportAndVerify(resumeContentSchema.parse(input), templateId);
      expect(result.ok).toBe(true);
    }
  });

  it("extracts 12 randomized resumes correctly and never strands a heading at a page end", async () => {
    const failures: string[] = [];
    for (let seed = 100; seed < 112; seed++) {
      const content = randomResume(seed);
      const { pages, result } = await exportAndVerify(content, templateId);
      if (!result.ok)
        failures.push(
          `seed ${seed}: missing=${JSON.stringify(result.missing.slice(0, 2))} outOfOrder=${JSON.stringify(result.outOfOrder.slice(0, 2))}`,
        );
      const orphan = orphanedHeading(pages);
      if (orphan) failures.push(`seed ${seed}: heading "${orphan}" stranded at the end of a page`);
    }
    expect(failures).toEqual([]);
  }, 120_000);
});

// ---------- which characters the PDF font can and cannot render ----------

describe("PDF character support", () => {
  it("round-trips every character we claim is supported", async () => {
    const supported: string[] = [];
    for (let cp = 0x21; cp <= 0x24f; cp++) {
      const ch = String.fromCodePoint(cp);
      if (isPdfSafeChar(ch) && cp !== 0xa0) supported.push(ch); // U+00A0 is whitespace
    }
    for (const ch of "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ") supported.push(ch);

    // Chunks of words keep lines wrappable while covering every character.
    const text = supported.join("");
    const chunks = text.match(/.{1,40}/g)!.join(" ");
    const content = resumeContentSchema.parse({
      contact: { fullName: "Charset" },
      summary: chunks,
    });

    const pages = await extractPages(await renderResumePdf(content));
    // NFKC: the PDF reader reports the micro sign (U+00B5) as Greek mu (U+03BC), the same letter.
    const got = pages.join("").replace(/\s+/g, "").normalize("NFKC");
    const lost = [...new Set(text)].filter((ch) => !got.includes(ch.normalize("NFKC")));
    expect(lost.map((c) => `${c} U+${c.codePointAt(0)!.toString(16)}`)).toEqual([]);
  }, 60_000);

  it("flags characters outside the font, and the verifier catches the garbled output", async () => {
    const content = resumeContentSchema.parse({
      contact: { fullName: "आशा राव" },
      summary: "Shipped 🚀 on time",
    });
    expect(findUnsupportedChars("आशा राव 山田 🚀 مرحبا").length).toBeGreaterThan(5);

    const { result } = await exportAndVerify(content, "classic");
    expect(result.ok).toBe(false); // proves the garbling is real, and detectable
  });

  it("accepts ordinary text and rejects control and invisible characters", () => {
    expect(findUnsupportedChars("Asha Rao — José, São Paulo “ok” 50% €5 • a@b.co\n\t")).toEqual([]);
    for (const bad of ["आ", "山", "🚀", "م", "­", "\u0000", "​", " "]) {
      expect(isPdfSafeChar(bad), `U+${bad.codePointAt(0)!.toString(16)}`).toBe(false);
    }
  });
});
