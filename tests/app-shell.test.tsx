// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeCard } from "@/app/dashboard/resume-card";
import { ResumeThumb } from "@/app/dashboard/resume-thumb";
import { Logo, LogoMark } from "@/components/brand/logo";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { PageContainer } from "@/components/layout/page-container";
import { initialsOf, UserMenu } from "@/components/layout/user-menu";
import { createEmptyResume } from "@/shared/schema";

const actions = vi.hoisted(() => ({
  renameResumeAction: vi.fn(),
  duplicateResumeAction: vi.fn(),
  deleteResumeAction: vi.fn(),
  createResumeAction: vi.fn(),
}));
vi.mock("@/app/dashboard/actions", () => actions);
vi.mock("@/app/resumes/[id]/edit/actions", () => ({ saveResumeAction: vi.fn() }));

// The toast library is replaced so tests can check exactly what the user would be told.
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toasts, Toaster: () => null }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("initialsOf", () => {
  it.each([
    ["Asha Rao", "asha@example.com", "AR"],
    ["Asha Priya Rao", null, "AR"],
    ["asha", null, "A"],
    [null, "rohan.mehta@example.com", "RM"],
    [null, "x@example.com", "X"],
    ["  ", "  ", "?"],
    [null, null, "?"],
  ])("%s / %s -> %s", (name, email, expected) => {
    expect(initialsOf(name, email)).toBe(expected);
  });
});

describe("Logo", () => {
  it("links home and hides the mark from screen readers when the name is shown", () => {
    const { container } = render(<Logo href="/dashboard" />);
    const link = screen.getByRole("link", { name: "ResumeForge home" });
    expect(link.getAttribute("href")).toBe("/dashboard");
    expect(link.textContent).toBe("ResumeForge");
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("names the mark when it stands alone", () => {
    render(<LogoMark />);
    expect(screen.getByRole("img", { name: "ResumeForge" })).toBeTruthy();
  });

  it("can show only the mark as a link", () => {
    render(<Logo href="/dashboard" showWordmark={false} />);
    const link = screen.getByRole("link", { name: "ResumeForge home" });
    expect(link.textContent).toBe("");
  });
});

describe("PageContainer", () => {
  it("is wide by default and extra wide on request, with side padding", () => {
    render(
      <>
        <PageContainer data-testid="a">x</PageContainer>
        <PageContainer data-testid="b" size="wide">
          x
        </PageContainer>
      </>,
    );
    expect(screen.getByTestId("a").className).toContain("max-w-6xl");
    expect(screen.getByTestId("b").className).toContain("max-w-[96rem]");
    expect(screen.getByTestId("a").className).toContain("px-4");
  });
});

describe("UserMenu", () => {
  const setup = () => {
    const signOut = vi.fn(async () => {});
    render(<UserMenu name="Asha Rao" email="asha@example.com" signOut={signOut} />);
    return { signOut, user: userEvent.setup() };
  };

  it("shows initials on a button that opens the account menu", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Account menu" });
    // Initials are drawn by CSS, so the button's only text is its name: no "AR" for voice control to miss.
    expect(trigger.textContent).toBe("");
    expect(trigger.querySelector("[data-initials]")?.getAttribute("data-initials")).toBe("AR");

    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByText("Asha Rao")).toBeTruthy();
    expect(within(menu).getByText("asha@example.com")).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "Your resumes" }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
  });

  it("signs out through the server action", async () => {
    const { user, signOut } = setup();
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });

  it("does not sign out just by opening the menu", async () => {
    const { user, signOut } = setup();
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await screen.findByRole("menu");
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("ResumeThumb", () => {
  it("is decorative and looks different for each template", () => {
    const classic = render(<ResumeThumb templateId="classic" />);
    expect(classic.container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    const classicHtml = classic.container.innerHTML;
    cleanup();

    const modern = render(<ResumeThumb templateId="modern" />);
    expect(modern.container.innerHTML).not.toBe(classicHtml);
    expect(modern.container.innerHTML).toContain("bg-blue-900");
    expect(classicHtml).not.toContain("bg-blue-900");
  });
});

describe("ResumeCard", () => {
  const renderCard = (templateId = "modern") =>
    render(
      <ul>
        <ResumeCard
          id="r1"
          title="Backend Resume"
          templateId={templateId}
          updatedAt="2026-11-10T12:00:00.000Z"
        />
      </ul>,
    );

  beforeEach(() => {
    for (const fn of Object.values(actions)) fn.mockReset().mockResolvedValue({});
    toasts.success.mockReset();
    toasts.error.mockReset();
  });

  it("shows the title as a link to the editor, with template and date", () => {
    renderCard("modern");
    const link = screen.getByRole("link", { name: "Backend Resume" });
    expect(link.getAttribute("href")).toBe("/resumes/r1/edit");
    expect(screen.getByText("Modern")).toBeTruthy();
    expect(screen.getByText("Updated Nov 10, 2026")).toBeTruthy();
  });

  it("falls back to Classic for an unknown template", () => {
    renderCard("something-old");
    expect(screen.getByText("Classic")).toBeTruthy();
  });

  it("does not duplicate the link for keyboard and screen-reader users", () => {
    renderCard();
    expect(screen.getAllByRole("link")).toHaveLength(1); // the thumbnail link is hidden from them
  });

  it("renames in place", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByLabelText("Resume title") as HTMLInputElement;
    expect(input.value).toBe("Backend Resume");
    await user.clear(input);
    await user.type(input, "Platform Resume");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(actions.renameResumeAction).toHaveBeenCalled());
    const formData = actions.renameResumeAction.mock.calls[0][1] as FormData;
    expect(formData.get("title")).toBe("Platform Resume");
    expect(formData.get("id")).toBe("r1");
  });

  it("can cancel a rename", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Resume title")).toBeNull();
    expect(actions.renameResumeAction).not.toHaveBeenCalled();
  });

  it("duplicates", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    await waitFor(() => expect(actions.duplicateResumeAction).toHaveBeenCalled());
    expect((actions.duplicateResumeAction.mock.calls[0][1] as FormData).get("id")).toBe("r1");
  });

  it("asks in a dialog before deleting, naming the resume, and does nothing if cancelled", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm");
    renderCard();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Delete .Backend Resume.\?/)).toBeTruthy();
    expect(within(dialog).getByText(/cannot be undone/i)).toBeTruthy();
    expect(actions.deleteResumeAction).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Keep it" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(actions.deleteResumeAction).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled(); // the browser's own box is no longer used
  });

  it("deletes only after the dialog is confirmed, then says so", async () => {
    actions.deleteResumeAction.mockResolvedValue({ message: 'Deleted "Backend Resume".' });
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Delete resume" }));

    await waitFor(() => expect(actions.deleteResumeAction).toHaveBeenCalledTimes(1));
    expect((actions.deleteResumeAction.mock.calls[0][1] as FormData).get("id")).toBe("r1");
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Deleted "Backend Resume".'));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("can be dismissed with the Escape key", async () => {
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(actions.deleteResumeAction).not.toHaveBeenCalled();
  });

  it("confirms a rename and a duplicate with a toast", async () => {
    actions.renameResumeAction.mockResolvedValue({ message: 'Renamed to "Platform Resume".' });
    actions.duplicateResumeAction.mockResolvedValue({
      message: 'Created "Backend Resume (copy)".',
    });
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    await waitFor(() =>
      expect(toasts.success).toHaveBeenCalledWith('Created "Backend Resume (copy)".'),
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(toasts.success).toHaveBeenCalledWith('Renamed to "Platform Resume".'),
    );
    expect(screen.queryByLabelText("Resume title")).toBeNull(); // back out of rename mode
  });

  it("shows a server error as a toast, not inline", async () => {
    actions.duplicateResumeAction.mockResolvedValue({ error: "You can have at most 20 resumes." });
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    await waitFor(() =>
      expect(toasts.error).toHaveBeenCalledWith("You can have at most 20 resumes."),
    );
    expect(toasts.success).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stays in rename mode when the rename fails, so nothing typed is lost", async () => {
    actions.renameResumeAction.mockResolvedValue({ error: "Title is required" });
    const user = userEvent.setup();
    renderCard();
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith("Title is required"));
    expect(screen.getByLabelText("Resume title")).toBeTruthy();
  });
});

