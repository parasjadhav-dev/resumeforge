import { importErrors } from "./errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export type FileKind = "pdf" | "docx";

const startsWith = (buf: Uint8Array, bytes: number[]) => bytes.every((b, i) => buf[i] === b);

const extensionOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

/**
 * Decides what a file really is from its content, not from what the browser claims.
 * Throws an ImportError (with a user-facing message) for anything we can't import.
 */
export function detectFileKind(name: string, buffer: Uint8Array): FileKind {
  if (buffer.length === 0) throw importErrors.empty();
  if (buffer.length > MAX_UPLOAD_BYTES) throw importErrors.tooLarge(MAX_UPLOAD_BYTES / 1024 / 1024);

  const ext = extensionOf(name);
  const head = buffer.subarray(0, 1024);
  const isPdf = new TextDecoder("latin1").decode(head).includes("%PDF-");
  const isZip = startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]); // DOCX is a zip container
  const isOldDoc = startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0]); // legacy .doc / .xls

  if (isOldDoc) {
    throw importErrors.unsupported(
      "Old .doc files aren't supported. Save it as DOCX or PDF first.",
    );
  }
  if (isPdf && ext === "pdf") return "pdf";
  if (isZip && ext === "docx") return "docx";

  // Right content, wrong extension (or the reverse): don't guess.
  throw importErrors.unsupported();
}
