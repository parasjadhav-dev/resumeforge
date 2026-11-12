"use client";

import { Check } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  computeProgress,
  EDITOR_SECTIONS,
  type EditorSectionKey,
  type SectionMeta,
} from "@/shared/resume-progress";
import type { ResumeContent } from "@/shared/schema";

export const sectionDomId = (key: EditorSectionKey) => `section-${key}`;

// ---------- shared open/closed state for the editor's sections ----------

type EditorUiValue = {
  meta: Record<EditorSectionKey, SectionMeta>;
  isOpen: (key: EditorSectionKey) => boolean;
  toggle: (key: EditorSectionKey) => void;
  setAll: (open: boolean) => void;
  /** Opens a section, scrolls it into view, and moves keyboard focus to its heading. */
  reveal: (key: EditorSectionKey) => void;
};

const EditorUiContext = createContext<EditorUiValue | null>(null);

const PHONE_QUERY = "(max-width: 1023px)";
const subscribePhone = (onChange: () => void) => {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isPhone = () =>
  typeof window.matchMedia === "function" && window.matchMedia(PHONE_QUERY).matches;

/**
 * Which sections are open. On large screens everything starts open. On phones everything starts
 * collapsed, so the first thing you see is an overview of the whole resume instead of one very
 * long form. Whatever the user opens or closes themselves always wins.
 */
export function EditorUiProvider({
  meta,
  children,
}: {
  meta: Record<EditorSectionKey, SectionMeta>;
  children: ReactNode;
}) {
  const [chosen, setChosen] = useState<Partial<Record<EditorSectionKey, boolean>>>({});
  // The server and the first client render agree (not a phone); then this updates if it is one.
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);

  const isOpen = useCallback((key: EditorSectionKey) => chosen[key] ?? !phone, [chosen, phone]);

  const toggle = useCallback(
    (key: EditorSectionKey) => setChosen((prev) => ({ ...prev, [key]: !(prev[key] ?? !phone) })),
    [phone],
  );

  const setAll = useCallback(
    (open: boolean) =>
      setChosen(Object.fromEntries(EDITOR_SECTIONS.map((s) => [s.key, open])) as typeof chosen),
    [],
  );

  const reveal = useCallback((key: EditorSectionKey) => {
    flushSync(() => setChosen((prev) => ({ ...prev, [key]: true }))); // it must be open before we scroll
    const section = document.getElementById(sectionDomId(key));
    if (!section) return;
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    section.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    section.querySelector<HTMLElement>("h2 button")?.focus({ preventScroll: true });
  }, []);

  const value = useMemo(
    () => ({ meta, isOpen, toggle, setAll, reveal }),
    [meta, isOpen, toggle, setAll, reveal],
  );
  return <EditorUiContext.Provider value={value}>{children}</EditorUiContext.Provider>;
}

export function useEditorUi(): EditorUiValue {
  const value = useContext(EditorUiContext);
  if (!value) throw new Error("useEditorUi must be used inside <EditorUiProvider>");
  return value;
}

// ---------- small pieces ----------

/** A filled dot for a finished section, an empty ring for one with nothing in it yet. */
export function StatusDot({ done, className }: { done: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        done ? "bg-emerald-500" : "ring-input bg-transparent ring-1 ring-inset",
        className,
      )}
    />
  );
}

/** Sticky row of links that jump to any section, opening it first if it is collapsed. */
export function SectionNav() {
  const { meta, reveal } = useEditorUi();
  return (
    <nav
      aria-label="Jump to section"
      className="bg-background/90 sticky top-[var(--editor-header)] z-20 -mx-1 px-1 backdrop-blur-md"
    >
      {/* relative: the chips contain visually-hidden (position: absolute) text, which must stay
          inside this scroller instead of escaping it and making the whole page scroll sideways. */}
      <ul className="relative flex [scrollbar-width:none] gap-1.5 overflow-x-auto py-2">
        {EDITOR_SECTIONS.map(({ key, label }) => (
          <li key={key} className="shrink-0">
            <a
              href={`#${sectionDomId(key)}`}
              onClick={(event) => {
                event.preventDefault();
                reveal(key);
              }}
              className="hover:bg-muted bg-card flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors"
            >
              {key !== "template" && <StatusDot done={meta[key].done} className="size-2" />}
              {label}
              {key !== "template" && (
                <span className="sr-only">{meta[key].done ? ", has content" : ", empty"}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** How close the resume is to complete, with a one-click way to open or close every section. */
export function ProgressSummary({ content }: { content: ResumeContent }) {
  const { setAll } = useEditorUi();
  const progress = computeProgress(content);

  return (
    <section
      aria-labelledby="progress-heading"
      className="bg-card shadow-card space-y-3 rounded-xl border p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="progress-heading" className="font-semibold">
            Resume progress
          </h2>
          <p className="text-muted-foreground text-sm">
            {progress.done} of {progress.total} essentials done
          </p>
        </div>
        <span className="text-2xl font-semibold tabular-nums" aria-hidden="true">
          {progress.percent}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Resume progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <ul className="flex flex-wrap gap-1.5 text-xs">
        {progress.requirements.map((r) => (
          <li
            key={r.key}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5",
              r.done
                ? "bg-success text-success-foreground border-success-border"
                : "text-muted-foreground",
            )}
          >
            {r.done ? (
              <Check className="size-3" aria-hidden="true" />
            ) : (
              <StatusDot done={false} className="size-2" />
            )}
            {r.label}
            <span className="sr-only">{r.done ? ": done" : ": still to do"}</span>
          </li>
        ))}
      </ul>

      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setAll(true)}>
          Expand all
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)}>
          Collapse all
        </Button>
      </div>
    </section>
  );
}

/** Phone-only switch between the form and the preview. */
export function ViewSwitch({
  view,
  onChange,
  className,
}: {
  view: "edit" | "preview";
  onChange: (view: "edit" | "preview") => void;
  className?: string;
}) {
  const options = [
    { value: "edit", label: "Edit" },
    { value: "preview", label: "Preview" },
  ] as const;
  return (
    <div
      role="group"
      aria-label="Editor view"
      className={cn("bg-muted grid grid-cols-2 gap-1 rounded-lg p-1", className)}
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={cn(
            "rounded-md py-1.5 text-sm font-medium transition-colors",
            view === value ? "bg-card text-foreground shadow-card" : "text-muted-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
