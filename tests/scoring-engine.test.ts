import { describe, expect, it } from "vitest";
import { scoreResume, WEIGHTS, type JobRequirements } from "@/modules/scoring";
import { degreeLevel, yearsOfExperience } from "@/modules/scoring/resume-facts";
import { createEmptyResume, resumeContentSchema, type ResumeContent } from "@/shared/schema";

const NOW = new Date("2026-06-15T00:00:00Z");

const job = (over: Partial<JobRequirements> = {}): JobRequirements => ({
  seniority: "unspecified",
  educationRequired: "unspecified",
  minYearsExperience: 0,
  requiredSkills: [],
  preferredSkills: [],
  keywords: [],
  responsibilities: [],
  ...over,
});

const resume = (over: Record<string, unknown> = {}): ResumeContent =>
  resumeContentSchema.parse({
    skills: [{ category: "Languages", items: ["Python", "SQL", "Git"] }],
    experience: [
      {
        title: "Backend Developer",
        company: "Acme",
        startDate: "Jan 2023",
        endDate: "Jan 2025",
        bullets: ["Built REST APIs in Python with PostgreSQL.", "Reviewed code and wrote tests."],
      },
    ],
    education: [{ institution: "State University", degree: "B.Tech", field: "Computer Science" }],
    ...over,
  });

const part = (r: ReturnType<typeof scoreResume>, id: string) => {
  const c = r.components.find((x) => x.id === id);
  if (!c) throw new Error(`no component ${id}`);
  return c;
};

