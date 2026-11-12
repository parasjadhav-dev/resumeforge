import "dotenv/config";
import { ZodError } from "zod";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { LlmError, type LlmClient } from "@/lib/llm";
import { hashJobText } from "@/modules/jobs/analyze";
import { JobError, jobService } from "@/modules/jobs";
import { jobAnalysisCache, type JobAnalysisCache } from "@/modules/jobs/repository";
import { jobAnalysisSchema, type JobAnalysis } from "@/modules/jobs/schemas";

const POSTING = `Junior Backend Developer at Acme Corp. You will build and maintain REST APIs in Python
and work with a PostgreSQL database. Requirements: a bachelor's degree, 1+ years of experience with
Python, and familiarity with Git. Nice to have: experience with AWS. You will design and implement
APIs and write automated tests for new features.`;

const analysis = (overrides: Partial<JobAnalysis> = {}): JobAnalysis => ({
  title: "Junior Backend Developer",
  company: "Acme Corp",
  seniority: "entry",
  educationRequired: "bachelor",
  minYearsExperience: 1,
  requiredSkills: ["Python", "REST APIs", "PostgreSQL", "Git"],
  preferredSkills: ["AWS"],
  keywords: [],
  responsibilities: ["write automated tests for new features"],
  ...overrides,
});

const llmReturning = (value: unknown) => {
  const generateJson = vi.fn(async ({ schema }: { schema: { parse: (v: unknown) => unknown } }) =>
    schema.parse(value),
  );
  return { llm: { generateJson } as unknown as LlmClient, generateJson };
};

/** An in-memory stand-in for the database cache, so most tests need no database. */
function memoryCache(): JobAnalysisCache & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
    get: async (hash) => store.get(hash) ?? null,
    set: async (hash, value) => void store.set(hash, value),
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("jobService.analyze: caching", () => {
  it("asks the AI once, then answers the same posting from the cache", async () => {
    const cache = memoryCache();
    const { llm, generateJson } = llmReturning(analysis());

    const first = await jobService.analyze({ jobDescription: POSTING }, { llm, cache });
    expect(first.cached).toBe(false);
    expect(first.analysis.requiredSkills).toContain("Python");
    expect(generateJson).toHaveBeenCalledTimes(1);

    const second = await jobService.analyze({ jobDescription: POSTING }, { llm, cache });
    expect(second.cached).toBe(true);
    expect(second.analysis).toEqual(first.analysis);
    expect(generateJson).toHaveBeenCalledTimes(1); // no second AI call
  });

  it("recognises the same posting pasted with different spacing and capitalisation", async () => {
    const cache = memoryCache();
    const { llm, generateJson } = llmReturning(analysis());
    await jobService.analyze({ jobDescription: POSTING }, { llm, cache });

    const messy = POSTING.replace(/\n/g, "\r\n\r\n\r\n").replace(/ /g, "  ").toUpperCase();
    const again = await jobService.analyze({ jobDescription: messy }, { llm, cache });
    expect(again.cached).toBe(true);
    expect(generateJson).toHaveBeenCalledTimes(1);
  });

  it("analyses a different posting afresh", async () => {
    const cache = memoryCache();
    const { llm, generateJson } = llmReturning(analysis());
    await jobService.analyze({ jobDescription: POSTING }, { llm, cache });
    await jobService.analyze(
      { jobDescription: `${POSTING} Also: strong communication.` },
      { llm, cache },
    );
    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(cache.store.size).toBe(2);
  });

  it("stores only the analysis under a hash: never the posting text", async () => {
    const cache = memoryCache();
    const { llm } = llmReturning(analysis());
    await jobService.analyze(
      { jobDescription: POSTING, jobTitle: "My secret title" },
      { llm, cache },
    );

    const [[key, value]] = [...cache.store.entries()];
    expect(key).toBe(hashJobText(POSTING));
    expect(jobAnalysisSchema.safeParse(value).success).toBe(true);
    const stored = JSON.stringify([...cache.store.entries()]);
    expect(stored).not.toContain("maintain REST APIs in Python"); // a phrase from the posting
    expect(stored).not.toContain("My secret title"); // what the user typed
  });

  it("still analyses when the cache cannot be read, and when it cannot be written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const broken: JobAnalysisCache = {
      get: async () => {
        throw new Error("db down");
      },
      set: async () => {
        throw new Error("db down");
      },
    };
    const { llm } = llmReturning(analysis());
    const result = await jobService.analyze({ jobDescription: POSTING }, { llm, cache: broken });
    expect(result.cached).toBe(false);
    expect(result.analysis.requiredSkills).toContain("Python");
  });

  it("ignores a damaged cache entry and replaces it", async () => {
    const cache = memoryCache();
    cache.store.set(hashJobText(POSTING), { requiredSkills: "not a list" });
    const { llm, generateJson } = llmReturning(analysis());

    const result = await jobService.analyze({ jobDescription: POSTING }, { llm, cache });
    expect(result.cached).toBe(false);
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(jobAnalysisSchema.safeParse(cache.store.get(hashJobText(POSTING))).success).toBe(true);
  });
});

