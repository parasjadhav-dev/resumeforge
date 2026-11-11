import { createGeminiClient } from "./gemini";
import { LlmNotConfiguredError, type LlmClient } from "./types";

export * from "./types";
export { createGeminiClient } from "./gemini";

// Current stable low-cost model; override with GEMINI_MODEL.
const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const globalForLlm = globalThis as unknown as { llm?: LlmClient; llmKey?: string };

/** The app's LLM client. Throws LlmNotConfiguredError when no API key is set. */
export function getLlm(): LlmClient {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmNotConfiguredError();

  if (!globalForLlm.llm || globalForLlm.llmKey !== apiKey) {
    globalForLlm.llm = createGeminiClient({
      apiKey,
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    });
    globalForLlm.llmKey = apiKey;
  }
  return globalForLlm.llm;
}
