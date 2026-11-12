import { getLlm, LlmError, LlmNotConfiguredError, type LlmClient } from "@/lib/llm";
import { analyzeJobText, hashJobText, normalizeJobText } from "./analyze";
import { jobErrors } from "./errors";
import { jobAnalysisCache, type JobAnalysisCache } from "./repository";
import {
  analyzeJobInput,
  jobAnalysisSchema,
  type AnalyzeJobInput,
  type JobAnalysis,
} from "./schemas";

export type JobAnalysisResult = {
  analysis: JobAnalysis;
  /** The title to show: what the user typed, else what the posting says. */
  jobTitle: string;
  company: string;
  /** True when this exact posting had been analysed before, so no AI call was made. */
  cached: boolean;
};

export const jobService = {
  /**
   * Works out what a job posting asks for. Identical postings are answered from a cache, so
   * repeating an analysis is instant and costs nothing. The posting text itself is never stored.
   */
  async analyze(
    input: AnalyzeJobInput,
    deps: { llm?: LlmClient; cache?: JobAnalysisCache } = {},
  ): Promise<JobAnalysisResult> {
    const { jobDescription, jobTitle, company } = analyzeJobInput.parse(input);
    const cache = deps.cache ?? jobAnalysisCache;
    const text = normalizeJobText(jobDescription);
    const hash = hashJobText(text);
    const names = (analysis: JobAnalysis) => ({
      jobTitle: jobTitle || analysis.title,
      company: company || analysis.company,
    });

    // A cache problem must never stop the analysis, only make it slower.
    const cachedRaw = await cache.get(hash).catch((err) => {
      console.error("Job analysis cache read failed", err);
      return null;
    });
    const cached = jobAnalysisSchema.safeParse(cachedRaw);
    if (cached.success) return { analysis: cached.data, ...names(cached.data), cached: true };

    // Fail fast, before any work, when AI is not available.
    let llm: LlmClient;
    try {
      llm = deps.llm ?? getLlm();
    } catch (err) {
      if (err instanceof LlmNotConfiguredError) throw jobErrors.aiUnavailable();
      throw err;
    }

    let analysis: JobAnalysis;
    try {
      ({ analysis } = await analyzeJobText(text, llm));
    } catch (err) {
      if (err instanceof LlmError) {
        console.error("Job analysis: AI failed", err.message, err.cause);
        throw jobErrors.aiFailed();
      }
      throw err;
    }

    await cache
      .set(hash, analysis)
      .catch((err) => console.error("Job analysis cache write failed", err));
    return { analysis, ...names(analysis), cached: false };
  },
};
