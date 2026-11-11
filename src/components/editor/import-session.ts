"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { importSessionSchema, type ImportReview, type ImportSession } from "@/shared/import-review";

/**
 * Review state for a freshly imported resume lives in sessionStorage: it is private to this
 * browser tab, disappears when the tab closes, and is never sent back to the server.
 */
const keyFor = (id: string) => `rf-import:${id}`;
const CHANGE_EVENT = "rf-import-change";

function read(id: string): string | null {
  try {
    return sessionStorage.getItem(keyFor(id));
  } catch {
    return null; // storage can be blocked (private mode, policies)
  }
}

function write(id: string, session: ImportSession | null) {
  try {
    if (session) sessionStorage.setItem(keyFor(id), JSON.stringify(session));
    else sessionStorage.removeItem(keyFor(id));
  } catch {
    // Not fatal: review hints just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveImportSession(id: string, session: ImportSession) {
  write(id, session);
}

function parse(raw: string | null): ImportSession | null {
  if (!raw) return null;
  try {
    const result = importSessionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null; // ignore anything that is not our shape
  } catch {
    return null;
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

export type ReviewTarget = "contact" | "summary" | { entryId: string };

export function useImportSession(id: string, enabled: boolean) {
  const raw = useSyncExternalStore(
    subscribe,
    () => (enabled ? read(id) : null),
    () => null, // the server and the first client render agree: nothing yet
  );
  const session = useMemo(() => parse(raw), [raw]);

  const resolve = useCallback(
    (target: ReviewTarget) => {
      const current = parse(read(id));
      if (!current) return;
      const review: ImportReview = {
        ...current.review,
        entries: { ...current.review.entries },
      };
      if (target === "contact") review.contact = [];
      else if (target === "summary") review.summary = [];
      else delete review.entries[target.entryId];
      write(id, { ...current, review });
    },
    [id],
  );

  return { session, resolve };
}
