"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

/**
 * The job details a user is typing, kept in this browser tab only (sessionStorage), so a reload
 * or an accidental navigation does not lose a long pasted description. Never sent anywhere
 * until the user analyses it, and gone when the tab closes.
 */
const draftSchema = z.object({
  jobTitle: z.string(),
  company: z.string(),
  jobDescription: z.string(),
});
export type JobDraft = z.infer<typeof draftSchema>;

const EMPTY: JobDraft = { jobTitle: "", company: "", jobDescription: "" };
const CHANGE_EVENT = "rf-job-draft-change";
const keyFor = (resumeId: string) => `rf-job:${resumeId}`;

// Used when browser storage is blocked, so typing still works (the draft just won't survive a reload).
const memory = new Map<string, string>();

function read(resumeId: string): string | null {
  try {
    const stored = sessionStorage.getItem(keyFor(resumeId));
    if (stored !== null) return stored;
  } catch {
    // storage can be blocked (private mode, policies)
  }
  return memory.get(resumeId) ?? null;
}

function parse(raw: string | null): JobDraft {
  if (!raw) return EMPTY;
  try {
    const result = draftSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : EMPTY;
  } catch {
    return EMPTY;
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};

export function useJobDraft(resumeId: string) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(resumeId),
    () => null, // the server and the first client render agree: an empty form
  );
  const draft = useMemo(() => parse(raw), [raw]);

  const update = useCallback(
    (patch: Partial<JobDraft>) => {
      const serialized = JSON.stringify({ ...parse(read(resumeId)), ...patch });
      memory.set(resumeId, serialized);
      try {
        sessionStorage.setItem(keyFor(resumeId), serialized);
      } catch {
        // Not fatal: the in-memory copy keeps the form working.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [resumeId],
  );

  return { draft, update };
}