describe("editor header", () => {
  const renderEditor = (userMenu?: React.ReactNode) =>
    render(
      <ResumeEditor
        id="r1"
        title="My Backend Resume"
        initial={createEmptyResume()}
        initialTemplateId="classic"
        userMenu={userMenu}
      />,
    );

  it("shows a breadcrumb back to the dashboard with the resume title as the page heading", () => {
    renderEditor();
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Your resumes" }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("My Backend Resume");
    expect(screen.getByRole("link", { name: "ResumeForge home" }).getAttribute("href")).toBe(
      "/dashboard",
    );
  });

  it("renders the account menu supplied by the page", () => {
    renderEditor(<div data-testid="menu">menu</div>);
    expect(screen.getByTestId("menu")).toBeTruthy();
  });

  it("works without an account menu", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: "Account menu" })).toBeNull();
  });

  it("keeps the save status readable text, with a colour dot that screen readers skip", () => {
    renderEditor();
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("All changes saved");
    expect(status.querySelector("[aria-hidden='true']")).toBeTruthy();
  });

  it("shows the page-shaped preview with the template name", () => {
    renderEditor();
    const preview = screen.getByLabelText("Resume preview");
    // It scrolls on its own on large screens, so keyboard users must be able to focus it.
    expect(preview.getAttribute("tabindex")).toBe("0");
    expect(within(preview).getByText("Classic template")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /modern/i }));
    expect(within(preview).getByText("Modern template")).toBeTruthy();
  });
});
