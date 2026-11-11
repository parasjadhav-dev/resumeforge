import {
  cleanBullets,
  contactItems,
  formatDateRange,
  isResumeEmpty,
  skillLine,
  visibleCertifications,
  visibleEducation,
  visibleExperience,
  visibleProjects,
  visibleSkills,
} from "@/shared/resume-format";
import type { ResumeContent, TemplateId } from "@/shared/schema";

/** Class names per template. Structure and text are identical; only the look differs. */
const THEMES = {
  classic: {
    header: "text-center",
    name: "text-xl font-bold",
    contact: "",
    heading: "border-b border-black text-black tracking-wide",
  },
  modern: {
    header: "text-left",
    name: "text-2xl font-bold text-blue-900",
    contact: "text-neutral-700",
    heading: "border-b-2 border-blue-900 text-blue-900 tracking-wider",
  },
} satisfies Record<TemplateId, Record<string, string>>;

type Theme = (typeof THEMES)[TemplateId];

function Heading({ theme, children }: { theme: Theme; children: string }) {
  return (
    <h2 className={`mt-3 mb-1 pb-0.5 text-[11px] font-bold uppercase ${theme.heading}`}>
      {children}
    </h2>
  );
}

function Bullets({ items }: { items: string[] }) {
  const bullets = cleanBullets(items);
  if (bullets.length === 0) return null;
  return (
    <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function Row({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-bold">{left}</span>
      {right && <span className="shrink-0">{right}</span>}
    </div>
  );
}

const join = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

/**
 * Single-column, ATS-friendly resume (standard headings, no tables, images or icons).
 * Always rendered as dark text on white paper, regardless of the app theme.
 */
export function ResumeTemplate({
  content,
  templateId = "classic",
}: {
  content: ResumeContent;
  templateId?: TemplateId;
}) {
  const theme = THEMES[templateId] ?? THEMES.classic;
  const { contact } = content;
  const contactLine = contactItems(contact).join("  |  ");
  const experience = visibleExperience(content.experience);
  const education = visibleEducation(content.education);
  const projects = visibleProjects(content.projects);
  const skills = visibleSkills(content.skills);
  const certifications = visibleCertifications(content.certifications);

  if (isResumeEmpty(content)) {
    return (
      <p className="py-16 text-center text-[11px] text-neutral-500">
        Your resume preview appears here as you type.
      </p>
    );
  }

  return (
    <article className="font-sans text-[11px] leading-snug text-neutral-950">
      <header className={theme.header}>
        {contact.fullName.trim() && <h1 className={theme.name}>{contact.fullName.trim()}</h1>}
        {contactLine && <p className={`mt-0.5 ${theme.contact}`}>{contactLine}</p>}
      </header>

      {content.summary.trim() && (
        <section>
          <Heading theme={theme}>Summary</Heading>
          <p className="whitespace-pre-line">{content.summary.trim()}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section>
          <Heading theme={theme}>Experience</Heading>
          <div className="space-y-2">
            {experience.map((e) => (
              <div key={e.id}>
                <Row
                  left={join(e.title, e.company) || "Untitled role"}
                  right={formatDateRange(e.startDate, e.endDate, e.current)}
                />
                {e.location.trim() && <p className="italic">{e.location.trim()}</p>}
                <Bullets items={e.bullets} />
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section>
          <Heading theme={theme}>Education</Heading>
          <div className="space-y-2">
            {education.map((e) => (
              <div key={e.id}>
                <Row
                  left={e.institution.trim() || "Education"}
                  right={formatDateRange(e.startDate, e.endDate)}
                />
                {(e.degree.trim() || e.field.trim() || e.gpa.trim()) && (
                  <p>
                    {[join(e.degree, e.field), e.gpa.trim() && `GPA: ${e.gpa.trim()}`]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                )}
                {e.location.trim() && <p className="italic">{e.location.trim()}</p>}
                <Bullets items={e.details} />
              </div>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section>
          <Heading theme={theme}>Projects</Heading>
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id}>
                <Row left={p.name.trim() || "Project"} right={p.link.trim()} />
                {p.technologies.length > 0 && <p className="italic">{p.technologies.join(", ")}</p>}
                <Bullets items={p.bullets} />
              </div>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <Heading theme={theme}>Skills</Heading>
          <ul className="space-y-0.5">
            {skills.map((g) => (
              <li key={g.id}>{skillLine(g)}</li>
            ))}
          </ul>
        </section>
      )}

      {certifications.length > 0 && (
        <section>
          <Heading theme={theme}>Certifications</Heading>
          <ul className="space-y-0.5">
            {certifications.map((c) => (
              <li key={c.id}>
                {[join(c.name, c.issuer), c.date.trim()].filter(Boolean).join(" | ")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
