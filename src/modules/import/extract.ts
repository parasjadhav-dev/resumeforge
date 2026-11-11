import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { importErrors } from "./errors";
import type { FileKind } from "./validate";

/** Plenty for any resume; keeps AI cost and latency bounded. */
const MAX_PAGES = 10;
export const MAX_TEXT_CHARS = 40_000;

/** Fewer characters than this almost certainly means a scanned (image-only) document. */
const MIN_PDF_TEXT_CHARS = 80;

function tidy(text: string): string {
  return text
    .replace(/-- \d+ of \d+ --/g, "") // page markers added by the PDF reader
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(buffer: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText({ first: MAX_PAGES });
    return tidy(text);
  } catch (err) {
    const info = `${(err as Error)?.name} ${(err as Error)?.message}`;
    if (/password/i.test(info)) throw importErrors.password();
    throw importErrors.corrupt();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function extractDocx(buffer: Uint8Array): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return tidy(value);
  } catch {
    throw importErrors.corrupt();
  }
}

/** Extracts plain text from a validated file. Throws friendly ImportErrors. */
export async function extractText(kind: FileKind, buffer: Uint8Array): Promise<string> {
  const text = kind === "pdf" ? await extractPdf(buffer) : await extractDocx(buffer);

  if (kind === "pdf" && text.length < MIN_PDF_TEXT_CHARS) throw importErrors.scanned();
  if (text.length === 0) throw importErrors.noText();

  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
}
