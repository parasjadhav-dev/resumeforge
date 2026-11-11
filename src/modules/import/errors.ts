export type ImportErrorCode =
  | "FILE_MISSING"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_TYPE"
  | "CORRUPT_FILE"
  | "PASSWORD_PROTECTED"
  | "SCANNED_PDF"
  | "NO_TEXT"
  | "AI_UNAVAILABLE"
  | "AI_FAILED";

/** A problem importing a file, with a message that is safe and useful to show the user. */
export class ImportError extends Error {
  constructor(
    public readonly code: ImportErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export const importErrors = {
  fileMissing: () => new ImportError("FILE_MISSING", "Choose a PDF or DOCX file to import.", 400),
  empty: () => new ImportError("EMPTY_FILE", "That file is empty.", 400),
  tooLarge: (maxMb: number) =>
    new ImportError("FILE_TOO_LARGE", `That file is too large. The limit is ${maxMb} MB.`, 413),
  unsupported: (detail = "Upload a PDF or a DOCX file.") =>
    new ImportError("UNSUPPORTED_TYPE", `That file type is not supported. ${detail}`, 415),
  corrupt: () =>
    new ImportError(
      "CORRUPT_FILE",
      "We couldn't read that file. It may be damaged. Try re-exporting it as a PDF or DOCX.",
      422,
    ),
  password: () =>
    new ImportError(
      "PASSWORD_PROTECTED",
      "That PDF is password protected. Remove the password and upload it again.",
      422,
    ),
  scanned: () =>
    new ImportError(
      "SCANNED_PDF",
      "This PDF looks like a scan or an image, so it has no text we can read. " +
        "Upload a text-based PDF or a DOCX instead, or build your resume from scratch.",
      422,
    ),
  noText: () => new ImportError("NO_TEXT", "We couldn't find any text in that file.", 422),
  aiUnavailable: () =>
    new ImportError(
      "AI_UNAVAILABLE",
      "Importing needs AI, which isn't set up on this server yet.",
      503,
    ),
  aiFailed: () =>
    new ImportError(
      "AI_FAILED",
      "We couldn't read your resume just now. Please try again in a moment.",
      502,
    ),
};
