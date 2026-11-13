import {
  ArrowRight,
  Eye,
  FileCheck2,
  FileDown,
  Lock,
  ScanSearch,
  ShieldCheck,
  Target,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AppFooter } from "@/components/layout/app-footer";
import { PageContainer } from "@/components/layout/page-container";
import { ResumeTemplate } from "@/components/templates/resume-template";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SAMPLE_RESUME } from "@/shared/sample-resume";
import type { TemplateId } from "@/shared/schema";
import { TEMPLATES } from "@/shared/templates";

const cta = "h-11 px-5 text-base";

/**
 * A real template rendering sample data, shown as a picture: hidden from screen readers
 * (its headings would clutter the page outline) and described by the caption beside it.
 */
function TemplatePage({ templateId, className }: { templateId: TemplateId; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "shadow-pop aspect-[210/297] rounded-md bg-white p-6 text-black ring-1 ring-black/10 select-none sm:p-8",
        className,
      )}
    >
      <ResumeTemplate content={SAMPLE_RESUME} templateId={templateId} />
    </div>
  );
}

const STEPS: { title: string; text: string; soon?: boolean }[] = [
  {
    title: "Build it or bring it",
    text: "Fill in a guided editor section by section, or upload your PDF or DOCX and let AI read it into the editor for you to check.",
  },
  {
    title: "Watch it take shape",
    text: "A live preview updates as you type. Switch between ATS-friendly templates at any time without retyping anything.",
  },
  {
    title: "Download a clean PDF",
    text: "Get a single-column PDF with real, selectable text in the right reading order, the way applicant tracking systems expect.",
  },
  {
    title: "Tailor it to each job",
    text: "Paste a job description to see your match score and review suggested rewording, one change at a time.",
    soon: true,
  },
];

const FEATURES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: FileCheck2,
    title: "ATS-friendly by design",
    text: "Single column, standard section names, no tables, images, or icons. Nothing for a parser to trip on.",
  },
  {
    Icon: Eye,
    title: "Live preview",
    text: "See the page exactly as you build it, and reorder jobs, projects, and bullets with a click.",
  },
  {
    Icon: Upload,
    title: "Import what you have",
    text: "Upload a PDF or DOCX. Anything the AI is unsure about is flagged for you to check against the original.",
  },
  {
    Icon: FileDown,
    title: "PDFs that read correctly",
    text: "Every export is tested by extracting its text back out and checking the order, on every template.",
  },
  {
    Icon: ScanSearch,
    title: "Saves as you go",
    text: "Changes are saved automatically a moment after you stop typing. No save button to forget.",
  },
  {
    Icon: Lock,
    title: "Private to you",
    text: "Your resumes are visible only to your account, and uploaded files are read once and never stored.",
  },
];

