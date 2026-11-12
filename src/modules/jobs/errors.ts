export type JobErrorCode = "AI_UNAVAILABLE" | "AI_FAILED";

/** A problem analysing a job, with a message that is safe and useful to show the user. */
export class JobError extends Error {
  constructor(
    public readonly code: JobErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "JobError";
  }
}

export const jobErrors = {
  aiUnavailable: () =>
    new JobError(
      "AI_UNAVAILABLE",
      "Analysing a job needs AI, which isn't set up on this server yet.",
      503,
    ),
  aiFailed: () =>
    new JobError(
      "AI_FAILED",
      "We couldn't analyse that job description just now. Please try again in a moment.",
      502,
    ),
};