describe("jobService.analyze: results", () => {
  it("never returns skills the posting does not contain", async () => {
    const { llm } = llmReturning(
      analysis({ requiredSkills: ["Python", "Kubernetes"], keywords: ["blockchain"] }),
    );
    const { analysis: result } = await jobService.analyze(
      { jobDescription: POSTING },
      { llm, cache: memoryCache() },
    );
    expect(result.requiredSkills).toEqual(["Python"]);
    expect(result.keywords).toEqual([]);
  });

  it("shows the title and company the user typed, else what the posting says", async () => {
    const { llm } = llmReturning(analysis());
    const cache = memoryCache();

    const typed = await jobService.analyze(
      { jobDescription: POSTING, jobTitle: "  Platform Engineer ", company: "Initech" },
      { llm, cache },
    );
    expect(typed.jobTitle).toBe("Platform Engineer");
    expect(typed.company).toBe("Initech");

    const fromPosting = await jobService.analyze({ jobDescription: POSTING }, { llm, cache });
    expect(fromPosting.jobTitle).toBe("Junior Backend Developer");
    expect(fromPosting.company).toBe("Acme Corp");
  });

  it("does not let a typed title change the cached analysis for everyone else", async () => {
    const { llm } = llmReturning(analysis());
    const cache = memoryCache();
    await jobService.analyze({ jobDescription: POSTING, jobTitle: "Custom" }, { llm, cache });
    const other = await jobService.analyze({ jobDescription: POSTING }, { llm, cache });
    expect(other.cached).toBe(true);
    expect(other.jobTitle).toBe("Junior Backend Developer");
  });
});

describe("jobService.analyze: input and failures", () => {
  const cacheAndLlm = () => ({ cache: memoryCache(), ...llmReturning(analysis()) });

  it("rejects a description that is too short, with a helpful message, before any AI call", async () => {
    const { cache, llm, generateJson } = cacheAndLlm();
    const err = await jobService
      .analyze({ jobDescription: "Python developer wanted" }, { llm, cache })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ZodError);
    expect(err.issues[0].message).toMatch(/at least 100 characters/);
    expect(generateJson).not.toHaveBeenCalled();
  });

  it("rejects an empty or whitespace-only description", async () => {
    const { cache, llm } = cacheAndLlm();
    for (const jobDescription of ["", "   \n\t  "]) {
      await expect(jobService.analyze({ jobDescription }, { llm, cache })).rejects.toBeInstanceOf(
        ZodError,
      );
    }
  });

  it("rejects a description over the limit", async () => {
    const { cache, llm } = cacheAndLlm();
    const err = await jobService
      .analyze({ jobDescription: "x ".repeat(10_001) }, { llm, cache })
      .catch((e) => e);
    expect(err).toBeInstanceOf(ZodError);
    expect(err.issues[0].message).toMatch(/too long.*20,000/);
  });

  it("explains when AI is not configured, and caches nothing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const cache = memoryCache();
    const err = await jobService.analyze({ jobDescription: POSTING }, { cache }).catch((e) => e);
    expect(err).toBeInstanceOf(JobError);
    expect(err.code).toBe("AI_UNAVAILABLE");
    expect(err.status).toBe(503);
    expect(cache.store.size).toBe(0);
  });

  it("turns an AI failure into a retryable error, and caches nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cache = memoryCache();
    const llm = {
      generateJson: vi.fn().mockRejectedValue(new LlmError("down")),
    } as unknown as LlmClient;
    const err = await jobService
      .analyze({ jobDescription: POSTING }, { llm, cache })
      .catch((e) => e);
    expect(err).toBeInstanceOf(JobError);
    expect(err.code).toBe("AI_FAILED");
    expect(err.status).toBe(502);
    expect(cache.store.size).toBe(0);
  });

  it("serves a cached answer even when AI is unavailable", async () => {
    const cache = memoryCache();
    await jobService.analyze(
      { jobDescription: POSTING },
      { llm: llmReturning(analysis()).llm, cache },
    );
    vi.stubEnv("GEMINI_API_KEY", "");
    const result = await jobService.analyze({ jobDescription: POSTING }, { cache });
    expect(result.cached).toBe(true);
  });
});

// The real table. Skipped without DATABASE_URL (e.g. CI).
describe.skipIf(!process.env.DATABASE_URL)("jobAnalysisCache (database)", () => {
  const hashes: string[] = [];
  const fresh = () => {
    const hash = hashJobText(`${POSTING} unique-${Date.now()}-${Math.random()}`);
    hashes.push(hash);
    return hash;
  };

  afterAll(async () => {
    await db.jobAnalysisCache.deleteMany({ where: { hash: { in: hashes } } });
    await db.$disconnect();
  });

  it("round-trips an analysis through Postgres", async () => {
    const hash = fresh();
    expect(await jobAnalysisCache.get(hash)).toBeNull();
    await jobAnalysisCache.set(hash, analysis());
    expect(jobAnalysisSchema.parse(await jobAnalysisCache.get(hash))).toEqual(analysis());
  });

  it("can be written twice for the same posting without conflict (upsert)", async () => {
    const hash = fresh();
    await Promise.all([
      jobAnalysisCache.set(hash, analysis()),
      jobAnalysisCache.set(hash, analysis({ company: "B" })),
    ]);
    await jobAnalysisCache.set(hash, analysis({ company: "C" }));
    expect((await jobAnalysisCache.get(hash)) as JobAnalysis).toMatchObject({ company: "C" });
    expect(await db.jobAnalysisCache.count({ where: { hash } })).toBe(1);
  });

  it("works end to end with the real cache: one AI call for repeated analyses", async () => {
    const posting = `${POSTING} End-to-end marker ${Date.now()}.`;
    hashes.push(hashJobText(posting));
    const { llm, generateJson } = llmReturning(analysis());

    const first = await jobService.analyze({ jobDescription: posting }, { llm });
    const second = await jobService.analyze({ jobDescription: posting }, { llm });
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(generateJson).toHaveBeenCalledTimes(1);

    // The database row holds the analysis and a hash, and none of the posting text.
    const row = await db.jobAnalysisCache.findUniqueOrThrow({
      where: { hash: hashJobText(posting) },
    });
    expect(JSON.stringify(row)).not.toContain("End-to-end marker");
    expect(JSON.stringify(row)).not.toContain("maintain REST APIs");
    expect(row.promptVersion).toBe(1);
  });
});
