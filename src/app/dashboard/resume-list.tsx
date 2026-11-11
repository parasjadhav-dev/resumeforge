import { requireUser } from "@/lib/session";
import { resumeService } from "@/modules/resumes";
import { ResumeRow } from "./resume-row";

export async function ResumeList() {
  const user = await requireUser();
  const resumes = await resumeService.list(user.id);

  if (resumes.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No resumes yet. Create your first one above.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {resumes.map((r) => (
        <ResumeRow key={r.id} id={r.id} title={r.title} updatedAt={r.updatedAt.toISOString()} />
      ))}
    </ul>
  );
}
