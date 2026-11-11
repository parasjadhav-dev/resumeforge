import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it("allows same-site relative paths", () => {
    expect(safeRedirect("/resumes/abc?tab=1")).toBe("/resumes/abc?tab=1");
  });

  it.each([
    "//evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "evil.com",
    "",
    undefined,
    null,
    42,
  ])("falls back to /dashboard for %s", (input) => {
    expect(safeRedirect(input)).toBe("/dashboard");
  });
});
