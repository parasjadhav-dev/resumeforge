import { getLlm, LlmError, LlmNotConfiguredError, type LlmClient } from "@/lib/llm";
import { resumeService, type Resume } from "@/modules/resumes";
import { importErrors } from "./errors";
import { extractText } from "./extract";
import type { ImportReview } from "@/shared/import-review";
import { parseResumeText } from "./parse";
import { detectFileKind } from "./validate";

export type ImportResult = {
  resume: Resume;
  /** Plain-language notes for the user, e.g. when something could not be verified. */
  warnings: string[];
  /** What to double-check, per entry id. Used by the editor during review. */
  review: ImportReview;
  /**
   * The text read from the file, returned only so the user's browser can show it beside the
   * editor while they review. It is never saved on the server.
   */
  sourceText: string;
};

/** "Asha_Rao-Resume.pdf" -> "Asha Rao Resume" */
export function titleFromFileName(name: string): string {
  const title = name
    .replace(/^.*[\\/]/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return title || "Imported resume";
}

export const importService = {
  /**
   * Imports an uploaded resume file: validate, read the text, extract structure with AI,
   * verify it against the file, and save it as a new resume. The file itself is only ever
   * held in memory and is never stored.
   */
  async importResume(
    userId: string,
    file: { name: string; buffer: Uint8Array },
    deps: { llm?: LlmClient } = {},
  ): Promise<ImportResult> {
    const kind = detectFileKind(file.name, file.buffer);

    // Fail fast, before spending time reading the file, if AI isn't available.
    let llm: LlmClient;
    try {
      llm = deps.llm ?? getLlm();
    } catch (err) {
      if (err instanceof LlmNotConfiguredError) throw importErrors.aiUnavailable();
      throw err;
    }

    const text = await extractText(kind, file.buffer);

    let parsed;
    try {
      parsed = await parseResumeText(text, llm);
    } catch (err) {
      if (err instanceof LlmError) {
        console.error("Resume import: AI failed", err.message, err.cause);
        throw importErrors.aiFailed();
      }
      throw err;
    }

    const resume = await resumeService.create(userId, {
      title: titleFromFileName(file.name),
      content: parsed.content,
    });

    const warnings: string[] = [];
    if (parsed.dropped.length > 0) {
      warnings.push(
        `${parsed.dropped.length} item${parsed.dropped.length === 1 ? "" : "s"} could not be ` +
          "matched to your file and were left out. Check that nothing is missing.",
      );
    }
    return { resume, warnings, review: parsed.review, sourceText: text };
  },
};
