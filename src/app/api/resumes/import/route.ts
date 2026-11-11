import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { ImportError, importService, MAX_UPLOAD_BYTES } from "@/modules/import";

// Multipart overhead on top of the file itself.
const BODY_SLACK_BYTES = 64 * 1024;

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();

    // Refuse oversized uploads before reading the body into memory.
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES + BODY_SLACK_BYTES) {
      throw new ImportError(
        "FILE_TOO_LARGE",
        `That file is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
        413,
      );
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new ImportError("FILE_MISSING", "Choose a PDF or DOCX file to import.", 400);
    }

    const { resume, warnings, review, sourceText } = await importService.importResume(user.id, {
      name: file.name,
      buffer: new Uint8Array(await file.arrayBuffer()),
    });

    return NextResponse.json(
      { id: resume.id, title: resume.title, warnings, review, sourceText },
      { status: 201 },
    );
  });
}
