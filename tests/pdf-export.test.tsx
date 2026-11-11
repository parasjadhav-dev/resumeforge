import { writeFileSync } from "node:fs";
import { PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";
import { pdfFileName, renderResumePdf } from "@/modules/export";
import { createEmptyResume, resumeContentSchema, TEMPLATE_IDS } from "@/shared/schema";

const sample = resumeContentSchema.parse({
  contact: {
    fullName: "Asha Rao",
    email: "asha@example.com",
    phone: "+91 98765 43210",
    location: "Pune, India",
    linkedin: "linkedin.com/in/asharao",
    github: "github.com/asharao",
  },
  summary:
    "Final-year computer engineering student with hands-on experience building full-stack web applications.",
  experience: [
    {
      title: "Software Engineering Intern",
      company: "Acme Corp",
      location: "Remote",
      startDate: "Jun 2024",
      endDate: "Aug 2024",
      bullets: [
        "Built a REST API in Node.js that reduced report generation time by 40%.",
        "Wrote integration tests that raised coverage from 55% to 82%.",
      ],
    },
    {
      title: "Web Developer",
      company: "Campus Club",
      startDate: "Jan 2023",
      current: true,
      bullets: ["Maintained the club website used by 800+ students."],
    },
  ],
  education: [
    {
      institution: "Pune Institute of Computer Technology",
      degree: "B.E.",
      field: "Computer Engineering",
      startDate: "2021",
      endDate: "2025",
      gpa: "9.1/10",
    },
  ],
  projects: [
    {
      name: "ResumeForge",
      link: "github.com/asharao/resumeforge",
      technologies: ["Next.js", "TypeScript", "PostgreSQL"],
      bullets: ["Built an ATS-friendly resume builder with live preview."],
    },
  ],
  skills: [
    { category: "Languages", items: ["TypeScript", "Python", "SQL"] },
    { category: "Tools", items: ["Git", "Docker"] },
  ],
  certifications: [{ name: "AWS Cloud Practitioner", issuer: "Amazon", date: "Mar 2025" }],
});

async function extract(pdf: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(pdf) });
  try {
    const { text, total } = await parser.getText();
    return { text, pages: total };
  } finally {
    await parser.destroy();
  }
}

describe("PDF export", () => {
  it("produces a valid PDF", async () => {
    const pdf = await renderResumePdf(sample);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, pdf); // for manual inspection
  });

  it("contains real, selectable text for every field", async () => {
    const { text } = await extract(await renderResumePdf(sample));
    for (const expected of [
      "Asha Rao",
      "asha@example.com",
      "+91 98765 43210",
      "Pune, India",
      "Final-year computer engineering student",
      "Software Engineering Intern, Acme Corp",
      "Jun 2024 – Aug 2024",
      "Jan 2023 – Present",
      "reduced report generation time by 40%",
      "Pune Institute of Computer Technology",
      "GPA: 9.1/10",
      "ResumeForge",
      "Next.js, TypeScript, PostgreSQL",
      "Languages: TypeScript, Python, SQL",
      "AWS Cloud Practitioner, Amazon | Mar 2025",
    ]) {
      expect(text).toContain(expected);
    }
  });

  it("uses standard section headings", async () => {
    const { text } = await extract(await renderResumePdf(sample));
    for (const heading of [
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "PROJECTS",
      "SKILLS",
      "CERTIFICATIONS",
    ]) {
      expect(text.toUpperCase()).toContain(heading);
    }
  });

  it("does not hyphenate or split words across lines", async () => {
    const long = resumeContentSchema.parse({
      summary: "Internationalization responsibilities ".repeat(20),
    });
    const { text } = await extract(await renderResumePdf(long));
    expect(text).not.toMatch(/\w-\n\w/);
    expect(text.replace(/\s+/g, " ")).toContain("Internationalization responsibilities");
  });

  it("omits sections that have no content", async () => {
    const minimal = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao" },
      summary: "Hi.",
    });
    const { text } = await extract(await renderResumePdf(minimal));
    expect(text).toContain("Asha Rao");
    expect(text.toUpperCase()).not.toContain("EXPERIENCE");
    expect(text.toUpperCase()).not.toContain("EDUCATION");
  });

  it("renders an empty resume without crashing", async () => {
    const pdf = await renderResumePdf(createEmptyResume());
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("flows long content onto extra pages and keeps every entry", async () => {
    const many = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao" },
      experience: Array.from({ length: 12 }, (_, i) => ({
        title: `Role ${i + 1}`,
        company: `Company ${i + 1}`,
        startDate: "2020",
        endDate: "2021",
        bullets: Array.from(
          { length: 5 },
          (_, j) => `Delivered result number ${j + 1} for role ${i + 1}.`,
        ),
      })),
    });
    const { text, pages } = await extract(await renderResumePdf(many));
    expect(pages).toBeGreaterThan(1);
    for (let i = 1; i <= 12; i++) expect(text).toContain(`Role ${i}, Company ${i}`);
    // Entries appear in order across pages.
    const positions = Array.from({ length: 12 }, (_, i) => text.indexOf(`Role ${i + 1}, Company`));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("names the file safely", () => {
    expect(pdfFileName(sample, "Backend")).toBe("Asha-Rao-Resume.pdf");
    expect(pdfFileName(createEmptyResume(), "My CV")).toBe("My-CV-Resume.pdf");
    expect(pdfFileName(createEmptyResume(), "Resume v2")).toBe("Resume-v2.pdf");
    expect(pdfFileName(createEmptyResume(), "../../etc/passwd")).not.toMatch(/[\\/]/);
    expect(pdfFileName(createEmptyResume(), "   ")).toBe("Resume.pdf");
    expect(pdfFileName(resumeContentSchema.parse({ contact: { fullName: 'A"B\r\nC' } }), "x")).toBe(
      "ABC-Resume.pdf",
    );
  });
});

