"use client";

import { useDeferredValue } from "react";
import { ClassicTemplate } from "@/components/templates/classic";
import type { ResumeContent } from "@/shared/schema";

/** Live preview. Deferred so typing stays instant even when the resume is long. */
export function PreviewPanel({ content }: { content: ResumeContent }) {
  const deferred = useDeferredValue(content);

  return (
    <aside aria-label="Resume preview" className="space-y-2">
      <h2 className="text-muted-foreground text-sm font-medium">Preview</h2>
      <div className="rounded-sm bg-white p-6 text-black shadow-md ring-1 ring-black/10 sm:p-8">
        <ClassicTemplate content={deferred} />
      </div>
      <p className="text-muted-foreground text-xs">
        Approximate view of your resume. Empty sections are hidden.
      </p>
    </aside>
  );
}
