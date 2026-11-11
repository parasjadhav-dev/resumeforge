import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  breakLongWordsDeep,
  cleanBullets,
  contactItems,
  formatDateRange,
  skillLine,
  visibleCertifications,
  visibleEducation,
  visibleExperience,
  visibleProjects,
  visibleSkills,
} from "@/shared/resume-format";
import type { ResumeContent, TemplateId } from "@/shared/schema";

// Never hyphenate: a hyphen inserted at a line break would split words in extracted text.
Font.registerHyphenationCallback((word) => [word]);

const BODY = "#111111";

/** Look per template. Structure and text are identical; only styling differs. */
const THEMES = {
  classic: {
    align: "center",
    nameSize: 18,
    nameColor: "#000000",
    contactColor: BODY,
    headingColor: "#000000",
    ruleColor: "#000000",
    ruleWidth: 0.75,
    headingSpacing: 0.5,
  },
  modern: {
    align: "left",
    nameSize: 22,
    nameColor: "#1e3a8a",
    contactColor: "#404040",
    headingColor: "#1e3a8a",
    ruleColor: "#1e3a8a",
    ruleWidth: 1.5,
    headingSpacing: 1,
  },
} as const satisfies Record<TemplateId, object>;

type Theme = (typeof THEMES)[TemplateId];

// Built-in PDF fonts: always available and real, selectable text (no font embedding needed).
function makeStyles(t: Theme) {
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 42,
      fontFamily: "Helvetica",
      fontSize: 10,
      lineHeight: 1.3,
      color: BODY,
    },
    // Explicit line heights: the page-level value is resolved against the 10pt body size,
    // which would make a larger name line overlap the one below it.
    name: {
      fontFamily: "Helvetica-Bold",
      fontSize: t.nameSize,
      lineHeight: 1.25,
      textAlign: t.align,
      color: t.nameColor,
    },
    contact: { textAlign: t.align, marginTop: 3, color: t.contactColor },
    heading: {
      fontFamily: "Helvetica-Bold",
      fontSize: 10.5,
      lineHeight: 1.3,
      textTransform: "uppercase",
      letterSpacing: t.headingSpacing,
      color: t.headingColor,
      marginTop: 10,
      marginBottom: 4,
      paddingBottom: 1.5,
      borderBottomWidth: t.ruleWidth,
      borderBottomColor: t.ruleColor,
    },
    entry: { marginBottom: 6 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    bold: { fontFamily: "Helvetica-Bold" },
    italic: { fontFamily: "Helvetica-Oblique" },
    rowRight: { marginLeft: 8 },
    bulletRow: { flexDirection: "row", marginTop: 1.5, paddingLeft: 10 },
    bulletMark: { width: 9 },
    bulletText: { flex: 1 },
    line: { marginBottom: 1.5 },
  });
}

type Styles = ReturnType<typeof makeStyles>;

const join = (...parts: string[]) =>
  parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

function Heading({ s, children }: { s: Styles; children: string }) {
  return <Text style={s.heading}>{children}</Text>;
}

