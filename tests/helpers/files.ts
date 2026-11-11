import JSZip from "jszip";
import { renderResumePdf } from "@/modules/export";
import { resumeContentSchema } from "@/shared/schema";

/** A minimal but valid .docx with one paragraph per line. */
export async function makeDocx(lines: string[]): Promise<Uint8Array> {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = lines
    .map((l) => `<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`)
    .join("");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

/** The text of the sample resume used across import tests. */
export const SAMPLE_RESUME_TEXT_LINES = [
  "Asha Rao",
  "asha@example.com | +91 98765 43210 | Pune, India",
  "SUMMARY",
  "Final-year computer engineering student who builds full-stack web applications.",
  "EXPERIENCE",
  "Software Engineering Intern, Acme Corp    Jun 2024 - Aug 2024",
  "Built a REST API in Node.js that reduced report generation time by 40%.",
  "Wrote integration tests that raised coverage from 55% to 82%.",
  "EDUCATION",
  "Pune Institute of Computer Technology    2021 - 2025",
  "B.E., Computer Engineering | GPA: 9.1/10",
  "SKILLS",
  "Languages: TypeScript, Python, SQL",
];

/** A real, text-based PDF made by our own exporter (so extraction is tested end to end). */
export async function makeSamplePdf(): Promise<Uint8Array> {
  const content = resumeContentSchema.parse({
    contact: { fullName: "Asha Rao", email: "asha@example.com", location: "Pune, India" },
    summary: "Final-year computer engineering student who builds full-stack web applications.",
    experience: [
      {
        title: "Software Engineering Intern",
        company: "Acme Corp",
        startDate: "Jun 2024",
        endDate: "Aug 2024",
        bullets: [
          "Built a REST API in Node.js that reduced report generation time by 40%.",
          "Wrote integration tests that raised coverage from 55% to 82%.",
        ],
      },
    ],
    education: [
      {
        institution: "Pune Institute of Computer Technology",
        degree: "B.E.",
        field: "Computer Engineering",
        startDate: "2021",
        endDate: "2025",
      },
    ],
    skills: [{ category: "Languages", items: ["TypeScript", "Python", "SQL"] }],
  });
  return new Uint8Array(await renderResumePdf(content));
}
