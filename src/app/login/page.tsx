import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { safeRedirect } from "@/lib/safe-redirect";
import { signInWithGoogle } from "./actions";

async function GoogleSignIn({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl);

  if (await auth()) redirect(redirectTo);

  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" className="w-full">
        Continue with Google
      </Button>
    </form>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in to ResumeForge</h1>
          <p className="text-muted-foreground text-sm">
            Build an ATS-friendly resume and tailor it to any job.
          </p>
        </div>
        <Suspense fallback={<div className="bg-muted h-9 w-full animate-pulse rounded-md" />}>
          <GoogleSignIn searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
