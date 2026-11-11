import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { pdfFileName, renderResumePdf } from "@/modules/export";
import { resumeService } from "@/modules/resumes";

export function GET(req: Request, ctx: RouteContext<"/api/resumes/[id]/export">) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;

    const format = new URL(req.url).searchParams.get("format") ?? "pdf";
    if (format !== "pdf") {
      return NextResponse.json({ error: `Unsupported format "${format}"` }, { status: 400 });
    }

    const resume = await resumeService.get(user.id, id);
    const pdf = await renderResumePdf(resume.content, {
      templateId: resume.templateId,
      title: resume.title,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(resume.content, resume.title)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
