"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/textarea";
import { analyzeJobInput, MAX_JOB_CHARS, MIN_JOB_CHARS } from "@/shared/job-input";
import { JobAnalysisView, type AnalysisResult } from "./job-analysis-view";
import { useJobDraft } from "./use-job-draft";

type Status = "editing" | "analysing" | "done";

export function TailorWorkspace({ resumeId }: { resumeId: string }) {
  const { draft, update } = useJobDraft(resumeId);
  const [status, setStatus] = useState<Status>("editing");
  const [result, setResult] = useState<AnalysisResult>();
  const [error, setError] = useState<string>();
  const [showFieldError, setShowFieldError] = useState(false);

  const ids = { title: useId(), company: useId(), description: useId() };
  const length = draft.jobDescription.trim().length;
  const check = analyzeJobInput.safeParse(draft);
  const fieldError = !check.success
    ? check.error.issues.find((i) => i.path[0] === "jobDescription")?.message
    : undefined;

  async function analyse(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    if (!check.success) {
      setShowFieldError(true);
      return;
    }

    setStatus("analysing");
    try {
      const response = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobDescription: draft.jobDescription,
          jobTitle: draft.jobTitle,
          company: draft.company,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          data.issues?.[0]?.message ?? data.error ?? "Something went wrong. Please try again.",
        );
        setStatus("editing");
        return;
      }
      setResult(data as AnalysisResult);
      setStatus("done");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setStatus("editing");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="space-y-6">
        <JobAnalysisView result={result} />
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setStatus("editing")}>
            Edit the job description
          </Button>
        </div>
      </div>
    );
  }

  const analysing = status === "analysing";
  const tooLong = length > MAX_JOB_CHARS;

  return (
    <form onSubmit={analyse} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={ids.title}>Job title (optional)</Label>
          <Input
            id={ids.title}
            value={draft.jobTitle}
            onChange={(e) => update({ jobTitle: e.target.value })}
            maxLength={200}
            disabled={analysing}
            placeholder="Backend Developer"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={ids.company}>Company (optional)</Label>
          <Input
            id={ids.company}
            value={draft.company}
            onChange={(e) => update({ company: e.target.value })}
            maxLength={200}
            disabled={analysing}
            placeholder="Acme Corp"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={ids.description}>Job description</Label>
        <Textarea
          id={ids.description}
          value={draft.jobDescription}
          onChange={(e) => update({ jobDescription: e.target.value })}
          rows={14}
          disabled={analysing}
          placeholder="Paste the full job posting here: the responsibilities, requirements, and anything it says about preferred skills."
          aria-invalid={showFieldError && Boolean(fieldError)}
          aria-describedby={`${ids.description}-help`}
        />
        <div
          id={`${ids.description}-help`}
          className="flex flex-wrap items-start justify-between gap-2 text-xs"
        >
          <p
            role={showFieldError && fieldError ? "alert" : undefined}
            className={showFieldError && fieldError ? "text-destructive" : "text-muted-foreground"}
          >
            {showFieldError && fieldError
              ? fieldError
              : `At least ${MIN_JOB_CHARS} characters. Include the requirements and nice-to-haves.`}
          </p>
          <p className={tooLong ? "text-destructive" : "text-muted-foreground"}>
            {length.toLocaleString("en-US")} / {MAX_JOB_CHARS.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {error && (
        <Notice variant="danger" role="alert">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={analysing} className="h-10 px-5">
          {analysing ? "Reading the job description…" : "Analyze job"}
        </Button>
        <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
          {analysing ? "This usually takes 5 to 15 seconds. Please keep this page open." : ""}
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        The job description is sent to our AI provider to be analysed. We keep only the analysis,
        never the text you paste.
      </p>
    </form>
  );
}
