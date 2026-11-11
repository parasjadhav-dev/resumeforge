"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

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
      const skipped = Array.isArray(data.warnings) && data.warnings.length > 0 ? 1 : 0;
      router.push(`/resumes/${data.id}/edit?imported=1${skipped ? "&check=1" : ""}`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border p-3">
      <div className="space-y-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          Import an existing resume
        </label>
        <p className="text-muted-foreground text-xs">
          PDF or DOCX, up to 5 MB. We read it with AI, then you review and fix anything in the
          editor. The file is not stored.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={busy}
          className="border-input bg-background min-w-0 flex-1 rounded-lg border px-2.5 py-1 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
        <Button type="submit" disabled={busy}>
          {busy ? "Reading your resume…" : "Import"}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-muted-foreground text-xs">
        {busy ? "This usually takes 5 to 15 seconds. Please keep this page open." : ""}
      </p>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
