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
