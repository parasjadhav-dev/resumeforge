// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportResumeForm } from "@/app/dashboard/import-resume-form";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { createEmptyResume } from "@/shared/schema";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/resumes/[id]/edit/actions", () => ({ saveResumeAction: vi.fn() }));

const fetchMock = vi.fn();

beforeEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const respond = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

const chooseFile = (file: File) =>
  fireEvent.change(screen.getByLabelText("Import an existing resume"), {
    target: { files: [file] },
  });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /import|reading/i }));
const pdf = (size = 1000) =>
  new File([new Uint8Array(size)], "resume.pdf", { type: "application/pdf" });

describe("ImportResumeForm", () => {
  beforeEach(() => render(<ImportResumeForm />));

  it("asks for a file when none is chosen", () => {
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/choose a pdf or docx/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks files over 5 MB without uploading them", () => {
    chooseFile(pdf(5 * 1024 * 1024 + 1));
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/too large.*5 MB/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads the file, shows progress, and opens the editor", async () => {
    let finish!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (finish = r)));

    chooseFile(pdf());
    submit();

    // While the server works: clear feedback, and nothing can be double-submitted.
    const button = screen.getByRole("button", {
      name: /reading your resume/i,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect((screen.getByLabelText("Import an existing resume") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(screen.getByRole("status").textContent).toMatch(/5 to 15 seconds/);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/resumes/import");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);

    await act(async () => finish(respond(201, { id: "abc", warnings: [] })));
    expect(push).toHaveBeenCalledWith("/resumes/abc/edit?imported=1");
  });

  it("flags the editor when some items could not be matched to the file", async () => {
    fetchMock.mockResolvedValue(
      respond(201, { id: "abc", warnings: ["1 item could not be matched"] }),
    );
    chooseFile(pdf());
    submit();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/resumes/abc/edit?imported=1&check=1"));
  });

  it("shows the server's explanation and lets the user try again", async () => {
    fetchMock.mockResolvedValue(
      respond(422, {
        error: "This PDF looks like a scan or an image, so it has no text we can read.",
      }),
    );
    chooseFile(pdf());
    submit();

    expect((await screen.findByRole("alert")).textContent).toMatch(/scan or an image/);
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Import" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("handles a network failure and an unreadable error body", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    chooseFile(pdf());
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

describe("editor import notice", () => {
  const renderEditor = (importNotice?: { itemsLeftOut: boolean }) =>
    render(
      <ResumeEditor
        id="r1"
        title="Imported"
        initial={createEmptyResume()}
        initialTemplateId="classic"
        importNotice={importNotice}
      />,
    );

  it("is absent for ordinary resumes", () => {
    renderEditor();
    expect(screen.queryByTestId("import-notice")).toBeNull();
  });

  it("tells the user to check an imported resume, and can be dismissed", () => {
    renderEditor({ itemsLeftOut: false });
    const notice = screen.getByTestId("import-notice");
    expect(notice.textContent).toMatch(/imported from your file/i);
    expect(notice.textContent).toMatch(/check every section/i);
    expect(notice.textContent).not.toMatch(/left out/i);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss import notice" }));
    expect(screen.queryByTestId("import-notice")).toBeNull();
  });

  it("also says when items were left out", () => {
    renderEditor({ itemsLeftOut: true });
    expect(screen.getByTestId("import-notice").textContent).toMatch(/left out/i);
  });
});