function Bullet({ s, text }: { s: Styles; text: string }) {
  return (
    <View style={s.bulletRow} wrap={false}>
      <Text style={s.bulletMark}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function Row({ s, left, right }: { s: Styles; left: string; right?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.bold}>{left}</Text>
      {right ? <Text style={s.rowRight}>{right}</Text> : null}
    </View>
  );
}

/**
 * One entry (job, degree, project). The section heading (when given), the entry's header lines
 * and its first bullet form one unbreakable group, so a heading is never left alone at the
 * bottom of a page and an entry header is never separated from its first bullet.
 */
function Entry({
  s,
  heading,
  head,
  bullets,
}: {
  s: Styles;
  heading?: string;
  head: ReactNode;
  bullets: string[];
}) {
  const [first, ...rest] = cleanBullets(bullets);
  return (
    <View style={s.entry}>
      <View wrap={false}>
        {heading ? <Heading s={s}>{heading}</Heading> : null}
        {head}
        {first ? <Bullet s={s} text={first} /> : null}
      </View>
      {rest.map((text, i) => (
        <Bullet key={i} s={s} text={text} />
      ))}
    </View>
  );
}

/** A section made of plain lines (skills, certifications): heading stays with the first line. */
function Lines({ s, heading, lines }: { s: Styles; heading: string; lines: string[] }) {
  const [first, ...rest] = lines;
  return (
    <View>
      <View wrap={false}>
        <Heading s={s}>{heading}</Heading>
        <Text style={s.line}>{first}</Text>
      </View>
      {rest.map((line, i) => (
        <Text key={i} style={s.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/** Single-column, ATS-friendly resume as a PDF with real, selectable text. */
export function ResumePdfDocument({
  content: rawContent,
  title,
  templateId = "classic",
}: {
  content: ResumeContent;
  title?: string;
  templateId?: TemplateId;
}) {
  const s = makeStyles(THEMES[templateId] ?? THEMES.classic);
  // Words longer than a line cannot wrap and would be clipped, so give them break points.
  const content = breakLongWordsDeep(rawContent);
  const { contact } = content;
  const name = contact.fullName.trim();
  const contactLine = contactItems(contact).join("  |  ");
  const experience = visibleExperience(content.experience);
  const education = visibleEducation(content.education);
  const projects = visibleProjects(content.projects);
  const skills = visibleSkills(content.skills);
  const certifications = visibleCertifications(content.certifications);

  return (
    <Document title={title ?? (name ? `${name} - Resume` : "Resume")} author={name || undefined}>
      <Page size="A4" style={s.page}>
        {name ? <Text style={s.name}>{name}</Text> : null}
        {contactLine ? <Text style={s.contact}>{contactLine}</Text> : null}

        {content.summary.trim() ? (
          <View wrap={false}>
            <Heading s={s}>Summary</Heading>
            <Text>{content.summary.trim()}</Text>
          </View>
        ) : null}

        {experience.map((e, i) => (
          <Entry
            key={e.id}
            s={s}
            heading={i === 0 ? "Experience" : undefined}
            bullets={e.bullets}
            head={
              <>
                <Row
                  s={s}
                  left={join(e.title, e.company) || "Untitled role"}
                  right={formatDateRange(e.startDate, e.endDate, e.current)}
                />
                {e.location.trim() ? <Text style={s.italic}>{e.location.trim()}</Text> : null}
              </>
            }
          />
        ))}

        {education.map((e, i) => (
          <Entry
            key={e.id}
            s={s}
            heading={i === 0 ? "Education" : undefined}
            bullets={e.details}
            head={
              <>
                <Row
                  s={s}
                  left={e.institution.trim() || "Education"}
                  right={formatDateRange(e.startDate, e.endDate)}
                />
                {e.degree.trim() || e.field.trim() || e.gpa.trim() ? (
                  <Text>
                    {[join(e.degree, e.field), e.gpa.trim() && `GPA: ${e.gpa.trim()}`]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                ) : null}
                {e.location.trim() ? <Text style={s.italic}>{e.location.trim()}</Text> : null}
              </>
            }
          />
        ))}

        {projects.map((p, i) => (
          <Entry
            key={p.id}
            s={s}
            heading={i === 0 ? "Projects" : undefined}
            bullets={p.bullets}
            head={
              <>
                <Row s={s} left={p.name.trim() || "Project"} right={p.link.trim()} />
                {p.technologies.length > 0 ? (
                  <Text style={s.italic}>{p.technologies.join(", ")}</Text>
                ) : null}
              </>
            }
          />
        ))}

        {skills.length > 0 ? <Lines s={s} heading="Skills" lines={skills.map(skillLine)} /> : null}

        {certifications.length > 0 ? (
          <Lines
            s={s}
            heading="Certifications"
            lines={certifications.map((c) =>
              [join(c.name, c.issuer), c.date.trim()].filter(Boolean).join(" | "),
            )}
          />
        ) : null}
      </Page>
    </Document>
  );
}
