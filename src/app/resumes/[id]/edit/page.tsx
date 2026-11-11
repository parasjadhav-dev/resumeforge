import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { requireUser } from "@/lib/session";
import { NotFoundError, resumeService } from "@/modules/resumes";
import { resolveTemplateId } from "@/shared/templates";

async function EditorLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const resume = await resumeService.get(user.id, id).catch((err: unknown) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  return (
    <ResumeEditor
      id={resume.id}
      title={resume.title}
      initial={resume.content}
      initialTemplateId={resolveTemplateId(resume.templateId)}
    />
  );
}

export default function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl p-6">
          <div className="bg-muted h-40 animate-pulse rounded-xl" aria-label="Loading editor" />
        </div>
      }
    >
      <EditorLoader params={params} />
    </Suspense>
  );
}
