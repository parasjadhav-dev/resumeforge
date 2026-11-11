import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { ImportResumeForm } from "./import-resume-form";
import { NewResumeForm } from "./new-resume-form";
import { ResumeList, ResumeListSkeleton } from "./resume-list";

export const metadata: Metadata = { title: "Your resumes" };

export default function DashboardPage() {
  return (
    <AppShell>
      <PageContainer className="space-y-8 py-8 sm:py-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Your resumes</h1>
          <p className="text-muted-foreground">
            Build a new one, import the one you have, or pick up where you left off.
          </p>
        </div>

        <section aria-label="Create a resume" className="grid gap-4 md:grid-cols-2">
          <NewResumeForm />
          <ImportResumeForm />
        </section>

        <section aria-label="Your resumes">
          <Suspense fallback={<ResumeListSkeleton />}>
            <ResumeList />
          </Suspense>
        </section>
      </PageContainer>
    </AppShell>
  );
}
