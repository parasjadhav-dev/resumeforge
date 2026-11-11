import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { LlmError, type GenerateJsonInput, type LlmClient } from "./types";

/** The slice of the Gemini SDK we use, so tests can supply a fake. */
export type GeminiModels = {
  models: {
    generateContent(params: {
      model: string;
      contents: string;
      config: Record<string, unknown>;
    }): Promise<{ text?: string }>;
  };
};

type Options = {
  apiKey?: string;
  model: string;
  /** Inject a fake SDK in tests. */
  ai?: GeminiModels;
  /** Extra attempts after the first (rate limits, server errors, invalid output). */
  retries?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/** Zod -> the JSON Schema dialect Gemini accepts (it rejects the `$schema` key). */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

const statusOf = (err: unknown): number | undefined =>
  typeof (err as { status?: unknown })?.status === "number"
    ? (err as { status: number }).status
    : undefined;

export function createGeminiClient(options: Options): LlmClient {
  const { model, retries = 2, timeoutMs = 45_000 } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const ai: GeminiModels =
    options.ai ?? (new GoogleGenAI({ apiKey: options.apiKey }) as unknown as GeminiModels);

  async function callOnce(
    input: GenerateJsonInput<unknown>,
    jsonSchema: Record<string, unknown>,
    withThinkingConfig: boolean,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await ai.models.generateContent({
        model,
        contents: input.prompt,
        config: {
          systemInstruction: input.system,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0,
          maxOutputTokens: input.maxOutputTokens ?? 8192,
          abortSignal: controller.signal,
          // Extraction needs no deep reasoning; keep it fast and cheap.
          ...(withThinkingConfig && { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }),
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async generateJson<T>(input: GenerateJsonInput<T>): Promise<T> {
      const jsonSchema = toGeminiJsonSchema(input.schema);
      let withThinkingConfig = true;
      let lastError: unknown;

      for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
        try {
          const response = await callOnce(
            input as GenerateJsonInput<unknown>,
            jsonSchema,
            withThinkingConfig,
          );
          const text = response.text?.trim();
          if (!text) throw new LlmError("The AI returned an empty response.");

          const parsed = input.schema.safeParse(JSON.parse(text));
          if (parsed.success) return parsed.data;
          throw new LlmError("The AI returned data in an unexpected shape.", {
            cause: parsed.error,
          });
        } catch (err) {
          lastError = err;
          const status = statusOf(err);

          // Some models reject a thinking setting; retry the same attempt without it.
          if (
            status === 400 &&
            withThinkingConfig &&
            /think/i.test(String((err as Error).message))
          ) {
            withThinkingConfig = false;
            attempt--;
            continue;
          }
          if (status !== undefined && !RETRYABLE_STATUS.has(status)) {
            const hint =
              status === 401 || status === 403
                ? "The AI service rejected the API key. Check GEMINI_API_KEY."
                : "The AI service rejected the request.";
            throw new LlmError(hint, { cause: err });
          }
          // Everything else (rate limit, server error, timeout, bad JSON) is worth another try.
        }
      }

      if (lastError instanceof LlmError) throw lastError;
      throw new LlmError("The AI service is unavailable right now. Please try again.", {
        cause: lastError,
      });
    },
  };
}
