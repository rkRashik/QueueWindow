import { expect, test } from "@playwright/test";

test("the laptop hero shows the live board and one clear path", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");

  const board = page.getByRole("img", { name: /Preview of the waiting-room board/ });
  await expect(board).toBeInViewport({ ratio: 1 });
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: "Open live demo" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Create workspace" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
  // Free product: no trial or paywall copy anywhere on the page.
  await expect(page.locator("body")).not.toContainText(/trial|upgrade|pricing/i);
});

test("the footer About dialog exposes contact links and returns focus on close", async ({ page }) => {
  await page.goto("/");
  const about = page.getByRole("contentinfo").getByRole("button", { name: "About", exact: true });
  const dialog = page.getByRole("dialog", { name: "About QueueWindow" });
  const close = dialog.getByRole("button", { name: "Close" });

  await expect(page.getByRole("link", { name: "rkrashik@gmail.com" })).toBeHidden();
  await about.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await expect(dialog).toContainText("Built by Redwanul Rashik");
  await expect(dialog.getByRole("link", { name: "rkrashik@gmail.com" })).toHaveAttribute(
    "href", "mailto:rkrashik@gmail.com",
  );
  await expect(dialog.getByRole("link", { name: "GitHub repository" })).toHaveAttribute(
    "href", "https://github.com/rkRashik/QueueWindow",
  );

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(about).toBeFocused();

  await about.click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(dialog).toBeHidden();
  await expect(about).toBeFocused();
});

test("a failed demo request explains itself without breaking a 320px layout", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 768 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.route("**/api/auth/demo", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );

  const main = page.getByRole("main");
  const demo = main.getByRole("button", { name: "Open live demo" });
  await demo.click();
  const error = main.getByRole("alert");
  await expect(error).toBeVisible();
  const [demoBox, errorBox] = await Promise.all([demo.boundingBox(), error.boundingBox()]);
  expect(errorBox!.y).toBeGreaterThanOrEqual(demoBox!.y + demoBox!.height);
  await expect(demo).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("the homepage publishes social previews, crawl rules, and mobile icons", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const graphImage = page.locator('meta[property="og:image"]');
  await expect(graphImage).toHaveAttribute("content", /\/opengraph-image/);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /\/opengraph-image/);
  const preview = await page.request.get(new URL((await graphImage.getAttribute("content"))!).pathname);
  expect(preview.headers()["content-type"]).toContain("image/png");

  const robots = await (await page.request.get("/robots.txt")).text();
  for (const rule of ["Allow: /", "Disallow: /api/", "Disallow: /desk", "Disallow: /admin", "Sitemap:"]) {
    expect(robots).toContain(rule);
  }
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => new URL(url).pathname)).toEqual([
    "/", "/login", "/signup",
  ]);
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("QueueWindow");
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
});
