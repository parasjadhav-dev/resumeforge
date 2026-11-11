import type { z } from "zod";

/** The AI provider key is missing. Features that need AI should show a friendly message. */
export class LlmNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured on this server.");
    this.name = "LlmNotConfiguredError";
  }
}

/** The AI provider failed (after retries) or returned something unusable. */
export class LlmError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmError";
  }
}

export type GenerateJsonInput<T> = {
  /** Fixed instructions. Untrusted content (a resume, a job post) must never go in here. */
  system: string;
  /** The task input, including any untrusted text. */
  prompt: string;
  /** Every response is validated against this before it is returned. */
  schema: z.ZodType<T>;
  maxOutputTokens?: number;
};

/** Provider-neutral interface; the app depends on this, not on any vendor SDK. */
export interface LlmClient {
  generateJson<T>(input: GenerateJsonInput<T>): Promise<T>;
}
