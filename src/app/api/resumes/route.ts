import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { resumeService } from "@/modules/resumes";

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    return NextResponse.json(await resumeService.list(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const body = await readJson(req);
    const resume = await resumeService.create(user.id, (body ?? {}) as object);
    return NextResponse.json(resume, { status: 201 });
  });
}
