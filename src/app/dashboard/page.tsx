import { Suspense } from "react";
import { signOutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { NewResumeForm } from "./new-resume-form";
import { ResumeList } from "./resume-list";

async function UserBar() {
  const session = await auth();

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-sm">{session?.user?.email}</span>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Your resumes</h1>
        <Suspense fallback={null}>
          <UserBar />
        </Suspense>
      </header>
      <NewResumeForm />
      <Suspense
        fallback={<div className="bg-muted h-16 animate-pulse rounded-lg" aria-label="Loading" />}
      >
        <ResumeList />
      </Suspense>
    </main>
  );
}
