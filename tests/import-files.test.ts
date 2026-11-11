import { describe, expect, it } from "vitest";
import { ImportError } from "@/modules/import";
import { extractText, MAX_TEXT_CHARS } from "@/modules/import/extract";
import { detectFileKind } from "@/modules/import/validate";
import { renderResumePdf } from "@/modules/export";
import { resumeContentSchema } from "@/shared/schema";
import { makeDocx, makeSamplePdf, SAMPLE_RESUME_TEXT_LINES } from "./helpers/files";

const bytes = (...b: number[]) => new Uint8Array(b);
const asText = (s: string) => new TextEncoder().encode(s);

async function code(fn: () => unknown | Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    if (err instanceof ImportError) return err.code;
    throw err;
  }
  return "no error";
}

describe("detectFileKind", () => {
  it("accepts a real PDF and a real DOCX", async () => {
    expect(detectFileKind("resume.pdf", await makeSamplePdf())).toBe("pdf");
    expect(detectFileKind("Resume.DOCX", await makeDocx(["hello"]))).toBe("docx");
  });

  it("judges by content, not by the extension or the browser's claim", async () => {
    const pdf = await makeSamplePdf();
    const docx = await makeDocx(["hello"]);
    expect(await code(() => detectFileKind("resume.docx", pdf))).toBe("UNSUPPORTED_TYPE");
    expect(await code(() => detectFileKind("resume.pdf", docx))).toBe("UNSUPPORTED_TYPE");
    expect(
      await code(() => detectFileKind("resume.pdf", asText("MZ\x90\x00 an exe in disguise"))),
    ).toBe("UNSUPPORTED_TYPE");
    expect(await code(() => detectFileKind("resume.txt", asText("plain text")))).toBe(
      "UNSUPPORTED_TYPE",
    );
    expect(await code(() => detectFileKind("resume", pdf))).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects the legacy .doc format with a helpful message", () => {
    const oldDoc = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
    expect(() => detectFileKind("resume.doc", oldDoc)).toThrow(/save it as DOCX or PDF/i);
  });

  it("rejects empty files", () => {
    expect(() => detectFileKind("resume.pdf", new Uint8Array(0))).toThrow(/empty/i);
  });

  it("enforces the 5 MB limit exactly", () => {
    const pdfHead = asText("%PDF-1.4\n");
    const at = new Uint8Array(5 * 1024 * 1024);
    at.set(pdfHead);
    expect(detectFileKind("big.pdf", at)).toBe("pdf");

    const over = new Uint8Array(5 * 1024 * 1024 + 1);
    over.set(pdfHead);
    expect(() => detectFileKind("big.pdf", over)).toThrow(/too large.*5 MB/i);
  });
});

describe("extractText", () => {
  it("reads the text out of a real PDF", async () => {
    const text = await extractText("pdf", await makeSamplePdf());
    for (const expected of [
      "Asha Rao",
      "asha@example.com",
      "Acme Corp",
      "reduced report generation time by 40%",
      "TypeScript",
    ]) {
      expect(text).toContain(expected);
    }
    expect(text).not.toMatch(/-- \d+ of \d+ --/);
  });

  it("reads the text out of a real DOCX", async () => {
    const text = await extractText("docx", await makeDocx(SAMPLE_RESUME_TEXT_LINES));
    expect(text).toContain("Asha Rao");
    expect(text).toContain("Wrote integration tests that raised coverage from 55% to 82%.");
    expect(text.split("\n").length).toBeGreaterThan(8);
  });

  it("explains that a PDF with (almost) no text looks scanned", async () => {
    const nearlyEmpty = new Uint8Array(
      await renderResumePdf(resumeContentSchema.parse({ contact: { fullName: "Asha" } })),
    );
    expect(await code(() => extractText("pdf", nearlyEmpty))).toBe("SCANNED_PDF");
    await expect(extractText("pdf", nearlyEmpty)).rejects.toThrow(/scan or an image/i);
  });

  it("reports an empty DOCX", async () => {
    expect(await code(async () => extractText("docx", await makeDocx([])))).toBe("NO_TEXT");
  });

  it("reports damaged files instead of crashing", async () => {
    expect(await code(() => extractText("pdf", asText("%PDF-1.4\nthis is not really a pdf")))).toBe(
      "CORRUPT_FILE",
    );
    expect(
      await code(() => extractText("docx", bytes(0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5))),
    ).toBe("CORRUPT_FILE");
  });

  it("caps how much text is sent on to the AI", async () => {
    const huge = await makeDocx(
      Array.from({ length: 3000 }, (_, i) => `Line ${i} ${"word ".repeat(20)}`),
    );
    const text = await extractText("docx", huge);
    expect(text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    expect(text.length).toBeGreaterThan(MAX_TEXT_CHARS - 200);
  });
});
