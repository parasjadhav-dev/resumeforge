// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import LandingPage from "@/app/page";
import { findUnsupportedInResume } from "@/shared/pdf-charset";
import { SAMPLE_RESUME } from "@/shared/sample-resume";
import { resumeContentSchema } from "@/shared/schema";

afterEach(cleanup);

describe("sample resume", () => {
  it("is a valid resume that the schema leaves unchanged", () => {
    expect(resumeContentSchema.parse(SAMPLE_RESUME)).toEqual(SAMPLE_RESUME);
  });

  it("has fixed, unique ids (so the landing page can be prerendered)", () => {
    const ids = [
      ...SAMPLE_RESUME.experience,
      ...SAMPLE_RESUME.education,
      ...SAMPLE_RESUME.projects,
      ...SAMPLE_RESUME.skills,
    ].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("sample-"))).toBe(true);
  });

  it("only uses characters the PDF can render, and an obviously fictional email", () => {
    expect(findUnsupportedInResume(SAMPLE_RESUME)).toEqual([]);
    expect(SAMPLE_RESUME.contact.email).toMatch(/@example\.com$/);
  });
});

describe("landing page", () => {
  beforeEach(() => {
    render(<LandingPage />);
  });

  it("has exactly one visible page heading, and a heading per section", () => {
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toMatch(/gets past the robots/i);

    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual([
      "How it works",
      "Built for the way resumes are actually read",
      "Two templates, one rule: readable by machines",
      "AI that helps, and knows its limits",
      "Your next application deserves a better resume.",
    ]);
  });

  it("sends every call to action to sign-in, and the secondary one to the explanation", () => {
    for (const name of [/get started free/i, /build my resume/i, "Sign in"]) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe("/login");
    }
    expect(screen.getByRole("link", { name: "See how it works" }).getAttribute("href")).toBe(
      "#how-it-works",
    );
    expect(document.getElementById("how-it-works")).toBeTruthy();
  });

  it("marks job tailoring as coming soon, and nothing else", () => {
    const steps = within(screen.getByRole("region", { name: "How it works" })).getAllByRole(
      "listitem",
    );
    expect(steps).toHaveLength(4);
    const soon = steps.filter((s) => /coming soon/i.test(s.textContent ?? ""));
    expect(soon).toHaveLength(1);
    expect(soon[0].textContent).toMatch(/tailor it to each job/i);
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(1);
  });

  it("states the no-fabrication promise", () => {
    const section = screen.getByRole("region", { name: /AI that helps/i });
    expect(within(section).getByText("It never invents experience")).toBeTruthy();
    expect(within(section).getByText("You approve everything")).toBeTruthy();
  });

  it("shows both real templates as pictures hidden from screen readers, with captions", () => {
    const section = screen.getByRole("region", { name: /two templates/i });
    expect(within(section).getByText("Classic")).toBeTruthy();
    expect(within(section).getByText("Modern")).toBeTruthy();

    const pictures = document.querySelectorAll('[aria-hidden="true"].aspect-\\[210\\/297\\]');
    expect(pictures).toHaveLength(3); // hero + two templates
    for (const picture of pictures) {
      expect(picture.textContent).toContain("Asha Rao");
      expect(picture.querySelector("a, button, input")).toBeNull(); // nothing focusable inside
    }
    // The sample resume's own headings stay out of the page outline.
    expect(screen.queryByRole("heading", { name: "Asha Rao" })).toBeNull();
  });

  it("has no leftovers from the starter template", () => {
    const html = document.body.innerHTML;
    for (const leftover of ["next.svg", "vercel", "Deploy Now", "edit the", "Templates</a>"]) {
      expect(html).not.toContain(leftover);
    }
  });
});
