import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { EDUCATION_LABELS, experienceLabel, SENIORITY_LABELS } from "@/shared/job-labels";
import type { JobAnalysis } from "@/modules/jobs";

export type AnalysisResult = {
  analysis: JobAnalysis;
  jobTitle: string;
  company: string;
  cached: boolean;
};

function Chips({ items, className }: { items: string[]; className: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={cn("rounded-full border px-3 py-1 text-sm", className)}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Group({
  id,
  title,
  description,
  count,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="bg-card shadow-card space-y-3 rounded-xl border p-5">
      <div>
        <h3 id={id} className="font-semibold">
          {title} <span className="text-muted-foreground font-normal">({count})</span>
        </h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {count === 0 ? (
        <p className="text-muted-foreground text-sm">None found in this posting.</p>
      ) : (
        children
      )}
    </section>
  );
}

/** What a job posting asks for, laid out so it can be read at a glance. */
export function JobAnalysisView({ result }: { result: AnalysisResult }) {
  const { analysis, jobTitle, company, cached } = result;
  const facts = [
    SENIORITY_LABELS[analysis.seniority],
    EDUCATION_LABELS[analysis.educationRequired],
    experienceLabel(analysis.minYearsExperience),
  ];

  return (
    <div className="space-y-5" data-testid="analysis-result">
      <header className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold">{jobTitle || "Job analysis"}</h2>
          {company && <p className="text-muted-foreground">{company}</p>}
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Key facts">
          {facts.map((fact) => (
            <li key={fact}>
              <Badge variant="secondary" className="h-6 px-2.5">
                {fact}
              </Badge>
            </li>
          ))}
        </ul>
        {cached && (
          <p className="text-muted-foreground text-xs">
            You or someone else analysed this exact posting before, so this was instant.
          </p>
        )}
      </header>

      <Group
        id="required-heading"
        title="Required skills"
        description="The posting says you need these. Employers' filters look for them first."
        count={analysis.requiredSkills.length}
      >
        <Chips
          items={analysis.requiredSkills}
          className="border-accent-foreground/25 bg-accent text-accent-foreground"
        />
      </Group>

      <Group
        id="preferred-heading"
        title="Preferred skills"
        description="Called a plus or nice to have. Worth including if they are true for you."
        count={analysis.preferredSkills.length}
      >
        <Chips items={analysis.preferredSkills} className="bg-card" />
      </Group>

      <Group
        id="keywords-heading"
        title="Other keywords"
        description="Other terms from the posting that a tracking system may look for."
        count={analysis.keywords.length}
      >
        <Chips items={analysis.keywords} className="bg-muted" />
      </Group>

      <Group
        id="responsibilities-heading"
        title="Responsibilities"
        description="What you would be doing in this role."
        count={analysis.responsibilities.length}
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {analysis.responsibilities.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Group>

      <Notice variant="info">
        Everything above comes from the posting itself. Anything the AI suggested that could not be
        found in your text was removed, so the lists may be shorter than you expect rather than
        padded with guesses.
      </Notice>
    </div>
  );
}
