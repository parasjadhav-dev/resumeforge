// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportResumeForm } from "@/app/dashboard/import-resume-form";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { resumeContentSchema } from "@/shared/schema";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/resumes/[id]/edit/actions", () => ({ saveResumeAction: vi.fn() }));

const KEY = "rf-import:r1";
const SOURCE = "Asha Rao\nSoftware Engineering Intern, Acme Corp\nJun 2024";

const content = resumeContentSchema.parse({
  contact: { fullName: "Asha Rao" },
  experience: [
    { id: "exp-1", title: "Intern", company: "Acme Corp" },
    { id: "exp-2", title: "Developer", company: "Campus Club", startDate: "2023" },
  ],
  skills: [{ id: "skill-1", category: "Languages", items: ["TypeScript"] }],
});

const review = {
  contact: ["No email was found."],
  summary: [],
  entries: {
    "exp-1": ["No dates were found."],
    "skill-1": ["The wording differs a little from your file."],
  },
};

const store = (value: unknown) => sessionStorage.setItem(KEY, JSON.stringify(value));

/** `imported: false` renders an ordinary resume (no import notice). */
const renderEditor = (imported = true) =>
  render(
    <ResumeEditor
      id="r1"
      title="Imported"
      initial={content}
      initialTemplateId="classic"
      importNotice={imported ? { itemsLeftOut: false } : undefined}
    />,
  );

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("editor review of an imported resume", () => {
  it("marks the entries that need a look, with the reasons", () => {
    store({ review, sourceText: SOURCE });
    renderEditor();

    const notes = screen.getAllByTestId("review-note");
    expect(notes).toHaveLength(3); // contact + experience entry 1 + skill group
    const text = notes.map((n) => n.textContent).join("\n");
    expect(text).toContain("No email was found.");
    expect(text).toContain("No dates were found.");
    expect(text).toContain("The wording differs a little from your file.");

    // The right entry is marked: experience entry 1, not entry 2.
    expect(within(notes[1]).getByText(/experience entry 1/i)).toBeTruthy();
    expect(screen.getByTestId("review-count").textContent).toMatch(/3 items need a closer look/);
  });

  it("clears a note when the user confirms it, and updates the count", () => {
    store({ review, sourceText: SOURCE });
    renderEditor();

    fireEvent.click(
      within(screen.getAllByTestId("review-note")[1]).getByRole("button", { name: "Looks good" }),
    );

    expect(screen.getAllByTestId("review-note")).toHaveLength(2);
    expect(screen.queryByText("No dates were found.")).toBeNull();
    expect(screen.getByTestId("review-count").textContent).toMatch(/2 items need a closer look/);
    // The choice is remembered for this tab.
    expect(JSON.parse(sessionStorage.getItem(KEY)!).review.entries).not.toHaveProperty("exp-1");
  });

  it("removes the count once everything has been checked", () => {
    store({ review, sourceText: SOURCE });
    renderEditor();
    for (const button of screen.getAllByRole("button", { name: "Looks good" }))
      fireEvent.click(button);
    expect(screen.queryAllByTestId("review-note")).toHaveLength(0);
    expect(screen.queryByTestId("review-count")).toBeNull();
  });

  it("shows the original text from the file, and says it is not stored", () => {
    store({ review, sourceText: SOURCE });
    renderEditor();
    const panel = screen.getByTestId("import-source");
    expect(panel.textContent).toContain("Software Engineering Intern, Acme Corp");
    expect(panel.textContent).toMatch(/not saved/i);
  });

  it("shows no notes when the entry flags are keyed by an id that no longer exists", () => {
    store({
      review: { contact: [], summary: [], entries: { "deleted-id": ["x"] } },
      sourceText: "",
    });
    renderEditor();
    expect(screen.queryAllByTestId("review-note")).toHaveLength(0);
  });

  it("ignores damaged or foreign data in storage", () => {
    for (const bad of ["not json", JSON.stringify({ review: "nope" }), JSON.stringify([1, 2])]) {
      sessionStorage.setItem(KEY, bad);
      const { unmount } = renderEditor();
      expect(screen.queryAllByTestId("review-note")).toHaveLength(0);
      expect(screen.queryByTestId("import-source")).toBeNull();
      unmount();
    }
  });

  it("still works when browser storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderEditor();
    expect(screen.getByTestId("import-notice")).toBeTruthy(); // the basic notice still shows
    expect(screen.queryAllByTestId("review-note")).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it("does nothing for ordinary resumes, even if stale data is in storage", () => {
    store({ review, sourceText: SOURCE });
    renderEditor(false);
    expect(screen.queryByTestId("import-notice")).toBeNull();
    expect(screen.queryAllByTestId("review-note")).toHaveLength(0);
  });
});

describe("import form hands the review data to the editor", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    push.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("saves the review flags and the original text for the new resume, then opens the editor", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "r1", warnings: [], review, sourceText: SOURCE }),
    });
    render(<ImportResumeForm />);
    fireEvent.change(screen.getByLabelText("Import an existing resume"), {
      target: { files: [new File([new Uint8Array(100)], "resume.pdf")] },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Import" })));

    expect(push).toHaveBeenCalledWith("/resumes/r1/edit?imported=1");
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ review, sourceText: SOURCE });
  });

  it("still opens the editor if the response has no usable review data", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "r1", warnings: [], review: "garbage" }),
    });
    render(<ImportResumeForm />);
    fireEvent.change(screen.getByLabelText("Import an existing resume"), {
      target: { files: [new File([new Uint8Array(100)], "resume.pdf")] },
    });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Import" })));

    expect(push).toHaveBeenCalledWith("/resumes/r1/edit?imported=1");
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });
});
