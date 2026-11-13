import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { jobAnalysisSchema } from "@/modules/jobs/schemas";
import { scoringService } from "@/modules/scoring";

const body = z.object({ analysis: jobAnalysisSchema });

/** Scores the resume against a job analysis (the result of POST /api/jobs/analyze). */
export function POST(req: Request, ctx: RouteContext<"/api/resumes/[id]/score">) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { analysis } = body.parse(await readJson(req));
    return NextResponse.json(await scoringService.score(user.id, id, analysis));
  });
}
