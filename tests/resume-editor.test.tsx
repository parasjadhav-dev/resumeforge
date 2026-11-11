// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { createEmptyResume } from "@/shared/schema";

const saveResumeAction = vi.hoisted(() => vi.fn());
vi.mock("@/app/resumes/[id]/edit/actions", () => ({ saveResumeAction }));

const ok = { ok: true } as const;

/** A promise the test resolves by hand, to hold a save "in flight". */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const status = () => screen.getByRole("status").textContent;

beforeEach(() => {
  vi.useFakeTimers();
  saveResumeAction.mockReset();
  saveResumeAction.mockResolvedValue(ok);
  render(
    <ResumeEditor
      id="r1"
      title="My Resume"
      initial={createEmptyResume()}
      initialTemplateId="classic"
    />,
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("live preview", () => {
  it("updates as you type", () => {
    const preview = screen.getByLabelText("Resume preview");
    expect(within(preview).getByText(/preview appears here/i)).toBeTruthy();

    type("Full name", "Asha Rao");
    type("Professional summary", "Final-year student");

    expect(within(preview).getByText("Asha Rao")).toBeTruthy();
    expect(within(preview).getByText("Final-year student")).toBeTruthy();
  });

  it("shows added entries, and reorder changes the preview order", () => {
    fireEvent.click(screen.getByRole("button", { name: "Add skill group" }));
    fireEvent.click(screen.getByRole("button", { name: "Add skill group" }));
    const [cat1, cat2] = screen.getAllByLabelText("Category");
    const [skills1, skills2] = screen.getAllByLabelText("Skills");
    fireEvent.change(cat1, { target: { value: "Languages" } });
    fireEvent.change(skills1, { target: { value: "TypeScript" } });
    fireEvent.change(cat2, { target: { value: "Tools" } });
    fireEvent.change(skills2, { target: { value: "Git" } });

    const preview = screen.getByLabelText("Resume preview");
    const lines = () =>
      within(preview)
        .getAllByRole("listitem")
        .map((li) => li.textContent);
    expect(lines()).toEqual(["Languages: TypeScript", "Tools: Git"]);

    fireEvent.click(screen.getByRole("button", { name: "Move Skill group 2 up" }));
    expect(lines()).toEqual(["Tools: Git", "Languages: TypeScript"]);
  });
});

describe("template switcher", () => {
  const radio = (name: string) => screen.getByRole("radio", { name: new RegExp(name, "i") });

  it("starts on the saved template and lists both options", () => {
    expect((radio("Classic") as HTMLInputElement).checked).toBe(true);
    expect((radio("Modern") as HTMLInputElement).checked).toBe(false);
  });

  it("changes the preview immediately, keeping the same content", () => {
    type("Full name", "Asha Rao");
    const preview = screen.getByLabelText("Resume preview");
    expect(preview.innerHTML).toContain("text-center");
    expect(preview.innerHTML).not.toContain("text-blue-900");

    fireEvent.click(radio("Modern"));

    expect(preview.innerHTML).toContain("text-blue-900");
    expect(preview.innerHTML).not.toContain("text-center");
    expect(within(preview).getByText("Asha Rao")).toBeTruthy();
  });

  it("autosaves the chosen template along with the content", async () => {
    fireEvent.click(radio("Modern"));
    expect(status()).toBe("Unsaved changes");

    await advance(1000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1);
    expect(saveResumeAction.mock.calls[0][1].templateId).toBe("modern");
    expect(status()).toBe("All changes saved");
  });

  it("disables the PDF download until the template change is saved", async () => {
    fireEvent.click(radio("Modern"));
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Download PDF" })).toBeNull();

    await advance(1000);
    expect(screen.getByRole("link", { name: "Download PDF" }).getAttribute("href")).toBe(
      "/api/resumes/r1/export?format=pdf",
    );
  });
});

describe("autosave", () => {
  it("does nothing until something changes", async () => {
    await advance(10_000);
    expect(saveResumeAction).not.toHaveBeenCalled();
    expect(status()).toBe("All changes saved");
  });

  it("saves once, one second after an edit", async () => {
    type("Full name", "Asha");
    expect(status()).toBe("Unsaved changes");

    await advance(999);
    expect(saveResumeAction).not.toHaveBeenCalled();

    await advance(1);
    expect(saveResumeAction).toHaveBeenCalledTimes(1);
    const [id, { content }] = saveResumeAction.mock.calls[0];
    expect(id).toBe("r1");
    expect(content.contact.fullName).toBe("Asha");
    expect(status()).toBe("All changes saved");

    await advance(10_000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1);
  });

  it("debounces rapid typing into a single save with the latest content", async () => {
    for (const name of ["A", "As", "Ash", "Asha"]) {
      type("Full name", name);
      await advance(300);
    }
    expect(saveResumeAction).not.toHaveBeenCalled();

    await advance(1000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1);
    expect(saveResumeAction.mock.calls[0][1].content.contact.fullName).toBe("Asha");
  });

  it("never runs two saves at once, and saves edits made mid-save afterwards", async () => {
    const first = deferred<typeof ok>();
    saveResumeAction.mockReturnValueOnce(first.promise);

    type("Full name", "Asha");
    await advance(1000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1);
    expect(status()).toBe("Saving…");

    type("Full name", "Asha Rao"); // edit while the first save is in flight
    await advance(5000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1); // still waiting, no overlap

    await act(async () => first.resolve(ok));
    expect(status()).toBe("Unsaved changes"); // the newer edit isn't saved yet

    await advance(1000);
    expect(saveResumeAction).toHaveBeenCalledTimes(2);
    expect(saveResumeAction.mock.calls[1][1].content.contact.fullName).toBe("Asha Rao");
    expect(status()).toBe("All changes saved");
  });

  it("shows an error after a failed save and does not retry in a loop", async () => {
    saveResumeAction.mockResolvedValue({ ok: false, error: "Invalid content (summary): too long" });

    type("Full name", "Asha");
    await advance(1000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1);
    expect(status()).toBe("Not saved");
    expect(screen.getByRole("alert").textContent).toContain("too long");

    await advance(60_000);
    expect(saveResumeAction).toHaveBeenCalledTimes(1); // no automatic retry
  });

  it("recovers: the next edit, or the Retry button, saves again", async () => {
    saveResumeAction.mockResolvedValueOnce({ ok: false, error: "Boom" });

    type("Full name", "Asha");
    await advance(1000);
    expect(status()).toBe("Not saved");

    // Manual retry
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry save" })));
    expect(saveResumeAction).toHaveBeenCalledTimes(2);
    expect(status()).toBe("All changes saved");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("handles a network failure without crashing", async () => {
    saveResumeAction.mockRejectedValueOnce(new Error("Failed to fetch"));

    type("Full name", "Asha");
    await advance(1000);
    expect(status()).toBe("Not saved");
    expect(screen.getByRole("alert").textContent).toMatch(/could not reach the server/i);

    type("Full name", "Asha Rao"); // editing again triggers a fresh attempt
    await advance(1000);
    expect(saveResumeAction).toHaveBeenCalledTimes(2);
    expect(status()).toBe("All changes saved");
  });

  it("warns before leaving with unsaved changes, but not when saved", async () => {
    const event = () => {
      const e = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(event()).toBe(false);

    type("Full name", "Asha");
    expect(event()).toBe(true);

    await advance(1000);
    expect(event()).toBe(false);
  });
});
