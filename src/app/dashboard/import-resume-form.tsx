"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { saveImportSession } from "@/components/editor/import-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importSessionSchema } from "@/shared/import-review";

const MAX_BYTES = 5 * 1024 * 1024;

/** Upload a PDF or DOCX; the server reads it with AI and opens the result in the editor. */
export function ImportResumeForm() {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    const file = inputRef.current?.files?.[0];
    if (!file) return setError("Choose a PDF or DOCX file to import.");
    if (file.size > MAX_BYTES) return setError("That file is too large. The limit is 5 MB.");

    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/resumes/import", { method: "POST", body });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong while importing. Please try again.");
        setBusy(false);
        return;
      }
      // Kept in this tab only, so the editor can show what to double-check and the original text.
      const parsed = importSessionSchema.safeParse({
        review: data.review,
        sourceText: data.sourceText,
      });
      if (parsed.success) saveImportSession(data.id, parsed.data);

      const skipped = Array.isArray(data.warnings) && data.warnings.length > 0 ? 1 : 0;
      router.push(`/resumes/${data.id}/edit?imported=1${skipped ? "&check=1" : ""}`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-card shadow-card flex h-full flex-col gap-4 rounded-xl border p-5"
    >
      <div className="flex items-start gap-3">
        <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Upload className="size-5" aria-hidden="true" />
        </span>
        <div className="space-y-0.5">
          <label htmlFor={inputId} className="block font-semibold">
            Import an existing resume
          </label>
          <p className="text-muted-foreground text-sm">
            PDF or DOCX, up to 5 MB. We read it with AI and you review the result. The file is not
            stored.
          </p>
        </div>
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex flex-wrap gap-2">
          <Input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={busy}
            className="min-w-0 flex-1 cursor-pointer"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Reading your resume…" : "Import"}
          </Button>
        </div>
        {/* Takes no space until there is something to say, so both create cards line up. */}
        <p
          role="status"
          aria-live="polite"
          className={busy ? "text-muted-foreground text-xs" : "sr-only"}
        >
          {busy ? "This usually takes 5 to 15 seconds. Please keep this page open." : ""}
        </p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
