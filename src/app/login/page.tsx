import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { safeRedirect } from "@/lib/safe-redirect";
import { signInWithGoogle } from "./actions";

async function GoogleSignIn({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl);

  if (await getSession()) redirect(redirectTo);

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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <ThemeToggle className="absolute top-4 right-4" />
      <Logo href="/" />
      <div className="bg-card shadow-pop w-full max-w-sm space-y-6 rounded-2xl border p-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sign in to ResumeForge</h1>
          <p className="text-muted-foreground text-sm">
            Build an ATS-friendly resume and tailor it to any job. The AI never invents experience.
          </p>
        </div>
        <Suspense fallback={<div className="bg-muted h-9 w-full animate-pulse rounded-md" />}>
          <GoogleSignIn searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="text-muted-foreground max-w-xs text-center text-xs">
        We only use your Google account to sign you in. Your resumes stay private to you.
      </p>
    </main>
  );
}
