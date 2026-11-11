import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { resumeService } from "@/modules/resumes";

export function GET(_req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return NextResponse.json(await resumeService.get(user.id, id));
  });
}

export function PUT(req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return NextResponse.json(
      await resumeService.update(user.id, id, (await readJson(req)) as object),
    );
  });
}

export function DELETE(_req: Request, ctx: RouteContext<"/api/resumes/[id]">) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await resumeService.remove(user.id, id);
    return new Response(null, { status: 204 });
  });
}
