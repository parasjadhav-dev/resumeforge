import { renderToBuffer } from "@react-pdf/renderer";
import { resolveTemplateId } from "@/shared/templates";
import type { ResumeContent } from "@/shared/schema";
import { ResumePdfDocument } from "./pdf/resume-document";

export async function renderResumePdf(
  content: ResumeContent,
  options: { templateId?: string; title?: string } = {},
): Promise<Buffer> {
  const name = content.contact.fullName.trim();
  const title = name ? `${name} - Resume` : (options.title ?? "Resume");
  return renderToBuffer(
    <ResumePdfDocument
      content={content}
      title={title}
      templateId={resolveTemplateId(options.templateId)}
    />,
  );
}

/** Safe download file name, e.g. "Asha-Rao-Resume.pdf". */
export function pdfFileName(content: ResumeContent, fallbackTitle: string): string {
  const base = content.contact.fullName.trim() || fallbackTitle.trim() || "Resume";
  const safe = base
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._ -]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${safe || "Resume"}${/resume/i.test(safe) ? "" : "-Resume"}.pdf`;
}
