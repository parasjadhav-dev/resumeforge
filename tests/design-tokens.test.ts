import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Accessibility guard for the colour tokens in src/app/globals.css.
 * WCAG 2.1 AA: normal text needs 4.5:1; form-control outlines and focus rings need 3:1.
 */

const css = readFileSync("src/app/globals.css", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

// ---------- reading the stylesheet ----------

function block(selector: string): Record<string, string> {
  const match = css.match(new RegExp(`\\n${selector.replace(".", "\\.")} \\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`No ${selector} block in globals.css`);
  const vars: Record<string, string> = {};
  for (const [, name, value] of match[1].matchAll(/(--[\w-]+):\s*([^;]+);/g))
    vars[name] = value.trim();
  return vars;
}

type Rgb = [number, number, number]; // linear sRGB, 0..1
type Color = { rgb: Rgb; alpha: number };

function parseOklch(value: string): Color {
  const m = value.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/);
  if (!m) throw new Error(`Cannot parse colour: ${value}`);
  const [L, C, H] = [Number(m[1]), Number(m[2]), (Number(m[3]) * Math.PI) / 180];
  const alpha = m[4] === undefined ? 1 : m[5] ? Number(m[4]) / 100 : Number(m[4]);

  const a = C * Math.cos(H);
  const b = C * Math.sin(H);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  return {
    rgb: [
      clamp(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
      clamp(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
      clamp(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
    ],
    alpha,
  };
}

const toGamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const toLinear = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

/** Composites a possibly transparent colour over an opaque one, the way browsers blend (in gamma space). */
function over(top: Color, bottom: Color, extraAlpha = 1): Rgb {
  const alpha = top.alpha * extraAlpha;
  return top.rgb.map((c, i) =>
    toLinear(toGamma(c) * alpha + toGamma(bottom.rgb[i]) * (1 - alpha)),
  ) as Rgb;
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ratio = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ---------- the converter must be right, or every check below proves nothing ----------

describe("colour maths", () => {
  const white = parseOklch("oklch(1 0 0)").rgb;
  const black = parseOklch("oklch(0 0 0)").rgb;

  it("gives 21:1 for white on black, and 1:1 for a colour on itself", () => {
    expect(ratio(white, black)).toBeCloseTo(21, 1);
    expect(ratio(white, white)).toBeCloseTo(1, 5);
  });

  it("matches known greys (a neutral's linear luminance is lightness cubed)", () => {
    expect(luminance(parseOklch("oklch(0.5 0 0)").rgb)).toBeCloseTo(0.125, 3);
    expect(ratio(white, parseOklch("oklch(0.5 0 0)").rgb)).toBeCloseTo(6.0, 1);
    expect(ratio(white, parseOklch("oklch(0.6 0 0)").rgb)).toBeCloseTo(3.95, 1);
  });

  it("matches Tailwind's indigo-600 (#4f46e5) against white, about 6.3:1", () => {
    const indigo600 = parseOklch("oklch(0.511 0.262 276.966)").rgb;
    expect(ratio(white, indigo600)).toBeGreaterThan(6.0);
    expect(ratio(white, indigo600)).toBeLessThan(6.6);
  });

  it("blends transparency in gamma space, like a browser", () => {
    const half = over(parseOklch("oklch(0 0 0 / 50%)"), parseOklch("oklch(1 0 0)"));
    // 50% black over white is sRGB (127.5,127.5,127.5), i.e. linear luminance about 0.214.
    expect(luminance(half)).toBeCloseTo(0.214, 2);
  });

  it("parses percentage and fractional alpha", () => {
    expect(parseOklch("oklch(1 0 0 / 15%)").alpha).toBeCloseTo(0.15);
    expect(parseOklch("oklch(1 0 0 / 0.4)").alpha).toBeCloseTo(0.4);
    expect(parseOklch("oklch(1 0 0)").alpha).toBe(1);
  });
});

// ---------- the checks ----------

for (const [theme, selector] of [
  ["light", ":root"],
  ["dark", ".dark"],
] as const) {
  describe(`${theme} theme`, () => {
    const t = block(selector);
    const color = (name: string) => parseOklch(t[name]);
    const solid = (name: string) => over(color(name), color("--background"));
    /** Text colour `fg` on surface `bg`, both token names; the surface may be translucent. */
    const contrast = (fg: string, bg: string) => ratio(solid(fg), solid(bg));

    const textPairs: [string, string][] = [
      ["--foreground", "--background"],
      ["--foreground", "--card"],
      ["--card-foreground", "--card"],
      ["--popover-foreground", "--popover"],
      ["--muted-foreground", "--background"],
      ["--muted-foreground", "--card"],
      ["--muted-foreground", "--muted"],
      ["--muted-foreground", "--secondary"],
      ["--primary-foreground", "--primary"],
      ["--secondary-foreground", "--secondary"],
      ["--accent-foreground", "--accent"],
      ["--primary", "--background"], // links and brand-coloured text
      ["--primary", "--card"],
      ["--destructive", "--background"],
      ["--destructive", "--card"],
      ["--info-foreground", "--info"],
      ["--success-foreground", "--success"],
      ["--warning-foreground", "--warning"],
      ["--danger-foreground", "--danger"],
    ];
    it.each(textPairs)("%s on %s meets 4.5:1", (fg, bg) => {
      expect(contrast(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    });

    it("destructive text stays readable on the tinted destructive button", () => {
      const tint = theme === "light" ? 0.1 : 0.2; // matches the button's bg-destructive/10 and /20
      for (const base of ["--background", "--card"]) {
        const surface = over(color("--destructive"), color(base), tint);
        expect(ratio(solid("--destructive"), surface), `on ${base}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    const uiPairs: [string, string][] = [
      ["--input", "--background"],
      ["--input", "--card"],
      ["--ring", "--background"],
      ["--ring", "--card"],
    ];
    it.each(uiPairs)("%s against %s meets 3:1 (form controls and focus)", (fg, bg) => {
      expect(contrast(fg, bg), `${fg} against ${bg}`).toBeGreaterThanOrEqual(3);
    });
  });
}

describe("token set", () => {
  it("defines the same colour tokens for light and dark", () => {
    const names = (vars: Record<string, string>) =>
      Object.keys(vars)
        .filter((n) => n !== "--radius")
        .sort();
    expect(names(block(".dark"))).toEqual(names(block(":root")));
  });

  it("every token parses as a colour", () => {
    for (const selector of [":root", ".dark"]) {
      for (const [name, value] of Object.entries(block(selector))) {
        if (name === "--radius") continue;
        expect(() => parseOklch(value), `${selector} ${name}`).not.toThrow();
      }
    }
  });
});

describe("fonts", () => {
  it("does not define --font-sans in terms of itself (that left the app in the browser's default serif)", () => {
    expect(css).not.toMatch(/--font-sans:\s*var\(--font-sans\)/);
    expect(css).not.toMatch(/--font-heading:\s*var\(--font-heading\)/);
    expect(css).not.toMatch(/--font-mono:\s*var\(--font-mono\)/);
  });

  it("uses the same CSS variable names that the root layout sets via next/font", () => {
    for (const variable of ["--font-inter", "--font-geist-mono"]) {
      expect(layout).toContain(`variable: "${variable}"`);
      expect(css).toContain(`var(${variable})`);
    }
  });
});