describe("weights", () => {
  it("are 40/15/20/15/10 and add up to 100", () => {
    expect(WEIGHTS).toEqual({
      required: 40,
      preferred: 15,
      keywords: 20,
      experience: 15,
      education: 10,
    });
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("required skills (40%)", () => {
  it("is the share of required skills the resume shows, with matched and missing lists", () => {
    const r = scoreResume(
      resume(),
      job({ requiredSkills: ["Python", "PostgreSQL", "Docker", "Kafka"] }),
      { now: NOW },
    );
    const c = part(r, "required");
    expect(c.score).toBe(50);
    expect(c.matched).toEqual(["Python", "PostgreSQL"]);
    expect(c.missing).toEqual(["Docker", "Kafka"]);
    expect(r.matched.required).toEqual(["Python", "PostgreSQL"]);
    expect(r.missing.required).toEqual(["Docker", "Kafka"]);
  });

  it("finds a skill written in the experience, not only the skills section", () => {
    const c = part(
      scoreResume(resume(), job({ requiredSkills: ["REST APIs"] }), { now: NOW }),
      "required",
    );
    expect(c.score).toBe(100);
  });

  it("recognises aliases", () => {
    const r = resume({ skills: [{ category: "Tools", items: ["JS", "Postgres", "k8s"] }] });
    const c = part(
      scoreResume(r, job({ requiredSkills: ["JavaScript", "PostgreSQL", "Kubernetes"] }), {
        now: NOW,
      }),
      "required",
    );
    expect(c.score).toBe(100);
  });

  it("counts a repeated job skill once", () => {
    const c = part(
      scoreResume(resume(), job({ requiredSkills: ["Python", "python", "Docker"] }), { now: NOW }),
      "required",
    );
    expect(c.matched).toEqual(["Python"]);
    expect(c.score).toBe(50);
  });

  it("scores 0 for an empty resume, and never throws", () => {
    const r = scoreResume(createEmptyResume(), job({ requiredSkills: ["Python"] }), { now: NOW });
    expect(part(r, "required").score).toBe(0);
    expect(r.score).toBe(0);
  });
});

describe("preferred skills (15%)", () => {
  it("is scored on its own list", () => {
    const c = part(
      scoreResume(resume(), job({ preferredSkills: ["Git", "AWS"] }), { now: NOW }),
      "preferred",
    );
    expect(c.score).toBe(50);
    expect(c.matched).toEqual(["Git"]);
    expect(c.missing).toEqual(["AWS"]);
  });
});

describe("keywords and responsibilities (20%)", () => {
  it("counts keywords and duties together", () => {
    const r = scoreResume(
      resume(),
      job({
        keywords: ["SQL", "Kubernetes"],
        responsibilities: [
          "Build REST APIs with PostgreSQL",
          "Lead a team of ten engineers across offices",
        ],
      }),
      { now: NOW },
    );
    const c = part(r, "keywords");
    expect(c.matched).toEqual(["SQL", "Build REST APIs with PostgreSQL"]);
    expect(c.missing).toEqual(["Kubernetes", "Lead a team of ten engineers across offices"]);
    expect(c.score).toBe(50);
    expect(r.matched.keywords).toEqual(c.matched);
    expect(r.missing.keywords).toEqual(c.missing);
  });

  it("is not counted when the job has neither", () => {
    expect(part(scoreResume(resume(), job(), { now: NOW }), "keywords").applicable).toBe(false);
  });
});

describe("experience level (15%)", () => {
  it("compares the years worked with the years asked for", () => {
    const c = part(
      scoreResume(resume(), job({ minYearsExperience: 4 }), { now: NOW }),
      "experience",
    );
    expect(c.score).toBe(50); // 2 years of 4
    expect(c.summary).toContain("4 years");
    expect(c.summary).toContain("2");
  });

  it("caps at 100 when the candidate has more than enough", () => {
    expect(
      part(scoreResume(resume(), job({ minYearsExperience: 1 }), { now: NOW }), "experience").score,
    ).toBe(100);
  });

  it("uses the level when no number of years is given", () => {
    const senior = part(
      scoreResume(resume(), job({ seniority: "senior" }), { now: NOW }),
      "experience",
    );
    expect(senior.score).toBe(40); // 2 of an implied 5
    const entry = part(
      scoreResume(createEmptyResume(), job({ seniority: "entry" }), { now: NOW }),
      "experience",
    );
    expect(entry.score).toBe(100);
  });

  it("is not counted when the job names neither", () => {
    expect(part(scoreResume(resume(), job(), { now: NOW }), "experience").applicable).toBe(false);
  });

  it("a stated number of years wins over the level", () => {
    const c = part(
      scoreResume(resume(), job({ seniority: "senior", minYearsExperience: 2 }), { now: NOW }),
      "experience",
    );
    expect(c.score).toBe(100);
  });
});

describe("years of experience from dates", () => {
  const withJobs = (jobs: Array<Record<string, unknown>>) => resume({ experience: jobs });

  it("reads month names, numbers and bare years", () => {
    expect(yearsOfExperience(withJobs([{ startDate: "Jun 2022", endDate: "Jun 2024" }]), NOW)).toBe(
      2,
    );
    expect(yearsOfExperience(withJobs([{ startDate: "06/2022", endDate: "06/2024" }]), NOW)).toBe(
      2,
    );
    expect(yearsOfExperience(withJobs([{ startDate: "2022-06", endDate: "2024-06" }]), NOW)).toBe(
      2,
    );
    expect(yearsOfExperience(withJobs([{ startDate: "2020", endDate: "2022" }]), NOW)).toBe(2);
  });

  it("runs a current job up to today", () => {
    expect(yearsOfExperience(withJobs([{ startDate: "Jun 2024", current: true }]), NOW)).toBe(2);
    expect(yearsOfExperience(withJobs([{ startDate: "Jun 2024", endDate: "Present" }]), NOW)).toBe(
      2,
    );
  });

  it("counts overlapping jobs once", () => {
    const jobs = [
      { startDate: "Jan 2020", endDate: "Jan 2023" },
      { startDate: "Jan 2022", endDate: "Jan 2024" },
    ];
    expect(yearsOfExperience(withJobs(jobs), NOW)).toBe(4);
  });

  it("adds separate jobs with a gap between them", () => {
    const jobs = [
      { startDate: "Jan 2018", endDate: "Jan 2019" },
      { startDate: "Jan 2021", endDate: "Jan 2023" },
    ];
    expect(yearsOfExperience(withJobs(jobs), NOW)).toBe(3);
  });

  it("ignores entries it cannot read, or that end before they start", () => {
    const jobs = [
      { startDate: "last summer", endDate: "" },
      { startDate: "2024", endDate: "2020" },
    ];
    expect(yearsOfExperience(withJobs(jobs), NOW)).toBe(0);
  });

  it("does not count the future", () => {
    expect(
      yearsOfExperience(withJobs([{ startDate: "Jan 2026", endDate: "Dec 2030" }]), NOW),
    ).toBeLessThan(1);
  });

  it("is 0 with no experience", () => {
    expect(yearsOfExperience(createEmptyResume(), NOW)).toBe(0);
  });
});

describe("education (10%)", () => {
  it.each([
    ["B.Tech", "bachelor"],
    ["B. Tech in CSE", "bachelor"],
    ["Bachelor of Science", "bachelor"],
    ["BS", "bachelor"],
    ["B.E.", "bachelor"],
    ["M.S.", "master"],
    ["MSc Data Science", "master"],
    ["Master's in Business", "master"],
    ["MBA", "master"],
    ["Ph.D.", "doctorate"],
    ["Doctor of Philosophy", "doctorate"],
    ["Diploma in Computer Engineering", "associate"],
    ["High school", "none"],
    ["", "none"],
  ])("reads %s as %s", (degree, level) => {
    expect(degreeLevel(degree)).toBe(level);
  });

  const withDegree = (degree: string) => resume({ education: [{ degree }] });

  it("is full marks when the degree meets the requirement or exceeds it", () => {
    expect(
      part(
        scoreResume(withDegree("M.S."), job({ educationRequired: "bachelor" }), { now: NOW }),
        "education",
      ).score,
    ).toBe(100);
    expect(
      part(
        scoreResume(withDegree("B.Tech"), job({ educationRequired: "bachelor" }), { now: NOW }),
        "education",
      ).score,
    ).toBe(100);
  });

  it("is half marks one level short, and nothing two short or with no degree", () => {
    expect(
      part(
        scoreResume(withDegree("B.Tech"), job({ educationRequired: "master" }), { now: NOW }),
        "education",
      ).score,
    ).toBe(50);
    expect(
      part(
        scoreResume(withDegree("Diploma"), job({ educationRequired: "master" }), { now: NOW }),
        "education",
      ).score,
    ).toBe(0);
    expect(
      part(
        scoreResume(createEmptyResume(), job({ educationRequired: "bachelor" }), { now: NOW }),
        "education",
      ).score,
    ).toBe(0);
  });

  it("uses the highest of several degrees", () => {
    const r = resume({ education: [{ degree: "B.Tech" }, { degree: "M.Tech" }] });
    expect(scoreResume(r, job(), { now: NOW }).educationLevel).toBe("master");
  });

  it("is not counted when the job does not ask for a degree", () => {
    for (const educationRequired of ["unspecified", "none"] as const) {
      expect(
        part(scoreResume(resume(), job({ educationRequired }), { now: NOW }), "education")
          .applicable,
      ).toBe(false);
    }
  });
});

describe("the overall score", () => {
  const full = job({
    seniority: "mid",
    educationRequired: "bachelor",
    minYearsExperience: 2,
    requiredSkills: ["Python", "Docker"],
    preferredSkills: ["Git", "AWS"],
    keywords: ["SQL", "Kafka"],
  });

  it("is the weighted sum of the five parts", () => {
    const r = scoreResume(resume(), full, { now: NOW });
    // required 50, preferred 50, keywords 50, experience 100, education 100
    expect(r.score).toBe(Math.round(50 * 0.4 + 50 * 0.15 + 50 * 0.2 + 100 * 0.15 + 100 * 0.1));
    expect(r.components.map((c) => c.effectiveWeight)).toEqual([40, 15, 20, 15, 10]);
  });

  it("is 100 for a full match and 0 for a total mismatch", () => {
    const perfect = scoreResume(
      resume(),
      job({
        requiredSkills: ["Python"],
        preferredSkills: ["Git"],
        keywords: ["SQL"],
        educationRequired: "bachelor",
        minYearsExperience: 1,
      }),
      { now: NOW },
    );
    expect(perfect.score).toBe(100);

    const none = scoreResume(
      createEmptyResume(),
      job({
        requiredSkills: ["Python"],
        preferredSkills: ["Git"],
        keywords: ["Kafka"],
        educationRequired: "master",
        minYearsExperience: 3,
      }),
      { now: NOW },
    );
    expect(none.score).toBe(0);
  });

  it("shares the weight of parts the job leaves out, instead of capping the score", () => {
    const r = scoreResume(resume(), job({ requiredSkills: ["Python"] }), { now: NOW });
    expect(r.score).toBe(100); // the only thing asked for is fully met
    const weights = Object.fromEntries(r.components.map((c) => [c.id, c.effectiveWeight]));
    expect(weights).toEqual({
      required: 100,
      preferred: 0,
      keywords: 0,
      experience: 0,
      education: 0,
    });
  });

  it("re-weights proportionally when only some parts apply", () => {
    const r = scoreResume(
      resume(),
      job({ requiredSkills: ["Python", "Docker"], educationRequired: "bachelor" }),
      { now: NOW },
    );
    // required 40 + education 10 -> 80% / 20%
    expect(part(r, "required").effectiveWeight).toBe(80);
    expect(part(r, "education").effectiveWeight).toBe(20);
    expect(r.score).toBe(Math.round(50 * 0.8 + 100 * 0.2));
  });

  it("is null when the job gives nothing to compare against", () => {
    const r = scoreResume(resume(), job(), { now: NOW });
    expect(r.score).toBeNull();
    expect(r.components.every((c) => !c.applicable && c.score === null)).toBe(true);
  });

  it("is deterministic and does not change its inputs", () => {
    const r = resume();
    const j = { ...full };
    const before = JSON.stringify([r, j]);
    expect(scoreResume(r, j, { now: NOW })).toEqual(scoreResume(r, j, { now: NOW }));
    expect(JSON.stringify([r, j])).toBe(before);
  });

  it("does not give credit for text outside the resume body (contact details)", () => {
    const r = resume({
      contact: {
        fullName: "Docker Kafka",
        email: "",
        phone: "",
        location: "Docker",
        linkedin: "",
        github: "",
        website: "",
      },
    });
    expect(
      part(scoreResume(r, job({ requiredSkills: ["Docker", "Kafka"] }), { now: NOW }), "required")
        .score,
    ).toBe(0);
  });

  it("a score is always a whole number from 0 to 100", () => {
    const r = scoreResume(
      resume(),
      job({ requiredSkills: ["Python", "Docker", "Kafka"], preferredSkills: ["Git", "AWS", "Go"] }),
      { now: NOW },
    );
    expect(Number.isInteger(r.score)).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
