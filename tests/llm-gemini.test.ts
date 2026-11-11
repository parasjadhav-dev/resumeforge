import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createGeminiClient, toGeminiJsonSchema } from "@/lib/llm/gemini";
import { LlmError } from "@/lib/llm";
import { parsedResumeSchema } from "@/modules/import/parse";

const schema = z.object({ name: z.string(), age: z.number() });
const input = { system: "SYSTEM RULES", prompt: "the task", schema };

class FakeApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

/** Builds a client whose SDK replies come from `replies` in order (a value, or an Error to throw). */
function setup(replies: Array<{ text?: string } | Error>, options = {}) {
  const generateContent = vi.fn(async () => {
    const next = replies.shift();
    if (next === undefined) throw new Error("test ran out of replies");
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = vi.fn(async () => {});
  const client = createGeminiClient({
    model: "test-model",
    ai: { models: { generateContent } },
    sleep,
    ...options,
  });
  return { client, generateContent, sleep };
}

const ok = (value: unknown) => ({ text: JSON.stringify(value) });

describe("Gemini client", () => {
  it("returns validated JSON from the model", async () => {
    const { client } = setup([ok({ name: "Asha", age: 21 })]);
    await expect(client.generateJson(input)).resolves.toEqual({ name: "Asha", age: 21 });
  });

  it("sends the schema, instructions, and deterministic settings", async () => {
    const { client, generateContent } = setup([ok({ name: "A", age: 1 })]);
    await client.generateJson({ ...input, maxOutputTokens: 1234 });

    const call = generateContent.mock.calls[0] as unknown as [
      { model: string; contents: string; config: Record<string, unknown> },
    ];
    const { model, contents, config } = call[0];
    expect(model).toBe("test-model");
    expect(contents).toBe("the task");
    expect(config.systemInstruction).toBe("SYSTEM RULES");
    expect(config.responseMimeType).toBe("application/json");
    expect(config.temperature).toBe(0);
    expect(config.maxOutputTokens).toBe(1234);
    expect(config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(config.thinkingConfig).toBeDefined();
    // Untrusted task text never leaks into the instructions, and vice versa.
    expect(JSON.stringify(config)).not.toContain("the task");

    const jsonSchema = config.responseJsonSchema as Record<string, unknown>;
    expect(jsonSchema.type).toBe("object");
    expect(jsonSchema.required).toEqual(["name", "age"]);
    expect(jsonSchema).not.toHaveProperty("$schema");
  });

  it("retries rate limits and server errors with growing delays", async () => {
    const { client, generateContent, sleep } = setup([
      new FakeApiError(429),
      new FakeApiError(503),
      ok({ name: "Asha", age: 21 }),
    ]);
    await expect(client.generateJson(input)).resolves.toEqual({ name: "Asha", age: 21 });
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((c) => (c as unknown as [number])[0])).toEqual([500, 1000]);
  });

  it("gives up after the retry budget with a friendly error", async () => {
    const { client, generateContent } = setup([
      new FakeApiError(503),
      new FakeApiError(503),
      new FakeApiError(503),
    ]);
    await expect(client.generateJson(input)).rejects.toThrow(/unavailable right now/i);
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("does not retry a rejected API key, and points at the setting", async () => {
    for (const status of [401, 403]) {
      const { client, generateContent } = setup([new FakeApiError(status)]);
      const err = await client.generateJson(input).catch((e) => e);
      expect(err).toBeInstanceOf(LlmError);
      expect(err.message).toMatch(/GEMINI_API_KEY/);
      expect(generateContent).toHaveBeenCalledTimes(1);
    }
  });

  it("does not retry other client errors", async () => {
    const { client, generateContent } = setup([new FakeApiError(400, "Bad schema")]);
    await expect(client.generateJson(input)).rejects.toThrow(/rejected the request/i);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("retries malformed JSON and wrong-shaped output", async () => {
    const { client, generateContent } = setup([
      { text: "not json at all" },
      ok({ name: "Asha" }), // missing age
      ok({ name: "Asha", age: 21 }),
    ]);
    await expect(client.generateJson(input)).resolves.toEqual({ name: "Asha", age: 21 });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it("fails clearly when the model keeps returning bad output", async () => {
    const { client } = setup([ok({ nope: 1 }), ok({ nope: 2 }), ok({ nope: 3 })]);
    await expect(client.generateJson(input)).rejects.toThrow(/unexpected shape/i);
  });

  it("treats an empty reply (for example a blocked response) as a failure", async () => {
    const { client } = setup([{ text: "" }, {}, { text: "   " }]);
    await expect(client.generateJson(input)).rejects.toThrow(/empty response/i);
  });

  it("drops the thinking setting if a model rejects it, without using up a retry", async () => {
    const { client, generateContent } = setup(
      [
        new FakeApiError(400, "thinking level is not supported by this model"),
        ok({ name: "A", age: 1 }),
      ],
      { retries: 0 },
    );
    await expect(client.generateJson(input)).resolves.toEqual({ name: "A", age: 1 });

    const calls = generateContent.mock.calls as unknown as Array<
      [{ config: Record<string, unknown> }]
    >;
    expect(calls[0][0].config.thinkingConfig).toBeDefined();
    expect(calls[1][0].config.thinkingConfig).toBeUndefined();
  });

  it("aborts a request that takes too long, then retries", async () => {
    let first = true;
    const generateContent = vi.fn(async (params: { config: { abortSignal: AbortSignal } }) => {
      if (first) {
        first = false;
        await new Promise((_, reject) =>
          params.config.abortSignal.addEventListener("abort", () => reject(new Error("aborted"))),
        );
      }
      return ok({ name: "A", age: 1 });
    });
    const client = createGeminiClient({
      model: "m",
      ai: { models: { generateContent: generateContent as never } },
      timeoutMs: 20,
      sleep: async () => {},
    });
    await expect(client.generateJson(input)).resolves.toEqual({ name: "A", age: 1 });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe("toGeminiJsonSchema", () => {
  it("produces a plain object schema for the resume parser, requiring every field", () => {
    const json = toGeminiJsonSchema(parsedResumeSchema) as {
      type: string;
      required: string[];
      properties: Record<string, unknown>;
    };
    expect(json.type).toBe("object");
    expect(json).not.toHaveProperty("$schema");
    expect(json.required).toEqual(
      expect.arrayContaining([
        "contact",
        "summary",
        "experience",
        "education",
        "projects",
        "skills",
        "certifications",
      ]),
    );
    expect(Object.keys(json.properties)).toHaveLength(7);
  });
});
