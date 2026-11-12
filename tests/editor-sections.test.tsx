// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { createEmptyResume, resumeContentSchema } from "@/shared/schema";

vi.mock("@/app/resumes/[id]/edit/actions", () => ({
  saveResumeAction: vi.fn(async () => ({ ok: true })),
}));

/** Pretends to be a phone (narrow screen) or a desktop. */
function mockScreen({ phone = false, dark = false } = {}) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("max-width: 1023px")
      ? phone
      : query.includes("prefers-color-scheme: dark")
        ? dark
        : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

const renderEditor = (initial = createEmptyResume()) =>
  render(<ResumeEditor id="r1" title="Resume" initial={initial} initialTemplateId="classic" />);

const header = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const panelOf = (name: string) =>
  document.getElementById(header(name).getAttribute("aria-controls")!)!;

beforeEach(() => {
  mockScreen();
  Element.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
});
afterEach(cleanup);

describe("collapsible sections", () => {
  it("start open on large screens, each header wired to its panel", () => {
    renderEditor();
    for (const name of [
      "Template",
      "Contact",
      "Summary",
      "Experience",
      "Education",
      "Projects",
      "Skills",
      "Certifications",
    ]) {
      const button = header(name);
      expect(button.getAttribute("aria-expanded"), name).toBe("true");
      expect(panelOf(name).hidden, name).toBe(false);
    }
  });

  it("collapse and expand, with a one-line summary shown while collapsed", () => {
    renderEditor(
      resumeContentSchema.parse({ contact: { fullName: "Asha Rao", email: "asha@example.com" } }),
    );
    fireEvent.click(header("Contact"));
    expect(header("Contact").getAttribute("aria-expanded")).toBe("false");
    expect(panelOf("Contact").hidden).toBe(true);
    expect(screen.getByText("Asha Rao · asha@example.com")).toBeTruthy();

    fireEvent.click(header("Contact"));
    expect(panelOf("Contact").hidden).toBe(false);
    expect(screen.queryByText("Asha Rao · asha@example.com")).toBeNull();
    expect(screen.getByText("How recruiters reach you.")).toBeTruthy();
  });

  it("never loses what was typed in a section while it is collapsed", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
    fireEvent.click(header("Contact"));
    fireEvent.click(header("Contact"));
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Asha Rao");
  });

  it("keep half-typed input exactly as it was (the skills box holds text such as 'Python, ')", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add skill group" }));
    const skills = screen.getByLabelText("Skills") as HTMLInputElement;
    fireEvent.change(skills, { target: { value: "Python, " } }); // trailing comma: more to come

    fireEvent.click(header("Skills"));
    fireEvent.click(header("Skills"));

    // Only still-mounted fields keep text that is not yet part of the saved resume.
    expect((screen.getByLabelText("Skills") as HTMLInputElement).value).toBe("Python, ");
  });

  it("keep the preview updating while the form section is collapsed", () => {
    renderEditor();
    fireEvent.click(header("Summary"));
    fireEvent.change(screen.getByLabelText("Professional summary"), {
      target: { value: "Hello there" },
    });
    expect(within(screen.getByLabelText("Resume preview")).getByText("Hello there")).toBeTruthy();
  });

  it("tell screen readers whether a section has content", () => {
    renderEditor();
    expect(header("Contact").textContent).toContain(", empty");
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    expect(header("Contact").textContent).toContain(", has content");
    expect(header("Template").textContent).not.toMatch(/empty|has content/); // template always has a value
  });

  it("show Expand all and Collapse all", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    for (const name of ["Contact", "Experience", "Skills"]) {
      expect(header(name).getAttribute("aria-expanded")).toBe("false");
    }
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    for (const name of ["Contact", "Experience", "Skills"]) {
      expect(header(name).getAttribute("aria-expanded")).toBe("true");
    }
  });
});

describe("on a phone", () => {
  beforeEach(() => mockScreen({ phone: true }));

  it("starts with every section collapsed, as an overview of the whole resume", () => {
    renderEditor(resumeContentSchema.parse({ contact: { fullName: "Asha", email: "a@b.co" } }));
    for (const name of [
      "Template",
      "Contact",
      "Summary",
      "Experience",
      "Education",
      "Projects",
      "Skills",
      "Certifications",
    ]) {
      expect(header(name).getAttribute("aria-expanded"), name).toBe("false");
    }
    expect(screen.getByText("Asha · a@b.co")).toBeTruthy();
    // The template section summarises its choice (its summary line, not the radio option inside it).
    expect(document.getElementById("section-template-note")?.textContent).toBe("Classic");
  });

  it("lets the user open what they need, and their choice sticks", () => {
    renderEditor();
    fireEvent.click(header("Summary"));
    expect(header("Summary").getAttribute("aria-expanded")).toBe("true");
    expect(header("Contact").getAttribute("aria-expanded")).toBe("false");
  });
});

