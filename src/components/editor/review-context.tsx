"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { ImportReview } from "@/shared/import-review";
import type { ReviewTarget } from "./import-session";

type ReviewContextValue = {
  review: ImportReview | null;
  resolve: (target: ReviewTarget) => void;
};

const ReviewContext = createContext<ReviewContextValue>({ review: null, resolve: () => {} });

export const ReviewProvider = ({
  value,
  children,
}: {
  value: ReviewContextValue;
  children: ReactNode;
}) => <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;

/** Reasons to double-check one entry, plus a way to mark it as checked. */
export function useEntryReview(entryId: string) {
  const { review, resolve } = useContext(ReviewContext);
  return {
    reasons: review?.entries[entryId] ?? [],
    markChecked: () => resolve({ entryId }),
  };
}

export function useSectionReview(section: "contact" | "summary") {
  const { review, resolve } = useContext(ReviewContext);
  return { reasons: review?.[section] ?? [], markChecked: () => resolve(section) };
}

/** An amber note explaining why something imported deserves a second look. */
export function ReviewNote({
  reasons,
  onChecked,
  what,
}: {
  reasons: string[];
  onChecked: () => void;
  what: string;
}) {
  if (reasons.length === 0) return null;
  return (
    <Notice
      variant="warning"
      data-testid="review-note"
      className="flex flex-wrap items-start justify-between gap-3"
    >
      <div>
        <p className="font-medium">Check {what} against your original</p>
        <ul className="mt-1 list-disc pl-5">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onChecked}>
        Looks good
      </Button>
    </Notice>
  );
}
