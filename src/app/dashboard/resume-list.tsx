import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";
import { resumeService } from "@/modules/resumes";
import { ResumeCard } from "./resume-card";

/** Placeholder with the same shape as the real grid, shown while resumes load. */
export function ResumeListSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Loading your resumes"
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-72 rounded-xl" />
      ))}
    </div>
  );
}

export async function ResumeList() {
  const user = await requireUser();
  const resumes = await resumeService.list(user.id);

  if (resumes.length === 0) {
    return (
      <div className="bg-card/60 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
        <span className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
          <FileText className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">No resumes yet</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Start from scratch or import the one you already have. It takes about a minute.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        All resumes <span className="text-muted-foreground font-normal">({resumes.length})</span>
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumes.map((r) => (
          <ResumeCard
            key={r.id}
            id={r.id}
            title={r.title}
            templateId={r.templateId}
            updatedAt={r.updatedAt.toISOString()}
          />
        ))}
      </ul>
    </div>
  );
}