describe.each(TEMPLATE_IDS)("PDF export, %s template", (templateId) => {
  it("produces a valid PDF with every field as extractable text", async () => {
    const pdf = await renderResumePdf(sample, { templateId });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.PDF_OUT)
      writeFileSync(process.env.PDF_OUT.replace(".pdf", `-${templateId}.pdf`), pdf);

    const { text } = await extract(pdf);
    for (const expected of [
      "Asha Rao",
      "asha@example.com",
      "Software Engineering Intern, Acme Corp",
      "Jun 2024 – Aug 2024",
      "Jan 2023 – Present",
      "GPA: 9.1/10",
      "Next.js, TypeScript, PostgreSQL",
      "Languages: TypeScript, Python, SQL",
      "AWS Cloud Practitioner, Amazon | Mar 2025",
    ]) {
      expect(text).toContain(expected);
    }
    for (const heading of [
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "PROJECTS",
      "SKILLS",
      "CERTIFICATIONS",
    ]) {
      expect(text.toUpperCase()).toContain(heading);
    }
  });

  it("keeps long content in order across pages", async () => {
    const many = resumeContentSchema.parse({
      contact: { fullName: "Asha Rao" },
      experience: Array.from({ length: 12 }, (_, i) => ({
        title: `Role ${i + 1}`,
        company: `Company ${i + 1}`,
        bullets: Array.from(
          { length: 5 },
          (_, j) => `Delivered result ${j + 1} for role ${i + 1}.`,
        ),
      })),
    });
    const { text, pages } = await extract(await renderResumePdf(many, { templateId }));
    expect(pages).toBeGreaterThan(1);
    const positions = Array.from({ length: 12 }, (_, i) => text.indexOf(`Role ${i + 1}, Company`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe("PDF templates differ in look, not content", () => {
  const normalize = (t: string) => t.replace(/\s+/g, " ").trim();

  it("extract to identical text", async () => {
    const [classic, modern] = await Promise.all(
      TEMPLATE_IDS.map(async (templateId) =>
        normalize((await extract(await renderResumePdf(sample, { templateId }))).text),
      ),
    );
    expect(modern).toBe(classic);
  });

  it("render different bytes", async () => {
    const classic = await renderResumePdf(sample, { templateId: "classic" });
    const modern = await renderResumePdf(sample, { templateId: "modern" });
    expect(modern.equals(classic)).toBe(false);
  });

  it("falls back to Classic for an unknown template id", async () => {
    const { text } = await extract(await renderResumePdf(sample, { templateId: "nonexistent" }));
    expect(text).toContain("Asha Rao");
  });
});