const AI_RULES: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: ShieldCheck,
    title: "It never invents experience",
    text: "The AI may only work with facts already in your resume. No new employers, tools, numbers, or achievements.",
  },
  {
    Icon: ScanSearch,
    title: "Its output is checked",
    text: "Anything it returns that cannot be traced back to your own words is removed automatically, and you are told.",
  },
  {
    Icon: Target,
    title: "You approve everything",
    text: "Nothing is final until you have looked at it. You stay the author of your resume.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur-md">
        <PageContainer className="flex h-14 items-center justify-between gap-4">
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={buttonVariants({ variant: "outline" })}>
              Sign in
            </Link>
          </div>
        </PageContainer>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <PageContainer className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div className="space-y-6">
            <Badge variant="secondary" className="h-6 px-2.5">
              For students, freshers, and job seekers
            </Badge>
            <h1 className="text-4xl font-semibold text-balance sm:text-5xl lg:text-6xl">
              A resume that gets past the robots,{" "}
              <span className="text-brand">and stays true to you.</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg text-pretty">
              Build an ATS-friendly resume from scratch, or upload the one you have. ResumeForge
              helps with structure and wording, and the AI never invents experience you do not have.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className={cn(buttonVariants(), cta)}>
                Get started free <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(buttonVariants({ variant: "outline" }), cta)}
              >
                See how it works
              </Link>
            </div>
            <p className="text-muted-foreground text-sm">
              Free to use. Sign in with Google, no card needed.
            </p>
          </div>

          <figure className="mx-auto w-full max-w-sm lg:max-w-none">
            <TemplatePage templateId="modern" className="lg:rotate-1" />
            <figcaption className="text-muted-foreground mt-3 text-center text-xs">
              The Modern template, shown with sample data.
            </figcaption>
          </figure>
        </PageContainer>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 border-y">
          <PageContainer className="space-y-10 py-14 sm:py-16">
            <div className="max-w-2xl space-y-2">
              <h2 id="how-heading" className="text-3xl font-semibold">
                How it works
              </h2>
              <p className="text-muted-foreground">
                From a blank page, or an old file, to a resume you can send.
              </p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="bg-card shadow-card space-y-3 rounded-xl border p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      aria-hidden="true"
                      className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold"
                    >
                      {i + 1}
                    </span>
                    {step.soon && <Badge variant="outline">Coming soon</Badge>}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.text}</p>
                </li>
              ))}
            </ol>
          </PageContainer>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading">
          <PageContainer className="space-y-10 py-14 sm:py-16">
            <div className="max-w-2xl space-y-2">
              <h2 id="features-heading" className="text-3xl font-semibold">
                Built for the way resumes are actually read
              </h2>
              <p className="text-muted-foreground">
                Most resumes are parsed by software before a person sees them. Every choice here is
                made so yours survives that step.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, text }) => (
                <li key={title} className="bg-card shadow-card space-y-3 rounded-xl border p-5">
                  <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-sm">{text}</p>
                </li>
              ))}
            </ul>
          </PageContainer>
        </section>

        {/* Templates */}
        <section aria-labelledby="templates-heading" className="border-y">
          <PageContainer className="space-y-10 py-14 sm:py-16">
            <div className="max-w-2xl space-y-2">
              <h2 id="templates-heading" className="text-3xl font-semibold">
                Two templates, one rule: readable by machines
              </h2>
              <p className="text-muted-foreground">
                Same content, same order, different look. Switch whenever you like.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <figure key={t.id} className="mx-auto w-full max-w-md space-y-3">
                  <TemplatePage templateId={t.id} />
                  <figcaption className="text-center">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="text-muted-foreground block text-sm">{t.description}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* AI honesty */}
        <section aria-labelledby="ai-heading">
          <PageContainer className="space-y-10 py-14 sm:py-16">
            <div className="max-w-2xl space-y-2">
              <h2 id="ai-heading" className="text-3xl font-semibold">
                AI that helps, and knows its limits
              </h2>
              <p className="text-muted-foreground">
                A made-up line on a resume can cost you an offer. So the AI here works under three
                rules.
              </p>
            </div>
            <ul className="grid gap-4 lg:grid-cols-3">
              {AI_RULES.map(({ Icon, title, text }) => (
                <li key={title} className="bg-card shadow-card flex gap-4 rounded-xl border p-5">
                  <span className="bg-success text-success-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-muted-foreground text-sm">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </PageContainer>
        </section>

        {/* Final call to action */}
        <PageContainer className="pb-6">
          <section
            aria-labelledby="cta-heading"
            className="bg-primary text-primary-foreground flex flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center sm:py-14"
          >
            <h2 id="cta-heading" className="max-w-xl text-3xl font-semibold text-balance">
              Your next application deserves a better resume.
            </h2>
            <p className="max-w-md opacity-90">It takes a few minutes, and it is free.</p>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "secondary" }),
                cta,
                "bg-background text-foreground hover:bg-background/90",
              )}
            >
              Build my resume <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </PageContainer>
      </main>

      <AppFooter />
    </div>
  );
}
