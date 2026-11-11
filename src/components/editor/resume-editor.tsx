"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { saveResumeAction } from "@/app/resumes/[id]/edit/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { findUnsupportedInResume, unsupportedCharsMessage } from "@/shared/pdf-charset";
import type { ResumeContent, TemplateId } from "@/shared/schema";
import { PreviewPanel } from "./preview-panel";
import { TemplatePicker } from "./template-picker";
import {
  CertificationsSection,
  ContactSection,
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
} from "./sections";

const AUTOSAVE_DELAY_MS = 1000;

/**
 * Debounced autosave.
 * - Saves AUTOSAVE_DELAY_MS after the last edit; only one save is in flight at a time.
 * - If edits land during a save, the next save is scheduled once it finishes.
 * - After a failed save it does not retry on its own (no error loops): it waits for the
 *   next edit, or for the user to press Save.
 */
type EditorState = { content: ResumeContent; templateId: TemplateId };

function useAutosave(id: string, state: EditorState) {
  const json = useMemo(() => JSON.stringify(state), [state]);
  const [savedJson, setSavedJson] = useState(json);
  const [failedJson, setFailedJson] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const dirty = json !== savedJson;
  const failed = failedJson === json;

  const save = useCallback(() => {
    startSaving(async () => {
      try {
        const result = await saveResumeAction(id, JSON.parse(json));
        if (result.ok) {
          setSavedJson(json);
          setFailedJson(undefined);
          setError(undefined);
        } else {
          setFailedJson(json);
          setError(result.error);
        }
      } catch {
        setFailedJson(json);
        setError("Could not reach the server. Check your connection and try again.");
      }
    });
  }, [id, json]);

  useEffect(() => {
    if (!dirty || saving || failed) return;
    const timer = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, saving, failed, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const status = saving
    ? "Saving…"
    : failed
      ? "Not saved"
      : dirty
        ? "Unsaved changes"
        : "All changes saved";

  return { status, error: failed ? error : undefined, saving, dirty, save };
}

export function ResumeEditor({
  id,
  title,
  initial,
  initialTemplateId,
  importNotice,
}: {
  id: string;
  title: string;
  initial: ResumeContent;
  initialTemplateId: TemplateId;
  /** Set when this resume was just imported from a file. */
  importNotice?: { itemsLeftOut: boolean };
}) {
  const [noticeOpen, setNoticeOpen] = useState(Boolean(importNotice));
  const [content, setContent] = useState(initial);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const state = useMemo(() => ({ content, templateId }), [content, templateId]);
  const { status, error, saving, dirty, save } = useAutosave(id, state);
  const unsupported = useMemo(() => findUnsupportedInResume(content), [content]);

  const set =
    <K extends keyof ResumeContent>(key: K) =>
    (value: ResumeContent[K]) =>
      setContent((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <header className="bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <Link href="/dashboard" className="text-muted-foreground text-xs hover:underline">
              ← All resumes
            </Link>
            <h1 className="truncate text-xl font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm" role="status" aria-live="polite">
              {status}
            </span>
            <Button
              onClick={save}
              disabled={saving || !dirty}
              variant={error ? "default" : "outline"}
            >
              {error ? "Retry save" : "Save now"}
            </Button>
            {saving || dirty || unsupported.length > 0 ? (
              <Button
                disabled
                title={
                  unsupported.length > 0
                    ? "Fix the unsupported characters first"
                    : "Available once your changes are saved"
                }
              >
                Download PDF
              </Button>
            ) : (
              <a
                href={`/api/resumes/${id}/export?format=pdf`}
                download
                className={buttonVariants()}
              >
                Download PDF
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          {error && (
            <p
              role="alert"
              className="text-destructive rounded-lg border border-current p-3 text-sm"
            >
              {error}
            </p>
          )}
          {importNotice && noticeOpen && (
            <div
              role="status"
              data-testid="import-notice"
              className="flex items-start justify-between gap-3 rounded-lg border border-blue-600 bg-blue-50 p-3 text-sm text-blue-950 dark:bg-blue-950 dark:text-blue-50"
            >
              <p>
                <strong>Imported from your file.</strong> AI can make mistakes, so check every
                section against your original before you use this resume.
                {importNotice.itemsLeftOut &&
                  " Some items could not be matched to your file and were left out, so look for anything missing."}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNoticeOpen(false)}
                aria-label="Dismiss import notice"
              >
                Dismiss
              </Button>
            </div>
          )}
          {unsupported.length > 0 && (
            <p
              role="alert"
              data-testid="unsupported-chars"
              className="rounded-lg border border-amber-600 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50"
            >
              {unsupportedCharsMessage(unsupported)}
            </p>
          )}
          <TemplatePicker value={templateId} onChange={setTemplateId} />
          <ContactSection value={content.contact} onChange={set("contact")} />
          <SummarySection value={content.summary} onChange={set("summary")} />
          <ExperienceSection value={content.experience} onChange={set("experience")} />
          <EducationSection value={content.education} onChange={set("education")} />
          <ProjectsSection value={content.projects} onChange={set("projects")} />
          <SkillsSection value={content.skills} onChange={set("skills")} />
          <CertificationsSection value={content.certifications} onChange={set("certifications")} />
        </div>

        {/* Stacks below the form on small screens; sticks beside it on large ones. */}
        <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <PreviewPanel content={content} templateId={templateId} />
        </div>
      </div>
    </div>
  );
}
