import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { requireUser } from "@/lib/session";
import { NotFoundError, resumeService } from "@/modules/resumes";
import { resolveTemplateId } from "@/shared/templates";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imported?: string; check?: string }>;
};

async function EditorLoader({ params, searchParams }: Props) {
  const { id } = await params;
  const { imported, check } = await searchParams;
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
      importNotice={imported === "1" ? { itemsLeftOut: check === "1" } : undefined}
    />
  );
}

export default function EditResumePage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl p-6">
          <div className="bg-muted h-40 animate-pulse rounded-xl" aria-label="Loading editor" />
        </div>
      }
    >
      <EditorLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}
