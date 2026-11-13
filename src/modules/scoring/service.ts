import { resumeService } from "@/modules/resumes";
import { scoreResume } from "./engine";
import type { JobRequirements, ScoreResult } from "./types";

export const scoringService = {
  /** Scores one of the user's own resumes against a job analysis. Nothing is stored. */
  async score(userId: string, resumeId: string, job: JobRequirements): Promise<ScoreResult> {
    const resume = await resumeService.get(userId, resumeId); // NotFoundError for anyone else's
    return scoreResume(resume.content, job);
  },
};
