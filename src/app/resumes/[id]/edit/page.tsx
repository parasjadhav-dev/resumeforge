import { notFound } from "next/navigation";
import { Suspense } from "react";
import { signOutAction } from "@/app/login/actions";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { UserMenu } from "@/components/layout/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
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
      userMenu={<UserMenu name={user.name} email={user.email} signOut={signOutAction} />}
    />
  );
}

export default function EditResumePage({ params, searchParams }: Props) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4 p-6" role="status" aria-label="Loading editor">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      }
    >
      <EditorLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}
