import { db } from "@/lib/db";
import { ANALYSIS_VERSION } from "./analyze";

/** Where finished analyses are remembered. Only a hash and the analysis are stored. */
export interface JobAnalysisCache {
  get(hash: string): Promise<unknown | null>;
  set(hash: string, analysis: unknown): Promise<void>;
}

export const jobAnalysisCache: JobAnalysisCache = {
  async get(hash) {
    const row = await db.jobAnalysisCache.findUnique({ where: { hash } });
    return row?.analysis ?? null;
  },

  async set(hash, analysis) {
    const data = { promptVersion: ANALYSIS_VERSION, analysis: analysis as object };
    // upsert: two people analysing the same posting at once must not collide.
    await db.jobAnalysisCache.upsert({
      where: { hash },
      create: { hash, ...data },
      update: data,
    });
  },
};
