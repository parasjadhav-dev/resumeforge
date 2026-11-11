"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { saveResumeAction } from "@/app/resumes/[id]/edit/actions";
import { Logo } from "@/components/brand/logo";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { countReviewItems } from "@/shared/import-review";
import { findUnsupportedInResume, unsupportedCharsMessage } from "@/shared/pdf-charset";
import type { ResumeContent, TemplateId } from "@/shared/schema";
import { useImportSession } from "./import-session";
import { PreviewPanel } from "./preview-panel";
import { ReviewProvider } from "./review-context";
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
  userMenu,
}: {
  id: string;
  title: string;
  initial: ResumeContent;
  initialTemplateId: TemplateId;
  /** Set when this resume was just imported from a file. */
  importNotice?: { itemsLeftOut: boolean };
  /** The account menu, supplied by the server page (it needs the session and sign-out action). */
  userMenu?: ReactNode;
}) {
  const [noticeOpen, setNoticeOpen] = useState(Boolean(importNotice));
  const [content, setContent] = useState(initial);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const state = useMemo(() => ({ content, templateId }), [content, templateId]);
  const { status, error, saving, dirty, save } = useAutosave(id, state);
  const unsupported = useMemo(() => findUnsupportedInResume(content), [content]);
  const { session, resolve } = useImportSession(id, Boolean(importNotice));
  const reviewCount = session ? countReviewItems(session.review) : 0;

  const set =
    <K extends keyof ResumeContent>(key: K) =>
    (value: ResumeContent[K]) =>
      setContent((prev) => ({ ...prev, [key]: value }));

  return (
    <ReviewProvider value={{ review: session?.review ?? null, resolve }}>
      <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
        <PageContainer
          size="wide"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/dashboard" showWordmark={false} />
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                Your resumes
              </Link>
              <span className="text-muted-foreground" aria-hidden="true">
                /
              </span>
              <h1 className="truncate text-base font-semibold">{title}</h1>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle />
            <span
              className="text-muted-foreground flex items-center gap-2 text-sm"
              role="status"
              aria-live="polite"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  saving && "animate-pulse bg-amber-500",
                  !saving && error && "bg-red-500",
                  !saving && !error && dirty && "bg-amber-500",
                  !saving && !error && !dirty && "bg-emerald-500",
                )}
              />
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
            {userMenu}
          </div>
        </PageContainer>
      </header>

      {/* Form beside a page-shaped preview. The form keeps a readable width; the preview gets the rest. */}
      <PageContainer
        size="wide"
        className="grid gap-6 py-6 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)]"
      >
        <div className="space-y-5">
          {error && (
            <Notice variant="danger" role="alert">
              {error}
            </Notice>
          )}
          {importNotice && noticeOpen && (
            <Notice
              variant="info"
              role="status"
              data-testid="import-notice"
              className="flex items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-2">
                <p>
                  <strong>Imported from your file.</strong> AI can make mistakes, so check every
                  section against your original before you use this resume.
                  {importNotice.itemsLeftOut &&
                    " Some items could not be matched to your file and were left out, so look for anything missing."}
                </p>
                {reviewCount > 0 && (
                  <p data-testid="review-count" className="font-medium">
                    {reviewCount} {reviewCount === 1 ? "item needs" : "items need"} a closer look.
                    They are marked below.
                  </p>
                )}
                {session?.sourceText && (
                  <details data-testid="import-source">
                    <summary className="cursor-pointer font-medium">
                      Original text from your file
                    </summary>
                    <pre className="border-info-border bg-card text-card-foreground mt-2 max-h-72 overflow-auto rounded-md border p-2 font-mono text-xs whitespace-pre-wrap">
                      {session.sourceText}
                    </pre>
                    <p className="mt-1 text-xs">
                      Shown only in this browser tab. It is not saved, and it disappears when you
                      close the tab.
                    </p>
                  </details>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNoticeOpen(false)}
                aria-label="Dismiss import notice"
              >
                Dismiss
              </Button>
            </Notice>
          )}
          {unsupported.length > 0 && (
            <Notice variant="warning" role="alert" data-testid="unsupported-chars">
              {unsupportedCharsMessage(unsupported)}
            </Notice>
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
        <PreviewPanel content={content} templateId={templateId} />
      </PageContainer>
    </ReviewProvider>
  );
}
