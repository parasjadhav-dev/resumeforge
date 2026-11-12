// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobAnalysisView, type AnalysisResult } from "@/components/tailor/job-analysis-view";
import { TailorWorkspace } from "@/components/tailor/tailor-workspace";

const fetchMock = vi.fn();
let counter = 0;
const nextId = () => `resume-${++counter}`; // each test gets its own draft storage

beforeEach(() => {
  sessionStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const POSTING =
  "Junior Backend Developer at Acme Corp. You will build REST APIs in Python with PostgreSQL. " +
  "Requirements: a bachelor's degree and Git. Nice to have: AWS experience.";

const result = (
  overrides: Partial<AnalysisResult["analysis"]> = {},
  cached = false,
): AnalysisResult => ({
  jobTitle: "Junior Backend Developer",
  company: "Acme Corp",
  cached,
  analysis: {
    title: "Junior Backend Developer",
    company: "Acme Corp",
    seniority: "entry",
    educationRequired: "bachelor",
    minYearsExperience: 1,
    requiredSkills: ["Python", "REST APIs", "Git"],
    preferredSkills: ["AWS"],
    keywords: ["PostgreSQL"],
    responsibilities: ["Build REST APIs"],
    ...overrides,
  },
});

const respond = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const description = () => screen.getByLabelText("Job description") as HTMLTextAreaElement;
const paste = (text: string) => fireEvent.change(description(), { target: { value: text } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /analyze job|reading/i }));

describe("TailorWorkspace form", () => {
  it("shows the fields, the minimum, and an honest privacy note", () => {
    render(<TailorWorkspace resumeId={nextId()} />);
    expect(screen.getByLabelText("Job title (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Company (optional)")).toBeTruthy();
    expect(description()).toBeTruthy();
    expect(screen.getByText(/at least 100 characters/i)).toBeTruthy();
    expect(screen.getByText(/sent to our AI provider/i).textContent).toMatch(
      /never the text you paste/i,
    );
    expect(screen.getByText("0 / 20,000")).toBeTruthy();
  });

  it("counts characters as you type", () => {
    render(<TailorWorkspace resumeId={nextId()} />);
    paste("Python developer");
    expect(screen.getByText("16 / 20,000")).toBeTruthy();
  });

  it("asks for a real description instead of sending nothing, or something too short", () => {
    render(<TailorWorkspace resumeId={nextId()} />);
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/at least 100 characters/);
    expect(description().getAttribute("aria-invalid")).toBe("true");

    paste("Python developer wanted");
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/at least 100 characters/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not show an error before the user has tried to submit", () => {
    render(<TailorWorkspace resumeId={nextId()} />);
    paste("short");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(description().getAttribute("aria-invalid")).toBe("false");
  });

  it("rejects a description over the limit, and shows the count in red", () => {
    render(<TailorWorkspace resumeId={nextId()} />);
    paste("a ".repeat(10_500));
    expect(screen.getByText("20,999 / 20,000").className).toContain("text-destructive");
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/too long.*20,000/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("TailorWorkspace analysing", () => {
  it("sends the job to the server, shows progress, then the result", async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (finish = r)));
    render(<TailorWorkspace resumeId={nextId()} />);

    fireEvent.change(screen.getByLabelText("Job title (optional)"), { target: { value: "Dev" } });
    fireEvent.change(screen.getByLabelText("Company (optional)"), { target: { value: "Acme" } });
    paste(POSTING);
    submit();

    const button = screen.getByRole("button", {
      name: /reading the job description/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(description().disabled).toBe(true); // nothing can be edited mid-request
    expect(screen.getByRole("status").textContent).toMatch(/5 to 15 seconds/);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/jobs/analyze");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      jobDescription: POSTING,
      jobTitle: "Dev",
      company: "Acme",
    });

    await act(async () => finish(respond(200, result())));
    const view = screen.getByTestId("analysis-result");
    expect(
      within(view).getByRole("heading", { level: 2, name: "Junior Backend Developer" }),
    ).toBeTruthy();
    expect(within(view).getByText("Python")).toBeTruthy();
    expect(screen.queryByLabelText("Job description")).toBeNull();
  });

  it("lets the user go back and edit, keeping everything they typed", async () => {
    fetchMock.mockResolvedValue(respond(200, result()));
    render(<TailorWorkspace resumeId={nextId()} />);
    paste(POSTING);
    submit();
    await screen.findByTestId("analysis-result");

    fireEvent.click(screen.getByRole("button", { name: "Edit the job description" }));
    expect(description().value).toBe(POSTING);
  });

  it("explains a server failure and lets the user try again with their text intact", async () => {
    fetchMock.mockResolvedValue(
      respond(502, {
        error: "We couldn't analyse that job description just now. Please try again in a moment.",
      }),
    );
    render(<TailorWorkspace resumeId={nextId()} />);
    paste(POSTING);
    submit();

    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn't analyse/);
    expect(description().value).toBe(POSTING);
    expect(
      (screen.getByRole("button", { name: "Analyze job" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("shows a validation message from the server", async () => {
    fetchMock.mockResolvedValue(
      respond(400, {
        error: "Invalid input",
        issues: [{ message: "Too short, says the server." }],
      }),
    );
    render(<TailorWorkspace resumeId={nextId()} />);
    paste(POSTING);
    submit();
    expect((await screen.findByRole("alert")).textContent).toBe("Too short, says the server.");
  });

  it("says when AI is not set up", async () => {
    fetchMock.mockResolvedValue(
      respond(503, { error: "Analysing a job needs AI, which isn't set up on this server yet." }),
    );
    render(<TailorWorkspace resumeId={nextId()} />);
    paste(POSTING);
    submit();
    expect((await screen.findByRole("alert")).textContent).toMatch(/needs AI/);
  });

  it("handles a network failure and an unreadable error body", async () => {
    render(<TailorWorkspace resumeId={nextId()} />);
    paste(POSTING);

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    submit();
    expect((await screen.findByRole("alert")).textContent).toMatch(/could not reach the server/i);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => Promise.reject(new Error("html")),
    });
    submit();
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/something went wrong/i),
    );
  });
});

describe("TailorWorkspace draft", () => {
  it("remembers what was typed if the page is reloaded", () => {
    const id = nextId();
    const first = render(<TailorWorkspace resumeId={id} />);
    paste(POSTING);
    fireEvent.change(screen.getByLabelText("Company (optional)"), { target: { value: "Acme" } });
    first.unmount();

    render(<TailorWorkspace resumeId={id} />);
    expect(description().value).toBe(POSTING);
    expect((screen.getByLabelText("Company (optional)") as HTMLInputElement).value).toBe("Acme");
  });

  it("keeps each resume's draft separate", () => {
    const [a, b] = [nextId(), nextId()];
    const first = render(<TailorWorkspace resumeId={a} />);
    paste("Draft for resume A");
    first.unmount();

    render(<TailorWorkspace resumeId={b} />);
    expect(description().value).toBe("");
  });

  it("ignores damaged data in storage", () => {
    const id = nextId();
    sessionStorage.setItem(`rf-job:${id}`, "{not json");
    render(<TailorWorkspace resumeId={id} />);
    expect(description().value).toBe("");
    sessionStorage.setItem(`rf-job:${id}`, JSON.stringify({ jobDescription: 42 }));
    cleanup();
    render(<TailorWorkspace resumeId={id} />);
    expect(description().value).toBe("");
  });

  it("still lets the user type when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<TailorWorkspace resumeId={nextId()} />);
    paste("Typing still works");
    expect(description().value).toBe("Typing still works");
  });
});

describe("JobAnalysisView", () => {
  it("lays out the title, company, key facts, and every list", () => {
    render(<JobAnalysisView result={result()} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Junior Backend Developer");
    expect(screen.getByText("Acme Corp")).toBeTruthy();

    const facts = within(screen.getByRole("list", { name: "Key facts" })).getAllByRole("listitem");
    expect(facts.map((f) => f.textContent)).toEqual([
      "Entry level",
      "Bachelor's degree",
      "1+ year of experience",
    ]);

    const required = screen.getByRole("region", { name: /Required skills/ });
    expect(
      within(required)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Python", "REST APIs", "Git"]);
    expect(
      within(screen.getByRole("region", { name: /Preferred skills/ })).getByText("AWS"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: /Other keywords/ })).getByText("PostgreSQL"),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: /Responsibilities/ })).getByText("Build REST APIs"),
    ).toBeTruthy();
  });

  it("shows counts, and says so when a list is empty instead of showing nothing", () => {
    render(<JobAnalysisView result={result({ preferredSkills: [], keywords: [] })} />);
    const preferred = screen.getByRole("region", { name: /Preferred skills/ });
    expect(preferred.textContent).toContain("(0)");
    expect(within(preferred).getByText("None found in this posting.")).toBeTruthy();
  });

  it("describes missing details in plain words", () => {
    render(
      <JobAnalysisView
        result={{
          ...result({
            seniority: "unspecified",
            educationRequired: "unspecified",
            minYearsExperience: 0,
          }),
          jobTitle: "",
          company: "",
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Job analysis");
    const facts = within(screen.getByRole("list", { name: "Key facts" })).getAllByRole("listitem");
    expect(facts.map((f) => f.textContent)).toEqual([
      "Level not stated",
      "Education not stated",
      "Experience not stated",
    ]);
  });

  it("mentions when the answer came from the cache", () => {
    const { rerender } = render(<JobAnalysisView result={result({}, false)} />);
    expect(screen.queryByText(/this was instant/i)).toBeNull();
    rerender(<JobAnalysisView result={result({}, true)} />);
    expect(screen.getByText(/this was instant/i)).toBeTruthy();
  });

  it("tells the user nothing was guessed", () => {
    render(<JobAnalysisView result={result()} />);
    expect(screen.getByText(/comes from the posting itself/i).textContent).toMatch(/removed/);
  });
});
