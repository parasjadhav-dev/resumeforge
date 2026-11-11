import { z } from "zod";

/**
 * What the editor shows while the user reviews an imported resume: reasons per entry
 * (keyed by the entry's id), plus notes for the contact block and the summary.
 */
export const importReviewSchema = z.object({
  contact: z.array(z.string()),
  summary: z.array(z.string()),
  entries: z.record(z.string(), z.array(z.string())),
});
export type ImportReview = z.infer<typeof importReviewSchema>;

/** Held in the browser tab only (never on the server) while the user reviews an import. */
export const importSessionSchema = z.object({
  review: importReviewSchema,
  sourceText: z.string(),
});
export type ImportSession = z.infer<typeof importSessionSchema>;

export const countReviewItems = (review: ImportReview): number =>
  (review.contact.length ? 1 : 0) +
  (review.summary.length ? 1 : 0) +
  Object.keys(review.entries).length;
