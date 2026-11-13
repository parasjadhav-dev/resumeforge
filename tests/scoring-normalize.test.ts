import { describe, expect, it } from "vitest";
import { makeSkillFinder, skillKey, uniqueSkills } from "@/modules/scoring";
import { contentWords } from "@/modules/scoring/normalize";

describe("skillKey (the skill normalizer)", () => {
  it("ignores case, spacing and punctuation", () => {
    expect(skillKey("  PYTHON ")).toBe("python");
    expect(skillKey("Machine   Learning")).toBe(skillKey("machine learning"));
  });

  it.each([
    ["JS", "JavaScript"],
    ["js", "Java Script"],
    ["TS", "TypeScript"],
    ["Postgres", "PostgreSQL"],
    ["K8s", "Kubernetes"],
    ["Node.js", "NodeJS"],
    ["Node JS", "Node.js"],
    ["React.js", "React"],
    ["Golang", "Go"],
    ["Amazon Web Services", "AWS"],
    ["Google Cloud Platform", "GCP"],
    ["CI/CD", "continuous integration"],
    ["CICD", "CI/CD"],
    ["ML", "machine learning"],
    ["RESTful APIs", "REST API"],
    ["Mongo", "MongoDB"],
  ])("treats %s and %s as the same skill", (a, b) => {
    expect(skillKey(a)).toBe(skillKey(b));
  });

  it("treats plural and singular as the same", () => {
    expect(skillKey("microservices")).toBe(skillKey("microservice"));
    expect(skillKey("REST APIs")).toBe(skillKey("REST API"));
  });

  it("keeps C++ and C# distinct from C", () => {
    expect(skillKey("C++")).toBe("c++");
    expect(skillKey("C#")).toBe("c#");
    expect(skillKey("C++")).not.toBe(skillKey("C"));
    expect(skillKey("C#")).not.toBe(skillKey("C"));
    expect(skillKey("cpp")).toBe("c++");
  });

  it("does not stem words whose last letter belongs to them", () => {
    expect(skillKey("AWS")).toBe("aws");
    expect(skillKey("CSS")).toBe("css");
    expect(skillKey("iOS")).toBe("ios");
  });

  it("does not confuse different skills", () => {
    expect(skillKey("Java")).not.toBe(skillKey("JavaScript"));
    expect(skillKey("SQL")).not.toBe(skillKey("MySQL"));
    expect(skillKey("React")).not.toBe(skillKey("React Native"));
  });

  it("ignores a bracketed note", () => {
    expect(skillKey("AWS (EC2, S3)")).toBe("aws");
  });

  it("is empty for nothing", () => {
    expect(skillKey("")).toBe("");
    expect(skillKey("  ,, ")).toBe("");
  });
});

describe("makeSkillFinder", () => {
  const has = makeSkillFinder(
    "Built REST APIs with Node.js and Postgres. Deployed to AWS using CI/CD. Wrote JavaScript. Used C++ for games.",
  );

  it("finds a skill by any of its spellings", () => {
    expect(has("PostgreSQL")).toBe(true);
    expect(has("NodeJS")).toBe(true);
    expect(has("Amazon Web Services")).toBe(true);
    expect(has("JS")).toBe(true);
    expect(has("continuous integration")).toBe(true);
    expect(has("RESTful API")).toBe(true);
  });

  it("matches whole words only", () => {
    expect(has("Java")).toBe(false); // only JavaScript is there
    expect(has("Script")).toBe(false);
    expect(has("SQL")).toBe(false); // PostgreSQL is a different word
    expect(has("C")).toBe(false); // only C++
  });

  it("needs a multi-word skill to appear together, in order", () => {
    const text = makeSkillFinder("Managed the database. Wrote tests for the machine.");
    expect(text("machine learning")).toBe(false);
    expect(text("database")).toBe(true);
  });

  it("never matches an empty skill", () => {
    expect(has("")).toBe(false);
    expect(has("   ")).toBe(false);
  });
});

describe("uniqueSkills", () => {
  it("removes repeats, ignoring case and aliases, keeping the first spelling", () => {
    expect(
      uniqueSkills(["JavaScript", "js", "  Python ", "python", "", "PostgreSQL", "Postgres"]),
    ).toEqual(["JavaScript", "Python", "PostgreSQL"]);
  });
});

describe("contentWords", () => {
  it("drops filler words but keeps the meaningful ones", () => {
    expect(contentWords("You will build and maintain the REST APIs")).toEqual([
      "build",
      "maintain",
      "rest",
      "api",
    ]);
  });
});
