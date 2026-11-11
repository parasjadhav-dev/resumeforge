"use client";

import { useDeferredValue } from "react";
import { ResumeTemplate } from "@/components/templates/resume-template";
import type { ResumeContent, TemplateId } from "@/shared/schema";
import { TEMPLATES } from "@/shared/templates";

/**
 * Live preview: an A4-shaped page lying on a "desk". The page keeps its proportions even when
 * the resume is short, so the preview always fills its column. Deferred so typing stays instant.
 */
export function PreviewPanel({
  content,
  templateId,
}: {
  content: ResumeContent;
  templateId: TemplateId;
}) {
  const deferred = useDeferredValue(content);
  const templateName = TEMPLATES.find((t) => t.id === templateId)?.name;

  return (
    // Sticks beside the form on large screens and scrolls on its own, so it must be reachable by
    // keyboard (tabIndex) for people who cannot use a mouse.
    <aside
      aria-label="Resume preview"
      tabIndex={0}
      className="space-y-3 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Preview</h2>
        {templateName && (
          <span className="text-muted-foreground text-xs">{templateName} template</span>
        )}
      </div>
      <div className="bg-muted/70 rounded-xl border p-4 sm:p-6">
        {/* aspect-ratio acts as a minimum height: a long resume simply grows the page. */}
        <div className="aspect-[210/297] w-full rounded-sm bg-white p-7 text-black shadow-md ring-1 ring-black/10 sm:p-10">
          <ResumeTemplate content={deferred} templateId={templateId} />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Approximate view of your resume. Empty sections are hidden.
      </p>
    </aside>
  );
}
