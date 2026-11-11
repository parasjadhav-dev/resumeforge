// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResumeEditor } from "@/components/editor/resume-editor";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Notice } from "@/components/ui/notice";
import { createEmptyResume } from "@/shared/schema";

vi.mock("@/app/resumes/[id]/edit/actions", () => ({ saveResumeAction: vi.fn() }));

function mockSystemTheme(prefersDark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-color-scheme: dark") ? prefersDark : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

const html = () => document.documentElement;

beforeEach(() => {
  localStorage.clear();
  html().className = "";
  mockSystemTheme(false);
});
afterEach(cleanup);

describe("theme toggle", () => {
  const setup = () =>
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
  const button = (name: string) => screen.getByRole("button", { name: `${name} theme` });

  it("offers light, dark, and system, following the system by default", () => {
    setup();
    expect(button("Light").getAttribute("aria-pressed")).toBe("false");
    expect(button("Dark").getAttribute("aria-pressed")).toBe("false");
    expect(button("System").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("group", { name: "Colour theme" })).toBeTruthy();
  });

  it("switches to dark and back, updating <html> and remembering the choice", () => {
    setup();
    fireEvent.click(button("Dark"));
    expect(html().classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(button("Dark").getAttribute("aria-pressed")).toBe("true");
    expect(button("System").getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button("Light"));
    expect(html().classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("restores a saved choice on the next visit", () => {
    localStorage.setItem("theme", "dark");
    setup();
    expect(button("Dark").getAttribute("aria-pressed")).toBe("true");
    expect(html().classList.contains("dark")).toBe(true);
  });

  it("follows a dark operating-system setting when set to System", () => {
    mockSystemTheme(true);
    setup();
    expect(html().classList.contains("dark")).toBe(true);
    expect(button("System").getAttribute("aria-pressed")).toBe("true");
  });

  it("lets an explicit Light choice beat a dark system setting", () => {
    mockSystemTheme(true);
    setup();
    fireEvent.click(button("Light"));
    expect(html().classList.contains("dark")).toBe(false);
  });

  it("is usable without a provider (it just does nothing)", () => {
    render(<ThemeToggle />);
    expect(() => fireEvent.click(button("Dark"))).not.toThrow();
  });
});

describe("Notice", () => {
  it.each([
    ["info", "bg-info", "border-info-border", "text-info-foreground"],
    ["success", "bg-success", "border-success-border", "text-success-foreground"],
    ["warning", "bg-warning", "border-warning-border", "text-warning-foreground"],
    ["danger", "bg-danger", "border-danger-border", "text-danger-foreground"],
  ] as const)("%s uses its status colour tokens", (variant, bg, border, text) => {
    render(
      <Notice variant={variant} role="status">
        Message
      </Notice>,
    );
    const el = screen.getByRole("status");
    expect(el.className).toContain(bg);
    expect(el.className).toContain(border);
    expect(el.className).toContain(text);
    expect(el.textContent).toBe("Message");
  });

  it("defaults to info and merges custom classes", () => {
    render(
      <Notice className="mt-4" data-testid="n">
        Hi
      </Notice>,
    );
    const el = screen.getByTestId("n");
    expect(el.className).toContain("bg-info");
    expect(el.className).toContain("mt-4");
  });
});

describe("form controls after the component upgrade", () => {
  const renderEditor = () =>
    render(
      <ResumeEditor
        id="r1"
        title="Resume"
        initial={createEmptyResume()}
        initialTemplateId="classic"
      />,
    );

  it("keeps every field reachable by its label", () => {
    renderEditor();
    for (const label of ["Full name", "Email", "Phone", "Location", "Professional summary"]) {
      expect(screen.getByLabelText(label), label).toBeTruthy();
    }
  });

  it("the 'currently work here' checkbox toggles, and disables the end date", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add experience" }));

    const checkbox = screen.getByRole("checkbox", { name: /currently work here/i });
    const endDate = screen.getByLabelText("End date") as HTMLInputElement;
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(endDate.disabled).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(endDate.disabled).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(endDate.disabled).toBe(false);
  });

  it("clicking the checkbox's label text also toggles it", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Add experience" }));
    fireEvent.click(screen.getByText("I currently work here"));
    expect(
      screen.getByRole("checkbox", { name: /currently work here/i }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});
