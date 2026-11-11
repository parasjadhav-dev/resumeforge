import { resumeContentSchema, type ResumeContent } from "@/shared/schema";

// Small deterministic PRNG so the randomized resumes are the same on every run.
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  "Built",
  "scalable",
  "REST",
  "APIs",
  "with",
  "Node.js",
  "and",
  "TypeScript",
  "reducing",
  "latency",
  "by",
  "40%",
  "for",
  "50,000+",
  "users",
  "Led",
  "a",
  "team",
  "of",
  "five",
  "engineers",
  "R&D",
  "C++",
  "C#",
  "café",
  "naïve",
  "résumé",
  "“quoted”",
  "– dashed",
  "Postgres",
  "CI/CD",
  "Docker",
];

export function randomResume(seed: number): ResumeContent {
  const rand = mulberry32(seed);
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const sentence = (min = 3, max = 28) =>
    Array.from({ length: int(min, max) }, () => WORDS[int(0, WORDS.length - 1)]).join(" ");
  const bullets = (max: number) => Array.from({ length: int(0, max) }, () => sentence());
  const maybe = <T>(make: () => T[], chance = 0.8) => (rand() < chance ? make() : []);

  return resumeContentSchema.parse({
    contact: {
      fullName: `Person ${seed}`,
      email: rand() < 0.8 ? `person${seed}@example.com` : "",
      phone: rand() < 0.5 ? "+91 98765 43210" : "",
      location: rand() < 0.7 ? "Pune, India" : "",
      linkedin: rand() < 0.5 ? `linkedin.com/in/person${seed}` : "",
    },
    summary: rand() < 0.8 ? sentence(10, 80) : "",
    experience: maybe(() =>
      Array.from({ length: int(1, 7) }, (_, i) => ({
        title: `Engineer ${i + 1}`,
        company: `Company ${seed}-${i + 1}`,
        location: rand() < 0.5 ? "Remote" : "",
        startDate: "Jan 2020",
        endDate: "Dec 2021",
        current: rand() < 0.2,
        bullets: bullets(7),
      })),
    ),
    education: maybe(() =>
      Array.from({ length: int(1, 3) }, (_, i) => ({
        institution: `University ${i + 1}`,
        degree: "B.E.",
        field: "Computer Engineering",
        gpa: rand() < 0.5 ? "9.1/10" : "",
        details: bullets(3),
      })),
    ),
    projects: maybe(() =>
      Array.from({ length: int(1, 5) }, (_, i) => ({
        name: `Project ${i + 1}`,
        link: rand() < 0.5 ? `github.com/person${seed}/project${i + 1}` : "",
        technologies: ["Next.js", "Postgres"].slice(0, int(0, 2)),
        bullets: bullets(5),
      })),
    ),
    skills: maybe(() =>
      Array.from({ length: int(1, 5) }, (_, i) => ({
        category: `Category ${i + 1}`,
        items: Array.from({ length: int(1, 12) }, (_, j) => `Skill${i}${j}`),
      })),
    ),
    certifications: maybe(
      () =>
        Array.from({ length: int(1, 4) }, (_, i) => ({
          name: `Certification ${i + 1}`,
          issuer: "Vendor",
          date: "Mar 2025",
        })),
      0.5,
    ),
  });
}
