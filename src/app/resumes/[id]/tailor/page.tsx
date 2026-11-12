import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { TailorWorkspace } from "@/components/tailor/tailor-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { NotFoundError, resumeService } from "@/modules/resumes";

export const metadata: Metadata = { title: "Tailor to a job" };

async function Loader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const resume = await resumeService.get(user.id, id).catch((err: unknown) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-muted-foreground flex flex-wrap gap-2 text-sm">
        <Link href="/dashboard" className="hover:text-foreground">
          Your resumes
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/resumes/${resume.id}/edit`} className="hover:text-foreground">
          {resume.title}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground">Tailor to a job</span>
      </nav>

      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Tailor to a job</h1>
        <p className="text-muted-foreground max-w-2xl">
          Paste a job posting to see what it asks for. Next, you will see how your resume matches
          it, and review suggested changes one at a time.
        </p>
      </div>

      <TailorWorkspace resumeId={resume.id} />
    </>
  );
}

export default function TailorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AppShell>
      <PageContainer className="max-w-4xl space-y-6 py-8 sm:py-10">
        <Suspense
          fallback={
            <div className="space-y-4" role="status" aria-label="Loading">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          }
        >
          <Loader params={params} />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
