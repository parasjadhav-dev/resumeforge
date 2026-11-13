import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Notice } from "@/components/ui/notice";
import { BRAND } from "@/lib/brand-art";
import { safeRedirect } from "@/lib/safe-redirect";
import { getSession } from "@/lib/session";
import { GoogleSignInForm } from "./google-sign-in-form";

type Mode = "signin" | "signup";
type Params = Promise<{ callbackUrl?: string; error?: string }>;

const COPY = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off.",
    button: "Continue with Google",
    switchText: "New to ResumeForge?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    title: "Create your free account",
    subtitle: "It takes one click. All you need is a Google account.",
    button: "Sign up with Google",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
  },
} as const;

/** What Auth.js puts in ?error= when sign-in fails, in words a person can act on. */
function errorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  switch (code) {
    case "AccessDenied":
      return "Google did not let us sign you in. Try again, or choose a different Google account.";
    case "OAuthAccountNotLinked":
      return "That email address is already used by another sign-in method. Use the method you signed up with.";
    case "Configuration":
      return "Sign-in is not set up correctly on our side. Please try again later.";
    default:
      return "We could not sign you in. Please try again.";
  }
}

const POINTS = [
  "Build an ATS-friendly resume, or upload the one you have",
  "See how well it matches a job, and exactly what is missing",
  "Every AI suggestion is yours to accept or reject",
];

/** The form and message. Reads the URL and the session, so it renders at request time. */
async function AuthForm({ mode, searchParams }: { mode: Mode; searchParams: Params }) {
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl);

  if (await getSession()) redirect(redirectTo);

  const copy = COPY[mode];
  const message = errorMessage(error);
  // Keep where the person was headed when they move between the two pages.
  const switchHref = callbackUrl
    ? `${copy.switchHref}?callbackUrl=${encodeURIComponent(redirectTo)}`
    : copy.switchHref;

  return (
    <div className="space-y-5">
      {message && (
        <Notice variant="danger" role="alert">
          {message}
        </Notice>
      )}
      <GoogleSignInForm label={copy.button} redirectTo={redirectTo} />
      <p className="text-muted-foreground text-center text-sm">
        {copy.switchText}{" "}
        <Link
          href={switchHref}
          className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}

/**
 * The sign-in and create-account pages. There is no password: both use Google, and a first
 * sign-in creates the account, so the pages differ only in wording.
 */
export function AuthScreen({ mode, searchParams }: { mode: Mode; searchParams: Params }) {
  const copy = COPY[mode];

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand side: fixed colours, so it looks the same in light and dark. */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ backgroundColor: BRAND.navy, color: BRAND.paper }}
      >
        <Link
          href="/"
          aria-label="ResumeForge home"
          className="inline-flex w-fit items-center gap-2.5 rounded-md"
        >
          <LogoMark decorative className="ring-1 ring-white/30" />
          <span className="text-lg font-semibold tracking-tight">
            Resume<span style={{ color: BRAND.copperOnNavy }}>Forge</span>
          </span>
        </Link>

        {/* A resume page drawn from shapes. It is decoration, not a real preview. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-28 -right-16 hidden w-80 rotate-6 rounded-lg p-6 shadow-2xl [@media(min-height:820px)]:block"
          style={{ backgroundColor: BRAND.paper }}
        >
          <div className="h-3 w-32 rounded-full" style={{ backgroundColor: BRAND.navy }} />
          <div className="mt-2 h-2 w-44 rounded-full" style={{ backgroundColor: BRAND.sand }} />
          <div className="mt-6 h-2 w-20 rounded-full" style={{ backgroundColor: BRAND.copper }} />
          {[56, 52, 44, 54, 38].map((w, i) => (
            <div
              key={i}
              className="mt-3 h-2 rounded-full"
              style={{ width: `${w * 4}px`, backgroundColor: BRAND.sand }}
            />
          ))}
          <div className="mt-6 h-2 w-16 rounded-full" style={{ backgroundColor: BRAND.copper }} />
          {[50, 42, 48].map((w, i) => (
            <div
              key={i}
              className="mt-3 h-2 rounded-full"
              style={{ width: `${w * 4}px`, backgroundColor: BRAND.sand }}
            />
          ))}
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-semibold text-balance">
              A resume that stays true to you.
            </h2>
            <p className="text-lg text-pretty" style={{ color: "#c9d3e0" }}>
              Tailor it to any job in minutes. The AI helps with wording and never invents
              experience.
            </p>
          </div>

          <ul className="space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: BRAND.copperOnNavy, color: BRAND.navy }}
                >
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span style={{ color: "#e6ebf2" }}>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
          <Logo className="lg:hidden" />

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-balance">{copy.title}</h1>
            <p className="text-muted-foreground text-pretty">{copy.subtitle}</p>
          </div>

          <Suspense fallback={<div className="bg-muted h-11 w-full animate-pulse rounded-lg" />}>
            <AuthForm mode={mode} searchParams={searchParams} />
          </Suspense>

          <p className="text-muted-foreground text-xs leading-relaxed">
            We only use your Google account to sign you in, and never post anything. Your resumes
            stay private to you.
          </p>
        </div>
      </main>
    </div>
  );
}
