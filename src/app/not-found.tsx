import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

// Shown for any address that does not exist, and for resumes the signed-in user does not own.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <Logo href="/" />
      <div className="max-w-md space-y-3">
        <p className="text-brand text-sm font-semibold">404</p>
        <h1 className="text-3xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="text-muted-foreground">
          The address may be mistyped, or the resume may have been deleted. Your other resumes are
          safe.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
        Back to your resumes
      </Link>
    </main>
  );
}
