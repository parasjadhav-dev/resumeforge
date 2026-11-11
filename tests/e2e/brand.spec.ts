import { expect, test } from "@playwright/test";

/** Width and height from a PNG's header. */
function pngSize(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString("hex"), "PNG signature").toBe("89504e470d0a1a0a");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test.describe("brand assets and page metadata", () => {
  test("the home page declares a title, description, icons, and a share image", async ({
    request,
  }) => {
    const html = await (await request.get("/login")).text();

    expect(html).toMatch(/<title>[^<]*ResumeForge[^<]*<\/title>/);
    expect(html).not.toContain("Create Next App");
    expect(html).toMatch(/<meta name="description" content="[^"]*ATS-friendly/);
    expect(html).toMatch(/<meta property="og:site_name" content="ResumeForge"/);
    expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image"/);
    expect(html).toMatch(/<meta property="og:image" content="https?:\/\/[^"]+\/opengraph-image/);
    expect(html).toMatch(/<link rel="icon" href="\/icon\?/);
    expect(html).toMatch(/<link rel="apple-touch-icon" href="\/apple-icon\?/);
  });

  test("the browser-tab icon is a 64 px PNG", async ({ request }) => {
    const html = await (await request.get("/login")).text();
    const href = html.match(/<link rel="icon" href="([^"]+)"/)![1];
    const res = await request.get(href);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    expect(pngSize(await res.body())).toEqual({ width: 64, height: 64 });
  });

  test("the Apple home-screen icon is a 180 px PNG", async ({ request }) => {
    const html = await (await request.get("/login")).text();
    const href = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)![1];
    const res = await request.get(href);
    expect(res.status()).toBe(200);
    expect(pngSize(await res.body())).toEqual({ width: 180, height: 180 });
  });

  test("the share image is a 1200 x 630 PNG that is not blank", async ({ request }) => {
    const res = await request.get("/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const body = await res.body();
    expect(pngSize(body)).toEqual({ width: 1200, height: 630 });
    expect(body.length).toBeGreaterThan(8_000); // a flat single-colour PNG would be far smaller
  });

  test("the old default favicon is gone", async ({ request }) => {
    const res = await request.get("/favicon.ico");
    expect(res.status()).toBe(404);
  });

  test("an unknown address shows the branded not-found page", async ({ page }) => {
    const response = await page.goto("/definitely-not-a-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /couldn.t find that page/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to your resumes" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