describe("jump to section", () => {
  it("links to every section", () => {
    renderEditor();
    const nav = screen.getByRole("navigation", { name: "Jump to section" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "#section-template",
      "#section-contact",
      "#section-summary",
      "#section-experience",
      "#section-education",
      "#section-projects",
      "#section-skills",
      "#section-certifications",
    ]);
  });

  it("opens a collapsed section, scrolls to it, and moves keyboard focus to its heading", () => {
    mockScreen({ phone: true });
    renderEditor();
    expect(header("Education").getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Jump to section" })).getByRole("link", {
        name: /Education/,
      }),
    );

    expect(header("Education").getAttribute("aria-expanded")).toBe("true");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(header("Education"));
  });

  it("shows which sections already have content", () => {
    renderEditor(resumeContentSchema.parse({ summary: "Hello" }));
    const nav = screen.getByRole("navigation", { name: "Jump to section" });
    expect(within(nav).getByRole("link", { name: /Summary, has content/ })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: /Skills, empty/ })).toBeTruthy();
  });
});

describe("progress summary", () => {
  const bar = () => screen.getByRole("progressbar", { name: "Resume progress" });

  it("starts at 0% and counts up as essentials are filled in", () => {
    renderEditor();
    expect(bar().getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText("0 of 5 essentials done")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha" } });
    expect(bar().getAttribute("aria-valuenow")).toBe("0"); // name alone is not enough
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.co" } });
    expect(bar().getAttribute("aria-valuenow")).toBe("20");
    fireEvent.change(screen.getByLabelText("Professional summary"), { target: { value: "Hello" } });
    expect(bar().getAttribute("aria-valuenow")).toBe("40");
    expect(screen.getByText("2 of 5 essentials done")).toBeTruthy();
  });

  it("lists what is still to do, for assistive technology too", () => {
    renderEditor(resumeContentSchema.parse({ summary: "Hello" }));
    expect(screen.getByText(/Summary/, { selector: "li" }).textContent).toContain(": done");
    expect(screen.getByText(/Education/, { selector: "li" }).textContent).toContain(
      ": still to do",
    );
  });

  it("reaches 100% for a complete resume", () => {
    renderEditor(
      resumeContentSchema.parse({
        contact: { fullName: "Asha", email: "a@b.co" },
        summary: "Hello",
        projects: [{ name: "App" }],
        education: [{ institution: "MU" }],
        skills: [{ category: "Skills", items: ["Python"] }],
      }),
    );
    expect(bar().getAttribute("aria-valuenow")).toBe("100");
  });
});

describe("entry cards", () => {
  it("describe their contents next to the label", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add experience" }));
    expect(screen.queryByTestId("entry-subtitle")).toBeNull(); // nothing to say yet

    fireEvent.change(screen.getByLabelText("Job title"), { target: { value: "Intern" } });
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Acme" } });
    expect(screen.getByTestId("entry-subtitle").textContent).toBe("Intern · Acme");
    expect(screen.getByRole("heading", { name: "Experience entry 1" })).toBeTruthy(); // label stays clean
  });
});

describe("phone layout", () => {
  const formColumn = () =>
    screen.getByRole("navigation", { name: "Jump to section" }).parentElement!;
  const previewColumn = () => screen.getByLabelText("Resume preview").parentElement!;

  it("shows the form first, and swaps to the preview with the Edit / Preview switch", () => {
    renderEditor();
    const edit = screen.getByRole("button", { name: "Edit" });
    const preview = screen.getByRole("button", { name: "Preview" });
    expect(edit.getAttribute("aria-pressed")).toBe("true");
    expect(preview.getAttribute("aria-pressed")).toBe("false");
    expect(formColumn().className).not.toContain("max-lg:hidden");
    expect(previewColumn().className).toContain("max-lg:hidden");

    fireEvent.click(preview);
    expect(preview.getAttribute("aria-pressed")).toBe("true");
    expect(edit.getAttribute("aria-pressed")).toBe("false");
    expect(formColumn().className).toContain("max-lg:hidden");
    expect(previewColumn().className).not.toContain("max-lg:hidden");

    fireEvent.click(edit);
    expect(formColumn().className).not.toContain("max-lg:hidden");
  });

  it("keeps what was typed when switching away and back", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha Rao" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Asha Rao");
  });
});

describe("toolbar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

  it("offers Save now only when there is something to save", async () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: "Save now" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Asha" } });
    expect(screen.getByRole("button", { name: "Save now" })).toBeTruthy();

    await advance(1000); // autosave catches up
    expect(screen.queryByRole("button", { name: "Save now" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("All changes saved");
  });

  it("keeps the download control named 'Download PDF' even when it shows only an icon", () => {
    renderEditor();
    const link = screen.getByRole("link", { name: "Download PDF" });
    expect(link.querySelector("svg")).toBeTruthy(); // the phone icon
    expect(link.querySelector(".max-sm\\:sr-only")?.textContent).toBe("Download PDF");
  });
});

describe("theme in the account menu", () => {
  it("lets you choose Light, Dark or System, and applies it", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <UserMenu name="Asha Rao" email="asha@example.com" signOut={async () => {}} />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    const menu = await screen.findByRole("menu");

    const radios = within(menu).getAllByRole("menuitemradio");
    expect(radios.map((r) => r.textContent)).toEqual(["Light", "Dark", "System"]);
    expect(
      within(menu).getByRole("menuitemradio", { name: "System" }).getAttribute("aria-checked"),
    ).toBe("true");

    await user.click(within(menu).getByRole("menuitemradio", { name: "Dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
