import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { LlmError, type LlmClient } from "@/lib/llm";
import { ImportError, importService, titleFromFileName } from "@/modules/import";
import { parsedResumeSchema } from "@/modules/import/parse";
import { resumeService } from "@/modules/resumes";
import { makeDocx, makeSamplePdf, SAMPLE_RESUME_TEXT_LINES } from "./helpers/files";

const reply = (overrides: Record<string, unknown> = {}) =>
  parsedResumeSchema.parse({
    contact: {
      fullName: "Asha Rao",
      email: "asha@example.com",
      phone: "",
      location: "Pune, India",
      linkedin: "",
      github: "",
      website: "",
    },
    summary: "Final-year computer engineering student who builds full-stack web applications.",
    experience: [
      {
        title: "Software Engineering Intern",
        company: "Acme Corp",
        location: "",
        startDate: "Jun 2024",
        endDate: "Aug 2024",
        current: false,
        bullets: ["Built a REST API in Node.js that reduced report generation time by 40%."],
      },
    ],
    education: [],
    projects: [],
    skills: [{ category: "Languages", items: ["TypeScript", "Python", "SQL"] }],
    certifications: [],
    ...overrides,
  });

const llmReturning = (value: unknown) => {
  const generateJson = vi.fn(async ({ schema }: { schema: { parse: (v: unknown) => unknown } }) =>
    schema.parse(value),
  );
  return { llm: { generateJson } as unknown as LlmClient, generateJson };
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    return err instanceof ImportError ? err.code : `other: ${(err as Error).message}`;
  }
  return "no error";
}

describe("titleFromFileName", () => {
  it("turns file names into readable titles", () => {
    expect(titleFromFileName("Asha_Rao-Resume.pdf")).toBe("Asha Rao Resume");
    expect(titleFromFileName("C:\\Users\\asha\\My CV.final.docx")).toBe("My CV.final");
    expect(titleFromFileName("../../etc/passwd.pdf")).toBe("passwd");
    expect(titleFromFileName(".pdf")).toBe("Imported resume");
    expect(titleFromFileName("   ")).toBe("Imported resume");
    expect(titleFromFileName(`${"a".repeat(300)}.pdf`)).toHaveLength(100);
  });
});

// Integration tests against the real database; skipped without DATABASE_URL (e.g. CI).
describe.skipIf(!process.env.DATABASE_URL)("importService", () => {
  const stamp = Date.now();
  let userId: string;

  beforeAll(async () => {
    userId = (await db.user.create({ data: { email: `import-${stamp}@example.com` } })).id;
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  const count = () => db.resume.count({ where: { userId } });

  it("imports a PDF into a new resume owned by the user", async () => {
    const { llm, generateJson } = llmReturning(reply());
    const before = await count();

    const { resume, warnings } = await importService.importResume(
      userId,
      { name: "Asha_Rao-Resume.pdf", buffer: await makeSamplePdf() },
      { llm },
    );

    expect(warnings).toEqual([]);
    expect(resume.title).toBe("Asha Rao Resume");
    expect(resume.content.contact.fullName).toBe("Asha Rao");
    expect(resume.content.experience[0].company).toBe("Acme Corp");
    expect(resume.content.skills[0].items).toEqual(["TypeScript", "Python", "SQL"]);
    expect(await count()).toBe(before + 1);

    // The model was given the text that was really in the PDF.
    const prompt = (generateJson.mock.calls[0][0] as unknown as { prompt: string }).prompt;
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("reduced report generation time by 40%");

    // And what was saved is readable back through the normal service.
    expect((await resumeService.get(userId, resume.id)).content.contact.email).toBe(
      "asha@example.com",
    );
  });

  it("imports a DOCX", async () => {
    const { llm } = llmReturning(reply());
    const { resume } = await importService.importResume(
      userId,
      { name: "resume.docx", buffer: await makeDocx(SAMPLE_RESUME_TEXT_LINES) },
      { llm },
    );
    expect(resume.title).toBe("resume");
    expect(resume.content.experience[0].title).toBe("Software Engineering Intern");
  });

  it("drops anything the file does not contain and tells the user", async () => {
    const { llm } = llmReturning(
      reply({
        experience: [
          {
            title: "CEO",
            company: "Globex International",
            location: "",
            startDate: "2010",
            endDate: "2020",
            current: false,
            bullets: ["Grew revenue tenfold across forty countries."],
          },
        ],
      }),
    );
    const { resume, warnings } = await importService.importResume(
      userId,
      { name: "fab.pdf", buffer: await makeSamplePdf() },
      { llm },
    );
    expect(resume.content.experience).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/could not be matched to your file/i);
  });

  it("explains when AI is not configured, and saves nothing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const before = await count();
    const promise = importService.importResume(userId, {
      name: "a.pdf",
      buffer: await makeSamplePdf(),
    });
    expect(await codeOf(promise)).toBe("AI_UNAVAILABLE");
    expect(await count()).toBe(before);
  });

  it("reports an AI failure as a retryable error, and saves nothing", async () => {
    const llm = {
      generateJson: vi.fn().mockRejectedValue(new LlmError("down")),
    } as unknown as LlmClient;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const before = await count();
    const promise = importService.importResume(
      userId,
      { name: "a.pdf", buffer: await makeSamplePdf() },
      { llm },
    );
    expect(await codeOf(promise)).toBe("AI_FAILED");
    expect(await count()).toBe(before);
  });

  it("rejects bad files before calling the AI or saving anything", async () => {
    const { llm, generateJson } = llmReturning(reply());
    const before = await count();

    const wrongType = importService.importResume(
      userId,
      { name: "a.pdf", buffer: new TextEncoder().encode("hello") },
      { llm },
    );
    expect(await codeOf(wrongType)).toBe("UNSUPPORTED_TYPE");

    const emptyDocx = importService.importResume(
      userId,
      { name: "a.docx", buffer: await makeDocx([]) },
      { llm },
    );
    expect(await codeOf(emptyDocx)).toBe("NO_TEXT");

    expect(generateJson).not.toHaveBeenCalled();
    expect(await count()).toBe(before);
  });
});
