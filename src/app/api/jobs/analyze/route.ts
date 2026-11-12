import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { jobService, MAX_JOB_CHARS, type JobAnalysis } from "@/modules/jobs";

// Generous for 20,000 characters even in languages that need several bytes per character.
const MAX_BODY_BYTES = MAX_JOB_CHARS * 6;

export function POST(req: Request) {
  return handle(async () => {
    await requireUser();

    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "That request is too large." }, { status: 413 });
    }

    const body = await readJson(req);
    const result = await jobService.analyze((body ?? {}) as { jobDescription: string });
    return NextResponse.json(result satisfies { analysis: JobAnalysis });
  });
}
